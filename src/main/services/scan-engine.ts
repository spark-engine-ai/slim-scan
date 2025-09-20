import { providerRegistry } from '../providers/provider-registry';
import { 
  getUniverseSymbols, 
  createScan, 
  saveScanResults, 
  getScanResults,
  upsertPrices,
  upsertEPS,
  upsertOwnership,
  getPrices,
  getEPS,
  getOwnership 
} from './db';
import {
  calculateCurrentEarnings,
  calculateAnnualEarnings,
  calculateNewHighPercentage,
  calculateRelativeStrength,
  calculateVolumeSpike,
  calculateInstitutionalChange,
  calculateLiquidity,
  isBreakoutConfirmed
} from './metrics';
import { checkMarketGate } from './market-gate';
import { logger } from './logger';
import { getSetting } from './settings';
import { ScanResult, ScanConfig } from '../types';
import { writeFileSync } from 'fs';
import { app } from 'electron';
import { join } from 'path';

class ScanEngine {
  async run(options: { mode: 'daily' | 'intraday' }): Promise<number> {
    try {
      logger.info(`Starting ${options.mode} scan`);
      
      const provider = providerRegistry.getCurrentProvider();
      const universe = getSetting('universe');
      const scanConfig = getSetting('scanConfig');
      
      // Check market gate
      const marketGate = await checkMarketGate();
      if (!marketGate.isOpen) {
        logger.warn(`Scan blocked by market gate: ${marketGate.reason}`);
        // Still create scan record but with empty results
        const scanId = createScan(universe, provider.name, scanConfig);
        return scanId;
      }
      
      // Get universe symbols
      const symbols = getUniverseSymbols();
      if (symbols.length === 0) {
        throw new Error('No symbols in universe. Please refresh universe first.');
      }
      
      logger.info(`Scanning ${symbols.length} symbols from ${universe} universe`);
      
      // Create scan record
      const scanId = createScan(universe, provider.name, scanConfig);
      
      // Fetch fresh data if needed
      await this.ensureDataFreshness(symbols.slice(0, 100)); // Limit for demo
      
      // Calculate metrics and score
      const results = await this.calculateScores(symbols.slice(0, 100), scanConfig);
      
      // Filter and sort results
      const filteredResults = results
        .filter(result => result.score > 0) // Basic sanity check
        .sort((a, b) => b.score - a.score)
        .slice(0, 50); // Top 50 results
      
      // Save results
      saveScanResults(scanId, filteredResults);
      
      logger.info(`Scan completed: ${filteredResults.length} results`, {
        scanId,
        topScore: filteredResults[0]?.score || 0
      });
      
      return scanId;
    } catch (error) {
      logger.error('Scan failed', error);
      throw error;
    }
  }
  
  async getResults(scanId: number): Promise<any[]> {
    try {
      const results = getScanResults(scanId);
      logger.info(`Retrieved ${results.length} scan results for scan ${scanId}`);
      return results;
    } catch (error) {
      logger.error(`Failed to get results for scan ${scanId}`, error);
      throw error;
    }
  }
  
  async exportResults(scanId: number, format: 'csv' | 'json'): Promise<string> {
    try {
      const results = getScanResults(scanId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `scan-${scanId}-${timestamp}.${format}`;
      const filepath = join(app.getPath('downloads'), filename);
      
      if (format === 'csv') {
        const csv = this.convertToCSV(results);
        writeFileSync(filepath, csv, 'utf8');
      } else {
        writeFileSync(filepath, JSON.stringify(results, null, 2), 'utf8');
      }
      
      logger.info(`Exported ${results.length} results to ${filepath}`);
      return filepath;
    } catch (error) {
      logger.error(`Failed to export scan ${scanId}`, error);
      throw error;
    }
  }
  
  private async ensureDataFreshness(symbols: string[]): Promise<void> {
    const provider = providerRegistry.getCurrentProvider();
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 400); // Get ~1.5 years of data
    
    logger.info('Checking data freshness for price data');
    
    // Check which symbols need fresh data
    const symbolsNeedingData: string[] = [];
    
    for (const symbol of symbols.slice(0, 20)) { // Rate limit check
      const existingBars = getPrices(symbol);
      const latestDate = existingBars.length > 0 
        ? new Date(existingBars[existingBars.length - 1].date)
        : new Date(0);
      
      const daysSinceUpdate = (toDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > 1 || existingBars.length < 250) { // Need update if > 1 day old or insufficient data
        symbolsNeedingData.push(symbol);
      }
    }
    
    if (symbolsNeedingData.length > 0) {
      logger.info(`Fetching fresh data for ${symbolsNeedingData.length} symbols`);
      
      try {
        // Fetch OHLCV data
        const ohlcvData = await provider.getOHLCV(symbolsNeedingData, fromDate, toDate);
        for (const [symbol, bars] of Object.entries(ohlcvData)) {
          if (bars && bars.length > 0) {
            upsertPrices(symbol, bars);
          }
        }
        
        // Fetch EPS data if supported
        if (provider.name !== 'poc') {
          const epsData = await provider.getQuarterlyEPS(symbolsNeedingData);
          for (const [symbol, eps] of Object.entries(epsData)) {
            if (eps && eps.length > 0) {
              upsertEPS(symbol, eps);
            }
          }
          
          // Fetch ownership data if supported
          if (provider.getOwnership) {
            const ownershipData = await provider.getOwnership(symbolsNeedingData);
            for (const [symbol, ownership] of Object.entries(ownershipData)) {
              if (ownership && ownership.length > 0) {
                upsertOwnership(symbol, ownership);
              }
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch some fresh data, continuing with cached data', error);
      }
    }
  }
  
  private async calculateScores(symbols: string[], config: ScanConfig): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    const allPriceData: Record<string, any[]> = {};
    
    // Pre-load all price data for RS calculation
    logger.info('Pre-loading price data for relative strength calculation');
    const provider = providerRegistry.getCurrentProvider();
    const minBars = provider.name === 'poc' ? 10 : 50; // Lower requirement for POC provider

    for (const symbol of symbols) {
      const bars = getPrices(symbol);
      if (bars.length >= minBars) { // Minimum data requirement
        allPriceData[symbol] = bars;
      }
    }
    
    logger.info('Calculating CAN SLIM scores');
    
    for (const symbol of symbols) {
      try {
        const bars = allPriceData[symbol];
        if (!bars || bars.length < minBars) {
          continue; // Skip symbols with insufficient data
        }
        
        const epsData = getEPS(symbol);
        const ownershipData = getOwnership(symbol);
        
        // Calculate liquidity first to filter
        const liquidity = calculateLiquidity(bars);
        if (liquidity.dollarVolume50d < config.liquidity.minDollarVol50d ||
            liquidity.avgPrice < config.liquidity.minPrice) {
          continue; // Skip illiquid stocks
        }
        
        // Calculate individual factors
        const c_qoq = calculateCurrentEarnings(epsData);
        const a_cagr = calculateAnnualEarnings(epsData);
        const n_pct52w = calculateNewHighPercentage(bars);
        const rs_pct = calculateRelativeStrength(symbol, bars, allPriceData);
        const s_volSpike = calculateVolumeSpike(bars);
        const i_delta = calculateInstitutionalChange(ownershipData);
        
        // Calculate weighted score
        let score = 0;
        let flags: string[] = [];
        
        // C - Current Earnings
        if (c_qoq >= config.thresholds.C_yoy) {
          score += config.weights.C * (c_qoq / config.thresholds.C_yoy);
        }
        
        // A - Annual Earnings
        if (a_cagr >= config.thresholds.A_cagr) {
          score += config.weights.A * (a_cagr / config.thresholds.A_cagr);
        }
        
        // N - New Highs
        if (n_pct52w >= config.thresholds.N_pct52w) {
          score += config.weights.N * (n_pct52w / config.thresholds.N_pct52w);
        }
        
        // S - Supply/Demand (Volume)
        if (s_volSpike >= config.thresholds.S_volSpike) {
          score += config.weights.S * Math.min(s_volSpike / config.thresholds.S_volSpike, 3); // Cap at 3x
        }
        
        // L - Leader/Laggard (Relative Strength)
        if (rs_pct >= config.thresholds.RS_pct) {
          score += config.weights.L * (rs_pct / config.thresholds.RS_pct);
        }
        
        // I - Institutional Sponsorship
        if (epsData.length === 0) {
          flags.push('data-limited');
        } else if (i_delta > 0) {
          score += config.weights.I;
        }

        // Breakout confirmation (additional filter)
        const isBreakout = isBreakoutConfirmed(bars);
        if (!isBreakout) {
          flags.push('no-breakout');
        }

        // Normalize score to 0-100
        const maxPossibleScore = config.weights.C + config.weights.A + config.weights.N +
                                config.weights.S + config.weights.L + config.weights.I;
        const normalizedScore = Math.min((score / maxPossibleScore) * 100, 100);
        
        results.push({
          symbol,
          price: bars[bars.length - 1].close, // Add the current price
          score: Math.round(normalizedScore * 100) / 100,
          rs_pct: Math.round(rs_pct * 100) / 100,
          pct_52w: Math.round(n_pct52w * 10000) / 10000,
          vol_spike: Math.round(s_volSpike * 100) / 100,
          c_qoq: Math.round(c_qoq * 10000) / 10000,
          a_cagr: Math.round(a_cagr * 10000) / 10000,
          i_delta: Math.round(i_delta * 10000) / 10000,
          flags: flags.join(',')
        });
        
      } catch (error) {
        logger.warn(`Failed to calculate score for ${symbol}`, error);
      }
    }
    
    logger.info(`Calculated scores for ${results.length} symbols`);
    return results;
  }
  
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : String(value);
      });
      csvLines.push(values.join(','));
    }
    
    return csvLines.join('\n');
  }
}

export const scanEngine = new ScanEngine();
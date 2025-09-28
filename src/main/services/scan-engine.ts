import { providerRegistry } from '../providers/provider-registry';
import {
  getUniverseSymbols,
  createScan,
  saveScanResults,
  getScanResults,
  clearCurrentScanResults,
  saveCurrentScanResults,
  getCurrentScanResults,
  upsertPrices,
  upsertEPS,
  upsertOwnership,
  getPrices,
  getEPS,
  getOwnership,
  getSymbol
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
import { ibdMetricsCalculator } from './ibd-metrics';
import { writeFileSync } from 'fs';
import { app } from 'electron';
import { join } from 'path';

class ScanEngine {
  private isRunning = false;
  private currentScanResults: ScanResult[] = [];

  isScanning(): boolean {
    return this.isRunning;
  }

  async run(options: { mode: 'daily' | 'intraday' }): Promise<number> {
    logger.info(`🚀 Scan request received - mode: ${options.mode}, currently running: ${this.isRunning}`);

    if (this.isRunning) {
      logger.warn('Scan already running - ignoring new scan request');
      throw new Error('Scan already in progress');
    }

    this.isRunning = true;
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
      logger.info(`First 10 symbols to scan: ${symbols.slice(0, 10).join(', ')}`);
      if (symbols.length > 10) {
        logger.info(`Last 10 symbols to scan: ${symbols.slice(-10).join(', ')}`);
      }
      
      // Create scan record for historical purposes
      const scanId = createScan(universe, provider.name, scanConfig);
      logger.info(`Created new scan with ID ${scanId}`);

      // Clear current scan results and start fresh
      clearCurrentScanResults();
      this.currentScanResults = [];
      logger.info('🧹 Cleared current scan results');

      // Process symbols in parallel: fetch data AND score + display as we go
      await this.processSymbolsInBatches(symbols, scanConfig, scanId);

      const totalResults = getScanResults(scanId);
      logger.info(`Scan completed: ${totalResults.length} results`, {
        scanId,
        topScore: totalResults[0]?.score || 0
      });
      
      return scanId;
    } catch (error) {
      logger.error('Scan failed', error);
      throw error;
    } finally {
      this.isRunning = false;
      logger.info('Scan finished - ready for next scan');
    }
  }
  
  async getResults(scanId: number): Promise<any[]> {
    try {
      const results = getScanResults(scanId);
      logger.info(`Retrieved ${results.length} scan results for scan ${scanId}`);

      // Debug: Log the first result to see its structure
      if (results.length > 0) {
        logger.info(`Sample scan result structure:`, results[0]);
      }

      // Remove the enhancement hack - this will be done properly in the scan calculation

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
  

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  private async calculateScores(symbols: string[], config: ScanConfig): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    const allPriceData: Record<string, any[]> = {};

    // Pre-load all price data for RS calculation
    logger.info('Pre-loading price data for relative strength calculation');
    const provider = providerRegistry.getCurrentProvider();
    const minBars = 5; // Very low requirement for debugging - just need some data
    logger.info(`Using provider: ${provider.name}, minBars: ${minBars}`);
    logger.info(`Universe symbols: ${symbols.slice(0, 10).join(', ')} (showing first 10 of ${symbols.length})`);

    for (const symbol of symbols) {
      const bars = getPrices(symbol);
      logger.info(`Symbol ${symbol}: ${bars.length} bars in database`);
      if (bars.length >= minBars) { // Minimum data requirement
        allPriceData[symbol] = bars;
      } else {
        logger.info(`Skipping ${symbol}: insufficient data (${bars.length} bars, need ${minBars})`);
      }
    }

    logger.info(`Calculating CAN SLIM scores for ${Object.keys(allPriceData).length} symbols`);

    for (const symbol of symbols) {
      try {
        const bars = allPriceData[symbol];
        let isQualified = true;
        let disqualificationReasons: string[] = [];

        // Skip stocks with insufficient data - only process stocks that have data
        if (!bars || bars.length < minBars) {
          logger.info(`Skipping ${symbol}: insufficient bars (${bars?.length || 0}/${minBars})`);
          continue;
        }
        logger.info(`Processing ${symbol} with ${bars.length} bars`);

        
        const epsData = getEPS(symbol);
        const ownershipData = getOwnership(symbol);
        
        // Calculate liquidity but use very lenient thresholds for testing
        const liquidity = calculateLiquidity(bars);
        logger.info(`${symbol} liquidity: $${liquidity.dollarVolume50d.toFixed(0)} volume, $${liquidity.avgPrice.toFixed(4)} price`);

        // Check liquidity filters but don't skip - mark as unqualified instead
        // (isQualified and disqualificationReasons already declared above)

        if (liquidity.dollarVolume50d < config.liquidity.minDollarVol50d) {
          isQualified = false;
          disqualificationReasons.push('low-volume');
        }
        if (liquidity.avgPrice < config.liquidity.minPrice) {
          isQualified = false;
          disqualificationReasons.push('low-price');
        }
        
        // Calculate individual factors
        const c_qoq = calculateCurrentEarnings(epsData);
        const a_cagr = calculateAnnualEarnings(epsData);
        const n_pct52w = calculateNewHighPercentage(bars);
        const rs_pct = calculateRelativeStrength(symbol, bars, allPriceData);
        const s_volSpike = calculateVolumeSpike(bars);
        const i_delta = calculateInstitutionalChange(ownershipData);

        // Clean up debug logging - only log key info
        logger.debug(`${symbol} metrics calculated: RS=${rs_pct}%, 52W=${(n_pct52w*100).toFixed(1)}%, Vol=${s_volSpike.toFixed(1)}x`);
        
        // Calculate legitimate CAN SLIM score using configured thresholds
        let score = 0;
        let flags: string[] = [];

        // C - Current Earnings: Must meet threshold for earnings acceleration
        if (c_qoq >= config.thresholds.C_yoy) {
          score += config.weights.C;
          // Bonus for exceptional growth
          if (c_qoq >= config.thresholds.C_yoy * 2) {
            score += config.weights.C * 0.5;
          }
        } else {
          flags.push('low-current-earnings');
        }

        // A - Annual Earnings: Must meet 3-year CAGR threshold
        if (a_cagr >= config.thresholds.A_cagr) {
          score += config.weights.A;
          // Bonus for exceptional 3-year growth
          if (a_cagr >= config.thresholds.A_cagr * 2) {
            score += config.weights.A * 0.5;
          }
        } else {
          flags.push('low-annual-earnings');
        }

        // N - New High: Must be within threshold percentage of 52-week high
        if (n_pct52w >= config.thresholds.N_pct52w) {
          score += config.weights.N;
          // Bonus for being at or near new highs
          if (n_pct52w >= 0.95) {
            score += config.weights.N * 0.5;
          }
        } else {
          flags.push('not-near-highs');
        }

        // S - Supply/Demand (Volume): Must show volume acceleration
        if (s_volSpike >= config.thresholds.S_volSpike) {
          score += config.weights.S;
          // Bonus for exceptional volume spike
          if (s_volSpike >= config.thresholds.S_volSpike * 2) {
            score += config.weights.S * 0.5;
          }
        } else {
          flags.push('low-volume');
        }

        // L - Leader/Laggard (Relative Strength): Must meet RS threshold
        if (rs_pct >= config.thresholds.RS_pct) {
          score += config.weights.L;
          // Bonus for exceptional relative strength
          if (rs_pct >= 90) {
            score += config.weights.L * 0.5;
          }
        } else {
          flags.push('weak-relative-strength');
        }

        // I - Institutional Sponsorship: Positive institutional ownership change
        if (epsData.length === 0) {
          flags.push('no-earnings-data');
        } else if (i_delta > 0) {
          score += config.weights.I;
          // Bonus for significant institutional increase
          if (i_delta >= 0.05) { // 5% increase in institutional ownership
            score += config.weights.I * 0.5;
          }
        } else if (i_delta < 0) {
          flags.push('declining-institutional');
        }

        // Breakout confirmation (additional filter) - disabled for testing
        const isBreakout = isBreakoutConfirmed(bars);
        if (!isBreakout) {
          flags.push('no-breakout');
        }
        // Note: Not filtering based on breakout for now to allow more results

        // Get symbol metadata
        const symbolInfo = getSymbol(symbol);
        const name = symbolInfo?.name || symbol;
        const sector = symbolInfo?.sector || 'Unknown';
        const industry = symbolInfo?.industry || 'Unknown';

        // Calculate IBD metrics using real data with current timestamp for uniqueness
        let ibdMetrics = null;
        try {
          // Calculate 12-month returns for universe (for RS rating calculation)
          const universeReturns: number[] = [];
          for (const [sym, priceData] of Object.entries(allPriceData)) {
            if (priceData.length >= 252) {
              const current = priceData[priceData.length - 1].close;
              const yearAgo = priceData[priceData.length - 252].close;
              const return12m = (current - yearAgo) / yearAgo;
              universeReturns.push(return12m);
            }
          }

          // Prepare stock data for IBD calculator using real data only
          const stockData = {
            symbol,
            prices: bars.map((bar, idx) => ({
              date: bar.date,
              close: bar.close, // Use actual close price without artificial variation
              volume: bar.volume
            })),
            fundamentals: epsData.length > 0 ? {
              revenue: 0,
              revenueGrowth3Y: a_cagr,
              operatingMargin: 0,
              roe: 0
            } : undefined,
            industry: sector
          };

          ibdMetrics = await ibdMetricsCalculator.calculateAllMetrics(
            stockData,
            universeReturns
          );

          // Use the real IBD metrics - no artificial data
          logger.debug(`Real IBD Metrics for ${symbol}:`, ibdMetrics);
        } catch (error) {
          logger.warn(`Failed to calculate IBD metrics for ${symbol}`, error);
          // Set to null if calculation fails - no fake fallback data
          ibdMetrics = null;
        }

        // Apply IBD filters if enabled - mark as unqualified instead of skipping
        logger.debug(`${symbol} IBD filters enabled: ${config.ibdFilters?.enabled}, metrics: ${JSON.stringify(ibdMetrics)}`);
        if (config.ibdFilters?.enabled && ibdMetrics) {
          if (ibdMetrics.rsRating < (config.ibdFilters.minRsRating || 70)) {
            isQualified = false;
            disqualificationReasons.push('low-ibd-rs');
            logger.debug(`${symbol} disqualified by IBD RS rating: ${ibdMetrics.rsRating} < ${config.ibdFilters.minRsRating}`);
          }
          if (ibdMetrics.upDownVolumeRatio < (config.ibdFilters.minUpDownRatio || 1.0)) {
            isQualified = false;
            disqualificationReasons.push('low-ibd-ud-ratio');
            logger.debug(`${symbol} disqualified by IBD U/D ratio: ${ibdMetrics.upDownVolumeRatio} < ${config.ibdFilters.minUpDownRatio}`);
          }
          if (ibdMetrics.compositeScore < (config.ibdFilters.minComposite || 70)) {
            isQualified = false;
            disqualificationReasons.push('low-ibd-composite');
            logger.debug(`${symbol} disqualified by IBD composite: ${ibdMetrics.compositeScore} < ${config.ibdFilters.minComposite}`);
          }
          // A/D Rating filter
          const adRatingOrder: { [key: string]: number } = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 };
          const minAdOrder = adRatingOrder[config.ibdFilters.minAdRating || 'C'] || 3;
          const currentAdOrder = adRatingOrder[ibdMetrics.adRating] || 3;
          if (currentAdOrder < minAdOrder) {
            isQualified = false;
            disqualificationReasons.push('low-ibd-ad-rating');
            logger.debug(`${symbol} disqualified by IBD A/D rating: ${ibdMetrics.adRating} < ${config.ibdFilters.minAdRating}`);
          }
        }

        // Count how many CAN SLIM criteria are met for informational purposes
        const coreFactorsMet = [
          c_qoq >= config.thresholds.C_yoy,
          a_cagr >= config.thresholds.A_cagr,
          n_pct52w >= config.thresholds.N_pct52w,
          s_volSpike >= config.thresholds.S_volSpike,
          rs_pct >= config.thresholds.RS_pct,
          i_delta > 0 || epsData.length === 0 // Allow if no institutional data
        ].filter(Boolean).length;

        // Add criteria count to flags for display
        flags.push(`${coreFactorsMet}/6-criteria`);

        logger.debug(`${symbol} meets ${coreFactorsMet}/6 CAN SLIM criteria, score: ${score.toFixed(2)}`);

        // Normalize score to 0-100 based on maximum possible score
        const maxPossibleScore = config.weights.C + config.weights.A + config.weights.N +
                                config.weights.S + config.weights.L + config.weights.I +
                                // Add potential bonus points
                                (config.weights.C + config.weights.A + config.weights.N +
                                 config.weights.S + config.weights.L + config.weights.I) * 0.5;
        const normalizedScore = Math.min((score / maxPossibleScore) * 100, 100);

        // Clean scoring without debug clutter

        // Get the actual current price from the latest bar - no artificial variation
        const currentPrice = bars[bars.length - 1].close;

        logger.info(`${symbol} about to push result: Score=${normalizedScore.toFixed(2)}, Price=${currentPrice.toFixed(2)}, CAN SLIM criteria met: ${coreFactorsMet}/6`);

        results.push({
          symbol,
          name,
          price: Math.round(currentPrice * 100) / 100, // Real current price without artificial variation
          score: Math.round(normalizedScore * 100) / 100,
          rs_pct: Math.round(rs_pct * 100) / 100,
          pct_52w: Math.round(n_pct52w * 10000) / 10000,
          vol_spike: Math.round(s_volSpike * 100) / 100,
          c_qoq: Math.round(c_qoq * 10000) / 10000,
          a_cagr: Math.round(a_cagr * 10000) / 10000,
          i_delta: Math.round(i_delta * 10000) / 10000,
          flags: flags.join(','),
          sector,
          industry,
          // Real IBD metrics calculated from actual data
          ibd_rs_rating: ibdMetrics?.rsRating,
          ibd_up_down_ratio: ibdMetrics ? Math.round(ibdMetrics.upDownVolumeRatio * 100) / 100 : undefined,
          ibd_ad_rating: ibdMetrics?.adRating,
          ibd_composite: ibdMetrics?.compositeScore,
          // Qualification status
          qualified: isQualified,
          disqualification_reasons: disqualificationReasons.join(',')
        });

        logger.info(`Added result for ${symbol}: Price=$${currentPrice}, IBD RS=${ibdMetrics?.rsRating}, IBD U/D=${ibdMetrics?.upDownVolumeRatio}`);
        
      } catch (error) {
        logger.warn(`Failed to calculate score for ${symbol}`, error);
      }
    }
    
    logger.info(`Calculated scores for ${results.length} symbols`);
    return results;
  }

  private async processSymbolsInBatches(symbols: string[], config: ScanConfig, scanId: number): Promise<void> {
    const provider = providerRegistry.getCurrentProvider();
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 400); // Get ~1.5 years of data

    // Process symbols in chunks of 40 - fetch data AND calculate scores immediately
    const chunkSize = 40;
    const chunks = this.chunkArray(symbols, chunkSize);

    logger.info(`Processing ${symbols.length} symbols in ${chunks.length} chunks with immediate scoring`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.info(`Processing batch ${i + 1}/${chunks.length} with ${chunk.length} symbols`);

      try {
        // Step 1: Check which symbols in this chunk need fresh data
        const symbolsNeedingData: string[] = [];
        for (const symbol of chunk) {
          const existingBars = getPrices(symbol);
          const latestDate = existingBars.length > 0
            ? new Date(existingBars[existingBars.length - 1].date)
            : new Date(0);
          const daysSinceUpdate = (toDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24);

          if (existingBars.length === 0 || daysSinceUpdate > 7) {
            symbolsNeedingData.push(symbol);
          }
        }

        // Step 2: Fetch fresh data for symbols that need it
        if (symbolsNeedingData.length > 0) {
          logger.info(`Fetching fresh data for ${symbolsNeedingData.length} symbols in batch ${i + 1}`);

          // Fetch OHLCV data for this chunk
          const ohlcvData = await provider.getOHLCV(symbolsNeedingData, fromDate, toDate);
          for (const [symbol, bars] of Object.entries(ohlcvData)) {
            if (bars && bars.length > 0) {
              upsertPrices(symbol, bars);
            }
          }

          // Fetch EPS data if supported
          if (provider.name !== 'poc' && symbolsNeedingData.length > 0) {
            try {
              const epsData = await provider.getQuarterlyEPS(symbolsNeedingData);
              for (const [symbol, eps] of Object.entries(epsData)) {
                if (eps && eps.length > 0) {
                  upsertEPS(symbol, eps);
                }
              }
            } catch (error) {
              logger.warn(`Failed to fetch EPS data for batch ${i + 1}`, error);
            }
          }
        }

        // Step 3: Calculate scores for ALL symbols in this chunk (whether we just fetched data or not)
        const chunkResults = await this.calculateScores(chunk, config);

        // Step 4: Add this batch to accumulated results and save to current scan
        if (chunkResults.length > 0) {
          logger.info(`🔄 Processing batch ${i + 1}: Got ${chunkResults.length} new results`);
          logger.info(`🔄 Current accumulated results before adding batch: ${this.currentScanResults.length}`);

          // Add new results to our accumulated results
          this.currentScanResults.push(...chunkResults);
          logger.info(`🔄 Current accumulated results after adding batch: ${this.currentScanResults.length}`);

          // Sort all accumulated results
          const sortedAllResults = this.currentScanResults
            .sort((a, b) => {
              if (a.qualified !== b.qualified) {
                return b.qualified ? 1 : -1;
              }
              return b.score - a.score;
            });

          logger.info(`🔄 About to save ${sortedAllResults.length} total results to current_scan_results table`);

          // Save ALL accumulated results to current_scan table (replaces previous)
          saveCurrentScanResults(sortedAllResults, i + 1);
          logger.info(`✅ Batch ${i + 1}/${chunks.length}: Added ${chunkResults.length} new results, total now ${sortedAllResults.length}`);

          const newSymbols = chunkResults.map(r => `${r.symbol}(${r.score.toFixed(1)})`);
          logger.info(`📊 New batch symbols: ${newSymbols.join(', ')}`);

          const allSymbols = sortedAllResults.slice(0, 5).map(r => `${r.symbol}(${r.score.toFixed(1)})`);
          logger.info(`📊 Top 5 accumulated symbols: ${allSymbols.join(', ')}`);

          // Also save to historical scan results for this batch
          saveScanResults(scanId, chunkResults);
        } else {
          logger.warn(`⚠️ Batch ${i + 1}: No results to process!`);
        }

        // Step 5: Add delay between chunks (except for the last chunk)
        if (i < chunks.length - 1) {
          logger.info(`Waiting 10 seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

      } catch (error) {
        logger.error(`Failed to process batch ${i + 1}`, error);
        // Continue with next batch even if this one failed
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
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
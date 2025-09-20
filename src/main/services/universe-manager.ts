import axios from 'axios';
import { logger } from './logger';
import { upsertSymbol, deleteUniverseSymbols, getSymbols } from './db';
import { SymbolRow } from '../types';

export class UniverseManager {
  async refreshUniverse(source: 'nasdaq' | 'sp500' | 'sp1500' | 'russell2000' = 'sp1500'): Promise<void> {
    try {
      logger.info(`Refreshing ${source} universe`);

      let symbols: SymbolRow[] = [];

      switch (source) {
        case 'nasdaq':
          symbols = await this.fetchNasdaqListed();
          break;
        case 'sp500':
          symbols = await this.fetchSP500();
          break;
        case 'sp1500':
          symbols = await this.fetchSP1500();
          break;
        case 'russell2000':
          symbols = await this.fetchRussell2000();
          break;
      }

      // Clean existing universe data
      deleteUniverseSymbols();

      // Insert new symbols
      for (const symbol of symbols) {
        try {
          upsertSymbol(symbol);
        } catch (error) {
          logger.warn(`Failed to insert symbol ${symbol.symbol}`, error);
        }
      }

      logger.info(`Universe refresh completed: ${symbols.length} symbols loaded`);

    } catch (error) {
      logger.error(`Failed to refresh ${source} universe`, error);
      throw error;
    }
  }

  private async fetchNasdaqListed(): Promise<SymbolRow[]> {
    const symbols: SymbolRow[] = [];

    // Fetch NASDAQ-listed stocks
    const nasdaqResponse = await axios.get('http://nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt');
    const nasdaqLines = nasdaqResponse.data.split('\n');

    for (const line of nasdaqLines.slice(1, -2)) { // Skip header and footer
      const fields = line.split('|');
      if (fields.length >= 4 && fields[0] && fields[1]) {
        symbols.push({
          symbol: fields[0].trim(),
          name: fields[1].trim(),
          sector: fields[6] || 'Unknown',
          industry: fields[7] || 'Unknown',
          exchange: 'NASDAQ'
        });
      }
    }

    // Fetch other listed (NYSE, etc.)
    const otherResponse = await axios.get('http://nasdaqtrader.com/dynamic/SymDir/otherlisted.txt');
    const otherLines = otherResponse.data.split('\n');

    for (const line of otherLines.slice(1, -2)) {
      const fields = line.split('|');
      if (fields.length >= 4 && fields[0] && fields[1]) {
        symbols.push({
          symbol: fields[0].trim(),
          name: fields[1].trim(),
          sector: 'Unknown',
          industry: 'Unknown',
          exchange: fields[2] || 'NYSE'
        });
      }
    }

    return symbols.filter(s =>
      s.symbol.length <= 5 && // Filter out complex symbols
      !s.symbol.includes('.') && // No preferred shares
      !/[^A-Z]/.test(s.symbol) // Only letters
    );
  }

  private async fetchSP500(): Promise<SymbolRow[]> {
    // Wikipedia S&P 500 list as fallback
    try {
      const response = await axios.get('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies');
      const html = response.data;

      const symbols: SymbolRow[] = [];
      // Simple regex to extract symbols - in production, use proper HTML parser
      const symbolMatches = html.match(/data-sort-value="([A-Z]{1,5})"/g);

      if (symbolMatches) {
        for (const match of symbolMatches.slice(0, 500)) {
          const symbol = match.match(/data-sort-value="([A-Z]{1,5})"/)?.[1];
          if (symbol) {
            symbols.push({
              symbol,
              name: symbol,
              sector: 'Unknown',
              industry: 'Unknown',
              exchange: 'NYSE/NASDAQ'
            });
          }
        }
      }

      return symbols;
    } catch (error) {
      logger.warn('Failed to fetch S&P 500 from Wikipedia, using hardcoded list');
      return this.getHardcodedSP500();
    }
  }

  private async fetchSP1500(): Promise<SymbolRow[]> {
    // For S&P 1500, combine S&P 500 with mid and small cap
    const sp500 = await this.fetchSP500();

    // Add some common mid/small cap stocks
    const additionalSymbols = [
      'TSLA', 'NVDA', 'AMD', 'CRM', 'ADBE', 'NFLX', 'PYPL', 'DOCU', 'ZOOM',
      'ROKU', 'TWLO', 'OKTA', 'DDOG', 'SNOW', 'PLTR', 'RBLX', 'COIN'
    ];

    for (const symbol of additionalSymbols) {
      if (!sp500.find(s => s.symbol === symbol)) {
        sp500.push({
          symbol,
          name: symbol,
          sector: 'Technology',
          industry: 'Software',
          exchange: 'NASDAQ'
        });
      }
    }

    return sp500;
  }

  private async fetchRussell2000(): Promise<SymbolRow[]> {
    // Simplified Russell 2000 - would need official data source in production
    const commonSmallCaps = [
      'ACAD', 'ACER', 'ACIW', 'ACLS', 'ACOR', 'ACRS', 'ADTN', 'AEGN', 'AEIS', 'AGIO',
      'AIMC', 'ALCO', 'ALIM', 'ALKS', 'ALRM', 'ALTR', 'AMBC', 'AMCX', 'AMPH', 'AMRS',
      'ANAB', 'ANGI', 'ANTE', 'AOSL', 'APEI', 'APOG', 'APPF', 'APPS', 'ARCO', 'ARCT'
    ];

    return commonSmallCaps.map(symbol => ({
      symbol,
      name: symbol,
      sector: 'Unknown',
      industry: 'Unknown',
      exchange: 'NASDAQ'
    }));
  }

  private getHardcodedSP500(): SymbolRow[] {
    const sp500Symbols = [
      'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'TSLA', 'BRK.B', 'UNH', 'JNJ', 'META',
      'NVDA', 'JPM', 'V', 'PG', 'XOM', 'HD', 'CVX', 'MA', 'BAC', 'ABBV',
      'PFE', 'AVGO', 'KO', 'LLY', 'MRK', 'COST', 'DIS', 'PEP', 'TMO', 'WMT',
      'ABT', 'DHR', 'MCD', 'VZ', 'ACN', 'CSCO', 'ADBE', 'NEE', 'CRM', 'NFLX',
      'LIN', 'NKE', 'TXN', 'BMY', 'UPS', 'QCOM', 'PM', 'RTX', 'UNP', 'LOW'
    ];

    return sp500Symbols.map(symbol => ({
      symbol,
      name: symbol,
      sector: 'Unknown',
      industry: 'Unknown',
      exchange: 'NYSE/NASDAQ'
    }));
  }

  async getUniverseStats(): Promise<{
    total: number;
    exchanges: Record<string, number>;
    sectors: Record<string, number>;
  }> {
    const symbols = getSymbols();
    const stats = {
      total: symbols.length,
      exchanges: {} as Record<string, number>,
      sectors: {} as Record<string, number>
    };

    for (const symbol of symbols) {
      stats.exchanges[symbol.exchange] = (stats.exchanges[symbol.exchange] || 0) + 1;
      stats.sectors[symbol.sector] = (stats.sectors[symbol.sector] || 0) + 1;
    }

    return stats;
  }
}

export const universeManager = new UniverseManager();
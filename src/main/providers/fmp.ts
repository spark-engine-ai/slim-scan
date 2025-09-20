import axios from 'axios';
import { MarketProvider } from './provider-registry';
import { Bar, SymbolRow, EpsRow, OwnershipRow } from '../types';

export class FMPProvider implements MarketProvider {
  name = 'fmp' as const;
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/stable';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getUniverse(): Promise<SymbolRow[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/company-screener`, {
        params: {
          marketCapMoreThan: 100000000, // $100M+ market cap
          exchange: 'NASDAQ,NYSE', // Filter to major exchanges
          country: 'US',
          isActivelyTrading: true,
          limit: 5000,
          apikey: this.apiKey
        }
      });

      return response.data
        .map((ticker: any) => ({
          symbol: ticker.symbol,
          name: ticker.companyName || '',
          sector: ticker.sector || 'Unknown',
          industry: ticker.industry || 'Unknown',
          exchange: ticker.exchange
        }));
    } catch (error) {
      console.error('Failed to fetch universe from FMP:', error);
      throw error;
    }
  }

  async getOHLCV(symbols: string[], from: Date, to: Date): Promise<Record<string, Bar[]>> {
    const result: Record<string, Bar[]> = {};
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    for (const symbol of symbols) {
      try {
        const response = await axios.get(`${this.baseUrl}/historical-price-eod/full`, {
          params: {
            symbol: symbol,
            from: fromStr,
            to: toStr,
            apikey: this.apiKey
          }
        });

        if (Array.isArray(response.data)) {
          result[symbol] = response.data
            .reverse() // FMP returns newest first, we want oldest first
            .map((bar: any) => ({
              date: bar.date,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              volume: bar.volume || 0
            }));
        }
      } catch (error) {
        console.warn(`Failed to fetch OHLCV for ${symbol}:`, error);
      }

      // Rate limiting - FMP allows 250 requests/minute on free tier
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    return result;
  }

  async getQuarterlyEPS(symbols: string[]): Promise<Record<string, EpsRow[]>> {
    const result: Record<string, EpsRow[]> = {};

    for (const symbol of symbols) {
      try {
        const response = await axios.get(`${this.baseUrl}/income-statement`, {
          params: {
            symbol: symbol,
            period: 'quarter',
            limit: 20, // Get last 20 quarters (5 years)
            apikey: this.apiKey
          }
        });

        if (Array.isArray(response.data)) {
          result[symbol] = response.data.map((statement: any) => ({
            symbol,
            qend: statement.date,
            eps: parseFloat(statement.eps || statement.epsDiluted) || 0
          }));
        }
      } catch (error) {
        console.warn(`Failed to fetch EPS for ${symbol}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 250));
    }

    return result;
  }

  async getOwnership(symbols: string[]): Promise<Record<string, OwnershipRow[]>> {
    const result: Record<string, OwnershipRow[]> = {};

    for (const symbol of symbols) {
      try {
        // Get current quarter and year
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentQuarter = Math.floor((now.getMonth() + 3) / 3);

        // Try current quarter first, then previous quarter
        let positionsData = null;
        for (let qOffset = 0; qOffset < 2; qOffset++) {
          const year = currentQuarter - qOffset > 0 ? currentYear : currentYear - 1;
          const quarter = currentQuarter - qOffset > 0 ? currentQuarter - qOffset : 4;

          try {
            const response = await axios.get(`${this.baseUrl}/institutional-ownership/symbol-positions-summary`, {
              params: {
                symbol: symbol,
                year: year.toString(),
                quarter: quarter.toString(),
                apikey: this.apiKey
              }
            });

            if (Array.isArray(response.data) && response.data.length > 0) {
              positionsData = response.data[0];
              break;
            }
          } catch (quarterError) {
            // Try next quarter
            continue;
          }
        }

        if (positionsData) {
          // Calculate institutional percentage from the positions data
          const instPct = positionsData.totalInvested && positionsData.totalInvested > 0
            ? Math.min(positionsData.totalInvestedChange / positionsData.totalInvested, 1)
            : 0.3; // Default fallback

          result[symbol] = [{
            symbol,
            date: positionsData.date || new Date().toISOString().split('T')[0],
            inst_pct: Math.abs(instPct), // Ensure positive
            filers_added: positionsData.investorsHolding || 0
          }];
        } else {
          // Fallback: estimate based on profile data
          const profileResponse = await axios.get(`${this.baseUrl}/profile`, {
            params: {
              symbol: symbol,
              apikey: this.apiKey
            }
          });

          if (Array.isArray(profileResponse.data) && profileResponse.data[0]) {
            const profile = profileResponse.data[0];
            const marketCap = profile.marketCap || 0;
            const estimatedInstPct = marketCap > 10000000000 ? 0.7 : marketCap > 1000000000 ? 0.4 : 0.2;

            result[symbol] = [{
              symbol,
              date: new Date().toISOString().split('T')[0],
              inst_pct: estimatedInstPct,
              filers_added: 0
            }];
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ownership for ${symbol}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 300)); // Extra delay for multiple requests
    }

    return result;
  }

  async getIndexBars(ticker: string, from: Date, to: Date): Promise<Bar[]> {
    try {
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];

      const response = await axios.get(`${this.baseUrl}/historical-price-eod/light`, {
        params: {
          symbol: ticker,
          from: fromStr,
          to: toStr,
          apikey: this.apiKey
        }
      });

      if (Array.isArray(response.data)) {
        return response.data
          .reverse() // FMP returns newest first, we want oldest first
          .map((bar: any) => ({
            date: bar.date,
            open: bar.price, // Light endpoint only has price
            high: bar.price,
            low: bar.price,
            close: bar.price,
            volume: bar.volume || 0
          }));
      }
      return [];
    } catch (error) {
      console.warn(`Failed to fetch index data for ${ticker}:`, error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/profile`, {
        params: {
          symbol: 'AAPL',
          apikey: this.apiKey
        },
        timeout: 5000
      });
      return response.status === 200 && Array.isArray(response.data) && response.data.length > 0;
    } catch {
      return false;
    }
  }
}
import axios from 'axios';
import { MarketProvider } from './provider-registry';
import { Bar, SymbolRow, EpsRow, OwnershipRow } from '../types';

export class PolygonProvider implements MarketProvider {
  name = 'polygon' as const;
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getUniverse(opts?: { exchange?: string }): Promise<SymbolRow[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/v3/reference/tickers`, {
        params: {
          market: 'stocks',
          active: true,
          limit: 1000,
          apikey: this.apiKey
        }
      });

      return response.data.results.map((ticker: any) => ({
        symbol: ticker.ticker,
        name: ticker.name || '',
        sector: ticker.sic_description || 'Unknown',
        industry: ticker.share_class_figi || 'Unknown',
        exchange: ticker.primary_exchange || ticker.market
      }));
    } catch (error) {
      console.error('Failed to fetch universe from Polygon:', error);
      throw error;
    }
  }

  async getOHLCV(symbols: string[], from: Date, to: Date): Promise<Record<string, Bar[]>> {
    const result: Record<string, Bar[]> = {};
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    for (const symbol of symbols) {
      try {
        const response = await axios.get(`${this.baseUrl}/v2/aggs/ticker/${symbol}/range/1/day/${fromStr}/${toStr}`, {
          params: {
            adjusted: true,
            sort: 'asc',
            apikey: this.apiKey
          }
        });

        if (response.data.results) {
          result[symbol] = response.data.results.map((bar: any) => ({
            date: new Date(bar.t).toISOString().split('T')[0],
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v
          }));
        }
      } catch (error) {
        console.warn(`Failed to fetch OHLCV for ${symbol}:`, error);
      }

      // Rate limiting - Polygon free tier has limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return result;
  }

  async getQuarterlyEPS(symbols: string[]): Promise<Record<string, EpsRow[]>> {
    const result: Record<string, EpsRow[]> = {};

    for (const symbol of symbols) {
      try {
        const response = await axios.get(`${this.baseUrl}/v2/reference/financials/${symbol}`, {
          params: {
            apikey: this.apiKey
          }
        });

        if (response.data.results) {
          result[symbol] = response.data.results
            .filter((report: any) => report.period === 'quarterly')
            .map((report: any) => ({
              symbol,
              qend: report.calendarDate,
              eps: report.financials?.income_statement?.basic_earnings_per_share?.value || 0
            }));
        }
      } catch (error) {
        console.warn(`Failed to fetch EPS for ${symbol}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return result;
  }

  async getOwnership(symbols: string[]): Promise<Record<string, OwnershipRow[]>> {
    const result: Record<string, OwnershipRow[]> = {};

    for (const symbol of symbols) {
      try {
        // Try institutional ownership endpoint (requires premium tier)
        const response = await axios.get(`${this.baseUrl}/v3/reference/institutional-ownerships/${symbol}`, {
          params: {
            apikey: this.apiKey
          }
        });

        if (response.data.results && response.data.results.length > 0) {
          // Calculate total institutional percentage from all filings
          const filings = response.data.results;
          const latestQuarter = filings[0]; // Most recent quarter

          const totalValue = latestQuarter.value || 0;
          const totalShares = latestQuarter.shares || 0;

          result[symbol] = [{
            symbol,
            date: new Date().toISOString().split('T')[0],
            inst_pct: totalValue > 0 ? Math.min(totalShares / 100000000, 1) : 0, // Rough approximation
            filers_added: filings.length
          }];
        }
      } catch (error) {
        // Fall back to a simpler approach using market cap as proxy
        try {
          const tickerResponse = await axios.get(`${this.baseUrl}/v3/reference/tickers/${symbol}`, {
            params: { apikey: this.apiKey }
          });

          if (tickerResponse.data.results) {
            const marketCap = tickerResponse.data.results.market_cap || 0;
            // Rough estimate: larger market cap = higher institutional ownership
            const estimatedInstPct = marketCap > 10000000000 ? 0.7 : marketCap > 1000000000 ? 0.4 : 0.2;

            result[symbol] = [{
              symbol,
              date: new Date().toISOString().split('T')[0],
              inst_pct: estimatedInstPct,
              filers_added: 0
            }];
          }
        } catch (fallbackError) {
          console.warn(`Failed to fetch ownership data for ${symbol}:`, fallbackError);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return result;
  }

  async getIndexBars(ticker: string, from: Date, to: Date): Promise<Bar[]> {
    const data = await this.getOHLCV([ticker], from, to);
    return data[ticker] || [];
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/aggs/ticker/AAPL/prev`, {
        params: { apikey: this.apiKey },
        timeout: 5000
      });
      return response.status === 200 && response.data.status === 'OK';
    } catch {
      return false;
    }
  }
}
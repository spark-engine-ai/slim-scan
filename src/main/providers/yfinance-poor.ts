import axios from 'axios';
import { MarketProvider } from './provider-registry';
import { Bar, SymbolRow, EpsRow, OwnershipRow } from '../types';

export class YFinancePoorProvider implements MarketProvider {
  name = 'poc' as const;

  async getUniverse(): Promise<SymbolRow[]> {
    // Hardcoded S&P 500 symbols for POC
    const sp500Symbols = [
      'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA', 'META', 'NVDA', 'BRK-B', 'UNH', 'JNJ',
      'V', 'PG', 'JPM', 'HD', 'CVX', 'MA', 'BAC', 'ABBV', 'PFE', 'KO',
      'AVGO', 'TMO', 'COST', 'PEP', 'WMT', 'DIS', 'ABT', 'DHR', 'VZ', 'NKE',
      'ADBE', 'CRM', 'ACN', 'TXN', 'NEE', 'RTX', 'BMY', 'QCOM', 'PM', 'T',
      'HON', 'LIN', 'SBUX', 'LOW', 'UPS', 'AMD', 'CAT', 'IBM', 'GILD', 'ORCL'
    ];

    return sp500Symbols.map(symbol => ({
      symbol,
      name: `${symbol} Inc`, // Placeholder
      sector: 'Technology', // Placeholder
      industry: 'Software', // Placeholder
      exchange: 'NASDAQ'
    }));
  }

  async getOHLCV(symbols: string[], from: Date, to: Date): Promise<Record<string, Bar[]>> {
    const result: Record<string, Bar[]> = {};

    for (const symbol of symbols.slice(0, 5)) { // Limit to prevent rate limiting
      try {
        // Using Alpha Vantage free API (limited)
        const response = await axios.get(`https://www.alphavantage.co/query`, {
          params: {
            function: 'TIME_SERIES_DAILY',
            symbol: symbol,
            apikey: 'demo', // Demo key - very limited
            outputsize: 'full'
          },
          timeout: 5000
        });

        if (response.data['Time Series (Daily)']) {
          const timeSeries = response.data['Time Series (Daily)'];
          const bars: Bar[] = [];

          for (const [date, data] of Object.entries(timeSeries)) {
            const dateObj = new Date(date);
            if (dateObj >= from && dateObj <= to) {
              bars.push({
                date,
                open: parseFloat((data as any)['1. open']),
                high: parseFloat((data as any)['2. high']),
                low: parseFloat((data as any)['3. low']),
                close: parseFloat((data as any)['4. close']),
                volume: parseInt((data as any)['5. volume'])
              });
            }
          }

          result[symbol] = bars.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
      } catch (error) {
        console.warn(`Failed to fetch data for ${symbol}:`, error);
        // Generate fake data for demo
        result[symbol] = this.generateFakeData(symbol, from, to);
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return result;
  }

  async getQuarterlyEPS(_symbols: string[]): Promise<Record<string, EpsRow[]>> {
    // EPS data is very limited in free APIs
    // Return empty for POC - will show "data-limited" flag
    return {};
  }

  async getOwnership(_symbols: string[]): Promise<Record<string, OwnershipRow[]>> {
    // Ownership data not available in free APIs
    return {};
  }

  async getIndexBars(ticker: string, from: Date, to: Date): Promise<Bar[]> {
    try {
      const data = await this.getOHLCV([ticker], from, to);
      return data[ticker] || [];
    } catch (error) {
      console.warn(`Failed to fetch index data for ${ticker}:`, error);
      return this.generateFakeData(ticker, from, to);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get('https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=AAPL&interval=5min&apikey=demo', {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private generateFakeData(symbol: string, from: Date, to: Date): Bar[] {
    const bars: Bar[] = [];
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    let price = 100 + Math.random() * 100; // Starting price
    
    for (let i = 0; i < days; i++) {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const change = (Math.random() - 0.5) * 0.1; // ±5% change
      const open = price;
      const close = price * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.03);
      const low = Math.min(open, close) * (1 - Math.random() * 0.03);
      const volume = Math.floor(1000000 + Math.random() * 5000000);
      
      bars.push({
        date: date.toISOString().split('T')[0],
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume
      });
      
      price = close;
    }
    
    return bars;
  }
}
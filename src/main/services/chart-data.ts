import { providerRegistry } from '../providers/provider-registry';
import { getPrices, upsertPrices } from './db';
import { logger } from './logger';
import { ChartData } from '../types';

export async function fetchChartData(symbol: string, days: number): Promise<ChartData> {
  try {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // First check cache
    let bars = getPrices(symbol, fromDate, toDate);

    // If no cached data or insufficient data, fetch from provider
    if (bars.length < days * 0.7) { // Allow for weekends/holidays
      logger.info(`Fetching chart data for ${symbol} from provider`);
      
      const provider = providerRegistry.getCurrentProvider();
      const fetchedData = await provider.getOHLCV([symbol], fromDate, toDate);
      
      if (fetchedData[symbol]) {
        upsertPrices(symbol, fetchedData[symbol]);
        bars = fetchedData[symbol];
      }
    }

    if (bars.length === 0) {
      throw new Error(`No chart data available for ${symbol}`);
    }

    // Calculate moving averages
    const closes = bars.map(bar => bar.close);
    const ma50 = calculateMA(closes, 50);
    const ma200 = calculateMA(closes, 200);
    
    // Calculate 52-week high
    const high52w = Math.max(...bars.slice(-252).map(bar => bar.high)); // Last 252 trading days ≈ 1 year

    return {
      symbol,
      bars: bars.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      ma50,
      ma200,
      high52w,
    };
  } catch (error) {
    logger.error(`Failed to fetch chart data for ${symbol}`, error);
    throw error;
  }
}

function calculateMA(values: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN); // Not enough data points
    } else {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  
  return result;
}
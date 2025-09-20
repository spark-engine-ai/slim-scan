import { Bar, EpsRow, OwnershipRow } from '../types';

export function calculateCurrentEarnings(epsData: EpsRow[]): number {
  if (epsData.length < 5) return 0; // Need at least 5 quarters for YoY comparison

  // Sort by quarter end date
  const sorted = epsData.sort((a, b) => new Date(b.qend).getTime() - new Date(a.qend).getTime());

  const latestQuarter = sorted[0];
  const latestDate = new Date(latestQuarter.qend);

  // Find same fiscal quarter last year (within 45 days)
  const targetDate = new Date(latestDate);
  targetDate.setFullYear(targetDate.getFullYear() - 1);

  const sameQuarterLastYear = sorted.slice(1).find(quarter => {
    const qDate = new Date(quarter.qend);
    const daysDiff = Math.abs((qDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 45;
  });

  if (!sameQuarterLastYear || sameQuarterLastYear.eps === 0) return 0;

  return (latestQuarter.eps - sameQuarterLastYear.eps) / Math.abs(sameQuarterLastYear.eps);
}

export function calculateAnnualEarnings(epsData: EpsRow[]): number {
  if (epsData.length < 16) return 0; // Need 4 years of data
  
  const sorted = epsData.sort((a, b) => new Date(b.qend).getTime() - new Date(a.qend).getTime());
  
  // Calculate trailing 4 quarters for current and 3 years ago
  const current4Q = sorted.slice(0, 4).reduce((sum, q) => sum + q.eps, 0);
  const threeYearsAgo4Q = sorted.slice(12, 16).reduce((sum, q) => sum + q.eps, 0);
  
  if (threeYearsAgo4Q <= 0) return 0;
  
  // Calculate CAGR over 3 years
  const cagr = Math.pow(current4Q / threeYearsAgo4Q, 1/3) - 1;
  return cagr;
}

export function calculateNewHighPercentage(bars: Bar[]): number {
  if (bars.length === 0) return 0;
  
  const latestPrice = bars[bars.length - 1].close;
  const high52w = Math.max(...bars.slice(-252).map(bar => bar.high)); // Last 252 trading days
  
  return latestPrice / high52w;
}

export function calculateRelativeStrength(symbol: string, symbolBars: Bar[], universeBars: Record<string, Bar[]>): number {
  if (symbolBars.length < 252) return 50; // Default middle percentile
  
  // Calculate 12-month return for the symbol
  const symbolReturn = calculateReturn(symbolBars, 252);
  
  // Calculate returns for all universe symbols
  const universeReturns: number[] = [];
  for (const [universeSymbol, bars] of Object.entries(universeBars)) {
    if (bars.length >= 252 && universeSymbol !== symbol) {
      const returnValue = calculateReturn(bars, 252);
      if (!isNaN(returnValue) && isFinite(returnValue)) {
        universeReturns.push(returnValue);
      }
    }
  }
  
  if (universeReturns.length === 0) return 50;
  
  // Calculate percentile rank
  const betterCount = universeReturns.filter(r => symbolReturn > r).length;
  return (betterCount / universeReturns.length) * 100;
}

export function calculateVolumeSpike(bars: Bar[]): number {
  if (bars.length < 51) return 1; // Not enough data

  const latestVolume = bars[bars.length - 1].volume;
  const avg50DayVolume = bars.slice(-51, -1).reduce((sum, bar) => sum + bar.volume, 0) / 50;

  return avg50DayVolume > 0 ? latestVolume / avg50DayVolume : 1;
}

export function isBreakoutConfirmed(bars: Bar[]): boolean {
  if (bars.length < 51) return false;

  const latestBar = bars[bars.length - 1];
  const ma50 = calculateMovingAverage(bars, 50);
  const latestMA50 = ma50[ma50.length - 1];

  // Price breakout: close above 50-day MA with volume confirmation
  const priceBreakout = latestBar.close > latestMA50;
  const volumeConfirmed = calculateVolumeSpike(bars) >= 1.5;

  // Additional confirmation: close in upper 50% of today's range
  const upperHalfRange = latestBar.close >= (latestBar.high + latestBar.low) / 2;

  return priceBreakout && volumeConfirmed && upperHalfRange;
}

export function calculateInstitutionalChange(ownershipData: OwnershipRow[]): number {
  if (ownershipData.length < 2) return 0;
  
  const sorted = ownershipData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sorted[0];
  const previous = sorted[1];
  
  return latest.inst_pct - previous.inst_pct;
}

export function calculateLiquidity(bars: Bar[]): { dollarVolume50d: number; avgPrice: number } {
  if (bars.length < 50) return { dollarVolume50d: 0, avgPrice: 0 };
  
  const last50Days = bars.slice(-50);
  const avgVolume = last50Days.reduce((sum, bar) => sum + bar.volume, 0) / 50;
  const avgPrice = last50Days.reduce((sum, bar) => sum + bar.close, 0) / 50;
  const dollarVolume50d = avgVolume * avgPrice;
  
  return { dollarVolume50d, avgPrice };
}

export function calculateMovingAverage(bars: Bar[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = bars.slice(i - period + 1, i + 1).reduce((acc, bar) => acc + bar.close, 0);
      result.push(sum / period);
    }
  }
  
  return result;
}

export function isMarketUptrend(indexBars: Bar[], maShort = 50, maLong = 200): boolean {
  if (indexBars.length < maLong) return true; // Default to true if insufficient data
  
  const latestPrice = indexBars[indexBars.length - 1].close;
  const ma50 = calculateMovingAverage(indexBars, maShort);
  const ma200 = calculateMovingAverage(indexBars, maLong);
  
  const latestMA50 = ma50[ma50.length - 1];
  const latestMA200 = ma200[ma200.length - 1];
  
  return latestPrice > latestMA50 && latestMA50 > latestMA200;
}

function calculateReturn(bars: Bar[], periods: number): number {
  if (bars.length < periods) return 0;
  
  const startPrice = bars[bars.length - periods].close;
  const endPrice = bars[bars.length - 1].close;
  
  return (endPrice - startPrice) / startPrice;
}
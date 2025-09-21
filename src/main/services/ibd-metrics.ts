/**
 * IBD-style metrics calculation using available market data
 * These are approximations of IBD's proprietary ratings
 */

import { logger } from './logger';

export interface IBDMetrics {
  rsRating: number; // 1-99, relative strength percentile
  upDownVolumeRatio: number; // 50-day up/down volume ratio
  adRating: string; // A-E, accumulation/distribution
  smrRating: string; // A-E, sales/margins/ROE combined
  industryGroupRank: number; // 1-N, industry relative strength
  compositeScore: number; // 1-99, combined score
}

export interface StockData {
  symbol: string;
  prices: Array<{ date: string; close: number; volume: number }>;
  fundamentals?: {
    revenue: number;
    revenueGrowth3Y?: number;
    operatingMargin?: number;
    roe?: number;
  };
  industry?: string;
}

export class IBDMetricsCalculator {
  /**
   * Calculate RS Rating (1-99) - 12-month relative performance percentile
   */
  calculateRSRating(symbolReturn12m: number, universeReturns: number[]): number {
    if (universeReturns.length === 0) return 50;

    const betterCount = universeReturns.filter(r => r <= symbolReturn12m).length;
    const percentile = (betterCount / universeReturns.length) * 100;

    return Math.max(1, Math.min(99, Math.round(percentile)));
  }

  /**
   * Calculate Up/Down Volume Ratio (50-day)
   */
  calculateUpDownVolumeRatio(priceData: Array<{ close: number; volume: number }>): number {
    if (priceData.length < 51) return 0;

    const last50 = priceData.slice(-50);
    let upVolume = 0;
    let downVolume = 0;

    for (let i = 1; i < last50.length; i++) {
      const current = last50[i];
      const previous = last50[i - 1];

      if (current.close > previous.close) {
        upVolume += current.volume;
      } else if (current.close < previous.close) {
        downVolume += current.volume;
      }
    }

    return downVolume > 0 ? upVolume / downVolume : 0;
  }

  /**
   * Calculate Accumulation/Distribution Rating (A-E)
   * Based on 13-week (65-day) volume-weighted price action
   */
  calculateADRating(priceData: Array<{ close: number; volume: number }>): string {
    if (priceData.length < 65) return 'C';

    const period = Math.min(65, priceData.length);
    const recentData = priceData.slice(-period);

    // Calculate 50-day average volume for comparison
    const avgVolumeData = priceData.slice(-50);
    const avgVolume = avgVolumeData.reduce((sum, d) => sum + d.volume, 0) / avgVolumeData.length;

    let accumulationScore = 0;

    for (let i = 1; i < recentData.length; i++) {
      const current = recentData[i];
      const previous = recentData[i - 1];

      // Only count days with above-average volume
      if (current.volume > avgVolume) {
        if (current.close > previous.close) {
          accumulationScore += 1; // Accumulation day
        } else if (current.close < previous.close) {
          accumulationScore -= 1; // Distribution day
        }
      }
    }

    // Convert score to A-E rating (simplified)
    if (accumulationScore >= 10) return 'A';
    if (accumulationScore >= 5) return 'B';
    if (accumulationScore >= -5) return 'C';
    if (accumulationScore >= -10) return 'D';
    return 'E';
  }

  /**
   * Calculate SMR Rating proxy (Sales, Margins, ROE)
   */
  calculateSMRRating(
    revenueGrowth3Y: number = 0,
    operatingMargin: number = 0,
    roe: number = 0,
    benchmarks?: { revenueGrowth: number[]; margins: number[]; roeValues: number[] }
  ): string {
    // Simple scoring if no benchmarks provided
    if (!benchmarks) {
      let score = 0;
      if (revenueGrowth3Y > 0.15) score += 1; // 15%+ revenue growth
      if (operatingMargin > 0.15) score += 1; // 15%+ operating margin
      if (roe > 0.15) score += 1; // 15%+ ROE

      return ['E', 'D', 'C', 'B', 'A'][score] || 'E';
    }

    // Percentile-based scoring with benchmarks
    const revenuePercentile = this.calculatePercentile(revenueGrowth3Y, benchmarks.revenueGrowth);
    const marginPercentile = this.calculatePercentile(operatingMargin, benchmarks.margins);
    const roePercentile = this.calculatePercentile(roe, benchmarks.roeValues);

    const avgPercentile = (revenuePercentile + marginPercentile + roePercentile) / 3;

    if (avgPercentile >= 80) return 'A';
    if (avgPercentile >= 60) return 'B';
    if (avgPercentile >= 40) return 'C';
    if (avgPercentile >= 20) return 'D';
    return 'E';
  }

  /**
   * Calculate composite score combining all metrics
   */
  calculateCompositeScore(metrics: Partial<IBDMetrics>): number {
    let score = 0;
    let weight = 0;

    // RS Rating (25% weight)
    if (metrics.rsRating) {
      score += metrics.rsRating * 0.25;
      weight += 0.25;
    }

    // A/D Rating converted to numeric (20% weight)
    if (metrics.adRating) {
      const adScore = { 'A': 90, 'B': 75, 'C': 50, 'D': 25, 'E': 10 }[metrics.adRating] || 50;
      score += adScore * 0.20;
      weight += 0.20;
    }

    // Up/Down Volume Ratio (15% weight)
    if (metrics.upDownVolumeRatio !== undefined) {
      const volumeScore = Math.min(99, Math.max(1, metrics.upDownVolumeRatio * 30));
      score += volumeScore * 0.15;
      weight += 0.15;
    }

    // SMR Rating converted to numeric (20% weight)
    if (metrics.smrRating) {
      const smrScore = { 'A': 90, 'B': 75, 'C': 50, 'D': 25, 'E': 10 }[metrics.smrRating] || 50;
      score += smrScore * 0.20;
      weight += 0.20;
    }

    // Industry Group Rank (20% weight)
    if (metrics.industryGroupRank !== undefined) {
      // Assume rank is 1-N, convert to 1-99 scale
      const groupScore = Math.max(1, Math.min(99, 100 - metrics.industryGroupRank));
      score += groupScore * 0.20;
      weight += 0.20;
    }

    return weight > 0 ? Math.round(score / weight) : 50;
  }

  /**
   * Calculate all IBD metrics for a stock
   */
  async calculateAllMetrics(
    stockData: StockData,
    universeReturns: number[],
    industryRanking?: number,
    benchmarks?: any
  ): Promise<IBDMetrics> {
    try {
      // Calculate 12-month return for RS Rating
      const prices = stockData.prices;
      let return12m = 0;
      if (prices.length >= 252) { // ~1 year of trading days
        const current = prices[prices.length - 1].close;
        const yearAgo = prices[prices.length - 252].close;
        return12m = (current - yearAgo) / yearAgo;
      }

      const rsRating = this.calculateRSRating(return12m, universeReturns);
      const upDownVolumeRatio = this.calculateUpDownVolumeRatio(prices);
      const adRating = this.calculateADRating(prices);

      let smrRating = 'C';
      if (stockData.fundamentals) {
        smrRating = this.calculateSMRRating(
          stockData.fundamentals.revenueGrowth3Y,
          stockData.fundamentals.operatingMargin,
          stockData.fundamentals.roe,
          benchmarks
        );
      }

      const metrics: IBDMetrics = {
        rsRating,
        upDownVolumeRatio,
        adRating,
        smrRating,
        industryGroupRank: industryRanking || 50,
        compositeScore: 0
      };

      metrics.compositeScore = this.calculateCompositeScore(metrics);

      logger.info(`IBD Metrics calculated for ${stockData.symbol}`, {
        rsRating,
        upDownVolumeRatio: Math.round(upDownVolumeRatio * 100) / 100,
        adRating,
        smrRating,
        compositeScore: metrics.compositeScore
      });

      return metrics;
    } catch (error) {
      logger.error(`Failed to calculate IBD metrics for ${stockData.symbol}:`, error);

      // Return default values on error
      return {
        rsRating: 50,
        upDownVolumeRatio: 1.0,
        adRating: 'C',
        smrRating: 'C',
        industryGroupRank: 50,
        compositeScore: 50
      };
    }
  }

  private calculatePercentile(value: number, dataset: number[]): number {
    if (dataset.length === 0) return 50;

    const sorted = [...dataset].sort((a, b) => a - b);
    const betterCount = sorted.filter(v => v <= value).length;
    return (betterCount / sorted.length) * 100;
  }
}

export const ibdMetricsCalculator = new IBDMetricsCalculator();
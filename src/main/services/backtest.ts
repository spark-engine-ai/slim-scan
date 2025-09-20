import { BacktestConfig, BacktestResult, BacktestTrade } from '../types';
import { getPrices, getSymbols, saveBacktest, getEPS, getOwnership } from './db';
import { scanEngine } from './scan-engine';
import { logger } from './logger';
import { checkMarketGate } from './market-gate';
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

interface Trade {
  symbol: string;
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice?: number;
  shares: number;
  return?: number;
  reason?: string;
  score?: number;
}

interface EquityPoint {
  date: string;
  equity: number;
  cash: number;
  positions: number;
}

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  try {
    logger.info('Starting backtest', config);

    const startDate = new Date(config.dateFrom);
    const endDate = new Date(config.dateTo);

    // Check data availability first
    const symbols = getSymbols().slice(0, 10); // Check first 10 symbols
    let availableDataRanges: { symbol: string; firstDate: string; lastDate: string }[] = [];

    for (const symbolData of symbols) {
      const bars = getPrices(symbolData.symbol);
      if (bars.length > 0) {
        availableDataRanges.push({
          symbol: symbolData.symbol,
          firstDate: bars[0].date,
          lastDate: bars[bars.length - 1].date
        });
      }
    }

    if (availableDataRanges.length > 0) {
      const earliest = availableDataRanges.reduce((min, range) =>
        range.firstDate < min ? range.firstDate : min, availableDataRanges[0].firstDate);
      const latest = availableDataRanges.reduce((max, range) =>
        range.lastDate > max ? range.lastDate : max, availableDataRanges[0].lastDate);

      logger.info(`Available data range: ${earliest} to ${latest}`);
      logger.info(`Requested backtest range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

      // If requested range is outside available data, adjust it
      const adjustedStartDate = new Date(Math.max(startDate.getTime(), new Date(earliest).getTime()));
      const adjustedEndDate = new Date(Math.min(endDate.getTime(), new Date(latest).getTime()));

      if (adjustedStartDate >= adjustedEndDate) {
        logger.warn(`No overlap between requested period and available data. Using full available data range: ${earliest} to ${latest}`);
        startDate.setTime(new Date(earliest).getTime());
        endDate.setTime(new Date(latest).getTime());
      } else {
        if (adjustedStartDate.getTime() !== startDate.getTime() || adjustedEndDate.getTime() !== endDate.getTime()) {
          logger.warn(`Adjusting backtest period to available data: ${adjustedStartDate.toISOString().split('T')[0]} to ${adjustedEndDate.toISOString().split('T')[0]}`);
        }
        // Use adjusted dates
        startDate.setTime(adjustedStartDate.getTime());
        endDate.setTime(adjustedEndDate.getTime());
      }
    } else {
      throw new Error('No price data available for any symbols');
    }

    // Initialize portfolio
    const cash = { amount: config.initialCapital || 100000 }; // Starting with configurable amount
    const trades: Trade[] = [];
    const openPositions = new Map<string, Trade>();
    const equityCurve: EquityPoint[] = [];

    // Get all trading days in the period
    const tradingDays = getTradingDays(startDate, endDate);
    logger.info(`Processing ${tradingDays.length} trading days from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    for (const currentDate of tradingDays) {
      // Check market conditions if enabled
      if (config.useMarketGate) {
        // For backtest, we'd need historical market data
        // For now, simulate market conditions
        const isMarketUp = Math.random() > 0.3; // 70% of days market is "up"
        if (!isMarketUp) {
          // Close all positions on market down days
          await closeAllPositions(openPositions, currentDate, trades, 'market-gate', cash);
          continue;
        }
      }

      // Process exits first (check stop losses and profit targets)
      await processExits(openPositions, currentDate, trades, config, cash);

      // Look for new entries if we have capacity
      if (openPositions.size < config.maxPositions) {
        await processEntries(openPositions, currentDate, trades, config, cash);
      }

      // Calculate equity for the day
      const portfolioValue = await calculatePortfolioValue(openPositions, cash.amount, currentDate);
      equityCurve.push({
        date: currentDate.toISOString().split('T')[0],
        equity: portfolioValue,
        cash: cash.amount,
        positions: openPositions.size
      });
    }
    
    // Close any remaining positions
    await closeAllPositions(openPositions, endDate, trades, 'backtest-end', cash);
    
    // Calculate results
    const results = calculateBacktestMetrics(trades, equityCurve, config);
    
    // Save backtest
    saveBacktest(config, results);
    
    logger.info('Backtest completed', {
      totalTrades: trades.length,
      totalReturn: results.totalReturn,
      winRate: results.hitRate
    });
    
    return results;
    
  } catch (error) {
    logger.error('Backtest failed', error);
    throw error;
  }
}

function getTradingDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    // Skip weekends
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

async function processExits(
  openPositions: Map<string, Trade>,
  currentDate: Date,
  trades: Trade[],
  config: BacktestConfig,
  cash: { amount: number }
): Promise<void> {
  const dateStr = currentDate.toISOString().split('T')[0];
  
  for (const [symbol, trade] of openPositions) {
    const bars = getPrices(symbol);
    const currentBar = bars.find(bar => bar.date === dateStr);
    
    if (!currentBar) continue;
    
    const currentPrice = currentBar.close;
    const entryPrice = trade.entryPrice;
    const returnPercent = (currentPrice - entryPrice) / entryPrice;
    
    let shouldExit = false;
    let reason = '';
    
    // Check stop loss
    if (returnPercent <= -config.stopPercent / 100) {
      shouldExit = true;
      reason = 'stop-loss';
    }
    
    // Check profit target (optional 15% mentioned in spec)
    if (returnPercent >= 0.15) {
      shouldExit = true;
      reason = 'profit-target';
    }
    
    // Hold time limit (e.g., 30 days max)
    const entryDate = new Date(trade.entryDate);
    const daysSinceEntry = (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceEntry > 30) {
      shouldExit = true;
      reason = 'time-limit';
    }
    
    if (shouldExit) {
      trade.exitDate = dateStr;
      trade.exitPrice = currentPrice;
      trade.return = returnPercent;
      trade.reason = reason;

      // Add cash back from selling position
      cash.amount += trade.shares * currentPrice;

      trades.push({ ...trade });
      openPositions.delete(symbol);
    }
  }
}

async function processEntries(
  openPositions: Map<string, Trade>,
  currentDate: Date,
  trades: Trade[],
  config: BacktestConfig,
  cash: { amount: number }
): Promise<void> {
  const symbols = getSymbols(); // Use all available symbols
  logger.info(`Processing ${symbols.length} symbols for entry candidates on ${currentDate.toISOString().split('T')[0]}`);
  const candidates: Array<{ symbol: string; score: number; price: number }> = [];
  const allPriceData: Record<string, any[]> = {};

  // Pre-load price data for RS calculation
  let symbolsWithData = 0;
  for (const symbolData of symbols) {
    const bars = getPrices(symbolData.symbol);
    if (bars.length >= 50) {
      allPriceData[symbolData.symbol] = bars;
      symbolsWithData++;
    }
  }
  logger.info(`Found price data for ${symbolsWithData} out of ${symbols.length} symbols`);

  if (symbolsWithData === 0) {
    logger.warn('No symbols have sufficient historical price data for backtest');
    return;
  }

  for (const symbolData of symbols) {
    if (openPositions.has(symbolData.symbol)) continue;

    const bars = allPriceData[symbolData.symbol];
    if (!bars || bars.length < 50) continue;

    // Find the bar for current date (or closest previous date)
    const currentDateStr = currentDate.toISOString().split('T')[0];

    // Find the last bar that is on or before the current date
    let actualBarIndex = -1;
    for (let i = bars.length - 1; i >= 0; i--) {
      if (bars[i].date <= currentDateStr) {
        actualBarIndex = i;
        break;
      }
    }

    if (actualBarIndex === -1 || actualBarIndex < 49) continue; // Need at least 50 bars for calculations

    // Get historical data up to current date (need at least 50 bars for calculations)
    const historicalBars = bars.slice(0, actualBarIndex + 1);
    if (historicalBars.length < 50) continue;

    const currentBar = historicalBars[historicalBars.length - 1];
    const epsData = getEPS(symbolData.symbol);
    const ownershipData = getOwnership(symbolData.symbol);

    try {
      // Calculate CAN SLIM factors using historical data
      const c_qoq = calculateCurrentEarnings(epsData.filter(eps =>
        new Date(eps.qend) <= currentDate
      ));

      const a_cagr = calculateAnnualEarnings(epsData.filter(eps =>
        new Date(eps.qend) <= currentDate
      ));

      const n_pct52w = calculateNewHighPercentage(historicalBars);
      const rs_pct = calculateRelativeStrength(symbolData.symbol, historicalBars, allPriceData);
      const s_volSpike = calculateVolumeSpike(historicalBars);
      const i_delta = calculateInstitutionalChange(ownershipData.filter(own =>
        new Date(own.date) <= currentDate
      ));

      // Use the same scoring as scan engine
      const scanConfig = {
        weights: { C: 2.0, A: 2.0, N: 1.5, S: 1.5, L: 1.5, I: 1.0 },
        thresholds: {
          C_yoy: 0.25, A_cagr: 0.25, N_pct52w: 0.85,
          S_volSpike: 1.5, RS_pct: 80, I_delta: 0
        },
        liquidity: { minDollarVol50d: 200000, minPrice: 5 }
      };

      // Calculate liquidity filter
      const liquidity = calculateLiquidity(historicalBars);
      if (liquidity.dollarVolume50d < scanConfig.liquidity.minDollarVol50d ||
          liquidity.avgPrice < scanConfig.liquidity.minPrice) {
        continue;
      }

      // Calculate weighted score
      let score = 0;

      if (c_qoq >= scanConfig.thresholds.C_yoy) {
        score += scanConfig.weights.C * (c_qoq / scanConfig.thresholds.C_yoy);
      }

      if (a_cagr >= scanConfig.thresholds.A_cagr) {
        score += scanConfig.weights.A * (a_cagr / scanConfig.thresholds.A_cagr);
      }

      if (n_pct52w >= scanConfig.thresholds.N_pct52w) {
        score += scanConfig.weights.N * (n_pct52w / scanConfig.thresholds.N_pct52w);
      }

      if (s_volSpike >= scanConfig.thresholds.S_volSpike) {
        score += scanConfig.weights.S * Math.min(s_volSpike / scanConfig.thresholds.S_volSpike, 3);
      }

      if (rs_pct >= scanConfig.thresholds.RS_pct) {
        score += scanConfig.weights.L * (rs_pct / scanConfig.thresholds.RS_pct);
      }

      if (i_delta > 0) {
        score += scanConfig.weights.I;
      }

      // Normalize score
      const maxPossibleScore = scanConfig.weights.C + scanConfig.weights.A +
                              scanConfig.weights.N + scanConfig.weights.S +
                              scanConfig.weights.L + scanConfig.weights.I;
      const normalizedScore = Math.min((score / maxPossibleScore) * 100, 100);

      // Additional confirmation: breakout detection
      const isBreakout = isBreakoutConfirmed(historicalBars);

      if (normalizedScore >= config.scoreCutoff && isBreakout) {
        candidates.push({
          symbol: symbolData.symbol,
          score: normalizedScore,
          price: currentBar.close
        });
      }

    } catch (error) {
      // Skip symbols with calculation errors
      continue;
    }
  }

  // Sort by score and take top candidates
  candidates.sort((a, b) => b.score - a.score);
  logger.info(`Found ${candidates.length} candidates with score >= ${config.scoreCutoff} on ${currentDate.toISOString().split('T')[0]}`);

  if (candidates.length > 0) {
    logger.info(`Top candidates: ${candidates.slice(0, 5).map(c => `${c.symbol}:${c.score.toFixed(1)}`).join(', ')}`);
  }

  const maxNewPositions = config.maxPositions - openPositions.size;

  for (const candidate of candidates.slice(0, maxNewPositions)) {
    const positionSize = (cash.amount * config.riskPercent / 100) / (config.stopPercent / 100);
    const shares = Math.floor(positionSize / candidate.price);

    if (shares > 0 && shares * candidate.price <= cash.amount) {
      const trade: Trade = {
        symbol: candidate.symbol,
        entryDate: currentDate.toISOString().split('T')[0],
        entryPrice: candidate.price,
        shares,
        score: candidate.score
      };

      openPositions.set(candidate.symbol, trade);
      cash.amount -= shares * candidate.price;
      logger.info(`Entered position: ${candidate.symbol} @ $${candidate.price} (${shares} shares, score: ${candidate.score.toFixed(1)})`);
    } else {
      logger.info(`Insufficient cash for ${candidate.symbol}: need $${(shares * candidate.price).toFixed(2)}, have $${cash.amount.toFixed(2)}`);
    }
  }
}

async function closeAllPositions(
  openPositions: Map<string, Trade>,
  date: Date,
  trades: Trade[],
  reason: string,
  cash: { amount: number }
): Promise<void> {
  const dateStr = date.toISOString().split('T')[0];
  
  for (const [symbol, trade] of openPositions) {
    const bars = getPrices(symbol);
    const exitBar = bars.find(bar => bar.date === dateStr) || bars[bars.length - 1];
    
    trade.exitDate = dateStr;
    trade.exitPrice = exitBar.close;
    trade.return = (exitBar.close - trade.entryPrice) / trade.entryPrice;
    trade.reason = reason;

    // Add cash back from selling position
    cash.amount += trade.shares * exitBar.close;

    trades.push({ ...trade });
  }

  openPositions.clear();
}

async function calculatePortfolioValue(
  openPositions: Map<string, Trade>,
  cash: number,
  date: Date
): Promise<number> {
  let positionsValue = 0;
  const dateStr = date.toISOString().split('T')[0];
  
  for (const [symbol, trade] of openPositions) {
    const bars = getPrices(symbol);
    const currentBar = bars.find(bar => bar.date === dateStr);
    
    if (currentBar) {
      positionsValue += trade.shares * currentBar.close;
    } else {
      // Use last known price
      positionsValue += trade.shares * trade.entryPrice;
    }
  }
  
  return cash + positionsValue;
}

function calculateBacktestMetrics(trades: Trade[], equityCurve: EquityPoint[], config: BacktestConfig): BacktestResult {
  const completedTrades = trades.filter(t => t.return !== undefined);

  const initialEquity = equityCurve.length > 0 ? equityCurve[0].equity : 100000;
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : 100000;
  const totalReturn = (finalEquity - initialEquity) / initialEquity;

  if (completedTrades.length === 0) {
    return {
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      hitRate: 0,
      totalTrades: 0,
      avgReturn: 0,
      avgWin: 0,
      avgLoss: 0,
      winRate: 0,
      profitFactor: 0,
      largestWin: 0,
      largestLoss: 0,
      avgHoldingDays: 0,
      finalEquity,
      initialEquity,
      trades: [],
      equityCurve: equityCurve.map(point => ({
        date: point.date,
        equity: point.equity
      })),
      symbolStats: [],
      dateRange: { from: config.dateFrom, to: config.dateTo },
      config
    };
  }

  const returns = completedTrades.map(t => t.return!);
  const winners = returns.filter(r => r > 0);
  const losers = returns.filter(r => r <= 0);

  const hitRate = winners.length / completedTrades.length;
  const winRate = hitRate;

  // Calculate detailed metrics
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const avgWin = winners.length > 0 ? winners.reduce((sum, r) => sum + r, 0) / winners.length : 0;
  const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((sum, r) => sum + r, 0) / losers.length) : 0;
  const largestWin = winners.length > 0 ? Math.max(...winners) : 0;
  const largestLoss = losers.length > 0 ? Math.min(...losers) : 0;

  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Calculate holding days for completed trades
  const holdingDays = completedTrades.map(t => {
    if (!t.exitDate) return 0;
    const entry = new Date(t.entryDate);
    const exit = new Date(t.exitDate);
    return Math.floor((exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
  });
  const avgHoldingDays = holdingDays.length > 0 ? holdingDays.reduce((sum, d) => sum + d, 0) / holdingDays.length : 0;

  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = initialEquity;

  for (const point of equityCurve) {
    if (point.equity > peak) {
      peak = point.equity;
    }
    const drawdown = (peak - point.equity) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Calculate Sharpe ratio
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  // Calculate per-symbol statistics
  const symbolMap = new Map<string, { trades: Trade[]; totalReturn: number }>();

  for (const trade of completedTrades) {
    if (!symbolMap.has(trade.symbol)) {
      symbolMap.set(trade.symbol, { trades: [], totalReturn: 0 });
    }
    const symbolData = symbolMap.get(trade.symbol)!;
    symbolData.trades.push(trade);
    symbolData.totalReturn += trade.return! || 0;
  }

  const symbolStats = Array.from(symbolMap.entries()).map(([symbol, data]) => {
    const symbolWinners = data.trades.filter(t => (t.return || 0) > 0);
    return {
      symbol,
      trades: data.trades.length,
      winRate: symbolWinners.length / data.trades.length,
      avgReturn: data.totalReturn / data.trades.length,
      totalReturn: data.totalReturn
    };
  }).sort((a, b) => b.totalReturn - a.totalReturn);

  // Convert trades to BacktestTrade format
  const backtestTrades: BacktestTrade[] = completedTrades.map(t => ({
    symbol: t.symbol,
    entryDate: t.entryDate,
    exitDate: t.exitDate,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    shares: t.shares,
    return: t.return ? t.shares * t.entryPrice * t.return : 0,
    returnPercent: t.return,
    reason: t.reason,
    holdingDays: t.exitDate ? Math.floor((new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    score: t.score
  }));

  return {
    totalReturn,
    sharpeRatio,
    maxDrawdown,
    hitRate,
    totalTrades: completedTrades.length,
    avgReturn,
    avgWin,
    avgLoss,
    winRate,
    profitFactor,
    largestWin,
    largestLoss,
    avgHoldingDays,
    finalEquity,
    initialEquity,
    trades: backtestTrades,
    equityCurve: equityCurve.map(point => ({
      date: point.date,
      equity: point.equity
    })),
    symbolStats,
    dateRange: { from: config.dateFrom, to: config.dateTo },
    config
  };
}
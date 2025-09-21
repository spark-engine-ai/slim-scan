export interface ScanResult {
  symbol: string;
  name: string;
  price: number;
  score: number;
  rs_pct: number;
  pct_52w: number;
  vol_spike: number;
  c_qoq: number;
  a_cagr: number;
  i_delta: number;
  flags: string;
  sector: string;
  industry: string;
  // IBD-style metrics (optional for backward compatibility)
  ibd_rs_rating?: number;        // 1-99, relative strength rating
  ibd_up_down_ratio?: number;    // 50-day up/down volume ratio
  ibd_ad_rating?: string;        // A-E, accumulation/distribution rating
  ibd_composite?: number;        // 1-99, composite score
}

export interface ChartData {
  symbol: string;
  bars: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  ma50: number[];
  ma200: number[];
  high52w: number;
}

export interface BacktestTrade {
  symbol: string;
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice?: number;
  shares: number;
  return?: number;
  returnPercent?: number;
  reason?: string;
  holdingDays?: number;
  score?: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  hitRate: number;
  totalTrades: number;
  avgReturn: number;
  avgWin: number;
  avgLoss: number;
  winRate: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingDays: number;
  finalEquity: number;
  initialEquity: number;
  trades: BacktestTrade[];
  equityCurve: Array<{ date: string; equity: number }>;
  symbolStats: Array<{
    symbol: string;
    trades: number;
    winRate: number;
    avgReturn: number;
    totalReturn: number;
  }>;
  dateRange: { from: string; to: string };
  config: {
    dateFrom: string;
    dateTo: string;
    scoreCutoff: number;
    riskPercent: number;
    stopPercent: number;
    maxPositions: number;
    useMarketGate: boolean;
  };
}

export interface Position {
  symbol: string;
  qty: number;
  avgCost: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
}

export interface AppSettings {
  provider: 'polygon' | 'fmp';
  universe: 'sp500' | 'sp400' | 'sp600' | 'sp1500' | 'all';
  tradingMode: 'paper' | 'live';
  scanConfig: {
    liquidity: {
      minDollarVol50d: number;
      minPrice: number;
    };
    weights: {
      C: number;
      A: number;
      N: number;
      S: number;
      L: number;
      I: number;
    };
    thresholds: {
      C_yoy: number;
      A_cagr: number;
      N_pct52w: number;
      RS_pct: number;
      S_volSpike: number;
    };
    ibdFilters: {
      enabled: boolean;
      minRsRating: number;        // 1-99, minimum RS rating (default: 80)
      minUpDownRatio: number;     // minimum up/down volume ratio (default: 1.0)
      minAdRating: string;        // A-E, minimum A/D rating (default: 'C')
      minComposite: number;       // 1-99, minimum composite score (default: 70)
    };
    marketGate: {
      use: boolean;
      spySymbol: string;
      maShort: number;
      maLong: number;
    };
  };
}

export type FactorKey = 'C' | 'A' | 'N' | 'S' | 'L' | 'I' | 'M';

export interface FactorScore {
  key: FactorKey;
  label: string;
  value: number;
  threshold: number;
  pass: boolean;
  description: string;
}
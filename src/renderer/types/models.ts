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
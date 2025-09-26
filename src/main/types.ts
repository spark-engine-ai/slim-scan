export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolRow {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
}

export interface EpsRow {
  symbol: string;
  qend: string;
  eps: number;
}

export interface OwnershipRow {
  symbol: string;
  date: string;
  inst_pct: number;
  filers_added: number;
}

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
  // Qualification status
  qualified: boolean;            // Whether stock meets all criteria
  disqualification_reasons: string; // Comma-separated reasons for disqualification
}

export interface ScanConfig {
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
}

export interface BacktestConfig {
  dateFrom: string;
  dateTo: string;
  scoreCutoff: number;
  riskPercent: number;
  stopPercent: number;
  maxPositions: number;
  useMarketGate: boolean;
  // Advanced options
  profitTargetPercent?: number;
  maxHoldingDays?: number;
  minHoldingDays?: number;
  initialCapital?: number;
  commission?: number;
  slippage?: number;
  // Strategy options
  enableTrailingStop?: boolean;
  trailingStopPercent?: number;
  enablePyramiding?: boolean;
  maxPyramidLevels?: number;
  // Risk management
  maxDailyLoss?: number;
  maxDrawdown?: number;
  // Market conditions
  minVolumeFilter?: number;
  minPriceFilter?: number;
  sectorLimits?: Record<string, number>;
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

export interface BacktestResult {
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
  config: BacktestConfig;
}

export interface ChartData {
  symbol: string;
  bars: Bar[];
  ma50: number[];
  ma200: number[];
  high52w: number;
}

export interface IpcChannels {
  'scan:run': { mode: 'daily' | 'intraday' };
  'scan:results': { scanId: number };
  'scan:export': { scanId: number; format: 'csv' | 'json' };
  'settings:get': void;
  'settings:set': Record<string, unknown>;
  'universe:refresh': void;
  'chart:fetch': { symbol: string; days: number };
  'backtest:run': BacktestConfig;
  'trading:buy': { symbol: string; qty: number };
  'provider:test': void;
  'app:logs': void;
}
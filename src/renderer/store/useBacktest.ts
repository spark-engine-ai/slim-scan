import { create } from 'zustand';
import { BacktestMetrics } from '../types/models';

interface BacktestConfig {
  dateFrom: string;
  dateTo: string;
  scoreCutoff: number;
  riskPercent: number;
  stopPercent: number;
  maxPositions: number;
  useMarketGate: boolean;
}

interface BacktestState {
  results: BacktestMetrics | null;
  equityCurve: Array<{ date: string; equity: number }>;
  config: BacktestConfig | null;
  loading: boolean;
  error: string | null;
  runBacktest: (config: BacktestConfig) => Promise<void>;
  clearResults: () => void;
}

export const useBacktest = create<BacktestState>((set) => ({
  results: null,
  equityCurve: [],
  config: null,
  loading: false,
  error: null,

  runBacktest: async (config: BacktestConfig) => {
    set({ loading: true, error: null, config });
    try {
      const result = await window.electronAPI.backtest.run(config);
      set({
        results: result, // Pass through the complete results
        equityCurve: result.equityCurve,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to run backtest:', error);
      set({
        loading: false,
        error: 'Failed to run backtest',
      });
    }
  },

  clearResults: () => {
    set({
      results: null,
      equityCurve: [],
      config: null,
      error: null,
    });
  },
}));
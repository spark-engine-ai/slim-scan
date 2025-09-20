import { create } from 'zustand';
import { AppSettings } from '../types/models';

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

const defaultSettings: AppSettings = {
  provider: 'polygon',
  universe: 'sp1500',
  tradingMode: 'paper',
  scanConfig: {
    liquidity: {
      minDollarVol50d: 200000,
      minPrice: 2,
    },
    weights: {
      C: 2,
      A: 2,
      N: 1.5,
      S: 1.5,
      L: 1.5,
      I: 1,
    },
    thresholds: {
      C_yoy: 0.25,
      A_cagr: 0.25,
      N_pct52w: 0.85,
      RS_pct: 80,
      S_volSpike: 1.5,
    },
    marketGate: {
      use: true,
      spySymbol: 'SPY',
      maShort: 50,
      maLong: 200,
    },
  },
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await window.electronAPI.settings.get();
      set({ settings: settings || defaultSettings, loading: false });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ 
        settings: defaultSettings, 
        loading: false, 
        error: 'Failed to load settings' 
      });
    }
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    const currentSettings = get().settings || defaultSettings;
    const newSettings = { ...currentSettings, ...updates };
    
    set({ loading: true, error: null });
    try {
      await window.electronAPI.settings.set(newSettings);
      set({ settings: newSettings, loading: false });
    } catch (error) {
      console.error('Failed to update settings:', error);
      set({ loading: false, error: 'Failed to update settings' });
    }
  },
}));
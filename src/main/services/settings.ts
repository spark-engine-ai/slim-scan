import Store from 'electron-store';

interface AppSettings {
  provider: 'polygon' | 'fmp';
  universe: 'sp500' | 'sp400' | 'sp600' | 'sp1500' | 'nasdaq' | 'russell2000' | 'all';
  tradingMode: 'paper' | 'live';
  polygonApiKey?: string;
  fmpApiKey?: string;
  alpacaKeyId?: string;
  alpacaSecretKey?: string;
  alpacaBaseUrl?: string;
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

const defaultSettings: AppSettings = {
  provider: (process.env.PROVIDER as any) || 'polygon',
  universe: (process.env.UNIVERSE as any) || 'sp1500',
  tradingMode: 'paper',
  alpacaBaseUrl: 'https://paper-api.alpaca.markets',
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

const store = new Store<AppSettings>({
  defaults: defaultSettings,
  name: 'slimscan-settings',
});

export async function getSettings(): Promise<AppSettings> {
  return store.store;
}

export async function setSettings(settings: Partial<AppSettings>): Promise<void> {
  store.set(settings);
}

export async function resetSettings(): Promise<void> {
  store.clear();
  store.set(defaultSettings);
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return store.get(key);
}
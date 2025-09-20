#!/usr/bin/env node

import { config } from 'dotenv';
import Store from 'electron-store';

// Load environment variables
config();

interface AppSettings {
  provider: 'poc' | 'polygon' | 'fmp';
  universe: 'sp500' | 'sp400' | 'sp600' | 'sp1500' | 'nasdaq' | 'russell2000' | 'all';
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

const store = new Store<AppSettings>({ name: 'slimscan-settings' });

console.log('🔧 Resetting SlimScan settings...');

// Clear all settings
store.clear();

// Set new defaults from environment
const newSettings: AppSettings = {
  provider: (process.env.PROVIDER as any) || 'fmp',
  universe: 'sp1500',
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

store.set(newSettings);

console.log('✅ Settings reset successfully');
console.log(`📊 Current settings:`);
console.log(`   Provider: ${store.get('provider')}`);
console.log(`   Universe: ${store.get('universe')}`);
console.log(`   Market Gate: ${store.get('scanConfig.marketGate.use') ? 'Enabled' : 'Disabled'}`);

console.log('\n🚀 Ready to start SlimScan with Polygon provider!');
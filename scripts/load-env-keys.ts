#!/usr/bin/env node

import { config } from 'dotenv';
import * as keytar from 'keytar';

// Load environment variables
config();

const SERVICE_NAME = 'SlimScan';

async function loadKeysFromEnv() {
  console.log('🔐 Loading API keys from .env to secure keychain storage...\n');

  const keysToLoad = [
    { env: 'FMP_API_KEY', account: 'fmp_api_key', name: 'Financial Modeling Prep' },
    { env: 'POLYGON_API_KEY', account: 'polygon_api_key', name: 'Polygon.io' },
    { env: 'ALPACA_KEY_ID', account: 'alpaca_key_id', name: 'Alpaca Key ID' },
    { env: 'ALPACA_SECRET_KEY', account: 'alpaca_secret_key', name: 'Alpaca Secret Key' },
  ];

  let loaded = 0;
  let skipped = 0;

  for (const key of keysToLoad) {
    const value = process.env[key.env];
    if (value) {
      try {
        await keytar.setPassword(SERVICE_NAME, key.account, value);
        console.log(`✅ ${key.name} key loaded successfully`);
        loaded++;
      } catch (error) {
        console.error(`❌ Failed to load ${key.name} key:`, error);
      }
    } else {
      console.log(`⚠️  ${key.name} key not found in .env, skipping`);
      skipped++;
    }
  }

  console.log(`\n📊 Summary: ${loaded} keys loaded, ${skipped} skipped`);

  if (loaded > 0) {
    console.log('\n🎉 Keys are now securely stored and ready to use!');
    console.log('You can now start the app and the API keys will be automatically loaded.');
  }
}

loadKeysFromEnv().catch(console.error);
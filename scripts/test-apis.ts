#!/usr/bin/env node

import { config } from 'dotenv';
import axios from 'axios';
import * as keytar from 'keytar';

// Load environment variables
config();

const SERVICE_NAME = 'SlimScan';

async function getKey(account: string): Promise<string | null> {
  try {
    return await keytar.getPassword(SERVICE_NAME, account);
  } catch (error) {
    console.error(`Failed to retrieve ${account}:`, error);
    return null;
  }
}

async function testFMP() {
  console.log('🧪 Testing Financial Modeling Prep API...');
  const apiKey = await getKey('fmp_api_key');

  if (!apiKey) {
    console.log('❌ FMP API key not found in keychain');
    return false;
  }

  try {
    const response = await axios.get('https://financialmodelingprep.com/api/v3/profile/AAPL', {
      params: { apikey: apiKey },
      timeout: 10000
    });

    if (response.status === 200 && response.data && response.data.length > 0) {
      console.log(`✅ FMP API working - Got profile for AAPL: ${response.data[0].companyName}`);
      return true;
    } else {
      console.log('❌ FMP API returned empty response');
      return false;
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('❌ FMP API authentication failed - check API key');
    } else if (error.response?.status === 403) {
      console.log('❌ FMP API quota exceeded or access denied');
    } else {
      console.log(`❌ FMP API test failed: ${error.message}`);
    }
    return false;
  }
}

async function testPolygon() {
  console.log('🧪 Testing Polygon.io API...');
  const apiKey = await getKey('polygon_api_key');

  if (!apiKey) {
    console.log('❌ Polygon API key not found in keychain');
    return false;
  }

  try {
    const response = await axios.get('https://api.polygon.io/v3/reference/tickers/AAPL', {
      params: { apikey: apiKey },
      timeout: 10000
    });

    if (response.status === 200 && response.data?.results) {
      console.log(`✅ Polygon API working - Got ticker info for AAPL: ${response.data.results.name}`);
      return true;
    } else {
      console.log('❌ Polygon API returned empty response');
      return false;
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('❌ Polygon API authentication failed - check API key');
    } else if (error.response?.status === 403) {
      console.log('❌ Polygon API quota exceeded or access denied');
    } else {
      console.log(`❌ Polygon API test failed: ${error.message}`);
    }
    return false;
  }
}

async function testAlpaca() {
  console.log('🧪 Testing Alpaca Paper Trading API...');
  const keyId = await getKey('alpaca_key_id');
  const secretKey = await getKey('alpaca_secret_key');

  if (!keyId || !secretKey) {
    console.log('❌ Alpaca API keys not found in keychain');
    return false;
  }

  try {
    const response = await axios.get('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secretKey,
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data?.id) {
      console.log(`✅ Alpaca API working - Account ID: ${response.data.id}, Status: ${response.data.status}`);
      console.log(`   Buying Power: $${response.data.buying_power}, Equity: $${response.data.equity}`);
      return true;
    } else {
      console.log('❌ Alpaca API returned empty response');
      return false;
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('❌ Alpaca API authentication failed - check API keys');
    } else if (error.response?.status === 403) {
      console.log('❌ Alpaca API access denied');
    } else {
      console.log(`❌ Alpaca API test failed: ${error.message}`);
    }
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 SlimScan API Connection Tests\n');

  const results = await Promise.all([
    testFMP(),
    testPolygon(),
    testAlpaca()
  ]);

  const [fmpResult, polygonResult, alpacaResult] = results;

  console.log('\n📊 Test Results:');
  console.log(`FMP (Primary data): ${fmpResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Polygon (Backup): ${polygonResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Alpaca (Paper Trading): ${alpacaResult ? '✅ PASS' : '❌ FAIL'}`);

  const passCount = results.filter(r => r).length;
  console.log(`\n🎯 Summary: ${passCount}/3 APIs working`);

  if (fmpResult) {
    console.log('\n🟢 Ready to run scans with FMP data provider!');
  } else if (polygonResult) {
    console.log('\n🟡 FMP failed, but Polygon is available as backup');
  } else {
    console.log('\n🔴 No market data providers working - check your API keys');
  }

  if (alpacaResult) {
    console.log('🟢 Paper trading is available');
  } else {
    console.log('🟡 Paper trading disabled - check Alpaca keys if needed');
  }
}

runAllTests().catch(console.error);
#!/usr/bin/env node

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  provider: string;
}

function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
    provider: process.env.PROVIDER || 'poc'
  };

  // Check for .env file
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    result.warnings.push('.env file not found. Using environment variables or defaults.');
  }

  // Validate provider
  const validProviders = ['poc', 'polygon', 'iex', 'fmp'];
  if (!validProviders.includes(result.provider)) {
    result.errors.push(`Invalid PROVIDER: ${result.provider}. Must be one of: ${validProviders.join(', ')}`);
    result.valid = false;
  }

  // Validate provider-specific keys
  switch (result.provider) {
    case 'polygon':
      if (!process.env.POLYGON_API_KEY) {
        result.errors.push('POLYGON_API_KEY is required when using Polygon provider');
        result.valid = false;
      }
      break;

    case 'fmp':
      if (!process.env.FMP_API_KEY) {
        result.errors.push('FMP_API_KEY is required when using FMP provider');
        result.valid = false;
      }
      break;

    case 'iex':
      if (!process.env.IEX_API_KEY) {
        result.errors.push('IEX_API_KEY is required when using IEX provider');
        result.valid = false;
      }
      break;

    case 'poc':
      result.warnings.push('Using POC provider - limited data and functionality');
      break;
  }

  // Validate optional trading keys
  const hasAlpacaKeyId = !!process.env.ALPACA_KEY_ID;
  const hasAlpacaSecret = !!process.env.ALPACA_SECRET_KEY;
  
  if (hasAlpacaKeyId && !hasAlpacaSecret) {
    result.warnings.push('ALPACA_KEY_ID provided but ALPACA_SECRET_KEY missing - paper trading disabled');
  } else if (!hasAlpacaKeyId && hasAlpacaSecret) {
    result.warnings.push('ALPACA_SECRET_KEY provided but ALPACA_KEY_ID missing - paper trading disabled');
  } else if (!hasAlpacaKeyId && !hasAlpacaSecret) {
    result.warnings.push('Alpaca keys not configured - paper trading disabled');
  }

  // Validate universe setting
  const universe = process.env.UNIVERSE || 'sp1500';
  const validUniverses = ['sp500', 'sp400', 'sp600', 'sp1500', 'all'];
  if (!validUniverses.includes(universe)) {
    result.warnings.push(`Invalid UNIVERSE: ${universe}. Defaulting to sp1500. Valid options: ${validUniverses.join(', ')}`);
  }

  return result;
}

function printResults(result: ValidationResult): void {
  console.log('\n🔍 SlimScan Environment Validation\n');
  console.log(`Provider: ${result.provider.toUpperCase()}`);
  console.log(`Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}\n`);

  if (result.errors.length > 0) {
    console.log('❌ ERRORS:');
    result.errors.forEach(error => console.log(`  • ${error}`));
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    result.warnings.forEach(warning => console.log(`  • ${warning}`));
    console.log();
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✨ Environment is properly configured!');
  }

  if (!result.valid) {
    console.log('🔧 Please fix the errors above before running SlimScan.');
    process.exit(1);
  }
}

// Run validation
const result = validateEnvironment();
printResults(result);
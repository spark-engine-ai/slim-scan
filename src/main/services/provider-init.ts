import { providerRegistry } from '../providers/provider-registry';
import { YFinancePoorProvider } from '../providers/yfinance-poor';
import { PolygonProvider } from '../providers/polygon';
import { FMPProvider } from '../providers/fmp';
import { getSecret } from './keychain';
import { getSetting } from './settings';
import { logger } from './logger';

export async function initializeProviders(): Promise<void> {
  try {
    logger.info('Initializing data providers');
    
    // Always register POC provider
    const pocProvider = new YFinancePoorProvider();
    providerRegistry.register(pocProvider);
    
    // Register Polygon if API key is available
    try {
      const polygonKey = await getSecret('polygon_api_key');
      if (polygonKey) {
        const polygonProvider = new PolygonProvider(polygonKey);
        providerRegistry.register(polygonProvider);
        logger.info('Polygon provider registered');
      }
    } catch (error) {
      logger.warn('Failed to initialize Polygon provider', error);
    }
    
    // Register FMP if API key is available
    try {
      const fmpKey = await getSecret('fmp_api_key');
      if (fmpKey) {
        const fmpProvider = new FMPProvider(fmpKey);
        providerRegistry.register(fmpProvider);
        logger.info('FMP provider registered');
      }
    } catch (error) {
      logger.warn('Failed to initialize FMP provider', error);
    }
    
    // Check and configure Alpaca paper trading
    try {
      const alpacaKeyId = await getSecret('alpaca_key_id');
      const alpacaSecretKey = await getSecret('alpaca_secret_key');
      if (alpacaKeyId && alpacaSecretKey) {
        logger.info('Alpaca paper trading keys found and configured');
      } else {
        logger.warn('Alpaca keys not found - paper trading disabled');
      }
    } catch (error) {
      logger.warn('Failed to check Alpaca keys', error);
    }

    // Set the current provider based on settings
    const preferredProvider = getSetting('provider');
    const availableProviders = providerRegistry.listProviders();

    logger.info(`Preferred provider: ${preferredProvider}`);
    logger.info(`Available providers: ${availableProviders.join(', ')}`);

    if (availableProviders.includes(preferredProvider)) {
      providerRegistry.setProvider(preferredProvider);
      logger.info(`Set current provider to: ${preferredProvider}`);
    } else {
      logger.warn(`Provider ${preferredProvider} not available, falling back to POC`);
      providerRegistry.setProvider('poc');
      logger.info('Fallback to POC provider');
    }
    
  } catch (error) {
    logger.error('Failed to initialize providers', error);
    // Ensure at least POC provider is available
    const pocProvider = new YFinancePoorProvider();
    providerRegistry.register(pocProvider);
    providerRegistry.setProvider('poc');
  }
}
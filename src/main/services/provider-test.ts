import { providerRegistry } from '../providers/provider-registry';
import { logger } from './logger';

export async function testProvider(): Promise<{ 
  connected: boolean; 
  provider: string; 
  error?: string 
}> {
  try {
    const provider = providerRegistry.getCurrentProvider();
    logger.info(`Testing connection to ${provider.name} provider`);
    
    const connected = await provider.testConnection();
    
    if (connected) {
      logger.info(`Successfully connected to ${provider.name}`);
      return { connected: true, provider: provider.name };
    } else {
      logger.warn(`Failed to connect to ${provider.name}`);
      return { 
        connected: false, 
        provider: provider.name, 
        error: 'Connection test failed' 
      };
    }
  } catch (error) {
    const provider = providerRegistry.getCurrentProvider();
    logger.error(`Provider test failed for ${provider.name}`, error);
    
    return {
      connected: false,
      provider: provider.name,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
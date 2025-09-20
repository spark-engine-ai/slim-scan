import { providerRegistry } from '../providers/provider-registry';
import { upsertSymbols, getSymbols } from './db';
import { logger } from './logger';
import { getSetting } from './settings';

export async function refreshUniverse(): Promise<void> {
  try {
    logger.info('Starting universe refresh');
    
    const provider = providerRegistry.getCurrentProvider();
    const universe = getSetting('universe');
    
    logger.info(`Fetching universe from ${provider.name} for ${universe}`);
    
    const symbols = await provider.getUniverse();
    
    if (symbols.length === 0) {
      throw new Error('No symbols returned from provider');
    }
    
    // Filter based on universe setting
    let filteredSymbols = symbols;
    
    switch (universe) {
      case 'sp500':
        filteredSymbols = symbols.slice(0, 500);
        break;
      case 'sp400':
        filteredSymbols = symbols.slice(500, 900);
        break;
      case 'sp600':
        filteredSymbols = symbols.slice(900, 1500);
        break;
      case 'sp1500':
        filteredSymbols = symbols.slice(0, 1500);
        break;
      case 'all':
        // No filtering
        break;
    }
    
    upsertSymbols(filteredSymbols);
    
    logger.info(`Universe refresh completed: ${filteredSymbols.length} symbols`);
  } catch (error) {
    logger.error('Universe refresh failed', error);
    throw error;
  }
}

export function getUniverseSymbols(): string[] {
  const symbols = getSymbols();
  return symbols.map(s => s.symbol);
}

export function getUniverseSize(): number {
  const symbols = getSymbols();
  return symbols.length;
}
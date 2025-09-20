import { Bar, SymbolRow, EpsRow, OwnershipRow } from '../types';

export interface MarketProvider {
  name: 'poc' | 'polygon' | 'fmp';
  getUniverse(opts?: { exchange?: string }): Promise<SymbolRow[]>;
  getOHLCV(symbols: string[], from: Date, to: Date): Promise<Record<string, Bar[]>>;
  getQuarterlyEPS(symbols: string[]): Promise<Record<string, EpsRow[]>>;
  getOwnership?(symbols: string[]): Promise<Record<string, OwnershipRow[]>>;
  getIndexBars(ticker: string, from: Date, to: Date): Promise<Bar[]>;
  testConnection(): Promise<boolean>;
}

export class ProviderRegistry {
  private providers = new Map<string, MarketProvider>();
  private currentProvider: string = 'poc';

  register(provider: MarketProvider) {
    this.providers.set(provider.name, provider);
  }

  setProvider(name: string) {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`);
    }
    this.currentProvider = name;
  }

  getCurrentProvider(): MarketProvider {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`Current provider ${this.currentProvider} not found`);
    }
    return provider;
  }

  getProvider(name: string): MarketProvider | undefined {
    return this.providers.get(name);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const providerRegistry = new ProviderRegistry();
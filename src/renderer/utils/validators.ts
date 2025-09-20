export function validateApiKey(key: string, provider: 'polygon' | 'iex' | 'alpaca'): boolean {
  if (!key || key.trim().length === 0) return false;
  
  switch (provider) {
    case 'polygon':
      return key.length >= 20; // Polygon keys are typically long
    case 'iex':
      return key.startsWith('pk_') || key.startsWith('sk_');
    case 'alpaca':
      return key.length >= 20;
    default:
      return false;
  }
}

export function validateSymbol(symbol: string): boolean {
  return /^[A-Z]{1,5}$/.test(symbol);
}

export function validatePercentage(value: number, min = 0, max = 100): boolean {
  return value >= min && value <= max;
}

export function validatePositiveNumber(value: number): boolean {
  return value > 0 && Number.isFinite(value);
}

export function validateDateRange(from: Date, to: Date): boolean {
  return from < to && to <= new Date();
}
export function formatNumber(value: number, decimals = 2): string {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.01 && decimals >= 2) return '< 0.01';
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals = 1): string {
  return `${formatNumber(value * 100, decimals)}%`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatLargeNumber(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `${formatNumber(value / 1e9, 1)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${formatNumber(value / 1e6, 1)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${formatNumber(value / 1e3, 1)}K`;
  }
  return formatNumber(value, 0);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
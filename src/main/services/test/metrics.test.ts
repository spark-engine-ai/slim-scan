import { describe, it, expect } from 'vitest';
import { 
  calculateNewHighPercentage, 
  calculateVolumeSpike,
  calculateMovingAverage 
} from '../metrics';
import { Bar } from '../../types';

describe('Metrics Calculations', () => {
  const mockBars: Bar[] = [
    { date: '2024-01-01', open: 100, high: 105, low: 98, close: 102, volume: 1000000 },
    { date: '2024-01-02', open: 102, high: 108, low: 100, close: 106, volume: 1200000 },
    { date: '2024-01-03', open: 106, high: 110, low: 104, close: 108, volume: 800000 },
    { date: '2024-01-04', open: 108, high: 112, low: 106, close: 110, volume: 1500000 },
    { date: '2024-01-05', open: 110, high: 115, low: 108, close: 113, volume: 2000000 },
  ];

  it('should calculate new high percentage correctly', () => {
    const result = calculateNewHighPercentage(mockBars);
    expect(result).toBeCloseTo(113 / 115, 2); // Latest close / highest high
  });

  it('should calculate volume spike correctly', () => {
    const result = calculateVolumeSpike(mockBars);
    // Latest volume (2000000) / average of previous volumes
    const avgVolume = (1000000 + 1200000 + 800000 + 1500000) / 4;
    expect(result).toBeCloseTo(2000000 / avgVolume, 2);
  });

  it('should calculate moving average correctly', () => {
    const ma3 = calculateMovingAverage(mockBars, 3);
    expect(ma3[2]).toBeCloseTo((102 + 106 + 108) / 3, 2);
    expect(ma3[3]).toBeCloseTo((106 + 108 + 110) / 3, 2);
    expect(ma3[4]).toBeCloseTo((108 + 110 + 113) / 3, 2);
  });

  it('should handle insufficient data gracefully', () => {
    const singleBar = [mockBars[0]];
    expect(calculateVolumeSpike(singleBar)).toBe(1);
    expect(calculateNewHighPercentage(singleBar)).toBe(102 / 105);
  });
});
import { create } from 'zustand';
import { ScanResult } from '../types/models';

interface ScanState {
  results: ScanResult[];
  currentScanId: number | null;
  loading: boolean;
  error: string | null;
  selectedSymbol: string | null;
  runScan: (mode: 'daily' | 'intraday') => Promise<void>;
  loadResults: (scanId: number) => Promise<void>;
  exportResults: (format: 'csv' | 'json') => Promise<string>;
  selectSymbol: (symbol: string | null) => void;
  clearResults: () => void;
}

export const useScan = create<ScanState>((set, get) => ({
  results: [],
  currentScanId: null,
  loading: false,
  error: null,
  selectedSymbol: null,

  runScan: async (mode: 'daily' | 'intraday') => {
    set({ loading: true, error: null });
    try {
      const scanId = await window.electronAPI.scan.run({ mode });
      console.log(`Scan completed with ID: ${scanId}`);
      const results = await window.electronAPI.scan.results({ scanId });
      console.log(`RunScan received ${results?.length || 0} results for scan ${scanId}:`, results);
      set({
        results,
        currentScanId: scanId,
        loading: false
      });
    } catch (error) {
      console.error('Failed to run scan:', error);
      set({
        loading: false,
        error: 'Failed to run scan'
      });
    }
  },

  loadResults: async (scanId: number) => {
    set({ loading: true, error: null });
    try {
      const results = await window.electronAPI.scan.results({ scanId });
      console.log(`Frontend received ${results?.length || 0} results for scan ${scanId}:`, results);
      set({
        results,
        currentScanId: scanId,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load scan results:', error);
      set({
        loading: false,
        error: 'Failed to load scan results'
      });
    }
  },

  exportResults: async (format: 'csv' | 'json') => {
    const { currentScanId } = get();
    if (!currentScanId) {
      throw new Error('No scan results to export');
    }

    try {
      return await window.electronAPI.scan.export({ 
        scanId: currentScanId, 
        format 
      });
    } catch (error) {
      console.error('Failed to export results:', error);
      throw new Error('Failed to export results');
    }
  },

  selectSymbol: (symbol: string | null) => {
    set({ selectedSymbol: symbol });
  },

  clearResults: () => {
    set({ 
      results: [], 
      currentScanId: null, 
      selectedSymbol: null,
      error: null 
    });
  },
}));
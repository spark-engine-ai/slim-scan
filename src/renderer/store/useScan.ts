import { create } from 'zustand';
import { ScanResult } from '../types/models';

interface ScanState {
  results: ScanResult[];
  currentScanId: number | null;
  loading: boolean;
  error: string | null;
  selectedSymbol: string | null;
  isPolling: boolean;
  pollingIntervalId: NodeJS.Timeout | null;
  runScan: (mode: 'daily' | 'intraday') => Promise<void>;
  startPolling: () => void;
  loadResults: (scanId: number) => Promise<void>;
  exportResults: (format: 'csv' | 'json') => Promise<string>;
  selectSymbol: (symbol: string | null) => void;
  clearResults: () => void;
  stopPolling: () => void;
}

export const useScan = create<ScanState>((set, get) => ({
  results: [],
  currentScanId: null,
  loading: false,
  error: null,
  selectedSymbol: null,
  isPolling: false,
  pollingIntervalId: null,

  runScan: async (mode: 'daily' | 'intraday') => {
    console.log('🚀🚀🚀 RUNSCAN CALLED with mode:', mode);

    // Check if we're already loading to prevent multiple simultaneous calls
    const currentState = get();
    if (currentState.loading) {
      console.log('🚀 Already loading - ignoring duplicate runScan call');
      return;
    }

    // Check if scan is already running first - don't clear polling if so
    try {
      console.log('🚀 Checking scan status before starting...');
      const scanStatus = await window.electronAPI.scan.status();
      console.log(`🚀 Status check result - isRunning: ${scanStatus.isRunning}`);

      if (scanStatus.isRunning) {
        console.log('🚀 Scan already running - just starting polling without clearing existing');
        get().startPolling();
        return; // Exit early, don't try to start another scan
      }
    } catch (statusError) {
      console.warn('🚀 Could not check scan status:', statusError);
    }

    const { stopPolling } = get();
    stopPolling(); // Stop any existing polling only if we're starting a new scan

    set({ loading: true, error: null, results: [] });
    console.log('🚀 Set initial state - loading: true, results cleared');

    try {
      console.log('🚀 About to call window.electronAPI.scan.run...');
      // Start the scan (it will run in background and save results in chunks)
      const scanId = await window.electronAPI.scan.run({ mode });
      console.log(`🚀 ✅ Scan started successfully with ID: ${scanId}`);
      set({ currentScanId: scanId });
      console.log('🚀 Set currentScanId:', scanId);

      // Start polling after successful scan start
      console.log('🚀 Starting polling after successful scan start');
      get().startPolling();

      // Set loading to false after starting the scan (results will stream in)
      setTimeout(() => {
        console.log('🚀 Setting loading to false');
        set({ loading: false });
      }, 1000);

      console.log('🚀 ✅ runScan completed successfully - polling should be running');

    } catch (error) {
      console.error('🚀 ❌ Failed to start scan:', error);

      // Don't show error for "scan already in progress" - just start polling instead
      if (error instanceof Error && error.message.includes('already in progress')) {
        console.log('🚀 Scan already in progress - starting polling instead');
        set({ loading: false });
        get().startPolling();
        return;
      }

      // Only show error for other types of failures
      set({
        loading: false,
        error: 'Failed to start scan'
      });
      console.log('🚀 ❌ runScan failed - no polling started');
    }
  },

  startPolling: () => {
    const { stopPolling } = get();
    stopPolling(); // Stop any existing polling first

    console.log('🚀 startPolling() called - setting up 3-second polling');
    let noChangeCount = 0;
    let previousResultCount = 0;

    // Start polling
    set({ isPolling: true });
    console.log('🚀 isPolling set to true');

    // Create the polling function
    const simplePoll = async () => {
      const state = get();
      console.log('🔄 Simple poll called - isPolling:', state.isPolling);

      if (!state.isPolling) {
        console.log('🔄 Simple polling stopped - isPolling is false');
        return;
      }

      try {
        console.log('🔄 Simple poll: Making API call...');
        const results = await window.electronAPI.scan.currentResults();
        console.log(`🔄 Simple poll: API returned ${results?.length || 0} results`);

        // Use the internal set function
        console.log('🔄 Simple poll: About to update state...');
        set({ results: results || [] });
        console.log('🔄 Simple poll: State updated with set()');

        // Stop polling if no new results for a while
        if ((results?.length || 0) === previousResultCount) {
          noChangeCount++;
        } else {
          noChangeCount = 0;
          previousResultCount = results?.length || 0;
        }

        // Stop after 20 polls with no change (60 seconds)
        if (noChangeCount >= 20) {
          console.log('🔄 Stopping polling - no new results for 60s');
          get().stopPolling();
        }
      } catch (error) {
        console.error('🔄 Simple poll error:', error);
      }
    };

    console.log('🚀 About to start polling immediately...');

    // Poll immediately first
    simplePoll().then(() => {
      console.log('🚀 Initial poll completed');
    });

    // Set up interval for every 3 seconds
    console.log('🚀 Setting up 3-second interval...');
    const intervalId = setInterval(() => {
      console.log('🔄 Interval triggered - calling simplePoll');
      simplePoll();
    }, 3000);

    set({ pollingIntervalId: intervalId });
    console.log('🚀 Interval ID saved:', intervalId);
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
    const { stopPolling } = get();
    stopPolling();
    set({
      results: [],
      currentScanId: null,
      selectedSymbol: null,
      error: null
    });
  },

  stopPolling: () => {
    const { pollingIntervalId, isPolling } = get();
    console.log('🛑 stopPolling called - isPolling:', isPolling, 'intervalId:', pollingIntervalId);

    if (pollingIntervalId) {
      console.log('🛑 Clearing interval:', pollingIntervalId);
      clearInterval(pollingIntervalId);
    } else {
      console.log('🛑 No interval to clear');
    }

    set({
      isPolling: false,
      pollingIntervalId: null
    });
    console.log('🛑 stopPolling complete - isPolling set to false');
  },
}));
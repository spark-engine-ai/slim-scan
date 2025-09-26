import React from 'react';
import { ScanToolbar } from './ScanToolbar';
import { ResultsTable } from './ResultsTable';
import { useScan } from '../../store/useScan';

export function ScanPage() {
  const { results, loading, error, loadResults, runScan, isPolling, startPolling } = useScan();
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Filter results based on search query
  const filteredResults = React.useMemo(() => {
    if (!searchQuery.trim()) return results;

    const query = searchQuery.toLowerCase().trim();
    return results.filter(result =>
      result.symbol.toLowerCase().includes(query) ||
      result.name.toLowerCase().includes(query)
    );
  }, [results, searchQuery]);

  // Run a live scan to get fresh data when the page opens
  const [hasTriggeredScan, setHasTriggeredScan] = React.useState(false);

  React.useEffect(() => {
    console.log(`🔄 ScanPage useEffect triggered: results=${results.length}, loading=${loading}, hasTriggeredScan=${hasTriggeredScan}, isPolling=${isPolling}`);

    // Add a delay to prevent race conditions and let the app fully initialize
    const timeoutId = setTimeout(async () => {
      // Only trigger once when the page first loads and conditions are right
      if (!hasTriggeredScan && !loading && !isPolling) {
        try {
          console.log('🔍 ScanPage: Checking scan status after startup delay...');

          // Check if a scan is already running
          const scanStatus = await window.electronAPI.scan.status();
          console.log(`🔍 ScanPage: Scan status check - running: ${scanStatus.isRunning}`);

          // Mark as triggered immediately to prevent multiple calls
          setHasTriggeredScan(true);

          if (scanStatus.isRunning) {
            console.log('⏸️ ScanPage: Scan already running - starting polling for results');
            startPolling(); // Start polling since scan is already running
          } else if (results.length === 0) {
            console.log('🚀 ScanPage: No scan running and no results - starting live scan for fresh data');
            runScan('daily').catch((error) => {
              console.error('❌ Failed to run live scan:', error);
              // Reset the flag so we can try again later if needed
              setHasTriggeredScan(false);
            });
          } else {
            console.log('ℹ️ ScanPage: Already have results - no need to start scan');
          }
        } catch (error) {
          console.error('❌ Failed to check scan status:', error);
          // Reset the flag on error
          setHasTriggeredScan(false);
        }
      } else {
        console.log('⏸️ ScanPage: Not starting scan - conditions not met');
      }
    }, 2000); // 2 second delay to let everything initialize

    // Cleanup timeout if component unmounts
    return () => clearTimeout(timeoutId);
  }, []); // Remove dependencies to prevent multiple triggers

  return (
    <div className="scan-page">
      <style>{`
        .scan-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: var(--spacing-lg);
          gap: var(--spacing-lg);
        }
        
        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .error-message {
          padding: var(--spacing-md);
          background-color: rgba(220, 53, 69, 0.1);
          color: var(--color-error);
          border-radius: var(--radius-md);
          border: 1px solid rgba(220, 53, 69, 0.2);
        }
        
        .loading-message {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          color: var(--color-text-muted);
          font-size: var(--font-size-lg);
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: var(--spacing-md);
          color: var(--color-text-muted);
        }
        
        .empty-state-icon {
          font-size: 48px;
          opacity: 0.5;
        }
        
        .empty-state-text {
          font-size: var(--font-size-lg);
          text-align: center;
        }

        .loading-indicator {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .loading-bar {
          height: 4px;
          background: linear-gradient(-45deg, var(--color-primary), #4CAF50, var(--color-primary), #4CAF50);
          background-size: 400% 400%;
          border-radius: 2px;
          animation: scan-progress 2s ease-in-out infinite;
          margin-bottom: var(--spacing-sm);
        }

        .loading-text {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          text-align: center;
        }

        @keyframes scan-progress {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <ScanToolbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {filteredResults.length > 0 ? (
          <ResultsTable results={filteredResults} />
        ) : results.length > 0 && filteredResults.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">
              No results match your search.<br />
              Try a different search term.
            </div>
          </div>
        ) : !loading && !isPolling ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">
              No scan results yet.<br />
              Run a scan to find CAN SLIM candidates.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useScan } from '../../store/useScan';
import { useSettings } from '../../store/useSettings';

interface ScanToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ScanToolbar({ searchQuery, onSearchChange }: ScanToolbarProps) {
  const { runScan, loading, exportResults, currentScanId, isPolling, results } = useScan();
  const { settings } = useSettings();
  const [scanMode, setScanMode] = useState<'daily' | 'intraday'>('daily');

  const handleRunScan = () => {
    runScan(scanMode);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const filePath = await exportResults(format);
      console.log('Export saved to:', filePath);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="scan-toolbar">
      <style>{`
        .scan-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md);
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }
        
        .toolbar-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }
        
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        
        .mode-selector {
          display: flex;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        
        .mode-button {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--color-background-secondary);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: var(--font-size-sm);
        }
        
        .mode-button.active {
          background: var(--color-primary);
          color: white;
        }
        
        .mode-button:hover:not(.active) {
          background: var(--color-surface-secondary);
        }
        
        .run-button {
          background: var(--color-primary);
          color: white;
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--radius-md);
          border: none;
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        
        .run-button:hover:not(:disabled) {
          background: var(--color-primary-hover);
        }
        
        .run-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .export-dropdown {
          position: relative;
          display: inline-block;
        }
        
        .export-button {
          padding: var(--spacing-sm) var(--spacing-md);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .export-button:hover {
          background: var(--color-background-secondary);
        }
        
        .export-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .scanning-indicator {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-right: var(--spacing-md);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }

        .scanning-bar {
          width: 80px;
          height: 4px;
          background: linear-gradient(-45deg, var(--color-primary), #4CAF50, var(--color-primary), #4CAF50);
          background-size: 400% 400%;
          border-radius: 2px;
          animation: scan-progress 2s ease-in-out infinite;
        }

        .scanning-text {
          font-size: var(--font-size-sm);
          color: var(--color-text);
          font-weight: var(--font-weight-medium);
          white-space: nowrap;
        }

        @keyframes scan-progress {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .search-input {
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text);
          font-size: var(--font-size-sm);
          min-width: 200px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(18, 184, 134, 0.2);
        }

        .search-input::placeholder {
          color: var(--color-text-muted);
        }
      `}</style>
      
      <div className="toolbar-left">
        <div className="mode-selector">
          <button
            className={`mode-button ${scanMode === 'daily' ? 'active' : ''}`}
            onClick={() => setScanMode('daily')}
          >
            Daily Scan
          </button>
          <button
            className={`mode-button ${scanMode === 'intraday' ? 'active' : ''}`}
            onClick={() => setScanMode('intraday')}
          >
            Intraday Check
          </button>
        </div>
        
        <button
          className="run-button"
          onClick={handleRunScan}
          disabled={loading}
        >
          {loading ? '⏳' : '▶️'}
          {loading ? 'Running...' : 'Run Scan'}
        </button>
      </div>

      <div className="toolbar-right">
        {(loading || isPolling) && (
          <div className="scanning-indicator">
            <div className="scanning-bar"></div>
            <div className="scanning-text">
              Scanning... {results.length} results
            </div>
          </div>
        )}

        <input
          type="text"
          className="search-input"
          placeholder="Search symbols or companies..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <button
          className="export-button"
          onClick={() => handleExport('csv')}
          disabled={!currentScanId || loading}
          title="Export as CSV"
        >
          📄 CSV
        </button>
      </div>
    </div>
  );
}
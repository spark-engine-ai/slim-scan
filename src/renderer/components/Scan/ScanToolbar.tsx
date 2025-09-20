import React, { useState } from 'react';
import { useScan } from '../../store/useScan';
import { useSettings } from '../../store/useSettings';

export function ScanToolbar() {
  const { runScan, loading, exportResults, currentScanId } = useScan();
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
        <button
          className="export-button"
          onClick={() => handleExport('csv')}
          disabled={!currentScanId || loading}
          title="Export as CSV"
        >
          📄 CSV
        </button>
        <button
          className="export-button"
          onClick={() => handleExport('json')}
          disabled={!currentScanId || loading}
          title="Export as JSON"
        >
          📋 JSON
        </button>
      </div>
    </div>
  );
}
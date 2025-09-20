import React from 'react';
import { ScanToolbar } from './ScanToolbar';
import { ResultsTable } from './ResultsTable';
import { useScan } from '../../store/useScan';

export function ScanPage() {
  const { results, loading, error } = useScan();

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
      `}</style>
      
      <ScanToolbar />
      
      <div className="content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="loading-message">
            Running scan... Please wait.
          </div>
        ) : results.length > 0 ? (
          <ResultsTable results={results} />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">
              No scan results yet.<br />
              Run a scan to find CAN SLIM candidates.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
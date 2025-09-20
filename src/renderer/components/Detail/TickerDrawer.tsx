import React from 'react';
import { useScan } from '../../store/useScan';
import { PriceChart } from '../Charts/PriceChart';

export function TickerDrawer() {
  const { selectedSymbol, selectSymbol } = useScan();

  if (!selectedSymbol) return null;

  return (
    <div className="ticker-drawer">
      <style>{`
        .ticker-drawer {
          width: 400px;
          background: var(--color-surface);
          border-left: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }
        
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
          background: var(--color-background-secondary);
        }
        
        .drawer-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
        }
        
        .close-button {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid var(--color-border);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .close-button:hover {
          background: var(--color-background-secondary);
        }
        
        .drawer-content {
          flex: 1;
          padding: var(--spacing-md);
          overflow: auto;
        }
        
        .chart-container {
          height: 300px;
          margin-bottom: var(--spacing-lg);
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }
        
        .metric-card {
          background: var(--color-background-secondary);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }
        
        .metric-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-xs);
        }
        
        .metric-value {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
        }
      `}</style>
      
      <div className="drawer-header">
        <div className="drawer-title">{selectedSymbol}</div>
        <button className="close-button" onClick={() => selectSymbol(null)}>
          ✕
        </button>
      </div>
      
      <div className="drawer-content">
        <div className="chart-container">
          <PriceChart symbol={selectedSymbol} />
        </div>
        
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">52W High</div>
            <div className="metric-value">$125.50</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">RS Rating</div>
            <div className="metric-value">85</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">EPS Growth</div>
            <div className="metric-value">+28%</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Volume Spike</div>
            <div className="metric-value">2.1x</div>
          </div>
        </div>
      </div>
    </div>
  );
}
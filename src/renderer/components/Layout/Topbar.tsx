import React from 'react';
import { useSettings } from '../../store/useSettings';

export function Topbar() {
  const { settings } = useSettings();

  const handleRefreshUniverse = async () => {
    try {
      await window.electronAPI.universe.refresh();
    } catch (error) {
      console.error('Failed to refresh universe:', error);
    }
  };

  const getMarketStatus = () => {
    const now = new Date();
    const hour = now.getHours();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isMarketHours = hour >= 9 && hour < 16;
    
    return isWeekday && isMarketHours ? 'Open' : 'Closed';
  };

  return (
    <div className="topbar">
      <style>{`
        .topbar {
          height: 60px;
          background-color: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }
        
        .market-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }
        
        .market-status {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--color-success);
        }
        
        .status-dot.closed {
          background-color: var(--color-error);
        }
        
        .provider-info {
          color: var(--color-text-muted);
          font-size: var(--font-size-sm);
        }
        
        .actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        
        .refresh-btn {
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid var(--color-border);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .refresh-btn:hover {
          background-color: var(--color-background-secondary);
        }
      `}</style>
      
      <div className="market-info">
        <div className="market-status">
          <div className={`status-dot ${getMarketStatus() === 'Closed' ? 'closed' : ''}`}></div>
          <span>Market {getMarketStatus()}</span>
        </div>
        <div className="provider-info">
          Provider: {settings?.provider?.toUpperCase() || 'POC'} • 
          Universe: {settings?.universe?.toUpperCase() || 'SP1500'}
        </div>
      </div>
      
      <div className="actions">
        <button className="refresh-btn" title="Refresh Universe" onClick={handleRefreshUniverse}>
          🔄
        </button>
      </div>
    </div>
  );
}
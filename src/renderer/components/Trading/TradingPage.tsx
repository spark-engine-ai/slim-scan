import React, { useState } from 'react';
import { useTrading } from '../../store/useTrading';
import { useSettings } from '../../store/useSettings';
import { formatCurrency } from '../../utils/format';
import { SellPopup } from './SellPopup';
import { Position } from '../../types/models';

export function TradingPage() {
  const { positions, cash, equity, loading, error, initialized, initialize } = useTrading();
  const { settings } = useSettings();
  const [sellPopup, setSellPopup] = useState<Position | null>(null);

  // Calculate portfolio metrics
  const totalPositionValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalCostBasis = positions.reduce((sum, pos) => sum + (pos.avgCost * pos.qty), 0);
  const totalUnrealizedPL = positions.reduce((sum, pos) => sum + pos.unrealizedPL, 0);
  const totalUnrealizedPLPercent = totalCostBasis > 0 ? (totalUnrealizedPL / totalCostBasis) * 100 : 0;
  const buyingPower = cash;
  const portfolioReturn = totalCostBasis > 0 ? ((totalPositionValue - totalCostBasis) / totalCostBasis) * 100 : 0;

  React.useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return (
    <div className="trading-page">
      <style>{`
        .trading-page {
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          height: 100%;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .page-title {
          font-size: var(--font-size-xxl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text);
        }
        
        .account-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }
        
        .summary-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          text-align: center;
        }
        
        .summary-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-xs);
        }
        
        .summary-value {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text);
        }
        
        .summary-value.positive {
          color: var(--color-success);
        }
        
        .summary-value.negative {
          color: var(--color-error);
        }
        
        .placeholder-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          color: var(--color-text-muted);
        }
        
        .placeholder-icon {
          font-size: 64px;
          opacity: 0.5;
        }
        
        .placeholder-text {
          font-size: var(--font-size-lg);
          text-align: center;
          max-width: 600px;
        }
        
        .connect-note {
          background: rgba(23, 162, 184, 0.1);
          border: 1px solid rgba(23, 162, 184, 0.2);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          color: var(--color-info);
          margin-top: var(--spacing-md);
        }

        .error-message {
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.2);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          color: var(--color-error);
          margin-bottom: var(--spacing-md);
        }

        .positions-section {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .section-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text);
          margin-bottom: var(--spacing-md);
        }

        .positions-table {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .table-header {
          background: var(--color-background-secondary);
          padding: var(--spacing-md);
          display: grid;
          grid-template-columns: 1fr 80px 100px 100px 100px 120px 80px 80px;
          gap: var(--spacing-sm);
          font-weight: var(--font-weight-semibold);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .position-row {
          padding: var(--spacing-md);
          display: grid;
          grid-template-columns: 1fr 80px 100px 100px 100px 120px 80px 80px;
          gap: var(--spacing-sm);
          align-items: center;
          border-bottom: 1px solid var(--color-border);
        }

        .position-row:last-child {
          border-bottom: none;
        }

        .text-right {
          text-align: right;
        }

        .text-center {
          text-align: center;
        }

        .btn {
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-md);
          border: none;
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: var(--font-size-xs);
        }

        .btn-danger {
          background: var(--color-error);
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: var(--color-error-dark);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--color-background-secondary);
          color: var(--color-text-secondary);
        }

        .btn-secondary:hover {
          background: var(--color-border);
          color: var(--color-text);
        }

        .symbol-name {
          font-weight: var(--font-weight-semibold);
          color: var(--color-text);
        }

        .position-details {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          margin-top: 2px;
        }

        .small-text {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          margin-top: 2px;
        }

        .live-mode-indicator {
          color: var(--color-error);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-bold);
          margin-left: var(--spacing-sm);
          padding: 2px 6px;
          background: rgba(220, 53, 69, 0.1);
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-error);
        }

        .trading-mode-subtitle {
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          margin-top: var(--spacing-xs);
        }
      `}</style>
      
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {settings?.tradingMode === 'live' ? (
              <>
                Live Trading
                <span className="live-mode-indicator">⚠️ REAL MONEY</span>
              </>
            ) : (
              'Paper Trading'
            )}
          </h1>
          <div className="trading-mode-subtitle">
            {settings?.tradingMode === 'live'
              ? 'Using real money - all trades affect your actual account'
              : 'Virtual money - safe environment for testing strategies'
            }
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={initialize}
          disabled={loading}
        >
          {loading ? 'Connecting...' : initialized ? 'Refresh' : 'Connect Alpaca'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="account-summary">
        <div className="summary-card">
          <div className="summary-label">Cash Balance</div>
          <div className="summary-value">{formatCurrency(cash)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Equity</div>
          <div className="summary-value">{formatCurrency(equity)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Positions</div>
          <div className="summary-value">{positions.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Buying Power</div>
          <div className="summary-value">{formatCurrency(buyingPower)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Unrealized P&L</div>
          <div className={`summary-value ${totalUnrealizedPL >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(totalUnrealizedPL)} ({totalUnrealizedPLPercent.toFixed(2)}%)
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Portfolio Return</div>
          <div className={`summary-value ${portfolioReturn >= 0 ? 'positive' : 'negative'}`}>
            {portfolioReturn.toFixed(2)}%
          </div>
        </div>
      </div>
      
      {initialized && !error ? (
        <div className="positions-section">
          <h2 className="section-title">Positions</h2>
          {positions.length > 0 ? (
            <div className="positions-table">
              <div className="table-header">
                <div>Symbol</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Avg Cost</div>
                <div className="text-right">Current Price</div>
                <div className="text-right">Market Value</div>
                <div className="text-right">Unrealized P&L</div>
                <div className="text-right">Allocation</div>
                <div className="text-center">Actions</div>
              </div>
              {positions.map((position) => {
                const currentPrice = position.marketValue / position.qty;
                const allocation = totalPositionValue > 0 ? (position.marketValue / totalPositionValue) * 100 : 0;
                return (
                  <div key={position.symbol} className="position-row">
                    <div>
                      <div className="symbol-name">{position.symbol}</div>
                      <div className="position-details">
                        {formatCurrency(position.avgCost * position.qty)} cost basis
                      </div>
                    </div>
                    <div className="text-right">{position.qty}</div>
                    <div className="text-right">{formatCurrency(position.avgCost)}</div>
                    <div className="text-right">{formatCurrency(currentPrice)}</div>
                    <div className="text-right">{formatCurrency(position.marketValue)}</div>
                    <div className={`text-right ${position.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
                      <div>{formatCurrency(position.unrealizedPL)}</div>
                      <div className="small-text">({(position.unrealizedPLPercent * 100).toFixed(2)}%)</div>
                    </div>
                    <div className="text-right">{allocation.toFixed(1)}%</div>
                    <div className="text-center">
                      <button
                        className="btn btn-danger"
                        onClick={() => setSellPopup(position)}
                        disabled={loading}
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="placeholder-content">
              <div className="placeholder-icon">📊</div>
              <div className="placeholder-text">
                No positions yet. Start trading by clicking the Buy button on scan results.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="placeholder-content">
          <div className="placeholder-icon">📈</div>
          <div className="placeholder-text">
            Paper trading integration with Alpaca allows you to test your strategies with virtual money.
            Connect your Alpaca paper trading account to start placing simulated trades based on your scan results.
          </div>
          <div className="connect-note">
            📝 Note: You'll need to configure your Alpaca API keys in Settings to enable paper trading functionality.
          </div>
        </div>
      )}

      {sellPopup && (
        <SellPopup
          position={sellPopup}
          onClose={() => setSellPopup(null)}
        />
      )}
    </div>
  );
}
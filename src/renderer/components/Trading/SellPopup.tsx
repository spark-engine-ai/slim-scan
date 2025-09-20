import React, { useState } from 'react';
import { useTrading } from '../../store/useTrading';
import { Position } from '../../types/models';
import { formatNumber, formatCurrency } from '../../utils/format';

interface SellPopupProps {
  position: Position;
  onClose: () => void;
}

export function SellPopup({ position, onClose }: SellPopupProps) {
  const [sellType, setSellType] = useState<'partial' | 'full'>('full');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [shares, setShares] = useState<number>(position.qty);
  const [limitPrice, setLimitPrice] = useState<number>(position.marketValue / position.qty);
  const [notes, setNotes] = useState<string>('');

  const { sellSymbol, loading } = useTrading();

  const marketPrice = position.marketValue / position.qty;
  const saleValue = shares * (orderType === 'limit' ? limitPrice : marketPrice);
  const costBasis = shares * position.avgCost;
  const realizedPL = saleValue - costBasis;
  const realizedPLPercent = (realizedPL / costBasis) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sellSymbol(position.symbol, shares);
      onClose();
    } catch (error) {
      console.error('Failed to place sell order:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="sell-popup-overlay" onClick={handleBackdropClick}>
      <style>{styles}</style>
      <div className="sell-popup">
        <div className="popup-header">
          <h2>Sell Order - {position.symbol}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="position-info">
          <div className="info-row">
            <span className="label">Current Position:</span>
            <span className="value">{position.qty} shares</span>
          </div>
          <div className="info-row">
            <span className="label">Average Cost:</span>
            <span className="value">{formatCurrency(position.avgCost)}</span>
          </div>
          <div className="info-row">
            <span className="label">Current Price:</span>
            <span className="value">{formatCurrency(marketPrice)}</span>
          </div>
          <div className="info-row">
            <span className="label">Unrealized P&L:</span>
            <span className={`value ${position.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(position.unrealizedPL)} ({(position.unrealizedPLPercent * 100).toFixed(2)}%)
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="order-form">
          <div className="form-section">
            <div className="form-group">
              <label>Sell Amount</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="sellType"
                    value="full"
                    checked={sellType === 'full'}
                    onChange={(e) => {
                      setSellType(e.target.value as 'full');
                      setShares(position.qty);
                    }}
                  />
                  Full Position ({position.qty} shares)
                </label>
                <label>
                  <input
                    type="radio"
                    name="sellType"
                    value="partial"
                    checked={sellType === 'partial'}
                    onChange={(e) => setSellType(e.target.value as 'partial')}
                  />
                  Partial Position
                </label>
              </div>
            </div>

            {sellType === 'partial' && (
              <div className="form-group">
                <label>Shares to Sell</label>
                <input
                  type="number"
                  value={shares}
                  onChange={(e) => setShares(Number(e.target.value))}
                  min="1"
                  max={position.qty}
                  step="1"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Order Type</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="orderType"
                    value="market"
                    checked={orderType === 'market'}
                    onChange={(e) => setOrderType(e.target.value as 'market')}
                  />
                  Market Order
                </label>
                <label>
                  <input
                    type="radio"
                    name="orderType"
                    value="limit"
                    checked={orderType === 'limit'}
                    onChange={(e) => setOrderType(e.target.value as 'limit')}
                  />
                  Limit Order
                </label>
              </div>
            </div>

            {orderType === 'limit' && (
              <div className="form-group">
                <label>Limit Price</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this trade..."
                rows={3}
              />
            </div>
          </div>

          <div className="order-summary">
            <div className="summary-row">
              <span>Shares to Sell:</span>
              <span>{shares}</span>
            </div>
            <div className="summary-row">
              <span>Sale Price:</span>
              <span>{formatCurrency(orderType === 'limit' ? limitPrice : marketPrice)}</span>
            </div>
            <div className="summary-row">
              <span>Sale Value:</span>
              <span>{formatCurrency(saleValue)}</span>
            </div>
            <div className="summary-row">
              <span>Cost Basis:</span>
              <span>{formatCurrency(costBasis)}</span>
            </div>
            <div className="summary-row total">
              <span>Realized P&L:</span>
              <span className={realizedPL >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(realizedPL)} ({formatNumber(realizedPLPercent, 2)}%)
              </span>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Placing Order...' : `Sell ${shares} Shares`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = `
  .sell-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .sell-popup {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 90vw;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
  }

  .popup-header h2 {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-lg);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--color-background-secondary);
    color: var(--color-text);
  }

  .position-info {
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--color-background-secondary);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
  }

  .info-row:last-child {
    margin-bottom: 0;
  }

  .info-row .label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .info-row .value {
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    font-size: var(--font-size-sm);
  }

  .info-row .value.positive {
    color: var(--color-success);
  }

  .info-row .value.negative {
    color: var(--color-error);
  }

  .order-form {
    padding: var(--spacing-lg);
  }

  .form-section {
    margin-bottom: var(--spacing-lg);
  }

  .form-group {
    margin-bottom: var(--spacing-md);
  }

  .form-group label {
    display: block;
    margin-bottom: var(--spacing-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    font-size: var(--font-size-sm);
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .radio-group label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: 0;
    cursor: pointer;
    font-weight: normal;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-background);
    color: var(--color-text);
    font-size: var(--font-size-sm);
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  .order-summary {
    background: var(--color-background-secondary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs) 0;
    font-size: var(--font-size-sm);
  }

  .summary-row.total {
    border-top: 1px solid var(--color-border);
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-md);
  }

  .summary-row .positive {
    color: var(--color-success);
  }

  .summary-row .negative {
    color: var(--color-error);
  }

  .form-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
  }

  .btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-md);
    border: none;
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-size-sm);
  }

  .btn-secondary {
    background: var(--color-background-secondary);
    color: var(--color-text-secondary);
  }

  .btn-secondary:hover {
    background: var(--color-border);
    color: var(--color-text);
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
`;
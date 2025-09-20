import React, { useState } from 'react';
import { useTrading } from '../../store/useTrading';
import { formatNumber } from '../../utils/format';

interface BuyPopupProps {
  symbol: string;
  price: number;
  onClose: () => void;
}

export function BuyPopup({ symbol, price, onClose }: BuyPopupProps) {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [shares, setShares] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<number>(price);
  const [stopLoss, setStopLoss] = useState<number>(Math.round(price * 0.92 * 100) / 100); // 8% stop loss
  const [notes, setNotes] = useState<string>('');

  const { buySymbol, loading } = useTrading();

  const positionValue = shares * (orderType === 'limit' ? limitPrice : price);
  const stopLossPercent = ((price - stopLoss) / price) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await buySymbol(symbol, shares, {
        orderType,
        limitPrice: orderType === 'limit' ? limitPrice : undefined,
        stopLoss,
        notes
      });
      onClose();
    } catch (error) {
      console.error('Failed to place buy order:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="buy-popup-overlay" onClick={handleBackdropClick}>
      <style>{styles}</style>
      <div className="buy-popup">
        <div className="popup-header">
          <h2>Buy Order - {symbol}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="stock-info">
          <div className="stock-price">
            <span className="label">Current Price:</span>
            <span className="price">${formatNumber(price)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="order-form">
          <div className="form-section">
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

            <div className="form-row">
              <div className="form-group">
                <label>Shares</label>
                <input
                  type="number"
                  value={shares}
                  onChange={(e) => setShares(Number(e.target.value))}
                  min="1"
                  step="1"
                  required
                />
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
            </div>

            <div className="form-group">
              <label>Stop Loss Price</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                min="0.01"
                step="0.01"
              />
              <div className="helper-text">
                Risk: {formatNumber(stopLossPercent, 1)}% below current price
              </div>
            </div>

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
              <span>Shares:</span>
              <span>{shares}</span>
            </div>
            <div className="summary-row">
              <span>Price:</span>
              <span>${formatNumber(orderType === 'limit' ? limitPrice : price)}</span>
            </div>
            <div className="summary-row total">
              <span>Total Value:</span>
              <span>${formatNumber(positionValue)}</span>
            </div>
            <div className="summary-row">
              <span>Stop Loss:</span>
              <span>${formatNumber(stopLoss)} (-{formatNumber(stopLossPercent, 1)}%)</span>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Placing Order...' : `Buy ${shares} Shares`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = `
  .buy-popup-overlay {
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

  .buy-popup {
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

  .stock-info {
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--color-background-secondary);
  }

  .stock-price {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stock-price .label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .stock-price .price {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
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
    gap: var(--spacing-md);
  }

  .radio-group label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: 0;
    cursor: pointer;
    font-weight: normal;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
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

  .helper-text {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-top: var(--spacing-xs);
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

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
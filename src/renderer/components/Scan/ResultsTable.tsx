import React, { useState } from 'react';
import { ScanResult } from '../../types/models';
import { ScoreBadge } from './ScoreBadge';
import { FactorChips } from './FactorChips';
import { BuyPopup } from '../Trading/BuyPopup';
import { useScan } from '../../store/useScan';
import { useTrading } from '../../store/useTrading';
import { formatNumber, formatPercent } from '../../utils/format';

interface ResultsTableProps {
  results: ScanResult[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  const { selectSymbol, selectedSymbol } = useScan();
  const { loading: tradingLoading } = useTrading();
  const [buyPopup, setBuyPopup] = useState<{ symbol: string; price: number } | null>(null);

  const handleRowClick = (symbol: string) => {
    selectSymbol(selectedSymbol === symbol ? null : symbol);
  };

  const handleBuyClick = (symbol: string, price: number) => {
    setBuyPopup({ symbol, price });
  };

  const closeBuyPopup = () => {
    setBuyPopup(null);
  };

  return (
    <div className="results-table-container">
      <style>{`
        .results-table-container {
          flex: 1;
          overflow: auto;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
        }
        
        .table-header {
          position: sticky;
          top: 0;
          background: var(--color-background-secondary);
          border-bottom: 1px solid var(--color-border);
          z-index: 1;
        }
        
        .header-row {
          display: grid;
          grid-template-columns: 1fr 80px 80px 80px 80px 100px 100px 80px 200px 100px;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          font-weight: var(--font-weight-semibold);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }
        
        .table-body {
          min-height: 0;
        }
        
        .data-row {
          display: grid;
          grid-template-columns: 1fr 80px 80px 80px 80px 100px 100px 80px 200px 100px;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
          cursor: pointer;
          transition: background-color 0.2s ease;
          align-items: center;
        }
        
        .data-row:hover {
          background: var(--color-background-secondary);
        }
        
        .data-row.selected {
          background: rgba(18, 184, 134, 0.1);
          border-color: var(--color-primary);
        }
        
        .symbol-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .symbol {
          font-weight: var(--font-weight-semibold);
          color: var(--color-text);
        }
        
        .company-name {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .price {
          font-weight: var(--font-weight-medium);
        }
        
        .positive {
          color: var(--color-success);
        }
        
        .negative {
          color: var(--color-error);
        }
        
        .neutral {
          color: var(--color-text-muted);
        }
        
        .text-center {
          text-align: center;
        }
        
        .text-right {
          text-align: right;
        }
      `}</style>
      
      <div className="table-header">
        <div className="header-row">
          <div>Symbol</div>
          <div className="text-center">Score</div>
          <div className="text-center">Price</div>
          <div className="text-center">RS %</div>
          <div className="text-center">% 52W</div>
          <div className="text-center">EPS QoQ</div>
          <div className="text-center">EPS 3Y</div>
          <div className="text-center">Vol Spike</div>
          <div className="text-center">Factors</div>
          <div className="text-center">Actions</div>
        </div>
      </div>
      
      <div className="table-body">
        {results.map((result) => (
          <div
            key={result.symbol}
            className={`data-row ${selectedSymbol === result.symbol ? 'selected' : ''}`}
            onClick={() => handleRowClick(result.symbol)}
          >
            <div className="symbol-cell">
              <div className="symbol">{result.symbol}</div>
              <div className="company-name">{result.name}</div>
            </div>
            
            <div className="text-center">
              <ScoreBadge score={result.score} />
            </div>
            
            <div className="text-right price">
              ${formatNumber(result.price)}
            </div>
            
            <div className="text-center">
              <span className={result.rs_pct >= 80 ? 'positive' : result.rs_pct >= 60 ? 'neutral' : 'negative'}>
                {formatNumber(result.rs_pct, 0)}
              </span>
            </div>
            
            <div className="text-center">
              <span className={result.pct_52w >= 0.85 ? 'positive' : result.pct_52w >= 0.70 ? 'neutral' : 'negative'}>
                {formatPercent(result.pct_52w)}
              </span>
            </div>
            
            <div className="text-center">
              <span className={result.c_qoq >= 0.25 ? 'positive' : result.c_qoq >= 0 ? 'neutral' : 'negative'}>
                {formatPercent(result.c_qoq)}
              </span>
            </div>
            
            <div className="text-center">
              <span className={result.a_cagr >= 0.25 ? 'positive' : result.a_cagr >= 0.15 ? 'neutral' : 'negative'}>
                {formatPercent(result.a_cagr)}
              </span>
            </div>
            
            <div className="text-center">
              <span className={result.vol_spike >= 1.5 ? 'positive' : result.vol_spike >= 1.2 ? 'neutral' : 'negative'}>
                {formatNumber(result.vol_spike, 1)}x
              </span>
            </div>
            
            <div>
              <FactorChips result={result} />
            </div>
            
            <div className="text-center">
              <button
                className="btn btn-sm btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuyClick(result.symbol, result.price);
                }}
                disabled={tradingLoading}
              >
                Buy
              </button>
            </div>
          </div>
        ))}
      </div>

      {buyPopup && (
        <BuyPopup
          symbol={buyPopup.symbol}
          price={buyPopup.price}
          onClose={closeBuyPopup}
        />
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useBacktest } from '../../store/useBacktest';

interface BacktestConfig {
  dateFrom: string;
  dateTo: string;
  scoreCutoff: number;
  riskPercent: number;
  stopPercent: number;
  maxPositions: number;
  useMarketGate: boolean;
  // Advanced options
  profitTargetPercent?: number;
  maxHoldingDays?: number;
  minHoldingDays?: number;
  initialCapital?: number;
  commission?: number;
  slippage?: number;
  // Strategy options
  enableTrailingStop?: boolean;
  trailingStopPercent?: number;
  enablePyramiding?: boolean;
  maxPyramidLevels?: number;
  // Risk management
  maxDailyLoss?: number;
  maxDrawdown?: number;
  // Market conditions
  minVolumeFilter?: number;
  minPriceFilter?: number;
}

export function BacktestPage() {
  const { results, loading, runBacktest } = useBacktest();

  const [config, setConfig] = useState<BacktestConfig>({
    dateFrom: '2024-08-12',
    dateTo: '2024-12-31',
    scoreCutoff: 70,
    riskPercent: 2,
    stopPercent: 7,
    maxPositions: 10,
    useMarketGate: true,
    // Advanced defaults
    profitTargetPercent: 15,
    maxHoldingDays: 30,
    minHoldingDays: 1,
    initialCapital: 100000,
    commission: 0,
    slippage: 0.01,
    // Strategy defaults
    enableTrailingStop: false,
    trailingStopPercent: 3,
    enablePyramiding: false,
    maxPyramidLevels: 3,
    // Risk management defaults
    maxDailyLoss: 2,
    maxDrawdown: 15,
    // Market condition defaults
    minVolumeFilter: 500000,
    minPriceFilter: 5,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRunBacktest = () => {
    runBacktest(config);
  };

  const updateConfig = (updates: Partial<BacktestConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const presets = {
    conservative: {
      scoreCutoff: 85,
      riskPercent: 1,
      stopPercent: 5,
      maxPositions: 5,
      useMarketGate: true,
      profitTargetPercent: 12,
      maxHoldingDays: 20,
      enableTrailingStop: false,
      maxDailyLoss: 1,
      minVolumeFilter: 1000000,
      minPriceFilter: 10,
    },
    balanced: {
      scoreCutoff: 70,
      riskPercent: 2,
      stopPercent: 7,
      maxPositions: 10,
      useMarketGate: true,
      profitTargetPercent: 15,
      maxHoldingDays: 30,
      enableTrailingStop: false,
      maxDailyLoss: 2,
      minVolumeFilter: 500000,
      minPriceFilter: 5,
    },
    aggressive: {
      scoreCutoff: 60,
      riskPercent: 4,
      stopPercent: 10,
      maxPositions: 20,
      useMarketGate: false,
      profitTargetPercent: 25,
      maxHoldingDays: 45,
      enableTrailingStop: true,
      trailingStopPercent: 4,
      maxDailyLoss: 4,
      minVolumeFilter: 200000,
      minPriceFilter: 2,
    },
    growth: {
      scoreCutoff: 75,
      riskPercent: 2.5,
      stopPercent: 8,
      maxPositions: 12,
      useMarketGate: true,
      profitTargetPercent: 20,
      maxHoldingDays: 35,
      enableTrailingStop: true,
      trailingStopPercent: 3,
      maxDailyLoss: 2.5,
      minVolumeFilter: 750000,
      minPriceFilter: 8,
    }
  };

  const applyPreset = (presetName: keyof typeof presets) => {
    updateConfig(presets[presetName]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="backtest-page">
      <style>{`
        .backtest-page {
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          height: 100%;
          overflow-y: auto;
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

        .backtest-results {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-md);
        }

        .metric-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          text-align: center;
        }

        .metric-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-xs);
        }

        .metric-value {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text);
        }

        .metric-value.positive {
          color: var(--color-success);
        }

        .metric-value.negative {
          color: var(--color-error);
        }

        .section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
        }

        .section-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text);
          margin-bottom: var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
          padding-bottom: var(--spacing-sm);
        }

        .trades-table {
          overflow-x: auto;
        }

        .trades-table table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--font-size-sm);
        }

        .trades-table th,
        .trades-table td {
          padding: var(--spacing-sm);
          text-align: left;
          border-bottom: 1px solid var(--color-border);
        }

        .trades-table th {
          background: var(--color-background-secondary);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-secondary);
        }

        .trades-table td.positive {
          color: var(--color-success);
        }

        .trades-table td.negative {
          color: var(--color-error);
        }

        .symbol-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--spacing-sm);
        }

        .symbol-stat {
          padding: var(--spacing-sm);
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          text-align: center;
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

        .config-info {
          background: var(--color-background-secondary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .config-panel {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }

        .config-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .config-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text);
        }

        .toggle-button {
          background: none;
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: var(--font-size-sm);
        }

        .toggle-button:hover {
          background: var(--color-background-secondary);
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--spacing-md);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .form-label {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text);
        }

        .form-help {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }

        .form-input {
          padding: var(--spacing-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-background);
          color: var(--color-text);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-light);
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .preset-buttons {
          display: flex;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-md);
        }

        .preset-btn {
          padding: var(--spacing-xs) var(--spacing-sm);
          border: 1px solid var(--color-border);
          background: var(--color-background);
          color: var(--color-text-secondary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: var(--font-size-xs);
        }

        .preset-btn:hover {
          background: var(--color-surface);
        }

        .preset-btn.active {
          background: var(--color-primary-light);
          border-color: var(--color-primary);
          color: var(--color-primary-dark);
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">CAN SLIM Backtest</h1>
        <button
          className="btn btn-primary"
          onClick={handleRunBacktest}
          disabled={loading}
        >
          {loading ? 'Running...' : 'Run Backtest'}
        </button>
      </div>

      <div className="config-panel">
        <div className="config-header">
          <h3 className="config-title">Backtest Configuration</h3>
          <button
            className="toggle-button"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        </div>

        <div className="preset-buttons">
          <button className="preset-btn" onClick={() => applyPreset('conservative')}>
            🛡️ Conservative
          </button>
          <button className="preset-btn" onClick={() => applyPreset('balanced')}>
            ⚖️ Balanced
          </button>
          <button className="preset-btn" onClick={() => applyPreset('growth')}>
            📈 Growth
          </button>
          <button className="preset-btn" onClick={() => applyPreset('aggressive')}>
            🚀 Aggressive
          </button>
        </div>

        <div className="config-grid">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={config.dateFrom}
              onChange={(e) => updateConfig({ dateFrom: e.target.value })}
            />
            <div className="form-help">Beginning of backtest period</div>
          </div>

          <div className="form-group">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-input"
              value={config.dateTo}
              onChange={(e) => updateConfig({ dateTo: e.target.value })}
            />
            <div className="form-help">End of backtest period</div>
          </div>

          <div className="form-group">
            <label className="form-label">CAN SLIM Score Cutoff</label>
            <input
              type="number"
              className="form-input"
              value={config.scoreCutoff}
              onChange={(e) => updateConfig({ scoreCutoff: Number(e.target.value) })}
              min="0"
              max="100"
            />
            <div className="form-help">Minimum score to enter trades (0-100)</div>
          </div>

          <div className="form-group">
            <label className="form-label">Risk Per Trade (%)</label>
            <input
              type="number"
              className="form-input"
              value={config.riskPercent}
              onChange={(e) => updateConfig({ riskPercent: Number(e.target.value) })}
              min="0.1"
              max="10"
              step="0.1"
            />
            <div className="form-help">Portfolio % to risk per position</div>
          </div>

          <div className="form-group">
            <label className="form-label">Stop Loss (%)</label>
            <input
              type="number"
              className="form-input"
              value={config.stopPercent}
              onChange={(e) => updateConfig({ stopPercent: Number(e.target.value) })}
              min="1"
              max="20"
              step="0.5"
            />
            <div className="form-help">Stop loss percentage from entry</div>
          </div>

          <div className="form-group">
            <label className="form-label">Max Positions</label>
            <input
              type="number"
              className="form-input"
              value={config.maxPositions}
              onChange={(e) => updateConfig({ maxPositions: Number(e.target.value) })}
              min="1"
              max="50"
            />
            <div className="form-help">Maximum concurrent positions</div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="marketGate"
                checked={config.useMarketGate}
                onChange={(e) => updateConfig({ useMarketGate: e.target.checked })}
              />
              <label htmlFor="marketGate" className="form-label">Use Market Gate</label>
            </div>
            <div className="form-help">Only trade when market trend is positive</div>
          </div>

          {showAdvanced && (
            <>
              <div className="form-group">
                <label className="form-label">Initial Capital ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.initialCapital}
                  onChange={(e) => updateConfig({ initialCapital: Number(e.target.value) })}
                  min="1000"
                  step="1000"
                />
                <div className="form-help">Starting portfolio value</div>
              </div>

              <div className="form-group">
                <label className="form-label">Profit Target (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.profitTargetPercent}
                  onChange={(e) => updateConfig({ profitTargetPercent: Number(e.target.value) })}
                  min="5"
                  max="100"
                  step="1"
                />
                <div className="form-help">Take profits at this gain percentage</div>
              </div>

              <div className="form-group">
                <label className="form-label">Max Holding Days</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.maxHoldingDays}
                  onChange={(e) => updateConfig({ maxHoldingDays: Number(e.target.value) })}
                  min="1"
                  max="365"
                />
                <div className="form-help">Force exit after this many days</div>
              </div>

              <div className="form-group">
                <label className="form-label">Min Holding Days</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.minHoldingDays}
                  onChange={(e) => updateConfig({ minHoldingDays: Number(e.target.value) })}
                  min="0"
                  max="30"
                />
                <div className="form-help">Don't exit before this many days</div>
              </div>

              <div className="form-group">
                <label className="form-label">Commission ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.commission}
                  onChange={(e) => updateConfig({ commission: Number(e.target.value) })}
                  min="0"
                  max="10"
                  step="0.01"
                />
                <div className="form-help">Commission per trade</div>
              </div>

              <div className="form-group">
                <label className="form-label">Slippage (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.slippage}
                  onChange={(e) => updateConfig({ slippage: Number(e.target.value) })}
                  min="0"
                  max="1"
                  step="0.001"
                />
                <div className="form-help">Market impact slippage</div>
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="trailingStop"
                    checked={config.enableTrailingStop}
                    onChange={(e) => updateConfig({ enableTrailingStop: e.target.checked })}
                  />
                  <label htmlFor="trailingStop" className="form-label">Enable Trailing Stop</label>
                </div>
                <div className="form-help">Use trailing stop loss instead of fixed</div>
              </div>

              {config.enableTrailingStop && (
                <div className="form-group">
                  <label className="form-label">Trailing Stop (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={config.trailingStopPercent}
                    onChange={(e) => updateConfig({ trailingStopPercent: Number(e.target.value) })}
                    min="1"
                    max="10"
                    step="0.5"
                  />
                  <div className="form-help">Trailing stop percentage</div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Max Daily Loss (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.maxDailyLoss}
                  onChange={(e) => updateConfig({ maxDailyLoss: Number(e.target.value) })}
                  min="0.5"
                  max="10"
                  step="0.1"
                />
                <div className="form-help">Stop trading for the day after this loss</div>
              </div>

              <div className="form-group">
                <label className="form-label">Min Volume Filter</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.minVolumeFilter}
                  onChange={(e) => updateConfig({ minVolumeFilter: Number(e.target.value) })}
                  min="10000"
                  step="10000"
                />
                <div className="form-help">Minimum daily volume to trade</div>
              </div>

              <div className="form-group">
                <label className="form-label">Min Price Filter ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.minPriceFilter}
                  onChange={(e) => updateConfig({ minPriceFilter: Number(e.target.value) })}
                  min="1"
                  max="50"
                  step="1"
                />
                <div className="form-help">Minimum stock price to trade</div>
              </div>
            </>
          )}
        </div>
      </div>

      {results ? (
        <div className="backtest-results">
          <div className="config-info">
            <strong>Test Period:</strong> {results.dateRange.from} to {results.dateRange.to} |
            <strong> Score Cutoff:</strong> {results.config.scoreCutoff} |
            <strong> Max Positions:</strong> {results.config.maxPositions} |
            <strong> Risk:</strong> {results.config.riskPercent}% |
            <strong> Stop Loss:</strong> {results.config.stopPercent}%
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Return</div>
              <div className={`metric-value ${results.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                {formatPercent(results.totalReturn)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Win Rate</div>
              <div className="metric-value">
                {formatPercent(results.winRate)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Total Trades</div>
              <div className="metric-value">
                {results.totalTrades}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Profit Factor</div>
              <div className={`metric-value ${results.profitFactor >= 1 ? 'positive' : 'negative'}`}>
                {results.profitFactor.toFixed(2)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Max Drawdown</div>
              <div className="metric-value negative">
                {formatPercent(results.maxDrawdown)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Sharpe Ratio</div>
              <div className="metric-value">
                {results.sharpeRatio.toFixed(2)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Avg Return</div>
              <div className={`metric-value ${results.avgReturn >= 0 ? 'positive' : 'negative'}`}>
                {formatPercent(results.avgReturn)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Avg Holding Days</div>
              <div className="metric-value">
                {results.avgHoldingDays.toFixed(1)}
              </div>
            </div>
          </div>

          {results.symbolStats && results.symbolStats.length > 0 && (
            <div className="section">
              <h3 className="section-title">Performance by Symbol</h3>
              <div className="symbol-stats-grid">
                {results.symbolStats.slice(0, 12).map(stat => (
                  <div key={stat.symbol} className="symbol-stat">
                    <div style={{ fontWeight: 'bold' }}>{stat.symbol}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {stat.trades} trades
                    </div>
                    <div className={stat.totalReturn >= 0 ? 'positive' : 'negative'}>
                      {formatPercent(stat.totalReturn)}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)' }}>
                      {formatPercent(stat.winRate)} win rate
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.trades && results.trades.length > 0 && (
            <div className="section">
              <h3 className="section-title">Trade History ({results.trades.length} trades)</h3>
              <div className="trades-table">
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Entry Date</th>
                      <th>Exit Date</th>
                      <th>Entry Price</th>
                      <th>Exit Price</th>
                      <th>Shares</th>
                      <th>Return</th>
                      <th>Return %</th>
                      <th>Days</th>
                      <th>Score</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.trades.slice(0, 50).map((trade, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: 'bold' }}>{trade.symbol}</td>
                        <td>{trade.entryDate}</td>
                        <td>{trade.exitDate || 'Open'}</td>
                        <td>{formatCurrency(trade.entryPrice)}</td>
                        <td>{trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}</td>
                        <td>{trade.shares}</td>
                        <td className={trade.return && trade.return >= 0 ? 'positive' : 'negative'}>
                          {trade.return ? formatCurrency(trade.return) : '-'}
                        </td>
                        <td className={trade.returnPercent && trade.returnPercent >= 0 ? 'positive' : 'negative'}>
                          {trade.returnPercent ? formatPercent(trade.returnPercent) : '-'}
                        </td>
                        <td>{trade.holdingDays || 0}</td>
                        <td>{trade.score?.toFixed(1) || '-'}</td>
                        <td>{trade.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.trades.length > 50 && (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>
                    Showing first 50 trades of {results.trades.length}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="placeholder-content">
          <div className="placeholder-icon">⏳</div>
          <div className="placeholder-text">
            Running comprehensive CAN SLIM backtest simulation...
            <br />
            <small>Analyzing historical data, calculating scores, simulating trades...</small>
          </div>
        </div>
      ) : (
        <div className="placeholder-content">
          <div className="placeholder-icon">📊</div>
          <div className="placeholder-text">
            Run a comprehensive CAN SLIM backtest to see how the strategy would have performed historically.
            <br />
            <br />
            The backtest will:
            <br />
            • Test all available stocks in your universe
            <br />
            • Apply CAN SLIM scoring criteria
            <br />
            • Simulate realistic position sizing and risk management
            <br />
            • Show detailed trade-by-trade results
            <br />
            • Calculate comprehensive performance metrics
          </div>
        </div>
      )}
    </div>
  );
}
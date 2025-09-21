import React, { useState } from 'react';
import { useSettings } from '../../store/useSettings';
import { AppSettings } from '../../types/models';

export function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(settings);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [alpacaKeys, setAlpacaKeys] = useState<Record<string, string>>({});
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    enabled: false
  });

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  React.useEffect(() => {
    loadApiKeys();
    loadAiSettings();
  }, []);

  const loadApiKeys = async () => {
    setLoadingApiKeys(true);
    try {
      const fmpKey = await window.electronAPI.apikey.get('fmp');
      const polygonKey = await window.electronAPI.apikey.get('polygon');
      const openaiKey = await window.electronAPI.apikey.get('openai');
      setApiKeys({
        fmp: fmpKey || '',
        polygon: polygonKey || '',
        openai: openaiKey || '',
      });

      // Load Alpaca keys
      const alpacaKeyId = await window.electronAPI.apikey.get('alpaca_key_id');
      const alpacaSecret = await window.electronAPI.apikey.get('alpaca_secret_key');
      setAlpacaKeys({
        key_id: alpacaKeyId || '',
        secret_key: alpacaSecret || '',
      });
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const loadAiSettings = async () => {
    try {
      // For now, just keep the default AI settings
      // In the future, this could load from backend
      console.log('AI settings loaded (using defaults)');
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  };

  const saveApiKey = async (provider: string, apiKey: string) => {
    try {
      if (apiKey.trim()) {
        await window.electronAPI.apikey.set({ provider, apiKey: apiKey.trim() });
      } else {
        await window.electronAPI.apikey.delete(provider);
      }
      setApiKeys(prev => ({ ...prev, [provider]: apiKey }));
    } catch (error) {
      console.error(`Failed to save ${provider} API key:`, error);
    }
  };

  const handleSave = async () => {
    if (localSettings) {
      await updateSettings(localSettings);
    }
  };

  const updateLocalSettings = async (updates: Partial<AppSettings>) => {
    if (localSettings) {
      const newSettings = { ...localSettings, ...updates };
      setLocalSettings(newSettings);
      // Auto-save the settings
      await updateSettings(newSettings);
    }
  };

  const updateThreshold = async (key: string, value: number) => {
    if (localSettings) {
      const newSettings = {
        ...localSettings,
        scanConfig: {
          ...localSettings.scanConfig,
          thresholds: {
            ...localSettings.scanConfig.thresholds,
            [key]: value
          }
        }
      };
      setLocalSettings(newSettings);
      // Auto-save the settings
      await updateSettings(newSettings);
    }
  };

  const updateLiquidity = async (key: string, value: number) => {
    if (localSettings) {
      const newSettings = {
        ...localSettings,
        scanConfig: {
          ...localSettings.scanConfig,
          liquidity: {
            ...localSettings.scanConfig.liquidity,
            [key]: value
          }
        }
      };
      setLocalSettings(newSettings);
      // Auto-save the settings
      await updateSettings(newSettings);
    }
  };

  const updateIbdFilters = async (updates: Partial<NonNullable<typeof localSettings>['scanConfig']['ibdFilters']>) => {
    if (localSettings) {
      // Initialize IBD filters with defaults if they don't exist
      const currentIbdFilters = localSettings.scanConfig.ibdFilters || {
        enabled: false,
        minRsRating: 80,
        minUpDownRatio: 1.0,
        minAdRating: 'C',
        minComposite: 70
      };

      const newSettings = {
        ...localSettings,
        scanConfig: {
          ...localSettings.scanConfig,
          ibdFilters: {
            ...currentIbdFilters,
            ...updates
          }
        }
      };
      setLocalSettings(newSettings);
      // Auto-save the settings
      await updateSettings(newSettings);
    }
  };

  if (!localSettings) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <style>{`
        .settings-page {
          padding: var(--spacing-lg);
          max-width: 800px;
          margin: 0 auto;
        }
        
        .page-title {
          font-size: var(--font-size-xxl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text);
          margin-bottom: var(--spacing-xl);
        }
        
        .settings-section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }
        
        .section-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text);
          margin-bottom: var(--spacing-md);
          padding-bottom: var(--spacing-sm);
          border-bottom: 1px solid var(--color-border);
        }
        
        .form-group {
          margin-bottom: var(--spacing-md);
        }
        
        .settings-label {
          display: block;
          font-weight: var(--font-weight-semibold);
          color: var(--color-text);
          margin-bottom: var(--spacing-xs);
          font-size: var(--font-size-sm);
          line-height: 1.4;
        }
        
        .form-input,
        .form-select {
          width: 100%;
          max-width: 300px;
        }
        
        .settings-input {
          width: 100%;
          max-width: 300px;
        }
        
        .settings-select {
          width: 100%;
          max-width: 300px;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--spacing-md);
        }
        
        .save-button {
          position: sticky;
          bottom: var(--spacing-lg);
          margin-top: var(--spacing-xl);
        }
        
        .threshold-input {
          width: 100px;
        }
      `}</style>
      
      <h1 className="page-title">Settings</h1>
      
      <div className="settings-section">
        <h2 className="section-title">Data Provider</h2>
        <div className="form-group">
          <label className="form-label settings-label">Provider</label>
          <select 
            className="select settings-select"
            value={localSettings.provider}
            onChange={(e) => updateLocalSettings({ provider: e.target.value as any })}
          >
            <option value="polygon">Polygon</option>
            <option value="fmp">FMP</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label settings-label">Universe</label>
          <select 
            className="select settings-select"
            value={localSettings.universe}
            onChange={(e) => updateLocalSettings({ universe: e.target.value as any })}
          >
            <option value="sp500">S&P 500</option>
            <option value="sp400">S&P 400</option>
            <option value="sp600">S&P 600</option>
            <option value="sp1500">S&P 1500</option>
            <option value="all">All Stocks</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">Trading Settings</h2>
        <div className="form-group">
          <label className="form-label settings-label">Trading Mode</label>
          <select
            className="select settings-select"
            value={localSettings.tradingMode || 'paper'}
            onChange={(e) => updateLocalSettings({ tradingMode: e.target.value as 'paper' | 'live' })}
          >
            <option value="paper">Paper Trading (Virtual Money)</option>
            <option value="live">Live Trading (Real Money)</option>
          </select>
          <div className="form-help">
            {localSettings.tradingMode === 'live' ? (
              <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 'bold' }}>
                ⚠️ WARNING: Live trading uses real money. Make sure you understand the risks.
              </span>
            ) : (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                Paper trading uses virtual money for risk-free testing of strategies.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">API Keys</h2>
        {loadingApiKeys ? (
          <div>Loading API keys...</div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label settings-label">
                Financial Modeling Prep API Key
                <span style={{ fontSize: '12px', color: '#666', display: 'block', fontWeight: 'normal' }}>
                  Get free API key from financialmodelingprep.com (250 requests/day)
                </span>
              </label>
              <input
                type="password"
                className="input settings-input"
                placeholder="Enter FMP API key..."
                value={apiKeys.fmp || ''}
                onChange={(e) => setApiKeys(prev => ({ ...prev, fmp: e.target.value }))}
                onBlur={(e) => saveApiKey('fmp', e.target.value)}
                style={{ width: '400px' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label settings-label">
                Polygon API Key
                <span style={{ fontSize: '12px', color: '#666', display: 'block', fontWeight: 'normal' }}>
                  Premium option from polygon.io
                </span>
              </label>
              <input
                type="password"
                className="input settings-input"
                placeholder="Enter Polygon API key..."
                value={apiKeys.polygon || ''}
                onChange={(e) => setApiKeys(prev => ({ ...prev, polygon: e.target.value }))}
                onBlur={(e) => saveApiKey('polygon', e.target.value)}
                style={{ width: '400px' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label settings-label">
                OpenAI API Key
                <span style={{ fontSize: '12px', color: '#666', display: 'block', fontWeight: 'normal' }}>
                  Required for AI Assistant - Get from platform.openai.com
                </span>
              </label>
              <input
                type="password"
                className="input settings-input"
                placeholder="Enter OpenAI API key..."
                value={apiKeys.openai || ''}
                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                onBlur={(e) => saveApiKey('openai', e.target.value)}
                style={{ width: '400px' }}
              />
            </div>
          </>
        )}
      </div>

      <div className="settings-section">
        <h2 className="section-title">📈 Paper Trading (Alpaca)</h2>
        {loadingApiKeys ? (
          <div>Loading Alpaca keys...</div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label settings-label">
                Alpaca API Key ID
                <span style={{ fontSize: '12px', color: '#666', display: 'block', fontWeight: 'normal' }}>
                  Get free paper trading API keys from alpaca.markets
                </span>
              </label>
              <input
                type="password"
                className="input settings-input"
                placeholder="Enter Alpaca Key ID..."
                value={alpacaKeys.key_id || ''}
                onChange={(e) => setAlpacaKeys(prev => ({ ...prev, key_id: e.target.value }))}
                onBlur={(e) => saveApiKey('alpaca_key_id', e.target.value)}
                style={{ width: '400px' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label settings-label">
                Alpaca Secret Key
                <span style={{ fontSize: '12px', color: '#666', display: 'block', fontWeight: 'normal' }}>
                  Secret key for your Alpaca paper trading account
                </span>
              </label>
              <input
                type="password"
                className="input settings-input"
                placeholder="Enter Alpaca Secret Key..."
                value={alpacaKeys.secret_key || ''}
                onChange={(e) => setAlpacaKeys(prev => ({ ...prev, secret_key: e.target.value }))}
                onBlur={(e) => saveApiKey('alpaca_secret_key', e.target.value)}
                style={{ width: '400px' }}
              />
            </div>
          </>
        )}
      </div>

      <div className="settings-section">
        <h2 className="section-title">🤖 AI Assistant</h2>
        <div className="form-group">
          <label className="form-label settings-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={aiSettings.enabled}
              onChange={(e) => setAiSettings(prev => ({ ...prev, enabled: e.target.checked }))}
            />
            Enable AI Assistant
          </label>
          <span style={{ fontSize: '12px', color: '#666', display: 'block', marginLeft: '24px' }}>
            Activate AI-powered CAN SLIM analysis, forecasting, and trading recommendations
          </span>
        </div>

        {aiSettings.enabled && (
          <div className="form-group">
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--color-background-secondary)',
              borderRadius: '8px',
              marginTop: '16px',
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>AI Assistant Features:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                <li>📊 <strong>CAN SLIM Analysis:</strong> Deep analysis of scan results with C-A-N-S-L-I-M breakdown</li>
                <li>🔮 <strong>Market Forecasting:</strong> AI-powered predictions based on technical and fundamental analysis</li>
                <li>💡 <strong>Trading Recommendations:</strong> Specific buy/sell suggestions with reasoning</li>
                <li>🎯 <strong>Portfolio Management:</strong> Position sizing, risk management, and portfolio optimization</li>
                <li>🛡️ <strong>User Controlled:</strong> All trades require your explicit confirmation - AI never executes automatically</li>
                <li>💬 <strong>Persistent Conversations:</strong> Chat history saved across sessions for continuity</li>
              </ul>
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: 'var(--color-primary-light)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--color-primary-dark)'
              }}>
                <strong>Safety First:</strong> The AI provides analysis and recommendations but you maintain full control over all trading decisions.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2 className="section-title">Scan Thresholds</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label settings-label">C - Current Earnings YoY (%)</label>
            <input
              type="number"
              className="input settings-input threshold-input"
              value={localSettings.scanConfig.thresholds.C_yoy * 100}
              onChange={(e) => setLocalSettings(prev => prev ? {
                ...prev,
                scanConfig: {
                  ...prev.scanConfig,
                  thresholds: {
                    ...prev.scanConfig.thresholds,
                    C_yoy: Number(e.target.value) / 100
                  }
                }
              } : null)}
              onBlur={(e) => updateThreshold('C_yoy', Number(e.target.value) / 100)}
            />
          </div>
          <div className="form-group">
            <label className="form-label settings-label">A - Annual Growth CAGR (%)</label>
            <input
              type="number"
              className="input settings-input threshold-input"
              value={localSettings.scanConfig.thresholds.A_cagr * 100}
              onChange={(e) => setLocalSettings(prev => prev ? {
                ...prev,
                scanConfig: {
                  ...prev.scanConfig,
                  thresholds: {
                    ...prev.scanConfig.thresholds,
                    A_cagr: Number(e.target.value) / 100
                  }
                }
              } : null)}
              onBlur={(e) => updateThreshold('A_cagr', Number(e.target.value) / 100)}
            />
          </div>
          <div className="form-group">
            <label className="form-label settings-label">N - New High (% of 52W)</label>
            <input
              type="number"
              className="input settings-input threshold-input"
              value={localSettings.scanConfig.thresholds.N_pct52w * 100}
              onChange={(e) => setLocalSettings(prev => prev ? {
                ...prev,
                scanConfig: {
                  ...prev.scanConfig,
                  thresholds: {
                    ...prev.scanConfig.thresholds,
                    N_pct52w: Number(e.target.value) / 100
                  }
                }
              } : null)}
              onBlur={(e) => updateThreshold('N_pct52w', Number(e.target.value) / 100)}
            />
          </div>
          <div className="form-group">
            <label className="form-label settings-label">RS - Relative Strength</label>
            <input
              type="number"
              className="input settings-input threshold-input"
              value={localSettings.scanConfig.thresholds.RS_pct}
              onChange={(e) => setLocalSettings(prev => prev ? {
                ...prev,
                scanConfig: {
                  ...prev.scanConfig,
                  thresholds: {
                    ...prev.scanConfig.thresholds,
                    RS_pct: Number(e.target.value)
                  }
                }
              } : null)}
              onBlur={(e) => updateThreshold('RS_pct', Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label settings-label">S - Volume Spike (x)</label>
            <input
              type="number"
              step="0.1"
              className="input settings-input threshold-input"
              value={localSettings.scanConfig.thresholds.S_volSpike}
              onChange={(e) => setLocalSettings(prev => prev ? {
                ...prev,
                scanConfig: {
                  ...prev.scanConfig,
                  thresholds: {
                    ...prev.scanConfig.thresholds,
                    S_volSpike: Number(e.target.value)
                  }
                }
              } : null)}
              onBlur={(e) => updateThreshold('S_volSpike', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">🔍 IBD-Style Filters (Optional)</h2>
        <div className="form-group">
          <label className="form-label settings-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={localSettings.scanConfig.ibdFilters?.enabled || false}
              onChange={(e) => updateIbdFilters({ enabled: e.target.checked })}
            />
            Enable IBD-Style Filtering
          </label>
          <span style={{ fontSize: '12px', color: '#666', display: 'block', marginLeft: '24px' }}>
            Apply additional filters based on IBD methodology for enhanced accuracy
          </span>
        </div>

        {(localSettings.scanConfig.ibdFilters?.enabled || false) && (
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label settings-label">
                Min IBD RS Rating
                <span style={{ fontSize: '11px', color: '#666', display: 'block', fontWeight: 'normal' }}>
                  1-99 scale, IBD recommends 80+
                </span>
              </label>
              <input
                type="number"
                min="1"
                max="99"
                className="input settings-input threshold-input"
                value={localSettings.scanConfig.ibdFilters?.minRsRating || 80}
                onChange={(e) => updateIbdFilters({ minRsRating: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label settings-label">
                Min Up/Down Ratio
                <span style={{ fontSize: '11px', color: '#666', display: 'block', fontWeight: 'normal' }}>
                  1.0+ shows net accumulation
                </span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="input settings-input threshold-input"
                value={localSettings.scanConfig.ibdFilters?.minUpDownRatio || 1.0}
                onChange={(e) => updateIbdFilters({ minUpDownRatio: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label settings-label">
                Min A/D Rating
                <span style={{ fontSize: '11px', color: '#666', display: 'block', fontWeight: 'normal' }}>
                  A-E scale, avoid D/E ratings
                </span>
              </label>
              <select
                className="select settings-select"
                style={{ width: '100px' }}
                value={localSettings.scanConfig.ibdFilters?.minAdRating || 'C'}
                onChange={(e) => updateIbdFilters({ minAdRating: e.target.value })}
              >
                <option value="A">A (Best)</option>
                <option value="B">B (Good)</option>
                <option value="C">C (Fair)</option>
                <option value="D">D (Poor)</option>
                <option value="E">E (Worst)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label settings-label">
                Min Composite Score
                <span style={{ fontSize: '11px', color: '#666', display: 'block', fontWeight: 'normal' }}>
                  1-99 scale, 70+ is solid, 90+ exceptional
                </span>
              </label>
              <input
                type="number"
                min="1"
                max="99"
                className="input settings-input threshold-input"
                value={localSettings.scanConfig.ibdFilters?.minComposite || 70}
                onChange={(e) => updateIbdFilters({ minComposite: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: '6px',
          border: '1px solid var(--color-border)',
          fontSize: '12px',
          color: 'var(--color-text-secondary)'
        }}>
          <strong>Note:</strong> IBD-style metrics are approximations calculated from available market data.
          They enhance the core CAN SLIM methodology without replacing it. Disable if you prefer pure CAN SLIM filtering.
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">Liquidity Filters</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label settings-label">Min Price ($)</label>
            <input
              type="number"
              className="input settings-input threshold-input"
              value={localSettings.scanConfig.liquidity.minPrice}
              onChange={(e) => setLocalSettings(prev => prev ? {
                ...prev,
                scanConfig: {
                  ...prev.scanConfig,
                  liquidity: {
                    ...prev.scanConfig.liquidity,
                    minPrice: Number(e.target.value)
                  }
                }
              } : null)}
              onBlur={(e) => updateLiquidity('minPrice', Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label settings-label">Min Dollar Volume 50d</label>
            <input
              type="number"
              className="input settings-input"
              value={localSettings.scanConfig.liquidity.minDollarVol50d}
              onChange={(e) => setLocalSettings(prev => prev ? {
                ...prev,
                scanConfig: {
                  ...prev.scanConfig,
                  liquidity: {
                    ...prev.scanConfig.liquidity,
                    minDollarVol50d: Number(e.target.value)
                  }
                }
              } : null)}
              onBlur={(e) => updateLiquidity('minDollarVol50d', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: 'var(--color-success-light)',
        border: '1px solid var(--color-success)',
        borderRadius: '8px',
        marginTop: '24px',
        textAlign: 'center',
        color: 'var(--color-success-dark)',
        fontSize: '14px'
      }}>
        ✅ All changes are automatically saved
      </div>
    </div>
  );
}
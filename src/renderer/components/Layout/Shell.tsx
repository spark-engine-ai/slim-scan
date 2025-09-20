import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ScanPage } from '../Scan/ScanPage';
import { BacktestPage } from '../Backtest/BacktestPage';
import { TradingPage } from '../Trading/TradingPage';
import { AIChatPage } from '../AI/AIChatPage';
import { SettingsPage } from '../Settings/SettingsPage';
import { TickerDrawer } from '../Detail/TickerDrawer';
import { useSettings } from '../../store/useSettings';
import { useScan } from '../../store/useScan';

export type Page = 'scan' | 'backtest' | 'trading' | 'ai' | 'settings';

export function Shell() {
  const [currentPage, setCurrentPage] = useState<Page>('scan');
  const { loadSettings, settings } = useSettings();
  const { selectedSymbol, runScan } = useScan();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Auto-run scan on startup once settings are loaded
  useEffect(() => {
    if (settings) {
      // Run daily scan on startup
      runScan('daily').catch(error => {
        console.warn('Auto-scan failed on startup:', error);
      });
    }
  }, [settings, runScan]);

  const renderPage = () => {
    switch (currentPage) {
      case 'scan':
        return <ScanPage />;
      case 'backtest':
        return <BacktestPage />;
      case 'trading':
        return <TradingPage />;
      case 'ai':
        return <AIChatPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <ScanPage />;
    }
  };

  return (
    <div className="app-shell">
      <style>{`
        .app-shell {
          display: flex;
          height: 100vh;
          background-color: var(--color-background);
        }
        
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .page-container {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        
        .page-content {
          flex: 1;
          overflow: auto;
        }
      `}</style>
      
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      
      <div className="main-content">
        <Topbar />
        <div className="page-container">
          <div className="page-content">
            {renderPage()}
          </div>
          {selectedSymbol && <TickerDrawer />}
        </div>
      </div>
    </div>
  );
}
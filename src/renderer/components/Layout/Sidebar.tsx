import React from 'react';
import type { Page } from './Shell';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

const menuItems = [
  { id: 'scan' as Page, label: 'Scan', icon: '🔍' },
  { id: 'backtest' as Page, label: 'Backtest', icon: '📈' },
  { id: 'trading' as Page, label: 'Trading', icon: '💰' },
  { id: 'ai' as Page, label: 'AI Assistant', icon: '🤖' },
  { id: 'settings' as Page, label: 'Settings', icon: '⚙️' },
];

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <div className="sidebar">
      <style>{`
        .sidebar {
          width: 200px;
          background-color: var(--color-surface);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          padding: var(--spacing-md);
          box-shadow: var(--shadow-sm);
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-xl);
          padding: var(--spacing-sm);
        }
        
        .logo-icon {
          width: 32px;
          height: 32px;
          background: var(--color-primary);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: var(--font-weight-bold);
        }
        
        .logo-text {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: var(--color-text);
        }
        
        .menu {
          list-style: none;
        }
        
        .menu-item {
          margin-bottom: var(--spacing-xs);
        }
        
        .menu-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: var(--font-weight-medium);
          text-align: left;
        }
        
        .menu-button:hover {
          background-color: var(--color-background-secondary);
          color: var(--color-text);
        }
        
        .menu-button.active {
          background-color: var(--color-primary);
          color: white;
        }
        
        .menu-icon {
          font-size: var(--font-size-lg);
        }
      `}</style>
      
      <div className="logo">
        <div className="logo-icon">S</div>
        <div className="logo-text">SlimScan</div>
      </div>
      
      <nav>
        <ul className="menu">
          {menuItems.map((item) => (
            <li key={item.id} className="menu-item">
              <button
                className={`menu-button ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => onPageChange(item.id)}
              >
                <span className="menu-icon">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
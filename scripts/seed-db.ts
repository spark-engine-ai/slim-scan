import Database from 'better-sqlite3';
import { join } from 'path';

// Mock data for testing
const mockSymbols = [
  { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology', industry: 'Consumer Electronics', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corp', sector: 'Technology', industry: 'Software', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Technology', industry: 'Internet Services', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Consumer Discretionary', industry: 'Electric Vehicles', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ' },
];

const mockPrices = [
  { symbol: 'AAPL', date: '2024-01-15', open: 185.50, high: 188.20, low: 184.30, close: 187.45, volume: 45678900 },
  { symbol: 'AAPL', date: '2024-01-16', open: 187.20, high: 189.80, low: 186.10, close: 188.63, volume: 52341200 },
  { symbol: 'MSFT', date: '2024-01-15', open: 385.20, high: 388.45, low: 383.50, close: 386.95, volume: 23456700 },
  { symbol: 'MSFT', date: '2024-01-16', open: 387.10, high: 390.25, low: 385.80, close: 389.12, volume: 28934500 },
];

const mockEPS = [
  { symbol: 'AAPL', qend: '2023-12-31', eps: 2.18 },
  { symbol: 'AAPL', qend: '2023-09-30', eps: 1.46 },
  { symbol: 'AAPL', qend: '2023-06-30', eps: 1.26 },
  { symbol: 'AAPL', qend: '2023-03-31', eps: 1.52 },
  { symbol: 'MSFT', qend: '2023-12-31', eps: 2.93 },
  { symbol: 'MSFT', qend: '2023-09-30', eps: 2.99 },
  { symbol: 'MSFT', qend: '2023-06-30', eps: 2.69 },
  { symbol: 'MSFT', qend: '2023-03-31', eps: 2.45 },
];

export function seedDatabase(dbPath: string): void {
  console.log('Seeding database with test data...');
  
  const db = new Database(dbPath);
  
  try {
    // Insert symbols
    const symbolStmt = db.prepare(`
      INSERT OR REPLACE INTO symbols (symbol, name, sector, industry, exchange)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const symbol of mockSymbols) {
      symbolStmt.run(symbol.symbol, symbol.name, symbol.sector, symbol.industry, symbol.exchange);
    }
    
    // Insert prices
    const priceStmt = db.prepare(`
      INSERT OR REPLACE INTO prices (symbol, date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const price of mockPrices) {
      priceStmt.run(price.symbol, price.date, price.open, price.high, price.low, price.close, price.volume);
    }
    
    // Insert EPS data
    const epsStmt = db.prepare(`
      INSERT OR REPLACE INTO eps_quarterly (symbol, qend, eps)
      VALUES (?, ?, ?)
    `);
    
    for (const eps of mockEPS) {
      epsStmt.run(eps.symbol, eps.qend, eps.eps);
    }
    
    console.log('Database seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  const dbPath = process.argv[2] || join(__dirname, '../test.db');
  seedDatabase(dbPath);
}
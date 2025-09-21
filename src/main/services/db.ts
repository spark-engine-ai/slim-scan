import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { Bar, SymbolRow, EpsRow, OwnershipRow, ScanResult } from '../types';

let db: Database.Database;

export function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const dbPath = join(app.getPath('userData'), 'slimscan.db');
      db = new Database(dbPath);
      
      // Enable WAL mode for better performance
      db.pragma('journal_mode = WAL');
      
      createTables();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function createTables(): void {
  // Symbols table
  db.exec(`
    CREATE TABLE IF NOT EXISTS symbols (
      symbol TEXT PRIMARY KEY,
      name TEXT,
      sector TEXT,
      industry TEXT,
      exchange TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Prices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS prices (
      symbol TEXT,
      date TEXT,
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume INTEGER,
      PRIMARY KEY (symbol, date),
      FOREIGN KEY (symbol) REFERENCES symbols (symbol)
    )
  `);

  // EPS quarterly data
  db.exec(`
    CREATE TABLE IF NOT EXISTS eps_quarterly (
      symbol TEXT,
      qend TEXT,
      eps REAL,
      PRIMARY KEY (symbol, qend),
      FOREIGN KEY (symbol) REFERENCES symbols (symbol)
    )
  `);

  // Institutional ownership
  db.exec(`
    CREATE TABLE IF NOT EXISTS ownership (
      symbol TEXT,
      date TEXT,
      inst_pct REAL,
      filers_added INTEGER,
      PRIMARY KEY (symbol, date),
      FOREIGN KEY (symbol) REFERENCES symbols (symbol)
    )
  `);

  // Scan runs
  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_at TEXT DEFAULT CURRENT_TIMESTAMP,
      universe TEXT,
      provider TEXT,
      config TEXT
    )
  `);

  // Scan results - Create base table first
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_results (
      scan_id INTEGER,
      symbol TEXT,
      score REAL,
      rs_pct REAL,
      pct_52w REAL,
      vol_spike REAL,
      c_qoq REAL,
      a_cagr REAL,
      i_delta REAL,
      flags TEXT,
      PRIMARY KEY (scan_id, symbol),
      FOREIGN KEY (scan_id) REFERENCES scans (id),
      FOREIGN KEY (symbol) REFERENCES symbols (symbol)
    )
  `);

  // Migrate scan_results table to new schema
  migrateScanResultsTable();

  // Backtests
  db.exec(`
    CREATE TABLE IF NOT EXISTS backtests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      config TEXT,
      summary TEXT
    )
  `);

  // Create indices for performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_prices_symbol_date ON prices (symbol, date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_scan_results_score ON scan_results (scan_id, score DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_eps_symbol_qend ON eps_quarterly (symbol, qend)`);
}

function migrateScanResultsTable(): void {
  try {
    // Check if the new columns exist
    const tableInfo = db.pragma(`table_info(scan_results)`) as any[];
    const columnNames = tableInfo.map((col: any) => col.name);

    const requiredColumns = ['name', 'price', 'sector', 'industry', 'ibd_rs_rating', 'ibd_up_down_ratio', 'ibd_ad_rating', 'ibd_composite'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));

    if (missingColumns.length > 0) {
      console.log(`Migrating scan_results table, adding columns: ${missingColumns.join(', ')}`);

      // Add missing columns one by one
      for (const column of missingColumns) {
        let columnDef = '';
        switch (column) {
          case 'name':
          case 'sector':
          case 'industry':
          case 'ibd_ad_rating':
            columnDef = `${column} TEXT`;
            break;
          case 'price':
          case 'ibd_up_down_ratio':
            columnDef = `${column} REAL`;
            break;
          case 'ibd_rs_rating':
          case 'ibd_composite':
            columnDef = `${column} INTEGER`;
            break;
        }

        try {
          db.exec(`ALTER TABLE scan_results ADD COLUMN ${columnDef}`);
          console.log(`Added column ${column} to scan_results`);
        } catch (error) {
          console.warn(`Failed to add column ${column}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to migrate scan_results table:', error);
  }
}

// Symbol operations
export function upsertSymbols(symbols: SymbolRow[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO symbols (symbol, name, sector, industry, exchange, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const transaction = db.transaction((symbols: SymbolRow[]) => {
    for (const symbol of symbols) {
      stmt.run(symbol.symbol, symbol.name, symbol.sector, symbol.industry, symbol.exchange);
    }
  });

  transaction(symbols);
}

export function getSymbols(): SymbolRow[] {
  const stmt = db.prepare('SELECT * FROM symbols ORDER BY symbol');
  return stmt.all() as SymbolRow[];
}

export function getSymbol(symbol: string): SymbolRow | null {
  const stmt = db.prepare('SELECT * FROM symbols WHERE symbol = ?');
  return stmt.get(symbol) as SymbolRow | null;
}

export function upsertSymbol(symbol: SymbolRow): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO symbols (symbol, name, sector, industry, exchange, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  stmt.run(symbol.symbol, symbol.name, symbol.sector, symbol.industry, symbol.exchange);
}

export function deleteUniverseSymbols(): void {
  db.prepare('DELETE FROM symbols').run();
}

export function getUniverseSymbols(): string[] {
  const symbols = getSymbols();
  return symbols.map(s => s.symbol);
}

// Price operations
export function upsertPrices(symbol: string, bars: Bar[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO prices (symbol, date, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((bars: Bar[]) => {
    for (const bar of bars) {
      stmt.run(symbol, bar.date, bar.open, bar.high, bar.low, bar.close, bar.volume);
    }
  });

  transaction(bars);
}

export function getPrices(symbol: string, from?: Date, to?: Date): Bar[] {
  let query = 'SELECT * FROM prices WHERE symbol = ?';
  const params: any[] = [symbol];

  if (from) {
    query += ' AND date >= ?';
    params.push(from.toISOString().split('T')[0]);
  }

  if (to) {
    query += ' AND date <= ?';
    params.push(to.toISOString().split('T')[0]);
  }

  query += ' ORDER BY date';

  const stmt = db.prepare(query);
  return stmt.all(...params) as Bar[];
}

// EPS operations
export function upsertEPS(symbol: string, epsData: EpsRow[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO eps_quarterly (symbol, qend, eps)
    VALUES (?, ?, ?)
  `);

  const transaction = db.transaction((epsData: EpsRow[]) => {
    for (const eps of epsData) {
      stmt.run(symbol, eps.qend, eps.eps);
    }
  });

  transaction(epsData);
}

export function getEPS(symbol: string): EpsRow[] {
  const stmt = db.prepare('SELECT * FROM eps_quarterly WHERE symbol = ? ORDER BY qend DESC');
  return stmt.all(symbol) as EpsRow[];
}

// Ownership operations
export function upsertOwnership(symbol: string, ownershipData: OwnershipRow[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO ownership (symbol, date, inst_pct, filers_added)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = db.transaction((ownershipData: OwnershipRow[]) => {
    for (const ownership of ownershipData) {
      stmt.run(symbol, ownership.date, ownership.inst_pct, ownership.filers_added);
    }
  });

  transaction(ownershipData);
}

export function getOwnership(symbol: string): OwnershipRow[] {
  const stmt = db.prepare('SELECT * FROM ownership WHERE symbol = ? ORDER BY date DESC');
  return stmt.all(symbol) as OwnershipRow[];
}

// Scan operations
export function createScan(universe: string, provider: string, config: object): number {
  const stmt = db.prepare(`
    INSERT INTO scans (universe, provider, config)
    VALUES (?, ?, ?)
  `);
  
  const result = stmt.run(universe, provider, JSON.stringify(config));
  return result.lastInsertRowid as number;
}

export function saveScanResults(scanId: number, results: ScanResult[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO scan_results
    (scan_id, symbol, name, price, score, rs_pct, pct_52w, vol_spike, c_qoq, a_cagr, i_delta, flags, sector, industry, ibd_rs_rating, ibd_up_down_ratio, ibd_ad_rating, ibd_composite)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((results: ScanResult[]) => {
    for (const result of results) {
      stmt.run(
        scanId, result.symbol, result.name, result.price, result.score, result.rs_pct, result.pct_52w,
        result.vol_spike, result.c_qoq, result.a_cagr, result.i_delta, result.flags, result.sector, result.industry,
        result.ibd_rs_rating || null, result.ibd_up_down_ratio || null, result.ibd_ad_rating || null, result.ibd_composite || null
      );
    }
  });

  transaction(results);
}

export function getScanResults(scanId: number): any[] {
  const stmt = db.prepare(`
    SELECT * FROM scan_results
    WHERE scan_id = ?
    ORDER BY score DESC
  `);

  const results = stmt.all(scanId);
  console.log(`Database query for scanId ${scanId} returned ${results.length} results`);
  if (results.length > 0) {
    console.log(`Sample result from database:`, results[0]);
  }
  return results;
}

export function getRecentScans(limit = 10): any[] {
  const stmt = db.prepare(`
    SELECT id, run_at, universe, provider, 
           (SELECT COUNT(*) FROM scan_results WHERE scan_id = scans.id) as result_count
    FROM scans 
    ORDER BY run_at DESC 
    LIMIT ?
  `);
  
  return stmt.all(limit);
}

// Backtest operations
export function saveBacktest(config: object, summary: object): number {
  const stmt = db.prepare(`
    INSERT INTO backtests (config, summary)
    VALUES (?, ?)
  `);
  
  const result = stmt.run(JSON.stringify(config), JSON.stringify(summary));
  return result.lastInsertRowid as number;
}

export function getBacktests(limit = 10): any[] {
  const stmt = db.prepare(`
    SELECT * FROM backtests 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  
  return stmt.all(limit);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
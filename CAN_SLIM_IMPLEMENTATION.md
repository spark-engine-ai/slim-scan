# CAN SLIM Implementation Details

This document outlines the complete implementation of William O'Neil's CAN SLIM methodology in the SlimScan application.

## ✅ Complete CAN SLIM Implementation

### **C - Current Quarterly Earnings**
- **Location**: `src/main/services/metrics.ts:calculateCurrentEarnings()`
- **Implementation**: Proper fiscal quarter matching within ±45 days (fixed from naive index-based lookup)
- **Threshold**: 25%+ quarter-over-quarter growth
- **Data Source**: Quarterly EPS from Polygon/IEX APIs

### **A - Annual Earnings Growth**
- **Location**: `src/main/services/metrics.ts:calculateAnnualEarnings()`
- **Implementation**: 3-year CAGR calculation using trailing 4 quarters
- **Threshold**: 25%+ annual growth rate
- **Data Source**: Quarterly EPS aggregated to annual figures

### **N - New Product, New High, New Leadership**
- **Location**: `src/main/services/metrics.ts:calculateNewHighPercentage()`
- **Implementation**: Percentage of 52-week high + Relative Strength ranking
- **Threshold**: 85%+ of 52-week high + top 20% RS percentile
- **Breakout Confirmation**: `isBreakoutConfirmed()` checks price above 50-day MA with volume spike

### **S - Supply & Demand (Volume)**
- **Location**: `src/main/services/metrics.ts:calculateVolumeSpike()`
- **Implementation**: Current volume vs 50-day average
- **Threshold**: 1.5x+ volume spike on breakout day
- **Additional**: Price must close in upper 50% of daily range

### **L - Leader or Laggard**
- **Location**: `src/main/services/metrics.ts:calculateRelativeStrength()`
- **Implementation**: 12-month return percentile ranking within universe
- **Threshold**: Top 20% (80th percentile) relative strength
- **Data**: Calculated against entire universe for accurate ranking

### **I - Institutional Sponsorship**
- **Location**: `src/main/services/metrics.ts:calculateInstitutionalChange()`
- **Implementation**: Change in institutional ownership percentage
- **Data Sources**:
  - **FMP**: Institutional ownership and company profile data
  - **Polygon**: 13F filings with market cap fallback
- **Threshold**: Increasing institutional ownership

### **M - Market Direction**
- **Location**: `src/main/services/market-gate.ts`
- **Implementation**: SPY above 50-day and 200-day moving averages
- **Gate**: Prevents buy signals during market downtrends
- **Configurable**: Can adjust MA periods and index symbol

## 🚀 Enhanced Features

### **Universe Management**
- **Location**: `src/main/services/universe-manager.ts`
- **Sources**:
  - NASDAQ official symbol lists (nasdaqlisted.txt, otherlisted.txt)
  - S&P 500, S&P 1500, Russell 2000
  - Wikipedia S&P 500 as fallback
- **Filtering**: Removes preferred shares, complex symbols, OTC stocks
- **Database**: SQLite caching for fast access

### **Breakout Detection**
- **Location**: `src/main/services/metrics.ts:isBreakoutConfirmed()`
- **Criteria**:
  - Price closes above 50-day moving average
  - Volume 1.5x+ above 50-day average
  - Price closes in upper half of daily range
- **Usage**: Additional filter in scan results

### **Historical Backtesting**
- **Location**: `src/main/services/backtest.ts` (completely rewritten)
- **Features**:
  - Uses actual CAN SLIM scoring (not momentum proxy)
  - Point-in-time data filtering (no lookahead bias)
  - Proper stop-loss and profit-taking rules
  - Market gate integration
  - Performance metrics: Sharpe ratio, max drawdown, hit rate

### **Paper Trading Integration**
- **Location**: `src/main/services/paper-trading.ts`
- **Provider**: Alpaca Markets paper trading
- **Features**:
  - CAN SLIM position sizing with stop losses
  - Automated profit-taking at 20% gains
  - Portfolio monitoring and risk management
  - Order management (market, limit, stop orders)

## 🔧 Technical Architecture

### **Database Schema** (SQLite)
```sql
-- Symbol universe with exchange and sector data
CREATE TABLE symbols (symbol, name, sector, industry, exchange, updated_at)

-- Historical price data with OHLCV
CREATE TABLE prices (symbol, date, open, high, low, close, volume)

-- Quarterly earnings per share
CREATE TABLE eps_quarterly (symbol, qend, eps)

-- Institutional ownership tracking
CREATE TABLE ownership (symbol, date, inst_pct, filers_added)

-- Scan results with scoring breakdown
CREATE TABLE scan_results (scan_id, symbol, score, rs_pct, pct_52w, vol_spike, c_qoq, a_cagr, i_delta, flags)
```

### **Data Providers**
1. **Polygon.io** (Professional)
   - OHLCV data, quarterly earnings, institutional ownership
   - Rate-limited API calls with retries
2. **Financial Modeling Prep** (Alternative)
   - Historical price data, quarterly earnings, institutional ownership
   - Company profiles and stock screening
3. **Yahoo Finance** (Free/PoC)
   - Limited functionality for testing

### **Scoring Algorithm**
```
Weighted Score = (C×2.0) + (A×2.0) + (N×1.5) + (S×1.5) + (L×1.5) + (I×1.0)
Normalized Score = (WeightedScore / MaxPossible) × 100

Filters:
- Minimum $200k daily dollar volume
- Minimum $5 stock price
- Market direction must be up (SPY > MA50 > MA200)
- Breakout confirmation required
```

## 📊 Usage Examples

### **Run Daily Scan**
```typescript
const scanId = await scanEngine.run({ mode: 'daily' });
const results = await scanEngine.getResults(scanId);
// Returns top-scoring CAN SLIM candidates
```

### **Execute Backtest**
```typescript
const backtest = await runBacktest({
  dateFrom: '2020-01-01',
  dateTo: '2023-12-31',
  scoreCutoff: 60,
  riskPercent: 2,
  stopPercent: 8,
  maxPositions: 10,
  useMarketGate: true
});
```

### **Paper Trade Signal**
```typescript
await paperTradingService.buyCanSlimSignal(
  'AAPL',
  10000, // $10k position
  150.00, // current price
  0.08    // 8% stop loss
);
```

## 🔑 Required API Keys

### **Essential for Production**
- `POLYGON_API_KEY`: Premium market data and fundamentals
- `FMP_API_KEY`: Financial Modeling Prep for comprehensive financial data

### **Optional for Paper Trading**
- `ALPACA_KEY_ID`: Paper trading account ID
- `ALPACA_SECRET_KEY`: Paper trading secret key
- `ALPACA_BASE_URL`: https://paper-api.alpaca.markets

### **Free Tier Option**
Set `PROVIDER=poc` in `.env` to use Yahoo Finance (limited CAN SLIM functionality)

## 🎯 Performance Optimizations

1. **Parallel Data Fetching**: Multi-threaded API calls
2. **SQLite Caching**: Local data storage with WAL mode
3. **Rate Limiting**: Respects API rate limits with exponential backoff
4. **Incremental Updates**: Only fetches new data when needed
5. **Universe Filtering**: Pre-filters illiquid/invalid stocks
6. **Memory Efficient**: Streams large datasets, doesn't load all in memory

## 📈 Validation & Testing

- **Unit Tests**: Core calculation functions tested
- **End-to-End Tests**: Complete scan pipeline validation
- **Backtest Validation**: Historical performance verification
- **Data Quality**: EPS date matching, RS percentile accuracy
- **API Integration**: Provider connection testing

This implementation follows William O'Neil's original CAN SLIM criteria as closely as possible while leveraging modern financial APIs and computing techniques for automation and scale.
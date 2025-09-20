# SlimScan - Getting Started Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```
This will start both the Vite development server and Electron app.

### 3. Build for Production
```bash
npm run build
```

### 4. Create Unpacked Distribution
```bash
npm run pack:unpacked
```
The executable will be in `release/win-unpacked/SlimScan.exe`

## 📋 Configuration

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure your preferred data provider:

```env
# Use free POC provider (default)
PROVIDER=poc

# Or configure professional providers:
PROVIDER=polygon
POLYGON_API_KEY=your_polygon_key_here

PROVIDER=iex  
IEX_API_KEY=your_iex_key_here
```

### API Key Setup (Optional)
For enhanced functionality, you can configure API keys:

**Polygon.io** (Professional Market Data)
- Sign up at https://polygon.io/
- Get your API key
- Set `POLYGON_API_KEY` in `.env`

**IEX Cloud** (Market Data & Fundamentals)  
- Sign up at https://iexcloud.io/
- Get your API key
- Set `IEX_API_KEY` in `.env`

**Alpaca** (Paper Trading)
- Sign up at https://alpaca.markets/
- Create paper trading API keys
- Set `ALPACA_KEY_ID` and `ALPACA_SECRET_KEY` in `.env`

## 🎯 Using SlimScan

### 1. First Time Setup
- Launch the app: `npm run dev`
- Go to **Settings** to configure thresholds
- Click **Refresh Universe** to load stock symbols

### 2. Running Scans
- Click **Run Scan** in the main view
- Choose between **Daily Scan** or **Intraday Check**
- View results in the table
- Click any stock to see detailed charts

### 3. Backtesting
- Go to **Backtest** tab
- Configure parameters (date range, risk %, stop loss)
- Click **Run Backtest** to see historical performance

### 4. Paper Trading
- Go to **Trading** tab
- Connect your Alpaca paper account
- Click **Buy** on any scan result to paper trade

## 🔧 Customization

### CAN SLIM Parameters
In **Settings**, you can adjust:

- **C**: Current earnings growth threshold (default: 25%)
- **A**: Annual earnings growth threshold (default: 25%) 
- **N**: New high percentage (default: 85% of 52-week high)
- **S**: Volume spike threshold (default: 1.5x average)
- **L**: Relative strength percentile (default: 80)
- **I**: Institutional ownership changes

### Market Gate
- Enable/disable market condition filtering
- Uses SPY vs 50/200-day moving averages
- Blocks scans during market downturns

## 📊 Understanding Results

### Scan Results Table
- **Score**: Overall CAN SLIM score (0-100)
- **RS %**: Relative strength percentile vs universe
- **% 52W**: Current price as % of 52-week high  
- **EPS QoQ**: Current quarter vs same quarter last year
- **EPS 3Y**: 3-year earnings growth rate
- **Vol Spike**: Volume vs 50-day average
- **Factors**: C/A/N/S/L/I pass/fail indicators

### Charts
- Price with 50/200-day moving averages
- 52-week high reference line
- Volume analysis

## 🏗️ Development

### Project Structure
```
slimscan/
├── src/
│   ├── main/          # Electron main process
│   │   ├── providers/ # Data providers (POC, Polygon, IEX)
│   │   └── services/  # Core services (DB, scanning, etc.)
│   └── renderer/      # React frontend
│       ├── components/
│       ├── store/     # Zustand state management  
│       └── utils/
├── scripts/           # Build and utility scripts
└── assets/           # Icons and resources
```

### Available Scripts
- `npm run dev` - Development mode
- `npm run build` - Production build
- `npm run test` - Run tests
- `npm run lint` - Check code quality
- `npm run pack:unpacked` - Create distributable

### Data Storage
- SQLite database in user data directory
- Cached OHLCV, EPS, and ownership data
- Settings stored securely via electron-store

## ❓ Troubleshooting

### Common Issues

**Build Errors**
- Ensure Node.js 18+ is installed
- Run `npm install` to update dependencies
- Clear `node_modules` and reinstall if needed

**Data Issues**
- Check your internet connection
- Verify API keys if using paid providers  
- POC provider has rate limits - try again later

**App Won't Start**
- Check if another instance is running
- Clear app data directory if corrupted
- Run `npm run dev` for detailed error logs

### Getting Help
- Check the logs in the app's **Settings** > **Diagnostics**
- File issues at: https://github.com/slimscan/slimscan/issues
- Join community discussions

## 📈 CAN SLIM Methodology

SlimScan implements William O'Neil's CAN SLIM investment methodology:

- **C** - Current quarterly earnings growth
- **A** - Annual earnings growth over 3+ years  
- **N** - New products, services, or price highs
- **S** - Supply and demand (volume analysis)
- **L** - Leader or laggard (relative strength)
- **I** - Institutional sponsorship
- **M** - Market direction (market gate)

The system scores each factor and provides an overall ranking to identify the strongest growth stocks.

---

**Happy Scanning!** 📊📈
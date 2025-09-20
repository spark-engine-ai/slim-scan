# Build Instructions

## Prerequisites
- Node.js 20.14+ installed
- Windows 10/11 for Windows builds
- macOS for macOS builds

## Quick Start

### Install Dependencies
```bash
npm install
```

### Development Mode
```bash
npm run dev
```

## Building Executables

### Windows Executable (.exe installer)
```bash
npm run dist:win
```
This creates:
- `release/SlimScan Setup 1.0.0.exe` - Windows installer

### macOS Application (.dmg)
```bash
npm run dist:mac
```
This creates:
- `release/SlimScan-1.0.0.dmg` - macOS installer (Intel & Apple Silicon)

### Linux AppImage
```bash
npm run dist:linux
```
This creates:
- `release/SlimScan-1.0.0.AppImage` - Linux portable application

### All Platforms
```bash
npm run dist
```

## Portable Versions (No Installation Required)

### Windows Portable
```bash
npm run pack:win
```
Creates: `release/win-unpacked/` folder with SlimScan.exe

### macOS Portable
```bash
npm run pack:mac
```
Creates: `release/mac/` folder with SlimScan.app

## Troubleshooting

### Native Dependencies Issues
If you get errors about `better-sqlite3` or `keytar`:

1. Close all running instances of the app
2. Clean install dependencies:
```bash
rm -rf node_modules
npm install
```

3. Try building again

### Windows Antivirus
Windows Defender may flag the built executable as suspicious. This is common with Electron apps. You may need to:
1. Add an exception for the build folder
2. Sign the executable (for production)

### macOS Gatekeeper
macOS may block the app from running. Users need to:
1. Right-click the app and select "Open"
2. Click "Open" in the dialog
3. Or disable Gatekeeper: `sudo spctl --master-disable`

## Features Included in Build

✅ **Auto-save Settings** - All settings changes are automatically saved
✅ **AI Assistant with Markdown** - Rich formatted responses with backtest functionality
✅ **Comprehensive Backtesting** - Full portfolio simulation with detailed metrics
✅ **CAN SLIM Stock Scanning** - Advanced filtering and scoring
✅ **Paper Trading Integration** - Alpaca API integration for virtual trading
✅ **Multiple Data Providers** - POC, Polygon, FMP support
✅ **Cross-platform Support** - Windows, macOS, and Linux

## App Configuration

First-time setup:
1. Go to Settings tab
2. Configure your preferred data provider
3. Add API keys for enhanced features:
   - **FMP API Key**: Free tier from financialmodelingprep.com (250 requests/day)
   - **OpenAI API Key**: Required for AI assistant features
   - **Alpaca Keys**: For paper trading (free from alpaca.markets)

All settings auto-save as you type!

## Version Info
- **App Name**: SlimScan
- **Version**: 1.0.0
- **Build System**: Electron Builder
- **Supported Platforms**: Windows x64, macOS (Intel + Apple Silicon), Linux x64
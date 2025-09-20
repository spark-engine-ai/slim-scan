# Financial Modeling Prep Integration

## Overview

IEX Cloud has been replaced with **Financial Modeling Prep (FMP)** as the alternative data provider for the SlimScan CAN SLIM scanner. FMP provides comprehensive financial data including:

- Historical OHLCV data
- Quarterly earnings per share
- Institutional ownership data
- Company profiles and screening
- Stock universe data

## API Key Setup

1. Sign up at [financialmodelingprep.com](https://financialmodelingprep.com/)
2. Get your API key from the dashboard
3. Set `FMP_API_KEY=your_api_key_here` in your `.env` file
4. Set `PROVIDER=fmp` to use FMP as your data provider

## Rate Limits

- **Free Tier**: 250 requests per minute
- **Paid Plans**: Higher rate limits available
- The implementation includes appropriate rate limiting (250ms delays)

## FMP Endpoints Used

### Historical Price Data
```
GET /v3/historical-price-full/{symbol}
- Returns OHLCV bars for any date range
- Data returned newest-first (reversed in code)
```

### Quarterly Earnings
```
GET /v3/income-statement/{symbol}?period=quarter
- Returns quarterly income statements with EPS
- Up to 20 quarters (5 years) of data
```

### Institutional Ownership
```
GET /v3/institutional-holder/{symbol}
- Returns institutional holders with share counts
- Combined with company profile for ownership percentage
```

### Stock Universe
```
GET /v3/stock-screener
- Filters by market cap ($100M+)
- Returns up to 5000 symbols
- Filtered to NYSE/NASDAQ only
```

### Company Profiles
```
GET /v3/profile/{symbol}
- Company information including shares outstanding
- Market capitalization data
- Used for institutional ownership calculations
```

## Advantages over IEX Cloud

✅ **Still Active**: FMP is actively maintained and growing
✅ **Comprehensive**: Complete financial statements and metrics
✅ **Institutional Data**: Actual 13F holder data
✅ **Global Coverage**: Not just US markets
✅ **Fair Pricing**: Reasonable free tier + affordable paid plans

## Data Quality Notes

- **Historical Data**: Goes back 20+ years for most symbols
- **EPS Data**: Quarterly and annual earnings per share
- **Institutional Ownership**: Real 13F filings with holder details
- **Universe Data**: Professional stock screener with fundamental filters
- **Update Frequency**: Daily updates for fundamental data

## Migration Benefits

1. **No Functionality Loss**: All CAN SLIM metrics still fully supported
2. **Better Institutional Data**: More accurate ownership tracking
3. **Enhanced Universe Management**: Better stock screening capabilities
4. **Future Proof**: Active provider with ongoing development
5. **Cost Effective**: Competitive pricing vs premium providers

## Usage in SlimScan

The FMP provider is fully integrated into the SlimScan architecture:

- **CAN SLIM Scanning**: All 7 factors supported with high-quality data
- **Backtesting**: Historical data for accurate performance analysis
- **Universe Management**: Comprehensive stock screening and filtering
- **Paper Trading**: Real-time data for execution decisions

## Configuration

Update your `.env` file:
```bash
PROVIDER=fmp
FMP_API_KEY=your_api_key_here
POLYGON_API_KEY=optional_for_premium_features
ALPACA_KEY_ID=optional_for_paper_trading
ALPACA_SECRET_KEY=optional_for_paper_trading
ALPACA_BASE_URL=https://paper-api.alpaca.markets
UNIVERSE=sp1500
```

The system will automatically use FMP when configured, with Yahoo Finance (POC) as fallback if no API key is provided.
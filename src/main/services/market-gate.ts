import { providerRegistry } from '../providers/provider-registry';
import { isMarketUptrend } from './metrics';
import { logger } from './logger';
import { getSetting } from './settings';

export async function checkMarketGate(): Promise<{ 
  isOpen: boolean; 
  spyTrend: boolean; 
  reason: string 
}> {
  try {
    const marketGateConfig = getSetting('scanConfig').marketGate;
    
    if (!marketGateConfig.use) {
      return {
        isOpen: true,
        spyTrend: true,
        reason: 'Market gate disabled'
      };
    }

    const provider = providerRegistry.getCurrentProvider();
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 300); // Get enough data for 200-day MA
    
    logger.info(`Checking market gate using ${marketGateConfig.spySymbol}`);
    
    const spyBars = await provider.getIndexBars(marketGateConfig.spySymbol, fromDate, toDate);
    
    if (spyBars.length < marketGateConfig.maLong) {
      logger.warn('Insufficient market data for gate check, allowing scan');
      return {
        isOpen: true,
        spyTrend: true,
        reason: 'Insufficient market data'
      };
    }

    const spyTrend = isMarketUptrend(spyBars, marketGateConfig.maShort, marketGateConfig.maLong);
    
    const latestSPY = spyBars[spyBars.length - 1];
    
    if (spyTrend) {
      logger.info(`Market gate OPEN: ${marketGateConfig.spySymbol} is above both MAs`, {
        price: latestSPY.close,
        ma50: marketGateConfig.maShort,
        ma200: marketGateConfig.maLong
      });
      
      return {
        isOpen: true,
        spyTrend: true,
        reason: `${marketGateConfig.spySymbol} above ${marketGateConfig.maShort} and ${marketGateConfig.maLong} day MAs`
      };
    } else {
      logger.info(`Market gate CLOSED: ${marketGateConfig.spySymbol} is not in uptrend`, {
        price: latestSPY.close,
        ma50: marketGateConfig.maShort,
        ma200: marketGateConfig.maLong
      });
      
      return {
        isOpen: false,
        spyTrend: false,
        reason: `${marketGateConfig.spySymbol} not above both MAs - market in distribution`
      };
    }
  } catch (error) {
    logger.error('Market gate check failed, defaulting to OPEN', error);
    return {
      isOpen: true,
      spyTrend: true,
      reason: 'Market gate check failed, defaulting to open'
    };
  }
}
import { ipcMain } from 'electron';
import { z } from 'zod';
import { scanEngine } from './services/scan-engine';
import { getSettings, setSettings } from './services/settings';
import { universeManager } from './services/universe-manager';
import { fetchChartData } from './services/chart-data';
import { runBacktest } from './services/backtest';
import { paperTradingService } from './services/paper-trading';
import { testProvider } from './services/provider-test';
import { getLogs } from './services/logger';
import { storeSecret, getSecret, deleteSecret, listSecrets } from './services/keychain';
import { aiAssistant } from './services/ai-assistant';
// import { aiScheduler, AIAutomationSettings } from './services/ai-scheduler';

const ScanRunSchema = z.object({
  mode: z.enum(['daily', 'intraday']),
});

const ScanResultsSchema = z.object({
  scanId: z.number(),
});

const ScanExportSchema = z.object({
  scanId: z.number(),
  format: z.enum(['csv', 'json']),
});

const ChartFetchSchema = z.object({
  symbol: z.string(),
  days: z.number(),
});

const BacktestConfigSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  scoreCutoff: z.number(),
  riskPercent: z.number(),
  stopPercent: z.number(),
  maxPositions: z.number(),
  useMarketGate: z.boolean(),
});

const TradingBuySchema = z.object({
  symbol: z.string(),
  qty: z.number(),
});

const UniverseRefreshSchema = z.object({
  source: z.enum(['nasdaq', 'sp500', 'sp1500', 'russell2000']).optional(),
});

const PaperOrderSchema = z.object({
  symbol: z.string(),
  qty: z.number(),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit']).optional(),
  limitPrice: z.number().optional(),
});

const ApiKeySchema = z.object({
  provider: z.string(),
  apiKey: z.string(),
});

const ChatMessageSchema = z.object({
  message: z.string(),
});

// const AIAutomationSettingsSchema = z.object({
//   enabled: z.boolean(),
//   autoTrading: z.boolean(),
//   scanInterval: z.number(),
//   tradingRules: z.object({
//     maxPositions: z.number(),
//     maxRiskPerTrade: z.number(),
//     stopLoss: z.number(),
//     profitTarget: z.number(),
//     onlyInBullMarket: z.boolean(),
//     minScore: z.number(),
//   }),
//   schedule: z.object({
//     enabled: z.boolean(),
//     tradingHours: z.object({
//       start: z.string(),
//       end: z.string(),
//     }),
//     daysOfWeek: z.array(z.number()),
//   }),
// });

export function setupIpcHandlers(): void {
  ipcMain.handle('scan:run', async (_event, payload) => {
    const validated = ScanRunSchema.parse(payload);
    return await scanEngine.run(validated);
  });

  ipcMain.handle('scan:results', async (_event, payload) => {
    const validated = ScanResultsSchema.parse(payload);
    return await scanEngine.getResults(validated.scanId);
  });

  ipcMain.handle('scan:export', async (_event, payload) => {
    const validated = ScanExportSchema.parse(payload);
    return await scanEngine.exportResults(validated.scanId, validated.format);
  });

  ipcMain.handle('settings:get', async () => {
    return await getSettings();
  });

  ipcMain.handle('settings:set', async (_event, payload) => {
    return await setSettings(payload);
  });

  ipcMain.handle('universe:refresh', async (_event, payload) => {
    const validated = UniverseRefreshSchema.parse(payload || {});
    return await universeManager.refreshUniverse(validated.source);
  });

  ipcMain.handle('universe:stats', async () => {
    return await universeManager.getUniverseStats();
  });

  ipcMain.handle('chart:fetch', async (_event, payload) => {
    const validated = ChartFetchSchema.parse(payload);
    return await fetchChartData(validated.symbol, validated.days);
  });

  ipcMain.handle('backtest:run', async (_event, payload) => {
    const validated = BacktestConfigSchema.parse(payload);
    return await runBacktest(validated);
  });

  ipcMain.handle('trading:buy', async (_event, payload) => {
    const validated = TradingBuySchema.parse(payload);
    return await paperTradingService.buyCanSlimSignal(validated.symbol, validated.qty * 100, 100); // Simplified
  });

  // Paper trading handlers
  ipcMain.handle('paper:account', async () => {
    return await paperTradingService.getAccount();
  });

  ipcMain.handle('paper:positions', async () => {
    return await paperTradingService.getPositions();
  });

  ipcMain.handle('paper:orders', async (_event, status) => {
    return await paperTradingService.getOrders(status);
  });

  ipcMain.handle('paper:order', async (_event, payload) => {
    const validated = PaperOrderSchema.parse(payload);
    return await paperTradingService.submitOrder({
      symbol: validated.symbol,
      qty: validated.qty,
      side: validated.side,
      type: validated.type || 'market',
      time_in_force: 'day',
      ...(validated.limitPrice && { limit_price: validated.limitPrice })
    });
  });

  ipcMain.handle('paper:portfolio', async () => {
    return await paperTradingService.getPortfolioSummary();
  });

  ipcMain.handle('paper:test', async () => {
    return await paperTradingService.testConnection();
  });

  ipcMain.handle('provider:test', async () => {
    return await testProvider();
  });

  ipcMain.handle('app:logs', async () => {
    return await getLogs();
  });

  // API Key management
  ipcMain.handle('apikey:set', async (_event, payload) => {
    const validated = ApiKeySchema.parse(payload);
    return await storeSecret(`${validated.provider}_api_key`, validated.apiKey);
  });

  ipcMain.handle('apikey:get', async (_event, provider) => {
    return await getSecret(`${provider}_api_key`);
  });

  ipcMain.handle('apikey:delete', async (_event, provider) => {
    return await deleteSecret(`${provider}_api_key`);
  });

  ipcMain.handle('apikey:list', async () => {
    const secrets = await listSecrets();
    return secrets.filter(s => s.endsWith('_api_key')).map(s => s.replace('_api_key', ''));
  });

  // AI Assistant handlers
  ipcMain.handle('ai:chat', async (_event, payload) => {
    const validated = ChatMessageSchema.parse(payload);
    return await aiAssistant.chat(validated.message);
  });

  ipcMain.handle('ai:history', async () => {
    return aiAssistant.getChatHistory();
  });

  ipcMain.handle('ai:clear', async () => {
    aiAssistant.clearChatHistory();
    return { success: true };
  });

  ipcMain.handle('ai:status', async () => {
    // Check if AI is initialized
    const openaiKey = await getSecret('openai_api_key');
    return {
      available: !!openaiKey,
      initialized: !!openaiKey
    };
  });

  // AI Scheduler handlers - commented out temporarily
  // ipcMain.handle('ai:scheduler:get-settings', async () => {
  //   return await aiScheduler.getSettings();
  // });

  // ipcMain.handle('ai:scheduler:update-settings', async (_event, payload) => {
  //   const validated = AIAutomationSettingsSchema.parse(payload);
  //   return await aiScheduler.updateSettings(validated);
  // });

  // ipcMain.handle('ai:scheduler:get-status', async () => {
  //   return await aiScheduler.getStatus();
  // });

  // ipcMain.handle('ai:scheduler:trigger-scan', async () => {
  //   return await aiScheduler.triggerManualScan();
  // });

  // ipcMain.handle('ai:scheduler:trigger-trading', async () => {
  //   return await aiScheduler.triggerManualTrading();
  // });

  // ipcMain.handle('ai:scheduler:start', async () => {
  //   await aiScheduler.startScheduler();
  //   return { success: true };
  // });

  // ipcMain.handle('ai:scheduler:stop', async () => {
  //   await aiScheduler.stopScheduler();
  //   return { success: true };
  // });
}
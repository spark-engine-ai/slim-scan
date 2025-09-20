import { logger } from './logger';
import { aiAssistant } from './ai-assistant';
import { scanEngine } from './scan-engine';
import { paperTradingService } from './paper-trading';
import { getSettings } from './settings';
import { getSecret } from './keychain';

export interface AIAutomationSettings {
  enabled: boolean;
  autoTrading: boolean;
  scanInterval: number; // minutes
  tradingRules: {
    maxPositions: number;
    maxRiskPerTrade: number; // percentage
    stopLoss: number; // percentage
    profitTarget: number; // percentage
    onlyInBullMarket: boolean;
    minScore: number; // CAN SLIM score threshold
  };
  schedule: {
    enabled: boolean;
    tradingHours: {
      start: string; // HH:MM format
      end: string;
    };
    daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  };
}

export class AISchedulerService {
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private settings: AIAutomationSettings | null = null;
  private isRunning: boolean = false;

  async initialize(): Promise<void> {
    try {
      await this.loadSettings();
      if (this.settings?.enabled) {
        await this.startScheduler();
      }
      logger.info('AI Scheduler initialized', { enabled: this.settings?.enabled });
    } catch (error) {
      logger.error('Failed to initialize AI Scheduler:', error);
    }
  }

  async loadSettings(): Promise<void> {
    try {
      // Load from keychain or defaults
      const savedSettings = await getSecret('ai_automation_settings');
      this.settings = savedSettings ? JSON.parse(savedSettings) : this.getDefaultSettings();
    } catch (error) {
      logger.error('Failed to load AI automation settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  async saveSettings(newSettings: AIAutomationSettings): Promise<void> {
    try {
      this.settings = newSettings;
      await this.storeSettings(newSettings);

      // Restart scheduler with new settings
      await this.stopScheduler();
      if (newSettings.enabled) {
        await this.startScheduler();
      }

      logger.info('AI automation settings updated', { enabled: newSettings.enabled });
    } catch (error) {
      logger.error('Failed to save AI automation settings:', error);
      throw error;
    }
  }

  private async storeSettings(settings: AIAutomationSettings): Promise<void> {
    try {
      await this.storeSecret('ai_automation_settings', JSON.stringify(settings));
    } catch (error) {
      logger.error('Failed to store AI automation settings:', error);
      throw error;
    }
  }

  // Wrapper for keychain storage that handles the missing function
  private async storeSecret(key: string, value: string): Promise<void> {
    // For now, we'll use a simple JSON file storage since we don't have storeSecret implemented
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    const os = await import('os');

    const configDir = path.join(os.homedir(), '.slimscan');
    await fs.mkdir(configDir, { recursive: true });
    const configFile = path.join(configDir, `${key}.json`);

    await fs.writeFile(configFile, value, 'utf8');
  }

  private getDefaultSettings(): AIAutomationSettings {
    return {
      enabled: false,
      autoTrading: false,
      scanInterval: 60, // minutes
      tradingRules: {
        maxPositions: 5,
        maxRiskPerTrade: 2, // percentage
        stopLoss: 8, // percentage
        profitTarget: 20, // percentage
        onlyInBullMarket: true,
        minScore: 60 // CAN SLIM score threshold
      },
      schedule: {
        enabled: false,
        tradingHours: {
          start: '09:30',
          end: '16:00'
        },
        daysOfWeek: [1, 2, 3, 4, 5] // Monday to Friday
      }
    };
  }

  async startScheduler(): Promise<void> {
    if (!this.settings?.enabled || this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Check if AI is available
    const aiAvailable = await this.checkAIAvailability();
    if (!aiAvailable) {
      logger.warn('AI Scheduler cannot start - OpenAI API key not configured');
      return;
    }

    // Schedule regular scans
    const scanIntervalMs = (this.settings.scanInterval || 60) * 60 * 1000; // Convert to milliseconds
    const scanJob = setInterval(() => {
      this.performScheduledScan();
    }, scanIntervalMs);

    this.scheduledJobs.set('scan', scanJob);

    // If auto-trading enabled, schedule position monitoring
    if (this.settings.autoTrading) {
      const monitorJob = setInterval(() => {
        this.monitorPositions();
      }, 5 * 60 * 1000); // Check every 5 minutes

      this.scheduledJobs.set('monitor', monitorJob);
    }

    logger.info('AI Scheduler started', {
      scanInterval: this.settings.scanInterval,
      autoTrading: this.settings.autoTrading
    });
  }

  async stopScheduler(): Promise<void> {
    for (const [jobName, job] of this.scheduledJobs) {
      clearInterval(job);
      this.scheduledJobs.delete(jobName);
    }

    this.isRunning = false;
    logger.info('AI Scheduler stopped');
  }

  private async checkAIAvailability(): Promise<boolean> {
    try {
      const openaiKey = await getSecret('openai_api_key');
      return !!openaiKey;
    } catch {
      return false;
    }
  }

  private async performScheduledScan(): Promise<void> {
    try {
      if (!this.shouldRunNow()) {
        return;
      }

      logger.info('AI Scheduler: Starting automated CAN SLIM scan');

      // Check market conditions first if required
      if (this.settings?.tradingRules.onlyInBullMarket) {
        const marketBull = await this.checkMarketCondition();
        if (!marketBull) {
          logger.info('AI Scheduler: Skipping scan - market not in bull phase');
          return;
        }
      }

      // Run the scan through AI assistant
      const scanResult = await aiAssistant.chat(
        'Run a comprehensive CAN SLIM scan and analyze the top candidates. ' +
        'Provide detailed analysis and if auto-trading is enabled, execute trades ' +
        'based on the configured risk parameters and position limits.'
      );

      logger.info('AI Scheduler: Scan completed', { result: scanResult });

      // If auto-trading is enabled, let AI make trading decisions
      if (this.settings?.autoTrading) {
        await this.executeAutoTrades();
      }

    } catch (error) {
      logger.error('AI Scheduler: Error during scheduled scan:', error);
    }
  }

  private async executeAutoTrades(): Promise<void> {
    try {
      // Get current portfolio status
      const portfolio = await paperTradingService.getAccount();
      const positions = await paperTradingService.getPositions();

      // Check position limits
      if (positions.length >= (this.settings?.tradingRules.maxPositions || 5)) {
        logger.info('AI Scheduler: Max positions reached, skipping new trades');
        return;
      }

      // Let AI analyze and execute trades based on scan results
      const tradingPrompt = `
        Analyze current scan results and portfolio status:
        - Current positions: ${positions.length}
        - Max positions allowed: ${this.settings?.tradingRules.maxPositions}
        - Max risk per trade: ${this.settings?.tradingRules.maxRiskPerTrade}%
        - Stop loss: ${this.settings?.tradingRules.stopLoss}%
        - Profit target: ${this.settings?.tradingRules.profitTarget}%
        - Min CAN SLIM score: ${this.settings?.tradingRules.minScore}

        Execute appropriate paper trades for CAN SLIM winners that meet our criteria.
        Focus on stocks with strong C-A-N-S-L-I factors and proper market timing.
      `;

      const tradingResult = await aiAssistant.chat(tradingPrompt);
      logger.info('AI Scheduler: Auto-trading completed', { result: tradingResult });

    } catch (error) {
      logger.error('AI Scheduler: Error during auto-trading:', error);
    }
  }

  private async monitorPositions(): Promise<void> {
    try {
      if (!this.settings?.autoTrading || !this.shouldRunNow()) {
        return;
      }

      // Let AI monitor and manage positions
      const monitoringPrompt = `
        Monitor current portfolio positions and execute stop-loss or profit-taking orders as needed.
        Use the following rules:
        - Stop loss: ${this.settings.tradingRules.stopLoss}%
        - Profit target: ${this.settings.tradingRules.profitTarget}%

        Review each position and take appropriate action based on current market conditions and CAN SLIM principles.
      `;

      const monitoringResult = await aiAssistant.chat(monitoringPrompt);
      logger.info('AI Scheduler: Position monitoring completed');

    } catch (error) {
      logger.error('AI Scheduler: Error during position monitoring:', error);
    }
  }

  private shouldRunNow(): boolean {
    if (!this.settings?.schedule.enabled) {
      return true; // Always run if schedule not enabled
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

    // Check day of week
    if (!this.settings.schedule.daysOfWeek.includes(currentDay)) {
      return false;
    }

    // Check time range
    const startTime = this.parseTime(this.settings.schedule.tradingHours.start);
    const endTime = this.parseTime(this.settings.schedule.tradingHours.end);

    return currentTime >= startTime && currentTime <= endTime;
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + minutes;
  }

  private async checkMarketCondition(): Promise<boolean> {
    try {
      // Simple market direction check - SPY above both 50-day and 200-day MAs
      const marketPrompt = 'Check current market direction using SPY analysis. ' +
        'Return true if market is in bull phase (SPY above 50-day and 200-day MAs), false otherwise.';

      const marketResult = await aiAssistant.chat(marketPrompt);

      // Parse AI response for bull/bear determination
      const isBullish = marketResult.toLowerCase().includes('bull') ||
                       marketResult.toLowerCase().includes('true') ||
                       marketResult.toLowerCase().includes('above');

      logger.info('AI Scheduler: Market condition check', {
        result: marketResult,
        isBullish
      });

      return isBullish;
    } catch (error) {
      logger.error('AI Scheduler: Error checking market condition:', error);
      return false; // Conservative approach - don't trade if can't determine
    }
  }

  // Public methods for external control
  async getSettings(): Promise<AIAutomationSettings | null> {
    return this.settings;
  }

  async updateSettings(newSettings: AIAutomationSettings): Promise<void> {
    await this.saveSettings(newSettings);
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  async getStatus(): Promise<{
    running: boolean;
    nextScanTime?: Date;
    aiAvailable: boolean;
    activeJobs: string[];
  }> {
    const aiAvailable = await this.checkAIAvailability();

    return {
      running: this.isRunning,
      aiAvailable,
      activeJobs: Array.from(this.scheduledJobs.keys())
    };
  }

  // Manual trigger methods
  async triggerManualScan(): Promise<string> {
    logger.info('AI Scheduler: Manual scan triggered');
    await this.performScheduledScan();
    return 'Manual scan completed';
  }

  async triggerManualTrading(): Promise<string> {
    if (!this.settings?.autoTrading) {
      throw new Error('Auto-trading is not enabled');
    }

    logger.info('AI Scheduler: Manual trading triggered');
    await this.executeAutoTrades();
    return 'Manual trading completed';
  }
}

export const aiScheduler = new AISchedulerService();
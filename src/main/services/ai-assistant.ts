import OpenAI from 'openai';
import { logger } from './logger';
import { getSecret } from './keychain';
import { getSettings, setSettings } from './settings';
import { scanEngine } from './scan-engine';
import { paperTradingService } from './paper-trading';
import { getScanResults } from './db';
import { chatManager, ChatSession, ChatMessage } from './chat-manager';
import { runBacktest } from './backtest';

export interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class AIAssistantService {
  private openai: OpenAI | null = null;

  async initialize(): Promise<boolean> {
    try {
      const apiKey = await getSecret('openai_api_key');
      if (!apiKey) {
        logger.warn('OpenAI API key not found - AI assistant disabled');
        return false;
      }

      this.openai = new OpenAI({
        apiKey: apiKey,
      });

      // Initialize chat manager
      await chatManager.initialize();

      logger.info('AI Assistant initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize AI Assistant:', error);
      return false;
    }
  }

  async chat(userMessage: string, chatId?: string): Promise<string> {
    if (!this.openai) {
      return 'AI Assistant is not available. Please check your OpenAI API key configuration.';
    }

    try {
      // Get or create chat session
      let chat: ChatSession;
      if (chatId) {
        chat = await chatManager.loadChat(chatId);
      } else {
        const activeChat = await chatManager.getActiveChat();
        if (activeChat) {
          chat = activeChat;
        } else {
          chat = await chatManager.createNewChat();
        }
      }

      // Add user message to chat
      await chatManager.addMessage(chat.id, {
        role: 'user',
        content: userMessage
      });

      // Define available functions
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'get_current_settings',
            description: 'Get the current application settings including provider, universe, and scan thresholds',
            parameters: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'update_settings',
            description: 'Update application settings',
            parameters: {
              type: 'object',
              properties: {
                provider: { type: 'string', enum: ['polygon', 'fmp'] },
                universe: { type: 'string', enum: ['sp500', 'sp1500', 'nasdaq', 'russell2000', 'all'] },
                thresholds: {
                  type: 'object',
                  properties: {
                    C_yoy: { type: 'number', description: 'Current earnings YoY growth threshold' },
                    A_cagr: { type: 'number', description: 'Annual earnings CAGR threshold' },
                    N_pct52w: { type: 'number', description: 'New high percentage of 52-week high' },
                    RS_pct: { type: 'number', description: 'Relative strength percentile threshold' },
                    S_volSpike: { type: 'number', description: 'Volume spike multiplier threshold' }
                  }
                }
              }
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'run_scan',
            description: 'Execute a CAN SLIM stock scan',
            parameters: {
              type: 'object',
              properties: {
                mode: { type: 'string', enum: ['daily', 'intraday'], description: 'Scan mode' }
              },
              required: ['mode']
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'get_scan_results',
            description: 'Get results from a specific scan',
            parameters: {
              type: 'object',
              properties: {
                scanId: { type: 'number', description: 'Scan ID to retrieve results for' }
              },
              required: ['scanId']
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'get_portfolio_status',
            description: 'Get current paper trading portfolio status',
            parameters: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'place_trade',
            description: 'Place a paper trading order',
            parameters: {
              type: 'object',
              properties: {
                symbol: { type: 'string', description: 'Stock symbol to trade' },
                side: { type: 'string', enum: ['buy', 'sell'], description: 'Buy or sell order' },
                qty: { type: 'number', description: 'Number of shares' },
                type: { type: 'string', enum: ['market', 'limit'], description: 'Order type' },
                limitPrice: { type: 'number', description: 'Limit price (for limit orders)' }
              },
              required: ['symbol', 'side', 'qty']
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'analyze_stock',
            description: 'Get detailed CAN SLIM analysis for a specific stock',
            parameters: {
              type: 'object',
              properties: {
                symbol: { type: 'string', description: 'Stock symbol to analyze' }
              },
              required: ['symbol']
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'run_backtest',
            description: 'Run a backtest with specified parameters or use defaults. Returns comprehensive results including trades, metrics, and performance analysis.',
            parameters: {
              type: 'object',
              properties: {
                dateFrom: { type: 'string', description: 'Start date for backtest (YYYY-MM-DD format)', default: '2023-01-01' },
                dateTo: { type: 'string', description: 'End date for backtest (YYYY-MM-DD format)', default: '2024-01-01' },
                scoreCutoff: { type: 'number', description: 'Minimum CAN SLIM score cutoff for stock selection', default: 70 },
                riskPercent: { type: 'number', description: 'Risk percentage per trade (0.01 = 1%)', default: 0.02 },
                stopPercent: { type: 'number', description: 'Stop loss percentage (0.08 = 8%)', default: 0.08 },
                maxPositions: { type: 'number', description: 'Maximum number of concurrent positions', default: 10 },
                useMarketGate: { type: 'boolean', description: 'Enable market gate filter', default: true },
                profitTargetPercent: { type: 'number', description: 'Profit target percentage (optional)' },
                maxHoldingDays: { type: 'number', description: 'Maximum holding period in days (optional)' },
                minHoldingDays: { type: 'number', description: 'Minimum holding period in days (optional)' },
                initialCapital: { type: 'number', description: 'Starting capital amount', default: 100000 },
                commission: { type: 'number', description: 'Commission per trade', default: 0 },
                slippage: { type: 'number', description: 'Slippage percentage', default: 0.001 },
                enableTrailingStop: { type: 'boolean', description: 'Enable trailing stop loss' },
                trailingStopPercent: { type: 'number', description: 'Trailing stop percentage' }
              },
              required: []
            }
          }
        }
      ];

      // Reload chat to get updated messages
      chat = await chatManager.loadChat(chat.id);

      // Prepare messages for OpenAI API with system prompt for markdown formatting
      const systemMessage = {
        role: 'system' as const,
        content: `You are an expert financial AI assistant specializing in CAN SLIM stock analysis and trading strategies.

FORMATTING REQUIREMENTS:
- Always use proper markdown formatting in your responses
- Use **bold** for important metrics, stock symbols, and key findings
- Use ## headers for main sections like "Backtest Results", "Key Metrics", "Analysis"
- Use ### subheaders for subsections
- Use bullet points (-) for lists of stocks, findings, or recommendations
- Use numbered lists (1.) for step-by-step instructions or rankings
- Use \`code formatting\` for specific values, dates, or technical terms
- Use > blockquotes for important warnings or insights
- Use tables when presenting comparative data
- Use --- for horizontal dividers between major sections

CONTENT FOCUS:
- Provide actionable insights about stock performance, market conditions, and trading strategies
- Explain CAN SLIM methodology when relevant
- Give clear, data-driven analysis of backtest results
- Always include specific numbers and percentages in your analysis
- Highlight both risks and opportunities

Format all responses professionally with clear markdown structure.`
      };

      const messages = [
        systemMessage,
        ...chat.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Call OpenAI API with function calling
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: messages,
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.1, // Lower temperature for more consistent financial advice
      });

      const message = response.choices[0]?.message;
      if (!message) {
        throw new Error('No response from OpenAI');
      }

      // Handle function calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Don't add the "Executing functions..." message to chat history

        // Execute function calls
        const functionResults = [];
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            const result = await this.executeFunctionCall(
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments)
            );
            functionResults.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify(result)
            });
          }
        }

        // Make follow-up call with function results
        const followUpMessages = [
          systemMessage,
          ...chat.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: 'assistant' as const,
            content: message.content,
            tool_calls: message.tool_calls
          },
          ...functionResults.map(result => ({
            role: 'tool' as const,
            content: result.output,
            tool_call_id: result.tool_call_id
          }))
        ];

        const followUpResponse = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: followUpMessages,
          temperature: 0.1,
        });

        const finalMessage = followUpResponse.choices[0]?.message?.content || 'Function executed successfully.';

        // Add final response to chat
        await chatManager.addMessage(chat.id, {
          role: 'assistant',
          content: finalMessage
        });

        return finalMessage;
      } else {
        // Regular response without function calls
        const assistantMessage = message.content || 'I apologize, but I couldn\'t generate a response.';

        await chatManager.addMessage(chat.id, {
          role: 'assistant',
          content: assistantMessage
        });

        return assistantMessage;
      }
    } catch (error) {
      logger.error('AI Assistant chat error:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again or check my configuration.';
    }
  }

  private async executeFunctionCall(functionName: string, args: any): Promise<FunctionCallResult> {
    logger.info(`Executing AI function: ${functionName}`, args);

    try {
      switch (functionName) {
        case 'get_current_settings':
          const settings = await getSettings();
          return { success: true, data: settings };

        case 'update_settings':
          await setSettings(args);
          return { success: true, data: 'Settings updated successfully' };

        case 'run_scan':
          const scanId = await scanEngine.run({ mode: args.mode });
          const results = await scanEngine.getResults(scanId);
          return { success: true, data: { scanId, results } };

        case 'get_scan_results':
          const scanResults = getScanResults(args.scanId);
          return { success: true, data: scanResults };

        case 'get_portfolio_status':
          const account = await paperTradingService.getAccount();
          const positions = await paperTradingService.getPositions();
          return { success: true, data: { account, positions } };

        case 'place_trade':
          const order = await paperTradingService.submitOrder({
            symbol: args.symbol,
            qty: args.qty,
            side: args.side,
            type: args.type || 'market',
            time_in_force: 'day',
            ...(args.limitPrice && { limit_price: args.limitPrice })
          });
          return { success: true, data: order };

        case 'analyze_stock':
          // This would be a more detailed analysis - for now return basic info
          const basicAnalysis = {
            symbol: args.symbol,
            message: `Detailed CAN SLIM analysis for ${args.symbol} would go here. This feature will be enhanced with specific fundamental and technical analysis.`
          };
          return { success: true, data: basicAnalysis };

        case 'run_backtest':
          // Apply default values for parameters not provided
          const backtestConfig = {
            dateFrom: args.dateFrom || '2023-01-01',
            dateTo: args.dateTo || '2024-01-01',
            scoreCutoff: args.scoreCutoff || 70,
            riskPercent: args.riskPercent || 0.02,
            stopPercent: args.stopPercent || 0.08,
            maxPositions: args.maxPositions || 10,
            useMarketGate: args.useMarketGate !== undefined ? args.useMarketGate : true,
            ...(args.profitTargetPercent && { profitTargetPercent: args.profitTargetPercent }),
            ...(args.maxHoldingDays && { maxHoldingDays: args.maxHoldingDays }),
            ...(args.minHoldingDays && { minHoldingDays: args.minHoldingDays }),
            initialCapital: args.initialCapital || 100000,
            commission: args.commission || 0,
            slippage: args.slippage || 0.001,
            ...(args.enableTrailingStop !== undefined && { enableTrailingStop: args.enableTrailingStop }),
            ...(args.trailingStopPercent && { trailingStopPercent: args.trailingStopPercent })
          };

          const backtestResult = await runBacktest(backtestConfig);
          return { success: true, data: backtestResult };

        default:
          return { success: false, error: `Unknown function: ${functionName}` };
      }
    } catch (error) {
      logger.error(`Function execution error (${functionName}):`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getChatHistory(chatId?: string): Promise<ChatMessage[]> {
    try {
      let chat: ChatSession;
      if (chatId) {
        chat = await chatManager.loadChat(chatId);
      } else {
        const activeChat = await chatManager.getActiveChat();
        if (!activeChat) {
          return [];
        }
        chat = activeChat;
      }
      return chat.messages.filter(msg => msg.role !== 'system'); // Filter system messages for UI
    } catch (error) {
      logger.error('Failed to get chat history:', error);
      return [];
    }
  }

  async clearChatHistory(chatId?: string): Promise<void> {
    try {
      if (chatId) {
        // Clear specific chat by creating a new one with same ID
        await chatManager.deleteChat(chatId);
        await chatManager.createNewChat('New Chat');
      } else {
        // Clear active chat
        const activeChat = await chatManager.getActiveChat();
        if (activeChat) {
          await chatManager.deleteChat(activeChat.id);
          await chatManager.createNewChat('New Chat');
        }
      }
    } catch (error) {
      logger.error('Failed to clear chat history:', error);
    }
  }

  // New methods for chat session management
  async createNewChat(title?: string): Promise<ChatSession> {
    return await chatManager.createNewChat(title);
  }

  async loadChat(chatId: string): Promise<ChatSession> {
    return await chatManager.loadChat(chatId);
  }

  async listChats(): Promise<ChatSession[]> {
    return await chatManager.listChats();
  }

  async deleteChat(chatId: string): Promise<void> {
    await chatManager.deleteChat(chatId);
  }

  async exportChat(chatId: string, format: 'json' | 'txt' | 'md' = 'json'): Promise<string> {
    return await chatManager.exportChat(chatId, format);
  }

  async updateChatTitle(chatId: string, newTitle: string): Promise<void> {
    await chatManager.updateChatTitle(chatId, newTitle);
  }

  async getActiveChatId(): Promise<string | null> {
    const activeChat = await chatManager.getActiveChat();
    return activeChat ? activeChat.id : null;
  }
}

export const aiAssistant = new AIAssistantService();
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from './logger';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  summary?: string; // AI-generated summary for display
}

export class ChatManagerService {
  private chatDir: string;
  private activeChatId: string | null = null;
  private chatCache: Map<string, ChatSession> = new Map();

  constructor() {
    this.chatDir = join(homedir(), '.slimscan', 'chats');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.chatDir, { recursive: true });
      logger.info('Chat Manager initialized', { chatDir: this.chatDir });
    } catch (error) {
      logger.error('Failed to initialize Chat Manager:', error);
      throw error;
    }
  }

  async createNewChat(title?: string): Promise<ChatSession> {
    const chatId = this.generateChatId();
    const now = new Date();

    const chat: ChatSession = {
      id: chatId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
      messages: [{
        role: 'system',
        content: `You are SlimScan AI, an intelligent trading assistant for a CAN SLIM stock screening application.

You have access to the following functions:
- get_current_settings: Get current app settings
- update_settings: Update app settings (provider, universe, thresholds, etc.)
- run_scan: Execute a CAN SLIM stock scan
- get_scan_results: Retrieve results from a previous scan
- get_portfolio_status: Get current paper trading portfolio
- place_trade: Place a paper trade order
- analyze_stock: Get detailed analysis of a specific stock
- get_market_status: Check current market conditions

You should:
1. Help users understand their scan results and provide CAN SLIM analysis
2. Provide investment forecasts and trading recommendations based on CAN SLIM principles
3. Execute trades ONLY when explicitly requested by the user with clear confirmation
4. Suggest portfolio adjustments and explain your reasoning
5. Always prioritize user control and safety in trading decisions

Remember: Never execute trades without explicit user confirmation. Always explain your CAN SLIM analysis and reasoning.`,
        timestamp: now
      }]
    };

    await this.saveChat(chat);
    this.activeChatId = chatId;
    this.chatCache.set(chatId, chat);

    logger.info('Created new chat', { chatId, title: chat.title });
    return chat;
  }

  async loadChat(chatId: string): Promise<ChatSession> {
    // Check cache first
    if (this.chatCache.has(chatId)) {
      const chat = this.chatCache.get(chatId)!;
      this.activeChatId = chatId;
      return chat;
    }

    // Load from file
    try {
      const chatPath = join(this.chatDir, `${chatId}.json`);
      const data = await fs.readFile(chatPath, 'utf-8');
      const chat = JSON.parse(data) as ChatSession;

      // Convert date strings back to Date objects
      chat.createdAt = new Date(chat.createdAt);
      chat.updatedAt = new Date(chat.updatedAt);
      chat.messages = chat.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      this.chatCache.set(chatId, chat);
      this.activeChatId = chatId;

      logger.info('Loaded chat from file', { chatId, messageCount: chat.messages.length });
      return chat;
    } catch (error) {
      logger.error('Failed to load chat:', error);
      throw new Error(`Chat not found: ${chatId}`);
    }
  }

  async saveChat(chat: ChatSession): Promise<void> {
    try {
      const chatPath = join(this.chatDir, `${chat.id}.json`);
      await fs.writeFile(chatPath, JSON.stringify(chat, null, 2), 'utf-8');
      this.chatCache.set(chat.id, chat);
      logger.debug('Chat saved', { chatId: chat.id, messageCount: chat.messages.length });
    } catch (error) {
      logger.error('Failed to save chat:', error);
      throw error;
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    try {
      const chatPath = join(this.chatDir, `${chatId}.json`);
      await fs.unlink(chatPath);
      this.chatCache.delete(chatId);

      if (this.activeChatId === chatId) {
        this.activeChatId = null;
      }

      logger.info('Chat deleted', { chatId });
    } catch (error) {
      logger.error('Failed to delete chat:', error);
      throw error;
    }
  }

  async listChats(): Promise<ChatSession[]> {
    try {
      const files = await fs.readdir(this.chatDir);
      const chatFiles = files.filter(f => f.endsWith('.json'));

      const chats: ChatSession[] = [];

      for (const file of chatFiles) {
        try {
          const chatPath = join(this.chatDir, file);
          const data = await fs.readFile(chatPath, 'utf-8');
          const chat = JSON.parse(data) as ChatSession;

          // Only load metadata for listing (not full messages)
          chats.push({
            id: chat.id,
            title: chat.title,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: [], // Don't load messages for listing
            summary: chat.summary
          });
        } catch (error) {
          logger.warn(`Failed to load chat metadata from ${file}:`, error);
        }
      }

      // Sort by updatedAt descending (newest first)
      chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return chats;
    } catch (error) {
      logger.error('Failed to list chats:', error);
      return [];
    }
  }

  async addMessage(chatId: string, message: Omit<ChatMessage, 'timestamp'>): Promise<void> {
    const chat = await this.loadChat(chatId);

    const newMessage: ChatMessage = {
      ...message,
      timestamp: new Date()
    };

    chat.messages.push(newMessage);
    chat.updatedAt = new Date();

    // Generate or update summary if it's a user message
    if (message.role === 'user' && chat.messages.length > 2) {
      chat.summary = this.generateChatSummary(chat);
    }

    await this.saveChat(chat);
  }

  async updateChatTitle(chatId: string, newTitle: string): Promise<void> {
    const chat = await this.loadChat(chatId);
    chat.title = newTitle;
    chat.updatedAt = new Date();
    await this.saveChat(chat);
  }

  async getActiveChat(): Promise<ChatSession | null> {
    if (!this.activeChatId) {
      return null;
    }

    try {
      return await this.loadChat(this.activeChatId);
    } catch {
      this.activeChatId = null;
      return null;
    }
  }

  async exportChat(chatId: string, format: 'json' | 'txt' | 'md' = 'json'): Promise<string> {
    const chat = await this.loadChat(chatId);

    switch (format) {
      case 'txt':
        return this.exportToText(chat);
      case 'md':
        return this.exportToMarkdown(chat);
      default:
        return JSON.stringify(chat, null, 2);
    }
  }

  private generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChatSummary(chat: ChatSession): string {
    // Simple summary generation based on first user message
    const firstUserMessage = chat.messages.find(m => m.role === 'user');
    if (firstUserMessage && firstUserMessage.content.length > 50) {
      return firstUserMessage.content.substring(0, 50) + '...';
    }
    return firstUserMessage?.content || 'New conversation';
  }

  private exportToText(chat: ChatSession): string {
    let output = `Chat: ${chat.title}\n`;
    output += `Created: ${chat.createdAt.toLocaleString()}\n`;
    output += `Updated: ${chat.updatedAt.toLocaleString()}\n`;
    output += `Messages: ${chat.messages.length}\n`;
    output += '\n' + '='.repeat(50) + '\n\n';

    for (const message of chat.messages) {
      if (message.role === 'system') continue; // Skip system messages in export

      const timestamp = message.timestamp.toLocaleString();
      const role = message.role === 'user' ? 'User' : 'AI Assistant';

      output += `[${timestamp}] ${role}:\n`;
      output += `${message.content}\n\n`;
    }

    return output;
  }

  private exportToMarkdown(chat: ChatSession): string {
    let output = `# ${chat.title}\n\n`;
    output += `**Created:** ${chat.createdAt.toLocaleString()}\n`;
    output += `**Updated:** ${chat.updatedAt.toLocaleString()}\n`;
    output += `**Messages:** ${chat.messages.length}\n\n`;
    output += '---\n\n';

    for (const message of chat.messages) {
      if (message.role === 'system') continue;

      const timestamp = message.timestamp.toLocaleString();
      const role = message.role === 'user' ? '🧑 **User**' : '🤖 **AI Assistant**';

      output += `## ${role} - ${timestamp}\n\n`;
      output += `${message.content}\n\n`;
    }

    return output;
  }

  getActiveChatId(): string | null {
    return this.activeChatId;
  }

  clearCache(): void {
    this.chatCache.clear();
    logger.info('Chat cache cleared');
  }
}

export const chatManager = new ChatManagerService();
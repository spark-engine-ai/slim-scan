import { create } from 'zustand';
import { Position } from '../types/models';

interface BuyOptions {
  orderType?: 'market' | 'limit';
  limitPrice?: number;
  stopLoss?: number;
  notes?: string;
}

interface TradingState {
  positions: Position[];
  cash: number;
  equity: number;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  buySymbol: (symbol: string, qty: number, options?: BuyOptions) => Promise<void>;
  sellSymbol: (symbol: string, qty: number) => Promise<void>;
  refreshPositions: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useTrading = create<TradingState>((set, get) => ({
  positions: [],
  cash: 0,
  equity: 0,
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true, error: null });
    try {
      // Check if electronAPI is available
      if (!window.electronAPI?.paper?.test) {
        set({
          loading: false,
          error: 'Trading API not available. Please restart the application.',
          initialized: false
        });
        return;
      }

      // Test connection first
      const isConnected = await window.electronAPI.paper.test();
      if (!isConnected) {
        set({
          loading: false,
          error: 'Unable to connect to paper trading. Check your API keys in Settings.',
          initialized: false
        });
        return;
      }

      // Load account and portfolio data
      await get().refreshPositions();
      set({ initialized: true });
    } catch (error) {
      console.error('Failed to initialize trading:', error);
      set({
        loading: false,
        error: 'Failed to initialize paper trading',
        initialized: false
      });
    }
  },

  buySymbol: async (symbol: string, qty: number, options?: BuyOptions) => {
    set({ loading: true, error: null });
    try {
      if (!window.electronAPI?.paper?.order) {
        set({
          loading: false,
          error: 'Trading API not available. Please restart the application.'
        });
        return;
      }

      // Main buy order
      const order = {
        symbol,
        qty,
        side: 'buy' as const,
        type: options?.orderType || 'market',
        limit_price: options?.limitPrice,
        notes: options?.notes
      };

      const buyOrderResult = await window.electronAPI.paper.order(order);

      // Place stop loss order if specified
      if (options?.stopLoss && buyOrderResult?.success) {
        try {
          await window.electronAPI.paper.order({
            symbol,
            qty,
            side: 'sell' as const,
            type: 'stop',
            stop_price: options.stopLoss,
            notes: `Stop loss for ${symbol} position`
          });
        } catch (stopError) {
          console.warn('Failed to place stop loss order:', stopError);
          // Don't fail the main order if stop loss fails
        }
      }

      await get().refreshPositions();
      set({ loading: false });
    } catch (error) {
      console.error('Failed to buy symbol:', error);
      set({
        loading: false,
        error: `Failed to buy ${symbol}`,
      });
    }
  },

  sellSymbol: async (symbol: string, qty: number) => {
    set({ loading: true, error: null });
    try {
      if (!window.electronAPI?.paper?.order) {
        set({
          loading: false,
          error: 'Trading API not available. Please restart the application.'
        });
        return;
      }

      await window.electronAPI.paper.order({
        symbol,
        qty,
        side: 'sell',
        type: 'market'
      });
      await get().refreshPositions();
      set({ loading: false });
    } catch (error) {
      console.error('Failed to sell symbol:', error);
      set({
        loading: false,
        error: `Failed to sell ${symbol}`,
      });
    }
  },

  refreshPositions: async () => {
    set({ loading: true, error: null });
    try {
      if (!window.electronAPI?.paper) {
        set({
          loading: false,
          error: 'Trading API not available. Please restart the application.'
        });
        return;
      }

      // Load portfolio summary
      const portfolio = await window.electronAPI.paper.portfolio();
      if (portfolio) {
        set({
          cash: portfolio.cash,
          equity: portfolio.totalValue,
          positions: portfolio.positions.map((pos: any) => ({
            symbol: pos.symbol,
            qty: pos.qty,
            avgCost: pos.value / pos.qty,
            marketValue: pos.value,
            unrealizedPL: pos.unrealizedPL,
            unrealizedPLPercent: pos.unrealizedPLPercent,
          })) as Position[],
          loading: false
        });
      } else {
        // Fallback to individual API calls
        const [account, positions] = await Promise.all([
          window.electronAPI.paper.account(),
          window.electronAPI.paper.positions()
        ]);

        if (account) {
          set({
            cash: parseFloat(account.cash) || 0,
            equity: parseFloat(account.portfolio_value) || 0,
            positions: positions.map((pos: any) => ({
              symbol: pos.symbol,
              qty: parseFloat(pos.qty),
              avgCost: parseFloat(pos.avg_entry_price),
              marketValue: parseFloat(pos.market_value),
              unrealizedPL: parseFloat(pos.unrealized_pl),
              unrealizedPLPercent: parseFloat(pos.unrealized_plpc),
            })) as Position[],
            loading: false
          });
        } else {
          throw new Error('Unable to load account data');
        }
      }
    } catch (error) {
      console.error('Failed to refresh positions:', error);
      set({
        loading: false,
        error: 'Failed to load trading data',
      });
    }
  },
}));
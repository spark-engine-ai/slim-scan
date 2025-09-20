import axios from 'axios';
import { logger } from './logger';
import { getSecret } from './keychain';

interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  status: 'new' | 'partially_filled' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'replaced' | 'pending_cancel' | 'pending_replace';
  created_at: string;
  updated_at: string;
  submitted_at: string;
}

interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  qty: string;
  avg_entry_price: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}

interface AlpacaAccount {
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trade_suspended_by_user: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_confirmation_email: string;
  day_trade_count: number;
  daytrade_buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  equity: string;
  last_equity: string;
  multiplier: string;
  buying_power: string;
  initial_margin: string;
  maintenance_margin: string;
  sma: string;
  long_market_value: string;
  short_market_value: string;
}

export class PaperTradingService {
  private baseUrl: string;
  private isLiveMode: boolean;

  constructor(liveMode: boolean = false) {
    this.isLiveMode = liveMode;
    this.baseUrl = liveMode ? 'https://api.alpaca.markets' : 'https://paper-api.alpaca.markets';
  }

  setTradingMode(liveMode: boolean) {
    this.isLiveMode = liveMode;
    this.baseUrl = liveMode ? 'https://api.alpaca.markets' : 'https://paper-api.alpaca.markets';
  }

  private async getHeaders() {
    const keyId = await getSecret('alpaca_key_id_api_key');
    const secretKey = await getSecret('alpaca_secret_key_api_key');

    if (!keyId || !secretKey) {
      throw new Error('Alpaca API keys not configured. Please set them in Settings.');
    }

    return {
      'APCA-API-KEY-ID': keyId,
      'APCA-API-SECRET-KEY': secretKey,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/v2/account`, {
        headers,
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.error('Alpaca connection test failed', error);
      return false;
    }
  }

  async getAccount(): Promise<AlpacaAccount | null> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/v2/account`, {
        headers
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get account info', error);
      return null;
    }
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/v2/positions`, {
        headers
      });
      return response.data || [];
    } catch (error) {
      logger.error('Failed to get positions', error);
      return [];
    }
  }

  async getOrders(status?: string, limit = 50): Promise<AlpacaOrder[]> {
    try {
      const params: any = { limit };
      if (status) params.status = status;

      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/v2/orders`, {
        headers,
        params
      });
      return response.data || [];
    } catch (error) {
      logger.error('Failed to get orders', error);
      return [];
    }
  }

  async submitOrder(params: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
    limit_price?: number;
    stop_price?: number;
    trail_percent?: number;
    client_order_id?: string;
  }): Promise<AlpacaOrder | null> {
    try {
      const orderData = {
        symbol: params.symbol,
        qty: params.qty.toString(),
        side: params.side,
        type: params.type,
        time_in_force: params.time_in_force,
        ...(params.limit_price && { limit_price: params.limit_price.toString() }),
        ...(params.stop_price && { stop_price: params.stop_price.toString() }),
        ...(params.trail_percent && { trail_percent: params.trail_percent.toString() }),
        ...(params.client_order_id && { client_order_id: params.client_order_id })
      };

      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseUrl}/v2/orders`, orderData, {
        headers
      });

      logger.info(`Order submitted: ${params.side} ${params.qty} ${params.symbol}`, {
        orderId: response.data.id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to submit order', { params, error });
      return null;
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const headers = await this.getHeaders();
      await axios.delete(`${this.baseUrl}/v2/orders/${orderId}`, {
        headers
      });
      logger.info(`Order cancelled: ${orderId}`);
      return true;
    } catch (error) {
      logger.error('Failed to cancel order', { orderId, error });
      return false;
    }
  }

  async closePosition(symbol: string, qty?: number): Promise<AlpacaOrder | null> {
    try {
      const data: any = {};
      if (qty) data.qty = qty.toString();

      const headers = await this.getHeaders();
      const response = await axios.delete(`${this.baseUrl}/v2/positions/${symbol}`, {
        headers,
        data
      });

      logger.info(`Position closed: ${symbol}${qty ? ` (${qty} shares)` : ' (all)'}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to close position', { symbol, qty, error });
      return null;
    }
  }

  async closeAllPositions(): Promise<boolean> {
    try {
      const headers = await this.getHeaders();
      await axios.delete(`${this.baseUrl}/v2/positions`, {
        headers
      });
      logger.info('All positions closed');
      return true;
    } catch (error) {
      logger.error('Failed to close all positions', error);
      return false;
    }
  }

  // Convenience methods for CAN SLIM trading
  async buyCanSlimSignal(
    symbol: string,
    dollarsToInvest: number,
    currentPrice: number,
    stopLossPercent = 0.08
  ): Promise<{
    buyOrder: AlpacaOrder | null;
    stopOrder: AlpacaOrder | null;
  }> {
    try {
      // Calculate shares to buy
      const shares = Math.floor(dollarsToInvest / currentPrice);
      if (shares <= 0) {
        logger.warn(`Cannot buy ${symbol}: insufficient funds or high price`, {
          dollarsToInvest,
          currentPrice
        });
        return { buyOrder: null, stopOrder: null };
      }

      // Submit buy order
      const buyOrder = await this.submitOrder({
        symbol,
        qty: shares,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      });

      if (!buyOrder) {
        return { buyOrder: null, stopOrder: null };
      }

      // Calculate stop loss price
      const stopPrice = currentPrice * (1 - stopLossPercent);

      // Submit stop loss order (will execute when buy order fills)
      // Note: Using limit order with stop price for stop-loss functionality
      const stopOrder = await this.submitOrder({
        symbol,
        qty: shares,
        side: 'sell',
        type: 'limit',
        time_in_force: 'gtc',
        limit_price: stopPrice
      });

      logger.info(`CAN SLIM buy signal executed for ${symbol}`, {
        shares,
        buyOrderId: buyOrder.id,
        stopOrderId: stopOrder?.id,
        stopPrice
      });

      return { buyOrder, stopOrder };

    } catch (error) {
      logger.error('Failed to execute CAN SLIM buy signal', { symbol, error });
      return { buyOrder: null, stopOrder: null };
    }
  }

  async sellOnProfitTarget(
    symbol: string,
    targetPercent = 0.20
  ): Promise<AlpacaOrder | null> {
    try {
      const positions = await this.getPositions();
      const position = positions.find(p => p.symbol === symbol);

      if (!position || parseFloat(position.qty) <= 0) {
        logger.warn(`No position found for ${symbol}`);
        return null;
      }

      const unrealizedPercent = parseFloat(position.unrealized_plpc);

      if (unrealizedPercent >= targetPercent) {
        // Sell partial position (e.g., 25% on 20% gain)
        const sharesToSell = Math.floor(parseFloat(position.qty) * 0.25);

        const sellOrder = await this.submitOrder({
          symbol,
          qty: sharesToSell,
          side: 'sell',
          type: 'market',
          time_in_force: 'day',
          client_order_id: `profit-take-${symbol}-${Date.now()}`
        });

        logger.info(`Profit target reached for ${symbol}`, {
          unrealizedPercent,
          sharesToSell,
          orderId: sellOrder?.id
        });

        return sellOrder;
      }

      return null;

    } catch (error) {
      logger.error('Failed to process profit target', { symbol, error });
      return null;
    }
  }

  async getPortfolioSummary(): Promise<{
    totalValue: number;
    cash: number;
    positions: Array<{
      symbol: string;
      qty: number;
      value: number;
      unrealizedPL: number;
      unrealizedPLPercent: number;
    }>;
  } | null> {
    try {
      const [account, positions] = await Promise.all([
        this.getAccount(),
        this.getPositions()
      ]);

      if (!account) return null;

      return {
        totalValue: parseFloat(account.portfolio_value),
        cash: parseFloat(account.cash),
        positions: positions.map(pos => ({
          symbol: pos.symbol,
          qty: parseFloat(pos.qty),
          value: parseFloat(pos.market_value),
          unrealizedPL: parseFloat(pos.unrealized_pl),
          unrealizedPLPercent: parseFloat(pos.unrealized_plpc)
        }))
      };

    } catch (error) {
      logger.error('Failed to get portfolio summary', error);
      return null;
    }
  }
}

export const paperTradingService = new PaperTradingService();
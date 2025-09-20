import axios from 'axios';
import { getSecret } from './keychain';
import { logger } from './logger';

interface AlpacaPosition {
  symbol: string;
  qty: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}

export async function paperBuy(symbol: string, qty: number): Promise<void> {
  try {
    const keyId = await getSecret('alpaca_key_id');
    const secretKey = await getSecret('alpaca_secret_key');
    
    if (!keyId || !secretKey) {
      throw new Error('Alpaca API keys not configured');
    }

    const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
    
    const response = await axios.post(`${baseUrl}/v2/orders`, {
      symbol: symbol.toUpperCase(),
      qty,
      side: 'buy',
      type: 'market',
      time_in_force: 'day'
    }, {
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.id) {
      logger.info(`Paper buy order submitted for ${symbol}: ${qty} shares`, {
        orderId: response.data.id,
        symbol,
        qty
      });
    } else {
      throw new Error('No order ID returned from Alpaca');
    }
  } catch (error) {
    logger.error(`Failed to submit paper buy order for ${symbol}`, error);
    throw error;
  }
}

export async function getPositions(): Promise<AlpacaPosition[]> {
  try {
    const keyId = await getSecret('alpaca_key_id');
    const secretKey = await getSecret('alpaca_secret_key');
    
    if (!keyId || !secretKey) {
      throw new Error('Alpaca API keys not configured');
    }

    const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
    
    const response = await axios.get(`${baseUrl}/v2/positions`, {
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secretKey
      }
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to fetch positions', error);
    throw error;
  }
}

export async function getAccount(): Promise<any> {
  try {
    const keyId = await getSecret('alpaca_key_id');
    const secretKey = await getSecret('alpaca_secret_key');
    
    if (!keyId || !secretKey) {
      throw new Error('Alpaca API keys not configured');
    }

    const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
    
    const response = await axios.get(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secretKey
      }
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to fetch account', error);
    throw error;
  }
}
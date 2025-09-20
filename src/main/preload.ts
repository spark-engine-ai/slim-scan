import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from './types';

const api = {
  scan: {
    run: (payload: IpcChannels['scan:run']) =>
      ipcRenderer.invoke('scan:run', payload),
    results: (payload: IpcChannels['scan:results']) =>
      ipcRenderer.invoke('scan:results', payload),
    export: (payload: IpcChannels['scan:export']) =>
      ipcRenderer.invoke('scan:export', payload),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (payload: IpcChannels['settings:set']) =>
      ipcRenderer.invoke('settings:set', payload),
  },
  universe: {
    refresh: () => ipcRenderer.invoke('universe:refresh'),
  },
  chart: {
    fetch: (payload: IpcChannels['chart:fetch']) =>
      ipcRenderer.invoke('chart:fetch', payload),
  },
  backtest: {
    run: (payload: IpcChannels['backtest:run']) =>
      ipcRenderer.invoke('backtest:run', payload),
  },
  trading: {
    buy: (payload: IpcChannels['trading:buy']) =>
      ipcRenderer.invoke('trading:buy', payload),
  },
  paper: {
    account: () => ipcRenderer.invoke('paper:account'),
    positions: () => ipcRenderer.invoke('paper:positions'),
    orders: (status?: string) => ipcRenderer.invoke('paper:orders', status),
    order: (payload: { symbol: string; qty: number; side: 'buy' | 'sell'; type?: 'market' | 'limit' | 'stop'; limitPrice?: number; stop_price?: number; notes?: string }) =>
      ipcRenderer.invoke('paper:order', payload),
    portfolio: () => ipcRenderer.invoke('paper:portfolio'),
    test: () => ipcRenderer.invoke('paper:test'),
  },
  provider: {
    test: () => ipcRenderer.invoke('provider:test'),
  },
  app: {
    logs: () => ipcRenderer.invoke('app:logs'),
  },
  apikey: {
    set: (payload: { provider: string; apiKey: string }) =>
      ipcRenderer.invoke('apikey:set', payload),
    get: (provider: string) => ipcRenderer.invoke('apikey:get', provider),
    delete: (provider: string) => ipcRenderer.invoke('apikey:delete', provider),
    list: () => ipcRenderer.invoke('apikey:list'),
  },
  ai: {
    chat: (payload: { message: string }) => ipcRenderer.invoke('ai:chat', payload),
    history: () => ipcRenderer.invoke('ai:history'),
    clear: () => ipcRenderer.invoke('ai:clear'),
    status: () => ipcRenderer.invoke('ai:status'),
    // scheduler: {
    //   getSettings: () => ipcRenderer.invoke('ai:scheduler:get-settings'),
    //   updateSettings: (settings: any) => ipcRenderer.invoke('ai:scheduler:update-settings', settings),
    //   getStatus: () => ipcRenderer.invoke('ai:scheduler:get-status'),
    //   triggerScan: () => ipcRenderer.invoke('ai:scheduler:trigger-scan'),
    //   triggerTrading: () => ipcRenderer.invoke('ai:scheduler:trigger-trading'),
    //   start: () => ipcRenderer.invoke('ai:scheduler:start'),
    //   stop: () => ipcRenderer.invoke('ai:scheduler:stop'),
    // },
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
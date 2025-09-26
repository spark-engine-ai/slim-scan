import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'path';
import { setupIpcHandlers } from './ipc-handlers';
import { initializeDatabase } from './services/db';
import { createAppMenu } from './app-menu';
import { initializeProviders } from './services/provider-init';
import { universeManager } from './services/universe-manager';
import { aiAssistant } from './services/ai-assistant';
// import { aiScheduler } from './services/ai-scheduler';

const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

console.log('Starting SlimScan application...');
console.log('isDev:', isDev);
console.log('VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL);

// Global error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

let mainWindow: BrowserWindow;

function createWindow(): void {
  console.log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    console.log('Loading dev server URL:', VITE_DEV_SERVER_URL);
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = join(__dirname, '../../dist/index.html');
    console.log('Loading file:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load content:', errorCode, errorDescription);
  });

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
  });

  // Also show the window after a timeout as fallback
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('Showing window after timeout fallback');
      mainWindow.show();
    }
  }, 5000);

  const menu = createAppMenu();
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  // Create window first to ensure it shows up even if other initializations fail
  createWindow();
  setupIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Initialize services after window is created
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  try {
    await initializeProviders();
    console.log('Providers initialized successfully');
  } catch (error) {
    console.error('Failed to initialize providers:', error);
  }

  // Initialize AI assistant
  try {
    await aiAssistant.initialize();
    console.log('AI assistant initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize AI assistant:', error);
  }

  // Initialize AI scheduler - commented out temporarily
  // try {
  //   await aiScheduler.initialize();
  // } catch (error) {
  //   console.warn('Failed to initialize AI scheduler:', error);
  // }

  // Auto-refresh universe on startup
  try {
    // Use provider-based universe refresh instead of hardcoded lists
    const { refreshUniverse } = await import('./services/universe');
    await refreshUniverse();
    console.log('Universe refreshed successfully');
  } catch (error) {
    console.warn('Failed to auto-refresh universe on startup:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

if (isDev) {
  if (require('electron-squirrel-startup')) app.quit();
}
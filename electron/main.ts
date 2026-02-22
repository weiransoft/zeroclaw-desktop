import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, session } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './core/ipc-handlers';
import { ZeroClawBridge } from './core/zeroclaw-bridge';
import { Database } from './store/database';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let zeroclawBridge: ZeroClawBridge | null = null;
let database: Database | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running, quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

// Set Content Security Policy
function setupCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDevMode = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    // Development CSP allows localhost for Vite HMR
    const devCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173",
      "style-src 'self' 'unsafe-inline' http://localhost:5173",
      "connect-src 'self' http://localhost:5173 http://127.0.0.1:8080 ws://localhost:5173",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
    ].join('; ');
    
    // Production CSP is more restrictive
    const prodCSP = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' http://127.0.0.1:8080",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
    ].join('; ');
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [isDevMode ? devCSP : prodCSP],
      },
    });
  });
}

function createWindow() {
  const isMac = process.platform === 'darwin';
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'ZeroClaw Desktop',
    icon: path.join(__dirname, '../resources/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    frame: isMac ? true : false,
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    trafficLightPosition: isMac ? { x: 15, y: 16 } : undefined,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximize-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximize-change', false);
  });

  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../resources/icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow?.show() },
    { label: '新建对话', click: () => mainWindow?.webContents.send('action:new-chat') },
    { type: 'separator' },
    { label: '退出', click: () => {
      zeroclawBridge?.stop();
      app.exit(0);
    }}
  ]);

  tray.setToolTip('ZeroClaw Desktop');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

function setupWindowHandlers() {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() || false;
  });
}

function initializeApp() {
  database = new Database();
  zeroclawBridge = new ZeroClawBridge(database);
  setupIpcHandlers(zeroclawBridge, database);
  setupWindowHandlers();
}

app.whenReady().then(() => {
  setupCSP();
  initializeApp();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    zeroclawBridge?.stop();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  zeroclawBridge?.stop();
  database?.close();
  if (mainWindow) {
    mainWindow.removeAllListeners();
    mainWindow = null;
  }
});

export { mainWindow, zeroclawBridge, database };

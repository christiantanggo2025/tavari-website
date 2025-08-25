const { app, BrowserWindow, ipcMain, Menu, systemPreferences } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let isLocked = false;

// Security: Prevent new-window
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets/icon.ico'),
    show: false
  });

  // Load app
  // In main.cjs, update the dev URL loading:
  if (isDev) {
    // Try common Vite ports
    const vitePort = process.env.VITE_PORT || '5173';
    mainWindow.loadURL(`http://localhost:${vitePort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates
    if (!isDev) {
      require('./autoUpdater').checkForUpdates();
    }
  });

  // Handle close
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  
  // Auto-start setup
  app.setLoginItemSettings({
    openAtLogin: true,
    name: 'Tavari Music'
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for desktop features
ipcMain.handle('get-system-info', async () => {
  return {
    platform: process.platform,
    version: process.getSystemVersion(),
    arch: process.arch,
    appVersion: app.getVersion()
  };
});

ipcMain.handle('check-for-updates', async () => {
  return require('./autoUpdater').checkForUpdates();
});

ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit();
});
const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // System information
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Update management
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // App control
  restartApp: () => ipcRenderer.invoke('restart-app'),
  
  // Audio device management
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
  
  // Installation management
  registerInstallation: (data) => ipcRenderer.invoke('register-installation', data),
  validateLicense: (key) => ipcRenderer.invoke('validate-license', key),
  
  // Health monitoring
  reportHealth: (data) => ipcRenderer.invoke('report-health', data),
  
  // File system (limited)
  selectMusicFiles: () => ipcRenderer.invoke('select-music-files'),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body)
});

// Prevent access to Node.js APIs
delete window.require;
delete window.exports;
delete window.module;
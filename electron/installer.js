const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class InstallerManager {
  constructor() {
    this.setupAutoStart();
    this.setupFileAssociations();
    this.setupRegistryEntries();
  }

  setupAutoStart() {
    // Configure app to start with Windows
    app.setLoginItemSettings({
      openAtLogin: true,
      name: 'Tavari Music Desktop',
      path: process.execPath,
      args: ['--auto-start']
    });
  }

  setupFileAssociations() {
    // Register file associations for .tavari files
    if (process.platform === 'win32') {
      app.setAsDefaultProtocolClient('tavari-music');
    }
  }

  setupRegistryEntries() {
    // Windows registry entries for proper integration
    if (process.platform === 'win32') {
      const registryEntries = {
        'HKEY_CURRENT_USER\\Software\\Tavari\\Music Desktop': {
          'InstallPath': app.getAppPath(),
          'Version': app.getVersion(),
          'InstallDate': new Date().toISOString()
        }
      };
      
      // Registry entries would be handled by the installer
      console.log('Registry entries prepared:', registryEntries);
    }
  }

  createUninstaller() {
    // Cleanup script for uninstallation
    const uninstallScript = `
      @echo off
      echo Removing Tavari Music Desktop...
      
      REM Stop the application
      taskkill /f /im "Tavari Music Desktop.exe" 2>nul
      
      REM Remove auto-start entry
      reg delete "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Tavari Music Desktop" /f 2>nul
      
      REM Remove application data (optional)
      if exist "%APPDATA%\\Tavari\\Music Desktop" (
        rmdir /s /q "%APPDATA%\\Tavari\\Music Desktop"
      )
      
      echo Uninstall complete.
      pause
    `;
    
    return uninstallScript;
  }

  getInstallationInfo() {
    return {
      appPath: app.getAppPath(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      installDate: new Date().toISOString()
    };
  }
}

module.exports = new InstallerManager();
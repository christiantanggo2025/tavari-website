const express = require('express');
const cors = require('cors');
const { ipcMain } = require('electron');

class RemoteControlServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = 8080;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupIpcHandlers();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'remote-web')));
  }

  setupRoutes() {
    // System information
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'online',
        version: require('../package.json').version,
        timestamp: new Date().toISOString()
      });
    });

    // Music control endpoints
    this.app.post('/api/music/play', (req, res) => {
      mainWindow.webContents.send('remote-command', { action: 'play' });
      res.json({ success: true, action: 'play' });
    });

    this.app.post('/api/music/pause', (req, res) => {
      mainWindow.webContents.send('remote-command', { action: 'pause' });
      res.json({ success: true, action: 'pause' });
    });

    this.app.post('/api/music/skip', (req, res) => {
      mainWindow.webContents.send('remote-command', { action: 'skip' });
      res.json({ success: true, action: 'skip' });
    });

    this.app.post('/api/music/volume', (req, res) => {
      const { volume } = req.body;
      if (volume >= 0 && volume <= 1) {
        mainWindow.webContents.send('remote-command', { action: 'volume', value: volume });
        res.json({ success: true, action: 'volume', volume });
      } else {
        res.status(400).json({ error: 'Volume must be between 0 and 1' });
      }
    });

    // Current track information
    this.app.get('/api/music/current', (req, res) => {
      // This would be handled by IPC to get current track from renderer
      mainWindow.webContents.send('remote-request', { action: 'getCurrentTrack' });
      // Response would be sent back via IPC
    });

    // Playlist management
    this.app.get('/api/playlists', (req, res) => {
      mainWindow.webContents.send('remote-request', { action: 'getPlaylists' });
    });

    this.app.post('/api/playlists/:id/play', (req, res) => {
      const playlistId = req.params.id;
      mainWindow.webContents.send('remote-command', { action: 'playPlaylist', playlistId });
      res.json({ success: true, action: 'playPlaylist', playlistId });
    });

    // Remote control web interface
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'remote-web', 'index.html'));
    });
  }

  setupIpcHandlers() {
    ipcMain.handle('start-remote-server', async () => {
      return this.start();
    });

    ipcMain.handle('stop-remote-server', async () => {
      return this.stop();
    });

    ipcMain.handle('get-server-info', async () => {
      return {
        running: !!this.server,
        port: this.port,
        url: `http://localhost:${this.port}`
      };
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, 'localhost', () => {
        console.log(`Remote control server started on http://localhost:${this.port}`);
        resolve({
          success: true,
          port: this.port,
          url: `http://localhost:${this.port}`
        });
      });

      this.server.on('error', (error) => {
        console.error('Remote server error:', error);
        reject(error);
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          console.log('Remote control server stopped');
          resolve({ success: true });
        });
      } else {
        resolve({ success: true });
      }
    });
  }

  getNetworkInterfaces() {
    const interfaces = require('os').networkInterfaces();
    const addresses = [];
    
    for (const name in interfaces) {
      for (const interface of interfaces[name]) {
        if (interface.family === 'IPv4' && !interface.internal) {
          addresses.push({
            name,
            address: interface.address,
            url: `http://${interface.address}:${this.port}`
          });
        }
      }
    }
    
    return addresses;
  }
}

module.exports = new RemoteControlServer();
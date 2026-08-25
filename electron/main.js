const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'server', 'server.js');
    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, MEDITRACK_PORT: '3001' }
    });
    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[Server]', msg);
      if (msg.includes('running on port')) resolve();
    });
    serverProcess.stderr.on('data', (data) => {
      console.error('[Server]', data.toString());
    });
    serverProcess.on('error', (err) => {
      console.error('Server error:', err);
      resolve();
    });
    setTimeout(() => resolve(), 3000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'MediTrack',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.loadURL('http://localhost:3333/');
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (e) {
    console.error('Failed to start server:', e);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    setTimeout(() => { serverProcess.kill('SIGKILL'); }, 3000);
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
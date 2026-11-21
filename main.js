'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  screen,
  session,
  shell,
  systemPreferences,
} = require('electron');
const config = require('./config.json');
const { isAppUrl, isSafeExternal } = require('./lib/security');

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 820;
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 700;
const OFFLINE_HTML_PATH = path.join(__dirname, 'offline.html');
const OFFLINE_FILE_URL = pathToFileURL(OFFLINE_HTML_PATH).href;
const ALLOWED_PERMISSIONS = new Set(['media', 'fullscreen', 'clipboard-sanitized-write']);

function resolveAppUrl() {
  if (!app.isPackaged && typeof process.env.AURA_APP_URL === 'string' && process.env.AURA_APP_URL.trim()) {
    try {
      const parsed = new URL(process.env.AURA_APP_URL.trim());
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.toString();
      }
    } catch {
      // Fall back to config.json appUrl if AURA_APP_URL is malformed
    }
  }
  return config.appUrl;
}

const APP_URL = resolveAppUrl();
const APP_ORIGIN = new URL(APP_URL).origin;

let mainWindow = null;

function getStateFilePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const raw = fs.readFileSync(getStateFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    const width = Number.isFinite(parsed.width) && parsed.width >= MIN_WIDTH ? Math.round(parsed.width) : DEFAULT_WIDTH;
    const height = Number.isFinite(parsed.height) && parsed.height >= MIN_HEIGHT ? Math.round(parsed.height) : DEFAULT_HEIGHT;
    const state = {
      width,
      height,
      isMaximized: Boolean(parsed.isMaximized),
    };
    if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
      const displays = screen.getAllDisplays();
      const visibleOnAnyDisplay = displays.some((d) => {
        const b = d.workArea;
        return (
          parsed.x >= b.x - width + 80 &&
          parsed.x <= b.x + b.width - 80 &&
          parsed.y >= b.y &&
          parsed.y <= b.y + b.height - 80
        );
      });
      if (visibleOnAnyDisplay) {
        state.x = Math.round(parsed.x);
        state.y = Math.round(parsed.y);
      }
    }
    return state;
  } catch {
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, isMaximized: false };
  }
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
    const payload = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    };
    fs.mkdirSync(path.dirname(getStateFilePath()), { recursive: true });
    fs.writeFileSync(getStateFilePath(), JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // Ignore filesystem errors on shutdown
  }
}

function isAuthorizedAppSender(event, allowOfflinePage = false) {
  const frameUrl = event?.senderFrame?.url;
  if (typeof frameUrl !== 'string') return false;
  if (isAppUrl(frameUrl, APP_ORIGIN)) return true;
  if (allowOfflinePage && frameUrl === OFFLINE_FILE_URL) return true;
  return false;
}

function configurePermissions() {
  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const reqUrl = details?.requestingUrl || webContents?.getURL() || '';
    const allowed = isAppUrl(reqUrl, APP_ORIGIN) && ALLOWED_PERMISSIONS.has(permission);
    callback(allowed);
  });

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const reqUrl = requestingOrigin || webContents?.getURL() || '';
    return isAppUrl(reqUrl, APP_ORIGIN) && ALLOWED_PERMISSIONS.has(permission);
  });

  if (process.platform === 'darwin' && typeof systemPreferences.askForMediaAccess === 'function') {
    try {
      Promise.resolve(systemPreferences.askForMediaAccess('camera')).catch(() => {});
    } catch {
      // Ignore macOS camera permission prompt errors
    }
  }
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const viewSubmenu = [
    { role: 'reload' },
    { role: 'forceReload' },
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    {
      label: 'Toggle Full Screen',
      accelerator: isMac ? 'Ctrl+Command+F' : 'F11',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
      },
    },
  ];

  if (!app.isPackaged) {
    viewSubmenu.push({ type: 'separator' }, { role: 'toggleDevTools' });
  }

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: viewSubmenu,
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(isMac ? [{ role: 'zoom' }, { type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open in browser',
          click: () => {
            if (isSafeExternal(APP_URL)) {
              void shell.openExternal(APP_URL);
            }
          },
        },
        {
          label: 'About Aura Kinetic',
          click: () => {
            void dialog.showMessageBox(mainWindow || undefined, {
              type: 'info',
              title: 'About Aura Kinetic',
              message: 'Aura Kinetic ERP',
              detail: `Version ${app.getVersion()}\n${APP_ORIGIN}`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpc() {
  ipcMain.handle('get-version', (event) => {
    if (!isAuthorizedAppSender(event, false)) return null;
    return app.getVersion();
  });

  ipcMain.handle('retry', (event) => {
    if (!isAuthorizedAppSender(event, true)) return false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      void mainWindow.loadURL(APP_URL);
      return true;
    }
    return false;
  });

  ipcMain.handle('set-kiosk', (event, value) => {
    if (!isAuthorizedAppSender(event, false)) return false;
    if (typeof value !== 'boolean') return false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setKiosk(value);
      return true;
    }
    return false;
  });
}

function createMainWindow() {
  const state = loadWindowState();
  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    backgroundColor: '#F2F2F4',
    show: false,
    title: 'Aura Kinetic ERP',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  const baseUa = win.webContents.getUserAgent();
  win.webContents.setUserAgent(`${baseUa} AuraDesktop/${app.getVersion()}`);

  win.once('ready-to-show', () => {
    if (state.isMaximized) {
      win.maximize();
    }
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url, APP_ORIGIN)) {
      void win.loadURL(url);
      return { action: 'deny' };
    }
    if (isSafeExternal(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url, APP_ORIGIN)) return;
    event.preventDefault();
    if (isSafeExternal(url)) {
      void shell.openExternal(url);
    }
  });

  win.webContents.on('did-fail-load', (_event, errorCode, _errorDescription, _validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    void win.loadFile(OFFLINE_HTML_PATH);
  });

  win.on('close', () => {
    saveWindowState(win);
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  mainWindow = win;
  void win.loadURL(APP_URL);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.aurakinetic.desktop');
  }
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    configurePermissions();
    registerIpc();
    buildMenu();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('auraDesktop', {
  isDesktop: true,
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('get-version'),
  retry: () => ipcRenderer.invoke('retry'),
  setKiosk: (on) => ipcRenderer.invoke('set-kiosk', !!on),
});

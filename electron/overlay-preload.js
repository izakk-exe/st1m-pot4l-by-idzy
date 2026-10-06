const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ovApi', {
  onInput: (cb) => ipcRenderer.on('ov:in', (_e, m) => cb(m)),
  onConfig: (cb) => ipcRenderer.on('ov:cfg', (_e, c) => cb(c)),
});

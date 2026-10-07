const { contextBridge, ipcRenderer } = require('electron');
const inv = (c, ...a) => ipcRenderer.invoke('apex:' + c, ...a);
contextBridge.exposeInMainWorld('stApi', {
  detect: () => inv('detect'),
  pickFolder: () => inv('pickFolder'),
  read: (k) => inv('read', k),
  write: (k, t, o) => inv('write', k, t, o),
  restore: (k, w) => inv('restore', k, w),
  setLock: (k, l) => inv('setLock', k, l),
  status: () => inv('status'),
  openFolder: () => inv('openFolder'),
  apexRunning: () => inv('apexRunning'),
  // game launcher
  gameDetect: () => ipcRenderer.invoke('game:detect'),
  gamePickExe: () => ipcRenderer.invoke('game:pickExe'),
  gameLaunch: (o) => ipcRenderer.invoke('game:launch', o),
  // stretched resolution
  displayInfo: () => ipcRenderer.invoke('display:info'),
  displayTest: (w, h) => ipcRenderer.invoke('display:test', w, h),
  displayRestore: () => ipcRenderer.invoke('display:restore'),
  displayActive: () => ipcRenderer.invoke('display:active'),
  onDisplayRestored: (cb) => ipcRenderer.on('display:restored', () => cb()),
  // background video
  bgVideo: () => ipcRenderer.invoke('bg:video'),
  bgPickVideo: () => ipcRenderer.invoke('bg:pickVideo'),
  bgClearVideo: () => ipcRenderer.invoke('bg:clearVideo'),
  // player stats
  playerHasKey: () => ipcRenderer.invoke('player:hasKey'),
  playerSetKey: (k) => ipcRenderer.invoke('player:setKey', k),
  playerFetch: (kind, q) => ipcRenderer.invoke('player:fetch', kind, q),
  // movement lab
  hubBundled: () => ipcRenderer.invoke('hub:bundled'),
  updateCheck: (lang) => ipcRenderer.invoke('update:check', lang),
  // keyboard / mouse overlay
  overlaySet: (cfg) => ipcRenderer.invoke('overlay:set', cfg),
  onOverlayState: (cb) => ipcRenderer.on('overlay:state', (_e, cfg) => cb(cfg)),
});

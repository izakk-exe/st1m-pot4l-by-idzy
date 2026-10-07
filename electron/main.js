// ST1M PORT4L by idZy — Electron main process
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, screen, globalShortcut, nativeImage, safeStorage, net } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { pathToFileURL } = require('url');

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
let root = null; // Saved Games\Respawn\Apex
let tray = null;
let quitting = false;

// =============================================================== Apex config files
const FILES = {
  video: () => path.join(root, 'local', 'videoconfig.txt'),
  settings: () => path.join(root, 'local', 'settings.cfg'),
  profile: () => {
    const a = path.join(root, 'profile', 'profile.cfg');
    const b = path.join(root, 'local', 'profile.cfg');
    return !fs.existsSync(a) && fs.existsSync(b) ? b : a;
  },
};
const fileOf = (k) => {
  if (!FILES[k] || !root) throw new Error('invalid file key / no folder');
  return FILES[k]();
};

function candidates() {
  const list = [path.join(os.homedir(), 'Saved Games', 'Respawn', 'Apex')];
  for (const v of [process.env.OneDrive, process.env.OneDriveConsumer, process.env.OneDriveCommercial])
    if (v) list.push(path.join(v, 'Saved Games', 'Respawn', 'Apex'));
  return list;
}
function detect(forced) {
  if (forced) root = forced;
  else if (!root) root = candidates().find((p) => fs.existsSync(p)) || candidates()[0];
  const files = {};
  for (const k of Object.keys(FILES)) files[k] = { path: FILES[k](), exists: fs.existsSync(FILES[k]()) };
  return { root, exists: fs.existsSync(root), files };
}

ipcMain.handle('apex:detect', () => detect());
ipcMain.handle('apex:pickFolder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'], defaultPath: root || os.homedir(), title: 'Saved Games\\Respawn\\Apex' });
  if (r.canceled || !r.filePaths[0]) return null;
  return detect(r.filePaths[0]);
});
ipcMain.handle('apex:read', (_e, k) => {
  const p = fileOf(k);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '') : null;
});
ipcMain.handle('apex:write', (_e, k, text, opts) => {
  if (typeof text !== 'string' || text.length > 5e6) throw new Error('bad payload');
  const p = fileOf(k);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (fs.existsSync(p)) {
    try { fs.chmodSync(p, 0o666); } catch (_) {}
    if (!fs.existsSync(p + '.st1m.bak')) fs.copyFileSync(p, p + '.st1m.bak');
    fs.copyFileSync(p, p + '.st1m.last.bak');
  }
  fs.writeFileSync(p, text, 'utf8');
  if (opts && opts.lock) fs.chmodSync(p, 0o444);
  return { ok: true };
});
ipcMain.handle('apex:restore', (_e, k, which) => {
  const p = fileOf(k);
  const b = p + (which === 'original' ? '.st1m.bak' : '.st1m.last.bak');
  if (!fs.existsSync(b)) return { ok: false, error: 'no backup' };
  try { fs.chmodSync(p, 0o666); } catch (_) {}
  fs.copyFileSync(b, p);
  return { ok: true };
});
ipcMain.handle('apex:setLock', (_e, k, lock) => {
  const p = fileOf(k);
  if (!fs.existsSync(p)) return { ok: false, error: 'missing' };
  fs.chmodSync(p, lock ? 0o444 : 0o666);
  return { ok: true };
});
ipcMain.handle('apex:status', () => {
  const s = {};
  for (const k of Object.keys(FILES)) {
    const p = FILES[k]();
    s[k] = { exists: fs.existsSync(p), readonly: fs.existsSync(p) && !(fs.statSync(p).mode & 0o200),
      bakOriginal: fs.existsSync(p + '.st1m.bak'), bakLast: fs.existsSync(p + '.st1m.last.bak') };
  }
  return s;
});
ipcMain.handle('apex:openFolder', () => (root ? shell.openPath(root).then(() => true) : false));

function apexRunning() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(false);
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true }, (err, out) => resolve(!err && /r5apex/i.test(out)));
  });
}
ipcMain.handle('apex:apexRunning', () => apexRunning());

// =============================================================== launching the game
const APEX_STEAM_ID = '1172470';
const EXE_NAMES = ['r5apex.exe', 'r5apex_dx12.exe'];

function steamLibraries() {
  const libs = [];
  for (const base of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles].filter(Boolean)) {
    const steam = path.join(base, 'Steam');
    if (!fs.existsSync(steam)) continue;
    libs.push(steam);
    try {
      const vdf = fs.readFileSync(path.join(steam, 'steamapps', 'libraryfolders.vdf'), 'utf8');
      for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) libs.push(m[1].replace(/\\\\/g, '\\'));
    } catch (_) {}
  }
  return libs;
}
function detectGame() {
  const steamExe = steamLibraries().map((l) => path.join(l, 'steamapps', 'common', 'Apex Legends', 'r5apex.exe')).find((p) => fs.existsSync(p)) || null;
  const pf = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files', 'D:\\Program Files', 'D:\\Games'].filter(Boolean);
  const eaExe = pf.flatMap((b) => [path.join(b, 'EA Games', 'Apex', 'r5apex.exe'), path.join(b, 'EA Games', 'Apex Legends', 'r5apex.exe'), path.join(b, 'Origin Games', 'Apex', 'r5apex.exe')])
    .find((p) => fs.existsSync(p)) || null;
  const steamInstalled = steamLibraries().length > 0;
  return { steam: { installed: steamInstalled, exe: steamExe }, ea: { exe: eaExe } };
}
ipcMain.handle('game:detect', async () => ({ ...detectGame(), running: await apexRunning() }));
ipcMain.handle('game:pickExe', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Apex Legends', extensions: ['exe'] }], title: 'r5apex.exe' });
  if (r.canceled || !r.filePaths[0]) return null;
  return EXE_NAMES.includes(path.basename(r.filePaths[0]).toLowerCase()) ? r.filePaths[0] : { error: 'not-apex' };
});
ipcMain.handle('game:launch', async (_e, o) => {
  o = o || {};
  const args = String(o.args || '').trim().slice(0, 400);
  if (!/^[\w+\-. =,]*$/.test(args)) return { ok: false, error: 'invalid launch options' };
  if (await apexRunning()) return { ok: false, error: 'running' };
  let stretch = null;
  if (o.stretch) {
    const r = await startStretch(o.stretch.w, o.stretch.h);
    if (!r.ok) return { ok: false, error: 'stretch:' + (r.error || 'failed'), detail: r };
    stretch = r;
  }
  if (o.mode === 'steam') {
    await shell.openExternal(`steam://run/${APEX_STEAM_ID}//${encodeURIComponent(args)}/`);
    return { ok: true, stretch: !!stretch, scalingCode: stretch ? stretch.scalingCode : 0 };
  }
  const exe = String(o.exe || '');
  if (!EXE_NAMES.includes(path.basename(exe).toLowerCase()) || !fs.existsSync(exe)) { if (stretch) await stopStretch(); return { ok: false, error: 'exe-missing' }; }
  const child = spawn(exe, args.split(/\s+/).filter(Boolean), { detached: true, stdio: 'ignore', cwd: path.dirname(exe) });
  child.on('error', () => {});
  child.unref();
  return { ok: true, stretch: !!stretch, scalingCode: stretch ? stretch.scalingCode : 0 };
});

// =============================================================== stretched resolution (no black bars)
// The helper script is copied to userData (like the input helper) so it also works from inside app.asar.
function displayScript() {
  const dst = path.join(app.getPath('userData'), 'display-stretch.ps1');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, fs.readFileSync(path.join(__dirname, 'display-stretch.ps1'), 'utf8'), 'utf8');
  return dst;
}
const PS_ARGS = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File'];
let stretchProc = null;
const intIn = (v, lo, hi) => { v = Math.round(Number(v)); return Number.isFinite(v) && v >= lo && v <= hi ? v : null; };
function psJson(args, timeout) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve({ ok: false, error: 'windows-only' });
    execFile('powershell.exe', [...PS_ARGS, displayScript(), ...args], { windowsHide: true, timeout: timeout || 15000 }, (err, out) => {
      try { resolve(JSON.parse(String(out).trim().split(/\r?\n/).pop())); } catch (_) { resolve({ ok: false, error: err ? 'helper' : 'parse' }); }
    });
  });
}
async function stopStretch() {
  if (stretchProc) { try { stretchProc.kill(); } catch (_) {} stretchProc = null; }
  return psJson(['-Action', 'reset']);
}
async function startStretch(w, h) {
  w = intIn(w, 640, 7680); h = intIn(h, 480, 4320);
  if (!w || !h) return { ok: false, error: 'size' };
  if (stretchProc) await stopStretch();
  return new Promise((resolve) => {
    let done = false, buf = '';
    const fin = (r) => { if (!done) { done = true; resolve(r); } };
    const p = spawn('powershell.exe', [...PS_ARGS, displayScript(), '-Action', 'stretch', '-W', String(w), '-H', String(h)], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    stretchProc = p;
    p.stdout.on('data', (d) => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        let j = null; try { j = JSON.parse(line); } catch (_) {}
        if (!j) continue;
        if (j.restored) { if (stretchProc === p) stretchProc = null; if (win && !win.isDestroyed()) win.webContents.send('display:restored'); } else fin(j);
      }
    });
    p.on('exit', () => { if (stretchProc === p) stretchProc = null; fin({ ok: false, error: 'helper' }); });
    p.on('error', () => fin({ ok: false, error: 'helper' }));
    setTimeout(() => fin({ ok: false, error: 'timeout' }), 12000);
  });
}
ipcMain.handle('display:info', () => psJson(['-Action', 'info']));
ipcMain.handle('display:test', (_e, w, h) => {
  w = intIn(w, 640, 7680); h = intIn(h, 480, 4320);
  return w && h ? psJson(['-Action', 'stretch', '-W', String(w), '-H', String(h), '-TestOnly']) : { ok: false, error: 'size' };
});
ipcMain.handle('display:restore', () => stopStretch());
ipcMain.handle('display:active', () => !!stretchProc);

// =============================================================== background video (the user's own file, kept in userData — never shipped with the app)
const bgVideoFile = () => path.join(app.getPath('userData'), 'background-video.mp4');
const bgVideoUrl = () => { try { const p = bgVideoFile(); return fs.existsSync(p) ? pathToFileURL(p).href + '?v=' + Math.round(fs.statSync(p).mtimeMs) : null; } catch (_) { return null; } };
ipcMain.handle('bg:video', () => bgVideoUrl());
ipcMain.handle('bg:pickVideo', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Video', extensions: ['mp4', 'm4v', 'webm'] }] });
  if (r.canceled || !r.filePaths[0]) return { canceled: true };
  try {
    const st = fs.statSync(r.filePaths[0]);
    if (st.size > 300 * 1024 * 1024) return { error: 'too-big' };
    fs.mkdirSync(path.dirname(bgVideoFile()), { recursive: true });
    fs.copyFileSync(r.filePaths[0], bgVideoFile());
    return { url: bgVideoUrl() };
  } catch (e) { return { error: String(e.message || e).slice(0, 120) }; }
});
ipcMain.handle('bg:clearVideo', () => { try { fs.unlinkSync(bgVideoFile()); } catch (_) {} return true; });

// =============================================================== player stats (Apex Legends Status API, user's own key)
const API_HOST = 'https://api.apexlegendsstatus.com';
const keyFile = () => path.join(app.getPath('userData'), 'apikey.bin');
function readKey() {
  try {
    const raw = fs.readFileSync(keyFile());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8');
  } catch (_) { return ''; }
}
ipcMain.handle('player:hasKey', () => !!readKey());
ipcMain.handle('player:setKey', (_e, k) => {
  k = String(k || '').trim();
  if (!k) { try { fs.unlinkSync(keyFile()); } catch (_) {} return { ok: true, has: false }; }
  if (!/^[\w-]{8,80}$/.test(k)) return { ok: false, error: 'invalid-key' };
  try { fs.writeFileSync(keyFile(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(k) : Buffer.from(k)); return { ok: true, has: true }; } catch (e) { return { ok: false, error: e.message }; }
});
const PLATFORMS = ['PC', 'PS4', 'X1', 'SWITCH'];
ipcMain.handle('player:fetch', async (_e, kind, q) => {
  q = q || {};
  const key = readKey();
  if (!key) return { ok: false, error: 'no-key' };
  if (!['bridge', 'predator', 'leaderboard'].includes(kind)) return { ok: false, error: 'bad-kind' };
  const u = new URL(API_HOST + '/' + kind);
  if (kind === 'bridge') {
    const name = String(q.player || '').trim();
    if (!/^[\w .\-[\]|]{1,40}$/.test(name) || !PLATFORMS.includes(q.platform)) return { ok: false, error: 'bad-player' };
    u.searchParams.set('player', name); u.searchParams.set('platform', q.platform);
  } else if (kind === 'leaderboard') {
    const legend = String(q.legend || 'Global'), plat = q.platform || 'PC';
    if (!/^[A-Za-z ]{1,24}$/.test(legend) || ![...PLATFORMS, 'ANY'].includes(plat)) return { ok: false, error: 'bad-query' };
    u.searchParams.set('legend', legend); u.searchParams.set('platform', plat);
    if (q.key && /^\w{1,40}$/.test(q.key)) u.searchParams.set('key', q.key);
  }
  try {
    const r = await net.fetch(u.toString(), { headers: { Authorization: key }, signal: AbortSignal.timeout(12000) });
    const text = await r.text();
    let data = null; try { data = JSON.parse(text); } catch (_) {}
    const plain = !data ? text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) : '';
    const msg = data ? (data.Error || data.error || data.message) : plain;
    if (!r.ok || !data) return { ok: false, error: r.ok ? 'api' : 'http-' + r.status, status: r.status, message: msg ? String(msg).slice(0, 200) : '' };
    if (msg) return { ok: false, error: 'api', message: String(msg).slice(0, 200) };
    return { ok: true, data };
  } catch (e) { return { ok: false, error: 'network', message: String(e.message || e).slice(0, 120) }; }
});

// =============================================================== movement lab data + auto-update
ipcMain.handle('hub:bundled', () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'community.json'), 'utf8')));

let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; autoUpdater.autoDownload = false; autoUpdater.autoInstallOnAppQuit = true; } catch (_) {}
const T2 = (lang, fr, en) => (lang === 'en' ? en : fr);
async function checkForUpdate(lang, silent) {
  if (!autoUpdater || !app.isPackaged) return { message: T2(lang, 'Les mises à jour ne sont disponibles que dans la version installée.', 'Updates are only available in the installed version.') };
  if (process.env.PORTABLE_EXECUTABLE_DIR) return { message: T2(lang, 'Version portable : télécharge la nouvelle version depuis la page des releases.', 'Portable version: download the new version from the releases page.') };
  if (!fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'))) return { message: T2(lang, 'Mises à jour non configurées (dépôt GitHub manquant dans package.json).', 'Updates not configured (GitHub repo missing in package.json).') };
  try {
    const r = await autoUpdater.checkForUpdates();
    const v = r && r.updateInfo && r.updateInfo.version;
    if (!r || !r.isUpdateAvailable || !v) return { message: T2(lang, `Tu as la dernière version (${app.getVersion()}).`, `You are up to date (${app.getVersion()}).`) };
    const ask = await dialog.showMessageBox(win, { type: 'info', buttons: [T2(lang, 'Télécharger', 'Download'), T2(lang, 'Plus tard', 'Later')], defaultId: 0, cancelId: 1, title: 'ST1M PORT4L', message: T2(lang, `La version ${v} est disponible.`, `Version ${v} is available.`) });
    if (ask.response !== 0) return { message: T2(lang, `Version ${v} disponible.`, `Version ${v} available.`) };
    autoUpdater.once('update-downloaded', async () => {
      const q = await dialog.showMessageBox(win, { type: 'question', buttons: [T2(lang, 'Redémarrer maintenant', 'Restart now'), T2(lang, 'Au prochain lancement', 'Next launch')], defaultId: 0, cancelId: 1, title: 'ST1M PORT4L', message: T2(lang, 'Mise à jour téléchargée.', 'Update downloaded.') });
      if (q.response === 0) { quitting = true; autoUpdater.quitAndInstall(); }
    });
    await autoUpdater.downloadUpdate();
    return { message: T2(lang, 'Téléchargement terminé.', 'Download complete.') };
  } catch (e) { return { message: (silent ? '' : T2(lang, 'Échec de la vérification : ', 'Update check failed: ')) + (e.message || e) }; }
}
ipcMain.handle('update:check', (_e, lang) => checkForUpdate(lang, false));

// =============================================================== keyboard / mouse overlay
let ov = null;        // overlay BrowserWindow
let helper = null;    // raw-input helper process
let ovCfg = null;     // last validated config
let ovTimer = null;
const ANCHORS = ['bl', 'bc', 'br', 'tl', 'tc', 'tr', 'cl', 'cc', 'cr'];
const BASE = 380, TL_H = 96;

function cleanCfg(c) {
  c = c || {};
  const num = (v, lo, hi, d) => (isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
  return {
    on: !!c.on, auto: c.auto !== false,
    anchor: ANCHORS.includes(c.anchor) ? c.anchor : 'bl',
    ox: num(c.ox, -1500, 1500, 0), oy: num(c.oy, -1500, 1500, 0),
    scale: num(c.scale, 0.4, 2.5, 1), opacity: num(c.opacity, 0.2, 1, 1),
    color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#7cff3a',
    ring: c.ring !== false, glow: c.glow !== false,
    shift: !!c.shift, ctrl: !!c.ctrl, space: !!c.space, mouse: !!c.mouse,
    wheel: !!c.wheel, timeline: !!c.timeline, m45: !!c.m45,
  };
}

function overlayBounds(c) {
  const d = screen.getPrimaryDisplay().bounds;
  const w = Math.round(BASE * c.scale), h = Math.round((BASE + (c.timeline ? TL_H : 0)) * c.scale), m = 20;
  const a = c.anchor;
  const x = a[1] === 'l' ? d.x + m : a[1] === 'r' ? d.x + d.width - w - m : d.x + Math.round((d.width - w) / 2);
  const y = a[0] === 't' ? d.y + m : a[0] === 'b' ? d.y + d.height - h - m : d.y + Math.round((d.height - h) / 2);
  return { x: x + Math.round(c.ox), y: y + Math.round(c.oy), width: w, height: h };
}

function helperScriptPath() {
  const dst = path.join(app.getPath('userData'), 'input-helper.ps1');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, fs.readFileSync(path.join(__dirname, 'input-helper.ps1'), 'utf8'), 'utf8');
  return dst;
}
function startHelper() {
  if (helper || process.platform !== 'win32') return;
  helper = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', helperScriptPath()],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = '';
  helper.stdout.on('data', (d) => {
    buf += d.toString('utf8');
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      const p = line.split(' ');
      if (!ov || ov.isDestroyed()) continue;
      if (p[0] === 'K') ov.webContents.send('ov:in', { t: 'K', vk: +p[1], down: p[2] === '1' });
      else if (p[0] === 'M') ov.webContents.send('ov:in', { t: 'M', dx: +p[1], dy: +p[2] });
      else if (p[0] === 'B') ov.webContents.send('ov:in', { t: 'B', b: +p[1], down: p[2] === '1' });
      else if (p[0] === 'W') ov.webContents.send('ov:in', { t: 'W', dir: +p[1] });
    }
  });
  helper.on('exit', () => { helper = null; });
  helper.on('error', () => { helper = null; });
}
function stopHelper() {
  if (!helper) return;
  try { helper.stdin.end(); } catch (_) {}
  const h = helper; helper = null;
  setTimeout(() => { try { h.kill(); } catch (_) {} }, 800);
}
function ensureOverlayWindow() {
  if (ov && !ov.isDestroyed()) return;
  ov = new BrowserWindow({
    ...overlayBounds(ovCfg), transparent: true, frame: false, resizable: false, movable: false, skipTaskbar: true, focusable: false,
    alwaysOnTop: true, hasShadow: false, show: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'overlay-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  ov.setAlwaysOnTop(true, 'screen-saver');
  ov.setIgnoreMouseEvents(true);
  ov.loadFile(path.join(__dirname, '..', 'src', 'overlay.html'));
  ov.webContents.on('did-finish-load', () => ov && !ov.isDestroyed() && ov.webContents.send('ov:cfg', ovCfg));
  ov.on('closed', () => { ov = null; });
}
async function refreshOverlay() {
  if (!ovCfg || !ovCfg.on) { stopOverlay(); return; }
  const visible = ovCfg.auto ? await apexRunning() : true;
  if (!visible) { if (ov && !ov.isDestroyed()) ov.hide(); stopHelper(); return; }
  ensureOverlayWindow();
  ov.setBounds(overlayBounds(ovCfg));
  ov.webContents.send('ov:cfg', ovCfg);
  if (!ov.isVisible()) ov.showInactive();
  startHelper();
}
function stopOverlay() {
  stopHelper();
  if (ov && !ov.isDestroyed()) ov.destroy();
  ov = null;
}
function applyOverlay(cfg) {
  ovCfg = cleanCfg(cfg);
  clearInterval(ovTimer);
  refreshOverlay();
  if (ovCfg.on && ovCfg.auto) ovTimer = setInterval(refreshOverlay, 4000);
  updateTray();
  return ovCfg;
}
ipcMain.handle('overlay:set', (_e, cfg) => ({ ok: true, cfg: applyOverlay(cfg), supported: process.platform === 'win32' }));
ipcMain.handle('overlay:toggle', () => { applyOverlay({ ...(ovCfg || {}), on: !(ovCfg && ovCfg.on) }); if (win) win.webContents.send('overlay:state', ovCfg); return ovCfg.on; });

// =============================================================== window / tray
function updateTray() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'ST1M PORT4L', enabled: false },
    { label: 'Ouvrir / Open', click: showMain },
    { label: ovCfg && ovCfg.on ? 'Overlay : ON (Ctrl+Shift+O)' : 'Overlay : OFF (Ctrl+Shift+O)', click: toggleOverlayFromMain },
    { type: 'separator' },
    { label: 'Quitter / Quit', click: () => { quitting = true; app.quit(); } },
  ]));
}
function toggleOverlayFromMain() {
  applyOverlay({ ...(ovCfg || {}), on: !(ovCfg && ovCfg.on) });
  if (win && !win.isDestroyed()) win.webContents.send('overlay:state', ovCfg);
}
function showMain() { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } else createWindow(); }

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 980, minHeight: 640,
    backgroundColor: '#000000', title: 'ST1M PORT4L', autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  // keep running in the tray while the overlay is on
  win.on('close', (e) => {
    if (!quitting && ovCfg && ovCfg.on && tray) { e.preventDefault(); win.hide(); }
  });
  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  createWindow();
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.png')).resize({ width: 16, height: 16 }));
    tray.setToolTip('ST1M PORT4L by idZy');
    tray.on('click', showMain);
    updateTray();
  } catch (_) {}
  globalShortcut.register('Control+Shift+O', toggleOverlayFromMain);
});
app.on('second-instance', showMain);
app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); stopOverlay(); if (stretchProc) { try { stretchProc.kill(); } catch (_) {} } });
app.on('window-all-closed', () => { if (quitting || !(ovCfg && ovCfg.on)) app.quit(); });

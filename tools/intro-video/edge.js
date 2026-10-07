// Launch headless Edge and expose a tiny CDP client.
const { spawn } = require('child_process'); const http = require('http'); const path = require('path'); const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, (r) => { let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));
exports.launch = async function (url, opts = {}) {
  const port = opts.port || 9444; const profile = path.join(process.env.TEMP, 'st1m-edge-video'); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  const edge = spawn(process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--autoplay-policy=no-user-gesture-required', '--enable-features=WebCodecs', '--window-size=1400,900', url], { stdio: 'ignore' });
  let targets; for (let i = 0; i < 60; i++) { try { targets = await getJson(`http://127.0.0.1:${port}/json/list`); if (targets.find((t) => t.type === 'page' && t.url.startsWith('http'))) break; } catch (e) {} await sleep(300); }
  const page = targets.find((t) => t.type === 'page' && t.url.startsWith('http')) || targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr, timeoutMs) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: timeoutMs }); if (r.result && r.result.exceptionDetails) { const e = r.result.exceptionDetails; return { __error: (e.exception && (e.exception.description || e.exception.value)) || e.text }; } return r.result.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  return { ev, send, sleep, close: () => { try { ws.close(); } catch (e) {} edge.kill(); } };
};

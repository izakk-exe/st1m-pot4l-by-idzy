/* ST1M PORT4L — keyboard / mouse overlay renderer.
 * Input arrives as {t:'K',vk,down} | {t:'M',dx,dy} | {t:'B',b,down} from the Electron main process
 * (or via postMessage when shown as a live preview inside the app). */
(function () {
  const BASE = 380;
  const cfg = { color: '#7cff3a', ring: true, glow: true, shift: false, ctrl: false, space: false, mouse: false, wheel: false, timeline: false, m45: false, opacity: 1, scale: 1, preview: false };
  const VK = { 87: 'w', 65: 'a', 83: 's', 68: 'd', 16: 'shift', 17: 'ctrl', 32: 'space', 67: 'c' };
  const TL_H = 96, SPAN = 3000;
  const lanes = { jump: [], crouch: [], scroll: [] }; // timeline events
  const wheelTimes = []; let wheelDir = 0, wheelAt = 0;
  const down = new Set();
  const stage = document.getElementById('stage'), keysEl = document.getElementById('keys'), cv = document.getElementById('ring'), g = cv.getContext('2d');
  const qs = new URLSearchParams(location.search);
  if (qs.get('preview')) cfg.preview = true;

  // ---- keys layout
  function keyEl(id, label, cls) { const d = document.createElement('div'); d.className = 'key ' + (cls || ''); d.dataset.k = id; d.textContent = label; return d; }
  function rowEl(items) { const r = document.createElement('div'); r.className = 'row'; items.forEach((i) => r.appendChild(i)); return r; }
  let ringR = 125;
  function layout() {
    keysEl.innerHTML = '';
    keysEl.appendChild(rowEl([keyEl('w', 'W')]));
    keysEl.appendChild(rowEl([keyEl('a', 'A'), keyEl('s', 'S'), keyEl('d', 'D')]));
    const extra = [];
    if (cfg.ctrl) extra.push(keyEl('ctrl', 'CTRL', 'w2'));
    if (cfg.shift) extra.push(keyEl('shift', 'SHIFT', 'w2'));
    if (extra.length) keysEl.appendChild(rowEl(extra));
    if (cfg.space) keysEl.appendChild(rowEl([keyEl('space', 'SPACE', 'w3')]));
    if (cfg.mouse) keysEl.appendChild(rowEl([keyEl('m1', 'LMB', 'w2'), keyEl('m2', 'RMB', 'w2')].concat(cfg.m45 ? [keyEl('m4', 'M4'), keyEl('m5', 'M5')] : [])));
    else if (cfg.m45) keysEl.appendChild(rowEl([keyEl('m4', 'M4', 'w2'), keyEl('m5', 'M5', 'w2')]));
    if (cfg.wheel) { const w = document.createElement('div'); w.className = 'key wheel'; w.innerHTML = '<span class="ar" id="wup">▲</span><span class="cnt" id="wcnt">0/s</span><span class="ar" id="wdn">▼</span>'; keysEl.appendChild(rowEl([w])); }
    const rows = 2 + (extra.length ? 1 : 0) + (cfg.space ? 1 : 0) + (cfg.mouse || cfg.m45 ? 1 : 0) + (cfg.wheel ? 1 : 0);
    const h = rows * 52 + (rows - 1) * 6, w = Math.max(3 * 52 + 12, extra.length * 83 + 6, cfg.space ? 114 : 0, cfg.mouse ? (cfg.m45 ? 232 : 172) : 0, cfg.wheel ? 136 : 0);
    ringR = Math.min(BASE / 2 - 14, Math.ceil(Math.hypot(w / 2, h / 2)) + 22); // ring surrounds every key
    paint();
  }
  function paint() { keysEl.querySelectorAll('.key').forEach((k) => k.classList.toggle('on', down.has(k.dataset.k))); }

  // ---- ring + dot
  let vx = 0, vy = 0, ang = -Math.PI / 2, energy = 0; const trail = [];
  function hex(c, a) { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function frame(now) {
    const sp = Math.hypot(vx, vy);
    if (sp > 0.4) {
      const target = Math.atan2(vy, vx); let d = target - ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      ang += d * 0.4;
      energy = Math.max(energy, Math.min(1, sp / 14));
      trail.push({ a: ang, t: now, e: Math.min(1, sp / 10) });
    }
    vx *= 0.8; vy *= 0.8; energy *= 0.955;
    while (trail.length && now - trail[0].t > 380) trail.shift();

    g.clearRect(0, 0, BASE, BASE);
    if (cfg.ring) {
      const c = BASE / 2;
      g.lineCap = 'round';
      g.strokeStyle = hex(cfg.color, 0.4); g.lineWidth = 2.5; g.beginPath(); g.arc(c, c, ringR, 0, Math.PI * 2); g.stroke();
      for (let i = 1; i < trail.length; i++) {      // fading arc behind the dot
        const p = trail[i - 1], q = trail[i], age = 1 - (now - q.t) / 380;
        let da = q.a - p.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        g.strokeStyle = hex(cfg.color, Math.max(0, age) * 0.9 * q.e); g.lineWidth = 5;
        g.beginPath(); g.arc(c, c, ringR, p.a, p.a + da, da < 0); g.stroke();
      }
      if (energy > 0.03) {
        const x = c + Math.cos(ang) * ringR, y = c + Math.sin(ang) * ringR;
        if (cfg.glow) { g.shadowColor = cfg.color; g.shadowBlur = 16; }
        g.fillStyle = hex(cfg.color, Math.min(1, 0.35 + energy)); g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2); g.fill();
        g.shadowBlur = 0;
      }
    }
    drawTimeline(now); drawWheel(now);
    requestAnimationFrame(frame);
  }

  // ---- input
  function handle(m) {
    if (!m) return;
    const now = performance.now();
    if (m.t === 'K') { const k = VK[m.vk]; if (k) { track(k, m.down, now); m.down ? down.add(k) : down.delete(k); paint(); } }
    else if (m.t === 'W') { wheelTimes.push(now); wheelDir = m.dir; wheelAt = now; lanes.scroll.push({ s: now, e: now, dir: m.dir }); }
    else if (m.t === 'M') { vx += m.dx; vy += m.dy; }
    else if (m.t === 'B') { const k = 'm' + m.b; track(k, m.down, now); m.down ? down.add(k) : down.delete(k); paint(); }
  }
  // timeline bookkeeping: held keys become segments
  const LANE_OF = { space: 'jump', ctrl: 'crouch', c: 'crouch', m4: 'crouch' };
  function track(k, isDown, now) {
    const ln = LANE_OF[k]; if (!ln) return; const arr = lanes[ln];
    if (isDown) { if (!arr.length || arr[arr.length - 1].e != null) arr.push({ s: now, e: null }); }
    else for (let i = arr.length - 1; i >= 0; i--) if (arr[i].e == null) { arr[i].e = now; break; }
  }
  const tl = document.getElementById('tl'), tg = tl.getContext('2d');
  function drawTimeline(now) {
    tl.classList.toggle('hidden', !cfg.timeline); if (!cfg.timeline) return;
    const Wd = tl.width, Hd = tl.height, laneH = 24, x0 = 58;
    tg.clearRect(0, 0, Wd, Hd);
    const X = (t) => x0 + (Wd - x0) - ((now - t) / SPAN) * (Wd - x0);
    [['jump', 'JUMP'], ['crouch', 'CROUCH'], ['scroll', 'SCROLL']].forEach(([k, label], i) => {
      const y = i * (laneH + 4) + 2;
      tg.fillStyle = hex(cfg.color, 0.1); tg.fillRect(x0, y, Wd - x0, laneH);
      tg.fillStyle = hex(cfg.color, 0.75); tg.font = '700 10px sans-serif'; tg.textBaseline = 'middle'; tg.fillText(label, 0, y + laneH / 2);
      const arr = lanes[k];
      while (arr.length && (arr[0].e || now) < now - SPAN - 100) arr.shift();
      for (const ev of arr) {
        const xs = Math.max(x0, X(ev.s)), xe = Math.min(Wd, X(ev.e == null ? now : ev.e));
        if (k === 'scroll') { tg.fillStyle = ev.dir > 0 ? cfg.color : '#fff'; tg.fillRect(xs - 1, y + (ev.dir > 0 ? 2 : laneH / 2), 2.5, laneH / 2 - 2); }
        else { tg.fillStyle = hex(cfg.color, 0.85); tg.fillRect(xs, y + 3, Math.max(2.5, xe - xs), laneH - 6); }
      }
    });
    if (cfg.glow) { tg.shadowColor = cfg.color; tg.shadowBlur = 0; }
  }
  function drawWheel(now) {
    if (!cfg.wheel) return;
    while (wheelTimes.length && now - wheelTimes[0] > 1000) wheelTimes.shift();
    const c = document.getElementById('wcnt'); if (c) c.textContent = wheelTimes.length + '/s';
    const on = now - wheelAt < 120, up = document.getElementById('wup'), dn = document.getElementById('wdn');
    if (up) up.classList.toggle('on', on && wheelDir > 0); if (dn) dn.classList.toggle('on', on && wheelDir < 0);
  }
  function apply(c) {
    Object.assign(cfg, c);
    document.body.style.setProperty('--accent', cfg.color);
    document.body.classList.toggle('glow', !!cfg.glow);
    document.body.style.opacity = cfg.opacity;
    if (!cfg.preview) stage.style.transform = `scale(${cfg.scale})`;
    stage.style.height = (cfg.timeline ? BASE + TL_H : BASE) + 'px';
    layout();
  }
  if (window.ovApi) { ovApi.onInput(handle); ovApi.onConfig(apply); }
  addEventListener('message', (e) => { // live preview inside the app window
    const d = e.data; if (!d || d.__st1m !== 'ov') return;
    if (d.cfg) apply(d.cfg); if (d.input) handle(d.input);
  });
  apply({});
  requestAnimationFrame(frame);
})();

/* ST1M PORT4L — intro film, scene renderer.  draw(t) is a pure function of time (seconds) so frames can be rendered offline. */
(function (g) {
  const ST = (g.ST = g.ST || {});
  let W = 1920, H = 1080, DUR = 48; const FPS = 30;
  const FONT = "Bahnschrift, 'Segoe UI Variable Display', 'Segoe UI', Arial, sans-serif";
  const GOLD = '#f5c542', GOLD2 = '#ffe08a';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)), outCubic: (t) => 1 - Math.pow(1 - t, 3), outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inCubic: (t) => t * t * t, inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  const rngf = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

  let ctx, cv; const A = {};
  const bloomC = document.createElement('canvas'); bloomC.width = 480; bloomC.height = 270; let BW = 480, BH = 270; const bctx = bloomC.getContext('2d');
  const grainC = document.createElement('canvas'); grainC.width = grainC.height = 256; (() => { const x = grainC.getContext('2d'), d = x.createImageData(256, 256), r = rngf(5); for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); })();

  async function load() {
    const files = { logo: 'img/logo.svg', portal: 'img/portal.svg', syringe: 'img/syringe.svg', home: '../../assets/readme/home.jpg', training: '../../assets/readme/training.jpg',
      cs0: '../../src/previews/csm_enabled_0.webp', cs1: '../../src/previews/csm_enabled_1.webp', ao0: '../../src/previews/ssao_quality_0.webp', ao4: '../../src/previews/ssao_quality_4.webp' };
    await Promise.all(Object.entries(files).map(([k, u]) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res((A[k] = i)); i.onerror = () => rej(new Error('asset ' + u)); i.src = u; })));
    A.names = (ST.CATALOG_ROWS || []).filter((r) => r[2] !== 'removed' && r[2] !== 'mystery').map((r) => ({ n: r[1], d: r[2] }));
    const r = rngf(9); for (let i = A.names.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [A.names[i], A.names[j]] = [A.names[j], A.names[i]]; }
  }

  // ------------------------------------------------------------------ helpers
  function T(str, x, y, o = {}) {
    const size = o.size || 48; ctx.save();
    ctx.font = `${o.weight || 700} ${size}px ${FONT}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'alphabetic';
    ctx.letterSpacing = (o.ls || 0) + 'px'; ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    let px = x; if ((o.align || 'center') === 'center' && o.ls) px += o.ls / 2;
    if (o.glow) { ctx.shadowColor = o.gc || GOLD; ctx.shadowBlur = o.glow; }
    if (o.stroke) { ctx.lineWidth = o.stroke; ctx.strokeStyle = o.sc || '#000'; ctx.strokeText(str, px, y); }
    ctx.fillStyle = o.grad ? o.grad : o.color || '#fff'; ctx.fillText(str, px, y); ctx.restore();
  }
  const vgrad = (y0, y1, a, b) => { const g1 = ctx.createLinearGradient(0, y0, 0, y1); g1.addColorStop(0, a); g1.addColorStop(1, b); return g1; };
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function stars(t, a = 1, speed = 10) {
    const r = rngf(3); ctx.save(); ctx.fillStyle = '#fff4d6';
    for (let i = 0; i < 260; i++) { const x0 = r() * W, y = r() * H, z = 0.2 + r() * 0.8, s = 0.8 + r() * 1.6; const x = (((x0 - t * speed * z) % W) + W) % W; ctx.globalAlpha = a * (0.25 + 0.6 * z * (0.6 + 0.4 * Math.sin(t * (1 + z) * 1.3 + i))); ctx.fillRect(x, y, s, s); }
    ctx.restore();
  }
  function accretion(t, cx, cy, s, a = 1, hole = true) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.24); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(3px)';
    for (let i = 0; i < 10; i++) {
      const rx = s * (0.95 + i * 0.17), ry = rx * 0.17, gr = ctx.createLinearGradient(-rx, 0, rx, 0);
      const al = a * (0.5 - i * 0.035) * (0.8 + 0.2 * Math.sin(t * 0.8 + i));
      gr.addColorStop(0, 'rgba(245,197,66,0)'); gr.addColorStop(0.3, `rgba(255,214,102,${al})`); gr.addColorStop(0.5, `rgba(255,255,255,${al * 1.3})`); gr.addColorStop(0.7, `rgba(255,190,50,${al})`); gr.addColorStop(1, 'rgba(245,197,66,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = Math.max(1, s * (0.07 - i * 0.005)); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (hole) { ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.82, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  function streak(x, y, w, a, color = '255,224,138') { // anamorphic horizontal lens streak
    if (a <= 0.01) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, `rgba(${color},0)`); gr.addColorStop(0.5, `rgba(${color},${a})`); gr.addColorStop(1, `rgba(${color},0)`); ctx.fillStyle = gr; ctx.fillRect(x - w, y - 2.5, w * 2, 5);
    const g2 = ctx.createLinearGradient(x - w, 0, x + w, 0); g2.addColorStop(0, `rgba(${color},0)`); g2.addColorStop(0.5, `rgba(255,255,255,${a * 0.8})`); g2.addColorStop(1, `rgba(${color},0)`); ctx.fillStyle = g2; ctx.fillRect(x - w * 0.6, y - 0.8, w * 1.2, 1.6); ctx.restore();
  }
  function logoBox() { return { cx: W / 2, cy: 392, size: 820 }; }
  function portalGeom(b) { const k = b.size / 512, ox = b.cx - b.size / 2, oy = b.cy - b.size / 2; return { k, x: ox + 262 * k, y: oy + 250 * k, rx: 130 * 0.9 * k, ry: 190 * 0.9 * k, lw: 22 * 0.9 * k, irx: 108 * 0.9 * k, iry: 168 * 0.9 * k }; }
  function procPortal(t, b, ringP, vortexA) {
    const p = portalGeom(b); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((-18 * Math.PI) / 180);
    if (vortexA > 0) { // violet vortex inside
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, p.irx, p.iry, 0, 0, Math.PI * 2); ctx.clip(); ctx.globalAlpha *= vortexA;
      const gr = ctx.createRadialGradient(0, -p.iry * 0.05, 0, 0, 0, p.iry); gr.addColorStop(0, '#fff'); gr.addColorStop(0.16, '#e9c9ff'); gr.addColorStop(0.45, '#9a3dff'); gr.addColorStop(0.8, '#3a0d78'); gr.addColorStop(1, '#12032c');
      ctx.fillStyle = gr; ctx.fillRect(-p.irx, -p.iry, p.irx * 2, p.iry * 2);
      ctx.scale(1, p.iry / p.irx); ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
      for (let a = 0; a < 4; a++) { ctx.save(); ctx.rotate(t * (1.4 + a * 0.2) + a * 1.57); ctx.globalAlpha *= 0.35 + a * 0.08; ctx.lineWidth = p.irx * (0.06 - a * 0.008); ctx.beginPath();
        for (let th = 0.4; th < 11; th += 0.18) { const r = (th / 11) * p.irx * 1.05; const x = Math.cos(th) * r, y = Math.sin(th) * r; th < 0.5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); }
      ctx.restore();
    }
    if (ringP > 0) { // gold ring drawn progressively
      const circ = Math.PI * (3 * (p.rx + p.ry) - Math.sqrt((3 * p.rx + p.ry) * (p.rx + 3 * p.ry)));
      ctx.lineWidth = p.lw; ctx.lineCap = 'round'; const gr = ctx.createLinearGradient(-p.rx, -p.ry, p.rx, p.ry); gr.addColorStop(0, '#fff6cf'); gr.addColorStop(0.35, '#ffd966'); gr.addColorStop(0.7, '#f5c542'); gr.addColorStop(1, '#b8860b');
      ctx.strokeStyle = gr; ctx.shadowColor = GOLD; ctx.shadowBlur = 40 * p.k; ctx.setLineDash([circ * ringP, circ * 2]); ctx.lineDashOffset = 0;
      ctx.beginPath(); ctx.ellipse(0, 0, p.rx, p.ry, 0, -Math.PI / 2, Math.PI * 1.5); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
  function logoParts(b, o) { // o: portalA, syrA, syrOff (logo units), pulse
    const x = b.cx - b.size / 2, y = b.cy - b.size / 2;
    if (o.portalA > 0) { ctx.save(); ctx.globalAlpha *= o.portalA; ctx.drawImage(A.portal, x, y, b.size, b.size); ctx.restore(); }
    if (o.syrA > 0) {
      const k = b.size / 512, dx = -Math.cos((40 * Math.PI) / 180), dy = Math.sin((40 * Math.PI) / 180), off = o.syrOff || 0;
      if (off > 4) for (let i = 5; i >= 1; i--) { ctx.save(); ctx.globalAlpha *= o.syrA * 0.12 * (6 - i); ctx.drawImage(A.syringe, x + dx * (off + i * 46) * k, y + dy * (off + i * 46) * k, b.size, b.size); ctx.restore(); }
      ctx.save(); ctx.globalAlpha *= o.syrA; ctx.drawImage(A.syringe, x + dx * off * k, y + dy * off * k, b.size, b.size); ctx.restore();
    }
  }
  function titleText(cx, y, size, u, o = {}) { // letter-by-letter "ST1M PORT4L"
    const s = 'ST1M PORT4L', ls = lerp(o.ls0 || 50, o.ls1 || 14, E.outCubic(clamp(u / 1.4)));
    ctx.save(); ctx.font = `800 ${size}px ${FONT}`; ctx.letterSpacing = ls + 'px'; const total = ctx.measureText(s).width - ls; ctx.restore();
    let x = cx - total / 2;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], p = E.outCubic(clamp((u - i * 0.055) / 0.55));
      ctx.save(); ctx.font = `800 ${size}px ${FONT}`; ctx.letterSpacing = '0px'; const w = ctx.measureText(ch).width; ctx.restore();
      if (p > 0) T(ch, x + w / 2, y + (1 - p) * 46, { size, weight: 800, alpha: p, glow: 36 * p, color: '#fff', gc: GOLD });
      x += w + ls;
    }
  }
  function chip(x, y, w, h, label, col, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; rr(x, y, w, h, 14); ctx.fillStyle = 'rgba(12,10,6,.88)'; ctx.fill(); ctx.strokeStyle = 'rgba(245,197,66,.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = col; rr(x, y, 8, h, 4); ctx.fill(); T(label, x + 28, y + h / 2 + 9, { size: 26, weight: 600, align: 'left', color: '#f4f1ea' }); ctx.restore();
  }
  const DIFFC = { basic: '#9ad3ff', easy: '#7be495', medium: '#f5c542', hard: '#ff9d5c', master: '#ff4d6d', concept: '#b8a3ff' };

  // ------------------------------------------------------------------ scenes
  function S1(t) { // 0 - 6.4 : 110 -> 120
    stars(t, 0.8, 6);
    const cx = W / 2, cy = H / 2 - 20;
    const lp = E.outExpo(seg(t, 0.25, 1.6)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(cx - 800, 0, cx + 800, 0); lg.addColorStop(0, 'rgba(245,197,66,0)'); lg.addColorStop(0.5, 'rgba(255,236,170,1)'); lg.addColorStop(1, 'rgba(245,197,66,0)');
    ctx.fillStyle = lg; ctx.shadowColor = GOLD; ctx.shadowBlur = 30; ctx.fillRect(cx - 800 * lp, cy + 250, 1600 * lp, 3); ctx.restore();
    T('APEX GIVES YOU', cx, cy - 240, { size: 38, weight: 600, ls: lerp(40, 14, E.outCubic(seg(t, 0.8, 2.0))), alpha: E.outCubic(seg(t, 0.8, 1.6)) * (1 - seg(t, 3.0, 3.1)), color: '#d8d2c0' });
    const glitch = t > 2.55 && t < 3.05;
    const pop = t >= 3.05 ? E.outBack(seg(t, 3.05, 3.65)) : 1; const sc = t >= 3.05 ? lerp(1.35, 1, pop) : lerp(1.05, 1, E.outCubic(seg(t, 0.9, 2.4)));
    const zoom = 1 + E.inCubic(seg(t, 5.0, 6.3)) * 7, fade = 1 - seg(t, 5.7, 6.35);
    ctx.save(); ctx.translate(cx, cy + 90); ctx.scale(sc * zoom, sc * zoom); ctx.globalAlpha *= fade;
    const label = t < 3.05 ? '110' : '120';
    const a0 = E.outCubic(seg(t, 0.9, 1.9)); const gr = ctx.createLinearGradient(0, -260, 0, 60);
    if (label === '110') { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#a9a49a'); } else { gr.addColorStop(0, '#fff6cf'); gr.addColorStop(0.5, GOLD2); gr.addColorStop(1, '#e0a800'); }
    if (glitch) { const r = rngf(Math.floor(t * 30)); for (let i = 0; i < 6; i++) { const y0 = -260 + r() * 300, hh = 20 + r() * 50, dx = (r() - 0.5) * 90; ctx.save(); ctx.beginPath(); ctx.rect(-600, y0, 1200, hh); ctx.clip(); T(r() > 0.5 ? '110' : '120', dx, 0, { size: 400, weight: 800, grad: gr, alpha: a0 }); ctx.restore(); }
      ctx.globalCompositeOperation = 'lighter'; T('110', -9, 0, { size: 400, weight: 800, color: 'rgba(255,0,60,.55)' }); T('120', 9, 0, { size: 400, weight: 800, color: 'rgba(0,220,255,.55)' }); ctx.globalCompositeOperation = 'source-over'; }
    else T(label, 0, 0, { size: 400, weight: 800, grad: gr, alpha: a0, glow: label === '120' ? 70 : 12, gc: GOLD });
    ctx.restore();
    T('FIELD OF VIEW', cx, cy + 190, { size: 34, weight: 600, ls: 22, alpha: E.outCubic(seg(t, 1.2, 2.0)) * fade, color: '#9c968a' });
    T('THE MENU STOPS AT 110.', cx, cy + 330, { size: 56, weight: 700, ls: 6, alpha: E.outCubic(seg(t, 2.0, 2.7)) * fade, color: '#e8e2d0' });
    if (t > 3.2) { const p = E.outBack(seg(t, 3.2, 3.8)); T("WE DON'T.", cx, cy + 410, { size: 74, weight: 800, ls: 10, alpha: clamp(p) * fade, glow: 34, gc: GOLD, color: GOLD2 }); }
    if (t > 3.05 && t < 3.55) { ctx.save(); ctx.fillStyle = `rgba(255,236,170,${0.55 * (1 - seg(t, 3.05, 3.55))})`; ctx.fillRect(0, 0, W, H); ctx.restore(); streak(cx, cy - 20, 1200, 0.9 * (1 - seg(t, 3.05, 3.9))); }
  }

  function S2(t) { // 6.4 - 14.6 : portal + stim logo reveal
    const b = logoBox(), IMP = 8.45;
    const aStars = E.outCubic(seg(t, 6.4, 7.4)); stars(t, aStars, 14);
    const p = portalGeom(b);
    accretion(t, b.cx + 780, b.cy - 40, 120, aStars * 0.9);
    const ring = E.inOut(seg(t, 6.6, 7.9)), vortex = E.outCubic(seg(t, 7.3, 8.3));
    const pre = t < IMP + 0.06;
    if (pre) { procPortal(t, b, ring, vortex); if (t > 7.9 && t < IMP) { /* tension glow */ ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 320); gr.addColorStop(0, `rgba(190,120,255,${0.35 * seg(t, 7.9, IMP)})`); gr.addColorStop(1, 'rgba(190,120,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
    const fin = E.outCubic(seg(t, IMP - 0.02, IMP + 0.25));
    logoParts(b, { portalA: fin, syrA: t > 7.75 ? 1 : 0, syrOff: t < IMP ? lerp(1150, 0, E.inCubic(seg(t, 7.75, IMP))) : 0 });
    if (t >= IMP) { // impact
      const u = t - IMP;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const q = clamp(u / 1.1 - i * 0.12); if (q <= 0 || q >= 1) continue; ctx.strokeStyle = `rgba(255,214,102,${0.7 * (1 - q)})`; ctx.lineWidth = 16 * (1 - q) + 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, 40 + E.outCubic(q) * 1300, (40 + E.outCubic(q) * 1300) * 0.42, -0.31, 0, Math.PI * 2); ctx.stroke(); } ctx.restore();
      const r = rngf(77); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < 90; i++) { const ang = r() * Math.PI * 2, sp = 200 + r() * 1100, life = 0.5 + r() * 0.9; if (u > life) continue; const d = sp * (1 - Math.pow(1 - u / life, 2)) * 0.6, d2 = Math.max(0, d - sp * 0.04); ctx.strokeStyle = `rgba(255,${190 + r() * 60},${80 + r() * 90},${1 - u / life})`; ctx.lineWidth = 2 + r() * 2.5; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ang) * d2, p.y + Math.sin(ang) * d2 * 0.9); ctx.lineTo(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d * 0.9); ctx.stroke(); } ctx.restore();
      if (u < 0.32) { ctx.save(); ctx.fillStyle = `rgba(255,248,225,${0.95 * (1 - u / 0.32)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      streak(p.x, p.y, 1500, 0.95 * Math.exp(-u * 2.2), '255,224,138');
    }
    // idle glow on the finished logo
    if (t > IMP + 0.4) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 460); const pulse = 0.2 + 0.07 * Math.sin(t * 2.2); gr.addColorStop(0, `rgba(170,90,255,${pulse})`); gr.addColorStop(1, 'rgba(170,90,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // title
    const u = t - (IMP + 0.35);
    if (u > 0) { titleText(W / 2, 836, 150, u);
      T('BY IDZY', W / 2, 912, { size: 38, weight: 700, ls: 26, alpha: E.outCubic(seg(u, 0.9, 1.6)), color: GOLD, glow: 14 });
      const lw = E.outExpo(seg(u, 0.7, 1.7)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(W / 2 - 520, 0, W / 2 + 520, 0); lg.addColorStop(0, 'rgba(245,197,66,0)'); lg.addColorStop(0.5, 'rgba(255,233,168,1)'); lg.addColorStop(1, 'rgba(245,197,66,0)'); ctx.fillStyle = lg; ctx.fillRect(W / 2 - 520 * lw, 858, 1040 * lw, 3); ctx.restore();
      T('THE APEX LEGENDS CONFIG EDITOR  ·  MOVEMENT LAB', W / 2, 990, { size: 30, weight: 500, ls: 8, alpha: E.outCubic(seg(u, 1.6, 2.4)) * 0.9, color: '#cfc9b8' }); }
    // exit whip
    const ex = E.inCubic(seg(t, 13.75, 14.55)); if (ex > 0) { ctx.save(); ctx.globalAlpha = ex; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }

  function UIshot(img, x, y, w, rot, alpha, glow = true) {
    const h = (w * img.height) / img.width; ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
    if (glow) { ctx.shadowColor = 'rgba(245,197,66,.45)'; ctx.shadowBlur = 60; } rr(0, 0, w, h, 18); ctx.fillStyle = '#000'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.save(); rr(0, 0, w, h, 18); ctx.clip(); ctx.drawImage(img, 0, 0, w, h); ctx.restore(); rr(0, 0, w, h, 18); ctx.strokeStyle = 'rgba(245,197,66,.65)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); return h;
  }
  function S3(t) { // 14.4 - 22 : one click
    stars(t, 0.6, 8); accretion(t, 1760, 160, 110, 0.35, true);
    const u = t - 14.4, fo = 1 - seg(t, 21.3, 22);
    ctx.save(); ctx.globalAlpha *= fo;
    const sw = 1040, sx0 = 790, sy0 = 250;
    const enter = E.outQuart(seg(u, 0.25, 1.35)); const bob = Math.sin(t * 1.3) * 6;
    // camera push toward the "Apply" button
    const zin = E.inOut(seg(t, 16.35, 17.35)) - E.inOut(seg(t, 19.5, 20.5)); const zoom = 1 + 0.55 * zin, leftA = 1 - 0.95 * clamp(zin * 1.6); const bx = sx0 + (617 / 1280) * sw, by = sy0 + (262 / 800) * (sw * 0.625);
    ctx.save(); ctx.translate(bx, by); ctx.scale(zoom, zoom); ctx.translate(-bx, -by);
    UIshot(A.home, sx0 + (1 - enter) * 700, sy0 + bob, sw, lerp(0.07, -0.015, enter), clamp(enter * 1.4));
    // click ripple + button press
    const ck = seg(t, 17.35, 18.15); if (ck > 0 && ck < 1) { ctx.save(); ctx.strokeStyle = `rgba(255,236,170,${1 - ck})`; ctx.lineWidth = 6 * (1 - ck) + 1; ctx.beginPath(); ctx.arc(bx, by, 30 + ck * 150, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    // toast
    const tp = E.outBack(seg(t, 17.6, 18.2)) * (1 - seg(t, 20.8, 21.2)); if (tp > 0.01) { ctx.save(); ctx.translate(1000, 120 - (1 - tp) * 40); ctx.globalAlpha *= clamp(tp); rr(0, 0, 790, 84, 18); ctx.fillStyle = 'rgba(10,8,0,.94)'; ctx.shadowColor = GOLD; ctx.shadowBlur = 24; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
      T('Applied ✔  (26 changes) — backup created.', 32, 52, { size: 28, weight: 600, align: 'left', color: '#fff' }); T('Undo', 756, 52, { size: 28, weight: 700, align: 'right', color: GOLD2 }); ctx.restore(); }
    // headline
    const hp = E.outExpo(seg(u, 0.1, 1.0)), h2 = E.outExpo(seg(u, 0.4, 1.3));
    ctx.save(); ctx.globalAlpha *= leftA; ctx.beginPath(); ctx.rect(0, 0, 790, H); ctx.clip();
    T('YOUR SETUP.', 100 - (1 - hp) * 500, 440, { size: 98, weight: 800, align: 'left', alpha: hp, ls: 2 });
    T('ONE CLICK.', 100 - (1 - h2) * 500, 566, { size: 112, weight: 800, align: 'left', alpha: h2, ls: 2, color: GOLD2, glow: 36 }); ctx.restore();
    const chips = ['FOV 120', 'RGB RETICLE', 'TEXTURES', 'SHADOWS']; chips.forEach((c, i) => { const q = E.outBack(seg(u, 1.4 + i * 0.18, 2.0 + i * 0.18)); if (q > 0) { ctx.save(); ctx.globalAlpha *= leftA; ctx.translate(100 + (i % 2) * 280, 690 + Math.floor(i / 2) * 84); ctx.scale(clamp(q, 0, 1.1), clamp(q, 0, 1.1)); chip(0, 0, 260, 62, c, GOLD, clamp(q)); ctx.restore(); } });
    const cap = E.outCubic(seg(t, 18.4, 19.1)) * (1 - seg(t, 20.8, 21.3)); T('AUTOMATIC BACKUPS  ·  UNDO ANYTIME', 100, 940, { size: 28, weight: 600, ls: 5, align: 'left', alpha: cap * leftA, color: '#d8d2c0' });
    ctx.restore();
  }

  function cover(img, x, y, w, h, zoom, pan) { const s = Math.max(w / img.width, h / img.height) * zoom; const iw = img.width * s, ih = img.height * s; ctx.drawImage(img, x + (w - iw) / 2 + pan, y + (h - ih) / 2, iw, ih); }
  function compare(a, b, t0, t1, t, slidePath, label, zoomAt) {
    const u = (t - t0) / (t1 - t0), zoom = 1.0 + 0.06 * u, pan = lerp(-20, 20, u);
    const p = slidePath(u);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); cover(a, 0, 0, W, H, zoom, pan);
    ctx.save(); ctx.beginPath(); ctx.rect(p * W, 0, W, H); ctx.clip(); cover(b, 0, 0, W, H, zoom, pan); ctx.restore();
    ctx.fillStyle = vgrad(H - 330, H, 'rgba(0,0,0,0)', 'rgba(0,0,0,.78)'); ctx.fillRect(0, H - 330, W, 330); ctx.fillStyle = vgrad(0, 460, 'rgba(0,0,0,.82)', 'rgba(0,0,0,0)'); ctx.fillRect(0, 0, W, 460);
    const x = p * W; ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 24; ctx.fillStyle = GOLD2; ctx.fillRect(x - 2, 0, 4, H); ctx.restore();
    ctx.save(); ctx.translate(x, H / 2); ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fillStyle = '#0a0800'; ctx.shadowColor = GOLD; ctx.shadowBlur = 24; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.stroke(); T('⇆', 0, 14, { size: 40, color: GOLD2 }); ctx.restore();
    const lA = clamp((p * W - 160) / 160), lB = clamp((W - p * W - 160) / 160);
    T(label[0], 100, H - 70, { size: 44, weight: 800, ls: 8, align: 'left', alpha: lA, glow: 18 }); T(label[1], W - 100, H - 70, { size: 44, weight: 800, ls: 8, align: 'right', alpha: lB, color: GOLD2, glow: 18 });
    ctx.restore();
  }
  function S4(t) { // 21.7 - 28.9 : before / after on real captures
    const fo = 1 - seg(t, 28.5, 28.9), fi = seg(t, 21.7, 22.1); ctx.save(); ctx.globalAlpha *= fi * fo;
    if (t < 25.4) compare(A.cs0, A.cs1, 21.7, 25.4, t, (u) => (u < 0.3 ? lerp(0.5, 0.06, E.inOut(u / 0.3)) : u < 0.78 ? lerp(0.06, 0.94, E.inOut((u - 0.3) / 0.48)) : lerp(0.94, 0.5, E.inOut((u - 0.78) / 0.22))), ['SUN SHADOWS · OFF', 'SUN SHADOWS · ON']);
    else { const sl = E.outQuart(seg(t, 25.4, 26.0)); ctx.save(); ctx.translate((1 - sl) * 0, 0); compare(A.ao0, A.ao4, 25.4, 28.9, t, (u) => (u < 0.25 ? lerp(0.5, 0.92, E.inOut(u / 0.25)) : u < 0.7 ? lerp(0.92, 0.08, E.inOut((u - 0.25) / 0.45)) : lerp(0.08, 0.5, E.inOut((u - 0.7) / 0.3))), ['SSAO · OFF', 'SSAO · ON']); ctx.restore();
      if (sl < 1) { ctx.save(); ctx.fillStyle = `rgba(255,236,170,${0.5 * (1 - sl)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
    const hp = E.outExpo(seg(t, 22.0, 22.9)) * (1 - seg(t, 24.6, 25.0)) + 0; if (hp > 0.01) { T('SEE BEFORE', 100 - (1 - hp) * 300, 200, { size: 112, weight: 800, ls: 6, align: 'left', alpha: hp, glow: 24 }); T('YOU APPLY.', 100 - (1 - hp) * 300, 322, { size: 112, weight: 800, ls: 6, align: 'left', alpha: hp, color: GOLD2, glow: 30 }); }
    const hp2 = E.outExpo(seg(t, 26.1, 26.9)) * (1 - seg(t, 28.2, 28.6)); if (hp2 > 0.01) T('REAL IN-GAME CAPTURES', 100, 200, { size: 62, weight: 800, ls: 12, align: 'left', alpha: hp2, glow: 24 });
    ctx.restore();
  }

  function S5(t) { // 28.8 - 35.4 : movement lab
    stars(t, 0.5, 8); const u = t - 28.8; const fi = seg(t, 28.8, 29.2), fo = 1 - seg(t, 35.0, 35.4); ctx.save(); ctx.globalAlpha *= fi * fo;
    accretion(t, 1500, 560, 360, 0.18, false);
    // chip columns
    const cols = [[1060, 40, 0], [1330, 70, 7], [1600, 52, 14]];
    ctx.save(); ctx.beginPath(); ctx.rect(1000, 0, 920, H); ctx.clip();
    cols.forEach(([x, sp, off], ci) => { for (let i = -2; i < 16; i++) { const idx = (ci * 23 + i + 40 + Math.floor((u * sp + off * 7) / 92)) % A.names.length, n = A.names[idx], y = i * 92 - ((u * sp + off * 7) % 92) + 20; const a = Math.min(clamp(y / 160), clamp((H - y - 90) / 160)) * E.outCubic(seg(u, 0.2 + ci * 0.15, 1.0 + ci * 0.15)); if (a > 0.02) chip(x, y + (ci % 2) * 30, 250, 62, n.n.length > 18 ? n.n.slice(0, 17) + '…' : n.n, DIFFC[n.d] || '#888', a); } });
    ctx.restore();
    ctx.fillStyle = vgrad(0, 1, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)');
    T('MOVEMENT LAB', 120, 250, { size: 40, weight: 700, ls: 16, align: 'left', alpha: E.outCubic(seg(u, 0.1, 0.8)), color: GOLD });
    const n = Math.round(287 * E.outExpo(seg(u, 0.3, 2.4))); T(String(n), 110, 520, { size: 300, weight: 800, align: 'left', glow: 40, grad: (() => { const gr = ctx.createLinearGradient(0, 300, 0, 520); gr.addColorStop(0, '#fff'); gr.addColorStop(1, GOLD2); return gr; })(), alpha: E.outCubic(seg(u, 0.2, 0.9)) });
    T('MOVEMENT TECHNIQUES', 124, 600, { size: 42, weight: 700, ls: 10, align: 'left', alpha: E.outCubic(seg(u, 0.9, 1.6)), color: '#e8e2d0' });
    // learning path bar
    const bp = E.inOutSine(seg(u, 2.4, 5.4)), levels = ['ROOKIE', 'MOVER', 'SLIDER', 'GLIDER', 'STRIKER', 'PHANTOM', 'APEX MOVER']; const barA = E.outCubic(seg(u, 2.1, 2.9));
    T('LEARNING PATH', 124, 720, { size: 34, weight: 700, ls: 12, align: 'left', alpha: barA, color: GOLD });
    ctx.save(); ctx.globalAlpha *= barA; rr(124, 760, 780, 14, 7); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill(); ctx.save(); rr(124, 760, 780 * bp, 14, 7); ctx.fillStyle = vgrad(760, 774, GOLD2, '#b8860b'); ctx.shadowColor = GOLD; ctx.shadowBlur = 18; ctx.fill(); ctx.restore();
    const cur = Math.min(6, Math.floor(bp * 7 + 0.001)); levels.forEach((l, i) => { const x = 124 + (780 * i) / 6; ctx.fillStyle = i <= cur ? GOLD2 : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x, 767, i <= cur ? 10 : 7, 0, Math.PI * 2); ctx.fill(); }); ctx.restore();
    T(levels[cur], 124, 840, { size: 54, weight: 800, ls: 8, align: 'left', alpha: barA, color: '#fff', glow: 20 });
    T(Math.round(1400 * bp) + ' XP', 904, 840, { size: 38, weight: 600, align: 'right', alpha: barA, color: GOLD2 });
    ctx.restore();
  }

  function keyCap(x, y, s, label, down, a = 1) {
    ctx.save(); ctx.globalAlpha *= a; rr(x - s / 2, y - s / 2, s, s, 14); ctx.fillStyle = down ? 'rgba(124,255,58,.4)' : 'rgba(124,255,58,.04)'; if (down) { ctx.shadowColor = '#7cff3a'; ctx.shadowBlur = 36; } ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = down ? '#7cff3a' : 'rgba(124,255,58,.4)'; ctx.lineWidth = 3; ctx.stroke(); T(label, x, y + s * 0.17, { size: s * 0.36, weight: 800, color: down ? '#fff' : '#b9ff95', ls: 1 }); ctx.restore();
  }
  function S6(t) { // 35.2 - 41.6 : superglide trainer + overlay
    stars(t, 0.5, 8); const fi = seg(t, 35.2, 35.6), fo = 1 - seg(t, 41.2, 41.6); ctx.save(); ctx.globalAlpha *= fi * fo;
    if (t < 38.4) { // trainer
      const u = t - 35.2, BW = 1360, bx = 280, by = 520, M = 1.5, win = 0.25; const prog = clamp((u - 0.7) / M);
      T('SUPERGLIDE TRAINER', W / 2, 250, { size: 84, weight: 800, ls: 12, alpha: E.outCubic(seg(u, 0.1, 0.8)), glow: 26 });
      T('JUMP  →  CROUCH  ·  ONE FRAME APART', W / 2, 320, { size: 36, weight: 600, ls: 10, alpha: E.outCubic(seg(u, 0.5, 1.2)), color: '#bdb7a6' });
      ctx.save(); rr(bx, by, BW, 76, 18); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); rr(bx, by, BW * prog, 76, 18); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.roundRect(bx + BW * (1 - win), by, BW * win, 76, [0, 18, 18, 0]); ctx.fillStyle = 'rgba(245,197,66,.28)'; ctx.shadowColor = GOLD; ctx.shadowBlur = 30; ctx.fill(); ctx.restore(); ctx.fillStyle = GOLD; ctx.fillRect(bx + BW * (1 - win), by, 4, 76); ctx.restore();
      const jx = bx + BW * (1 - win) + BW * win * 0.42, cx2 = jx + 34; const jp = E.outBack(seg(u, 2.35, 2.75)), cp = E.outBack(seg(u, 2.75, 3.1));
      const mk = (x, lab, col, p) => { if (p <= 0) return; ctx.save(); ctx.translate(x, by - 36 - (1 - clamp(p)) * 60); ctx.globalAlpha *= clamp(p); ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 26; ctx.fill(); ctx.shadowBlur = 0; T(lab, 0, 12, { size: 32, weight: 800, color: '#000' }); ctx.restore(); };
      mk(jx, 'J', '#7cff3a', jp); mk(cx2, 'C', '#35d9ff', cp);
      const rp = E.outExpo(seg(u, 3.0, 3.55)); const pc = Math.round(93 * rp);
      T(pc + '%', W / 2 - 240, 800, { size: 190, weight: 800, glow: 46, gc: '#7be495', color: '#7be495', alpha: clamp(rp * 2) });
      T('SUCCESS CHANCE', W / 2 + 130, 750, { size: 36, weight: 700, ls: 10, align: 'left', alpha: rp, color: '#e8e2d0' }); T('GAP  7.4 ms  =  1.07 FRAMES', W / 2 + 130, 812, { size: 40, weight: 700, align: 'left', alpha: rp, color: GOLD2 }); T('@ 144 FPS', W / 2 + 130, 862, { size: 30, weight: 500, align: 'left', alpha: rp, color: '#9c968a' });
    } else { // overlay
      const u = t - 38.4, cx = W / 2, cy = 520, R = 250, e = E.outCubic(seg(u, 0, 0.7)); T('KEYBOARD & MOUSE OVERLAY', W / 2, 190, { size: 76, weight: 800, ls: 12, alpha: E.outCubic(seg(u, 0.05, 0.7)), glow: 24 });
      const down = (a, b) => u > a && u < b; const s = 86; ctx.save(); ctx.translate(cx, 560); ctx.scale(1.18, 1.18); ctx.translate(-cx, -560);
      keyCap(cx, cy - 78, s, 'W', down(0.3, 2.5), e); keyCap(cx - 96, cy + 18, s, 'A', down(0.9, 1.7), e); keyCap(cx, cy + 18, s, 'S', false, e); keyCap(cx + 96, cy + 18, s, 'D', down(1.6, 2.5), e);
      keyCap(cx - 62, cy + 128, s, 'CTRL', down(2.0, 2.5), e); keyCap(cx + 62, cy + 128, s, 'SPACE', down(1.0, 1.25), e);
      ctx.save(); ctx.globalAlpha *= e; ctx.strokeStyle = 'rgba(124,255,58,.45)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy + 20, R, 0, Math.PI * 2); ctx.stroke();
      const kf = [[0.3, -2.6], [1.1, -1.0], [1.5, -0.1], [2.3, 0.8], [3.0, 2.3]]; const ang = (q) => { if (q <= kf[0][0]) return kf[0][1]; for (let i = 1; i < kf.length; i++) if (q <= kf[i][0]) return lerp(kf[i - 1][1], kf[i][1], (q - kf[i - 1][0]) / (kf[i][0] - kf[i - 1][0])); return kf[kf.length - 1][1]; };
      const en = (q) => clamp(Math.max(0, Math.sin((q - 0.25) * 2.2)) * 1.6) * (q > 0.25 && q < 3.0 ? 1 : 0);
      for (let k = 14; k >= 0; k--) { const q = u - k * 0.03, a1 = ang(q), a0 = ang(q - 0.03), eq = en(q); if (eq <= 0.02) continue; ctx.strokeStyle = `rgba(124,255,58,${eq * (1 - k / 15) * 0.9})`; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy + 20, R, a0, a1); ctx.stroke(); }
      const ea = en(u); if (ea > 0.03) { const dx = cx + Math.cos(ang(u)) * R, dy = cy + 20 + Math.sin(ang(u)) * R; ctx.shadowColor = '#7cff3a'; ctx.shadowBlur = 36; ctx.fillStyle = `rgba(190,255,150,${ea})`; ctx.beginPath(); ctx.arc(dx, dy, 15, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      // wheel counter + timeline
      const wc = Math.round(14 * E.outCubic(seg(u, 1.4, 2.4)) * (u < 3.0 ? 1 : 0.2)); T('▲  ' + wc + '/s  ▼', cx, cy + 340, { size: 40, weight: 700, color: '#b9ff95', alpha: e, glow: 14, gc: '#7cff3a' });
      ctx.save(); ctx.globalAlpha *= e; const lx = cx - 400, ly = 850; ['JUMP', 'CROUCH', 'SCROLL'].forEach((l, i) => { T(l, lx - 16, ly + i * 38 + 25, { size: 20, weight: 700, align: 'right', color: '#7cff3a', ls: 3 }); ctx.fillStyle = 'rgba(124,255,58,.08)'; ctx.fillRect(lx, ly + i * 38, 800, 30); });
      const r2 = rngf(21); for (let i = 0; i < 40; i++) { const tt = r2() * 3.2, x = lx + 800 - (u - tt) * 260; if (x < lx || x > lx + 800 || tt > u) continue; ctx.fillStyle = '#7cff3a'; if (i % 5 === 0) ctx.fillRect(x, ly + 4, 40, 22); else if (i % 7 === 0) ctx.fillRect(x, ly + 38 + 4, 60, 22); else ctx.fillRect(x, ly + 76 + (i % 2 ? 4 : 15), 3, 11); } ctx.restore(); ctx.restore();
    }
    ctx.restore();
  }

  function S7(t) { // 41.4 - 48 : finale
    const u = t - 41.4; stars(t, 0.9, 10); accretion(t, 1560, 300, 150, 0.7 * E.outCubic(seg(u, 0.3, 1.3)));
    const b = { cx: W / 2, cy: 340, size: 600 }, e = E.outExpo(seg(u, 0.1, 1.0)), p = portalGeom(b);
    ctx.save(); ctx.globalAlpha *= e; ctx.translate(0, (1 - e) * 60); logoParts(b, { portalA: 1, syrA: 1, syrOff: 0 }); ctx.restore();
    { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 380); gr.addColorStop(0, `rgba(170,90,255,${(0.22 + 0.06 * Math.sin(t * 2)) * e})`); gr.addColorStop(1, 'rgba(170,90,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    titleText(W / 2, 720, 128, u - 0.35, { ls0: 36, ls1: 12 });
    T('BY IDZY', W / 2, 790, { size: 34, weight: 700, ls: 24, alpha: E.outCubic(seg(u, 1.1, 1.7)), color: GOLD, glow: 12 });
    T('FREE   ·   OPEN SOURCE   ·   NO ADS   ·   WINDOWS 10 / 11', W / 2, 880, { size: 32, weight: 600, ls: 8, alpha: E.outCubic(seg(u, 1.6, 2.3)), color: '#e8e2d0' });
    const dl = E.outBack(seg(u, 2.3, 3.0)); if (dl > 0) { ctx.save(); ctx.translate(W / 2, 966); ctx.scale(clamp(dl, 0, 1.05), clamp(dl, 0, 1.05)); ctx.globalAlpha *= clamp(dl); rr(-440, -40, 880, 80, 20); ctx.fillStyle = 'rgba(245,197,66,.14)'; ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.shadowColor = GOLD; ctx.shadowBlur = 24; ctx.stroke(); ctx.shadowBlur = 0; T('github.com/izakk-exe/st1m-pot4l-by-idzy', 0, 12, { size: 34, weight: 700, color: GOLD2 }); ctx.restore(); }
    T('Not affiliated with EA / Respawn. Apex Legends is a trademark of Electronic Arts.', W / 2, 1040, { size: 20, weight: 400, alpha: E.outCubic(seg(u, 2.8, 3.5)) * 0.55, color: '#9c968a' });
  }

  const SCENES = [[0, 6.5, S1], [6.4, 14.7, S2], [14.4, 22.0, S3], [21.7, 29.0, S4], [28.8, 35.5, S5], [35.2, 41.7, S6], [41.4, 48.1, S7]];
  const IMPACTS = [[3.05, 10], [8.45, 26], [14.5, 8], [21.8, 8], [28.9, 8], [35.3, 6], [41.6, 14]];
  // shared post pipeline: background, camera shake, scenes, bloom, vignette, grain, master fades
  function compose(t, scenesFn, impacts, dur) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowBlur = 0;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W * 0.72, H * 0.45, 100, W * 0.72, H * 0.45, Math.max(W, H) * 0.68); bg.addColorStop(0, 'rgba(46,32,0,.55)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    let sx = 0, sy = 0; impacts.forEach(([ti, amp]) => { const d = t - ti; if (d > 0 && d < 0.8) { const k = amp * Math.exp(-d * 7); sx += Math.sin(d * 90) * k; sy += Math.cos(d * 77) * k * 0.7; } });
    ctx.save(); ctx.translate(sx, sy); scenesFn(t); ctx.restore();
    bctx.filter = 'none'; bctx.clearRect(0, 0, BW, BH); bctx.filter = 'brightness(1.05) contrast(1.6) blur(9px)'; bctx.drawImage(cv, 0, 0, BW, BH); bctx.filter = 'none';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.drawImage(bloomC, 0, 0, W, H); ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.62)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const gi = Math.floor(t * FPS); const gr = rngf(gi * 7 + 1); ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.07; ctx.drawImage(grainC, -gr() * 256, -gr() * 256, W + 256, H + 256); ctx.restore();
    const fade = Math.max(1 - seg(t, 0, 0.5), seg(t, dur - 1.1, dur)); if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  }
  function draw(t) { compose(t, (tt) => SCENES.forEach(([a, b, fn]) => { if (tt >= a && tt <= b) fn(tt); }), IMPACTS, DUR); }
  function setSize(w, h, dur) { W = w; H = h; if (dur) DUR = dur; if (cv) { cv.width = W; cv.height = H; } BW = Math.round(W / 4); BH = Math.round(H / 4); bloomC.width = BW; bloomC.height = BH; }
  const kit = { T, rr, vgrad, stars, accretion, streak, portalGeom, procPortal, logoParts, titleText, chip, UIshot, cover, keyCap, E, clamp, lerp, seg, rngf, FONT, GOLD, GOLD2, DIFFC, A, compose, setSize,
    get ctx() { return ctx; }, get W() { return W; }, get H() { return H; } };
  ST.film = { get W() { return W; }, get H() { return H; }, FPS, get DUR() { return DUR; }, load, draw, kit, setSize, init: (canvas) => { cv = canvas; ctx = cv.getContext('2d'); } };
})(window);

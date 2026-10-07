/* ST1M PORT4L — animated background (original artwork, drawn in code).
 * Modes: 'landscape' (default: an Outlands-style canyon at dusk — layered mesas, a huge planet, a low sun, drifting
 * haze, a passing dropship and dust, with pointer parallax), 'hole' (stars + accretion disk), 'image' (user image), 'off'. */
(function () {
  const ST = (window.ST = window.ST || {});
  const cv = document.getElementById('bg');
  const img = document.getElementById('bgimg');
  const vid = document.getElementById('bgvid');
  const ctx = cv.getContext('2d');
  let W, H, stars, dust, raf = 0, t0 = performance.now(), mode = 'landscape';
  let fx = 0.64, fy = 0.46, tx = 0.64, ty = 0.46; // black-hole centre (fraction of the window) and the point it glides to
  let px = 0, py = 0, tpx = 0, tpy = 0;           // pointer parallax (-0.5..0.5), smoothed
  const SCALE = { hole: 0.5, landscape: 0.7 };

  // ---------- seeded value noise (deterministic terrain)
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function makeNoise(seed) {
    const r = rng(seed), v = Array.from({ length: 512 }, r);
    const sm = (t) => t * t * (3 - 2 * t);
    const n = (x) => { const i = Math.floor(x), f = x - i; return v[i & 511] + (v[(i + 1) & 511] - v[i & 511]) * sm(f); };
    return (x, oct) => { let a = 0, amp = 0.5, fq = 1, tot = 0; for (let o = 0; o < oct; o++) { a += n(x * fq + o * 17.3) * amp; tot += amp; amp *= 0.5; fq *= 2.03; } return a / tot; };
  }
  // far → near. `mesa` flattens the tops into plateaus; `drift` is the slow scroll (px/s at 1x), `par` the pointer parallax (px).
  const LAYERS = [
    { n: makeNoise(11), base: 0.585, amp: 0.1, freq: 0.0042, mesa: 0.0, c0: '#4a2d63', c1: '#2a1a40', haze: 0.62, drift: 1.2, par: 6, rim: 0.0 },
    { n: makeNoise(23), base: 0.645, amp: 0.15, freq: 0.0035, mesa: 0.75, c0: '#3a2150', c1: '#1c1129', haze: 0.45, drift: 2.6, par: 14, rim: 0.28 },
    { n: makeNoise(37), base: 0.735, amp: 0.17, freq: 0.0028, mesa: 0.9, c0: '#24122f', c1: '#0e0914', haze: 0.24, drift: 5, par: 28, rim: 0.45 },
    { n: makeNoise(53), base: 0.9, amp: 0.15, freq: 0.0021, mesa: 0.0, c0: '#0c070c', c1: '#030203', haze: 0.0, drift: 9, par: 52, rim: 0.2 },
  ];

  function resize() {
    const k = SCALE[mode] || 0.5;
    W = cv.width = Math.ceil(innerWidth * k); H = cv.height = Math.ceil(innerHeight * k);
    stars = Array.from({ length: Math.round((W * H) / 2600) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8, r: Math.random() * 1.4 + 0.3 }));
    dust = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28 }));
  }

  // ======================================================================= landscape
  function drawLandscape(t) {
    px += (tpx - px) * 0.04; py += (tpy - py) * 0.04;
    const u = H / 700; // everything scales with the window height
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72);
    sky.addColorStop(0, '#05030c'); sky.addColorStop(0.38, '#150b2a'); sky.addColorStop(0.62, '#4a1f45'); sky.addColorStop(0.82, '#b4482f'); sky.addColorStop(1, '#ffb25a');
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // stars (upper sky only)
    for (const s of stars) {
      if (s.y > H * 0.5) continue;
      const tw = 0.55 + 0.45 * Math.sin(t * 1.4 + s.x * 0.7), fade = 1 - s.y / (H * 0.5);
      ctx.fillStyle = `rgba(255,240,215,${0.5 * s.z * tw * fade})`;
      ctx.fillRect(s.x - px * 4 * s.z, s.y - py * 3 * s.z, s.r, s.r);
    }

    // giant planet with an atmospheric rim and a thin ring
    const pr = Math.min(W, H) * 0.2, pcx = W * 0.2 - px * 12 * u, pcy = H * 0.27 - py * 8 * u;
    ctx.save(); ctx.translate(pcx, pcy); ctx.rotate(-0.35);
    ctx.strokeStyle = 'rgba(255,214,150,.18)'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.34, 0, Math.PI, Math.PI * 2); ctx.stroke(); // back half of the ring
    const pg = ctx.createRadialGradient(-pr * 0.35, -pr * 0.3, pr * 0.1, 0, 0, pr);
    pg.addColorStop(0, '#9a6bd1'); pg.addColorStop(0.5, '#4a2a7a'); pg.addColorStop(1, '#120826');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.clip(); // night side + bands
    ctx.fillStyle = 'rgba(5,3,12,.78)'; ctx.beginPath(); ctx.arc(pr * 0.5, pr * 0.28, pr * 1.02, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = `rgba(255,200,140,${0.05 + 0.02 * (i % 2)})`; ctx.fillRect(-pr, -pr * 0.6 + i * pr * 0.3 + Math.sin(t * 0.2 + i) * 2, pr * 2, pr * 0.08); }
    ctx.restore();
    const rim = ctx.createLinearGradient(-pr, -pr, pr, pr); rim.addColorStop(0, 'rgba(255,200,120,.9)'); rim.addColorStop(0.45, 'rgba(255,160,90,.0)');
    ctx.strokeStyle = rim; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(0, 0, pr, Math.PI * 0.95, Math.PI * 1.65); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,150,.34)'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.34, 0, 0, Math.PI); ctx.stroke(); // front half of the ring
    ctx.restore();

    // low sun + light shafts (additive)
    const sx = W * 0.72 - px * 18 * u, sy = H * 0.605;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.36 + Math.sin(t * 0.06 + i * 1.7) * 0.05, len = H * (0.85 + 0.15 * Math.sin(t * 0.17 + i * 2)), w = 0.07 + 0.03 * Math.sin(t * 0.13 + i);
      const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
      g.addColorStop(0, 'rgba(255,200,110,.13)'); g.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a - w) * len, sy + Math.sin(a - w) * len); ctx.lineTo(sx + Math.cos(a + w) * len, sy + Math.sin(a + w) * len); ctx.fill();
    }
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.55);
    sg.addColorStop(0, 'rgba(255,248,225,1)'); sg.addColorStop(0.04, 'rgba(255,225,150,.95)'); sg.addColorStop(0.18, 'rgba(255,170,80,.42)'); sg.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, H * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // drifting haze bands
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 0.27 + t * 0.006 * (1 + i * 0.3)) % 1.5 - 0.25) * W, cy = H * (0.36 + i * 0.07), rx = W * (0.22 + 0.04 * i), ry = H * 0.035;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      g.addColorStop(0, `rgba(255,170,120,${0.1 + 0.02 * i})`); g.addColorStop(1, 'rgba(255,170,120,0)');
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    // a dropship crossing the sky
    const sp = ((t * 0.011) % 1.5) - 0.25, shx = sp * W - px * 24 * u, shy = H * 0.31 + Math.sin(t * 0.3) * 3 - py * 10 * u, sl = W * 0.13;
    ctx.save(); ctx.translate(shx, shy); ctx.fillStyle = 'rgba(8,4,12,.92)';
    ctx.beginPath(); ctx.moveTo(-sl, 0); ctx.lineTo(-sl * 0.55, -sl * 0.07); ctx.lineTo(sl * 0.5, -sl * 0.05); ctx.lineTo(sl, sl * 0.012); ctx.lineTo(sl * 0.55, sl * 0.075); ctx.lineTo(-sl * 0.6, sl * 0.06); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const ex = -sl * (0.95 - i * 0.07), g = ctx.createRadialGradient(ex, sl * 0.01, 0, ex, sl * 0.01, sl * 0.12); g.addColorStop(0, 'rgba(120,200,255,.9)'); g.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, sl * 0.01, sl * 0.12, 0, Math.PI * 2); ctx.fill(); }
    const tr = ctx.createLinearGradient(-sl, 0, -sl * 3, 0); tr.addColorStop(0, 'rgba(120,200,255,.28)'); tr.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = tr; ctx.fillRect(-sl * 3, -sl * 0.012, sl * 2, sl * 0.024);
    ctx.restore(); ctx.globalCompositeOperation = 'source-over';

    // terrain: far → near, each blended into the dusk haze and rim-lit by the sun
    for (const L of LAYERS) {
      const off = t * L.drift - px * L.par * u * 2, yoff = -py * L.par * 0.35 * u;
      ctx.beginPath(); ctx.moveTo(0, H);
      const pts = [];
      for (let x = 0; x <= W + 6; x += 5) {
        const xx = (x + off) * L.freq / u;
        let v = L.n(xx, 4);
        if (L.mesa) { // terraces: flat tops joined by steep (not vertical) cliff faces
          const f = v * 5, i = Math.floor(f), fr = f - i, sg = fr < 0.5 ? 0.5 * Math.pow(2 * fr, 5) : 1 - 0.5 * Math.pow(2 * (1 - fr), 5);
          v = v + ((i + sg) / 5 - v) * L.mesa;
        }
        v += (L.n(xx * 7, 2) - 0.5) * 0.05; // rock detail
        const y = H * L.base - (v - 0.5) * 2 * L.amp * H + yoff; pts.push(y); ctx.lineTo(x, y);
      }
      ctx.lineTo(W + 6, H); ctx.closePath();
      const top = Math.min(...pts), fill = ctx.createLinearGradient(0, top, 0, H); fill.addColorStop(0, L.c0); fill.addColorStop(1, L.c1);
      ctx.fillStyle = fill; ctx.fill();
      if (L.haze) { ctx.save(); ctx.clip(); const hz = ctx.createLinearGradient(0, top, 0, H * (L.base + 0.14)); hz.addColorStop(0, `rgba(255,150,90,${L.haze * 0.5})`); hz.addColorStop(1, `rgba(120,60,110,${L.haze * 0.2})`); ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      if (L.rim) { // sun-lit edge: strong on the flat tops, fading out along the cliff faces
        ctx.lineWidth = 1.4 * u;
        for (let i = 1; i < pts.length; i++) { const a = L.rim * (1 - Math.min(1, Math.abs(pts[i] - pts[i - 1]) / (3.2 * u))); if (a < 0.02) continue; ctx.strokeStyle = `rgba(255,190,110,${a})`; ctx.beginPath(); ctx.moveTo((i - 1) * 5, pts[i - 1]); ctx.lineTo(i * 5, pts[i]); ctx.stroke(); }
      }
    }

    // dust motes in the light
    ctx.globalCompositeOperation = 'lighter';
    for (const d of dust) {
      d.x -= 0.18 * d.z; d.y -= 0.05 * d.z; if (d.x < 0) d.x = W; if (d.y < 0) d.y = H;
      const a = (0.25 + 0.5 * Math.sin(t * 1.2 + d.ph)) * d.z * 0.55;
      ctx.fillStyle = `rgba(255,205,130,${Math.max(0, a)})`; ctx.fillRect(d.x - px * 30 * d.z, d.y - py * 18 * d.z, 1.6 * d.z * u + 0.6, 1.6 * d.z * u + 0.6);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ======================================================================= black hole (previous background)
  function drawHole(t) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      s.x -= 0.06 * s.z; if (s.x < 0) s.x = W;
      const tw = 0.55 + 0.45 * Math.sin(t * 1.5 + s.x);
      ctx.fillStyle = `rgba(255,244,214,${0.25 + 0.6 * s.z * tw})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    fx += (tx - fx) * 0.05; fy += (ty - fy) * 0.05;
    const cx = W * fx, cy = H * fy, R = Math.min(W, H) * 0.3;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.28 + Math.sin(t * 0.15) * 0.03);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const k = i / 13, rx = R * (1.05 + k * 1.5), ry = rx * (0.16 + 0.03 * Math.sin(t * 0.4 + i));
      const g = ctx.createLinearGradient(-rx, 0, rx, 0);
      const a = (0.22 - k * 0.14) * (0.8 + 0.2 * Math.sin(t * 0.7 + i));
      g.addColorStop(0, 'rgba(245,197,66,0)'); g.addColorStop(0.3, `rgba(255,214,102,${a})`);
      g.addColorStop(0.5, `rgba(255,255,255,${a * 1.2})`); g.addColorStop(0.7, `rgba(255,190,50,${a})`); g.addColorStop(1, 'rgba(245,197,66,0)');
      ctx.strokeStyle = g; ctx.lineWidth = R * (0.07 - k * 0.04) + 1;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const hg = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.35);
    hg.addColorStop(0, 'rgba(255,230,160,0.0)'); hg.addColorStop(0.55, 'rgba(255,215,110,0.28)'); hg.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    if (mode === 'landscape') drawLandscape(t); else drawHole(t);
    raf = requestAnimationFrame(frame);
  }

  function animated() { return mode === 'hole' || mode === 'landscape'; }
  // 'video': previews/home-bg.mp4 as a full-screen loop; falls back to the landscape if the file is missing
  function playVideo(on) {
    if (!vid) return;
    if (!on) { vid.pause(); return; }
    if (!vid.getAttribute('src')) { vid.src = ST.bgVideoUrl || 'previews/home-bg.mp4'; vid.addEventListener('error', () => { if (mode === 'video') ST.setBackground('landscape'); }, { once: true }); }
    if (ST.reducedMotion) { try { vid.currentTime = 2; } catch (e) {} vid.pause(); } else vid.play().catch(() => {});
  }
  function start() {
    stop();
    if (!animated()) return;
    resize();
    if (mode === 'landscape' && ST.reducedMotion) { drawLandscape(6); return; } // a single still frame
    raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  // the user's own video (set from System → Appearance); applied immediately when the video background is active
  ST.setBgVideo = (url) => {
    ST.bgVideoUrl = url || null;
    if (!vid) return;
    vid.removeAttribute('src'); vid.load();
    if (mode === 'video') playVideo(true);
  };
  ST.bgFocus = (x, y) => { tx = x == null ? 0.64 : x; ty = y == null ? 0.46 : y; };
  ST.setBackground = (m, dataUrl) => {
    mode = m;
    document.body.dataset.bg = m;
    if (m === 'image' && dataUrl) img.style.backgroundImage = `url("${dataUrl}")`;
    playVideo(m === 'video');
    if (animated()) start(); else { stop(); ctx.clearRect(0, 0, W || 1, H || 1); }
  };
  addEventListener('resize', () => { if (animated()) { resize(); if (!raf && mode === 'landscape') drawLandscape(6); } });
  addEventListener('mousemove', (e) => { tpx = e.clientX / innerWidth - 0.5; tpy = e.clientY / innerHeight - 0.5; }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); if (mode === 'video' && vid) vid.pause(); } else { if (animated()) start(); if (mode === 'video') playVideo(true); } });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) ST.reducedMotion = true;
  document.body.dataset.bg = mode;
})();

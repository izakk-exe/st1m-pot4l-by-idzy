/* ST1M PORT4L — animated blurred background (original artwork: drifting stars + black-hole accretion disk,
 * a nod to the Apex universe). Modes: 'hole' (animated), 'image' (user-supplied image, blurred), 'off'. */
(function () {
  const ST = (window.ST = window.ST || {});
  const cv = document.getElementById('bg');
  const img = document.getElementById('bgimg');
  const ctx = cv.getContext('2d');
  let W, H, stars, raf = 0, t0 = performance.now(), mode = 'hole';
  const SCALE = 0.5; // render at half-res; CSS blur hides the upscaling

  function resize() {
    W = cv.width = Math.ceil(innerWidth * SCALE); H = cv.height = Math.ceil(innerHeight * SCALE);
    stars = Array.from({ length: Math.round((W * H) / 2600) }, () => ({
      x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8, r: Math.random() * 1.4 + 0.3,
    }));
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    // stars
    for (const s of stars) {
      s.x -= 0.06 * s.z; if (s.x < 0) s.x = W;
      const tw = 0.55 + 0.45 * Math.sin(t * 1.5 + s.x);
      ctx.fillStyle = `rgba(255,244,214,${0.25 + 0.6 * s.z * tw})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }

    // black hole + accretion disk (additive)
    const cx = W * 0.64, cy = H * 0.46, R = Math.min(W, H) * 0.3;
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
    // lensed halo over the top
    const hg = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.35);
    hg.addColorStop(0, 'rgba(255,230,160,0.0)'); hg.addColorStop(0.55, 'rgba(255,215,110,0.28)'); hg.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, Math.PI * 2); ctx.fill();
    // event horizon
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    raf = requestAnimationFrame(frame);
  }

  function start() { stop(); if (mode === 'hole') { resize(); raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  ST.setBackground = (m, dataUrl) => {
    mode = m;
    document.body.dataset.bg = m;
    if (m === 'image' && dataUrl) img.style.backgroundImage = `url("${dataUrl}")`;
    if (m === 'hole') start(); else { stop(); ctx.clearRect(0, 0, W || 1, H || 1); }
  };
  addEventListener('resize', () => { if (mode === 'hole') resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (mode === 'hole') start(); });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) ST.reducedMotion = true;
})();

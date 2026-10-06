/* ST1M POT4L — settings previews.
 * A small procedural "arena" scene (original artwork, NOT game screenshots) that reacts to the settings,
 * plus a drag-to-compare widget. Users can override any preview with real screenshots:
 *   src/previews/<settingId>_<value>.jpg   (e.g. csm_enabled_0.jpg + csm_enabled_1.jpg) */
(function () {
  const ST = (window.ST = window.ST || {});
  const W = 960, H = 540, HOR = Math.round(H * 0.46);

  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

  // ---- values dict -> scene parameters
  ST.sceneParams = (v) => {
    const n = (k, d) => (v[k] === undefined || isNaN(+v[k]) ? d : +v[k]);
    return {
      sun: v.csm_enabled !== '0', cascade: n('csm_cascade_res', 1024), cov: n('csm_coverage', 2) >= 2 ? 1 : 0,
      dyn: v.shadow_enable !== '0', maxdyn: n('shadow_maxdynamic', 2),
      ssao: v.ssao_quality === '4', fog: v.volumetric_fog === '1', vl: v.volumetric_lighting === '1',
      picmip: Math.min(2, Math.round(n('mat_picmip', 0) / 2)), aniso: n('mat_forceaniso', 16), tri: v.mat_mip_linear !== '0',
      aa: v.mat_antialias_mode === '12', fov: n('fov', 90),
      decals: v.r_createmodeldecals === '0' ? 0 : n('r_decals', 128), lod: n('r_lod_switch_scale', 1),
      part: n('particle_cpu_level', 1), gibs: v.cl_gib_allow !== '0', mapHigh: v.map_detail_level !== '1',
      gamma: n('gamma', 1), fade: n('fadeDistScale', 1), reticle: v.reticle || '255 255 255',
    };
  };

  // ---- shared noise texture (256px), derived per picmip
  let T256 = null;
  function baseTex() {
    if (T256) return T256;
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = rng(7);
    g.fillStyle = '#6e5b46'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5200; i++) { const l = 70 + r() * 70; g.fillStyle = `rgba(${l + 25},${l + 5},${l - 20},${0.35 + r() * 0.4})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 2); }
    g.strokeStyle = 'rgba(20,12,6,.55)'; g.lineWidth = 1;
    for (let i = 0; i < 26; i++) { g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(255,225,170,.12)'; for (let i = 0; i < 40; i++) { g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + 5 + r() * 12, y + (r() - 0.5) * 6); g.stroke(); }
    return (T256 = c);
  }
  function texFor(p) {
    const n = [256, 96, 40][p.picmip] || 256, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(baseTex(), 0, 0, n, n); return c;
  }

  const poly = (g, pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); };

  // ---- the scene (world coordinates = canvas size, camera zoom applied around the centre)
  function scene(g, p) {
    const r = rng(11);
    const z = 1 / Math.tan((p.fov * Math.PI) / 360);
    g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
    const X0 = -W * 2, X1 = W * 3;

    // sky + sun
    const sky = g.createLinearGradient(0, -900, 0, HOR); sky.addColorStop(0, '#0d1424'); sky.addColorStop(0.55, '#3b3358'); sky.addColorStop(1, '#f0a35c');
    g.fillStyle = sky; g.fillRect(X0, -1500, X1 - X0, HOR + 1500);
    const sx = W * 0.8, sy = HOR - 105;
    let gl = g.createRadialGradient(sx, sy, 4, sx, sy, 230); gl.addColorStop(0, 'rgba(255,240,200,.95)'); gl.addColorStop(0.15, 'rgba(255,200,120,.55)'); gl.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = gl; g.fillRect(sx - 240, sy - 240, 480, 480);
    // mountains
    g.fillStyle = '#2a2236'; g.beginPath(); g.moveTo(X0, HOR); let mx = X0, my = HOR - 40; const rm = rng(5);
    while (mx < X1) { g.lineTo(mx, HOR - 30 - rm() * 70); mx += 40 + rm() * 70; } g.lineTo(X1, HOR); g.fill();

    // ground (perspective textured rows)
    const gg = g.createLinearGradient(0, HOR, 0, H * 1.8); gg.addColorStop(0, '#6d5a47'); gg.addColorStop(1, '#2c231b');
    g.fillStyle = gg; g.fillRect(X0, HOR, X1 - X0, H * 2);
    const tex = texFor(p); g.imageSmoothingEnabled = false;
    const pat = g.createPattern(tex, 'repeat');
    g.save(); g.globalAlpha = 0.9;
    for (let y = HOR + 1; y < H * 1.5; y += 2) {
      const d = (y - HOR) / (H - HOR), sxx = 0.35 + d * 3.2, v = (60 / (d + 0.03)) % 256;
      if (pat.setTransform) pat.setTransform(new DOMMatrix([sxx, 0, 0, 1, -W / 2 * sxx, -v]));
      g.fillStyle = pat; g.fillRect(X0, y, X1 - X0, 2);
    }
    g.restore();
    // ground shade (lighting) + low anisotropy blur band at distance
    const gs = g.createLinearGradient(0, HOR, 0, HOR + 260); gs.addColorStop(0, 'rgba(240,160,90,.35)'); gs.addColorStop(1, 'rgba(20,10,5,.1)');
    g.fillStyle = gs; g.fillRect(X0, HOR, X1 - X0, 260);
    if (p.aniso < 16) {
      const band = 150;
      const fade = g.createLinearGradient(0, HOR, 0, HOR + band + 40); fade.addColorStop(0, `rgba(143,110,84,${p.aniso === 0 ? 0.9 : p.aniso <= 2 ? 0.7 : 0.35})`); fade.addColorStop(1, 'rgba(143,110,84,0)');
      g.fillStyle = fade; g.fillRect(X0, HOR, X1 - X0, band + 40);
    }
    if (!p.tri) { g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 6; i++) g.fillRect(X0, HOR + 30 + i * i * 9, X1 - X0, 2); }

    // helper: buildings
    const B = [
      { x: 70, w: 230, h: 170, y: HOR + 18, far: false },
      { x: 360, w: 120, h: 110, y: HOR + 4, far: true },
      { x: 700, w: 160, h: 130, y: HOR + 10, far: true },
    ];
    const blurSh = p.cascade <= 256 ? 9 : p.cascade <= 512 ? 5 : p.cascade <= 1024 ? 2.4 : 0.8;

    // sun shadows (under buildings / props)
    if (p.sun) {
      g.save(); g.filter = `blur(${blurSh}px)`;
      for (const b of B) { if (b.far && p.cov === 0) continue; const dx = -b.h * 0.85, dy = b.h * 0.5; poly(g, [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w + dx, b.y + dy], [b.x + dx, b.y + dy]], 'rgba(8,4,14,.62)'); }
      g.restore();
    }

    // buildings
    const wallTex = g.createPattern(tex, 'repeat');
    for (const b of B) {
      const top = b.y - b.h, sideW = b.w * 0.22;
      g.fillStyle = wallTex; if (wallTex.setTransform) wallTex.setTransform(new DOMMatrix([1.6, 0, 0, 1.6, b.x, top]));
      g.fillRect(b.x, top, b.w, b.h);
      g.fillStyle = p.sun ? 'rgba(255,170,90,.18)' : 'rgba(40,30,40,.28)'; g.fillRect(b.x, top, b.w, b.h);
      poly(g, [[b.x + b.w, top], [b.x + b.w + sideW, top + 10], [b.x + b.w + sideW, b.y], [b.x + b.w, b.y]], p.sun ? 'rgba(30,18,34,.85)' : 'rgba(70,56,70,.8)');
      poly(g, [[b.x - 4, top], [b.x + b.w + sideW + 4, top + 10], [b.x + b.w + sideW + 4, top - 6], [b.x - 4, top - 16]], '#2d2535');
      g.fillStyle = 'rgba(255,205,120,.75)'; for (let i = 0; i < 3; i++) g.fillRect(b.x + 18 + i * (b.w / 3.3), top + 30, 24, 16);
      if (p.ssao) { const ao = g.createLinearGradient(0, b.y - 36, 0, b.y); ao.addColorStop(0, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = ao; g.fillRect(b.x, b.y - 36, b.w, 36);
        const cr = g.createLinearGradient(b.x + b.w - 26, 0, b.x + b.w, 0); cr.addColorStop(0, 'rgba(0,0,0,0)'); cr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = cr; g.fillRect(b.x + b.w - 26, top, 26, b.h); }
    }

    // decals on the main wall
    const nd = Math.min(18, Math.round(p.decals / 14));
    for (let i = 0; i < nd; i++) { const dx = 90 + r() * 190, dy = HOR - 150 + r() * 140; g.fillStyle = 'rgba(12,8,6,.8)'; g.beginPath(); g.arc(dx, dy, 2.4 + r() * 1.8, 0, 7); g.fill(); g.strokeStyle = 'rgba(12,8,6,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(dx - 5, dy - 2); g.lineTo(dx + 5, dy + 3); g.stroke(); }

    // props (crates) — number depends on map detail, far ones on LOD / fade distance
    const props = [];
    const rp = rng(23); const count = p.mapHigh ? 16 : 7;
    for (let i = 0; i < count; i++) props.push({ x: 20 + rp() * (W - 60), d: rp() });
    props.sort((a, b) => a.d - b.d);
    for (const q of props) {
      const far = q.d < 0.35; if (far && (p.lod < 0.9 || p.fade < 1.5) && q.d < 0.2) continue;
      const s = 14 + q.d * 40, y = HOR + 20 + q.d * 190;
      if (p.sun) { g.save(); g.filter = `blur(${blurSh * 0.6}px)`; poly(g, [[q.x, y], [q.x + s, y], [q.x + s - s * 1.3, y + s * 0.35], [q.x - s * 1.3, y + s * 0.35]], 'rgba(8,4,14,.5)'); g.restore(); }
      g.fillStyle = '#5a4630'; g.fillRect(q.x, y - s, s, s); g.fillStyle = '#7a6040'; g.fillRect(q.x, y - s, s, s * 0.16);
      g.strokeStyle = '#33261a'; g.lineWidth = 1; g.strokeRect(q.x, y - s, s, s);
      if (p.ssao) { const ao = g.createRadialGradient(q.x + s / 2, y, 1, q.x + s / 2, y, s * 0.9); ao.addColorStop(0, 'rgba(0,0,0,.5)'); ao.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = ao; g.fillRect(q.x - s * 0.5, y - s * 0.4, s * 2, s * 0.9); }
    }

    // characters
    const chars = [{ x: 470, s: 1.5, y: HOR + 210 }, { x: 640, s: 0.8, y: HOR + 120 }, { x: 300, s: 0.7, y: HOR + 100 }, { x: 820, s: 0.62, y: HOR + 85 }, { x: 560, s: 0.45, y: HOR + 55 }];
    chars.forEach((c, i) => {
      if (p.sun && (i === 0 || p.cov > 0 || i < 3)) { g.save(); g.filter = `blur(${blurSh}px)`; poly(g, [[c.x - 12 * c.s, c.y], [c.x + 20 * c.s, c.y], [c.x + 20 * c.s - 170 * c.s, c.y + 34 * c.s], [c.x - 12 * c.s - 170 * c.s, c.y + 34 * c.s]], 'rgba(8,4,14,.55)'); g.restore(); }
      if (p.dyn && i <= p.maxdyn) { g.save(); g.filter = `blur(${2 + (p.cascade < 512 ? 3 : 0)}px)`; g.fillStyle = 'rgba(5,3,10,.55)'; g.beginPath(); g.ellipse(c.x - 24 * c.s, c.y + 4, 50 * c.s, 10 * c.s, -0.1, 0, 7); g.fill(); g.restore(); }
      legend(g, c.x, c.y, c.s, p);
    });

    // particles + debris near an explosion
    const ex = W * 0.6, ey = HOR + 40, pc = [10, 40, 110][p.part] || 40; const rr = rng(77);
    if (p.part > 0) { for (let i = 0; i < p.part * 4; i++) { const sm = g.createRadialGradient(ex + (rr() - .5) * 80, ey - rr() * 70, 2, ex, ey - 40, 40 + rr() * 30); sm.addColorStop(0, 'rgba(70,60,60,.28)'); sm.addColorStop(1, 'rgba(70,60,60,0)'); g.fillStyle = sm; g.fillRect(ex - 120, ey - 160, 240, 200); } }
    for (let i = 0; i < pc; i++) { const a = rr() * 6.28, d = rr() * (40 + p.part * 40); g.fillStyle = `rgba(255,${150 + rr() * 90},${40 + rr() * 60},${0.5 + rr() * 0.5})`; g.fillRect(ex + Math.cos(a) * d, ey - 20 + Math.sin(a) * d * 0.8, 1.5 + rr() * 2, 1.5 + rr() * 2); }
    if (p.gibs) for (let i = 0; i < 14; i++) { const a = rr() * 6.28, d = 30 + rr() * 90; poly(g, [[0, 0], [5 + rr() * 5, 2], [2, 6 + rr() * 4]].map(([a1, b1]) => [ex + Math.cos(a) * d + a1, ey - 10 + Math.sin(a) * d * 0.7 + b1]), 'rgba(40,34,40,.95)'); }

    // light shafts / fog
    if (p.vl) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const a = sx - i * 150 - 40; poly(g, [[sx - 10, sy], [sx + 20, sy], [a - 90, H * 1.2], [a - 20, H * 1.2]], 'rgba(255,205,130,.075)'); } g.restore(); }
    if (p.fog) { const fg = g.createLinearGradient(0, HOR - 130, 0, HOR + 230); fg.addColorStop(0, 'rgba(210,175,150,0)'); fg.addColorStop(0.35, 'rgba(210,175,150,.62)'); fg.addColorStop(1, 'rgba(180,150,130,.16)'); g.fillStyle = fg; g.fillRect(X0, HOR - 130, X1 - X0, 360); g.fillStyle = 'rgba(190,160,140,.1)'; g.fillRect(X0, -1500, X1 - X0, 4000); }
    g.restore();

    // reticle (screen space)
    const [cr, cg, cb] = String(p.reticle).split(/\s+/).map((x) => +x || 0); const col = `rgb(${cr},${cg},${cb})`;
    g.save(); g.translate(W / 2, H / 2); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.5; g.shadowColor = col; g.shadowBlur = 6;
    for (const [a, b, c, d] of [[-22, 0, -8, 0], [8, 0, 22, 0], [0, -22, 0, -8], [0, 8, 0, 22]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 1.8, 0, 7); g.fill(); g.restore();
  }

  function legend(g, x, y, s, p) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#17141c';
    g.fillRect(-26, -64, 18, 66); g.fillRect(6, -64, 18, 66);                          // legs
    poly(g, [[-34, -64], [32, -64], [26, -150], [-28, -150]], '#1e1a26');                 // torso
    g.fillRect(-48, -146, 18, 62); g.fillRect(28, -146, 20, 56);                           // arms
    g.beginPath(); g.arc(0, -172, 20, 0, 7); g.fill();                                     // head
    poly(g, [[-26, -160], [0, -214], [26, -160]], '#13101a');                              // hood
    g.fillStyle = '#2a2530'; g.fillRect(24, -118, 54, 9);                                  // weapon
    g.strokeStyle = p.sun ? 'rgba(255,190,110,.85)' : 'rgba(150,130,160,.5)'; g.lineWidth = 3;   // rim light
    g.beginPath(); g.moveTo(26, -150); g.lineTo(32, -64); g.moveTo(14, -190); g.lineTo(24, -166); g.stroke();
    g.restore();
  }

  ST.drawScene = (cv, p) => {
    cv.width = W; cv.height = H; const g = cv.getContext('2d');
    if (!p.aa) { const o = document.createElement('canvas'); o.width = W / 2; o.height = H / 2; const og = o.getContext('2d'); og.scale(0.5, 0.5); scene(og, p); g.imageSmoothingEnabled = false; g.drawImage(o, 0, 0, W, H); }
    else scene(g, p);
    if (p.gamma < 1) { g.fillStyle = `rgba(0,0,0,${(1 - p.gamma) * 0.7})`; g.fillRect(0, 0, W, H); }
    else if (p.gamma > 1) { g.fillStyle = `rgba(255,240,220,${(p.gamma - 1) * 0.45})`; g.fillRect(0, 0, W, H); }
  };

  // ---- drag-to-compare widget. a / b: { values, label } ; optional image overrides
  ST.mountCompare = (host, a, b, imgs) => {
    host.classList.add('cmp'); host.innerHTML = '';
    const mk = (src, cls) => {
      if (src && src.img) { const im = document.createElement('img'); im.src = src.img; im.className = cls; im.draggable = false; host.appendChild(im); return im; }
      const c = document.createElement('canvas'); c.className = cls; ST.drawScene(c, ST.sceneParams(src.values)); host.appendChild(c); return c;
    };
    const A = mk(imgs && imgs.a ? { img: imgs.a } : a, 'base'), Bv = mk(imgs && imgs.b ? { img: imgs.b } : b, 'top');
    host.insertAdjacentHTML('beforeend', `<div class="bar"></div><span class="lab l">${a.label}</span><span class="lab r">${b.label}</span>`);
    const bar = host.querySelector('.bar');
    const set = (pct) => { pct = Math.max(0, Math.min(100, pct)); Bv.style.clipPath = `inset(0 0 0 ${pct}%)`; bar.style.left = pct + '%'; };
    const move = (e) => { const r = host.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    host.onpointerdown = (e) => { host.setPointerCapture(e.pointerId); move(e); host.onpointermove = move; };
    host.onpointerup = () => { host.onpointermove = null; };
    set(50);
  };

  // ---- real in-game captures (previews/<id>_<value>.webp, from the MIT-licensed Config Editor project)
  ST.IMGS = new Set(["csm_cascade_res_1024", "csm_cascade_res_128", "csm_cascade_res_512", "csm_coverage_1", "csm_coverage_2", "csm_enabled_0", "csm_enabled_1", "map_detail_level_1", "map_detail_level_2", "mat_antialias_mode_0", "mat_antialias_mode_12", "mat_forceaniso_0", "mat_forceaniso_16", "mat_forceaniso_2", "mat_forceaniso_8", "preset_balanced", "preset_competitive", "preset_ultra", "r_createmodeldecals_0", "r_createmodeldecals_1", "r_decals_128", "r_decals_256", "r_decals_64", "r_lod_switch_scale_0.6", "r_lod_switch_scale_0.8", "r_lod_switch_scale_1.0", "r_lod_switch_scale_1.5", "r_lod_switch_scale_2.0", "ssao_quality_0", "ssao_quality_4", "stream_memory_0", "stream_memory_1000000", "stream_memory_160000", "stream_memory_2000000", "stream_memory_3000000", "stream_memory_600000", "volumetric_lighting_0", "volumetric_lighting_1"]);
  const numForms = (v) => [String(v)].concat(isFinite(Number(v)) ? [Number(v).toFixed(1), String(Number(v))] : []);
  ST.imgUrl = (id, v) => { for (const f of numForms(v)) if (ST.IMGS.has(`${id}_${f}`)) return `previews/${id}_${f}.webp`; return null; };
  ST.imgValues = (id) => [...ST.IMGS].filter((n) => n.startsWith(id + '_')).map((n) => n.slice(id.length + 1))
    .filter((v) => v !== '' && !/^[a-z]/i.test(v)).map((v) => (isFinite(Number(v)) ? String(Number(v)) : v));
  const tryImg = (url) => new Promise((res) => { const i = new Image(); i.onload = () => res(url); i.onerror = () => res(null); i.src = url; });
  // built-in capture, else a user-supplied one (.webp / .jpg dropped in previews/)
  ST.resolveImg = async (id, v) => ST.imgUrl(id, v) || (await tryImg(`previews/${id}_${v}.webp`)) || (await tryImg(`previews/${id}_${v}.jpg`));
  ST.loadOverrides = async (id, va, vb) => {
    const [a, b] = await Promise.all([ST.resolveImg(id, va), ST.resolveImg(id, vb)]);
    return a && b ? { a, b } : null;
  };

  // ---- "what changes" explanations
  ST.FX = {
    ssao_quality: ['Ajoute de l\'ombre dans les recoins et à la base des murs/caisses : plus de relief, mais ça coûte du GPU.', 'Adds shading in corners and at the base of walls/crates: more depth, but costs GPU.'],
    mat_antialias_mode: ['Lisse les bords crénelés des objets (escaliers sur les diagonales). Désactivé = image plus nette mais crantée.', 'Smooths jagged object edges. Off = sharper but stair-stepped.'],
    stream_memory: ['Mémoire vidéo réservée aux textures. « Aucun » libère de la VRAM mais les textures peuvent apparaître en retard (pop-in).', 'VRAM reserved for textures. “None” frees VRAM but textures may pop in late.'],
    mat_picmip: ['Résolution des textures du sol et des murs : plus bas = textures floues/pixelisées mais moins de VRAM.', 'Resolution of ground and wall textures: lower = blurrier/blockier but less VRAM.'],
    mat_forceaniso: ['Netteté du sol vu de biais : à 16x le sol lointain reste précis, sans filtrage il devient flou.', 'Sharpness of ground seen at an angle: 16x keeps distant ground crisp, off makes it blurry.'],
    mat_mip_linear: ['Adoucit la transition entre niveaux de détail : désactivé = bandes visibles sur le sol.', 'Smooths transitions between detail levels: off = visible bands on the ground.'],
    shadow_enable: ['Ombres des personnages et objets mobiles : sans elles les ennemis « flottent » mais le gain de FPS est important.', 'Shadows of characters and moving objects: without them enemies “float” but FPS gain is big.'],
    shadow_maxdynamic: ['Nombre d\'entités qui projettent une ombre dynamique en même temps.', 'How many entities cast a dynamic shadow at once.'],
    shadow_depth_dimen_min: ['Résolution minimale des ombres dynamiques (bords plus ou moins doux).', 'Minimum dynamic shadow resolution (softer or sharper edges).'],
    shadow_depth_upres_factor_max: ['Netteté maximale des ombres proches.', 'Maximum sharpness of nearby shadows.'],
    csm_enabled: ['Ombres du soleil : les bâtiments projettent de longues ombres. Les couper donne beaucoup de FPS et supprime les zones sombres où se cacher.', 'Sun shadows: buildings cast long shadows. Turning them off gives lots of FPS and removes dark hiding spots.'],
    csm_coverage: ['Distance jusqu\'à laquelle les ombres du soleil sont affichées (les bâtiments lointains perdent leur ombre en « Bas »).', 'How far sun shadows are drawn (far buildings lose their shadow on “Low”).'],
    csm_cascade_res: ['Netteté du bord des ombres du soleil : 256 = bords flous, 2048 = bords nets.', 'Edge sharpness of sun shadows: 256 = blurry, 2048 = crisp.'],
    particle_cpu_level: ['Quantité de particules (étincelles, fumée) lors des explosions et tirs.', 'Amount of particles (sparks, smoke) from explosions and gunfire.'],
    cl_gib_allow: ['Fragments visuels qui volent lors des destructions.', 'Visual fragments flying off on destruction.'],
    volumetric_lighting: ['Rayons de lumière visibles dans l\'air (« god rays »).', 'Visible light shafts in the air (“god rays”).'],
    volumetric_fog: ['Brume qui masque le lointain : coûteuse et peut gêner la visibilité.', 'Haze that hides the distance: costly and can hurt visibility.'],
    r_createmodeldecals: ['Marques d\'impact visibles sur les murs et les corps.', 'Visible bullet marks on walls and bodies.'],
    r_decals: ['Nombre maximal d\'impacts gardés à l\'écran.', 'Maximum number of impact marks kept on screen.'],
    r_lod_switch_scale: ['Distance à laquelle les petits objets passent en version simplifiée ou disparaissent : plus haut = plus de détails au loin.', 'Distance at which small objects switch to simplified models or vanish: higher = more far detail.'],
    fadeDistScale: ['Distance d\'apparition des petits objets (caisses, débris).', 'Distance at which small objects (crates, debris) appear.'],
    map_detail_level: ['Quantité de petits objets de décor sur la carte.', 'Amount of small scenery objects on the map.'],
    fov: ['Champ de vision : plus large = tu vois plus sur les côtés mais les cibles paraissent plus petites.', 'Field of view: wider = you see more at the sides but targets look smaller.'],
    reticle: ['Couleur du réticule affichée au centre de l\'écran.', 'Colour of the crosshair at screen centre.'],
    gamma: ['Luminosité globale : plus clair aide à repérer dans les zones sombres.', 'Overall brightness: brighter helps spotting in dark areas.'],
  };
  ST.hasPreview = (id) => !!ST.FX[id];
})();

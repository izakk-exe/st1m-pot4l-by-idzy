/* ST1M PORT4L — TikTok trailer (1080 x 1920, 28 s, French). Reuses the film kit (scenes.js) with a portrait canvas.
 * Keep important content inside the TikTok safe zone: x 60..960, y 180..1500 (captions sit around y 1390). */
(function (g) {
  const ST = (g.ST = g.ST || {});
  const W = 1080, H = 1920, DUR = 28, CX = 540;
  const IMPACTS = [[2.45, 10], [4.2, 26], [7.05, 7], [11.05, 7], [15.25, 7], [20.7, 7], [23.8, 14]];

  function scenes(t) {
    const K = ST.film.kit, ctx = K.ctx, { T, E, clamp, lerp, seg, GOLD, GOLD2, A, rr } = K;
    const S = [[0, 3.5, A_], [3.2, 7.3, B_], [7.0, 11.3, C_], [11.0, 15.5, D_], [15.2, 20.9, E_], [20.6, 24.0, F_], [23.7, 28.1, G_]];
    S.forEach(([a, b, fn]) => { if (t >= a && t <= b) fn(t); });
    captions(t);

    // ---------------------------------------------------------------- A : hook 110 -> 120
    function A_(t) {
      K.stars(t, 0.8, 6); const cy = 760;
      const fade = 1 - seg(t, 3.0, 3.45), zoom = 1 + E.inCubic(seg(t, 2.95, 3.45)) * 2.2;
      T('YOUR FOV IS STUCK AT', CX, cy - 330, { size: 50, weight: 700, ls: lerp(36, 10, E.outCubic(seg(t, 0.2, 1.1))), alpha: E.outCubic(seg(t, 0.2, 0.9)) * (1 - seg(t, 2.4, 2.5)) * fade, color: '#d8d2c0' });
      const glitch = t > 1.95 && t < 2.45, label = t < 2.45 ? '110' : '120';
      const sc = t >= 2.45 ? lerp(1.3, 1, E.outBack(seg(t, 2.45, 3.0))) : lerp(1.06, 1, E.outCubic(seg(t, 0.2, 1.3)));
      ctx.save(); ctx.translate(CX, cy + 100); ctx.scale(sc * zoom, sc * zoom); ctx.globalAlpha *= fade;
      const gr = ctx.createLinearGradient(0, -250, 0, 60);
      if (label === '110') { gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#a9a49a'); } else { gr.addColorStop(0, '#fff6cf'); gr.addColorStop(0.5, GOLD2); gr.addColorStop(1, '#e0a800'); }
      const a0 = E.outCubic(seg(t, 0.2, 1.0));
      if (glitch) { const r = K.rngf(Math.floor(t * 30)); for (let i = 0; i < 6; i++) { const y0 = -250 + r() * 300, hh = 20 + r() * 50, dx = (r() - 0.5) * 80; ctx.save(); ctx.beginPath(); ctx.rect(-500, y0, 1000, hh); ctx.clip(); T(r() > 0.5 ? '110' : '120', dx, 0, { size: 400, weight: 800, grad: gr, alpha: a0 }); ctx.restore(); }
        ctx.globalCompositeOperation = 'lighter'; T('110', -9, 0, { size: 400, weight: 800, color: 'rgba(255,0,60,.55)' }); T('120', 9, 0, { size: 400, weight: 800, color: 'rgba(0,220,255,.55)' }); ctx.globalCompositeOperation = 'source-over'; }
      else T(label, 0, 0, { size: 400, weight: 800, grad: gr, alpha: a0, glow: label === '120' ? 70 : 12, gc: GOLD });
      ctx.restore();
      T('FIELD OF VIEW', CX, cy + 215, { size: 32, weight: 600, ls: 20, alpha: E.outCubic(seg(t, 0.5, 1.2)) * fade, color: '#9c968a' });
      if (t > 2.6) T('NOT ANYMORE.', CX, cy + 380, { size: 84, weight: 800, ls: 4, alpha: clamp(E.outBack(seg(t, 2.6, 3.1))) * fade, color: GOLD2, glow: 34 });
      if (t > 2.45 && t < 2.95) { ctx.save(); ctx.fillStyle = `rgba(255,236,170,${0.55 * (1 - seg(t, 2.45, 2.95))})`; ctx.fillRect(0, 0, W, H); ctx.restore(); K.streak(CX, cy, 900, 0.9 * (1 - seg(t, 2.45, 3.3))); }
    }

    // ---------------------------------------------------------------- B : portal + stim slam + title
    function B_(t) {
      const b = { cx: CX, cy: 640, size: 900 }, IMP = 4.2, p = K.portalGeom(b);
      const aS = E.outCubic(seg(t, 3.2, 3.8)); K.stars(t, aS, 14); K.accretion(t, 930, 230, 90, aS * 0.9);
      if (t < IMP + 0.06) K.procPortal(t, b, E.inOut(seg(t, 3.25, 3.95)), E.outCubic(seg(t, 3.7, 4.15)));
      const fin = E.outCubic(seg(t, IMP - 0.02, IMP + 0.22));
      K.logoParts(b, { portalA: fin, syrA: t > 3.85 ? 1 : 0, syrOff: t < IMP ? lerp(1150, 0, E.inCubic(seg(t, 3.85, IMP))) : 0 });
      if (t >= IMP) {
        const u = t - IMP;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const q = clamp(u / 1.0 - i * 0.12); if (q <= 0 || q >= 1) continue; ctx.strokeStyle = `rgba(255,214,102,${0.7 * (1 - q)})`; ctx.lineWidth = 14 * (1 - q) + 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, 40 + E.outCubic(q) * 1000, (40 + E.outCubic(q) * 1000) * 0.45, -0.31, 0, Math.PI * 2); ctx.stroke(); } ctx.restore();
        const r = K.rngf(77); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = 0; i < 80; i++) { const ang = r() * Math.PI * 2, sp = 200 + r() * 1000, life = 0.5 + r() * 0.9; if (u > life) continue; const d = sp * (1 - Math.pow(1 - u / life, 2)) * 0.6, d2 = Math.max(0, d - sp * 0.04); ctx.strokeStyle = `rgba(255,${190 + r() * 60},${80 + r() * 90},${1 - u / life})`; ctx.lineWidth = 2 + r() * 2.5; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ang) * d2, p.y + Math.sin(ang) * d2 * 0.9); ctx.lineTo(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d * 0.9); ctx.stroke(); } ctx.restore();
        if (u < 0.3) { ctx.save(); ctx.fillStyle = `rgba(255,248,225,${0.95 * (1 - u / 0.3)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
        K.streak(p.x, p.y, 1100, 0.95 * Math.exp(-u * 2.4));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 520); gr.addColorStop(0, `rgba(170,90,255,${0.2 + 0.06 * Math.sin(t * 2.2)})`); gr.addColorStop(1, 'rgba(170,90,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      const u = t - (IMP + 0.3);
      if (u > 0) { K.titleText(CX, 1090, 124, u, { ls0: 40, ls1: 10 }); T('BY IDZY', CX, 1160, { size: 34, weight: 700, ls: 24, alpha: E.outCubic(seg(u, 0.8, 1.4)), color: GOLD, glow: 12 }); T('THE FREE APEX TOOL', CX, 1245, { size: 36, weight: 600, ls: 8, alpha: E.outCubic(seg(u, 1.3, 2.0)) * 0.9, color: '#e8e2d0' }); }
      const ex = E.inCubic(seg(t, 6.85, 7.3)); if (ex > 0) { ctx.save(); ctx.globalAlpha = ex; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }

    // ---------------------------------------------------------------- C : one click
    function C_(t) {
      K.stars(t, 0.6, 8); const u = t - 7.0, fo = 1 - seg(t, 10.9, 11.3), fi = E.outCubic(seg(t, 7.0, 7.3)); ctx.save(); ctx.globalAlpha *= fo * fi;
      const zinH = E.inOut(seg(t, 8.5, 9.1)) - E.inOut(seg(t, 10.0, 10.6)), hl = 1 - 0.95 * clamp(zinH * 1.8), h1 = E.outExpo(seg(u, 0.1, 0.8)) * hl, h2 = E.outExpo(seg(u, 0.3, 1.0)) * hl;
      T('YOUR WHOLE CONFIG', CX - (1 - clamp(h1)) * 400, 300, { size: 86, weight: 800, alpha: h1, ls: 2 }); T('IN 1 CLICK.', CX + (1 - clamp(h2)) * 400, 440, { size: 150, weight: 800, alpha: h2, color: GOLD2, glow: 40 });
      const enter = E.outQuart(seg(u, 0.25, 1.1)), sw = 980, sx0 = 50, sy0 = 530, sh = sw * 0.625;
      const zin = E.inOut(seg(t, 8.5, 9.1)) - E.inOut(seg(t, 10.0, 10.6)); const zoom = 1 + 0.5 * zin, bx = sx0 + (617 / 1280) * sw, by = sy0 + (262 / 800) * sh;
      ctx.save(); ctx.translate(bx, by); ctx.scale(zoom, zoom); ctx.translate(-bx, -by);
      K.UIshot(A.home, sx0, sy0 + (1 - enter) * 500, sw, lerp(0.04, 0, enter), clamp(enter * 1.4));
      const ck = seg(t, 9.15, 9.85); if (ck > 0 && ck < 1) { ctx.save(); ctx.strokeStyle = `rgba(255,236,170,${1 - ck})`; ctx.lineWidth = 7 * (1 - ck) + 1; ctx.beginPath(); ctx.arc(bx, by, 28 + ck * 150, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      const chips = ['FOV 120', 'RGB RETICLE', 'TEXTURES', 'SHADOWS']; const chipFade = 1 - seg(t, 9.2, 9.5);
      chips.forEach((c, i) => { const q = E.outBack(seg(u, 0.9 + i * 0.15, 1.4 + i * 0.15)); if (q > 0) { ctx.save(); ctx.globalAlpha *= chipFade; ctx.translate(70 + (i % 2) * 490, 1190 + Math.floor(i / 2) * 84); ctx.scale(clamp(q, 0, 1.08), clamp(q, 0, 1.08)); K.chip(0, 0, 440, 66, c, GOLD, clamp(q)); ctx.restore(); } });
      const tp = E.outBack(seg(t, 9.5, 10.0)) * (1 - seg(t, 10.6, 10.95)); if (tp > 0.01) { ctx.save(); ctx.translate(60, 1190 - (1 - tp) * 30); ctx.globalAlpha *= clamp(tp); rr(0, 0, 960, 96, 20); ctx.fillStyle = 'rgba(10,8,0,.95)'; ctx.shadowColor = GOLD; ctx.shadowBlur = 26; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
        T('Applied ✔  26 changes', 36, 62, { size: 36, weight: 700, align: 'left', color: '#fff' }); T('Undo', 924, 62, { size: 34, weight: 700, align: 'right', color: GOLD2 }); ctx.restore(); }
      ctx.restore();
    }

    // ---------------------------------------------------------------- D : before / after (real captures)
    function D_(t) {
      const fi = seg(t, 11.0, 11.35), fo = 1 - seg(t, 15.1, 15.5); ctx.save(); ctx.globalAlpha *= fi * fo;
      const pair = t < 13.3 ? [A.cs0, A.cs1, 11.0, 13.3, 'SHADOWS · OFF', 'SHADOWS · ON'] : [A.ao0, A.ao4, 13.3, 15.5, 'SSAO · OFF', 'SSAO · ON'];
      const [a, b, t0, t1, la, lb] = pair, u = clamp((t - t0) / (t1 - t0)), zoom = 1.0 + 0.07 * u;
      const slide = u < 0.3 ? lerp(0.5, 0.1, E.inOut(u / 0.3)) : u < 0.78 ? lerp(0.1, 0.9, E.inOut((u - 0.3) / 0.48)) : lerp(0.9, 0.5, E.inOut((u - 0.78) / 0.22));
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); K.cover(a, 0, 0, W, H, zoom * 1.0, lerp(-30, 30, u));
      ctx.save(); ctx.beginPath(); ctx.rect(slide * W, 0, W, H); ctx.clip(); K.cover(b, 0, 0, W, H, zoom * 1.0, lerp(-30, 30, u)); ctx.restore();
      ctx.fillStyle = K.vgrad(0, 620, 'rgba(0,0,0,.85)', 'rgba(0,0,0,0)'); ctx.fillRect(0, 0, W, 620); ctx.fillStyle = K.vgrad(H - 700, H, 'rgba(0,0,0,0)', 'rgba(0,0,0,.8)'); ctx.fillRect(0, H - 700, W, 700);
      const x = slide * W; ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 24; ctx.fillStyle = GOLD2; ctx.fillRect(x - 2.5, 0, 5, H); ctx.restore();
      ctx.save(); ctx.translate(x, 960); ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fillStyle = '#0a0800'; ctx.shadowColor = GOLD; ctx.shadowBlur = 26; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = GOLD; ctx.lineWidth = 4.5; ctx.stroke(); T('⇆', 0, 17, { size: 46, color: GOLD2 }); ctx.restore();
      ctx.restore();
      const hp = E.outExpo(seg(t, 11.15, 11.9)); T('BEFORE', 70 - (1 - hp) * 400, 330, { size: 120, weight: 800, align: 'left', alpha: hp, ls: 4, glow: 20 }); T('/ AFTER', 70 - (1 - hp) * 400, 450, { size: 120, weight: 800, align: 'left', alpha: hp, ls: 4, color: GOLD2, glow: 30 });
      T('REAL IN-GAME CAPTURES', 70, 540, { size: 38, weight: 700, ls: 8, align: 'left', alpha: E.outCubic(seg(t, 11.6, 12.2)) * 0.9, color: '#e8e2d0' });
      const lA = clamp((slide * W - 170) / 150), lB = clamp((W - slide * W - 170) / 150);
      T(la, 60, 1250, { size: 44, weight: 800, ls: 6, align: 'left', alpha: lA, glow: 16 }); T(lb, W - 60, 1250, { size: 44, weight: 800, ls: 6, align: 'right', alpha: lB, color: GOLD2, glow: 16 });
      ctx.restore();
    }

    // ---------------------------------------------------------------- E : movement lab counter + superglide trainer
    function E_(t) {
      K.stars(t, 0.5, 8); const u = t - 15.2, fi = seg(t, 15.2, 15.55), fo = 1 - seg(t, 20.5, 20.9); ctx.save(); ctx.globalAlpha *= fi * fo;
      // drifting technique chips (two faint columns)
      ctx.save(); ctx.globalAlpha *= 0.42 * (1 - seg(u, 2.5, 3.0)); [[-215, 40], [865, 64]].forEach(([x, sp], ci) => { for (let i = -2; i < 16; i++) { const idx = (ci * 31 + i + 12 + Math.floor((u * sp) / 100)) % A.names.length, n = A.names[idx], y = i * 100 - ((u * sp) % 100) + 80; const a = Math.min(clamp(y / 200), clamp((H - 500 - y) / 200)); if (a > 0.02) K.chip(x, y, 430, 66, n.n.length > 20 ? n.n.slice(0, 19) + '…' : n.n, K.DIFFC[n.d] || '#888', a * 0.7); } }); ctx.restore();
      const cOut = 1 - seg(u, 2.5, 2.9); const n = Math.round(287 * E.outExpo(seg(u, 0.1, 1.8)));
      T('MOVEMENT LAB', CX, 470, { size: 40, weight: 700, ls: 16, alpha: E.outCubic(seg(u, 0.1, 0.7)) * cOut, color: GOLD });
      { const gr = ctx.createLinearGradient(0, 560, 0, 860); gr.addColorStop(0, '#fff'); gr.addColorStop(1, GOLD2); T(String(n), CX, 840, { size: 380, weight: 800, grad: gr, glow: 44, alpha: E.outCubic(seg(u, 0.1, 0.7)) * cOut }); }
      T('MOVEMENT TECHNIQUES', CX, 930, { size: 42, weight: 700, ls: 8, alpha: E.outCubic(seg(u, 0.7, 1.3)) * cOut, color: '#e8e2d0' });
      T('LEARNING PATH  ·  XP  ·  BADGES', CX, 1010, { size: 34, weight: 600, ls: 8, alpha: E.outCubic(seg(u, 1.1, 1.7)) * cOut, color: '#bdb7a6' });
      // trainer
      const v = u - 2.7; if (v > 0) {
        const BW = 900, bx = 90, by = 700, M = 0.95, win = 0.25, prog = clamp((v - 0.2) / M), e = E.outCubic(seg(v, 0, 0.5));
        T('SUPERGLIDE TRAINER', CX, 540, { size: 74, weight: 800, ls: 6, alpha: e, glow: 24 }); T('JUMP  →  CROUCH  ·  1 FRAME', CX, 606, { size: 32, weight: 600, ls: 6, alpha: e, color: '#bdb7a6' });
        ctx.save(); ctx.globalAlpha *= e; rr(bx, by, BW, 76, 18); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); rr(bx, by, BW * prog, 76, 18); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill(); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.roundRect(bx + BW * (1 - win), by, BW * win, 76, [0, 18, 18, 0]); ctx.fillStyle = 'rgba(245,197,66,.28)'; ctx.shadowColor = GOLD; ctx.shadowBlur = 30; ctx.fill(); ctx.restore(); ctx.fillStyle = GOLD; ctx.fillRect(bx + BW * (1 - win), by, 4, 76); ctx.restore();
        const jx = bx + BW * (1 - win) + BW * win * 0.42, cx2 = jx + 30;
        const mk = (x, lab, col, p) => { if (p <= 0) return; ctx.save(); ctx.translate(x, by - 36 - (1 - clamp(p)) * 60); ctx.globalAlpha *= clamp(p); ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 26; ctx.fill(); ctx.shadowBlur = 0; T(lab, 0, 12, { size: 32, weight: 800, color: '#000' }); ctx.restore(); };
        mk(jx, 'J', '#7cff3a', E.outBack(seg(v, 1.2, 1.5))); mk(cx2, 'C', '#35d9ff', E.outBack(seg(v, 1.45, 1.75)));
        const rp = E.outExpo(seg(v, 1.8, 2.3)); T(Math.round(93 * rp) + '%', CX, 1090, { size: 230, weight: 800, glow: 46, gc: '#7be495', color: '#7be495', alpha: clamp(rp * 2) });
        T('GAP 7.4 ms = 1.07 FRAMES', CX, 1170, { size: 38, weight: 700, color: GOLD2, alpha: rp }); T('@ 144 FPS', CX, 1220, { size: 30, weight: 500, color: '#9c968a', alpha: rp });
      }
      ctx.restore();
    }

    // ---------------------------------------------------------------- F : overlay
    function F_(t) {
      K.stars(t, 0.5, 8); const u = t - 20.6, fi = seg(t, 20.6, 20.95), fo = 1 - seg(t, 23.6, 24.0); ctx.save(); ctx.globalAlpha *= fi * fo;
      const cx = CX, cy = 800, R = 340, e = E.outCubic(seg(u, 0, 0.6));
      T('OVERLAY', CX, 300, { size: 100, weight: 800, ls: 10, alpha: E.outCubic(seg(u, 0.05, 0.6)), glow: 26 }); T('KEYBOARD & MOUSE', CX, 380, { size: 52, weight: 700, ls: 10, alpha: E.outCubic(seg(u, 0.15, 0.7)), color: GOLD2 });
      const down = (a, b) => u > a && u < b, s = 118;
      K.keyCap(cx, cy - 106, s, 'W', down(0.25, 2.3), e); K.keyCap(cx - 130, cy + 24, s, 'A', down(0.8, 1.5), e); K.keyCap(cx, cy + 24, s, 'S', false, e); K.keyCap(cx + 130, cy + 24, s, 'D', down(1.5, 2.3), e);
      K.keyCap(cx - 84, cy + 160, s, 'CTRL', down(1.9, 2.3), e); K.keyCap(cx + 84, cy + 160, s, 'SPACE', down(0.95, 1.2), e);
      ctx.save(); ctx.globalAlpha *= e; ctx.strokeStyle = 'rgba(124,255,58,.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy + 30, R, 0, Math.PI * 2); ctx.stroke();
      const kf = [[0.25, -2.6], [1.0, -1.0], [1.4, -0.1], [2.1, 0.8], [2.8, 2.3]]; const ang = (q) => { if (q <= kf[0][0]) return kf[0][1]; for (let i = 1; i < kf.length; i++) if (q <= kf[i][0]) return lerp(kf[i - 1][1], kf[i][1], (q - kf[i - 1][0]) / (kf[i][0] - kf[i - 1][0])); return kf[kf.length - 1][1]; };
      const en = (q) => clamp(Math.max(0, Math.sin((q - 0.2) * 2.3)) * 1.6) * (q > 0.2 && q < 2.8 ? 1 : 0);
      for (let k2 = 14; k2 >= 0; k2--) { const q = u - k2 * 0.03, a1 = ang(q), a0 = ang(q - 0.03), eq = en(q); if (eq <= 0.02) continue; ctx.strokeStyle = `rgba(124,255,58,${eq * (1 - k2 / 15) * 0.9})`; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy + 30, R, a0, a1); ctx.stroke(); }
      const ea = en(u); if (ea > 0.03) { const dx = cx + Math.cos(ang(u)) * R, dy = cy + 30 + Math.sin(ang(u)) * R; ctx.shadowColor = '#7cff3a'; ctx.shadowBlur = 40; ctx.fillStyle = `rgba(190,255,150,${ea})`; ctx.beginPath(); ctx.arc(dx, dy, 18, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      const wc = Math.round(14 * E.outCubic(seg(u, 1.2, 2.1))); T('▲  ' + wc + '/s  ▼', cx, 1230, { size: 52, weight: 700, color: '#b9ff95', alpha: e, glow: 14, gc: '#7cff3a' });
      ctx.restore();
    }

    // ---------------------------------------------------------------- G : call to action
    function G_(t) {
      const u = t - 23.7; K.stars(t, 0.9, 10); K.accretion(t, 930, 300, 110, 0.6 * E.outCubic(seg(u, 0.3, 1.2)));
      const b = { cx: CX, cy: 520, size: 760 }, e = E.outExpo(seg(u, 0.1, 0.9)), p = K.portalGeom(b);
      ctx.save(); ctx.globalAlpha *= e; ctx.translate(0, (1 - e) * 60); K.logoParts(b, { portalA: 1, syrA: 1, syrOff: 0 }); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 460); gr.addColorStop(0, `rgba(170,90,255,${(0.22 + 0.06 * Math.sin(t * 2)) * e})`); gr.addColorStop(1, 'rgba(170,90,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
      K.titleText(CX, 960, 118, u - 0.3, { ls0: 36, ls1: 10 });
      T('BY IDZY', CX, 1026, { size: 32, weight: 700, ls: 22, alpha: E.outCubic(seg(u, 0.9, 1.5)), color: GOLD, glow: 12 });
      T('FREE  ·  NO ADS  ·  OPEN SOURCE', CX, 1100, { size: 34, weight: 600, ls: 5, alpha: E.outCubic(seg(u, 1.3, 2.0)), color: '#e8e2d0' });
      T('WINDOWS 10 / 11', CX, 1150, { size: 28, weight: 500, ls: 8, alpha: E.outCubic(seg(u, 1.5, 2.2)), color: '#9c968a' });
      const dl = E.outBack(seg(u, 1.9, 2.5)); if (dl > 0) { const pulse = 1 + 0.025 * Math.sin(t * 6); ctx.save(); ctx.translate(CX, 1250); ctx.scale(clamp(dl, 0, 1.05) * pulse, clamp(dl, 0, 1.05) * pulse); ctx.globalAlpha *= clamp(dl); rr(-330, -52, 660, 104, 28); ctx.fillStyle = 'rgba(245,197,66,.16)'; ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 3.5; ctx.shadowColor = GOLD; ctx.shadowBlur = 30; ctx.stroke(); ctx.shadowBlur = 0; T('LINK IN BIO', 0, 20, { size: 62, weight: 800, ls: 8, color: GOLD2 }); ctx.restore(); }
      T('Not affiliated with EA / Respawn.', CX, 1500, { size: 22, weight: 400, alpha: E.outCubic(seg(u, 2.4, 3.0)) * 0.5, color: '#9c968a' });
    }

    // ---------------------------------------------------------------- captions (TikTok-style, word highlight)
    function captions(t) {
      const vo = ST.vo; if (!vo) return; const line = vo.lines.find((l) => t >= l.t - 0.05 && t <= l.end + 0.35); if (!line) return;
      const chunks = []; let cur = []; line.words.forEach((w) => { const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length; if (cur.length && (cur.length >= 3 || len > 19)) { chunks.push(cur); cur = []; } cur.push(w); }); if (cur.length) chunks.push(cur);
      let ch = chunks.find((c) => t >= c[0].s - 0.04 && t < (chunks[chunks.indexOf(c) + 1] ? chunks[chunks.indexOf(c) + 1][0].s - 0.04 : line.end + 0.35)) || chunks[0];
      const size = 84; ctx.save(); ctx.font = `800 ${size}px ${K.FONT}`; ctx.letterSpacing = '2px';
      const words = ch.map((w) => ({ ...w, text: w.w.toUpperCase().replace(/[,.]$/, '') })); const widths = words.map((w) => ctx.measureText(w.text).width), gap = 26, total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
      let x = CX - total / 2; const y = 1400, a = clamp((t - (ch[0].s - 0.04)) / 0.08);
      words.forEach((w, i) => { const active = t >= w.s && t < w.e + 0.02, pop = active ? 1 + 0.12 * Math.exp(-(t - w.s) * 9) : 1;
        ctx.save(); ctx.translate(x + widths[i] / 2, y); ctx.scale(pop, pop); ctx.globalAlpha *= a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(0,0,0,.92)'; ctx.strokeText(w.text, 0, 0);
        if (active) { ctx.shadowColor = GOLD; ctx.shadowBlur = 26; } ctx.fillStyle = active ? GOLD2 : '#ffffff'; ctx.fillText(w.text, 0, 0); ctx.restore(); x += widths[i] + gap; });
      ctx.restore();
    }
  }
  const draw = (t) => ST.film.kit.compose(t, scenes, IMPACTS, DUR);
  ST.trailer_tt = { W, H, DUR, draw, FPS: 30 };
})(window);

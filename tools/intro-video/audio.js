/* ST1M PORT4L — procedural soundtrack + voice-over mixing (everything synthesised with WebAudio; the voice comes from WAV files).
 *   prepareVO(set)            -> analyse the WAV files of a voice-over set (trim silences, fit into the time slots, word timings for captions)
 *   renderAudio(kind, vo)     -> AudioBuffer: music (kind = 'intro' | 'tiktok') + voice, ducked and mixed, deterministic. */
(function (g) {
  const SR = 48000;
  const rngf = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  function makeIR(ctx, secs, decay) { const n = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, n, ctx.sampleRate), r = rngf(11); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < 400 ? i / 400 : 1); } return b; }
  function noiseBuf(ctx, secs) { const n = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, n, ctx.sampleRate), r = rngf(5); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = r() * 2 - 1; } return b; }

  // ------------------------------------------------------------------ instruments
  function buildKit(ctx, dur) {
    const master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 3.2; comp.attack.value = 0.006; comp.release.value = 0.22;
    master.connect(comp); comp.connect(ctx.destination);
    const bus = ctx.createGain(); bus.connect(master);
    const rev = ctx.createConvolver(); rev.buffer = makeIR(ctx, 3.2, 2.4); const revG = ctx.createGain(); revG.gain.value = 0.42; rev.connect(revG); revG.connect(master);
    const NB = noiseBuf(ctx, 6);
    const send = (node, wet = 0.3, dry = 1) => { const d = ctx.createGain(); d.gain.value = dry; node.connect(d); d.connect(bus); if (wet > 0) { const w = ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(rev); } };
    const env = (gn, t, a, peak, d, end = 0.0001) => { gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); gn.gain.exponentialRampToValueAtTime(end, t + a + d); };
    const noise = (t, d) => { const s = ctx.createBufferSource(); s.buffer = NB; s.loop = true; s.start(t, 0); s.stop(t + d); return s; };
    const k = { ctx, master, bus, send, dur, NOTE };
    k.kick = (t, v = 0.9) => { const o = ctx.createOscillator(), g1 = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.1); env(g1, t, 0.002, v, 0.3); o.connect(g1); send(g1, 0.03); o.start(t); o.stop(t + 0.4); };
    k.hat = (t, v = 0.07, len = 0.05) => { const n = noise(t, len + 0.02), f = ctx.createBiquadFilter(), g1 = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 7500; env(g1, t, 0.001, v, len); n.connect(f); f.connect(g1); send(g1, 0.08); };
    k.rim = (t, v = 0.1) => { const n = noise(t, 0.16), f = ctx.createBiquadFilter(), g1 = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 1.2; env(g1, t, 0.001, v, 0.12); n.connect(f); f.connect(g1); send(g1, 0.25); };
    k.tick = (t, f = 1400, v = 0.09, len = 0.07) => { const o = ctx.createOscillator(), g1 = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; env(g1, t, 0.001, v, len); o.connect(g1); send(g1, 0.2); o.start(t); o.stop(t + len + 0.05); };
    k.bell = (t, f = 1760, v = 0.12) => { [1, 2.76, 5.4].forEach((m, i) => { const o = ctx.createOscillator(), g1 = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m; env(g1, t, 0.002, v / (1 + i * 1.6), 0.9 - i * 0.2); o.connect(g1); send(g1, 0.5); o.start(t); o.stop(t + 1.2); }); };
    k.bass = (t, f, d, v = 0.5) => { const o = ctx.createOscillator(), s = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g1 = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; s.type = 'sine'; s.frequency.value = f / 2; lp.type = 'lowpass'; lp.frequency.setValueAtTime(700, t); lp.frequency.exponentialRampToValueAtTime(160, t + d); env(g1, t, 0.01, v, d * 0.95); o.connect(lp); s.connect(lp); lp.connect(g1); send(g1, 0.04); o.start(t); s.start(t); o.stop(t + d + 0.05); s.stop(t + d + 0.05); };
    k.pluck = (t, f, v = 0.11, pan = 0) => { const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g1 = ctx.createGain(), p = ctx.createStereoPanner(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = f; o2.frequency.value = f * 1.006; lp.type = 'lowpass'; lp.Q.value = 4; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(420, t + 0.28); env(g1, t, 0.004, v, 0.42); p.pan.value = pan; o1.connect(lp); o2.connect(lp); lp.connect(g1); g1.connect(p); send(p, 0.45); o1.start(t); o2.start(t); o1.stop(t + 0.6); o2.stop(t + 0.6); };
    k.pad = (t, freqs, d, v = 0.05, cutoff = 1100) => { freqs.forEach((f) => [-7, 7].forEach((cents) => { const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g1 = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents; lp.type = 'lowpass'; lp.frequency.value = cutoff; g1.gain.setValueAtTime(0.0001, t); g1.gain.linearRampToValueAtTime(v, t + Math.min(1.4, d * 0.4)); g1.gain.setValueAtTime(v, t + d - 1.2 > t ? t + d - 1.2 : t + d * 0.6); g1.gain.linearRampToValueAtTime(0.0001, t + d); o.connect(lp); lp.connect(g1); send(g1, 0.55, 0.7); o.start(t); o.stop(t + d + 0.1); })); };
    k.boom = (t, v = 1) => {
      const o = ctx.createOscillator(), g1 = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.45); env(g1, t, 0.003, v, 1.9); o.connect(g1); send(g1, 0.2); o.start(t); o.stop(t + 2.2);
      const n = noise(t, 1.4), lp = ctx.createBiquadFilter(), g2 = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2500, t); lp.frequency.exponentialRampToValueAtTime(90, t + 0.9); env(g2, t, 0.002, v * 0.8, 1.1); n.connect(lp); lp.connect(g2); send(g2, 0.35);
      const c = noise(t, 2.6), hp = ctx.createBiquadFilter(), g3 = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 3500; env(g3, t, 0.004, v * 0.28, 2.2); c.connect(hp); hp.connect(g3); send(g3, 0.6);
    };
    k.shimmer = (t, f = 880, v = 0.1, d = 3) => { [1, 2.01, 2.76, 4.07, 5.4, 7.1].forEach((m, i) => { const o = ctx.createOscillator(), g1 = ctx.createGain(), p = ctx.createStereoPanner(); o.type = 'sine'; o.frequency.value = f * m; env(g1, t, 0.003, v / (1 + i * 0.7), d * (1 - i * 0.1)); p.pan.value = (i % 2 ? 1 : -1) * 0.4; o.connect(g1); g1.connect(p); send(p, 0.7); o.start(t); o.stop(t + d + 0.2); }); };
    k.riser = (t0, t1, v = 0.18) => { const n = noise(t0, t1 - t0 + 0.05), bp = ctx.createBiquadFilter(), g1 = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(9000, t1); g1.gain.setValueAtTime(0.0001, t0); g1.gain.exponentialRampToValueAtTime(v, t1 - 0.05); g1.gain.linearRampToValueAtTime(0.0001, t1 + 0.04); n.connect(bp); bp.connect(g1); send(g1, 0.3);
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g2 = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(900, t1); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t0); lp.frequency.exponentialRampToValueAtTime(5000, t1); g2.gain.setValueAtTime(0.0001, t0); g2.gain.exponentialRampToValueAtTime(v * 0.45, t1 - 0.05); g2.gain.linearRampToValueAtTime(0.0001, t1 + 0.04); o.connect(lp); lp.connect(g2); send(g2, 0.35); o.start(t0); o.stop(t1 + 0.1); };
    k.whoosh = (t, d = 0.7, v = 0.2, up = true) => { const n = noise(t, d + 0.1), bp = ctx.createBiquadFilter(), g1 = ctx.createGain(), p = ctx.createStereoPanner(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.setValueAtTime(up ? 400 : 4200, t); bp.frequency.exponentialRampToValueAtTime(up ? 4200 : 400, t + d); g1.gain.setValueAtTime(0.0001, t); g1.gain.exponentialRampToValueAtTime(v, t + d * 0.55); g1.gain.exponentialRampToValueAtTime(0.0001, t + d); p.pan.setValueAtTime(up ? -0.7 : 0.7, t); p.pan.linearRampToValueAtTime(up ? 0.7 : -0.7, t + d); n.connect(bp); bp.connect(g1); g1.connect(p); send(p, 0.35); };
    k.thud = (t, v = 0.5) => { const o = ctx.createOscillator(), g1 = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2); env(g1, t, 0.004, v, 0.55); o.connect(g1); send(g1, 0.25); o.start(t); o.stop(t + 0.7); };
    return k;
  }

  const BEAT = 0.5;
  const CH = [ // Am, F, C, G : root (bass), pad voicing, arp tones (midi)
    { b: NOTE(33), pad: [NOTE(57), NOTE(60), NOTE(64)], arp: [57, 60, 64, 69, 72, 69, 64, 60] },
    { b: NOTE(29), pad: [NOTE(53), NOTE(57), NOTE(60)], arp: [53, 57, 60, 65, 69, 65, 60, 57] },
    { b: NOTE(36), pad: [NOTE(60), NOTE(64), NOTE(67)], arp: [60, 64, 67, 72, 76, 72, 67, 64] },
    { b: NOTE(31), pad: [NOTE(55), NOTE(59), NOTE(62)], arp: [55, 59, 62, 67, 71, 67, 62, 59] },
  ];
  const chordAt = (t, t0) => CH[Math.floor((t - t0) / 2) % 4];

  // ------------------------------------------------------------------ score : 48 s intro film (16:9)
  function introScore(k, ctx) {
    const { kick, hat, rim, tick, bell, bass, pluck, pad, boom, shimmer, riser, whoosh, thud, bus, master } = k;
    bus.gain.setValueAtTime(1, 0); bus.gain.setValueAtTime(1, 8.2); bus.gain.linearRampToValueAtTime(0.12, 8.4); bus.gain.setValueAtTime(0.12, 8.44); bus.gain.linearRampToValueAtTime(1, 8.5);
    master.gain.setValueAtTime(0, 0); master.gain.linearRampToValueAtTime(0.9, 1.2); master.gain.setValueAtTime(0.9, 45.5); master.gain.linearRampToValueAtTime(0, 48);
    pad(0.3, [NOTE(33), NOTE(45), NOTE(52)], 7.6, 0.06, 500);
    [1.2, 2.4, 3.6].forEach((t) => thud(t, 0.32)); tick(0.9, 1100, 0.05); tick(1.0, 1650, 0.035);
    { const r = rngf(31); for (let i = 0; i < 18; i++) { const t = 2.55 + i * 0.027 + r() * 0.02; tick(t, 300 + r() * 3000, 0.06, 0.03); } }
    boom(3.05, 0.55); shimmer(3.05, 1318, 0.05, 2.2); pluck(3.2, NOTE(45), 0.18); pluck(3.3, NOTE(52), 0.12); whoosh(2.95, 0.5, 0.18, true);
    riser(4.0, 6.4, 0.2);
    riser(6.6, 8.4, 0.24); thud(7.2, 0.4); thud(7.7, 0.45); thud(8.05, 0.5);
    boom(8.45, 1.05); shimmer(8.45, 880, 0.14, 3.6); whoosh(8.42, 1.4, 0.2, false);
    pad(8.5, CH[0].pad, 2.0, 0.08, 1500); pad(10.5, CH[1].pad, 2.0, 0.08, 1500); pad(12.5, CH[2].pad, 2.2, 0.08, 1500);
    for (let i = 0; i < 24; i++) { const t = 9.5 + i * 0.25, c = chordAt(t, 8.5); if (t < 14.3) pluck(t, NOTE(c.arp[i % 8]), 0.07, Math.sin(i) * 0.5); }
    for (let t = 10.5; t < 14.2; t += 0.5) hat(t + 0.25, 0.04);
    bass(10.5, CH[1].b, 1.8, 0.28); bass(12.5, CH[2].b, 1.8, 0.28);
    whoosh(13.9, 0.9, 0.22, true);
    const G0 = 14.5;
    for (let t = G0; t < 41.2; t += BEAT) {
      const bar = Math.floor((t - G0) / 2), c = CH[bar % 4], beat = Math.round((t - G0) / BEAT) % 4;
      const sect = t < 21.7 ? 1 : t < 28.8 ? 2 : t < 35.2 ? 3 : t < 38.4 ? 0 : 3;
      if (sect === 0) { if (Math.abs((t - 35.3) % 1) < 0.01) thud(t, 0.38); continue; }
      kick(t, sect === 1 ? 0.7 : 0.85);
      hat(t + 0.25, sect >= 2 ? 0.07 : 0.05); if (sect >= 3) { hat(t + 0.125, 0.035); hat(t + 0.375, 0.035); }
      if (beat === 1 || beat === 3) rim(t, sect >= 2 ? 0.08 : 0.05);
      if (beat === 0) { bass(t, c.b, 0.46, 0.4); bass(t + 0.75, c.b, 0.2, 0.3); }
      if (beat === 2) bass(t, c.b * (bar % 2 ? 1.5 : 1), 0.4, 0.3);
    }
    for (let i = 0; i < Math.floor(26.7 / 0.25); i++) { const t = G0 + i * 0.25; if (t > 41.2 || (t >= 35.2 && t < 38.4)) continue; const c = chordAt(t, G0); pluck(t, NOTE(c.arp[i % 8] + (t > 28.8 ? 12 : 0)), t < 21.7 ? 0.06 : 0.085, Math.sin(i * 0.7) * 0.55); }
    for (let b = 0; b < 14; b++) { const t = G0 + b * 2, c = CH[b % 4]; if (t >= 35.2 && t < 38.4) { pad(t, c.pad, 2.2, 0.07, 900); continue; } pad(t, c.pad, 2.1, 0.055, 1200); }
    whoosh(14.15, 0.5, 0.22, true); boom(14.55, 0.35);
    tick(17.3, 1100, 0.12); tick(17.35, 1700, 0.1); bell(17.62, 1760, 0.13); bell(17.75, 2349, 0.08);
    whoosh(21.4, 0.55, 0.22, false); boom(21.8, 0.35); whoosh(25.2, 0.45, 0.2, true); thud(25.4, 0.4);
    whoosh(28.5, 0.5, 0.22, true); boom(28.85, 0.35);
    for (let i = 0; i < 26; i++) tick(29.1 + i * 0.07 + Math.pow(i / 26, 1.5) * 0.3, 700 + i * 55, 0.045, 0.04);
    for (let i = 0; i < 9; i++) bell(31.4 + i * 0.32, NOTE(69 + [0, 3, 7, 12, 15, 19, 24, 27, 31][i]), 0.05);
    whoosh(34.85, 0.5, 0.2, true); boom(35.3, 0.3);
    tick(37.55, 1300, 0.14, 0.09); tick(37.95, 1900, 0.14, 0.09);
    boom(38.2, 0.5); [69, 73, 76, 81].forEach((n, i) => bell(38.2 + i * 0.07, NOTE(n + 12), 0.1));
    riser(38.0, 38.6, 0.12); [38.75, 39.3, 39.55, 40.05, 40.45].forEach((t, i) => tick(t, 900 + (i % 2) * 300, 0.08, 0.05));
    for (let i = 0; i < 14; i++) tick(39.9 + i * 0.07 + (i % 3) * 0.015, 2400, 0.03, 0.02);
    riser(39.6, 41.45, 0.26); thud(40.6, 0.4); thud(41.0, 0.45);
    boom(41.5, 1.0); shimmer(41.5, 660, 0.12, 3.8); whoosh(41.45, 1.2, 0.2, false);
    pad(41.5, [NOTE(45), NOTE(57), NOTE(60), NOTE(64), NOTE(71)], 3.2, 0.09, 1800); pad(44.6, [NOTE(41), NOTE(53), NOTE(57), NOTE(60), NOTE(69)], 3.5, 0.08, 1500);
    for (let i = 0; i < 10; i++) pluck(42.0 + i * 0.25, NOTE(CH[0].arp[i % 8]), 0.07 - i * 0.004, Math.sin(i) * 0.5);
    bass(41.5, NOTE(33), 2.0, 0.35); bass(43.5, NOTE(29), 1.8, 0.3); kick(41.5, 0.8); kick(42.0, 0.55); kick(42.5, 0.55);
    shimmer(43.9, 1760, 0.06, 3.5); bell(44.2, NOTE(81), 0.07);
  }

  // ------------------------------------------------------------------ score : 28 s TikTok trailer (9:16) — punchy, hook first
  function tiktokScore(k) {
    const { kick, hat, rim, tick, bell, bass, pluck, pad, boom, shimmer, riser, whoosh, thud, bus, master } = k;
    bus.gain.setValueAtTime(1, 0); bus.gain.setValueAtTime(1, 4.0); bus.gain.linearRampToValueAtTime(0.12, 4.17); bus.gain.setValueAtTime(0.12, 4.2); bus.gain.linearRampToValueAtTime(1, 4.27);
    master.gain.setValueAtTime(0.0, 0); master.gain.linearRampToValueAtTime(0.9, 0.25); master.gain.setValueAtTime(0.9, 26.4); master.gain.linearRampToValueAtTime(0, 28);
    // hook: tension, glitch, "120" reveal
    pad(0.0, [NOTE(33), NOTE(45), NOTE(52)], 4.4, 0.07, 600); thud(0.8, 0.3); thud(1.6, 0.34);
    { const r = rngf(17); for (let i = 0; i < 14; i++) tick(1.95 + i * 0.03 + r() * 0.015, 300 + r() * 3000, 0.06, 0.03); }
    boom(2.45, 0.7); shimmer(2.45, 1318, 0.06, 1.6); whoosh(2.3, 0.45, 0.2, true); pluck(2.6, NOTE(45), 0.2); pluck(2.7, NOTE(52), 0.13);
    // portal -> logo slam at 4.2
    riser(3.1, 4.15, 0.26); thud(3.55, 0.4); thud(3.85, 0.45); thud(4.05, 0.5);
    boom(4.2, 1.05); shimmer(4.2, 880, 0.15, 3.0); whoosh(4.18, 1.1, 0.2, false);
    // groove (fast): kick on every beat from the slam
    const G0 = 4.5;
    for (let t = G0; t < 23.7; t += BEAT) {
      const bar = Math.floor((t - G0) / 2), c = CH[bar % 4], beat = Math.round((t - G0) / BEAT) % 4;
      kick(t, 0.85); hat(t + 0.25, 0.07); if (t > 11) { hat(t + 0.125, 0.035); hat(t + 0.375, 0.035); }
      if (beat === 1 || beat === 3) rim(t, 0.07);
      if (beat === 0) { bass(t, c.b, 0.46, 0.4); bass(t + 0.75, c.b, 0.2, 0.3); }
      if (beat === 2) bass(t, c.b * (bar % 2 ? 1.5 : 1), 0.4, 0.3);
    }
    for (let i = 0; i < 80; i++) { const t = G0 + i * 0.25; if (t > 23.5) break; const c = chordAt(t, G0); pluck(t, NOTE(c.arp[i % 8] + (t > 15 ? 12 : 0)), t < 7 ? 0.06 : 0.085, Math.sin(i * 0.7) * 0.55); }
    for (let b = 0; b < 10; b++) pad(G0 + b * 2, CH[b % 4].pad, 2.1, 0.06, 1300);
    // scene transitions + UI sounds
    whoosh(6.75, 0.45, 0.22, true); boom(7.05, 0.3); whoosh(10.75, 0.45, 0.22, false); boom(11.05, 0.3); whoosh(14.95, 0.45, 0.22, true); boom(15.25, 0.3);
    tick(9.15, 1100, 0.13); tick(9.2, 1700, 0.1); bell(9.5, 1760, 0.13); bell(9.62, 2349, 0.08);
    for (let i = 0; i < 24; i++) tick(15.45 + i * 0.065 + Math.pow(i / 24, 1.5) * 0.25, 700 + i * 55, 0.045, 0.04);
    whoosh(20.3, 0.45, 0.2, true); boom(20.7, 0.3);
    tick(19.0, 1300, 0.14, 0.09); tick(19.25, 1900, 0.14, 0.09); boom(19.45, 0.4); [69, 73, 76, 81].forEach((n, i) => bell(19.45 + i * 0.07, NOTE(n + 12), 0.1));
    [21.2, 21.8, 22.05, 22.6].forEach((t, i) => tick(t, 900 + (i % 2) * 300, 0.08, 0.05));
    // finale
    riser(22.4, 23.75, 0.26); thud(23.1, 0.4);
    boom(23.8, 1.0); shimmer(23.8, 660, 0.13, 3.4); whoosh(23.75, 1.0, 0.2, false);
    pad(23.8, [NOTE(45), NOTE(57), NOTE(60), NOTE(64), NOTE(71)], 3.4, 0.09, 1800);
    for (let i = 0; i < 8; i++) pluck(24.2 + i * 0.25, NOTE(CH[0].arp[i % 8]), 0.07 - i * 0.005, Math.sin(i) * 0.5);
    bass(23.8, NOTE(33), 2.0, 0.35); kick(23.8, 0.8); kick(24.3, 0.5); kick(24.8, 0.5); bell(25.2, NOTE(81), 0.07);
  }
  const SCORES = { intro: { dur: 48, fn: introScore }, tiktok: { dur: 28, fn: tiktokScore } };

  // ------------------------------------------------------------------ voice-over
  const trimmed = (buf) => { const d = buf.getChannelData(0); let a = 0, b = d.length - 1; const th = 0.012; while (a < d.length && Math.abs(d[a]) < th) a++; while (b > a && Math.abs(d[b]) < th) b--; const pre = Math.round(0.03 * buf.sampleRate), post = Math.round(0.08 * buf.sampleRate); return { s: Math.max(0, a - pre), e: Math.min(d.length, b + post) }; };
  /* Loads vo/script.json + vo/<set>/<id>.wav, trims leading/trailing silence, computes the playback rate needed to fit each slot (max +22 %)
   * and per-word timings (proportional to word length) used for the captions. Missing files are skipped. */
  async function prepareVO(set) {
    const script = await (await fetch('vo/script.json')).json(); const cfg = script.sets[set]; const dec = new OfflineAudioContext(1, 1, SR); const lines = [];
    for (const l of cfg.lines) {
      let buf = null; try { const r = await fetch(`vo/${set}/${l.id}.wav?${Date.now()}`); if (!r.ok) continue; buf = await dec.decodeAudioData(await r.arrayBuffer()); } catch (e) { continue; }
      const tr = trimmed(buf), dur = (tr.e - tr.s) / buf.sampleRate, rate = clamp(dur / l.max, 1, 1.22), len = dur / rate;
      const words = l.text.replace(/[.,!?]/g, (m) => m).split(/\s+/).filter(Boolean); const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2); const tot = weights.reduce((a, b) => a + b, 0);
      let acc = 0; const wt = words.map((w, i) => { const s = l.t + (acc / tot) * len; acc += weights[i]; return { w, s, e: l.t + (acc / tot) * len }; });
      lines.push({ id: l.id, t: l.t, max: l.max, text: l.text, buf, s: tr.s, dur, rate, len, end: l.t + len, words: wt, overflow: dur / rate > l.max + 0.02 });
    }
    return { set, lang: cfg.lang, lines };
  }

  async function renderVoiceTrack(vo, dur) {
    const ctx = new OfflineAudioContext(2, SR * dur, SR), out = ctx.createGain(); out.gain.value = 1.0;
    const rv = ctx.createConvolver(); rv.buffer = makeIR(ctx, 1.4, 3); const rg = ctx.createGain(); rg.gain.value = 0.1; rv.connect(rg); rg.connect(ctx.destination);
    out.connect(ctx.destination);
    for (const l of vo.lines) {
      const src = ctx.createBufferSource(); src.buffer = l.buf; src.playbackRate.value = l.rate;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85;
      const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 180; body.gain.value = 2.5; body.Q.value = 0.9;       // a bit of chest
      const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3200; pres.gain.value = 4; pres.Q.value = 0.9;        // presence
      const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 7500; air.gain.value = 2.5;
      const cp = ctx.createDynamicsCompressor(); cp.threshold.value = -26; cp.knee.value = 8; cp.ratio.value = 4; cp.attack.value = 0.004; cp.release.value = 0.14;
      const g1 = ctx.createGain(); g1.gain.value = 1.7;
      src.connect(hp); hp.connect(body); body.connect(pres); pres.connect(air); air.connect(cp); cp.connect(g1); g1.connect(out); g1.connect(rv);
      src.start(l.t, l.s / l.buf.sampleRate, l.dur);
    }
    return ctx.startRendering();
  }

  async function renderMusic(kind) {
    const sc = SCORES[kind], ctx = new OfflineAudioContext(2, SR * sc.dur, SR), k = buildKit(ctx, sc.dur); sc.fn(k, ctx);
    const buf = await ctx.startRendering();
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * 2.1); }
    let peak = 0; for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i])); }
    const kk = peak > 0 ? 0.84 / peak : 1; for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= kk; }
    return buf;
  }

  /* kind: 'intro' | 'tiktok'; vo: result of prepareVO (or null for music only). Returns a stereo AudioBuffer with a ._stats report. */
  async function renderAudio(kind = 'intro', vo = null) {
    const sc = SCORES[kind], music = await renderMusic(kind); const n = music.length;
    const out = new OfflineAudioContext(2, n, SR).createBuffer(2, n, SR);
    // ducking envelope: music drops while the voice speaks (fast attack, slower release)
    const duck = new Float32Array(n).fill(1);
    if (vo && vo.lines.length) {
      for (const l of vo.lines) { const a = Math.max(0, Math.round((l.t - 0.12) * SR)), b = Math.min(n, Math.round((l.end + 0.15) * SR)); for (let i = a; i < b; i++) duck[i] = 0.42; }
      const att = 1 - Math.exp(-1 / (0.05 * SR)), rel = 1 - Math.exp(-1 / (0.28 * SR)); let y = 1; for (let i = 0; i < n; i++) { const x = duck[i]; y += (x - y) * (x < y ? att : rel); duck[i] = y; }
    }
    let voTrack = null; if (vo && vo.lines.length) voTrack = await renderVoiceTrack(vo, sc.dur);
    let vpeak = 0; if (voTrack) for (let c = 0; c < 2; c++) { const d = voTrack.getChannelData(c); for (let i = 0; i < d.length; i++) vpeak = Math.max(vpeak, Math.abs(d[i])); }
    const vg = vpeak > 0 ? 0.8 / vpeak : 0;
    let peak = 0, sq = 0;
    for (let c = 0; c < 2; c++) { const m = music.getChannelData(c), o = out.getChannelData(c), v = voTrack ? voTrack.getChannelData(Math.min(c, voTrack.numberOfChannels - 1)) : null; for (let i = 0; i < n; i++) { let s = m[i] * duck[i] * (v ? 0.9 : 1) + (v ? v[i] * vg : 0); o[i] = s; const a = Math.abs(s); if (a > peak) peak = a; } }
    const k = peak > 0.92 ? 0.92 / peak : 1; for (let c = 0; c < 2; c++) { const o = out.getChannelData(c); for (let i = 0; i < n; i++) { o[i] *= k; sq += o[i] * o[i]; } }
    out._stats = { peak: +(peak * k).toFixed(3), rmsDb: +(20 * Math.log10(Math.sqrt(sq / (2 * n)) + 1e-9)).toFixed(1), voicePeakIn: +vpeak.toFixed(3), voLines: vo ? vo.lines.length : 0, overflow: vo ? vo.lines.filter((l) => l.overflow).map((l) => l.id) : [] };
    return out;
  }
  g.renderAudio = renderAudio; g.prepareVO = prepareVO; g.FILM_SCORES = SCORES;
})(window);

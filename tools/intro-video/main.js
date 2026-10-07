// Orchestrator: preview single frames, or render a film (video + music + voice-over) to MP4 files.
//   kind 'intro'  : 16:9 film, 48 s, English voice-over   -> *-1080p.mp4 + *-720p-discord.mp4
//   kind 'tiktok' : 9:16 trailer, 28 s, French voice-over -> *-1080x1920.mp4
(function () {
  const cv = document.getElementById('cv'), logEl = document.getElementById('log'), log = (m) => (logEl.textContent = m);
  const F = ST.film; F.init(cv);
  const COLR = { p: 1, t: 1, m: 1, full: false }; // BT.709 limited range: what the H.264 encoder produces
  const FILMS = {
    intro: { name: 'st1m-port4l-intro', W: 1920, H: 1080, DUR: 48, vo: 'intro', draw: (t) => F.draw(t), outputs: [{ suffix: '-1080p.mp4', w: 1920, h: 1080, bitrate: 6.5e6, codec: 'avc1.640028' }, { suffix: '-720p-discord.mp4', w: 1280, h: 720, bitrate: 1.05e6, codec: 'avc1.640020' }] },
    tiktok: { name: 'st1m-port4l-tiktok', W: 1080, H: 1920, DUR: 28, vo: 'tiktok', draw: (t) => ST.trailer_tt.draw(t), outputs: [{ suffix: '-1080x1920.mp4', w: 1080, h: 1920, bitrate: 7.5e6, codec: 'avc1.640028' }] },
  };
  const voCache = {};
  async function setFilm(kind, useVO = true) {
    const f = FILMS[kind]; F.setSize(f.W, f.H, f.DUR);
    if (useVO && f.vo) { voCache[kind] = voCache[kind] || (await prepareVO(f.vo)); ST.vo = voCache[kind]; } else ST.vo = null;
    return f;
  }
  window.film_ready = F.load().then(() => log('ready'));
  window.preview = async (t, kind = 'intro') => { await window.film_ready; const f = await setFilm(kind); f.draw(t); return cv.toDataURL('image/jpeg', 0.88); };
  window.voInfo = async (kind) => { await window.film_ready; await setFilm(kind); return ST.vo ? ST.vo.lines.map((l) => ({ id: l.id, t: l.t, end: +l.end.toFixed(2), rate: +l.rate.toFixed(2), overflow: l.overflow })) : []; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* opts: { kind, frames?: number (limit, for tests), noVO?: bool (no voice AND no captions), mute?: bool (no voice, captions kept) } */
  window.renderFilm = async function (opts = {}) {
    await window.film_ready;
    const kind = opts.kind || 'intro', f = await setFilm(kind, !opts.noVO), FPS = F.FPS, SR = 48000;
    const N = Math.min(opts.frames || FPS * f.DUR, FPS * f.DUR), t00 = performance.now();
    log('rendering soundtrack + voice…'); // opts.mute: no voice track (captions, if any, stay)
    const abuf = await renderAudio(kind, opts.mute ? null : ST.vo); const stats = abuf._stats;
    const errs = [], outs = f.outputs.map((o) => {
      const mux = new Mp4Muxer({ width: o.w, height: o.h, fps: FPS, sampleRate: SR, channels: 2, colr: COLR });
      const enc = new VideoEncoder({ output: (ch, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description) mux.setVideoConfig(meta.decoderConfig.description); mux.addVideo(ch); }, error: (x) => errs.push('V ' + x.message) });
      enc.configure({ codec: o.codec, width: o.w, height: o.h, bitrate: o.bitrate, framerate: FPS, avc: { format: 'avc' }, latencyMode: 'quality' });
      let canvas = cv, sx = null; if (o.w !== f.W || o.h !== f.H) { canvas = document.createElement('canvas'); canvas.width = o.w; canvas.height = o.h; sx = canvas.getContext('2d'); sx.imageSmoothingQuality = 'high'; }
      return { o, mux, enc, canvas, sx };
    });
    for (let i = 0; i < N; i++) {
      f.draw(i / FPS); const ts = Math.round((i * 1e6) / FPS), key = i % 60 === 0;
      for (const x of outs) { if (x.sx) x.sx.drawImage(cv, 0, 0, x.o.w, x.o.h); const fr = new VideoFrame(x.canvas, { timestamp: ts }); x.enc.encode(fr, { keyFrame: key }); fr.close(); }
      if (outs.some((x) => x.enc.encodeQueueSize > 6)) { while (outs.some((x) => x.enc.encodeQueueSize > 2)) await sleep(2); }
      if (i % 15 === 0) { log(`${kind}: frame ${i}/${N}  (${((performance.now() - t00) / 1000).toFixed(0)} s)`); await sleep(0); }
      if (errs.length) throw new Error(errs.join(' | '));
    }
    await Promise.all(outs.map((x) => x.enc.flush()));
    log('encoding audio…');
    const aE = new AudioEncoder({ output: (ch, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description) outs.forEach((x) => x.mux.setAudioConfig(meta.decoderConfig.description)); outs.forEach((x) => x.mux.addAudio(ch)); }, error: (x) => errs.push('A ' + x.message) });
    aE.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 192000, aac: { format: 'aac' } });
    const total = Math.min(abuf.length, Math.round((N / FPS) * SR)), L = abuf.getChannelData(0), R = abuf.getChannelData(1);
    for (let p = 0; p < total; p += 4800) { const n = Math.min(4800, total - p), planar = new Float32Array(n * 2); planar.set(L.subarray(p, p + n), 0); planar.set(R.subarray(p, p + n), n); const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((p * 1e6) / SR), data: planar }); aE.encode(ad); ad.close(); }
    await aE.flush(); if (errs.length) throw new Error(errs.join(' | '));
    log('muxing…'); const out = {};
    for (const x of outs) { const bytes = x.mux.finalize(); const name = (opts.name || f.name) + x.o.suffix; const r = await fetch('/save/' + name, { method: 'POST', body: bytes }); out[x.o.suffix] = { bytes: bytes.length, file: name, saved: (await r.text()).length > 0, vSamples: x.mux.vSamples.length, aSamples: x.mux.aSamples.length }; }
    log('done'); return { kind, frames: N, seconds: +((performance.now() - t00) / 1000).toFixed(1), audio: stats, out };
  };
})();

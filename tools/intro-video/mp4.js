/* Minimal MP4 muxer: one H.264 video track + one AAC-LC audio track (faststart: moov before mdat).
 * Inputs are WebCodecs EncodedVideoChunk / EncodedAudioChunk objects. No dependencies. */
(function (g) {
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const u16 = (n) => [(n >>> 8) & 255, n & 255];
  const str = (s) => Array.from(s).map((c) => c.charCodeAt(0));
  const cat = (...a) => { let n = 0; a.forEach((x) => (n += x.length)); const o = new Uint8Array(n); let p = 0; a.forEach((x) => { o.set(x, p); p += x.length; }); return o; };
  const U = (x) => (x instanceof Uint8Array ? x : new Uint8Array(x));
  const box = (type, ...parts) => { const body = cat(...parts.map(U)); return cat(new Uint8Array([...u32(8 + body.length), ...str(type)]), body); };
  const fbox = (type, flags, ...parts) => box(type, new Uint8Array([0, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...parts);
  const MATRIX = [...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x40000000)];
  const zeros = (n) => new Array(n).fill(0);
  const rle = (arr) => { const out = []; arr.forEach((v) => { const l = out[out.length - 1]; if (l && l[0] === v) l[1]++; else out.push([v, 1]); }); return out; };

  class Mp4Muxer {
    constructor(o) {
      this.w = o.width; this.h = o.height; this.fps = o.fps; this.sr = o.sampleRate || 48000; this.ch = o.channels || 2;
      this.vSamples = []; this.aSamples = []; this.avcC = null; this.asc = null; this.colr = o.colr || null;
    }
    setVideoConfig(desc) { this.avcC = U(desc); }
    setAudioConfig(desc) { this.asc = U(desc); }
    addVideo(chunk) { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); this.vSamples.push({ d, key: chunk.type === 'key', ts: chunk.timestamp }); }
    addAudio(chunk) { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); this.aSamples.push({ d, ts: chunk.timestamp }); }

    _layout() { // interleave one-second chunks: [video samples][audio samples]
      const vChunks = [], aChunks = []; const order = [];
      const secs = Math.ceil(Math.max(this.vSamples.length / this.fps, (this.aSamples.length * 1024) / this.sr));
      let vi = 0, ai = 0, off = 0;
      for (let s = 0; s < secs; s++) {
        const vEnd = Math.min(this.vSamples.length, Math.round((s + 1) * this.fps));
        if (vEnd > vi) { vChunks.push({ off, n: vEnd - vi }); for (; vi < vEnd; vi++) { order.push(this.vSamples[vi].d); off += this.vSamples[vi].d.length; } }
        const aEnd = Math.min(this.aSamples.length, Math.round(((s + 1) * this.sr) / 1024));
        if (aEnd > ai) { aChunks.push({ off, n: aEnd - ai }); for (; ai < aEnd; ai++) { order.push(this.aSamples[ai].d); off += this.aSamples[ai].d.length; } }
      }
      return { vChunks, aChunks, order, size: off };
    }

    _stbl(entry, samples, durations, chunks, base, sync) {
      const stts = rle(durations);
      const stsc = []; let prev = -1; chunks.forEach((c, i) => { if (c.n !== prev) { stsc.push([i + 1, c.n]); prev = c.n; } });
      return box('stbl',
        fbox('stsd', 0, u32(1), entry),
        fbox('stts', 0, u32(stts.length), ...stts.map(([d, c]) => new Uint8Array([...u32(c), ...u32(d)]))),
        ...(sync ? [fbox('stss', 0, u32(sync.length), ...sync.map((n) => new Uint8Array(u32(n))))] : []),
        fbox('stsc', 0, u32(stsc.length), ...stsc.map(([f, n]) => new Uint8Array([...u32(f), ...u32(n), ...u32(1)]))),
        fbox('stsz', 0, u32(0), u32(samples.length), ...samples.map((s) => new Uint8Array(u32(s.d.length)))),
        fbox('stco', 0, u32(chunks.length), ...chunks.map((c) => new Uint8Array(u32(base + c.off)))));
    }

    _moov(L, base) {
      const vDur = this.vSamples.length * 1000; // timescale = fps*1000
      const vTs = this.fps * 1000, durMs = Math.round((this.vSamples.length / this.fps) * 1000);
      const aDurMs = Math.round(((this.aSamples.length * 1024) / this.sr) * 1000);
      const movieMs = Math.max(durMs, aDurMs);
      const name = (s) => new Uint8Array([...str(s), 0]);
      // --- video
      const avc1 = box('avc1', new Uint8Array([...zeros(6), ...u16(1), ...zeros(16), ...u16(this.w), ...u16(this.h), ...u32(0x480000), ...u32(0x480000), ...u32(0), ...u16(1), ...zeros(32), ...u16(0x18), 0xff, 0xff]), box('avcC', this.avcC), ...(this.colr ? [box('colr', str('nclx'), u16(this.colr.p), u16(this.colr.t), u16(this.colr.m), new Uint8Array([this.colr.full ? 0x80 : 0]))] : []));
      const vSync = []; this.vSamples.forEach((s, i) => s.key && vSync.push(i + 1));
      const vtrak = box('trak',
        fbox('tkhd', 3, u32(0), u32(0), u32(1), u32(0), u32(durMs), zeros(8), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(this.w << 16), u32(this.h << 16)),
        box('mdia', fbox('mdhd', 0, u32(0), u32(0), u32(vTs), u32(vDur), u16(0x55c4), u16(0)),
          fbox('hdlr', 0, u32(0), str('vide'), zeros(12), name('VideoHandler')),
          box('minf', fbox('vmhd', 1, u16(0), zeros(6)), box('dinf', fbox('dref', 0, u32(1), fbox('url ', 1))),
            this._stbl(avc1, this.vSamples, this.vSamples.map(() => 1000), L.vChunks, base, vSync))));
      if (!(this.aSamples.length && this.asc)) return box('moov', fbox('mvhd', 0, u32(0), u32(0), u32(1000), u32(movieMs), u32(0x10000), u16(0x100), zeros(10), MATRIX, zeros(24), u32(3)), vtrak);
      // --- audio
      const esds = fbox('esds', 0, new Uint8Array([
        0x03, 23 + this.asc.length, 0, 0, 0,
        0x04, 15 + this.asc.length, 0x40, 0x15, 0, 0, 0, ...u32(0), ...u32(0),
        0x05, this.asc.length, ...this.asc, 0x06, 1, 2]));
      const mp4a = box('mp4a', new Uint8Array([...zeros(6), ...u16(1), ...zeros(8), ...u16(this.ch), ...u16(16), ...u16(0), ...u16(0), ...u32(this.sr << 16)]), esds);
      const atrak = box('trak',
        fbox('tkhd', 3, u32(0), u32(0), u32(2), u32(0), u32(aDurMs), zeros(8), u16(0), u16(0), u16(0x100), u16(0), MATRIX, u32(0), u32(0)),
        box('mdia', fbox('mdhd', 0, u32(0), u32(0), u32(this.sr), u32(this.aSamples.length * 1024), u16(0x55c4), u16(0)),
          fbox('hdlr', 0, u32(0), str('soun'), zeros(12), name('SoundHandler')),
          box('minf', fbox('smhd', 0, u16(0), u16(0)), box('dinf', fbox('dref', 0, u32(1), fbox('url ', 1))),
            this._stbl(mp4a, this.aSamples, this.aSamples.map(() => 1024), L.aChunks, base, null))));
      return box('moov', fbox('mvhd', 0, u32(0), u32(0), u32(1000), u32(movieMs), u32(0x10000), u16(0x100), zeros(10), MATRIX, zeros(24), u32(3)), vtrak, ...(this.aSamples.length ? [atrak] : []));
    }

    finalize() {
      const L = this._layout();
      const ftyp = box('ftyp', str('isom'), u32(512), str('isom'), str('iso2'), str('avc1'), str('mp41'));
      const moovSize = this._moov(L, 0).length;
      const base = ftyp.length + moovSize + 8;
      const moov = this._moov(L, base);
      const mdatHead = new Uint8Array([...u32(8 + L.size), ...str('mdat')]);
      return cat(ftyp, moov, mdatHead, ...L.order);
    }
  }
  g.Mp4Muxer = Mp4Muxer;
})(window);

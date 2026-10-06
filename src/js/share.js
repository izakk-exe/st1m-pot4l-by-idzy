/* ST1M POT4L — share codes.
 * Format:  PREFIX + base64url( zlib( JSON ) )
 *   CE1:  {v:1, fov, reticle:"R G B", settings:{cvar:value}}            (Config Editor compatible)
 *   SP1:  same + {x:{profile:{...}, settings:{...}, binds:{KEY:cmd}}}    (ST1M POT4L superset)
 */
(function () {
  const ST = (window.ST = window.ST || {});

  const b64u = {
    enc: (u8) => { let s = ''; u8.forEach((b) => (s += String.fromCharCode(b))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
    dec: (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - (s.length % 4)) % 4); const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; },
  };
  async function pipe(u8, stream) {
    const out = new Blob([u8]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(out).arrayBuffer());
  }

  // values/binds -> payload object
  ST.buildPayload = (values, binds, opts) => {
    opts = opts || {};
    const raw = { video: {}, profile: {}, settings: {} };
    for (const d of ST.DEFS) {
      if (values[d.id] === undefined) continue;
      Object.assign(raw[d.file], ST.defToRaw(d, values[d.id]));
    }
    const p = { v: 1, settings: raw.video };
    if (values.fov !== undefined) p.fov = +values.fov;
    if (values.reticle !== undefined) p.reticle = values.reticle;
    if (!opts.compat) {
      const prof = { ...raw.profile }; delete prof.cl_fovScale; delete prof.reticle_color;
      p.x = { profile: prof, settings: raw.settings, binds: { ...binds } };
    }
    return p;
  };

  ST.encodeCode = async (payload, compat) => {
    const json = new TextEncoder().encode(JSON.stringify(payload));
    const z = await pipe(json, new CompressionStream('deflate'));
    return (compat ? 'CE1:' : 'SP1:') + b64u.enc(z);
  };

  ST.decodeCode = async (code) => {
    code = String(code || '').trim().replace(/\s+/g, '');
    const m = code.match(/^(CE1|SP1):([A-Za-z0-9_\-]+)$/);
    if (!m) throw new Error(ST.L('Code invalide (attendu CE1:… ou SP1:…)', 'Invalid code (expected CE1:… or SP1:…)'));
    if (m[2].length > 60000) throw new Error('Code too large');
    let obj;
    try {
      const raw = await pipe(b64u.dec(m[2]), new DecompressionStream('deflate'));
      if (raw.length > 400000) throw new Error('too large');
      obj = JSON.parse(new TextDecoder().decode(raw));
    } catch (e) { throw new Error(ST.L('Code corrompu ou illisible.', 'Corrupted or unreadable code.')); }
    return ST.payloadToState(obj);
  };

  // validated payload -> { values, binds, ignored }
  ST.payloadToState = (obj) => {
    if (!obj || typeof obj !== 'object' || obj.v !== 1) throw new Error(ST.L('Version de code non supportée.', 'Unsupported code version.'));
    const isDict = (o) => o && typeof o === 'object' && !Array.isArray(o);
    const raws = { video: isDict(obj.settings) ? { ...obj.settings } : {}, profile: {}, settings: {} };
    if (obj.fov !== undefined) raws.profile.cl_fovScale = ST.VIRTUAL.fov.toRaw(Math.min(120, Math.max(70, +obj.fov || 90))).cl_fovScale;
    if (typeof obj.reticle === 'string') raws.profile.reticle_color = obj.reticle;
    if (isDict(obj.x)) {
      if (isDict(obj.x.profile)) Object.assign(raws.profile, obj.x.profile);
      if (isDict(obj.x.settings)) Object.assign(raws.settings, obj.x.settings);
    }
    const values = {}, binds = {};
    let ignored = 0;
    for (const d of ST.DEFS) {
      const r = ST.defFromRaw(d, raws[d.file]);
      if (r === undefined) continue;
      const s = ST.sanitize(d, r);
      if (s === null) ignored++; else values[d.id] = s;
    }
    if (isDict(obj.x) && isDict(obj.x.binds)) {
      for (const [k, c] of Object.entries(obj.x.binds)) {
        if (/^[A-Za-z0-9_]{1,24}$/.test(k) && typeof c === 'string' && /^[\w+;\- ]{1,48}$/.test(c)) binds[k.toUpperCase()] = c; else ignored++;
      }
    }
    return { values, binds, ignored };
  };

  ST.presetToState = (p) => ST.payloadToState({ v: 1, fov: p.fov, reticle: p.reticle, settings: p.settings });
})();

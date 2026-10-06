/* ST1M POT4L — readers/writers for videoconfig.txt, profile.cfg, settings.cfg */
(function () {
  const ST = (window.ST = window.ST || {});

  const eolOf = (t) => (t.includes('\r\n') ? '\r\n' : '\n');
  const stripPrefix = (k) => k.replace(/^setting\./, '');
  const BIND_RE = /^\s*(bind_([A-Za-z]+)_standard)\s+"([^"]+)"\s+"([^"]*)"(.*)$/;

  // ---------- videoconfig.txt  ("setting.key"  "value")
  ST.videoGet = (text) => {
    const raw = {};
    for (const l of (text || '').split(/\r?\n/)) {
      const m = l.match(/^\s*"([^"]+)"\s+"([^"]*)"/);
      if (m) raw[stripPrefix(m[1])] = m[2];
    }
    return raw;
  };

  ST.videoSet = (text, changes) => {
    text = text || '';
    const eol = text ? eolOf(text) : '\r\n';
    if (!text.trim()) text = `"VideoConfig"${eol}{${eol}}${eol}`;
    const done = new Set();
    const lines = text.split(/\r?\n/).map((l) => {
      const m = l.match(/^(\s*)"([^"]+)"(\s+)"([^"]*)"(.*)$/);
      if (!m) return l;
      const k = stripPrefix(m[2]);
      if (!(k in changes)) return l;
      done.add(k);
      return `${m[1]}"${m[2]}"${m[3]}"${changes[k]}"${m[5]}`;
    });
    const missing = Object.keys(changes).filter((k) => !done.has(k));
    if (missing.length) {
      let at = -1;
      for (let i = lines.length - 1; i >= 0; i--) if (lines[i].trim() === '}') { at = i; break; }
      if (at < 0) at = lines.length;
      lines.splice(at, 0, ...missing.map((k) => `\t"setting.${k}"\t\t"${changes[k]}"`));
    }
    return lines.join(eol);
  };

  // ---------- profile.cfg / settings.cfg  (key "value"  +  bind_<layout>_standard "KEY" "cmd")
  ST.cfgGet = (text) => {
    const raw = {}, binds = {};
    let layout = null;
    for (const l of (text || '').split(/\r?\n/)) {
      const b = l.match(BIND_RE);
      if (b) { layout = layout || b[2]; binds[b[3].toUpperCase()] = b[4]; continue; }
      const m = l.match(/^\s*"?([\w.+\-]+)"?\s+"?([^"]*?)"?\s*$/);
      if (m && !/^bind/i.test(m[1])) raw[m[1]] = m[2];
    }
    return { raw, binds, layout: layout || 'US' };
  };

  // changes: {key: value}; bindChanges: {KEY: cmd|null}. HUD-hide binds are de-duplicated.
  ST.cfgSet = (text, changes, bindChanges) => {
    text = text || '';
    const eol = text ? eolOf(text) : '\r\n';
    const layout = ST.cfgGet(text).layout;
    const prefix = `bind_${layout}_standard`;
    const done = new Set();
    bindChanges = bindChanges || {};
    const hudNew = Object.entries(bindChanges).some(([, c]) => c && c.includes('gameui_hide'));
    const out = [];
    for (const l of text.split(/\r?\n/)) {
      const b = l.match(BIND_RE);
      if (b) {
        const K = b[3].toUpperCase();
        if (K in bindChanges) continue; // re-emitted below
        if (hudNew && b[4].includes('gameui_hide')) continue;
        out.push(l);
        continue;
      }
      const m = l.match(/^(\s*)"?([\w.+\-]+)"?\s+"?([^"]*?)"?\s*$/);
      if (m && m[2] in changes) { done.add(m[2]); out.push(`${m[1]}${m[2]} "${changes[m[2]]}"`); continue; }
      out.push(l);
    }
    while (out.length && out[out.length - 1] === '') out.pop();
    for (const k of Object.keys(changes)) if (!done.has(k)) out.push(`${k} "${changes[k]}"`);
    for (const [K, cmd] of Object.entries(bindChanges)) if (cmd) out.push(`${prefix} "${K.length === 1 ? K.toLowerCase() : K}" "${cmd}" 0`);
    return out.join(eol) + eol;
  };

  // ---------- load a whole state { values, binds } out of the three file texts
  ST.loadValues = (texts) => {
    const video = ST.videoGet(texts.video);
    const prof = ST.cfgGet(texts.profile);
    const sett = ST.cfgGet(texts.settings); // key binds live in settings.cfg
    const raws = { video, profile: prof.raw, settings: sett.raw };
    const values = {};
    for (const d of ST.DEFS) {
      const v = ST.defFromRaw(d, raws[d.file]);
      if (v !== undefined) values[d.id] = String(v);
    }
    return { values, binds: sett.binds, layout: sett.layout };
  };

  // ---------- turn changed ids / binds into per-file raw changes
  ST.buildFileChanges = (ids, values, binds, curBinds) => {
    const files = { video: {}, profile: {}, settings: {} };
    for (const id of ids) {
      const d = ST.DEF[id];
      Object.assign(files[d.file], ST.defToRaw(d, values[id]));
    }
    if (ids.some((id) => /^(shadow_|csm_)/.test(ST.DEF[id].key))) files.video.new_shadow_settings = '1';
    const bindChanges = {};
    for (const K of new Set([...Object.keys(binds), ...Object.keys(curBinds)])) {
      if ((binds[K] || null) !== (curBinds[K] || null)) bindChanges[K] = binds[K] || null;
    }
    return { files, bindChanges };
  };

  // helper: apply raw changes to the three file texts
  ST.applyToTexts = (texts, fc) => {
    const out = { ...texts };
    if (Object.keys(fc.files.video).length) out.video = ST.videoSet(texts.video, fc.files.video);
    if (Object.keys(fc.files.profile).length) out.profile = ST.cfgSet(texts.profile, fc.files.profile, {});
    if (Object.keys(fc.files.settings).length || Object.keys(fc.bindChanges).length)
      out.settings = ST.cfgSet(texts.settings, fc.files.settings, fc.bindChanges);
    return out;
  };
})();

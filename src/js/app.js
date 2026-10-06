/* ST1M PORT4L by idZy — UI */
(function () {
  const ST = window.ST;
  const L = (fr, en) => ST.L(fr, en);
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------- storage (always guarded)
  const store = {
    get(k, d) { try { const v = localStorage.getItem('st1m_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('st1m_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };

  const LOGO = '<img src="img/logo.svg" alt="">';

  const S = {
    tab: 'home', be: ST.makeBackend(), info: {}, texts: { video: '', profile: '', settings: '' },
    cur: { values: {}, binds: {} }, draft: { values: {}, binds: {} },
    lock: store.get('lock', false), launch: store.get('launch', { novid: true, lobby: false, thread: false, cap: false, capv: 190, high: false, fps: false, stretch: false, w: 1440, h: 1080, extra: '' }),
    code: '', capturing: null, flash: null, status: {},
    ov: Object.assign({ on: false, auto: true, anchor: 'bl', ox: 0, oy: 0, scale: 1, opacity: 1, color: '#7cff3a', ring: true, glow: true, shift: false, ctrl: false, space: false, mouse: false, wheel: false, timeline: false, m45: false }, store.get('overlay', {})),
    game: Object.assign({ mode: 'steam', exe: '', useOpts: true }, store.get('game', {})), gameInfo: null,
  };
  ST.ui = { S, store, esc, L, render: () => render(), toast: (m, o) => toast(m, o), copy: (t) => copy(t), dialog: (h) => dialog(h), closeDialog: () => closeDialog(), oneClick: (st) => oneClick(st), applyChanges: () => applyChanges(), changes: () => changes() };
  ST.packs = { apply: (id) => { const q = ST.QUICK_BINDS.find((x) => x.id === id); return q ? oneClick({ values: {}, binds: q.binds }) : null; } };
  ST.lang = store.get('lang', navigator.language && navigator.language.startsWith('fr') ? 'fr' : 'en');

  // ---------- helpers
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) {} t.remove(); return ok;
    }
  }
  function toast(msg, o) {
    o = o || {};
    const el = document.createElement('div'); el.className = 'toast' + (o.bad ? ' bad' : '');
    el.innerHTML = `<span>${esc(msg)}</span>` + (o.undo ? `<button>${L('Annuler', 'Undo')}</button>` : '');
    if (o.undo) el.querySelector('button').onclick = () => { el.remove(); o.undo(); };
    $('#toasts').appendChild(el); setTimeout(() => el.remove(), o.undo ? 12000 : 4200);
  }
  function dialog(html, wide) {
    const m = $('#modal'); m.hidden = false; m.innerHTML = `<div class="dlg">${html}</div>`;
    m.onclick = (e) => { if (e.target === m) closeDialog(); };
  }
  function closeDialog() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; S.palette = null; S.capturing = null; }
  function confirmDlg(title, body, ok) {
    return new Promise((res) => {
      dialog(`<h3>${esc(title)}</h3><p class="lead">${esc(body)}</p><div class="foot"><button class="btn" data-x="no">${L('Annuler', 'Cancel')}</button><button class="btn gold" data-x="yes">${esc(ok)}</button></div>`);
      $('#modal').onclick = (e) => { const x = e.target.dataset.x; if (x || e.target.id === 'modal') { closeDialog(); res(x === 'yes'); } };
    });
  }
  const tabLabel = (t) => t[ST.lang];
  const defLabel = (d) => d[ST.lang][0];
  const defDesc = (d) => d[ST.lang][1];

  function optLabel(d, v) {
    if (d.type === 'toggle') return v === d.on ? L('Activé', 'On') : L('Désactivé', 'Off');
    if (d.type === 'select') { const o = d.opts.find((o) => o[0] === v); return o ? o[ST.lang === 'fr' ? 1 : 2] : v; }
    return v === undefined ? '—' : String(v);
  }

  // ---------- changes
  function changes() {
    const list = [];
    for (const d of ST.DEFS) {
      const v = S.draft.values[d.id];
      if (v !== undefined && v !== S.cur.values[d.id]) list.push({ kind: 'val', id: d.id, def: d, from: S.cur.values[d.id], to: v });
    }
    for (const K of new Set([...Object.keys(S.draft.binds), ...Object.keys(S.cur.binds)])) {
      const a = S.cur.binds[K], b = S.draft.binds[K];
      if ((a || null) !== (b || null)) list.push({ kind: 'bind', id: K, from: a, to: b });
    }
    return list;
  }
  const tabHasChanges = (tabId) => changes().some((c) => (c.kind === 'bind' ? tabId === 'binds' : c.def.tab === tabId));

  // ---------- load / apply
  async function reload() {
    S.info = await S.be.detect();
    for (const k of ['video', 'profile', 'settings']) S.texts[k] = (await S.be.read(k)) || '';
    const st = ST.loadValues(S.texts);
    S.cur = { values: st.values, binds: st.binds };
    S.draft = clone(S.cur);
    try { S.status = (await S.be.status()) || {}; } catch (e) { S.status = {}; }
  }

  async function applyChanges(opts) {
    opts = opts || {};
    const list = changes();
    if (!list.length) { toast(L('Déjà à jour — rien à changer.', 'Already up to date — nothing to change.')); return false; }
    if (await S.be.apexRunning()) {
      const ok = await confirmDlg(L('Apex Legends est ouvert', 'Apex Legends is running'),
        L('Le jeu réécrit ses fichiers en se fermant et annulerait tes changements. Ferme Apex puis applique.', 'The game rewrites its files on exit and would undo your changes. Close Apex, then apply.'),
        L('Appliquer quand même', 'Apply anyway'));
      if (!ok) return false;
    }
    const fc = ST.buildFileChanges(list.filter((c) => c.kind === 'val').map((c) => c.id), S.draft.values, S.draft.binds, S.cur.binds);
    const next = ST.applyToTexts(S.texts, fc);
    const touched = [];
    try {
      for (const k of ['video', 'profile', 'settings']) {
        if (next[k] !== S.texts[k]) { await S.be.write(k, next[k], { lock: k === 'video' && S.lock }); touched.push(k); }
      }
    } catch (e) { toast(L('Échec de l\'écriture : ', 'Write failed: ') + e.message, { bad: true }); return false; }
    await reload(); render();
    toast(L(`Appliqué ✔ (${list.length} changement${list.length > 1 ? 's' : ''}) — sauvegarde créée.`, `Applied ✔ (${list.length} change${list.length > 1 ? 's' : ''}) — backup created.`), {
      undo: async () => { for (const k of touched) await S.be.restore(k, 'last'); await reload(); render(); toast(L('Restauré.', 'Restored.')); },
    });
    return true;
  }

  function mergeState(st) {
    Object.assign(S.draft.values, st.values);
    for (const [k, c] of Object.entries(st.binds || {})) S.draft.binds[k] = c;
  }
  async function oneClick(st) { mergeState(st); render(); return applyChanges(); }

  // ---------- code helpers
  async function currentCode(compat, fromDraft) {
    const src = fromDraft ? S.draft : S.cur;
    return ST.encodeCode(ST.buildPayload(src.values, src.binds, { compat }), compat);
  }
  async function importCode(code, immediate) {
    try {
      const st = await ST.decodeCode(code);
      mergeState(st);
      render();
      if (immediate) return applyChanges();
      toast(L(`Code importé : ${Object.keys(st.values).length} réglages${st.ignored ? ` (${st.ignored} ignorés)` : ''}. Vérifie puis applique.`, `Code imported: ${Object.keys(st.values).length} settings${st.ignored ? ` (${st.ignored} ignored)` : ''}. Review then apply.`));
    } catch (e) { toast(e.message, { bad: true }); }
  }

  // ---------- setting controls
  function control(d, v, raw) {
    const unset = raw === undefined;
    const dis = d.dep && !d.dep(S.draft.values) ? ' disabled' : '';
    if (d.type === 'toggle') return `<button class="switch${v === d.on ? ' on' : ''}" data-act="toggle" data-id="${d.id}" aria-pressed="${v === d.on}"${dis}></button>`;
    if (d.type === 'select') {
      let opts = d.opts.slice();
      if (!unset && !opts.some((o) => o[0] === v)) opts.push([v, 'Perso: ' + v, 'Custom: ' + v]);
      if (opts.length > 4) return `<select class="inp" data-in="sel" data-id="${d.id}"${dis}>${unset ? `<option value="" selected disabled>${L('— défaut du jeu —', '— game default —')}</option>` : ''}${opts.map((o) => `<option value="${esc(o[0])}"${!unset && o[0] === v ? ' selected' : ''}>${esc(o[ST.lang === 'fr' ? 1 : 2])}</option>`).join('')}</select>`;
      return `<div class="seg">${opts.map((o) => `<button class="${!unset && o[0] === v ? 'on' : ''}${o[0] === S.cur.values[d.id] && o[0] !== v ? ' cur' : ''}" data-act="pick" data-id="${d.id}" data-v="${esc(o[0])}"${dis}>${esc(o[ST.lang === 'fr' ? 1 : 2])}</button>`).join('')}</div>`;
    }
    if (d.type === 'slider') return `<input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${esc(v)}" data-in="slider" data-id="${d.id}"${dis}><span class="num" id="n-${d.id}">${esc(d.fmt ? Number(v).toFixed(d.fmt) : v)}</span>`;
    if (d.type === 'number') return `<input class="inp" type="number" min="${d.min}" max="${d.max}" value="${esc(v)}" data-in="num" data-id="${d.id}"${dis}>`;
    if (d.type === 'color') {
      const [r, g, b] = String(v).split(/\s+/).map((x) => +x || 0);
      const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
      return `<div class="reticle"><div class="prev"><i style="color:rgb(${r},${g},${b})"></i></div><input type="color" value="${hex}" data-in="hex" data-id="${d.id}">${['r', 'g', 'b'].map((c, i) => `<input class="inp" type="number" style="width:64px" min="0" max="255" value="${[r, g, b][i]}" data-in="rgb" data-id="${d.id}" data-ch="${i}" aria-label="${c}">`).join('')}</div>`;
    }
    return '';
  }

  function settingRow(d) {
    const raw = S.draft.values[d.id];
    const v = ST.defVal(d, S.draft.values);
    const changed = raw !== undefined && raw !== S.cur.values[d.id];
    const off = d.dep && !d.dep(S.draft.values);
    const impact = d.fps ? `<span class="tag ${d.fps}">${{ heavy: L('Impact FPS élevé', 'High FPS cost'), medium: L('Impact FPS moyen', 'Medium FPS cost'), light: L('Impact FPS faible', 'Low FPS cost') }[d.fps]}</span>` : '';
    const missing = S.cur.values[d.id] === undefined && raw === undefined ? `<span class="tag">${L('défaut du jeu', 'game default')}</span>` : '';
    return `<div class="set${off ? ' off' : ''}" data-row="${d.id}">
      <div><h4>${changed ? '<span class="chg"></span>' : ''}${esc(defLabel(d))} ${impact}${missing}</h4>
        <p>${esc(defDesc(d))}${off ? ` <i>${esc(d.depHint[ST.lang === 'fr' ? 0 : 1])}</i>` : ''}</p>
        <span class="key">${esc(d.key)}${d.id === 'fov' ? ' = cl_fovScale ' + ST.VIRTUAL.fov.toRaw(+v).cl_fovScale : ''}</span></div>
      <div class="ctl">${ST.hasPreview(d.id) ? `<button class="eye" data-act="eye" data-id="${d.id}">👁 ${L('Aperçu', 'Preview')}</button>` : ''}${changed ? `<button class="undo" data-act="undo" data-id="${d.id}" title="${L('Annuler ce changement', 'Undo this change')}">↺</button>` : ''}${control(d, v, raw)}</div>
    </div>`;
  }

  // ---------- pages
  function pageTitle(t, lead) { return `<h1>${esc(t)}</h1><p class="lead">${lead}</p>`; }

  const LEADS = {
    graphics: ['Qualité d\'image générale.', 'General image quality.'],
    textures: ['Textures et mémoire vidéo.', 'Textures and video memory.'],
    shadows: ['Les ombres coûtent cher en FPS : le premier levier d\'optimisation.', 'Shadows are expensive: the first optimisation lever.'],
    effects: ['Particules, brouillard, décals et débris.', 'Particles, fog, decals and debris.'],
    performance: ['Distances de rendu, physique et résolution dynamique.', 'Render distances, physics and dynamic resolution.'],
    display: ['Résolution, mode d\'affichage et synchronisation.', 'Resolution, display mode and sync.'],
    game: ['FOV étendu, réticule, audio, télémétrie et NVIDIA Reflex (profile.cfg / settings.cfg).', 'Extended FOV, reticle, audio, telemetry and NVIDIA Reflex (profile.cfg / settings.cfg).'],
  };

  // ---------- previews
  function previewSources() {
    return [['cur', L('Fichier actuel', 'Current file'), S.cur.values], ['draft', L('Brouillon', 'Draft'), S.draft.values]]
      .concat(ST.PRESETS.map((p) => [p.id, p[ST.lang][0], { ...S.cur.values, ...ST.presetToState(p).values }]));
  }
  function pagePreview() {
    const src = previewSources();
    if (!S.pvA) { S.pvA = 'cur'; S.pvB = changes().length ? 'draft' : 'competitive'; }
    const opt = (cur) => src.map((x) => `<option value="${x[0]}"${x[0] === cur ? ' selected' : ''}>${esc(x[1])}</option>`).join('');
    return `<div class="page">${pageTitle(L('Aperçu avant / après', 'Before / after preview'), L("Glisse la barre dorée pour comparer. Captures réelles pour les presets et la plupart des réglages ; illustration générée pour les autres.", 'Drag the golden bar to compare. Real captures for the presets and most settings; generated illustration for the others.'))}
      <h2>${L('Captures réelles des presets', 'Real preset captures')}</h2>
      <div class="sel2"><label>${L('GAUCHE', 'LEFT')}</label><select class="inp" data-in="ppA">${['competitive', 'balanced', 'ultra'].map((x) => `<option value="${x}"${x === (S.ppA || 'competitive') ? ' selected' : ''}>${esc(ST.PRESETS.find((p) => p.id === x)[ST.lang][0])}</option>`).join('')}</select><label>${L('DROITE', 'RIGHT')}</label><select class="inp" data-in="ppB">${['competitive', 'balanced', 'ultra'].map((x) => `<option value="${x}"${x === (S.ppB || 'ultra') ? ' selected' : ''}>${esc(ST.PRESETS.find((p) => p.id === x)[ST.lang][0])}</option>`).join('')}</select></div>
      <div id="cmp-preset"></div>
      <h2>${L('Illustration : fichier actuel vs brouillon', 'Illustration: current file vs draft')}</h2>
      <div class="sel2"><label>${L('GAUCHE', 'LEFT')}</label><select class="inp" data-in="pvA">${opt(S.pvA)}</select><label>${L('DROITE', 'RIGHT')}</label><select class="inp" data-in="pvB">${opt(S.pvB)}</select></div>
      <div id="cmp-tab"></div>
      <p class="fx">${L("Astuce : clique sur « 👁 Aperçu » à côté d\'un réglage pour voir uniquement son effet. Tu peux remplacer la scène par tes propres captures du jeu (voir src/previews/README.md).", 'Tip: click “👁 Preview” next to a setting to see only its effect. You can replace the scene with your own in-game screenshots (see src/previews/README.md).')}</p></div>`;
  }
  function mountPresetPreview() {
    const host = $('#cmp-preset'); if (!host) return;
    const A = S.ppA || 'competitive', B = S.ppB || 'ultra', nm = (x) => ST.PRESETS.find((p) => p.id === x)[ST.lang][0];
    ST.mountCompare(host, { label: nm(A) }, { label: nm(B) }, { a: `previews/preset_${A}.webp`, b: `previews/preset_${B}.webp` });
  }
  function mountTabPreview() {
    mountPresetPreview();
    const host = $('#cmp-tab'); if (!host) return;
    const src = previewSources(), a = src.find((x) => x[0] === S.pvA) || src[0], b = src.find((x) => x[0] === S.pvB) || src[1];
    ST.mountCompare(host, { values: a[2], label: a[1] }, { values: b[2], label: b[1] });
  }
  function previewOptions(d) {
    const iv = ST.imgValues(d.id);
    if (iv.length >= 2) {
      const lab = (v) => { if (d.type === 'toggle') return v === d.on ? L('Activé', 'On') : L('Désactivé', 'Off'); const o = d.opts && d.opts.find((o) => Number(o[0]) === Number(v)); return o ? o[ST.lang === 'fr' ? 1 : 2] : v; };
      const ord = iv.slice().sort((x, y) => Number(x) - Number(y));
      return ord.map((v) => [d.opts ? ((d.opts.find((o) => Number(o[0]) === Number(v)) || [v])[0]) : v, lab(v)]);
    }
    if (d.id === 'reticle') return [['255 255 255', L('Blanc', 'White')], ['255 0 255', 'Magenta'], ['0 255 0', L('Vert', 'Green')], ['0 220 255', 'Cyan'], ['255 40 40', L('Rouge', 'Red')]];
    if (d.type === 'toggle') return [[d.off, L('Désactivé', 'Off')], [d.on, L('Activé', 'On')]];
    if (d.type === 'select') return d.opts.map((o) => [o[0], o[ST.lang === 'fr' ? 1 : 2]]);
    const out = [];
    for (let i = 0; i < 5; i++) { const v = Number((Math.round((d.min + ((d.max - d.min) * i) / 4) / d.step) * d.step).toFixed(3)); out.push([String(v), String(Number(v.toFixed(2)))]); }
    return out;
  }
  function openPreview(id, a, b) {
    const d = ST.DEF[id], opts = previewOptions(d);
    S.pvd = { id, a: a !== undefined ? a : opts[0][0], b: b !== undefined ? b : opts[opts.length - 1][0], opts };
    const so = (cur) => opts.map((o) => `<option value="${esc(o[0])}"${o[0] === cur ? ' selected' : ''}>${esc(o[1])}</option>`).join('');
    dialog(`<h3>👁 ${esc(defLabel(d))}</h3>
      <div class="sel2"><label>${L('GAUCHE', 'LEFT')}</label><select class="inp" data-in="pvdA">${so(S.pvd.a)}</select><label>${L('DROITE', 'RIGHT')}</label><select class="inp" data-in="pvdB">${so(S.pvd.b)}</select></div>
      <div id="cmp-dlg"></div><p class="note" id="pv-note" hidden style="margin-top:10px">${L('Pas de capture réelle pour ce réglage : illustration générée (tu peux ajouter la tienne dans src/previews/).', 'No real capture for this setting: generated illustration (you can add your own in src/previews/).')}</p><p class="fx">${esc(ST.FX[id][ST.lang === 'fr' ? 0 : 1])}</p>
      <div class="foot"><button class="btn" data-act="close">${L('Fermer', 'Close')}</button></div>`);
    $('#modal .dlg').style.width = 'min(900px, 95vw)';
    mountDlgPreview();
  }
  async function mountDlgPreview() {
    const { id, a, b, opts } = S.pvd, host = $('#cmp-dlg'); if (!host) return;
    const lab = (v) => (opts.find((o) => o[0] === v) || [v, v])[1];
    const vals = (v) => ({ ...S.draft.values, [id]: v });
    const note = $('#pv-note');
    const ov = await ST.loadOverrides(id, a, b);
    if (!S.pvd || S.pvd.a !== a || S.pvd.b !== b || !$('#cmp-dlg')) return;
    ST.mountCompare($('#cmp-dlg'), { values: vals(a), label: lab(a) }, { values: vals(b), label: lab(b) }, ov);
    if (note) note.hidden = !!ov;
  }

  // ---------- game launcher
  function gameExe() { const gi = S.gameInfo || {}; return S.game.mode === 'steam' ? null : S.game.mode === 'ea' ? (S.game.exe || (gi.ea && gi.ea.exe) || '') : S.game.exe; }
  function launcherCard() {
    const gi = S.gameInfo, g = S.game, isApp = !!window.stApi;
    const exe = gameExe();
    const modeHint = g.mode === 'steam'
      ? (gi && gi.steam ? (gi.steam.installed ? L('Steam détecté — le jeu démarre via Steam.', 'Steam detected — the game starts through Steam.') : L('Steam introuvable sur ce PC.', 'Steam not found on this PC.')) : '')
      : (exe ? `<span class="mono">${esc(exe)}</span>` : L('r5apex.exe introuvable : choisis-le manuellement.', 'r5apex.exe not found: pick it manually.'));
    return `<h2>${L('Lancer le jeu', 'Launch the game')}</h2><div class="card">
      <div class="set"><div><h4>${L('Plateforme', 'Platform')}</h4><p>${modeHint}</p></div>
        <div class="ctl"><div class="seg">${[['steam', 'Steam'], ['ea', 'EA app'], ['exe', L('Exécutable', 'Executable')]].map(([k, n]) => `<button class="${g.mode === k ? 'on' : ''}" data-act="gmode" data-v="${k}">${n}</button>`).join('')}</div>${g.mode !== 'steam' ? `<button class="btn sm" data-act="gexe">${L('Choisir r5apex.exe', 'Pick r5apex.exe')}</button>` : ''}</div></div>
      <div class="set"><div><h4>${L('Envoyer mes options de lancement', 'Send my launch options')}</h4><p>${L('Ajoute les options configurées ci-dessous au démarrage.', 'Adds the options configured below when starting.')} <span class="mono">${esc(launchString()) || '—'}</span></p></div>
        <div class="ctl"><button class="switch${g.useOpts ? ' on' : ''}" data-act="gopts"></button></div></div>
      <div class="set"><div><p>${isApp ? L('Si des changements sont en attente, l\'app propose de les appliquer avant le lancement.', 'If changes are pending, the app offers to apply them before launching.') : L('Disponible dans l\'application Windows.', 'Available in the Windows app.')}</p></div>
        <div class="ctl"><button class="btn gold" data-act="launch"${isApp ? '' : ' disabled'}>▶ ${L('Lancer Apex Legends', 'Launch Apex Legends')}</button></div></div></div>`;
  }
  async function refreshGameInfo() {
    if (!window.stApi || !window.stApi.gameDetect) return;
    try {
      S.gameInfo = await window.stApi.gameDetect();
      if (!store.get('game', null)) { const gi = S.gameInfo; S.game.mode = gi.steam.exe ? 'steam' : gi.ea.exe ? 'ea' : (gi.steam.installed ? 'steam' : 'ea'); }
    } catch (e) {}
  }
  function choice3(title, body, labels) {
    return new Promise((res) => {
      dialog(`<h3>${esc(title)}</h3><p class="lead">${esc(body)}</p><div class="foot">${labels.map((l, i) => `<button class="btn${i === 0 ? ' gold' : ''}" data-x="${i}">${esc(l)}</button>`).join('')}<button class="btn" data-x="c">${L('Annuler', 'Cancel')}</button></div>`);
      $('#modal').onclick = (e) => { const x = e.target.dataset.x; if (x !== undefined || e.target.id === 'modal') { closeDialog(); res(x === undefined || x === 'c' ? -1 : +x); } };
    });
  }
  async function launchGame() {
    if (!window.stApi || !window.stApi.gameLaunch) return toast(L('Le lancement est disponible dans l\'application Windows.', 'Launching is available in the Windows app.'), { bad: true });
    if (!S.gameInfo) await refreshGameInfo();
    if (changes().length) {
      const c = await choice3(L('Changements en attente', 'Pending changes'), L('Tu as des changements non appliqués. Les appliquer avant de lancer ?', 'You have unapplied changes. Apply them before launching?'), [L('Appliquer puis lancer', 'Apply, then launch'), L('Lancer sans appliquer', 'Launch without applying')]);
      if (c === -1) return;
      if (c === 0 && !(await applyChanges())) return;
    }
    const r = await window.stApi.gameLaunch({ mode: S.game.mode, exe: gameExe(), args: S.game.useOpts ? launchString() : '' });
    if (r && r.ok) return toast(L('Lancement d\'Apex Legends…', 'Launching Apex Legends…'));
    if (r && r.error === 'running') return toast(L('Apex est déjà lancé.', 'Apex is already running.'), { bad: true });
    if (r && r.error === 'exe-missing') { S.tab = 'launch'; render(); return toast(L('r5apex.exe introuvable : choisis-le dans « Lancer le jeu ».', 'r5apex.exe not found: pick it in “Launch the game”.'), { bad: true }); }
    toast(L('Lancement impossible.', 'Could not launch.') + (r && r.error ? ' ' + r.error : ''), { bad: true });
  }

  // ---------- keyboard / mouse overlay
  const OV_COLORS = ['#7cff3a', '#f5c542', '#ffffff', '#ff3df2', '#35d9ff', '#ff4d4d'];
  const VKS = { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, ShiftLeft: 16, ShiftRight: 16, ControlLeft: 17, ControlRight: 17, Space: 32, KeyC: 67 };
  function ovPost(msg) { const f = $('#ovprev'); if (f && f.contentWindow) f.contentWindow.postMessage(Object.assign({ __st1m: 'ov' }, msg), '*'); }
  async function ovPush() {
    store.set('overlay', S.ov);
    ovPost({ cfg: Object.assign({}, S.ov, { scale: 1 }) });
    if (window.stApi && window.stApi.overlaySet) { try { await window.stApi.overlaySet(S.ov); } catch (e) {} }
  }
  function pageOverlay() {
    const o = S.ov, isApp = !!window.stApi;
    const sw = (k, fr, en, dfr, den) => `<div class="set"><div><h4>${L(fr, en)}</h4>${dfr ? `<p>${L(dfr, den)}</p>` : ''}</div><div class="ctl"><button class="switch${o[k] ? ' on' : ''}" data-act="ovt" data-k="${k}"></button></div></div>`;
    const sl = (k, fr, en, min, max, step, fmt) => `<div class="set"><div><h4>${L(fr, en)}</h4></div><div class="ctl"><input type="range" min="${min}" max="${max}" step="${step}" value="${o[k]}" data-in="ovnum" data-k="${k}"><span class="num" id="ovn-${k}">${fmt ? Number(o[k]).toFixed(fmt) : o[k]}</span></div></div>`;
    const anchors = ['tl', 'tc', 'tr', 'cl', 'cc', 'cr', 'bl', 'bc', 'br'];
    return `<div class="page">${pageTitle(L('Overlay clavier & souris', 'Keyboard & mouse overlay'), L('Affiche tes touches (WASD…) et le mouvement de ta souris au-dessus du jeu, sans fond. Idéal pour les clips et le coaching.', 'Shows your keys (WASD…) and mouse movement on top of the game, with no background. Great for clips and coaching.'))}
      ${isApp ? '' : `<div class="note" style="margin-bottom:14px">${L('L\'overlay au-dessus du jeu nécessite l\'application Windows. L\'aperçu ci-dessous fonctionne ici.', 'The in-game overlay needs the Windows app. The preview below works here.')}</div>`}
      <div class="two">
        <div class="card">
          ${sw('on', 'Activer l\'overlay', 'Enable overlay', 'Raccourci global : Ctrl + Maj + O', 'Global shortcut: Ctrl + Shift + O')}
          ${sw('auto', 'Seulement quand Apex tourne', 'Only while Apex is running', 'L\'overlay se montre et se cache tout seul.', 'The overlay shows and hides by itself.')}
          ${sw('ring', 'Cercle de la souris', 'Mouse ring', 'Un cercle entoure les touches ; le point suit la direction de la souris.', 'A ring surrounds the keys; the dot follows the mouse direction.')}
          ${sw('glow', 'Effet néon', 'Neon glow')}
          ${sw('ctrl', 'Touche Ctrl (s\'accroupir)', 'Ctrl key (crouch)')}
          ${sw('shift', 'Touche Maj (sprint)', 'Shift key (sprint)')}
          ${sw('space', 'Barre d\'espace (saut)', 'Space bar (jump)')}
          ${sw('mouse', 'Clics souris', 'Mouse clicks')}
          ${sw('m45', 'Boutons latéraux (M4 / M5)', 'Side buttons (M4 / M5)')}
          ${sw('wheel', 'Molette (haut/bas + compteur par seconde)', 'Wheel (up/down + ticks per second)', 'Utile pour le tap strafe et le scroll jump.', 'Useful for tap strafe and scroll jump.')}
          ${sw('timeline', 'Frise saut / accroupi / molette', 'Jump / crouch / scroll timeline', 'Les 3 dernières secondes de tes entrées.', 'The last 3 seconds of your inputs.')}
        </div>
        <div><div class="ovprev"><iframe id="ovprev" src="overlay.html?preview=1" title="preview" style="height:${o.timeline ? 476 : 380}px"></iframe></div>
          <p class="lead" style="margin:10px 4px 0;font-size:12.5px">${L('Aperçu en direct : appuie sur W A S D (et bouge la souris) pour tester.', 'Live preview: press W A S D (and move the mouse) to test.')}</p></div>
      </div>
      <h2>${L('Position & apparence', 'Position & look')}</h2>
      <div class="card">
        <div class="set"><div><h4>${L('Emplacement', 'Placement')}</h4><p>${L('Écran principal. Ajuste ensuite avec les décalages.', 'Primary display. Fine-tune with the offsets.')}</p></div><div class="ctl"><div class="anc">${anchors.map((a) => `<button class="${o.anchor === a ? 'on' : ''}" data-act="ovanchor" data-v="${a}" title="${a}"></button>`).join('')}</div></div></div>
        ${sl('ox', 'Décalage horizontal', 'Horizontal offset', -900, 900, 5)}
        ${sl('oy', 'Décalage vertical', 'Vertical offset', -600, 600, 5)}
        ${sl('scale', 'Taille', 'Size', 0.5, 2, 0.05, 2)}
        ${sl('opacity', 'Opacité', 'Opacity', 0.3, 1, 0.05, 2)}
        <div class="set"><div><h4>${L('Couleur', 'Colour')}</h4></div><div class="ctl">${OV_COLORS.map((c) => `<button class="swatch${o.color.toLowerCase() === c ? ' on' : ''}" style="background:${c};color:${c}" data-act="ovcolor" data-v="${c}"></button>`).join('')}<input type="color" value="${esc(o.color)}" data-in="ovhex"></div></div>
      </div>
      <div class="note" style="margin-top:14px">${L('<b>Important :</b> mets Apex en mode <b>Sans bordure</b> (onglet Affichage) — un overlay ne peut pas s\'afficher au-dessus du plein écran exclusif. L\'overlay lit uniquement W A S D, Maj, Ctrl, Espace, C et la souris, en local : rien n\'est enregistré ni envoyé.', '<b>Important:</b> set Apex to <b>Borderless</b> (Display tab) — an overlay cannot draw over exclusive fullscreen. The overlay only reads W A S D, Shift, Ctrl, Space, C and the mouse, locally: nothing is recorded or sent.')}</div></div>`;
  }
  function initOverlayPreview() {
    const f = $('#ovprev'); if (!f) return;
    const send = () => ovPost({ cfg: Object.assign({}, S.ov, { scale: 1 }) });
    f.addEventListener('load', send); send();
  }

  function pageSettings(tab) {
    const defs = ST.DEFS.filter((d) => d.tab === tab.id);
    let extra = '';
    if (tab.id === 'display') extra = stretchCard();
    const pre = tab.id === 'shadows' ? shadowQualityRow() : '';
    return `<div class="page">${pageTitle(tabLabel(tab), L(LEADS[tab.id][0], LEADS[tab.id][1]))}<div class="card">${pre}${defs.map(settingRow).join('')}</div>${extra}</div>`;
  }

  const SHADOW_Q = { low: { shadow_depth_dimen_min: '256', shadow_depth_upres_factor_max: '1', shadow_maxdynamic: '1' }, medium: { shadow_depth_dimen_min: '256', shadow_depth_upres_factor_max: '2', shadow_maxdynamic: '2' }, high: { shadow_depth_dimen_min: '512', shadow_depth_upres_factor_max: '3', shadow_maxdynamic: '4' } };
  function shadowQualityRow() {
    const cur = Object.keys(SHADOW_Q).find((k) => Object.entries(SHADOW_Q[k]).every(([id, v]) => ST.defVal(ST.DEF[id], S.draft.values) === v));
    return `<div class="set"><div><h4>${L('Qualité des ombres dynamiques (raccourci)', 'Dynamic shadow quality (shortcut)')}</h4><p>${L('Règle d\'un coup la résolution, le facteur et le nombre d\'ombres ci-dessous.', 'Sets resolution, upscale factor and shadow count below in one go.')}</p></div>
      <div class="ctl"><div class="seg">${[['low', 'Bas', 'Low'], ['medium', 'Moyen', 'Medium'], ['high', 'Haut', 'High']].map((o) => `<button class="${cur === o[0] ? 'on' : ''}" data-act="shq" data-v="${o[0]}">${L(o[1], o[2])}</button>`).join('')}</div></div></div>`;
  }
  function stretchCard() {
    const nw = S.nativeW || Math.round(screen.width * (devicePixelRatio || 1)), nh = S.nativeH || Math.round(screen.height * (devicePixelRatio || 1));
    const asp = S.asp || '16:10';
    const [a, b] = asp.split(':').map(Number);
    const tiers = [[1, L('Net', 'Sharp')], [5 / 6, L('Équilibré', 'Balanced')], [0.75, L('Performance', 'Performance')]];
    const even = (x) => Math.round(x / 2) * 2;
    const opts = tiers.map(([k, name]) => { const h = even(nh * k), w = even((h * a) / b); return { w, h, name }; }).filter((o) => !(o.w === nw && o.h === nh) && o.w <= nw);
    return `<h2>${L('Résolution étirée', 'Stretched resolution')}</h2><div class="card pad">
      <p class="lead" style="margin-bottom:12px">${L('Résolution native détectée :', 'Detected native resolution:')} <b>${nw}×${nh}</b>. ${L('Pense à régler la mise à l\'échelle GPU sur « Plein écran » dans le panneau NVIDIA/AMD pour supprimer les bandes noires.', 'Set GPU scaling to “Full-screen” in the NVIDIA/AMD panel to remove black bars.')}</p>
      <div class="seg" style="margin-bottom:14px">${['16:10', '4:3', '5:4'].map((x) => `<button class="${x === asp ? 'on' : ''}" data-act="asp" data-v="${x}">${x}</button>`).join('')}</div>
      <div class="row-btns">${opts.map((o) => `<button class="btn" data-act="res" data-w="${o.w}" data-h="${o.h}">${o.w}×${o.h} <span class="tag">${esc(o.name)}</span></button>`).join('')}</div></div>`;
  }

  function pageHome() {
    const files = ['video', 'profile', 'settings'];
    const fname = { video: 'videoconfig.txt', profile: 'profile.cfg', settings: 'settings.cfg' };
    const found = files.filter((k) => S.texts[k]).length;
    const demo = S.be.kind === 'demo' && !window.stApi;
    const heavy = ST.DEFS.filter((d) => d.fps === 'heavy' && d.type === 'toggle' && ST.defVal(d, S.draft.values) === d.on);
    const tsOn = ST.QUICK_BINDS[0].binds && Object.entries(ST.QUICK_BINDS[0].binds).every(([k, c]) => S.cur.binds[k] === c);
    return `<div class="page">
      ${demo ? `<div class="note" style="margin-bottom:16px">${L('<b>Mode démo</b> — aucun fichier Apex réel n\'est modifié. ', '<b>Demo mode</b> — no real Apex file is modified. ')}${ST.fsaSupported() ? `<button class="btn sm" data-act="fsa">${L('Choisir le dossier Apex', 'Pick the Apex folder')}</button>` : L('Utilise l\'application Windows pour éditer tes vrais fichiers.', 'Use the Windows app to edit your real files.')}</div>` : ''}
      <div class="hero">${LOGO}<div>
        <h1>ST1M PORT4L</h1><div class="tag" style="display:inline-block;color:var(--gold);border-color:var(--line)">by idZy</div>
        <p>${L('L\'éditeur de config Apex Legends de la communauté : débloque les réglages cachés (FOV 120, ombres, textures, réticule RGB…), applique ton setup en un clic et sauvegarde tout automatiquement.', 'The community Apex Legends config editor: unlock hidden settings (FOV 120, shadows, textures, RGB reticle…), apply your setup in one click and back everything up automatically.')}</p>
        <div class="row-btns">
          <button class="btn gold big" data-act="one-st1m">⚡ ${L('Appliquer le setup ST1M', 'Apply the ST1M setup')}</button>
          <button class="btn big" data-act="one-tap">${tsOn ? '✔ ' : '🎯 '}${L('Binds Tap Strafe', 'Tap Strafe binds')}</button>
          <button class="btn big" data-act="copy-mine">📋 ${L('Copier mes settings', 'Copy my settings')}</button>
          <button class="btn big" data-act="launch">▶ ${L('Lancer Apex', 'Launch Apex')}</button>
        </div>
        <div class="chips">${files.map((k) => `<span class="pill ${S.texts[k] ? 'ok' : 'warn'}"><i></i>${fname[k]}${k === 'video' && S.lock ? ' 🔒' : ''}</span>`).join('')}<span class="pill"><i></i>${found}/3 ${L('fichiers trouvés', 'files found')}</span></div>
      </div></div>

      <h2>MOVEMENT LAB</h2>
      <div class="grid">${(() => { const st = ST.hub ? ST.hub.stats() : null; return [
        ['techs', '☰', L('Catalogue des techniques', 'Technique catalogue'), st ? `${st.total} ${L('techniques', 'techniques')} · ${st.mastered} ${L('maîtrisées', 'mastered')}` : ''],
        ['path', '⇪', L('Parcours de progression', 'Learning path'), st ? `${st.level.name} · ${st.xp} XP` : ''],
        ['training', '◔', L('Superglide Trainer & rythme', 'Superglide Trainer & rhythm'), L('Mesure tes inputs, rien n\'est envoyé au jeu', 'Measures your inputs, nothing is sent to the game')],
        ['legends', '★', L('Légendes & quiz', 'Legends & quiz'), L('Quelle légende te correspond ?', 'Which legend suits you?')]].map((t) => `<button class="tile" data-act="tab" data-v="${t[0]}"><b>${t[1]} ${esc(t[2])}</b><span>${esc(t[3])}</span></button>`).join(''); })()}</div>
      <h2>${L('Presets', 'Presets')}</h2>
      <div class="grid">${ST.PRESETS.map((p) => `<button class="tile${p.accent ? ' accent' : ''}" data-act="preset" data-id="${p.id}"><b>${esc(p[ST.lang][0])}</b><span>${esc(p[ST.lang][1])}</span></button>`).join('')}</div>

      <h2>${L('Code de partage', 'Share code')}</h2>
      <div class="two">
        <div class="card pad"><span class="lbl">${L('Code du setup ST1M (copie-le ou partage-le)', 'ST1M setup code (copy or share it)')}</span><div class="mono">${esc(S.code || '…')}</div>
          <div class="row-btns" style="margin-top:12px"><button class="btn sm" data-act="copy-st1m">${L('Copier', 'Copy')}</button><button class="btn sm gold" data-act="one-st1m">${L('Appliquer en 1 clic', 'Apply in 1 click')}</button></div></div>
        <div class="card pad"><span class="lbl">${L('Coller un code (CE1: ou SP1:)', 'Paste a code (CE1: or SP1:)')}</span><textarea class="inp" id="home-code" placeholder="CE1:eNp1…"></textarea>
          <div class="row-btns" style="margin-top:12px"><button class="btn sm" data-act="import-home">${L('Importer', 'Import')}</button><button class="btn sm gold" data-act="import-home-now">${L('Importer + appliquer', 'Import + apply')}</button></div></div>
      </div>

      ${heavy.length ? `<h2>${L('Conseils FPS', 'FPS tips')}</h2><div class="card pad"><p class="lead" style="margin-bottom:12px">${L('Réglages coûteux actuellement activés :', 'Costly settings currently enabled:')} ${heavy.map((d) => `<span class="tag heavy">${esc(defLabel(d))}</span>`).join(' ')}</p><button class="btn sm" data-act="cut-heavy">${L('Tous les couper', 'Turn them all off')}</button></div>` : ''}
    </div>`;
  }

  function bindRow(K, c, del) {
    return `<div class="bind"><span class="keycap">${esc(K)}</span><span class="cmd">${esc(c)}</span>${del ? `<button class="btn sm danger" data-act="del-bind" data-k="${esc(K)}">✕</button>` : '<span></span>'}</div>`;
  }
  function pageBinds() {
    const hud = Object.entries(S.draft.binds).find(([, c]) => c.includes('gameui_hide'));
    const cap = S.capturing;
    const quick = ST.QUICK_BINDS.map((q) => {
      const on = Object.entries(q.binds).every(([k, c]) => S.draft.binds[k] === c);
      return `<div class="set"><div><h4>${on ? '✔ ' : ''}${esc(q[ST.lang][0])}</h4><p>${esc(q[ST.lang][1])}</p><span class="key">${Object.entries(q.binds).map(([k, c]) => `${k} → ${c}`).join('   ')}</span></div>
      <div class="ctl">${on ? `<button class="btn sm danger" data-act="qb-off" data-id="${q.id}">${L('Retirer', 'Remove')}</button>` : `<button class="btn sm gold" data-act="qb-on" data-id="${q.id}">${L('Ajouter', 'Add')}</button><button class="btn sm" data-act="qb-now" data-id="${q.id}">${L('Appliquer en 1 clic', 'Apply in 1 click')}</button>`}</div></div>`;
    }).join('');
    const list = Object.entries(S.draft.binds).sort();
    return `<div class="page">${pageTitle(L('Binds', 'Binds'), L('Les binds sont écrits dans settings.cfg. Chaque touche déclenche <b>une seule</b> commande normale du jeu (pas de macro).', 'Binds are written to settings.cfg. Every key triggers <b>one</b> normal game command (no macros).'))}
      <h2>${L('Packs de binds (mouvement)', 'Bind packs (movement)')}</h2><div class="card">${quick}</div>
      <div class="note" style="margin-top:12px">${L('Astuce : garde W sur le clavier et scrolle la molette en maintenant A ou D en l\'air. Ces binds ne font qu\'assigner « avancer » à la molette — c\'est la méthode standard et autorisée.', 'Tip: keep W on the keyboard and flick the wheel while holding A or D in the air. These binds only map “forward” to the wheel — the standard, allowed method.')}</div>
      <h2>${L('Masquer le HUD', 'Hide HUD')}</h2>
      <div class="card"><div class="set"><div><h4>${L('Touche pour masquer le HUD', 'Hide-HUD key')}</h4><p>${L('Pratique pour les clips et captures. Les anciens binds de masquage sont remplacés.', 'Handy for clips and screenshots. Old hide-HUD binds are replaced.')}</p></div>
        <div class="ctl">${hud ? `<span class="keycap">${esc(hud[0])}</span>` : `<span class="tag">${L('aucune', 'none')}</span>`}<button class="btn sm" data-act="cap" data-for="hud">${cap === 'hud' ? L('Appuie sur une touche…', 'Press a key…') : L('Changer', 'Change')}</button>${hud ? `<button class="btn sm danger" data-act="del-bind" data-k="${esc(hud[0])}">✕</button>` : ''}</div></div></div>
      <h2>${L('Ajouter un bind', 'Add a bind')}</h2>
      <div class="card pad"><div class="row-btns" style="align-items:center">
        <button class="btn" data-act="cap" data-for="new">${cap === 'new' ? L('Appuie sur une touche…', 'Press a key…') : (S.newKey ? esc(S.newKey) : L('Choisir la touche', 'Pick the key'))}</button>
        <input class="inp" list="cmds" id="newcmd" placeholder="+forward" style="flex:1;min-width:160px" value="${esc(S.newCmd || '')}">
        <datalist id="cmds">${ST.COMMON_CMDS.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <button class="btn gold" data-act="add-bind">${L('Ajouter', 'Add')}</button></div></div>
      <h2>${L('Binds actuels', 'Current binds')} (${list.length})</h2><div class="card">${list.length ? list.map(([k, c]) => bindRow(k, c, true)).join('') : `<p class="lead" style="margin:14px 0">${L('Aucun bind trouvé dans settings.cfg.', 'No bind found in settings.cfg.')}</p>`}</div></div>`;
  }

  function launchString() {
    const l = S.launch, p = [];
    if (l.novid) p.push('-novid');
    if (l.lobby) p.push('+lobby_max_fps 0');
    if (l.thread) p.push('-no_render_on_input_thread');
    if (l.cap) p.push('+fps_max ' + Math.min(300, Math.max(0, parseInt(l.capv, 10) || 0)));
    if (l.high) p.push('-high');
    if (l.fps) p.push('+cl_showfps 1');
    if (l.stretch) p.push(`-w ${parseInt(l.w, 10) || 1440} -h ${parseInt(l.h, 10) || 1080}`);
    const ex = String(l.extra || '').replace(/[^\w+\-. =,]/g, '').trim();
    if (ex) p.push(ex);
    return p.join(' ');
  }
  function pageLaunch() {
    const l = S.launch;
    const sw = (k, fr, en, dfr, den) => `<div class="set"><div><h4>${L(fr, en)}</h4><p>${L(dfr, den)}</p></div><div class="ctl"><button class="switch${l[k] ? ' on' : ''}" data-act="lt" data-k="${k}"></button></div></div>`;
    return `<div class="page">${pageTitle(L('Options de lancement', 'Launch options'), L('À coller dans Steam (Propriétés → Options de lancement) ou EA app (Propriétés du jeu → Options avancées).', 'Paste into Steam (Properties → Launch options) or the EA app (Game properties → Advanced).'))}
      ${launcherCard()}
      <h2>${L('Options', 'Options')}</h2>
      <div class="card">
        ${sw('novid', 'Passer l\'intro', 'Skip intro video', 'Saute la vidéo d\'intro au démarrage (-novid).', 'Skips the startup intro video (-novid).')}
        ${sw('lobby', 'FPS du lobby débloqués', 'Uncapped lobby FPS', 'Retire la limite de FPS dans le lobby (+lobby_max_fps 0).', 'Removes the lobby FPS limit (+lobby_max_fps 0).')}
        ${sw('thread', 'Optimisation du thread de rendu', 'Render thread optimisation', 'Ne fait pas le rendu sur le thread des inputs (-no_render_on_input_thread).', 'Does not render on the input thread (-no_render_on_input_thread).')}
        ${sw('high', 'Priorité processus haute', 'High process priority', '-high', '-high')}
        ${sw('fps', 'Afficher le compteur FPS', 'Show FPS counter', '+cl_showfps 1', '+cl_showfps 1')}
        <div class="set"><div><h4>${L('Limiter les FPS', 'FPS cap')}</h4><p>${L('0 à 300 (+fps_max).', '0 to 300 (+fps_max).')}</p></div><div class="ctl"><input class="inp" type="number" min="0" max="300" value="${esc(l.capv)}" data-in="lcap"><button class="switch${l.cap ? ' on' : ''}" data-act="lt" data-k="cap"></button></div></div>
        <div class="set"><div><h4>${L('Résolution étirée au lancement', 'Stretched resolution at launch')}</h4><p>${L('Force la résolution via -w / -h.', 'Forces the resolution via -w / -h.')}</p></div><div class="ctl"><input class="inp" type="number" style="width:84px" value="${esc(l.w)}" data-in="lw"> × <input class="inp" type="number" style="width:84px" value="${esc(l.h)}" data-in="lh"><button class="switch${l.stretch ? ' on' : ''}" data-act="lt" data-k="stretch"></button></div></div>
        <div class="set"><div><h4>${L('Options supplémentaires', 'Extra options')}</h4><p>${L('Lettres, chiffres, + - . = et espaces uniquement.', 'Letters, digits, + - . = and spaces only.')}</p></div><div class="ctl"><input class="inp" style="width:260px" value="${esc(l.extra)}" data-in="lextra"></div></div>
      </div>
      <h2>${L('Résultat', 'Result')}</h2><div class="card pad"><div class="mono" id="launch-out">${esc(launchString()) || '—'}</div><div class="row-btns" style="margin-top:12px"><button class="btn gold sm" data-act="copy-launch">${L('Copier', 'Copy')}</button></div></div></div>`;
  }

  function pageProfiles() {
    const profs = store.get('profiles', []);
    return `<div class="page">${pageTitle(L('Profils & partage', 'Profiles & sharing'), L('Sauvegarde tes configs, bascule en un clic, partage-les avec la communauté.', 'Save your configs, switch in one click, share them with the community.'))}
      <h2>${L('Mes profils', 'My profiles')}</h2>
      <div class="card pad"><div class="row-btns"><input class="inp" id="pname" placeholder="${L('Nom du profil (ex : Ranked, LAN…)', 'Profile name (e.g. Ranked, LAN…)')}" style="flex:1;min-width:200px" maxlength="40"><button class="btn gold" data-act="p-save">${L('Enregistrer l\'état actuel', 'Save current state')}</button></div>
      <div class="plist" style="margin-top:8px">${profs.length ? profs.map((p, i) => `<div><b>${esc(p.name)}</b><button class="btn sm" data-act="p-load" data-i="${i}">${L('Charger', 'Load')}</button><button class="btn sm gold" data-act="p-apply" data-i="${i}">${L('Appliquer', 'Apply')}</button><button class="btn sm" data-act="p-copy" data-i="${i}">${L('Code', 'Code')}</button><button class="btn sm danger" data-act="p-del" data-i="${i}">✕</button></div>`).join('') : `<p class="lead" style="margin:12px 0 0">${L('Aucun profil enregistré.', 'No saved profile.')}</p>`}</div></div>
      <h2>${L('Partager', 'Share')}</h2>
      <div class="card pad"><div class="row-btns"><button class="btn gold" data-act="copy-mine">${L('Copier mon code (fichiers actuels)', 'Copy my code (current files)')}</button><button class="btn" data-act="copy-draft">${L('Copier le code du brouillon', 'Copy draft code')}</button><button class="btn" data-act="copy-compat">${L('Format CE1 (Config Editor)', 'CE1 format (Config Editor)')}</button><button class="btn" data-act="export-file">${L('Exporter en fichier', 'Export to file')}</button></div>
        <span class="lbl">${L('Importer un code', 'Import a code')}</span><textarea class="inp" id="imp" placeholder="CE1:… / SP1:…"></textarea>
        <div class="row-btns" style="margin-top:12px"><button class="btn gold" data-act="import-box">${L('Importer', 'Import')}</button><button class="btn" data-act="import-file">${L('Importer un fichier', 'Import a file')}</button><input type="file" id="impfile" accept=".json,.txt,.st1m" hidden></div></div></div>`;
  }

  function pageSystem() {
    const files = [['video', 'videoconfig.txt'], ['profile', 'profile.cfg'], ['settings', 'settings.cfg']];
    const bg = store.get('bg', 'hole');
    return `<div class="page">${pageTitle(L('Système', 'System'), L('Dossier Apex, sauvegardes, verrou de config, langue et apparence.', 'Apex folder, backups, config lock, language and look.'))}
      <h2>${L('Dossier Apex', 'Apex folder')}</h2>
      <div class="card pad"><div class="mono">${esc(S.info.root || '—')}</div>
        <div class="row-btns" style="margin-top:12px">${S.be.kind === 'demo' && !ST.fsaSupported() ? '' : `<button class="btn" data-act="pickfolder">${L('Changer de dossier', 'Change folder')}</button>`}${ST.fsaSupported() && S.be.kind === 'demo' ? `<button class="btn gold" data-act="fsa">${L('Choisir le dossier Apex', 'Pick the Apex folder')}</button>` : ''}<button class="btn" data-act="open-folder">${L('Ouvrir le dossier', 'Open folder')}</button><button class="btn" data-act="reload">${L('Relire les fichiers', 'Reload files')}</button></div>
        <p class="lead" style="margin:12px 0 0">${L('Par défaut :', 'Default:')} <span class="mono">%USERPROFILE%\\Saved Games\\Respawn\\Apex</span></p></div>
      <h2>${L('Fichiers & sauvegardes', 'Files & backups')}</h2>
      <div class="card">${files.map(([k, n]) => { const st = S.status[k] || {}; return `<div class="set"><div><h4>${n} ${S.texts[k] ? '' : `<span class="tag">${L('introuvable', 'not found')}</span>`}${st.readonly ? '<span class="tag medium">🔒 read-only</span>' : ''}</h4><p>${L('Une sauvegarde de l\'original (.st1m.bak) et de la version précédente (.st1m.last.bak) est créée à chaque application.', 'A backup of the original (.st1m.bak) and the previous version (.st1m.last.bak) is created on every apply.')}</p></div>
        <div class="ctl"><button class="btn sm" data-act="restore" data-k="${k}" data-w="last">${L('Version précédente', 'Previous version')}</button><button class="btn sm danger" data-act="restore" data-k="${k}" data-w="original">${L('Original', 'Original')}</button></div></div>`; }).join('')}</div>
      <h2>${L('Verrou de config', 'Config lock')}</h2>
      <div class="card"><div class="set"><div><h4>${L('Verrouiller videoconfig.txt', 'Lock videoconfig.txt')}</h4><p>${L('Passe le fichier en lecture seule après application pour qu\'Apex ne réinitialise pas tes réglages. Désactive avant de modifier dans le jeu.', 'Makes the file read-only after applying so Apex cannot reset your settings. Turn off before changing options in-game.')}</p></div><div class="ctl"><button class="switch${S.lock ? ' on' : ''}" data-act="lock"></button></div></div></div>
      <h2>${L('Apparence', 'Appearance')}</h2>
      <div class="card"><div class="set"><div><h4>${L('Langue', 'Language')}</h4></div><div class="ctl"><div class="seg"><button class="${ST.lang === 'fr' ? 'on' : ''}" data-act="lang" data-v="fr">Français</button><button class="${ST.lang === 'en' ? 'on' : ''}" data-act="lang" data-v="en">English</button></div></div></div>
        <div class="set"><div><h4>${L('Arrière-plan', 'Background')}</h4><p>${L('Fond flou animé (trou noir), ton image, ou rien (économise le GPU).', 'Animated blurred background (black hole), your own image, or none (saves GPU).')}</p></div><div class="ctl"><div class="seg"><button class="${bg === 'hole' ? 'on' : ''}" data-act="bg" data-v="hole">${L('Animé', 'Animated')}</button><button class="${bg === 'image' ? 'on' : ''}" data-act="bg" data-v="image">${L('Image', 'Image')}</button><button class="${bg === 'off' ? 'on' : ''}" data-act="bg" data-v="off">Off</button></div><button class="btn sm" data-act="bg-pick">${L('Choisir une image', 'Choose image')}</button><input type="file" id="bgfile" accept="image/*" hidden></div></div></div>
      <h2>${L('À propos', 'About')}</h2>
      <div class="card pad"><p class="lead" style="margin:0"><b>ST1M PORT4L</b> by idZy — v${ST.VERSION}. ${L('Basé sur l\'idée de', 'Inspired by')} <i>Config Editor for Apex Legends</i> (MIT). ${L('Non affilié à Respawn ni EA. Utilisation à tes risques ; les sauvegardes sont automatiques.', 'Not affiliated with Respawn or EA. Use at your own risk; backups are automatic.')}</p></div></div>`;
  }

  // ---------- chrome
  function renderSide() {
    $('#side').innerHTML = `<div class="brand">${LOGO}<div><b>ST1M PORT4L</b><small>by idZy</small></div></div>` +
      ST.TABS.map((t, i) => (i > 0 && t.sec !== ST.TABS[i - 1].sec && ST.SECTIONS[t.sec] ? `<div class="navsec">${ST.SECTIONS[t.sec][0]}</div>` : '') + `<button class="nav${S.tab === t.id ? ' on' : ''}" data-act="tab" data-v="${t.id}"><i>${t.icon}</i><span>${esc(tabLabel(t))}</span>${tabHasChanges(t.id) ? '<span class="dot"></span>' : ''}</button>`).join('') +
      `<div class="side-foot">${L('Ferme Apex avant d\'appliquer.', 'Close Apex before applying.')}<br>MIT · idZy${ST.donateUrl && ST.donateUrl() ? ` · <a href="${esc(ST.donateUrl())}" target="_blank" rel="noopener noreferrer">☕ ${L('Soutenir', 'Support')}</a>` : ''}</div>`;
  }
  function renderTop() {
    $('#top').innerHTML = `<div class="search" data-act="palette">🔎 <span>${L('Rechercher un réglage ou une action…', 'Search a setting or action…')}</span><span class="kbd">Ctrl K</span></div><span class="spacer"></span><button class="btn gold sm" data-act="launch">▶ ${L('Lancer Apex', 'Launch Apex')}</button>
      <span class="pill ${S.be.kind === 'demo' ? 'warn' : S.texts.video ? 'ok' : 'bad'}"><i></i>${S.be.kind === 'demo' ? L('Mode démo', 'Demo mode') : S.texts.video ? L('Apex détecté', 'Apex detected') : L('Dossier introuvable', 'Folder not found')}</span>`;
  }
  function renderPending() {
    const n = changes().length, el = $('#pending');
    el.classList.toggle('show', n > 0);
    el.innerHTML = `<span><b>${n}</b> ${L(n > 1 ? 'changements en attente' : 'changement en attente', n > 1 ? 'pending changes' : 'pending change')}</span><button class="btn sm" data-act="discard">${L('Tout annuler', 'Discard all')}</button><button class="btn gold" data-act="review">${L('Réviser & appliquer', 'Review & apply')}</button>`;
  }
  function render() {
    const view = $('#view'), top = view.scrollTop;
    renderSide(); renderTop(); renderPending();
    const tab = ST.TABS.find((t) => t.id === S.tab);
    const ext = (ST.hub && ST.hub.pages[S.tab]) || (ST.trainer && ST.trainer.pages[S.tab]);
    view.innerHTML = ext ? ext() : S.tab === 'home' ? pageHome() : S.tab === 'preview' ? pagePreview() : S.tab === 'overlay' ? pageOverlay() : S.tab === 'binds' ? pageBinds() : S.tab === 'launch' ? pageLaunch() : S.tab === 'profiles' ? pageProfiles() : S.tab === 'system' ? pageSystem() : pageSettings(tab);
    view.scrollTop = S.flash ? 0 : top;
    if (S.flash) { const r = view.querySelector(`[data-row="${S.flash}"]`); if (r) { r.scrollIntoView({ block: 'center' }); r.classList.add('hit'); } S.flash = null; }
    document.documentElement.lang = ST.lang;
    if (S.tab === 'training' && ST.trainer) ST.trainer.after();
    if (S.tab === 'preview') mountTabPreview();
    if (S.tab === 'overlay') initOverlayPreview();
    if (S.tab === 'launch' && !S.gameInfo) refreshGameInfo().then(() => S.tab === 'launch' && render());
  }
  function rerenderSoft() { renderSide(); renderPending(); }

  // ---------- review dialog
  function openReview() {
    const list = changes();
    if (!list.length) return closeDialog();
    const name = (c) => (c.kind === 'bind' ? `bind ${c.id}` : defLabel(c.def));
    const val = (c, v) => (v === undefined || v === null ? '—' : c.kind === 'bind' ? v : optLabel(c.def, v));
    dialog(`<h3>${L('Réviser les changements', 'Review changes')}</h3>
      <div class="diff"><span class="h">${L('Réglage', 'Setting')}</span><span class="h">${L('Avant', 'Before')}</span><span class="h">${L('Après', 'After')}</span><span></span>
      ${list.map((c, i) => `<span>${esc(name(c))}</span><code class="old">${esc(val(c, c.from))}</code><code class="new">${esc(val(c, c.to))}</code><button class="undo" data-act="undo-rev" data-i="${i}" title="${L('Annuler', 'Undo')}">↺</button>`).join('')}</div>
      <p class="lead" style="margin:16px 0 0">${L('Une sauvegarde des fichiers est créée avant l\'écriture.', 'The files are backed up before writing.')}</p>
      <div class="foot"><button class="btn" data-act="close">${L('Fermer', 'Close')}</button><button class="btn gold" data-act="apply">${L('Appliquer', 'Apply')}</button></div>`);
    S.reviewList = list;
  }

  // ---------- command palette
  function paletteItems() {
    const items = [
      { t: '⚡ ' + L('Appliquer le setup ST1M (1 clic)', 'Apply ST1M setup (1 click)'), k: 'st1m idzy setup', run: () => oneClick(ST.presetToState(ST.PRESETS[0])), tag: L('action', 'action') },
      { t: '🎯 ' + L('Tap strafe : binds en 1 clic', 'Tap strafe: binds in 1 click'), k: 'tap strafe binds molette wheel', run: () => oneClick({ values: {}, binds: ST.QUICK_BINDS[0].binds }), tag: L('action', 'action') },
      { t: '▶ ' + L('Lancer Apex Legends', 'Launch Apex Legends'), k: 'launch lancer jouer play', run: () => launchGame(), tag: L('action', 'action') },
      { t: '◎ ' + L('Activer / couper l\'overlay clavier', 'Toggle keyboard overlay'), k: 'overlay clavier keyboard wasd', run: () => { S.ov.on = !S.ov.on; ovPush(); if (S.tab === 'overlay') render(); }, tag: L('action', 'action') },
      { t: '📋 ' + L('Copier mes settings', 'Copy my settings'), k: 'copy code partage share', run: () => act.copyMine(), tag: L('action', 'action') },
    ];
    for (const p of ST.PRESETS) items.push({ t: L('Preset : ', 'Preset: ') + p[ST.lang][0], k: 'preset ' + p.id, run: () => { mergeState(ST.presetToState(p)); render(); }, tag: 'preset' });
    for (const t of ST.TABS) items.push({ t: tabLabel(t), k: t.id, run: () => { S.tab = t.id; render(); }, tag: L('page', 'page') });
    for (const d of ST.DEFS) items.push({ t: defLabel(d), k: `${d.key} ${defDesc(d)} ${d.id}`, run: () => { S.tab = d.tab; S.flash = d.id; render(); }, tag: ST.TABS.find((x) => x.id === d.tab)[ST.lang] });
    return items;
  }
  function openPalette() {
    S.palette = { q: '', sel: 0, all: paletteItems() };
    dialog(`<div class="pal"><input class="inp" id="pq" placeholder="${L('Tape pour chercher…', 'Type to search…')}" autocomplete="off"><ul id="pl"></ul></div>`);
    $('#modal .dlg').classList.add('pal'); $('#modal .dlg').style.cssText = 'padding:14px;margin-top:0;align-self:start';
    $('#modal').style.alignItems = 'start'; $('#modal').style.paddingTop = '12vh';
    paletteDraw(); $('#pq').focus();
  }
  function paletteFilter() {
    const q = S.palette.q.toLowerCase().split(/\s+/).filter(Boolean);
    return S.palette.all.filter((i) => q.every((w) => (i.t + ' ' + i.k).toLowerCase().includes(w))).slice(0, 40);
  }
  function paletteDraw() {
    const res = (S.palette.res = paletteFilter());
    S.palette.sel = Math.min(S.palette.sel, Math.max(0, res.length - 1));
    $('#pl').innerHTML = res.map((i, n) => `<li class="${n === S.palette.sel ? 'sel' : ''}" data-n="${n}">${esc(i.t)}<small>${esc(i.tag)}</small></li>`).join('') || `<li>${L('Aucun résultat', 'No results')}</li>`;
  }
  function paletteRun(n) { const it = S.palette.res[n]; closeDialog(); if (it) it.run(); }

  // ---------- actions
  const act = {
    tab: (el) => { S.tab = el.dataset.v; render(); },
    toggle: (el) => { const d = ST.DEF[el.dataset.id]; const v = ST.defVal(d, S.draft.values); S.draft.values[d.id] = v === d.on ? d.off : d.on; render(); },
    pick: (el) => { S.draft.values[el.dataset.id] = el.dataset.v; render(); },
    undo: (el) => { const id = el.dataset.id; if (S.cur.values[id] !== undefined) S.draft.values[id] = S.cur.values[id]; else delete S.draft.values[id]; render(); },
    'undo-rev': (el) => {
      const c = S.reviewList[+el.dataset.i];
      if (c.kind === 'bind') { if (c.from) S.draft.binds[c.id] = c.from; else delete S.draft.binds[c.id]; }
      else if (c.from !== undefined) S.draft.values[c.id] = c.from; else delete S.draft.values[c.id];
      render(); openReview();
    },
    discard: () => { S.draft = clone(S.cur); render(); },
    review: () => openReview(),
    apply: async () => { closeDialog(); await applyChanges(); },
    close: () => closeDialog(),
    palette: () => openPalette(),
    eye: (el) => openPreview(el.dataset.id),
    launch: () => launchGame(),
    gmode: (el) => { S.game.mode = el.dataset.v; store.set('game', S.game); render(); },
    gopts: () => { S.game.useOpts = !S.game.useOpts; store.set('game', S.game); render(); },
    gexe: async () => {
      const r = await window.stApi.gamePickExe(); if (!r) return;
      if (r.error) return toast(L('Choisis le fichier r5apex.exe.', 'Pick the r5apex.exe file.'), { bad: true });
      S.game.exe = r; store.set('game', S.game); render();
    },
    ovt: (el) => {
      const k = el.dataset.k; S.ov[k] = !S.ov[k];
      if (k === 'on' && S.ov.on && !window.stApi) toast(L('Overlay en jeu : application Windows requise (aperçu seulement ici).', 'In-game overlay: Windows app required (preview only here).'), { bad: true });
      ovPush(); render();
    },
    ovanchor: (el) => { S.ov.anchor = el.dataset.v; ovPush(); render(); },
    ovcolor: (el) => { S.ov.color = el.dataset.v; ovPush(); render(); },
    shq: (el) => { Object.assign(S.draft.values, SHADOW_Q[el.dataset.v]); S.draft.values.shadow_enable = S.draft.values.shadow_enable === undefined ? '1' : S.draft.values.shadow_enable; render(); },
    asp: (el) => { S.asp = el.dataset.v; render(); },
    res: (el) => { S.draft.values.defaultres = el.dataset.w; S.draft.values.defaultresheight = el.dataset.h; render(); },
    preset: (el) => { const p = ST.PRESETS.find((x) => x.id === el.dataset.id); mergeState(ST.presetToState(p)); render(); toast(L(`Preset « ${p.fr[0]} » chargé — vérifie puis applique.`, `Preset “${p.en[0]}” loaded — review then apply.`)); },
    'one-st1m': () => oneClick(ST.presetToState(ST.PRESETS[0])),
    'one-tap': () => oneClick({ values: {}, binds: ST.QUICK_BINDS[0].binds }),
    'cut-heavy': () => { for (const d of ST.DEFS) if (d.fps === 'heavy' && d.type === 'toggle') S.draft.values[d.id] = d.off; render(); },
    copyMine: async () => { const c = await currentCode(false, false); toast((await copy(c)) ? L('Code copié dans le presse-papiers ✔', 'Code copied to clipboard ✔') : L('Copie impossible', 'Copy failed'), {}); },
    'copy-mine': () => act.copyMine(),
    'copy-draft': async () => { toast((await copy(await currentCode(false, true))) ? L('Code copié ✔', 'Code copied ✔') : L('Copie impossible', 'Copy failed')); },
    'copy-compat': async () => { toast((await copy(await currentCode(true, false))) ? L('Code CE1 copié ✔', 'CE1 code copied ✔') : L('Copie impossible', 'Copy failed')); },
    'copy-st1m': async () => { toast((await copy(S.code)) ? L('Code ST1M copié ✔', 'ST1M code copied ✔') : L('Copie impossible', 'Copy failed')); },
    'import-home': () => importCode($('#home-code').value, false),
    'import-home-now': () => importCode($('#home-code').value, true),
    'import-box': () => importCode($('#imp').value, false),
    'import-file': () => $('#impfile').click(),
    'export-file': async () => {
      const code = await currentCode(false, true);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' })); a.download = 'setup.st1m'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    // binds
    'qb-on': (el) => { const q = ST.QUICK_BINDS.find((x) => x.id === el.dataset.id); for (const [k, c] of Object.entries(q.binds)) S.draft.binds[k] = c; render(); },
    'qb-now': (el) => { const q = ST.QUICK_BINDS.find((x) => x.id === el.dataset.id); return oneClick({ values: {}, binds: q.binds }); },
    'qb-off': (el) => { const q = ST.QUICK_BINDS.find((x) => x.id === el.dataset.id); for (const k of Object.keys(q.binds)) delete S.draft.binds[k]; render(); },
    'del-bind': (el) => { delete S.draft.binds[el.dataset.k]; render(); },
    cap: (el) => { S.capturing = el.dataset.for; const c = $('#newcmd'); if (c) S.newCmd = c.value; render(); },
    'add-bind': () => {
      const cmd = ($('#newcmd').value || '').trim();
      if (!S.newKey || !/^[\w+;\- ]{1,48}$/.test(cmd)) return toast(L('Choisis une touche et une commande valide.', 'Pick a key and a valid command.'), { bad: true });
      S.draft.binds[S.newKey] = cmd; S.newKey = null; S.newCmd = ''; render();
    },
    // launch
    lt: (el) => { S.launch[el.dataset.k] = !S.launch[el.dataset.k]; store.set('launch', S.launch); render(); },
    'copy-launch': async () => toast((await copy(launchString())) ? L('Options copiées ✔', 'Options copied ✔') : L('Copie impossible', 'Copy failed')),
    // profiles
    'p-save': () => {
      const name = ($('#pname').value || '').trim();
      if (!name) return toast(L('Donne un nom au profil.', 'Give the profile a name.'), { bad: true });
      const profs = store.get('profiles', []);
      const entry = { name, payload: ST.buildPayload(S.draft.values, S.draft.binds), ts: Date.now() };
      const i = profs.findIndex((p) => p.name === name); if (i >= 0) profs[i] = entry; else profs.push(entry);
      store.set('profiles', profs); render(); toast(L('Profil enregistré ✔', 'Profile saved ✔'));
    },
    'p-load': (el) => { try { mergeState(ST.payloadToState(store.get('profiles', [])[+el.dataset.i].payload)); render(); toast(L('Profil chargé — vérifie puis applique.', 'Profile loaded — review then apply.')); } catch (e) { toast(e.message, { bad: true }); } },
    'p-apply': (el) => { try { return oneClick(ST.payloadToState(store.get('profiles', [])[+el.dataset.i].payload)); } catch (e) { toast(e.message, { bad: true }); } },
    'p-copy': async (el) => { const p = store.get('profiles', [])[+el.dataset.i]; toast((await copy(await ST.encodeCode(p.payload, false))) ? L('Code copié ✔', 'Code copied ✔') : L('Copie impossible', 'Copy failed')); },
    'p-del': async (el) => { const profs = store.get('profiles', []); const p = profs[+el.dataset.i]; if (await confirmDlg(L('Supprimer le profil ?', 'Delete profile?'), p.name, L('Supprimer', 'Delete'))) { profs.splice(+el.dataset.i, 1); store.set('profiles', profs); render(); } },
    // system
    pickfolder: async () => { try { const r = await S.be.pick(); if (r) { await reload(); render(); } } catch (e) { toast(String(e.message || e), { bad: true }); } },
    fsa: async () => { try { const b = ST.makeFsaBackend(); await b.pick(); S.be = b; await reload(); render(); toast(L('Dossier connecté ✔', 'Folder connected ✔')); } catch (e) { if (e.name !== 'AbortError') toast(String(e.message || e), { bad: true }); } },
    'open-folder': () => S.be.openFolder(),
    reload: async () => { await reload(); render(); },
    restore: async (el) => {
      const k = el.dataset.k, w = el.dataset.w;
      if (!(await confirmDlg(L('Restaurer ?', 'Restore?'), L('Le fichier sera remplacé par la sauvegarde.', 'The file will be replaced by the backup.'), L('Restaurer', 'Restore')))) return;
      const r = await S.be.restore(k, w); await reload(); render();
      toast(r && r.ok ? L('Fichier restauré ✔', 'File restored ✔') : L('Aucune sauvegarde disponible.', 'No backup available.'), { bad: !(r && r.ok) });
    },
    lock: async () => {
      S.lock = !S.lock; store.set('lock', S.lock);
      try { const r = await S.be.setLock('video', S.lock); if (r && !r.ok && r.error && r.error !== 'missing') toast(r.error, { bad: true }); } catch (e) {}
      await reload(); render();
    },
    lang: (el) => { ST.lang = el.dataset.v; store.set('lang', ST.lang); render(); },
    bg: (el) => { store.set('bg', el.dataset.v); applyBg(); render(); },
    'bg-pick': () => $('#bgfile').click(),
  };

  function applyBg() {
    const m = store.get('bg', 'hole');
    if (m === 'image') { const d = store.get('bgdata', null); if (d) return ST.setBackground('image', d); }
    ST.setBackground(m === 'image' ? 'hole' : m);
  }

  // ---------- events
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (el && !el.disabled && act[el.dataset.act]) { e.preventDefault(); act[el.dataset.act](el); }
    const li = e.target.closest('#pl li[data-n]'); if (li) paletteRun(+li.dataset.n);
  });
  document.addEventListener('input', (e) => {
    const el = e.target, k = el.dataset && el.dataset.in; if (!k) return;
    const id = el.dataset.id;
    if (k === 'slider') { const d = ST.DEF[id]; S.draft.values[id] = String(d.fmt ? Number(el.value).toFixed(d.fmt) : Number(el.value)); $('#n-' + id).textContent = S.draft.values[id]; rerenderSoft(); }
    else if (k === 'ovnum') { S.ov[el.dataset.k] = Number(el.value); const n = $('#ovn-' + el.dataset.k); if (n) n.textContent = ['scale', 'opacity'].includes(el.dataset.k) ? Number(el.value).toFixed(2) : el.value; ovPush(); }
    else if (k === 'ovhex') { S.ov.color = el.value; ovPush(); }
    else if (k === 'lcap') { S.launch.capv = el.value; store.set('launch', S.launch); $('#launch-out').textContent = launchString(); }
    else if (k === 'lw' || k === 'lh') { S.launch[k === 'lw' ? 'w' : 'h'] = el.value; store.set('launch', S.launch); $('#launch-out').textContent = launchString(); }
    else if (k === 'lextra') { S.launch.extra = el.value; store.set('launch', S.launch); $('#launch-out').textContent = launchString(); }
    else if (id === 'newcmd') S.newCmd = el.value;
    else if (k === 'palette') { }
  });
  document.addEventListener('change', (e) => {
    const el = e.target, k = el.dataset && el.dataset.in;
    if (el.id === 'impfile' && el.files[0]) { el.files[0].text().then((t) => importCode(t, false)); el.value = ''; return; }
    if (el.id === 'bgfile' && el.files[0]) { bgFromFile(el.files[0]); el.value = ''; return; }
    if (k === 'ppA' || k === 'ppB') { S[k] = el.value; return mountPresetPreview(); }
    if (k === 'pvA' || k === 'pvB') { S[k] = el.value; return mountTabPreview(); }
    if (k === 'pvdA' || k === 'pvdB') { S.pvd[k === 'pvdA' ? 'a' : 'b'] = el.value; return mountDlgPreview(); }
    if (!k) return;
    const id = el.dataset.id, d = ST.DEF[id];
    if (k === 'slider') render();
    else if (k === 'sel') { S.draft.values[id] = el.value; render(); }
    else if (k === 'num') { const s = ST.sanitize(d, el.value); if (s !== null) S.draft.values[id] = s; render(); }
    else if (k === 'hex') { const h = el.value; S.draft.values[id] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' '); render(); }
    else if (k === 'rgb') { const p = ST.defVal(d, S.draft.values).split(/\s+/); p[+el.dataset.ch] = Math.min(255, Math.max(0, parseInt(el.value, 10) || 0)); S.draft.values[id] = p.join(' '); render(); }
    else if (k === 'lcap' || k === 'lw' || k === 'lh' || k === 'lextra') render();
  });
  function bgFromFile(f) {
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const c = document.createElement('canvas'), r = Math.min(1, 1600 / img.width); c.width = img.width * r; c.height = img.height * r;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      const data = c.toDataURL('image/jpeg', 0.82);
      if (!store.set('bgdata', data)) toast(L('Image trop lourde pour être mémorisée.', 'Image too large to store.'), { bad: true });
      store.set('bg', 'image'); applyBg(); render();
    };
    img.onerror = () => toast(L('Image illisible.', 'Unreadable image.'), { bad: true });
    img.src = url;
  }

  // key capture for binds
  const KEYMAP = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ControlLeft: 'CTRL', ControlRight: 'CTRL', AltLeft: 'ALT', AltRight: 'ALT', Tab: 'TAB', Enter: 'ENTER', Backquote: '`', CapsLock: 'CAPSLOCK', ArrowUp: 'UPARROW', ArrowDown: 'DOWNARROW', ArrowLeft: 'LEFTARROW', ArrowRight: 'RIGHTARROW', Backspace: 'BACKSPACE', Insert: 'INS', Delete: 'DEL', Home: 'HOME', End: 'END', PageUp: 'PGUP', PageDown: 'PGDN' };
  function captured(name) {
    const what = S.capturing; S.capturing = null;
    if (what === 'hud') { for (const [k, c] of Object.entries(S.draft.binds)) if (c.includes('gameui_hide')) delete S.draft.binds[k]; S.draft.binds[name.toUpperCase()] = ST.HUD_CMD; }
    else S.newKey = name.toUpperCase();
    render();
  }
  function keyName(e) {
    if (KEYMAP[e.code]) return KEYMAP[e.code];
    if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
    if (/^Digit\d$/.test(e.code)) return e.code.slice(5);
    if (/^F\d{1,2}$/.test(e.code)) return e.code;
    if (/^Numpad/.test(e.code)) return e.code.replace('Numpad', 'KP_').toUpperCase();
    return e.key && e.key.length === 1 ? e.key.toLowerCase() : null;
  }
  document.addEventListener('keydown', (e) => {
    if (S.capturing) { e.preventDefault(); if (e.code === 'Escape') { S.capturing = null; return render(); } const n = keyName(e); if (n) captured(n); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return openPalette(); }
    if (e.key === 'Escape' && !$('#modal').hidden) return closeDialog();
    if (S.palette && !$('#modal').hidden) {
      if (e.key === 'ArrowDown') { e.preventDefault(); S.palette.sel = Math.min(S.palette.res.length - 1, S.palette.sel + 1); paletteDraw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); S.palette.sel = Math.max(0, S.palette.sel - 1); paletteDraw(); }
      else if (e.key === 'Enter') { e.preventDefault(); paletteRun(S.palette.sel); }
    }
  }, true);
  document.addEventListener('input', (e) => { if (e.target.id === 'pq') { S.palette.q = e.target.value; S.palette.sel = 0; paletteDraw(); } });
  document.addEventListener('mousedown', (e) => { if (S.capturing && !e.target.closest('[data-act="cap"]')) { if (e.button >= 3) { e.preventDefault(); captured('MOUSE' + (e.button - 1)); } else if (e.button === 1) { e.preventDefault(); captured('MOUSE3'); } } }, true);
  document.addEventListener('wheel', (e) => { if (S.capturing) { e.preventDefault(); captured(e.deltaY < 0 ? 'MWHEEL_UP' : 'MWHEEL_DOWN'); } }, { passive: false, capture: true });

  const fwd = (down) => (e) => { if (S.tab !== 'overlay' || S.capturing) return; const vk = VKS[e.code]; if (vk) ovPost({ input: { t: 'K', vk, down } }); };
  document.addEventListener('keydown', fwd(true)); document.addEventListener('keyup', fwd(false));
  document.addEventListener('mousemove', (e) => { if (S.tab === 'overlay' && (e.movementX || e.movementY)) ovPost({ input: { t: 'M', dx: e.movementX, dy: e.movementY } }); });
  document.addEventListener('mousedown', (e) => { if (S.tab === 'overlay' && e.target.closest('.ovprev') && e.button < 5) ovPost({ input: { t: 'B', b: e.button === 1 ? 3 : e.button === 2 ? 2 : e.button === 0 ? 1 : e.button + 1, down: true } }); });
  document.addEventListener('wheel', (e) => { if (S.tab === 'overlay' && e.target.closest('.ovprev')) { ovPost({ input: { t: 'W', dir: e.deltaY < 0 ? 1 : -1 } }); e.preventDefault(); } }, { passive: false });
  document.addEventListener('mouseup', (e) => { if (S.tab === 'overlay' && e.button < 5) ovPost({ input: { t: 'B', b: e.button === 1 ? 3 : e.button === 2 ? 2 : e.button === 0 ? 1 : e.button + 1, down: false } }); });
  if (window.stApi && window.stApi.onOverlayState) window.stApi.onOverlayState((c) => { if (c) { S.ov.on = !!c.on; store.set('overlay', S.ov); if (S.tab === 'overlay') render(); } });

  // ---------- boot
  (async function boot() {
    try { await reload(); } catch (e) { toast(String(e.message || e), { bad: true }); }
    try { S.code = await ST.encodeCode(ST.buildPayload(ST.presetToState(ST.PRESETS[0]).values, {}), false); } catch (e) { S.code = ''; }
    applyBg(); render();
    refreshGameInfo();
    if (ST.hub) ST.hub.load();
    if (S.ov.on && window.stApi && window.stApi.overlaySet) window.stApi.overlaySet(S.ov);
    ST.S = S; // handy for debugging
  })();
})();

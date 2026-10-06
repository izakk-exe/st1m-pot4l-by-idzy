/* ST1M POT4L — Movement Lab: technique catalogue, learning path, legends, quiz, news.
 * Technique index (names / difficulty / links) comes from the Apex Movement Wiki catalog; every entry links back to it. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = () => ST.ui;
  const L = (fr, en) => ST.L(fr, en);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ------------------------------------------------------------------ data
  const cat = ST.CATALOG_ROWS.map((r) => ({ id: r[0], n: r[1], d: r[2], fam: r[3], legend: r[4], group: r[5], u: r[6] }));
  const byId = Object.fromEntries(cat.map((t) => [t.id, t]));
  const byName = {}; cat.forEach((t) => { if (!byName[t.n.toLowerCase()]) byName[t.n.toLowerCase()] = t; });
  ST.CATALOG = cat; ST.techById = byId;

  const DIFFS = ['basic', 'easy', 'medium', 'hard', 'master', 'concept', 'mystery', 'removed'];
  const DIFF_L = { basic: ['Basique', 'Basic'], easy: ['Facile', 'Easy'], medium: ['Moyen', 'Medium'], hard: ['Difficile', 'Hard'], master: ['Maître', 'Master'], concept: ['Notion', 'Concept'], mystery: ['Mystère', 'Mystery'], removed: ['Retirée', 'Removed'] };
  const FAMS = [['all', 'Tout', 'All'], ['general', 'Général', 'General'], ['legend', 'Légendes', 'Legends'], ['map', 'Cartes', 'Maps'], ['other', 'Mystères & retirées', 'Mysteries & removed']];
  const FAM_L = { general: ['Général', 'General'], legend: ['Légende', 'Legend'], map: ['Carte', 'Map'], other: ['Autre', 'Other'] };
  const H = { q: '', fam: 'all', diff: [], stat: 'all', prog: 'all', legend: '', techId: null, legTab: 'cards', quiz: { i: 0, a: [] }, trTab: 'superglide' };
  ST.H = H;
  const dl = (d) => DIFF_L[d][ST.lang === 'fr' ? 0 : 1];

  // ------------------------------------------------------------------ progress
  const prog = () => U().store.get('prog', {});
  const setProg = (id, v) => { const p = prog(); if (v) p[id] = v; else delete p[id]; U().store.set('prog', p); };
  const PROG_L = [['Non vu', 'Not seen'], ['En cours', 'Learning'], ['Maîtrisée', 'Mastered']];
  function xpOf() {
    const p = prog(); let xp = 0;
    for (const [id, v] of Object.entries(p)) { const t = byId[id]; if (t) xp += (ST.XP[t.d] || 0) * (v === 2 ? 1 : v === 1 ? 0.25 : 0); }
    return Math.round(xp);
  }
  function levelOf(xp) {
    let i = 0; for (let k = 0; k < ST.LEVELS.length; k++) if (xp >= ST.LEVELS[k][0]) i = k;
    const cur = ST.LEVELS[i], next = ST.LEVELS[i + 1];
    return { i, name: cur[ST.lang === 'fr' ? 1 : 2], base: cur[0], next: next ? next[0] : null, pct: next ? (xp - cur[0]) / (next[0] - cur[0]) : 1 };
  }
  const stageTechs = (s) => s.techs.map((n) => byName[n.toLowerCase()]).filter(Boolean);

  // ------------------------------------------------------------------ community data (statuses, videos, news) — bundled + optional GitHub refresh
  const OK_HOSTS = ['www.youtube.com', 'youtube.com', 'youtu.be', 'www.twitch.tv', 'clips.twitch.tv', 'apexmovement.tech', 'github.com'];
  const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && OK_HOSTS.includes(x.hostname) ? x.href : null; } catch (e) { return null; } };
  function cleanCommunity(c) {
    const out = { version: 1, updated: '', season: '', statuses: {}, videos: {}, guides: [], news: [] };
    if (!c || c.version !== 1) return out;
    const str = (s, n) => String(s == null ? '' : s).slice(0, n);
    out.updated = str(c.updated, 20); out.season = str(c.season, 12);
    for (const [id, s] of Object.entries(c.statuses || {})) if (byId[id] && s && ['ok', 'patched', 'broken'].includes(s.s)) out.statuses[id] = { s: s.s, season: str(s.season, 12), note: str(s.note, 200) };
    for (const [id, arr] of Object.entries(c.videos || {})) if (byId[id] && Array.isArray(arr)) out.videos[id] = arr.slice(0, 12).map((v) => ({ t: str(v.t, 90), u: safeUrl(v.u), by: str(v.by, 30) })).filter((v) => v.u && v.t);
    out.guides = (c.guides || []).slice(0, 30).map((v) => ({ t: str(v.t, 120), u: safeUrl(v.u), by: str(v.by, 30) })).filter((v) => v.u && v.t);
    out.news = (c.news || []).slice(0, 40).map((n) => ({ d: str(n.d, 12), t: str(n.t, 100), b: str(n.b, 500), u: n.u ? safeUrl(n.u) : null })).filter((n) => n.t);
    return out;
  }
  let community = cleanCommunity({ version: 1 });
  ST.communityInfo = () => community;
  async function loadCommunity() {
    try {
      let bundled = null;
      if (window.stApi && window.stApi.hubBundled) bundled = await window.stApi.hubBundled();
      else bundled = await (await fetch('data/community.json', { cache: 'no-store' })).json();
      community = cleanCommunity(bundled);
    } catch (e) {}
    const cached = U().store.get('community', null);
    if (cached) { const c = cleanCommunity(cached); if ((c.updated || '') >= (community.updated || '')) community = c; }
    U().render();
  }
  async function refreshRemote(manual) {
    const repo = ST.CONFIG && ST.CONFIG.repo;
    if (!repo) { if (manual) U().toast(L('Aucun dépôt GitHub configuré (src/js/config.js).', 'No GitHub repo configured (src/js/config.js).'), { bad: true }); return; }
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/src/data/community.json`, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const c = cleanCommunity(await r.json());
      community = c; U().store.set('community', c);
      if (manual) U().toast(L('Contenu communautaire à jour ✔', 'Community content up to date ✔'));
      U().render();
    } catch (e) { if (manual) U().toast(L('Impossible de récupérer les mises à jour : ', 'Could not fetch updates: ') + e.message, { bad: true }); }
  }
  function statusOf(t) {
    const s = community.statuses[t.id];
    if (s) return s;
    if (t.d === 'removed') return { s: 'removed' };
    if (t.d === 'mystery') return { s: 'mystery' };
    return { s: 'ok', unverified: true };
  }
  const STAT_L = { ok: ['Fonctionne', 'Works'], patched: ['Corrigée', 'Patched'], broken: ['Cassée', 'Broken'], removed: ['Retirée', 'Removed'], mystery: ['Mystère', 'Mystery'] };
  function statBadge(t) {
    const s = statusOf(t), n = STAT_L[s.s][ST.lang === 'fr' ? 0 : 1];
    return `<span class="st st-${s.s}${s.unverified ? ' unv' : ''}" title="${esc(s.unverified ? L('Selon le wiki, non vérifié par la communauté', 'According to the wiki, not community-verified') : (s.note || ''))}">${esc(n)}${s.season ? ' · ' + esc(s.season) : ''}${s.unverified ? '*' : ''}</span>`;
  }

  // ------------------------------------------------------------------ personal keys
  function keysFor(action) {
    const A = ST.ACTIONS[action]; if (!A) return { keys: [], bound: false };
    const binds = U().S.cur.binds || {};
    const ks = Object.entries(binds).filter(([, c]) => A.cmds.includes(c)).map(([k]) => k);
    return ks.length ? { keys: ks, bound: true } : { keys: [A.def], bound: false };
  }
  ST.keysFor = keysFor;
  function actsOf(t) {
    const info = ST.TECH_INFO[t.id]; if (info && info.acts) return info.acts;
    const g = t.fam === 'legend' ? 'Legend' : t.group;
    for (const [re, a] of ST.GROUP_ACTS) if (re.test(g)) return a;
    return t.fam === 'legend' ? ['ability', 'jump'] : [];
  }
  function keysStrip(acts) {
    if (!acts.length) return '';
    return `<div class="keystrip">${acts.map((a) => { const k = keysFor(a), A = ST.ACTIONS[a]; return `<div class="ks"><span>${esc(A[ST.lang])}</span>${k.keys.map((x) => `<kbd class="${k.bound ? 'mine' : ''}">${esc(x)}</kbd>`).join('')}</div>`; }).join('')}</div>
      <p class="hint">${L('En doré : tes touches lues dans settings.cfg. En gris : touche par défaut (non liée / introuvable).', 'Gold: your keys read from settings.cfg. Grey: default key (not bound / not found).')}</p>`;
  }

  // ------------------------------------------------------------------ catalogue
  const title = (t, lead) => `<h1>${esc(t)}</h1><p class="lead">${lead}</p>`;
  const progDot = (t) => { const v = prog()[t.id] || 0; return `<button class="pd p${v}" data-h="cyc" data-id="${t.id}" title="${esc(PROG_L[v][ST.lang === 'fr' ? 0 : 1])}"></button>`; };
  function filtered() {
    const q = H.q.trim().toLowerCase(), p = prog();
    return cat.filter((t) => {
      if (H.fam !== 'all' && t.fam !== H.fam) return false;
      if (H.legend && t.legend !== H.legend) return false;
      if (H.diff.length && !H.diff.includes(t.d)) return false;
      if (H.stat !== 'all' && statusOf(t).s !== H.stat) return false;
      if (H.prog !== 'all' && (p[t.id] || 0) !== +H.prog) return false;
      if (q && !(t.n + ' ' + t.group + ' ' + t.legend).toLowerCase().includes(q)) return false;
      return true;
    });
  }
  function pageTechs() {
    if (H.techId && byId[H.techId]) return pageTech(byId[H.techId]);
    const list = filtered(), p = prog();
    const mastered = cat.filter((t) => p[t.id] === 2).length;
    let body = '', last = '';
    for (const t of list) {
      const key = t.fam + '|' + t.legend + '|' + t.group;
      if (key !== last) { last = key; const g = t.fam === 'legend' ? (t.legend || 'Generic') + (t.group ? ' › ' + t.group.replace(/>/g, ' › ') : '') : FAM_L[t.fam][ST.lang === 'fr' ? 0 : 1] + ' › ' + t.group.replace(/>/g, ' › '); body += `<h3 class="grp">${esc(g)}</h3>`; }
      body += `<div class="tcard"><button class="tmain" data-h="open" data-id="${t.id}"><b>${esc(t.n)}</b><span class="df df-${t.d}">${esc(dl(t.d))}</span>${ST.TECH_INFO[t.id] ? '<i class="has" title="' + esc(L('Résumé dans l\'app', 'Summary in the app')) + '">✎</i>' : ''}</button>${statBadge(t)}${progDot(t)}</div>`;
    }
    const legendOpts = ST.LEGENDS.map((l) => `<option value="${esc(l.n)}"${H.legend === l.n ? ' selected' : ''}>${esc(l.n)}</option>`).join('');
    return `<div class="page">${title(L('Catalogue des techniques', 'Technique catalogue'), L(`${cat.length} techniques classées par difficulté. Chaque fiche renvoie au guide complet du <b>Apex Movement Wiki</b>, avec tes propres touches et ta progression.`, `${cat.length} techniques sorted by difficulty. Each entry links to the full guide on the <b>Apex Movement Wiki</b>, with your own keys and progress.`))}
      <div class="card pad filters">
        <input class="inp" data-hin="q" placeholder="${esc(L('Rechercher une technique, une légende…', 'Search a technique, a legend…'))}" value="${esc(H.q)}">
        <div class="seg">${FAMS.map((f) => `<button class="${H.fam === f[0] ? 'on' : ''}" data-h="fam" data-v="${f[0]}">${L(f[1], f[2])}</button>`).join('')}</div>
        ${H.fam === 'legend' ? `<select class="inp" data-hin="legend"><option value="">${L('Toutes les légendes', 'All legends')}</option>${legendOpts}</select>` : ''}
        <div class="chips2">${['basic', 'easy', 'medium', 'hard', 'master', 'concept'].map((d) => `<button class="df df-${d} ${H.diff.includes(d) ? 'on' : ''}" data-h="diff" data-v="${d}">${esc(dl(d))}</button>`).join('')}</div>
        <div class="row-btns"><select class="inp" data-hin="stat">${[['all', 'Tous les statuts', 'All statuses'], ['ok', 'Fonctionne', 'Works'], ['patched', 'Corrigées', 'Patched'], ['broken', 'Cassées', 'Broken'], ['removed', 'Retirées', 'Removed']].map((o) => `<option value="${o[0]}"${H.stat === o[0] ? ' selected' : ''}>${L(o[1], o[2])}</option>`).join('')}</select>
          <select class="inp" data-hin="prog">${[['all', 'Toute progression', 'Any progress'], ['0', 'Non vues', 'Not seen'], ['1', 'En cours', 'Learning'], ['2', 'Maîtrisées', 'Mastered']].map((o) => `<option value="${o[0]}"${H.prog === o[0] ? ' selected' : ''}>${L(o[1], o[2])}</option>`).join('')}</select>
          <button class="btn sm" data-h="reset">${L('Réinitialiser', 'Reset')}</button><span class="pill"><i></i>${list.length} ${L('résultats', 'results')} · ${mastered} ${L('maîtrisées', 'mastered')}</span></div>
      </div>
      <div class="tlist">${body || `<p class="lead">${L('Aucune technique ne correspond.', 'No technique matches.')}</p>`}</div>
      <p class="hint">* ${L('Statut selon le wiki, pas encore vérifié par la communauté. Propose une mise à jour dans <code>src/data/community.json</code>.', 'Status according to the wiki, not yet community-verified. Propose an update in <code>src/data/community.json</code>.')}</p></div>`;
  }

  function pageTech(t) {
    const info = ST.TECH_INFO[t.id], p = prog()[t.id] || 0, acts = actsOf(t);
    const pre = (info && info.pre ? info.pre : []).map((id) => byId[id]).filter(Boolean);
    const unlocks = Object.entries(ST.TECH_INFO).filter(([, v]) => v.pre && v.pre.includes(t.id)).map(([id]) => byId[id]).filter(Boolean);
    const vids = community.videos[t.id] || [];
    const st = statusOf(t);
    const famName = t.fam === 'legend' ? (t.legend || 'Generic') : FAM_L[t.fam][ST.lang === 'fr' ? 0 : 1];
    return `<div class="page"><button class="btn sm" data-h="back">← ${L('Catalogue', 'Catalogue')}</button>
      <h1 style="margin-top:14px">${esc(t.n)}</h1>
      <div class="row-btns" style="margin:6px 0 16px"><span class="df df-${t.d} on">${esc(dl(t.d))}</span>${statBadge(t)}<span class="tag">${esc(famName)}${t.group ? ' › ' + esc(t.group.replace(/>/g, ' › ')) : ''}</span></div>
      <div class="two">
        <div class="card pad"><span class="lbl">${L('RÉSUMÉ', 'SUMMARY')}</span>
          <p class="lead" style="margin:0">${info ? esc(info[ST.lang]) : L('Pas encore de résumé dans l\'app pour cette technique : ouvre le guide complet du wiki (inputs, vidéos, conseils).', 'No in-app summary for this technique yet: open the full wiki guide (inputs, videos, tips).')}</p>
          ${st.note ? `<p class="hint">${esc(st.note)}</p>` : ''}
          <div class="row-btns" style="margin-top:14px"><a class="btn gold" href="${ST.WIKI}${t.u}" target="_blank" rel="noopener noreferrer">${L('Guide complet sur le wiki ↗', 'Full guide on the wiki ↗')}</a>
            ${info && info.trainer ? `<button class="btn" data-h="train" data-v="${info.trainer}">🎯 ${L('S\'entraîner', 'Train')}</button>` : ''}
            ${info && info.pack ? `<button class="btn" data-h="pack" data-v="${info.pack}">⌨ ${L('Binds en 1 clic', 'Binds in 1 click')}</button>` : ''}</div></div>
        <div class="card pad"><span class="lbl">${L('MA PROGRESSION', 'MY PROGRESS')}</span>
          <div class="seg">${PROG_L.map((n, i) => `<button class="${p === i ? 'on' : ''}" data-h="setp" data-id="${t.id}" data-v="${i}">${esc(n[ST.lang === 'fr' ? 0 : 1])}</button>`).join('')}</div>
          <p class="hint">${(ST.XP[t.d] || 0)} XP ${L('à la maîtrise', 'when mastered')}</p>
          ${pre.length ? `<span class="lbl">${L('À MAÎTRISER D\'ABORD', 'LEARN FIRST')}</span><div class="chips2">${pre.map((x) => `<button class="df df-${x.d}" data-h="open" data-id="${x.id}">${esc(x.n)}</button>`).join('')}</div>` : ''}
          ${unlocks.length ? `<span class="lbl">${L('DÉBLOQUE', 'UNLOCKS')}</span><div class="chips2">${unlocks.map((x) => `<button class="df df-${x.d}" data-h="open" data-id="${x.id}">${esc(x.n)}</button>`).join('')}</div>` : ''}</div>
      </div>
      ${acts.length ? `<h2>${L('Tes touches pour cette technique', 'Your keys for this technique')}</h2><div class="card pad">${keysStrip(acts)}</div>` : ''}
      <h2>${L('Vidéos de la communauté', 'Community videos')}</h2>
      <div class="card pad">${vids.length ? vids.map((v) => `<div class="vid"><a href="${esc(v.u)}" target="_blank" rel="noopener noreferrer">▶ ${esc(v.t)}</a><span class="tag">${esc(v.by)}</span></div>`).join('') : `<p class="lead" style="margin:0">${L('Aucune vidéo proposée pour le moment. Le wiki contient des démonstrations vidéo sur chaque page. Tu en as une ? Ajoute-la dans <code>src/data/community.json</code> (voir CONTRIBUTING.md).', 'No video suggested yet. The wiki has video demos on each page. Got one? Add it to <code>src/data/community.json</code> (see CONTRIBUTING.md).')}</p>`}</div></div>`;
  }

  // ------------------------------------------------------------------ learning path
  function badges() {
    const p = prog(), done = (s) => { const ts = stageTechs(s); return ts.length > 0 && ts.every((t) => p[t.id] === 2); };
    const mastered = cat.filter((t) => p[t.id] === 2).length;
    const sg = U().store.get('sg_hist', []).length;
    const list = [['first', 'Premier pas', 'First step', 'Maîtriser une technique', 'Master one technique', mastered >= 1]];
    ST.STAGES.forEach((s, i) => list.push(['st' + i, s.fr[0], s.en[0], 'Valider toute l\'étape', 'Complete the whole stage', done(s)]));
    list.push(['glide', 'Glisseur', 'Glider', 'Maîtriser le superglide', 'Master the superglide', p.superglide === 2]);
    list.push(['trained', 'Assidu', 'Dedicated', '20 tentatives au Superglide Trainer', '20 Superglide Trainer attempts', sg >= 20]);
    return list;
  }
  function pagePath() {
    const xp = xpOf(), lv = levelOf(xp), p = prog();
    const bs = badges();
    return `<div class="page">${title(L('Parcours de progression', 'Learning path'), L('Six étapes, des bases aux techniques de maître. Marque tes techniques « en cours » puis « maîtrisées » pour gagner de l\'XP.', 'Six stages, from the basics to master techniques. Mark techniques “learning” then “mastered” to earn XP.'))}
      <div class="card pad"><div class="xpt"><b>${esc(lv.name)}</b><span>${xp} XP${lv.next ? ' / ' + lv.next : ''}</span></div><div class="bar"><i style="width:${Math.round(lv.pct * 100)}%"></i></div>
        <div class="chips2" style="margin-top:14px">${bs.map((b) => `<span class="badge${b[5] ? ' got' : ''}" title="${esc(L(b[3], b[4]))}">${b[5] ? '★' : '☆'} ${esc(L(b[1], b[2]))}</span>`).join('')}</div></div>
      ${ST.STAGES.map((s, i) => {
        const ts = stageTechs(s), m = ts.filter((t) => p[t.id] === 2).length, pct = ts.length ? Math.round((m / ts.length) * 100) : 0;
        return `<h2>${i + 1}. ${esc(s[ST.lang][0])} <span class="tag">${m}/${ts.length}</span></h2><div class="card pad"><p class="lead" style="margin:0 0 12px">${esc(s[ST.lang][1])}</p><div class="bar"><i style="width:${pct}%"></i></div>
          <div class="chips2" style="margin-top:14px">${ts.map((t) => `<span class="tchip"><button class="df df-${t.d}" data-h="open" data-id="${t.id}">${esc(t.n)}</button>${progDot(t)}</span>`).join('')}</div></div>`;
      }).join('')}</div>`;
  }

  // ------------------------------------------------------------------ legends + quiz
  const dots = (n) => (n == null ? '<span class="tag">?</span>' : '<span class="mob">' + [1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('') + '</span>');
  const TAG_L = { rush: ['Rush', 'Rush'], flank: ['Flanc', 'Flank'], zone: ['Zone', 'Zone'], support: ['Soutien', 'Support'], vertical: ['Vertical', 'Vertical'], ground: ['Sol', 'Ground'], teleport: ['Téléport', 'Teleport'], walls: ['Murs', 'Walls'], easy: ['Accessible', 'Easy'], medium: ['Moyen', 'Medium'], hard: ['Technique', 'Technical'] };
  function legendCard(l) {
    const n = cat.filter((t) => t.legend === l.n).length;
    return `<div class="lcard"><div class="lh"><b>${esc(l.n)}</b>${dots(l.mob)}</div><p>${esc(l[ST.lang])}</p><div class="chips2">${l.tags.map((t) => `<span class="tag">${esc(TAG_L[t][ST.lang === 'fr' ? 0 : 1])}</span>`).join('')}</div>
      <button class="btn sm" data-h="legtech" data-v="${esc(l.n)}"${n ? '' : ' disabled'}>${n} ${L('techniques', 'techniques')} →</button></div>`;
  }
  function quizResult() {
    const tags = {}, mobs = [];
    H.quiz.a.forEach((a, qi) => { const o = ST.QUIZ[qi].a[a]; (o.tags || []).forEach((t) => (tags[t] = (tags[t] || 0) + (o.w || 1))); if (o.mob) mobs.push(o.mob); });
    const want = mobs.length ? mobs[0] : null;
    const res = ST.LEGENDS.filter((l) => l.tags.length).map((l) => {
      let s = 0; const why = [];
      l.tags.forEach((t) => { if (tags[t]) { s += tags[t]; why.push(TAG_L[t][ST.lang === 'fr' ? 0 : 1]); } });
      if (want != null && l.mob != null) s += 3 - Math.abs(want - l.mob) * 1.2;
      return { l, s, why };
    }).sort((a, b) => b.s - a.s).slice(0, 3);
    return `<div class="grid">${res.map((r, i) => `<div class="lcard${i === 0 ? ' top' : ''}"><div class="lh"><b>${i + 1}. ${esc(r.l.n)}</b>${dots(r.l.mob)}</div><p>${esc(r.l[ST.lang])}</p><div class="chips2">${r.why.map((w) => `<span class="tag">${esc(w)}</span>`).join('')}</div></div>`).join('')}</div>
      <div class="row-btns" style="margin-top:14px"><button class="btn" data-h="qreset">${L('Refaire le quiz', 'Retake the quiz')}</button></div>`;
  }
  function pageLegends() {
    const q = H.quiz, done = q.i >= ST.QUIZ.length;
    let body;
    if (H.legTab === 'quiz') {
      body = done ? `<h2>${L('Tes légendes idéales', 'Your ideal legends')}</h2>${quizResult()}` : `<div class="card pad"><span class="lbl">${L('QUESTION', 'QUESTION')} ${q.i + 1}/${ST.QUIZ.length}</span><h3 style="margin:6px 0 14px">${esc(ST.QUIZ[q.i][ST.lang])}</h3>
        <div class="grid">${ST.QUIZ[q.i].a.map((a, i) => `<button class="tile" data-h="qans" data-v="${i}"><b>${esc(a[ST.lang])}</b></button>`).join('')}</div></div>`;
    } else body = `<div class="grid lg">${ST.LEGENDS.map(legendCard).join('')}</div><p class="hint">${L('Notes de mobilité (1 à 5) = avis personnel de l\'équipe ST1M, pas des données officielles.', 'Mobility ratings (1–5) are the ST1M team\'s personal take, not official data.')}</p>`;
    return `<div class="page">${title(L('Légendes & mouvement', 'Legends & movement'), L('Quelles légendes bougent le mieux, et laquelle te correspond ?', 'Which legends move best, and which one suits you?'))}
      <div class="seg" style="margin-bottom:16px"><button class="${H.legTab === 'cards' ? 'on' : ''}" data-h="legtab" data-v="cards">${L('Fiches', 'Legends')}</button><button class="${H.legTab === 'quiz' ? 'on' : ''}" data-h="legtab" data-v="quiz">${L('Quiz « ma légende »', 'Quiz “my legend”')}</button></div>${body}</div>`;
  }

  // ------------------------------------------------------------------ news / updates
  function pageNews() {
    const c = community, repo = ST.CONFIG && ST.CONFIG.repo;
    const upd = window.stApi && window.stApi.updateCheck;
    return `<div class="page">${title(L('Actus & mises à jour', 'News & updates'), L('Nouveautés de ST1M POT4L et de la communauté.', 'News from ST1M POT4L and the community.'))}
      <div class="card pad"><div class="set" style="border:0;padding:0"><div><h4>ST1M POT4L v${esc(ST.VERSION || '')}</h4><p>${L('Contenu communautaire du', 'Community content from')} ${esc(c.updated || '—')}${c.season ? ' · ' + L('saison', 'season') + ' ' + esc(c.season) : ''}</p></div>
        <div class="ctl"><button class="btn sm" data-h="refresh">${L('Actualiser le contenu', 'Refresh content')}</button><button class="btn sm gold" data-h="update"${upd ? '' : ' disabled'}>${L('Vérifier les mises à jour', 'Check for updates')}</button></div></div>
        ${repo ? '' : `<p class="hint" style="margin-top:10px">${L('Dépôt GitHub non configuré : renseigne-le dans <code>src/js/config.js</code> pour activer les mises à jour et l\'actualisation en ligne.', 'GitHub repo not configured: set it in <code>src/js/config.js</code> to enable updates and online refresh.')}</p>`}
        <div id="upd-status" class="hint"></div></div>
      <h2>${L('Actus', 'News')}</h2>${c.news.length ? c.news.map((n) => `<div class="card pad news"><span class="tag">${esc(n.d)}</span><h3>${esc(n.t)}</h3><p>${esc(n.b)}</p>${n.u ? `<a href="${esc(n.u)}" target="_blank" rel="noopener noreferrer">${L('En savoir plus ↗', 'Read more ↗')}</a>` : ''}</div>`).join('') : `<p class="lead">${L('Rien pour le moment.', 'Nothing yet.')}</p>`}
      <h2>${L('Guides & liens', 'Guides & links')}</h2><div class="card pad">${c.guides.map((v) => `<div class="vid"><a href="${esc(v.u)}" target="_blank" rel="noopener noreferrer">↗ ${esc(v.t)}</a><span class="tag">${esc(v.by)}</span></div>`).join('') || '—'}</div>
      <h2>${L('Contribuer', 'Contribute')}</h2><div class="card pad"><p class="lead" style="margin:0">${L('Statuts par saison, vidéos et actus se mettent à jour via <code>src/data/community.json</code> dans le dépôt GitHub (pull request). Voir CONTRIBUTING.md.', 'Per-season statuses, videos and news are updated through <code>src/data/community.json</code> in the GitHub repo (pull request). See CONTRIBUTING.md.')}</p></div>
      <p class="hint">${L('Index des techniques : Apex Movement Wiki (apexmovement.tech). Projet communautaire non affilié à EA/Respawn.', 'Technique index: Apex Movement Wiki (apexmovement.tech). Community project, not affiliated with EA/Respawn.')}</p></div>`;
  }

  // ------------------------------------------------------------------ actions
  const A = {
    open: (el) => { H.techId = el.dataset.id; U().S.tab = 'techs'; U().render(); document.getElementById('view').scrollTop = 0; },
    back: () => { H.techId = null; U().render(); },
    fam: (el) => { H.fam = el.dataset.v; if (H.fam !== 'legend') H.legend = ''; U().render(); },
    diff: (el) => { const d = el.dataset.v, i = H.diff.indexOf(d); if (i >= 0) H.diff.splice(i, 1); else H.diff.push(d); U().render(); },
    reset: () => { Object.assign(H, { q: '', fam: 'all', diff: [], stat: 'all', prog: 'all', legend: '' }); U().render(); },
    cyc: (el) => { const id = el.dataset.id, v = ((prog()[id] || 0) + 1) % 3; setProg(id, v); U().render(); },
    setp: (el) => { setProg(el.dataset.id, +el.dataset.v); U().render(); },
    legtab: (el) => { H.legTab = el.dataset.v; U().render(); },
    legtech: (el) => { Object.assign(H, { fam: 'legend', legend: el.dataset.v, techId: null }); U().S.tab = 'techs'; U().render(); },
    qans: (el) => { H.quiz.a.push(+el.dataset.v); H.quiz.i++; U().render(); },
    qreset: () => { H.quiz = { i: 0, a: [] }; U().render(); },
    train: (el) => { H.trTab = el.dataset.v === 'wheel' ? 'wheel' : 'superglide'; U().S.tab = 'training'; U().render(); },
    pack: (el) => { if (ST.packs) ST.packs.apply(el.dataset.v); },
    refresh: () => refreshRemote(true),
    update: async () => {
      const el = document.getElementById('upd-status'); if (el) el.textContent = L('Vérification…', 'Checking…');
      try { const r = await window.stApi.updateCheck(); if (el) el.textContent = r.message || ''; } catch (e) { if (el) el.textContent = String(e.message || e); }
    },
  };
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-h]'); if (el && !el.disabled && A[el.dataset.h]) { e.preventDefault(); A[el.dataset.h](el); } });
  document.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.hin; if (!k) return;
    if (k === 'q') { H.q = e.target.value; const pos = e.target.selectionStart; U().render(); const n = document.querySelector('[data-hin="q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  });
  document.addEventListener('change', (e) => {
    const k = e.target.dataset && e.target.dataset.hin; if (!k || k === 'q') return;
    H[k] = e.target.value; U().render();
  });

  ST.hub = {
    pages: { techs: pageTechs, path: pagePath, legends: pageLegends, news: pageNews },
    stats: () => ({ xp: xpOf(), level: levelOf(xpOf()), mastered: cat.filter((t) => prog()[t.id] === 2).length, total: cat.length }),
    load: () => { loadCommunity().then(() => refreshRemote(false)); },
  };
})();

/* ST1M PORT4L by idZy — Competition: personal Apex stats, Top Predator threshold + rivals ladder,
 * pro profiles and stretched resolution (no black bars).
 * Stats come from the Apex Legends Status API (https://apexlegendsapi.com/) with the player's OWN free API key,
 * requested by the Windows app's main process. The key is stored encrypted (Electron safeStorage) and never
 * leaves the app except in the Authorization header sent to that API. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = () => ST.ui;
  const L = (fr, en) => ST.L(fr, en);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = () => window.stApi;
  const isApp = () => !!(api() && api().playerFetch);
  const PLATS = [['PC', 'PC'], ['PS4', 'PlayStation'], ['X1', 'Xbox'], ['SWITCH', 'Switch']];
  const KEY_URL = 'https://apexlegendsapi.com/';
  const fmt = (n) => (Number.isFinite(+n) ? Math.round(+n).toLocaleString(ST.lang === 'fr' ? 'fr-FR' : 'en-US') : '—');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const st = (k, d) => U().store.get(k, d);
  const save = (k, v) => U().store.set(k, v);

  const P = {
    hasKey: null, busy: false, msg: '', name: '', plat: 'PC', loaded: false,
    me: st('me_cache', null), pred: st('pred_cache', null), rivals: st('rivals', []),
    predManual: st('pred_manual', {}), nameIn: '', rivIn: '', rivPlat: 'PC',
    disp: null, dispBusy: false, dispActive: false, sel: st('stretch_sel', { w: 1440, h: 1080 }), testRes: {},
  };
  const who = st('player', null); if (who) { P.name = who.name || ''; P.plat = who.plat || 'PC'; }
  P.nameIn = P.name;

  const errText = (r) => {
    const e = (r && r.error) || '';
    if (e === 'no-key') return L('Ajoute d\'abord ta clé API gratuite.', 'Add your free API key first.');
    if (e === 'bad-player') return L('Pseudo ou plateforme invalide.', 'Invalid name or platform.');
    if (e === 'http-401' || e === 'http-403') return L('Clé API refusée (ou accès non autorisé à cette donnée).', 'API key rejected (or no access to this data).');
    if (e === 'http-429') return L('Refus de l\'API (429)', 'API refusal (429)') + (r.message ? ' : ' + r.message : L(' — limite de requêtes atteinte ou clé non activée.', ' — rate limit reached or key not activated.'));
    if (e === 'network') return L('Pas de connexion à l\'API.', 'Could not reach the API.');
    if (r && r.message) return r.message;
    return L('Erreur de l\'API', 'API error') + (e ? ' (' + e + ')' : '');
  };

  // ------------------------------------------------------------------ parsing (defensive: the API shape is not formally documented)
  function parseBridge(d) {
    const g = (d && d.global) || {}, rk = g.rank || {};
    const totals = [];
    const tot = (d && d.total) || {};
    if (tot && typeof tot === 'object') for (const k of Object.keys(tot)) {
      const o = tot[k]; const v = o && typeof o === 'object' ? o.value : o;
      if (typeof v === 'number' && Number.isFinite(v)) totals.push([(o && o.name) || k, v]);
    }
    return {
      name: String(g.name || ''), platform: String(g.platform || ''), level: Number(g.level) || 0,
      rp: Number.isFinite(+rk.rankScore) ? +rk.rankScore : null, rankName: String(rk.rankName || ''), rankDiv: rk.rankDiv, ladder: Number(rk.ladderPosPlatform) > 0 ? Number(rk.ladderPosPlatform) : null,
      legend: String(((d && d.legends && d.legends.selected && d.legends.selected.LegendName) || '')), totals: totals.slice(0, 12), t: Date.now(),
    };
  }
  function parsePred(d) {
    const rp = d && (d.RP || d.rp); if (!rp || typeof rp !== 'object') return null;
    const out = { t: Date.now(), RP: {} };
    for (const [p] of PLATS) { const o = rp[p]; if (o && Number.isFinite(+o.val)) out.RP[p] = { val: +o.val, masters: Number.isFinite(+o.totalMastersAndPreds) ? +o.totalMastersAndPreds : null }; }
    return Object.keys(out.RP).length ? out : null;
  }
  const threshold = (plat) => {
    const live = P.pred && P.pred.RP && P.pred.RP[plat];
    if (live) return { val: live.val, masters: live.masters, src: 'live', t: P.pred.t };
    const m = Number(P.predManual[plat]); return m > 0 ? { val: m, masters: null, src: 'manual' } : null;
  };
  const isPred = (m) => /predator/i.test(m.rankName || '');

  function pushHist(m) {
    if (m.rp === null) return;
    const h = st('phist', {}), k = m.platform + ':' + m.name.toLowerCase(), a = h[k] || [], last = a[a.length - 1];
    if (!last || last.rp !== m.rp || Date.now() - last.t > 3600e3) a.push({ t: m.t, rp: m.rp });
    h[k] = a.slice(-200); save('phist', h);
  }
  const histOf = (m) => (st('phist', {})[m.platform + ':' + m.name.toLowerCase()] || []);

  // ------------------------------------------------------------------ data actions
  async function refreshKey() { try { P.hasKey = await api().playerHasKey(); } catch (_) { P.hasKey = false; } }
  async function loadPred(silent) {
    const r = await api().playerFetch('predator', {});
    if (r.ok) { const p = parsePred(r.data); if (p) { P.pred = p; save('pred_cache', p); return true; } if (!silent) U().toast(L('Réponse inattendue de l\'API (seuil Predator).', 'Unexpected API response (Predator threshold).'), { bad: true }); return false; }
    if (!silent) U().toast(errText(r) + ' ' + L('Tu peux saisir le seuil à la main.', 'You can enter the threshold manually.'), { bad: true });
    return false;
  }
  async function fetchPlayer(name, plat) {
    const r = await api().playerFetch('bridge', { player: name, platform: plat });
    if (!r.ok) return { err: errText(r) };
    const m = parseBridge(r.data);
    if (!m.name) m.name = name;
    if (!m.platform) m.platform = plat;
    return { m };
  }
  async function loadMe() {
    const name = (P.nameIn || '').trim();
    if (!name) return U().toast(L('Entre ton pseudo.', 'Enter your name.'), { bad: true });
    P.busy = true; P.msg = ''; U().render();
    const r = await fetchPlayer(name, P.plat);
    P.busy = false;
    if (r.err) { P.msg = r.err; return U().render(); }
    P.name = name; save('player', { name, plat: P.plat });
    P.me = r.m; save('me_cache', r.m); pushHist(r.m);
    if (P.hasKey) await loadPred(true);
    U().render();
  }
  async function refreshAll() {
    P.busy = true; P.msg = ''; U().render();
    let fail = 0;
    if (P.name) { const r = await fetchPlayer(P.name, P.plat); if (r.m) { P.me = r.m; save('me_cache', r.m); pushHist(r.m); } else fail++; await sleep(350); }
    for (const rv of P.rivals) { const r = await fetchPlayer(rv.name, rv.platform); if (r.m) Object.assign(rv, { rp: r.m.rp, rankName: r.m.rankName, level: r.m.level, t: r.m.t, err: '' }); else { rv.err = r.err; fail++; } await sleep(350); }
    save('rivals', P.rivals);
    await loadPred(true);
    P.busy = false; if (fail) P.msg = L(`${fail} joueur(s) non actualisé(s).`, `${fail} player(s) could not be refreshed.`);
    U().render();
  }
  async function addRival() {
    const name = (P.rivIn || '').trim();
    if (!name) return;
    if (P.rivals.length >= 30) return U().toast(L('30 joueurs maximum.', '30 players maximum.'), { bad: true });
    if (P.rivals.some((x) => x.name.toLowerCase() === name.toLowerCase() && x.platform === P.rivPlat)) return U().toast(L('Déjà dans la liste.', 'Already in the list.'), { bad: true });
    P.busy = true; U().render();
    const r = await fetchPlayer(name, P.rivPlat);
    P.busy = false;
    if (r.err) { P.msg = r.err; return U().render(); }
    P.rivals.push({ name: r.m.name, platform: P.rivPlat, rp: r.m.rp, rankName: r.m.rankName, level: r.m.level, t: r.m.t });
    save('rivals', P.rivals); P.rivIn = ''; P.msg = ''; U().render();
  }

  // ------------------------------------------------------------------ UI pieces
  const head = (t, lead) => `<h1>${esc(t)}</h1><p class="lead">${lead}</p>`;
  const bar = (pct, gold) => `<div style="height:10px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;border:1px solid var(--line-soft)"><div style="height:100%;width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%;background:${gold ? 'linear-gradient(90deg,#b8860b,#f5c542)' : 'var(--gold)'};box-shadow:var(--glow)"></div></div>`;
  const platSeg = (cur, act) => `<div class="seg">${PLATS.map(([v, n]) => `<button class="${cur === v ? 'on' : ''}" data-p="${act}" data-v="${v}">${n}</button>`).join('')}</div>`;

  function keyCard() {
    if (!isApp()) return `<div class="note">${L('Les stats se chargent depuis l\'<b>application Windows</b> (la clé API reste chiffrée sur ton PC).', 'Stats load from the <b>Windows app</b> (the API key stays encrypted on your PC).')}</div>`;
    if (P.hasKey) return `<div class="card pad"><div class="set" style="border:0;padding:0"><div><h4>🔑 ${L('Clé API enregistrée', 'API key saved')}</h4><p>${L('Stockée chiffrée sur ce PC. Elle n\'est envoyée qu\'à l\'API Apex Legends Status.', 'Stored encrypted on this PC. It is only sent to the Apex Legends Status API.')}</p></div><div class="ctl"><button class="btn sm" data-p="key-del">${L('Retirer la clé', 'Remove key')}</button></div></div></div>`;
    return `<div class="card pad"><h4 style="margin:0 0 6px">🔑 ${L('Clé API gratuite requise', 'Free API key required')}</h4>
      <p class="lead" style="margin:0 0 12px">${L('Les stats viennent de l\'API Apex Legends Status. Crée ta clé gratuite sur', 'Stats come from the Apex Legends Status API. Create your free key at')} <a href="${KEY_URL}" target="_blank" rel="noopener noreferrer">apexlegendsapi.com</a>, ${L('puis colle-la ici. Elle est chiffrée et ne quitte jamais ton PC (hors requêtes vers cette API).', 'then paste it here. It is encrypted and never leaves your PC (apart from requests to that API).')}</p>
      <div class="row-btns"><input class="inp" id="p-key" type="password" autocomplete="off" spellcheck="false" placeholder="API key" style="min-width:260px"><button class="btn gold" data-p="key-save">${L('Enregistrer', 'Save')}</button></div></div>`;
  }

  function gauge(m) {
    const t = threshold(m.platform || P.plat);
    const manual = `<div class="row-btns" style="margin-top:10px"><label class="hint" for="p-manual">${L('Seuil Predator manuel (RP)', 'Manual Predator threshold (RP)')}</label><input class="inp" id="p-manual" data-pi="manual" data-v="${esc(m.platform || P.plat)}" inputmode="numeric" style="width:120px" value="${esc(P.predManual[m.platform || P.plat] || '')}" placeholder="ex. 25000"></div>`;
    if (m.rp === null) return `<div class="note">${L('RP indisponible pour ce joueur.', 'RP unavailable for this player.')}</div>`;
    if (isPred(m)) return `<div class="card pad" style="border-color:var(--gold)"><h3 style="margin:0">♛ ${L('Tu es Apex Predator !', 'You are Apex Predator!')}</h3><p class="lead" style="margin:6px 0 0">${fmt(m.rp)} RP${t ? ` · ${L('seuil actuel', 'current cut-off')} ${fmt(t.val)} RP (${m.rp >= t.val ? '+' + fmt(m.rp - t.val) : '−' + fmt(t.val - m.rp)})` : ''}</p></div>`;
    if (!t) return `<div class="card pad"><h4 style="margin:0">${L('Passage en Predator', 'Road to Predator')}</h4><p class="lead" style="margin:6px 0 0">${L('Seuil indisponible via l\'API (cet endpoint peut ne pas être ouvert à ta clé). Saisis-le à la main :', 'Threshold unavailable from the API (that endpoint may not be open to your key). Enter it manually:')}</p>${manual}</div>`;
    const gap = Math.max(0, t.val - m.rp);
    return `<div class="card pad"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><h4 style="margin:0">♛ ${L('Passage en Predator', 'Road to Predator')}</h4><span class="tag">${t.src === 'live' ? L('seuil en direct', 'live cut-off') : L('seuil manuel', 'manual cut-off')}</span></div>
      <div style="font-size:30px;font-weight:700;margin:10px 0 2px;color:var(--gold)">${gap > 0 ? fmt(gap) + ' RP' : L('Seuil atteint !', 'Cut-off reached!')}</div>
      <p class="lead" style="margin:0 0 10px">${gap > 0 ? L('restants pour atteindre le seuil Predator', 'left to reach the Predator cut-off') : L('Tu es au-dessus du seuil actuel : maintiens-le.', 'You are above the current cut-off: hold it.')} · ${fmt(m.rp)} / ${fmt(t.val)} RP</p>
      ${bar((m.rp / t.val) * 100, true)}${t.src === 'manual' ? manual : ''}</div>`;
  }

  function spark(hist) {
    if (hist.length < 2) return `<p class="hint">${L('L\'historique de RP se construit à chaque actualisation (ouvre l\'app régulièrement pour suivre ta progression).', 'RP history builds with every refresh (open the app regularly to track your progress).')}</p>`;
    const W = 560, H = 120, xs = hist.map((h) => h.t), ys = hist.map((h) => h.rp);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), dy = y1 - y0 || 1, dx = x1 - x0 || 1;
    const pts = hist.map((h) => `${(((h.t - x0) / dx) * (W - 20) + 10).toFixed(1)},${(H - 14 - ((h.rp - y0) / dy) * (H - 28)).toFixed(1)}`).join(' ');
    const d = ys[ys.length - 1] - ys[0];
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto" role="img" aria-label="RP"><polyline points="${pts}" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>
      <p class="hint">${hist.length} ${L('relevés', 'snapshots')} · ${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))} RP ${L('depuis le premier relevé', 'since the first snapshot')}</p>`;
  }

  // ------------------------------------------------------------------ pages: my profile
  function pageMe() {
    const m = P.me;
    const lead = L('Entre ton pseudo : l\'app récupère tes stats Apex et suit ta progression de RP au fil du temps.', 'Enter your name: the app fetches your Apex stats and tracks your RP progress over time.');
    return `<div class="page">${head(L('Mon profil Apex', 'My Apex profile'), lead)}
      ${keyCard()}
      <h2>${L('Mon compte', 'My account')}</h2>
      <div class="card pad"><div class="row-btns"><input class="inp" id="p-name" data-pi="name" maxlength="40" placeholder="${L('Pseudo en jeu (EA / Steam)', 'In-game name (EA / Steam)')}" value="${esc(P.nameIn)}" style="min-width:240px">${platSeg(P.plat, 'plat')}
        <button class="btn gold" data-p="load"${P.busy || !isApp() || !P.hasKey ? ' disabled' : ''}>${P.busy ? '…' : L('Charger mes stats', 'Load my stats')}</button></div>
        ${P.msg ? `<p class="hint" style="color:var(--bad);margin-top:10px">${esc(P.msg)}</p>` : ''}</div>
      ${m ? meBody(m) : `<div class="note" style="margin-top:14px">${L('Aucune stat pour l\'instant : ajoute ta clé puis charge ton pseudo.', 'No stats yet: add your key and load your name.')}</div>`}
      <p class="hint">${L('Données : Apex Legends Status (apexlegendsstatus.com). Projet communautaire non affilié à EA/Respawn.', 'Data: Apex Legends Status (apexlegendsstatus.com). Community project not affiliated with EA/Respawn.')}</p></div>`;
  }
  function meBody(m) {
    const cards = [[L('Rang', 'Rank'), m.rankName ? `${esc(m.rankName)}${m.rankDiv && m.rankDiv !== 0 && !isPred(m) ? ' ' + esc(m.rankDiv) : ''}` : '—'], ['RP', fmt(m.rp)], [L('Niveau', 'Level'), fmt(m.level)], [L('Classement plateforme', 'Platform ladder'), m.ladder ? '#' + fmt(m.ladder) : '—'], [L('Légende active', 'Selected legend'), esc(m.legend || '—')]];
    return `<h2>${esc(m.name)} <span class="tag">${esc(m.platform)}</span></h2>
      <div class="grid">${cards.map((c) => `<div class="card pad"><span class="hint">${c[0]}</span><div style="font-size:22px;font-weight:700;margin-top:4px">${c[1]}</div></div>`).join('')}</div>
      <div style="margin-top:14px">${gauge(m)}</div>
      <h2>${L('Progression des RP', 'RP progress')}</h2><div class="card pad">${spark(histOf(m))}</div>
      ${m.totals.length ? `<h2>${L('Stats globales', 'Lifetime stats')}</h2><div class="grid">${m.totals.map((t) => `<div class="card pad"><span class="hint">${esc(t[0])}</span><div style="font-size:20px;font-weight:700;margin-top:4px">${fmt(t[1])}</div></div>`).join('')}</div>` : ''}
      <p class="hint">${L('Dernière actualisation :', 'Last refreshed:')} ${new Date(m.t).toLocaleString(ST.lang === 'fr' ? 'fr-FR' : 'en-US')}</p>`;
  }

  // ------------------------------------------------------------------ pages: Top Predator
  function pageLadder() {
    const plat = P.me ? P.me.platform || P.plat : P.plat;
    const rows = [];
    if (P.me && P.me.rp !== null) rows.push({ name: P.me.name, platform: P.me.platform || P.plat, rp: P.me.rp, rankName: P.me.rankName, me: true });
    P.rivals.forEach((r, i) => rows.push(Object.assign({ idx: i }, r)));
    rows.sort((a, b) => (b.rp === null || b.rp === undefined ? -1 : b.rp) - (a.rp === null || a.rp === undefined ? -1 : a.rp));
    const cut = (p) => threshold(p);
    return `<div class="page">${head(L('Top Predator', 'Top Predator'), L('Le seuil pour passer Apex Predator, ta distance au seuil et un classement entre toi et tes rivaux.', 'The cut-off to reach Apex Predator, your distance to it and a ladder between you and your rivals.'))}
      ${keyCard()}
      <h2>${L('Seuils Predator (RP)', 'Predator cut-offs (RP)')}</h2>
      <div class="grid">${PLATS.map(([p, n]) => { const t = cut(p); return `<div class="card pad"><span class="hint">${n}</span><div style="font-size:24px;font-weight:700;margin-top:4px;color:var(--gold)">${t ? fmt(t.val) + ' RP' : '—'}</div><span class="hint">${t && t.masters ? fmt(t.masters) + ' ' + L('Masters + Predators', 'Masters + Predators') : t && t.src === 'manual' ? L('manuel', 'manual') : L('indisponible', 'unavailable')}</span></div>`; }).join('')}</div>
      <div class="row-btns" style="margin-top:12px"><button class="btn sm" data-p="pred"${isApp() && P.hasKey ? '' : ' disabled'}>${L('Actualiser les seuils', 'Refresh cut-offs')}</button>${P.pred ? `<span class="hint">${L('Relevé du', 'Fetched')} ${new Date(P.pred.t).toLocaleString(ST.lang === 'fr' ? 'fr-FR' : 'en-US')}</span>` : ''}</div>
      <div style="margin-top:14px">${P.me ? gauge(P.me) : `<div class="note">${L('Charge ton profil (onglet « Mon profil Apex ») pour voir ta distance au Predator.', 'Load your profile (“My Apex profile” tab) to see your distance to Predator.')}</div>`}</div>
      <h2>${L('Classement entre rivaux', 'Rivals ladder')}</h2>
      <div class="card pad"><div class="row-btns"><input class="inp" id="p-riv" data-pi="riv" maxlength="40" placeholder="${L('Pseudo d\'un ami / rival / pro', 'Friend / rival / pro name')}" value="${esc(P.rivIn)}" style="min-width:220px">${platSeg(P.rivPlat, 'rplat')}
        <button class="btn" data-p="riv-add"${P.busy || !isApp() || !P.hasKey ? ' disabled' : ''}>${L('Ajouter', 'Add')}</button><button class="btn gold" data-p="refresh-all"${P.busy || !isApp() || !P.hasKey ? ' disabled' : ''}>${P.busy ? '…' : L('Tout actualiser', 'Refresh all')}</button></div>
        ${P.msg ? `<p class="hint" style="color:var(--bad);margin-top:10px">${esc(P.msg)}</p>` : ''}
        ${rows.length ? `<div class="plist" style="margin-top:12px">${rows.map((r, i) => { const t = cut(r.platform); const gap = t && r.rp != null ? t.val - r.rp : null; return `<div class="set" style="${r.me ? 'border-color:var(--gold)' : ''}"><div><h4>#${i + 1} ${r.me ? '★ ' : ''}${esc(r.name)} <span class="tag">${esc(r.platform)}</span></h4><p>${esc(r.rankName || '')}${r.err ? ' · ' + esc(r.err) : ''}</p></div>
          <div class="ctl"><b style="font-size:18px">${r.rp != null ? fmt(r.rp) + ' RP' : '—'}</b>${gap !== null ? `<span class="tag">${gap > 0 ? fmt(gap) + ' ' + L('du Predator', 'to Pred') : '♛ ≥ Pred'}</span>` : ''}${r.me ? '' : `<button class="btn sm" data-p="riv-del" data-v="${r.idx}" title="${L('Retirer', 'Remove')}">✕</button>`}</div></div>`; }).join('')}</div>` : `<p class="hint" style="margin-top:12px">${L('Ajoute des amis, des rivaux ou des joueurs pros pour comparer vos RP.', 'Add friends, rivals or pro players to compare your RP.')}</p>`}</div>
      <p class="note" style="margin-top:14px">${L('<b>À savoir :</b> l\'API gratuite ne fournit pas le « Top 500 » mondial en RP. Le classement ci-dessus compare les joueurs que tu ajoutes ; le seuil Predator vient de l\'API (si ta clé y a accès) ou de ta saisie manuelle.', '<b>Good to know:</b> the free API does not provide a global RP “Top 500”. The ladder above compares the players you add; the Predator cut-off comes from the API (if your key has access) or from your manual entry.')}</p></div>`;
  }

  // ------------------------------------------------------------------ pages: pro profiles
  // ------------------------------------------------------------------ pro profiles: cards + "choose what to add" dialog
  const GROUPS = [
    ['res', 'Résolution & FOV', 'Resolution & FOV', true],
    ['gfx', 'Graphismes', 'Graphics', true],
    ['lat', 'Reflex & V-Sync', 'Reflex & V-Sync', true],
    ['binds', 'Touches de mouvement', 'Movement keys', false],
    ['launch', 'Options de lancement', 'Launch options', false],
    ['ret', 'Couleur du réticule', 'Reticle colour', false],
    ['reta', 'Réticule alternatif', 'Alternative reticle', false],
  ];
  const RES_KEYS = new Set(['defaultres', 'defaultresheight', 'fullscreen', 'nowindowborder']);
  const LAT_KEYS = new Set(['mat_vsync_mode', 'gfx_nvnUseLowLatency', 'gfx_nvnUseLowLatencyBoost']);
  const CMD_NAME = { '+jump': ['Saut', 'Jump'], '+duck': ['Accroupi', 'Crouch'], '+speed': ['Sprint', 'Sprint'], '+ability 1': ['Tactique', 'Tactical'], '+ability 3': ['Ultime', 'Ultimate'], '+forward': ['Avancer', 'Forward'], '+attack': ['Tir', 'Fire'], '+zoom': ['Visée', 'Aim'], '+melee': ['Mêlée', 'Melee'], '+reload': ['Recharger', 'Reload'] };
  const keyLabel = (k) => ({ LCTRL: 'L-Ctrl', LSHIFT: 'L-Shift', LALT: 'L-Alt', MWHEELUP: L('Molette ↑', 'Wheel ↑'), MWHEELDOWN: L('Molette ↓', 'Wheel ↓') })[k] || (/^MOUSE\d$/.test(k) ? 'Mouse ' + k.slice(5) : k);

  // everything a profile contains, split per group: { id: { v, x, xp, binds, items[] } }
  function proParts(p) {
    const b = ST.proBuild(p), parts = {};
    const g = (id) => (parts[id] = parts[id] || { v: {}, x: {}, xp: {}, binds: {}, items: [] });
    const fmt = (id, raw) => {
      const d = ST.DEF[id]; if (!d) return null;
      const name = d[ST.lang][0]; let val = raw;
      if (d.type === 'toggle') val = raw === d.on ? L('activé', 'on') : L('désactivé', 'off');
      else if (d.opts) { const o = d.opts.find((o) => o[0] === raw); if (o) val = ST.lang === 'fr' ? o[1] : o[2]; }
      return name + ' : ' + val;
    };
    for (const [k, val] of Object.entries(b.v)) {
      const id = RES_KEYS.has(k) ? 'res' : LAT_KEYS.has(k) ? 'lat' : 'gfx';
      g(id).v[k] = val;
      if (!RES_KEYS.has(k)) { const t = fmt(k, val); if (t) g(id).items.push(t); }
    }
    for (const [k, val] of Object.entries(b.x)) { const id = LAT_KEYS.has(k) ? 'lat' : 'gfx'; g(id).x[k] = val; const t = fmt(k, val); if (t) g(id).items.push(t); }
    for (const [k, val] of Object.entries(b.xp)) { g('res').xp[k] = val; const t = fmt(k, val); if (t) g('res').items.push(t); }
    if (p.res || b.v.fullscreen) {
      const r = g('res'), head = [];
      if (p.res) head.push(L('Résolution', 'Resolution') + ' ' + p.res[0] + '×' + p.res[1]);
      if (b.v.fullscreen === '1') head.push(L('Plein écran', 'Full screen'));
      r.items.unshift(...head);
    }
    if (p.fov) { const r = g('res'); r.fov = p.fov; r.items.splice(p.res ? 2 : 1, 0, 'FOV ' + p.fov); }
    const bk = Object.entries(b.binds);
    if (bk.length) { const t = g('binds'); t.binds = b.binds; t.items = bk.map(([k, c]) => keyLabel(k) + ' → ' + (CMD_NAME[c] ? L(...CMD_NAME[c]) : c)); }
    if (p.launch) { const t = g('launch'); t.launch = p.launch; t.items = [p.launch]; }
    if (p.reticle) { const t = g('ret'); t.reticle = p.reticle; t.items = [p.reticle]; }
    if (p.reticleAlt) { const t = g('reta'); t.reticle = p.reticleAlt; t.items = [p.reticleAlt]; }
    return { parts, skipped: b.skipped };
  }
  function proState(p, sel) {
    const { parts } = proParts(p), settings = {}, xs = {}, xp = {}, binds = {};
    let fov, reticle;
    for (const id of sel) {
      const t = parts[id]; if (!t) continue;
      Object.assign(settings, t.v); Object.assign(xs, t.x); Object.assign(xp, t.xp); Object.assign(binds, t.binds);
      if (t.fov) fov = t.fov;
      if (t.reticle && (id === 'reta' || !reticle)) reticle = t.reticle;
    }
    const s = ST.payloadToState({ v: 1, fov, reticle, settings, x: { settings: xs, profile: xp } });
    Object.assign(s.binds, binds);
    return s;
  }

  const gcdN = (a, b) => (b ? gcdN(b, a % b) : a);
  const isWide = (p) => !p.res || Math.abs(p.res[0] / p.res[1] - 16 / 9) < 0.01;
  const ratioOf = (r) => { const v = r[0] / r[1], c = [[4 / 3, '4:3'], [16 / 10, '16:10'], [16 / 9, '16:9'], [5 / 4, '5:4']].reduce((a, b) => (Math.abs(b[0] - v) < Math.abs(a[0] - v) ? b : a)); return Math.abs(c[0] - v) < 0.02 ? c[1] : (r[0] / r[1]).toFixed(2) + ':1'; };
  const KIND = { mine: ['Mon profil', 'My profile'], movement: ['Mouvement', 'Movement'], 'all-round': ['Polyvalent', 'All-round'], stretched: ['Étiré', 'Stretched'] };
  const hue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const avatar = (p, big) => `<span class="av${big ? ' lg' : ''}" style="--h:${hue(p.name)}"><b>${esc(p.name.slice(0, 2).toUpperCase())}</b>${p.photo ? `<img class="av-img" src="${esc(p.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span>`;
  const PF = { filter: 'all' };

  function pagePros() {
    const kinds = [['all', 'Tous', 'All'], ['movement', 'Mouvement', 'Movement'], ['stretched', 'Étiré', 'Stretched'], ['all-round', 'Polyvalent', 'All-round']];
    const list = ST.PROS.filter((p) => PF.filter === 'all' || p.kind === PF.filter || p.mine);
    return `<div class="page">${head(L('Profils de pros', 'Pro profiles'), L('Clique sur un joueur pour choisir ce que tu veux ajouter à ton brouillon : résolution, graphismes, touches…', 'Click a player to choose what to add to your draft: resolution, graphics, keys…'))}
      <div class="sprev-bar"><div class="seg">${kinds.map((k) => `<button class="${PF.filter === k[0] ? 'on' : ''}" data-p="pro-filter" data-v="${k[0]}">${L(k[1], k[2])}</button>`).join('')}</div><span class="hint" style="margin:0">${list.length} ${L('profils', 'profiles')}</span></div>
      <div class="pgrid">${list.map((p) => `<button class="pcard${p.mine ? ' mine' : ''}" data-p="pro-open" data-id="${p.id}">${avatar(p)}
        <span class="pc-main"><b>${esc(p.name)}</b><span class="pc-sub">${p.res ? p.res[0] + '×' + p.res[1] + ' · ' + ratioOf(p.res) : L('Résolution non indiquée', 'Resolution not listed')}</span><span class="pc-sub">FOV ${p.fov}${p.dpi ? ' · ' + p.dpi + ' DPI' : ''}${p.sens !== null && p.sens !== undefined ? ' · ' + p.sens : ''}</span></span>
        <span class="tag">${esc(L(...(KIND[p.kind] || [p.kind, p.kind])))}</span></button>`).join('')}</div>
      <div class="note" style="margin-top:18px">${L('<b>Sources :</b> pages publiques de ProSettings.net relues le 07/10/2026 (date de mise à jour sur chaque fiche), plus tes propres fichiers pour 1Z4K. Seuls les réglages que l\'app sait écrire <b>exactement</b> sont proposés ; sensibilité, DPI et matériel ne sont jamais modifiés. ImperialHal joue à la manette : il n\'est pas listé.', '<b>Sources:</b> public ProSettings.net pages re-read on 2026-10-07 (update date on each sheet), plus your own files for 1Z4K. Only settings the app can write <b>exactly</b> are offered; sensitivity, DPI and hardware are never changed. ImperialHal plays on controller: he is not listed.')}</div>
      <p class="hint">${L('Photos : ProSettings.net (chargées en ligne, remplacées par les initiales hors connexion).', 'Photos: ProSettings.net (loaded online, replaced by initials when offline).')}</p></div>`;
  }

  const PP = { id: null, sel: new Set() };
  function pmHtml() {
    const p = ST.PROS.find((x) => x.id === PP.id), { parts, skipped } = proParts(p);
    const n = [...PP.sel].filter((id) => parts[id]).length;
    const opts = GROUPS.filter((g) => parts[g[0]]).map((g) => { const t = parts[g[0]], on = PP.sel.has(g[0]); return `<label class="opt${on ? ' on' : ''}"><input type="checkbox" data-pp="${g[0]}"${on ? ' checked' : ''}><span class="box"></span><span class="otxt"><b>${L(g[1], g[2])}<i class="tag">${t.items.length}</i></b><small>${esc(t.items.slice(0, 6).join(' · '))}${t.items.length > 6 ? ' …' : ''}</small></span></label>`; }).join('');
    return `<div class="pm-head">${avatar(p, true)}<div><h3>${esc(p.name)}</h3><div class="hint" style="margin:2px 0 0">${p.res ? p.res[0] + '×' + p.res[1] + ' · ' + ratioOf(p.res) + ' · ' : ''}FOV ${p.fov}${p.old ? ' · ' + L('données de 2023', '2023 data') : ''}</div></div></div>
      <p class="lead" style="margin:14px 0 10px">${L('Coche ce que tu veux ajouter à ton brouillon. Tu vérifies ensuite avant d\'appliquer.', 'Tick what you want to add to your draft. You review before applying.')}</p>
      <div class="opts">${opts}</div>
      ${skipped.length ? `<details class="hint" style="margin-top:12px"><summary>${L('Non proposé (non géré par l\'app)', 'Not offered (unsupported by the app)')} · ${skipped.length}</summary><p style="margin:6px 0 0">${esc(skipped.join(' · '))}</p></details>` : ''}
      <p class="hint" style="margin-top:12px">${p.src ? `<a href="${esc(p.src)}" target="_blank" rel="noopener noreferrer">↗ ProSettings.net</a>` : esc(p.srcLabel || '')} · ${esc(p.upd)}</p>
      <div class="foot"><button class="btn sm" data-p="pm-all">${L('Tout', 'All')}</button><button class="btn sm" data-p="pm-none">${L('Rien', 'None')}</button><span class="spacer"></span>${isWide(p) ? '' : `<button class="btn" data-p="pro-stretch" data-id="${p.id}">${L('Voir en étiré', 'See stretched')}</button>`}<button class="btn" data-act="close">${L('Annuler', 'Cancel')}</button><button class="btn gold" id="pm-add" data-p="pm-add"${n ? '' : ' disabled'}>${L('Ajouter', 'Add')} (${n})</button></div>`;
  }
  function openPro(id) {
    const p = ST.PROS.find((x) => x.id === id); if (!p) return;
    const { parts } = proParts(p), saved = st('pro_sel', null);
    PP.id = id; PP.sel = new Set(GROUPS.filter((g) => parts[g[0]] && (saved ? saved.includes(g[0]) : g[3])).map((g) => g[0]));
    U().dialog(pmHtml());
  }
  function pmRefresh() {
    const { parts } = proParts(ST.PROS.find((x) => x.id === PP.id)), n = [...PP.sel].filter((id) => parts[id]).length, b = document.getElementById('pm-add');
    if (b) { b.textContent = L('Ajouter', 'Add') + ' (' + n + ')'; b.disabled = !n; }
    document.querySelectorAll('.opt').forEach((o) => { const c = o.querySelector('input'); o.classList.toggle('on', c.checked); });
  }

  // ------------------------------------------------------------------ pages: stretched resolution
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const status = (w, h) => {
    const d = P.disp; if (!d || !d.ok) return 'unknown';
    const [cw, ch] = d.current;
    if (w === cw && h === ch) return 'native';
    if (w > cw || h > ch) return 'big';
    return (d.modes || []).some((m) => m[0] === w && m[1] === h) ? 'ok' : 'custom';
  };
  const stTag = (s) => ({ native: [L('résolution actuelle', 'current resolution'), 'st-ok'], ok: [L('compatible', 'supported'), 'st-ok'], custom: [L('à créer (résolution personnalisée)', 'needs a custom resolution'), 'st-patched'], big: [L('plus grande que ton écran', 'larger than your display'), 'st-broken'], unknown: ['', ''] }[s]);
  function stretchProfiles() {
    const list = ST.STRETCH.map((x) => Object.assign({}, x));
    const d = P.disp && P.disp.ok ? P.disp.current : null;
    if (d) { // generated for this screen: 4:3 / 16:10 / 5:4 at the native height and two lower tiers
      const even = (v) => Math.round(v / 2) * 2;
      for (const [a, b] of [[4, 3], [16, 10], [5, 4]]) for (const k of [1, 5 / 6, 0.75]) {
        const h = even(d[1] * k), w = even((h * a) / b);
        if (w <= d[0] && !(w === d[0] && h === d[1]) && !list.some((x) => x.w === w && x.h === h)) list.push({ id: `g${w}x${h}`, w, h, asp: `${a}:${b}`, fr: 'Généré pour ton écran.', en: 'Generated for your display.', pros: [], gen: true });
      }
    }
    return list;
  }
  function pageStretch() {
    const sel = P.sel, d = P.disp;
    const sst = status(sel.w, sel.h), tg = stTag(sst);
    return `<div class="page">${head(L('Résolution étirée', 'Stretched resolution'), L('Active une résolution 4:3 / 16:10 étirée <b>sans bandes noires</b>, directement depuis l\'app : plus de commande Steam ni de réglage de panneau GPU à chaque fois.', 'Enable a stretched 4:3 / 16:10 resolution <b>without black bars</b> straight from the app: no Steam command and no GPU panel tweaking each time.'))}
      ${previewBlock()}
      <h2>${L('Ta sélection', 'Your selection')}</h2>
      <div class="card pad" style="border-color:var(--gold)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><h3 style="margin:0">${sel.w}×${sel.h} <span class="tag">${(() => { const g = gcd(sel.w, sel.h); return sel.w / g + ':' + sel.h / g; })()}</span></h3>${tg && tg[0] ? `<span class="st ${tg[1]}">${tg[0]}</span>` : ''}</div>
        <p class="lead" style="margin:8px 0 12px">${d && d.ok ? L('Écran détecté', 'Detected display') + ` : <b>${d.current[0]}×${d.current[1]}</b> @ ${d.current[2]} Hz` : (isApp() ? L('Détection de l\'écran…', 'Detecting display…') : L('Disponible dans l\'application Windows.', 'Available in the Windows app.'))}</p>
        <div class="row-btns"><button class="btn gold big" data-p="st-launch"${isApp() ? '' : ' disabled'}>▶ ${L('Lancer Apex sans bandes noires', 'Launch Apex without black bars')}</button>
          <button class="btn" data-p="st-draft">${L('Mettre la résolution dans mon brouillon', 'Put the resolution in my draft')}</button>
          <button class="btn" data-p="st-test"${isApp() ? '' : ' disabled'}>${L('Tester la compatibilité', 'Test compatibility')}</button>
          <button class="btn" data-p="st-restore"${isApp() ? '' : ' disabled'}>${L('Restaurer mon écran', 'Restore my display')}</button></div>
        <div class="set" style="border:0;padding:12px 0 0"><div><h4>${L('Anti bandes noires du jeu (letterbox)', 'Game letterbox off')}</h4><p>${L('Ajoute +mat_letterbox_aspect_min 1.0 au lancement : c\'est l\'option qui supprime les bandes noires du jeu (confirmée en 1440×1080). Elle est de toute façon ajoutée par « Lancer Apex sans bandes noires » ; ce réglage sert aux lancements via Steam / EA app (onglet Lancement).', 'Adds +mat_letterbox_aspect_min 1.0 at launch: the option that removes the game\'s own black bars (confirmed on 1440×1080). “Launch Apex without black bars” adds it anyway; this switch is for launches through Steam / the EA app (Launch tab).')}</p></div><div class="ctl"><button class="switch${U().S.launch.letterbox ? ' on' : ''}" data-p="st-letterbox"></button></div></div>
        ${P.dispActive ? `<p class="hint" style="margin-top:10px;color:var(--ok)">● ${L('Écran étiré actif : il sera restauré automatiquement à la fermeture d\'Apex.', 'Stretched display active: it will be restored automatically when Apex closes.')}</p>` : ''}
        ${P.testRes.msg ? `<p class="hint" style="margin-top:10px">${esc(P.testRes.msg)}</p>` : ''}</div>
      <div class="note" style="margin-top:14px">${L('<b>Comment ça marche :</b> au lancement, l\'app demande à Windows de passer le bureau dans la résolution choisie <i>en demandant au pilote graphique de l\'étirer sur tout l\'écran</i> (pas de bandes noires), puis lance Apex. Le changement est temporaire : l\'écran revient tout seul à la fermeture du jeu (ou avec « Restaurer mon écran »). La résolution doit être proposée par ton pilote ; sinon, crée-la une fois dans le panneau NVIDIA / AMD (résolution personnalisée). Si des bandes noires subsistent, règle « Mise à l\'échelle » sur « Plein écran » dans le panneau du pilote.', '<b>How it works:</b> at launch the app asks Windows to switch the desktop to the chosen resolution <i>while asking the graphics driver to stretch it over the whole panel</i> (no black bars), then starts Apex. The change is temporary: the display returns by itself when the game closes (or with “Restore my display”). The resolution must be offered by your driver; otherwise create it once as a custom resolution in the NVIDIA / AMD panel. If black bars remain, set “Scaling” to “Full-screen” in the driver panel.')}</div>
      <h2>${L('Profils', 'Profiles')}</h2>
      <div class="grid">${stretchProfiles().map((p) => { const s = status(p.w, p.h), t = stTag(s), on = p.w === sel.w && p.h === sel.h; return `<div class="card pad" style="${on ? 'border-color:var(--gold)' : ''}"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3 style="margin:0">${p.w}×${p.h}</h3><span class="tag">${p.asp}</span></div>
        <p class="hint" style="margin:8px 0">${esc(p[ST.lang] || p.en)}${p.pros && p.pros.length ? `<br>${L('Utilisé par', 'Used by')} : ${esc(p.pros.join(', '))}` : ''}</p>
        ${t && t[0] ? `<span class="st ${t[1]}">${t[0]}</span>` : ''}<div class="row-btns" style="margin-top:10px"><button class="btn sm${on ? ' gold' : ''}" data-p="st-pick" data-w="${p.w}" data-h="${p.h}">${on ? '✔ ' + L('Sélectionné', 'Selected') : L('Choisir', 'Select')}</button></div></div>`; }).join('')}</div>
      <h2>${L('Résolution personnalisée', 'Custom resolution')}</h2>
      <div class="card pad"><div class="row-btns"><input class="inp" data-pi="cw" inputmode="numeric" style="width:100px" placeholder="1440" value="${P.cw || ''}"> × <input class="inp" data-pi="ch" inputmode="numeric" style="width:100px" placeholder="1080" value="${P.ch || ''}"><button class="btn" data-p="st-custom">${L('Choisir', 'Select')}</button></div></div></div>`;
  }

  // ------------------------------------------------------------------ stretched-resolution live preview
  // A real gameplay clip (1920×1080) is re-rendered the way the game would show it at the chosen resolution:
  // cropped to the game's aspect ratio, drawn at that exact resolution, then stretched over the panel (or letter-boxed).
  // It is an approximation of Apex's field of view handling, meant to show how much the image widens.
  const PV = { vid: null, cA: null, cB: null, off: null, raf: 0, mode: st('st_prev_mode', 'stretch'), grid: false, last: -1, err: false };
  const panelAspect = () => (P.disp && P.disp.ok && P.disp.current ? P.disp.current[0] / P.disp.current[1] : 16 / 9);
  function pvInit() {
    if (PV.vid) return;
    const v = document.createElement('video');
    v.src = 'previews/stretch-clip.mp4'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.addEventListener('error', () => { PV.err = true; });
    PV.vid = v; PV.cA = document.createElement('canvas'); PV.cB = document.createElement('canvas'); PV.off = document.createElement('canvas');
  }
  function cover(ctx, v, W, H) { // fill W×H with the video, cropping the excess (centered)
    const sw = v.videoWidth, sh = v.videoHeight, a = W / H;
    let cw = sw, ch = sh; if (a < sw / sh) cw = sh * a; else ch = sw / a;
    ctx.drawImage(v, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, W, H);
  }
  function pvDraw() {
    const v = PV.vid; if (!v || v.readyState < 2 || !v.videoWidth) return;
    const asp = panelAspect(), W = 960, H = Math.round(W / asp);
    for (const c of [PV.cA, PV.cB]) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const a = PV.cA.getContext('2d'), b = PV.cB.getContext('2d'); a.imageSmoothingQuality = b.imageSmoothingQuality = 'high';
    cover(a, v, W, H);
    const { w, h } = P.sel, ga = w / h, sw = v.videoWidth, sh = v.videoHeight;
    let cw = sw, ch = sh; if (ga < sw / sh) cw = sh * ga; else ch = sw / ga;
    const off = PV.off; off.width = Math.min(w, 1920); off.height = Math.min(h, 1440);
    off.getContext('2d').drawImage(v, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, off.width, off.height); // the game's own render
    b.fillStyle = '#000'; b.fillRect(0, 0, W, H);
    if (PV.mode === 'bars') { const dw = Math.min(W, H * ga), dh = dw / ga; b.drawImage(off, (W - dw) / 2, (H - dh) / 2, dw, dh); }
    else b.drawImage(off, 0, 0, W, H);
  }
  function pvLoop() {
    if (U().S.tab !== 'stretch' || !document.getElementById('sprev')) { PV.raf = 0; if (PV.vid) PV.vid.pause(); return; }
    const t = PV.vid.currentTime; if (t !== PV.last) { PV.last = t; pvDraw(); }
    PV.raf = requestAnimationFrame(pvLoop);
  }
  function pvMount() {
    pvInit();
    const sA = document.querySelector('.stage[data-pv=A]'), sB = document.querySelector('.stage[data-pv=B]');
    if (!sA || !sB) return;
    if (PV.cA.parentNode !== sA) sA.insertBefore(PV.cA, sA.firstChild);
    if (PV.cB.parentNode !== sB) sB.insertBefore(PV.cB, sB.firstChild);
    PV.vid.play().catch(() => {});
    pvDraw();
    if (!PV.raf) PV.raf = requestAnimationFrame(pvLoop);
  }
  function previewBlock() {
    const { w, h } = P.sel, asp = panelAspect(), ga = w / h, k = asp / ga;
    const nat = P.disp && P.disp.ok ? P.disp.current[0] + '×' + P.disp.current[1] : '';
    return `<div class="card pad" id="sprev-card"><div class="sprev-bar"><div class="seg">
        <button class="${PV.mode === 'stretch' ? 'on' : ''}" data-p="pv-mode" data-v="stretch">${L('Étiré (plein écran)', 'Stretched (full screen)')}</button>
        <button class="${PV.mode === 'bars' ? 'on' : ''}" data-p="pv-mode" data-v="bars">${L('Avec bandes noires', 'With black bars')}</button></div>
        <button class="btn sm" data-p="pv-grid">${PV.grid ? '✔ ' : ''}${L('Grille de repère', 'Reference grid')}</button></div>
      <div class="sprev${PV.grid ? ' grid-on' : ''}" id="sprev">
        <div class="pnl"><div class="stage" data-pv="A"><div class="grid-ov"></div></div><div class="cap"><b>${L('Résolution native', 'Native resolution')}</b><span>${nat || '16:9'}</span></div></div>
        <div class="pnl"><div class="stage" data-pv="B"><div class="grid-ov"></div></div><div class="cap"><b>${w}×${h}</b><span>${PV.mode === 'stretch' ? L('image étirée ×', 'image stretched ×') + k.toFixed(2).replace('.', ST.lang === 'fr' ? ',' : '.') + L(' en largeur', ' wider') : L('sans étirement : bandes noires', 'no stretch: black bars')}</span></div></div>
      </div>
      <p class="hint">${PV.err ? L('Clip d\'aperçu introuvable.', 'Preview clip not found.') : L('Simulation sur un vrai extrait de jeu : l\'image est recadrée au ratio choisi, rendue à cette résolution puis étirée sur tout l\'écran. Le champ de vision exact varie selon ton FOV dans Apex.', 'Simulation on real gameplay: the image is cropped to the chosen ratio, rendered at that resolution and stretched over the whole screen. The exact field of view depends on your FOV in Apex.')}</p></div>`;
  }

  // ------------------------------------------------------------------ events
  const A = {
    plat: (el) => { P.plat = el.dataset.v; U().render(); },
    rplat: (el) => { P.rivPlat = el.dataset.v; U().render(); },
    load: () => loadMe(),
    pred: async () => { P.busy = true; U().render(); await loadPred(false); P.busy = false; U().render(); },
    'refresh-all': () => refreshAll(),
    'riv-add': () => addRival(),
    'riv-del': (el) => { P.rivals.splice(+el.dataset.v, 1); save('rivals', P.rivals); U().render(); },
    'key-save': async () => {
      const el = document.getElementById('p-key'), v = el ? el.value.trim() : '';
      if (!v) return;
      const r = await api().playerSetKey(v);
      if (!r.ok) return U().toast(L('Clé invalide.', 'Invalid key.'), { bad: true });
      el.value = ''; P.hasKey = true; U().toast(L('Clé enregistrée (chiffrée).', 'Key saved (encrypted).')); U().render();
    },
    'key-del': async () => { await api().playerSetKey(''); P.hasKey = false; U().toast(L('Clé supprimée.', 'Key removed.')); U().render(); },
    'pv-mode': (el) => { PV.mode = el.dataset.v; save('st_prev_mode', PV.mode); U().render(); },
    'pv-grid': () => { PV.grid = !PV.grid; U().render(); },
    'st-letterbox': () => { const l = U().S.launch; l.letterbox = !l.letterbox; U().store.set('launch', l); U().render(); },
    'pro-open': (el) => openPro(el.dataset.id),
    'pro-filter': (el) => { PF.filter = el.dataset.v; U().render(); },
    'pm-all': () => { document.querySelectorAll('[data-pp]').forEach((c) => { c.checked = true; PP.sel.add(c.dataset.pp); }); pmRefresh(); },
    'pm-none': () => { document.querySelectorAll('[data-pp]').forEach((c) => { c.checked = false; }); PP.sel.clear(); pmRefresh(); },
    'pm-add': () => {
      const p = ST.PROS.find((x) => x.id === PP.id); if (!p) return;
      const { parts } = proParts(p), chosen = [...PP.sel].filter((id) => parts[id]);
      if (!chosen.length) return;
      U().mergeState(proState(p, chosen));
      if (chosen.includes('launch')) { const l = U().S.launch; l.extra = p.launch; U().store.set('launch', l); }
      save('pro_sel', chosen); U().closeDialog(); U().render();
      U().toast(L(`${p.name} : ${chosen.length} élément${chosen.length > 1 ? 's' : ''} ajouté${chosen.length > 1 ? 's' : ''} au brouillon — vérifie puis applique.`, `${p.name}: ${chosen.length} item${chosen.length > 1 ? 's' : ''} added to your draft — review, then apply.`));
    },
    'pro-stretch': (el) => { U().closeDialog(); const p = ST.PROS.find((x) => x.id === el.dataset.id); if (!p) return; P.sel = { w: p.res[0], h: p.res[1] }; save('stretch_sel', P.sel); U().S.tab = 'stretch'; U().render(); },
    'st-pick': (el) => { P.sel = { w: +el.dataset.w, h: +el.dataset.h }; save('stretch_sel', P.sel); P.testRes = {}; U().render(); },
    'st-custom': () => {
      const w = Math.round(+P.cw), h = Math.round(+P.ch);
      if (!(w >= 640 && w <= 7680 && h >= 480 && h <= 4320)) return U().toast(L('Résolution invalide (640×480 à 7680×4320).', 'Invalid resolution (640×480 to 7680×4320).'), { bad: true });
      P.sel = { w, h }; save('stretch_sel', P.sel); P.testRes = {}; U().render();
    },
    'st-draft': () => { stretchDraft(); U().render(); U().toast(L(`${P.sel.w}×${P.sel.h} + plein écran dans le brouillon — vérifie puis applique.`, `${P.sel.w}×${P.sel.h} + full screen in your draft — review, then apply.`)); },
    'st-test': async () => {
      const r = await api().displayTest(P.sel.w, P.sel.h);
      const SC = { 1: ['identique', 'identity'], 2: ['centrée', 'centered'], 3: ['plein écran', 'full screen'], 4: ['conserver le ratio (bandes noires)', 'keep aspect ratio (black bars)'] };
      const scTxt = r && r.ok && r.scaling > 0 ? ' ' + L('Mise à l\'échelle actuelle : ', 'Current scaling: ') + (SC[r.scaling] ? L(...SC[r.scaling]) : r.scaling) + (r.scalingValid ? L(' → l\'app la passera en plein écran pendant le jeu.', ' → the app will switch it to full screen while you play.') : L(' → Windows refuse de la changer : règle-la dans le panneau NVIDIA / AMD.', ' → Windows refuses to change it: set it in the NVIDIA / AMD panel.')) : '';
      P.testRes = { msg: r && r.ok ? L('✔ Ton pilote accepte cette résolution étirée.', '✔ Your driver accepts this stretched resolution.') + scTxt : L('✘ Résolution refusée par le pilote : crée-la en « résolution personnalisée » dans le panneau NVIDIA/AMD, ou choisis-en une compatible.', '✘ Rejected by the driver: create it as a custom resolution in the NVIDIA/AMD panel, or pick a supported one.') };
      U().render();
    },
    'st-restore': async () => { await api().displayRestore(); P.dispActive = false; U().toast(L('Écran restauré.', 'Display restored.')); U().render(); },
    'st-launch': async () => {
      if (!isApp()) return U().toast(L('Disponible dans l\'application Windows.', 'Available in the Windows app.'), { bad: true });
      const t = await api().displayTest(P.sel.w, P.sel.h);
      if (!(t && t.ok)) { P.testRes = { msg: L('✘ Résolution non proposée par ton pilote : crée-la en « résolution personnalisée » (NVIDIA / AMD) ou choisis un profil compatible.', '✘ Not offered by your driver: create it as a custom resolution (NVIDIA / AMD) or pick a supported profile.') }; return U().render(); }
      stretchDraft();
      await U().launchGame({ stretch: { w: P.sel.w, h: P.sel.h } });
      P.dispActive = await api().displayActive(); U().render();
    },
  };
  function stretchDraft() {
    const s = ST.payloadToState({ v: 1, settings: { defaultres: String(P.sel.w), defaultresheight: String(P.sel.h), fullscreen: '1' } });
    U().mergeState(s);
  }

  document.addEventListener('error', (e) => { const t = e.target; if (t && t.classList && t.classList.contains('av-img')) t.remove(); }, true);
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-p]'); if (el && !el.disabled && A[el.dataset.p]) { e.preventDefault(); A[el.dataset.p](el); } });
  document.addEventListener('input', (e) => {
    const el = e.target; if (!el.dataset || !el.dataset.pi) return;
    const k = el.dataset.pi;
    if (k === 'name') P.nameIn = el.value; else if (k === 'riv') P.rivIn = el.value; else if (k === 'cw') P.cw = el.value; else if (k === 'ch') P.ch = el.value;
    else if (k === 'manual') { const v = Math.round(+el.value); if (v > 0) P.predManual[el.dataset.v] = v; else delete P.predManual[el.dataset.v]; save('pred_manual', P.predManual); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.dataset && e.target.dataset.pp) { if (e.target.checked) PP.sel.add(e.target.dataset.pp); else PP.sel.delete(e.target.dataset.pp); return pmRefresh(); } if (e.target.dataset && e.target.dataset.pi === 'manual') U().render(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.dataset) return;
    if (e.target.dataset.pi === 'name') loadMe(); else if (e.target.dataset.pi === 'riv') addRival();
  });
  if (api() && api().onDisplayRestored) api().onDisplayRestored(() => { P.dispActive = false; if (U().S.tab === 'stretch') U().render(); U().toast(L('Écran restauré après la fermeture d\'Apex.', 'Display restored after Apex closed.')); });

  // lazy loads (called after every render)
  ST.pro = {
    _pv: PV,
    pages: { me: pageMe, ladder: pageLadder, pros: pagePros, stretch: pageStretch },
    after: () => {
      const tab = U().S.tab;
      if ((tab === 'me' || tab === 'ladder') && isApp() && P.hasKey === null) { P.hasKey = false; refreshKey().then(() => { if (U().S.tab === tab) U().render(); }); }
      if (tab === 'stretch') pvMount();
      if (tab === 'stretch' && api() && api().displayInfo && !P.disp && !P.dispBusy) {
        P.dispBusy = true;
        api().displayInfo().then(async (r) => { P.disp = r || { ok: false }; P.dispActive = await api().displayActive(); P.dispBusy = false; if (U().S.tab === 'stretch') U().render(); }).catch(() => { P.disp = { ok: false }; P.dispBusy = false; });
      }
    },
  };
})();

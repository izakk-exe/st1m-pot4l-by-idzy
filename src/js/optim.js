/* ST1M PORT4L by idZy — PC optimisation: three FPS profiles (in-game settings + Windows tweaks + launch options)
 * and "potato graphics" through NVIDIA Profile Inspector.
 * Every step is reversible: Apex files are backed up before writing, Windows values are saved by pc-optim.ps1
 * before they change, and the NVIDIA profile can be put back to driver defaults. Nothing runs without a click. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = () => ST.ui;
  const L = (fr, en) => ST.L(fr, en);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = () => window.stApi;
  const isApp = () => !!(api() && api().optimStatus);

  // ---------------------------------------------------------------- Windows tweaks
  const TWEAKS = {
    gamemode: { fr: ['Mode Jeu Windows', 'Windows donne la priorité au jeu (CPU, GPU) et bloque les mises à jour pendant la partie.'], en: ['Windows Game Mode', 'Windows prioritises the game (CPU, GPU) and holds updates while you play.'] },
    dvr: { fr: ['Enregistrement Xbox Game Bar coupé', 'Désactive la capture en arrière-plan (Game DVR) qui enregistre en continu et coûte des FPS.'], en: ['Xbox Game Bar recording off', 'Turns off background capture (Game DVR), which records constantly and costs FPS.'] },
    power: { fr: ['Plan d\'alimentation Performances optimales', 'Le CPU reste à pleine fréquence (plan « Performances optimales », sinon « Performances élevées »). Plus de consommation.'], en: ['Ultimate performance power plan', 'Keeps the CPU at full clock (“Ultimate performance”, else “High performance”). Uses more power.'] },
    gpupref: { fr: ['Apex sur la carte graphique dédiée', 'Force r5apex.exe sur le GPU haute performance (indispensable sur PC portable avec deux GPU).'], en: ['Apex on the dedicated GPU', 'Forces r5apex.exe onto the high-performance GPU (essential on laptops with two GPUs).'] },
    fso: { fr: ['Optimisations plein écran désactivées', 'Coupe la surcouche Windows sur r5apex.exe : vrai plein écran exclusif, moins de latence.'], en: ['Fullscreen optimisations off', 'Removes the Windows layer on r5apex.exe: true exclusive fullscreen, less latency.'] },
    transparency: { fr: ['Transparence Windows coupée', 'Retire les effets de transparence du bureau (petit gain sur les PC modestes).'], en: ['Windows transparency off', 'Removes desktop transparency effects (small gain on modest PCs).'] },
  };

  // ---------------------------------------------------------------- the three profiles
  const SHARED = { dvs_enable: '0', mat_vsync_mode: '0', mat_backbuffer_count: '1', dynamic_streaming_budget: '0', cl_ragdoll_self_collision: '0', volumetric_fog: '0', volumetric_lighting: '0', ssao_quality: '0' };
  const PROFILES = [
    {
      id: 'light', gain: ['+10 à 25 %', '+10 to 25%'],
      fr: ['Boost léger', 'Garde un jeu propre : coupe seulement ce qui coûte cher sans se voir (brouillard, éclairage volumétrique, SSAO, ombres lointaines).'],
      en: ['Light boost', 'Keeps the game looking clean: only cuts what is expensive and barely visible (fog, volumetric lighting, SSAO, distant shadows).'],
      settings: Object.assign({}, SHARED, { csm_enabled: '1', csm_coverage: '1', csm_cascade_res: '512', shadow_enable: '1', shadow_maxdynamic: '1', shadow_depth_dimen_min: '256', shadow_depth_upres_factor_max: '1', mat_picmip: '2', mat_forceaniso: '2', mat_mip_linear: '1', mat_antialias_mode: '12', stream_memory: '600000', particle_cpu_level: '1', cl_particle_fallback_base: '2', cl_particle_fallback_multiplier: '2', r_decals: '64', r_createmodeldecals: '1', cl_ragdoll_maxcount: '2', r_lod_switch_scale: '0.9', fadeDistScale: '2', map_detail_level: '2' }),
      tweaks: ['gamemode', 'dvr'],
      launch: { novid: true, cap: true, capv: '0' },
    },
    {
      id: 'comp', gain: ['+25 à 45 %', '+25 to 45%'], accent: true,
      fr: ['Boost compétitif', 'Le réglage des joueurs classés : ombres et effets coupés, textures moyennes lisibles, PC configuré pour le jeu.'],
      en: ['Competitive boost', 'What ranked players run: shadows and effects off, readable medium textures, PC set up for the game.'],
      settings: Object.assign({}, SHARED, { csm_enabled: '0', csm_coverage: '1', csm_cascade_res: '128', shadow_enable: '0', shadow_maxdynamic: '0', shadow_depth_dimen_min: '0', shadow_depth_upres_factor_max: '0', mat_picmip: '2', mat_forceaniso: '2', mat_mip_linear: '1', mat_antialias_mode: '0', stream_memory: '600000', particle_cpu_level: '0', cl_particle_fallback_base: '3', cl_particle_fallback_multiplier: '2', r_decals: '0', r_createmodeldecals: '0', cl_gib_allow: '0', cl_ragdoll_maxcount: '0', r_lod_switch_scale: '0.6', fadeDistScale: '1', map_detail_level: '1' }),
      tweaks: ['gamemode', 'dvr', 'power', 'gpupref', 'fso'],
      launch: { novid: true, cap: true, capv: '0', thread: true, high: true },
    },
    {
      id: 'max', gain: ['+40 à 70 %', '+40 to 70%'],
      fr: ['Boost extrême', 'Tout au minimum pour les PC qui rament : textures basses, détails au plus bas, Windows allégé. Combine-le avec Potato graphics pour aller encore plus loin.'],
      en: ['Extreme boost', 'Everything at minimum for PCs that struggle: low textures, lowest detail, lighter Windows. Pair it with Potato graphics to go even further.'],
      settings: Object.assign({}, SHARED, { csm_enabled: '0', csm_coverage: '1', csm_cascade_res: '128', shadow_enable: '0', shadow_maxdynamic: '0', shadow_depth_dimen_min: '0', shadow_depth_upres_factor_max: '0', mat_picmip: '4', mat_forceaniso: '0', mat_mip_linear: '0', mat_antialias_mode: '0', stream_memory: '0', particle_cpu_level: '0', cl_particle_fallback_base: '4', cl_particle_fallback_multiplier: '3', r_decals: '0', r_createmodeldecals: '0', cl_gib_allow: '0', cl_ragdoll_maxcount: '0', r_lod_switch_scale: '0.3', fadeDistScale: '1', map_detail_level: '1' }),
      tweaks: ['gamemode', 'dvr', 'power', 'gpupref', 'fso', 'transparency'],
      launch: { novid: true, cap: true, capv: '0', thread: true, high: true },
    },
  ];
  const LAUNCH_TXT = { novid: '-novid', cap: '+fps_max 0', thread: '-no_render_on_input_thread', high: '-high' };

  const POTATO = [
    { id: 'soft', fr: ['Flou léger', 'Textures adoucies (LOD +3).'], en: ['Soft blur', 'Softened textures (LOD +3).'] },
    { id: 'potato', fr: ['Potato', 'Textures très floues, surfaces quasi unies (LOD +8).'], en: ['Potato', 'Very blurry textures, near-flat surfaces (LOD +8).'] },
    { id: 'max', fr: ['Potato max', 'Aplats de couleur, rendu le plus léger possible (LOD +15).'], en: ['Max potato', 'Flat colours, the lightest possible rendering (LOD +15).'] },
  ];

  const O = { st: null, busy: false, npi: null, level: U() ? U().store.get('potato_level', 'potato') : 'potato', active: null };
  const store = () => U().store;

  async function refresh() {
    if (!isApp() || O.busy) return;
    O.busy = true;
    try { O.st = await api().optimStatus(U().S.game.exe || ''); O.npi = await api().npiStatus(); } catch (_) { O.st = { ok: false }; }
    O.busy = false;
    if (U().S.tab === 'optim') U().render();
  }

  // ---------------------------------------------------------------- page
  const head = (t, lead) => `<h1>${esc(t)}</h1><p class="lead">${lead}</p>`;
  const tw = (id) => TWEAKS[id][ST.lang === 'fr' ? 'fr' : 'en'];
  const pr = (p) => p[ST.lang === 'fr' ? 'fr' : 'en'];
  const tweakOn = (id) => !!(O.st && O.st.tweaks && O.st.tweaks[id]);

  function pageOptim() {
    const active = O.active || store().get('optim_profile', null);
    const nTweaks = Object.keys(TWEAKS).filter(tweakOn).length;
    return `<div class="page">${head(L('Opti PC', 'PC optimisation'), L('Gagne des FPS sur Apex en un clic : réglages du jeu, Windows et options de lancement, regroupés en trois profils. <b>Tout est réversible.</b>', 'Gain FPS in Apex in one click: game settings, Windows and launch options bundled into three profiles. <b>Everything is reversible.</b>'))}
      <h2>${L('Profils de boost', 'Boost profiles')}</h2>
      <div class="grid optim-grid">${PROFILES.map((p) => { const on = active === p.id; return `<div class="card pad optim-card${p.accent ? ' accent' : ''}${on ? ' on' : ''}">
        <div class="optim-top"><h3>${esc(pr(p)[0])}</h3><span class="optim-gain">${esc(p.gain[ST.lang === 'fr' ? 0 : 1])} FPS</span></div>
        <p class="hint">${esc(pr(p)[1])}</p>
        <ul class="optim-list">
          <li><b>${L('Jeu', 'Game')}</b> ${Object.keys(p.settings).length} ${L('réglages graphiques', 'graphics settings')}</li>
          <li><b>Windows</b> ${p.tweaks.map((t) => esc(tw(t)[0])).join(' · ')}</li>
          <li><b>${L('Lancement', 'Launch')}</b> <code>${Object.keys(p.launch).filter((k) => LAUNCH_TXT[k]).map((k) => LAUNCH_TXT[k]).join(' ')}</code></li>
        </ul>
        <div class="row-btns"><button class="btn${p.accent || on ? ' gold' : ''}" data-o="profile" data-id="${p.id}">${on ? '✔ ' + L('Appliqué — réappliquer', 'Applied — apply again') : L('Appliquer ce profil', 'Apply this profile')}</button></div></div>`; }).join('')}</div>
      <p class="hint" style="margin-top:10px">${L('Gains indicatifs par rapport à des réglages élevés : ils dépendent de ton PC (un CPU limité gagne moins). Mesure-les avec le compteur FPS (onglet Lancement).', 'Indicative gains compared with high settings: they depend on your PC (a CPU-bound PC gains less). Measure them with the FPS counter (Launch tab).')}</p>

      <h2>${L('Réglages Windows', 'Windows tweaks')}</h2>
      <div class="card">${Object.keys(TWEAKS).map((id) => `<div class="set"><div><h4>${esc(tw(id)[0])}</h4><p>${esc(tw(id)[1])}</p></div><div class="ctl">${O.st && O.st.ok ? `<span class="st ${tweakOn(id) ? 'st-ok' : ''}">${tweakOn(id) ? L('actif', 'on') : L('inactif', 'off')}</span>` : ''}<button class="btn sm" data-o="tweak" data-id="${id}"${isApp() && !tweakOn(id) ? '' : ' disabled'}>${L('Activer', 'Enable')}</button></div></div>`).join('')}
        <div class="set"><div><h4>${L('Tout remettre comme avant', 'Put everything back')}</h4><p>${L('Restaure chaque valeur Windows modifiée par l\'app et ton ancien plan d\'alimentation.', 'Restores every Windows value the app changed and your previous power plan.')}</p></div><div class="ctl"><button class="btn sm danger" data-o="tweak-restore"${isApp() && O.st && O.st.backup ? '' : ' disabled'}>${L('Restaurer Windows', 'Restore Windows')}</button></div></div></div>
      ${isApp() ? (O.st && O.st.ok ? `<p class="hint" style="margin-top:8px">${nTweaks}/6 ${L('réglages actifs', 'tweaks on')}${O.st.exe ? ' · r5apex.exe : ' + esc(O.st.exe) : ' · ' + L('r5apex.exe introuvable : choisis-le dans l\'onglet Lancement pour les réglages GPU dédié et plein écran.', 'r5apex.exe not found: pick it in the Launch tab for the dedicated-GPU and fullscreen tweaks.')}</p>` : `<p class="hint" style="margin-top:8px">${L('Lecture de l\'état de Windows…', 'Reading Windows state…')}</p>`) : `<p class="hint" style="margin-top:8px">${L('Disponible dans l\'application Windows.', 'Available in the Windows app.')}</p>`}

      <h2>Potato graphics <span class="tag">NVIDIA</span></h2>
      <div class="card pad potato">
        <p class="lead" style="margin:0 0 12px">${L('Le mode « patate » : le pilote NVIDIA floute volontairement les textures d\'Apex (LOD bias) et passe le filtrage en haute performance. Le jeu devient très moche… et beaucoup plus léger pour la carte graphique.', 'The “potato” mode: the NVIDIA driver deliberately blurs Apex\'s textures (LOD bias) and switches filtering to high performance. The game looks very ugly… and gets much lighter on the graphics card.')}</p>
        <div class="note warn">${L('<b>À savoir :</b> cartes NVIDIA uniquement. Ça modifie le profil « Apex Legends » du pilote, pas le jeu ; des modérateurs EA ont toutefois déconseillé NVIDIA Profile Inspector et les tournois interdisent souvent ce genre de réglage. <b>Utilisation à tes risques.</b> Windows demande les droits administrateur à chaque application.', '<b>Good to know:</b> NVIDIA cards only. It changes the driver\'s “Apex Legends” profile, not the game; still, EA moderators have advised against NVIDIA Profile Inspector and tournaments often forbid this kind of tweak. <b>Use at your own risk.</b> Windows asks for administrator rights each time it is applied.')}</div>
        <ol class="optim-steps">
          <li><span>${L('Télécharge NVIDIA Profile Inspector (gratuit, open source) sur sa page officielle et décompresse-le.', 'Download NVIDIA Profile Inspector (free, open source) from its official page and unzip it.')}</span><button class="btn sm" data-o="npi-dl"${isApp() ? '' : ' disabled'}>${L('Ouvrir la page GitHub', 'Open the GitHub page')}</button></li>
          <li><span>${O.npi && O.npi.exe ? '✔ <code>' + esc(O.npi.exe) + '</code>' : L('Indique à l\'app où se trouve <code>nvidiaProfileInspector.exe</code>.', 'Show the app where <code>nvidiaProfileInspector.exe</code> is.')}</span><button class="btn sm" data-o="npi-pick"${isApp() ? '' : ' disabled'}>${O.npi && O.npi.exe ? L('Changer', 'Change') : L('Choisir le fichier', 'Choose the file')}</button></li>
          <li><span>${L('Choisis l\'intensité puis applique (Apex fermé).', 'Pick the strength, then apply (Apex closed).')}</span></li>
        </ol>
        <div class="seg potato-seg">${POTATO.map((x) => `<button class="${O.level === x.id ? 'on' : ''}" data-o="level" data-id="${x.id}"><b>${esc(pr(x)[0])}</b><small>${esc(pr(x)[1])}</small></button>`).join('')}</div>
        <div class="row-btns" style="margin-top:14px"><button class="btn gold" data-o="npi-apply"${isApp() && O.npi && O.npi.exe ? '' : ' disabled'}>🥔 ${L('Appliquer Potato graphics', 'Apply Potato graphics')}</button><button class="btn" data-o="npi-restore"${isApp() && O.npi && O.npi.exe ? '' : ' disabled'}>${L('Remettre le profil NVIDIA par défaut', 'Reset the NVIDIA profile to defaults')}</button></div>
        <p class="hint" style="margin-top:10px">${L('Réglages écrits : LOD bias (DX), LOD bias piloté par le pilote off, qualité de filtrage « haute performance », optimisations trilinéaire et anisotrope on, filtrage anisotrope off, 1 image pré-rendue, gestion d\'énergie « performances maximales ».', 'Written settings: LOD bias (DX), driver-controlled LOD bias off, texture filtering quality “high performance”, trilinear and anisotropic optimisations on, anisotropic filtering off, 1 pre-rendered frame, power management “prefer maximum performance”.')}</p>
      </div>

      <h2>${L('Annuler', 'Undo')}</h2>
      <div class="card pad"><div class="row-btns"><button class="btn" data-o="restore-files">${L('Restaurer mes fichiers Apex d\'origine', 'Restore my original Apex files')}</button><button class="btn" data-o="tweak-restore"${isApp() && O.st && O.st.backup ? '' : ' disabled'}>${L('Restaurer Windows', 'Restore Windows')}</button><button class="btn" data-o="npi-restore"${isApp() && O.npi && O.npi.exe ? '' : ' disabled'}>${L('Profil NVIDIA par défaut', 'NVIDIA profile to defaults')}</button></div></div></div>`;
  }

  // ---------------------------------------------------------------- actions
  const tweakErr = (res) => Object.entries(res || {}).filter(([, v]) => v !== 'ok').map(([k, v]) => `${tw(k)[0]} (${v === 'no-exe' ? L('r5apex.exe introuvable', 'r5apex.exe not found') : v === 'unavailable' ? L('indisponible sur ce PC', 'unavailable on this PC') : L('échec', 'failed')})`);

  function confirmProfile(p) {
    return new Promise((res) => {
      U().dialog(`<h3>${esc(pr(p)[0])}</h3><p class="lead">${L('Voici ce qui va changer :', 'Here is what will change:')}</p>
        <ul class="optim-list">
          <li><b>${L('Jeu', 'Game')}</b> ${Object.keys(p.settings).length} ${L('réglages graphiques (sauvegarde automatique de tes fichiers)', 'graphics settings (your files are backed up)')}</li>
          <li><b>Windows</b> ${p.tweaks.map((t) => esc(tw(t)[0])).join(', ')}${isApp() ? '' : ' — ' + L('application Windows uniquement', 'Windows app only')}</li>
          <li><b>${L('Lancement', 'Launch')}</b> <code>${Object.keys(p.launch).filter((k) => LAUNCH_TXT[k]).map((k) => LAUNCH_TXT[k]).join(' ')}</code> ${L('(FPS débloqués)', '(uncapped FPS)')}</li>
        </ul>
        <p class="hint">${L('Ferme Apex avant d\'appliquer. Tout peut être annulé depuis cette page.', 'Close Apex before applying. Everything can be undone from this page.')}</p>
        <div class="foot"><button class="btn" data-x="no">${L('Annuler', 'Cancel')}</button><button class="btn gold" data-x="yes">${L('Appliquer', 'Apply')}</button></div>`);
      document.getElementById('modal').onclick = (e) => { const x = e.target.dataset && e.target.dataset.x; if (x || e.target.id === 'modal') { U().closeDialog(); res(x === 'yes'); } };
    });
  }

  async function applyProfile(id) {
    const p = PROFILES.find((x) => x.id === id); if (!p) return;
    if (!(await confirmProfile(p))) return;
    const ui = U(), S = ui.S;
    // 1. game files (backup + undo toast handled by applyChanges)
    ui.mergeState(ST.payloadToState({ v: 1, settings: p.settings }));
    const before = ui.changes().length;
    if (before) await ui.applyChanges();
    // 2. launch options
    Object.assign(S.launch, p.launch); ui.store.set('launch', S.launch);
    // 3. Windows
    let bad = [];
    if (isApp()) { const r = await api().optimApply(p.tweaks, S.game.exe || ''); bad = r && r.ok ? tweakErr(r.results) : [L('réglages Windows', 'Windows tweaks')]; }
    O.active = id; ui.store.set('optim_profile', id); O.st = null;
    await refresh(); ui.render();
    ui.toast(L(`${pr(p)[0]} appliqué ✔`, `${pr(p)[0]} applied ✔`) + (bad.length ? ' — ' + L('non appliqué : ', 'not applied: ') + bad.join(', ') : ''), bad.length ? { bad: true } : undefined);
  }

  const A = {
    profile: (el) => applyProfile(el.dataset.id),
    tweak: async (el) => {
      const r = await api().optimApply([el.dataset.id], U().S.game.exe || '');
      const bad = r && r.ok ? tweakErr(r.results) : [tw(el.dataset.id)[0]];
      await refresh(); U().toast(bad.length ? L('Non appliqué : ', 'Not applied: ') + bad.join(', ') : tw(el.dataset.id)[0] + ' ✔', bad.length ? { bad: true } : undefined);
    },
    'tweak-restore': async () => {
      const r = await api().optimRestore();
      await refresh(); U().toast(r && r.ok ? L('Windows restauré comme avant ✔', 'Windows restored ✔') : L('Restauration partielle ou impossible.', 'Partial or failed restore.'), r && r.ok ? undefined : { bad: true });
    },
    'restore-files': async () => {
      const ui = U();
      const ok = await new Promise((res) => {
        ui.dialog(`<h3>${L('Restaurer les fichiers d’origine ?', 'Restore the original files?')}</h3><p class="lead">${L('Tes trois fichiers de config Apex reviennent à leur état d’avant la première modification par l’app.', 'Your three Apex config files go back to how they were before the app first changed them.')}</p><div class="foot"><button class="btn" data-x="no">${L('Annuler', 'Cancel')}</button><button class="btn gold" data-x="yes">${L('Restaurer', 'Restore')}</button></div>`);
        document.getElementById('modal').onclick = (e) => { const x = e.target.dataset && e.target.dataset.x; if (x || e.target.id === 'modal') { ui.closeDialog(); res(x === 'yes'); } };
      });
      if (!ok) return;
      let n = 0;
      for (const k of ['video', 'profile', 'settings']) { try { const r = await ui.S.be.restore(k, 'original'); if (r && r.ok !== false) n++; } catch (_) {} }
      O.active = null; ui.store.set('optim_profile', null);
      await ui.reload();
      ui.toast(n ? L(`Fichiers d'origine restaurés (${n}/3) ✔`, `Original files restored (${n}/3) ✔`) : L('Aucune sauvegarde d’origine trouvée.', 'No original backup found.'), n ? undefined : { bad: true });
    },
    'npi-dl': () => api().npiDownload(),
    'npi-pick': async () => {
      const r = await api().npiPick();
      if (r && r.error) return U().toast(L('Ce n\'est pas nvidiaProfileInspector.exe.', 'That is not nvidiaProfileInspector.exe.'), { bad: true });
      if (r) { O.npi = r; U().render(); }
    },
    level: (el) => { O.level = el.dataset.id; store().set('potato_level', O.level); U().render(); },
    'npi-apply': async () => {
      if (await U().S.be.apexRunning()) return U().toast(L('Ferme Apex avant d\'appliquer Potato graphics.', 'Close Apex before applying Potato graphics.'), { bad: true });
      U().toast(L('Windows va demander l\'autorisation administrateur…', 'Windows will ask for administrator permission…'));
      const r = await api().npiApply(O.level);
      U().toast(r && r.ok ? L('Potato graphics appliqué ✔ — relance Apex.', 'Potato graphics applied ✔ — restart Apex.') : r && r.error === 'cancelled' ? L('Annulé (autorisation refusée).', 'Cancelled (permission denied).') : L('Échec de l\'import NVIDIA.', 'NVIDIA import failed.'), r && r.ok ? undefined : { bad: true });
    },
    'npi-restore': async () => {
      const r = await api().npiRestore();
      U().toast(r && r.ok ? L('Profil NVIDIA d\'Apex remis par défaut ✔', 'Apex NVIDIA profile reset to defaults ✔') : r && r.error === 'cancelled' ? L('Annulé (autorisation refusée).', 'Cancelled (permission denied).') : L('Échec de l\'import NVIDIA.', 'NVIDIA import failed.'), r && r.ok ? undefined : { bad: true });
    },
  };
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-o]'); if (el && !el.disabled && A[el.dataset.o]) { e.preventDefault(); A[el.dataset.o](el); } });

  ST.optim = {
    pages: { optim: pageOptim },
    after: () => { if (U().S.tab === 'optim' && isApp() && !O.st && !O.busy) refresh(); },
  };
})();

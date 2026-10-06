/* ST1M POT4L by idZy — settings database, presets, quick binds.
 * Values are stored as the raw strings written to the game files, except for
 * "virtual" settings (display_mode, dvs_fps, fov, reticle) which are converted
 * by toRaw / fromRaw. */
(function () {
  const ST = (window.ST = window.ST || {});

  // ---- i18n helper: L('fr', 'en') -> string in current language
  ST.lang = 'fr';
  ST.L = (fr, en) => (ST.lang === 'fr' ? fr : en);

  ST.TABS = [
    { id: 'home', icon: '⌂', fr: 'Accueil', en: 'Home' },
    { id: 'preview', icon: '◉', fr: 'Aperçu avant/après', en: 'Before/after preview' },
    { id: 'graphics', icon: '◈', fr: 'Graphismes', en: 'Graphics' },
    { id: 'textures', icon: '▦', fr: 'Textures', en: 'Textures' },
    { id: 'shadows', icon: '◐', fr: 'Ombres', en: 'Shadows' },
    { id: 'effects', icon: '✦', fr: 'Effets', en: 'Effects' },
    { id: 'performance', icon: '⚡', fr: 'Performance', en: 'Performance' },
    { id: 'display', icon: '▭', fr: 'Affichage', en: 'Display' },
    { id: 'game', icon: '⌖', fr: 'Jeu', en: 'Game' },
    { id: 'binds', icon: '⌨', fr: 'Binds', en: 'Binds' },
    { id: 'launch', icon: '▶', fr: 'Lancement', en: 'Launch' },
    { id: 'overlay', icon: '◎', fr: 'Overlay clavier', en: 'Keyboard overlay' },
    { id: 'profiles', icon: '❖', fr: 'Profils & partage', en: 'Profiles & sharing' },
    { id: 'system', icon: '⚙', fr: 'Système', en: 'System' },
  ];

  const onoff = (fr, en) => [['0', fr[0], en[0]], ['1', fr[1], en[1]]];
  const lmh = [['0', 'Bas', 'Low'], ['1', 'Moyen', 'Medium'], ['2', 'Élevé', 'High']];

  // fps: 'heavy' | 'medium' | 'light' (rough FPS cost when set to its highest quality)
  const D = (o) => Object.assign({ file: 'video', on: '1', off: '0' }, o, { key: o.key || o.id });

  // Movement Lab tabs (pages are rendered by hub.js / trainer.js)
  (function () {
    const lab = [
      { id: 'techs', icon: '☰', fr: 'Catalogue', en: 'Catalogue' },
      { id: 'path', icon: '⇪', fr: 'Parcours', en: 'Learning path' },
      { id: 'legends', icon: '★', fr: 'Légendes & quiz', en: 'Legends & quiz' },
      { id: 'training', icon: '◔', fr: 'Entraînement', en: 'Training' },
      { id: 'news', icon: '✉', fr: 'Actus & liens', en: 'News & links' },
    ];
    const [home, ...rest] = ST.TABS;
    ST.TABS = [Object.assign({}, home, { sec: 'main' })].concat(lab.map((t) => Object.assign({ sec: 'lab' }, t)), rest.map((t) => Object.assign({ sec: 'cfg' }, t)));
    ST.SECTIONS = { lab: ['MOVEMENT LAB', 'MOVEMENT LAB'], cfg: ['CONFIGURATION', 'CONFIGURATION'] };
  })();

  ST.DEFS = [
    // ---------------- Graphics
    D({ id: 'ssao_quality', tab: 'graphics', type: 'toggle', on: '4', off: '0', fps: 'medium',
      fr: ['Occlusion ambiante (SSAO)', 'Ombrage doux dans les coins et aux jonctions des surfaces.'],
      en: ['Ambient occlusion (SSAO)', 'Soft shading in corners and where surfaces meet.'] }),
    D({ id: 'mat_antialias_mode', tab: 'graphics', type: 'select', fps: 'medium',
      opts: [['0', 'Désactivé', 'Off'], ['12', 'TSAA', 'TSAA']],
      fr: ['Anti-aliasing', 'Lisse les bords crénelés. TSAA est plus doux mais un peu flou.'],
      en: ['Anti-aliasing', 'Smooths jagged edges. TSAA is softer but slightly blurry.'] }),

    // ---------------- Textures
    D({ id: 'stream_memory', tab: 'textures', type: 'select', fps: 'light',
      opts: [['0', 'Aucun', 'None'], ['160000', '2 Go', '2 GB'], ['600000', '3 Go', '3 GB'], ['1000000', '4 Go', '4 GB'], ['2000000', '6 Go', '6 GB'], ['3000000', '8 Go', '8 GB']],
      fr: ['Budget de streaming des textures', 'VRAM réservée au chargement des textures. Choisis la VRAM de ta carte ou un cran en dessous. « Aucun » libère la VRAM mais cause du pop-in.'],
      en: ['Texture streaming budget', 'Video memory set aside for loading textures. Pick your card\'s VRAM or one step below. “None” frees VRAM but causes pop-in.'] }),
    D({ id: 'dynamic_streaming_budget', tab: 'textures', type: 'toggle', fps: 'light',
      dep: (v) => v.stream_memory !== '0',
      depHint: ['Nécessite un budget de streaming actif.', 'Needs an active streaming budget.'],
      fr: ['Streaming dynamique des textures', 'Ajuste le budget automatiquement selon la scène.'],
      en: ['Dynamic texture streaming', 'Adjusts the budget automatically depending on the scene.'] }),
    D({ id: 'mat_picmip', tab: 'textures', type: 'select', fps: 'medium',
      opts: [['4', 'Bas', 'Low'], ['2', 'Moyen', 'Medium'], ['0', 'Haut', 'High']],
      fr: ['Détail des textures', 'Netteté de toutes les surfaces, armes et personnages (mat_picmip).'],
      en: ['Texture detail', 'Sharpness of every surface, weapon and character (mat_picmip).'] }),
    D({ id: 'mat_forceaniso', tab: 'textures', type: 'select', fps: 'light',
      opts: [['0', 'Off', 'Off'], ['2', '2x', '2x'], ['8', '8x', '8x'], ['16', '16x', '16x']],
      fr: ['Filtrage anisotrope', 'Netteté des textures vues de biais (sol, murs).'],
      en: ['Anisotropic filtering', 'Sharpness of textures seen at an angle (ground, walls).'] }),
    D({ id: 'mat_mip_linear', tab: 'textures', type: 'toggle', fps: 'light',
      fr: ['Filtrage trilinéaire', 'Adoucit les transitions entre niveaux de détail des textures.'],
      en: ['Trilinear filtering', 'Smooths transitions between texture detail levels.'] }),

    // ---------------- Shadows
    D({ id: 'shadow_enable', tab: 'shadows', type: 'toggle', fps: 'heavy',
      fr: ['Ombres dynamiques', 'Ombres des lumières artificielles et des objets mobiles.'],
      en: ['Dynamic shadows', 'Shadows from artificial lights and moving objects.'] }),
    D({ id: 'shadow_maxdynamic', tab: 'shadows', type: 'slider', min: 0, max: 4, step: 1, fps: 'medium',
      dep: (v) => v.shadow_enable !== '0',
      depHint: ['Active les ombres dynamiques d\'abord.', 'Enable dynamic shadows first.'],
      fr: ['Ombres dynamiques max', 'Nombre maximal d\'ombres dynamiques simultanées.'],
      en: ['Max dynamic shadows', 'Maximum simultaneous dynamic shadows.'] }),
    D({ id: 'shadow_depth_dimen_min', tab: 'shadows', type: 'select', fps: 'light',
      dep: (v) => v.shadow_enable !== '0',
      depHint: ['Active les ombres dynamiques d\'abord.', 'Enable dynamic shadows first.'],
      opts: [['0', '0', '0'], ['256', '256', '256'], ['512', '512', '512']],
      fr: ['Résolution min. des ombres dynamiques', 'Taille minimale de la carte d\'ombres des lumières mobiles.'],
      en: ['Min dynamic shadow resolution', 'Minimum shadow map size for moving lights.'] }),
    D({ id: 'shadow_depth_upres_factor_max', tab: 'shadows', type: 'select', fps: 'light',
      dep: (v) => v.shadow_enable !== '0',
      depHint: ['Active les ombres dynamiques d\'abord.', 'Enable dynamic shadows first.'],
      opts: [['0', 'Bas', 'Low'], ['1', 'Moyen', 'Medium'], ['2', 'Élevé', 'High'], ['3', 'Max', 'Max']],
      fr: ['Qualité des ombres (upscale max)', 'Facteur maximal d\'augmentation de résolution des ombres proches.'],
      en: ['Shadow quality (max upres)', 'Maximum resolution boost for nearby shadows.'] }),
    D({ id: 'csm_enabled', tab: 'shadows', type: 'toggle', fps: 'heavy',
      fr: ['Ombres du soleil', 'Ombres projetées par le soleil. Les désactiver donne beaucoup de FPS (et de visibilité).'],
      en: ['Sun shadows', 'Shadows cast by the sun. Disabling gives a big FPS boost (and visibility).'] }),
    D({ id: 'csm_coverage', tab: 'shadows', type: 'select', fps: 'medium',
      dep: (v) => v.csm_enabled !== '0',
      depHint: ['Active les ombres du soleil d\'abord.', 'Enable sun shadows first.'],
      opts: [['1', 'Bas', 'Low'], ['2', 'Haut', 'High']],
      fr: ['Couverture des ombres du soleil', 'Jusqu\'à quelle distance les ombres du soleil sont dessinées.'],
      en: ['Sun shadow coverage', 'How far from the camera sun shadows are drawn.'] }),
    D({ id: 'csm_cascade_res', tab: 'shadows', type: 'select', fps: 'medium',
      dep: (v) => v.csm_enabled !== '0',
      depHint: ['Active les ombres du soleil d\'abord.', 'Enable sun shadows first.'],
      opts: [['128', 'Bas', 'Low'], ['512', 'Moyen', 'Medium'], ['1024', 'Haut', 'High']],
      fr: ['Résolution des ombres du soleil', 'Netteté du bord des ombres du soleil. Bas = bords en blocs mais moins de travail GPU.'],
      en: ['Sun shadow resolution', 'How sharp sun shadow edges are. Low looks blocky but saves GPU work.'] }),

    // ---------------- Effects
    D({ id: 'particle_cpu_level', tab: 'effects', type: 'select', fps: 'medium', opts: lmh,
      fr: ['Détail des particules (CPU)', 'Complexité des effets de particules.'],
      en: ['Particle detail (CPU)', 'Complexity of particle effects.'] }),
    D({ id: 'cl_particle_fallback_base', tab: 'effects', type: 'select', fps: 'light',
      opts: [['4', 'Très bas', 'Very low'], ['3', 'Bas', 'Low'], ['2', 'Moyen', 'Medium'], ['0', 'Haut', 'High']],
      fr: ['Simplification des effets (base)', 'Niveau de détail de repli des effets quand le jeu est sous charge.'],
      en: ['Particle fallback (base)', 'Fallback detail level of effects when the game is under load.'] }),
    D({ id: 'cl_particle_fallback_multiplier', tab: 'effects', type: 'select', fps: 'light',
      opts: [['3', 'Agressif', 'Aggressive'], ['2', 'Équilibré', 'Balanced'], ['1', 'Doux', 'Gentle']],
      fr: ['Simplification des effets (rythme)', 'À quelle vitesse les effets sont simplifiés sous charge.'],
      en: ['Particle fallback (speed)', 'How fast effects are simplified under load.'] }),
    D({ id: 'cl_gib_allow', tab: 'effects', type: 'toggle', fps: 'light',
      fr: ['Débris destructibles (gibs)', 'Fragments visuels lors des destructions et éliminations.'],
      en: ['Breakable debris (gibs)', 'Visual fragments on destruction and eliminations.'] }),
    D({ id: 'volumetric_lighting', tab: 'effects', type: 'toggle', fps: 'heavy',
      fr: ['Éclairage volumétrique', 'Rayons de lumière dans l\'air.'], en: ['Volumetric lighting', 'Light shafts in the air.'] }),
    D({ id: 'volumetric_fog', tab: 'effects', type: 'toggle', fps: 'heavy',
      fr: ['Brouillard volumétrique', 'Brume dense qui réduit parfois la visibilité.'], en: ['Volumetric fog', 'Dense haze that can reduce visibility.'] }),
    D({ id: 'r_createmodeldecals', tab: 'effects', type: 'toggle', fps: 'light',
      fr: ['Décals sur les modèles', 'Impacts et marques sur les personnages et objets.'], en: ['Model decals', 'Impacts and marks on characters and objects.'] }),
    D({ id: 'r_decals', tab: 'effects', type: 'select', fps: 'light',
      dep: (v) => v.r_createmodeldecals !== '0',
      depHint: ['Active les décals d\'abord.', 'Enable decals first.'],
      opts: [['0', 'Off', 'Off'], ['64', 'Bas', 'Low'], ['128', 'Moyen', 'Medium'], ['256', 'Haut', 'High']],
      fr: ['Limite de décals', 'Nombre maximal d\'impacts affichés sur les surfaces.'], en: ['Decal limit', 'Maximum number of impact marks shown on surfaces.'] }),

    // ---------------- Performance
    D({ id: 'r_lod_switch_scale', tab: 'performance', type: 'slider', min: 0.6, max: 2, step: 0.1, fps: 'medium', def: '1',
      fr: ['Distance des niveaux de détail (LOD)', 'Plus haut = les modèles gardent leur détail plus loin.'],
      en: ['LOD distance scale', 'Higher = models keep their detail further away.'] }),
    D({ id: 'fadeDistScale', tab: 'performance', type: 'select', fps: 'light',
      opts: [['1', 'Proche', 'Near'], ['2', 'Loin', 'Far']],
      fr: ['Distance d\'apparition des objets', 'À quelle distance les petits objets disparaissent.'],
      en: ['Object fade distance', 'How far away small objects fade out.'] }),
    D({ id: 'map_detail_level', tab: 'performance', type: 'select', fps: 'medium',
      opts: [['1', 'Bas', 'Low'], ['2', 'Haut', 'High']],
      fr: ['Détail de la carte', 'Détail du terrain et des bâtiments.'], en: ['Map detail', 'Detail of terrain and buildings.'] }),
    D({ id: 'cl_ragdoll_maxcount', tab: 'performance', type: 'slider', min: 0, max: 8, step: 1, fps: 'light',
      fr: ['Ragdolls max', 'Nombre de corps physiques simultanés.'], en: ['Max ragdolls', 'Number of simultaneous physics bodies.'] }),
    D({ id: 'cl_ragdoll_self_collision', tab: 'performance', type: 'toggle', fps: 'light',
      fr: ['Auto-collision des ragdolls', 'Les membres des ragdolls se heurtent entre eux.'], en: ['Ragdoll self-collision', 'Ragdoll limbs collide with each other.'] }),
    D({ id: 'dvs_enable', tab: 'performance', type: 'toggle', fps: 'light',
      fr: ['Résolution dynamique', 'Baisse la résolution pour tenir le FPS cible.'], en: ['Dynamic resolution', 'Lowers resolution to hold the target FPS.'] }),
    D({ id: 'dvs_fps', tab: 'performance', type: 'select', virtual: true,
      dep: (v) => v.dvs_enable === '1',
      depHint: ['Active la résolution dynamique d\'abord.', 'Enable dynamic resolution first.'],
      opts: [['60', '60', '60'], ['75', '75', '75'], ['100', '100', '100'], ['144', '144', '144']],
      fr: ['FPS cible (résolution dynamique)', 'Le temps de frame visé est stocké en microsecondes (bande 95–98 %).'],
      en: ['Target FPS (dynamic resolution)', 'Target frame time is stored in microseconds (95–98% band).'] }),

    // ---------------- Display
    D({ id: 'defaultres', tab: 'display', type: 'number', min: 640, max: 7680, def: '1920',
      fr: ['Largeur', 'Résolution horizontale en pixels.'], en: ['Width', 'Horizontal resolution in pixels.'] }),
    D({ id: 'defaultresheight', tab: 'display', type: 'number', min: 480, max: 4320, def: '1080',
      fr: ['Hauteur', 'Résolution verticale en pixels.'], en: ['Height', 'Vertical resolution in pixels.'] }),
    D({ id: 'display_mode', tab: 'display', type: 'select', virtual: true, def: 'fullscreen',
      opts: [['fullscreen', 'Plein écran', 'Fullscreen'], ['borderless', 'Sans bordure', 'Borderless'], ['windowed', 'Fenêtré', 'Windowed']],
      fr: ['Mode d\'affichage', 'Plein écran exclusif, sans bordure ou fenêtré.'], en: ['Display mode', 'Exclusive fullscreen, borderless or windowed.'] }),
    D({ id: 'mat_vsync_mode', tab: 'display', type: 'select', fps: 'light',
      opts: [['0', 'Off', 'Off'], ['1', 'Double buffer', 'Double buffered'], ['2', 'Triple buffer', 'Triple buffered']],
      fr: ['V-Sync', 'Synchronise l\'image avec l\'écran (ajoute de la latence).'], en: ['V-Sync', 'Syncs frames to the display (adds latency).'] }),
    D({ id: 'mat_backbuffer_count', tab: 'display', type: 'select',
      opts: [['1', 'Faible latence', 'Low latency'], ['2', 'Plus fluide', 'Smoother']],
      fr: ['Backbuffers', 'Faible latence ou affichage plus régulier.'], en: ['Backbuffers', 'Lower latency or smoother pacing.'] }),
    D({ id: 'gamma', tab: 'display', type: 'slider', min: 0.25, max: 1.75, step: 0.01, def: '1', fmt: 2,
      fr: ['Gamma', 'Luminosité globale de l\'image.'], en: ['Gamma', 'Overall image brightness.'] }),
    D({ id: 'sound_volume', tab: 'display', type: 'slider', min: 0, max: 1, step: 0.01, def: '1', fmt: 2,
      fr: ['Volume sonore', 'Volume général du jeu.'], en: ['Sound volume', 'Master game volume.'] }),

    // ---------------- Game (profile.cfg / settings.cfg)
    D({ id: 'fov', tab: 'game', file: 'profile', type: 'slider', virtual: true, min: 70, max: 120, step: 1, def: '90',
      fr: ['Champ de vision (FOV)', 'Le menu du jeu plafonne à 110 ; ici jusqu\'à 120. Stocké en cl_fovScale.'],
      en: ['Field of view (FOV)', 'The in-game menu caps at 110; here up to 120. Stored as cl_fovScale.'] }),
    D({ id: 'reticle', tab: 'game', file: 'profile', type: 'color', virtual: true, def: '255 255 255', key: 'reticle_color',
      fr: ['Couleur du réticule', 'Couleur RVB complète (0–255 par canal) pour le réticule.'], en: ['Reticle color', 'Full RGB color (0–255 per channel) for the reticle.'] }),
    D({ id: 'sound_without_focus', tab: 'game', file: 'profile', type: 'toggle',
      fr: ['Son en arrière-plan', 'Continue le son quand Apex n\'est pas la fenêtre active.'], en: ['Audio when unfocused', 'Keep sound when Apex is not the active window.'] }),
    D({ id: 'telemetry_off', tab: 'game', file: 'profile', type: 'toggle', key: 'pin_opt_in', on: '0', off: '1',
      fr: ['Désactiver la télémétrie (pin_opt_in)', 'Demande au jeu de ne pas envoyer de données d\'usage optionnelles.'], en: ['Disable telemetry (pin_opt_in)', 'Asks the game not to send optional usage data.'] }),
    D({ id: 'gfx_nvnUseLowLatency', tab: 'game', file: 'settings', type: 'toggle',
      fr: ['NVIDIA Reflex', 'Réduit la latence système (GPU NVIDIA uniquement).'], en: ['NVIDIA Reflex', 'Reduces system latency (NVIDIA GPUs only).'] }),
    D({ id: 'gfx_nvnUseLowLatencyBoost', tab: 'game', file: 'settings', type: 'toggle',
      dep: (v) => v.gfx_nvnUseLowLatency === '1',
      depHint: ['Active NVIDIA Reflex d\'abord.', 'Enable NVIDIA Reflex first.'],
      fr: ['Reflex + Boost', 'Garde le GPU à haute fréquence pour une latence minimale.'], en: ['Reflex + Boost', 'Keeps the GPU clocked up for minimum latency.'] }),
  ];
  ST.DEF = Object.fromEntries(ST.DEFS.map((d) => [d.id, d]));

  // ---- virtual conversions (raw = cvar dictionary of the file)
  const FOV_TO_SCALE = (f) => (1 + ((f - 70) * 0.7) / 50).toFixed(6);
  const SCALE_TO_FOV = (s) => Math.round(70 + (parseFloat(s) - 1) * (50 / 0.7));
  const dvsT = (fps) => 1e6 / fps;

  ST.VIRTUAL = {
    display_mode: {
      toRaw: (v) => ({ fullscreen: v === 'fullscreen' ? '1' : '0', nowindowborder: v === 'windowed' ? '0' : '1' }),
      fromRaw: (r) => (r.fullscreen === undefined && r.nowindowborder === undefined ? undefined
        : r.fullscreen === '1' ? 'fullscreen' : r.nowindowborder === '1' ? 'borderless' : 'windowed'),
      rawKeys: ['fullscreen', 'nowindowborder'],
    },
    dvs_fps: {
      toRaw: (v) => ({ dvs_gpuframetime_min: String(Math.round(dvsT(+v) * 0.95)), dvs_gpuframetime_max: String(Math.round(dvsT(+v) * 0.98)) }),
      fromRaw: (r) => {
        if (!r.dvs_gpuframetime_min) return undefined;
        const m = +r.dvs_gpuframetime_min;
        let best = null;
        for (const f of [60, 75, 100, 144]) if (Math.abs(dvsT(f) * 0.95 - m) < dvsT(f) * 0.03) best = String(f);
        return best || undefined;
      },
      rawKeys: ['dvs_gpuframetime_min', 'dvs_gpuframetime_max'],
    },
    fov: {
      toRaw: (v) => ({ cl_fovScale: FOV_TO_SCALE(+v) }),
      fromRaw: (r) => (r.cl_fovScale === undefined || isNaN(parseFloat(r.cl_fovScale)) ? undefined : String(SCALE_TO_FOV(r.cl_fovScale))),
      rawKeys: ['cl_fovScale'],
    },
    reticle: {
      toRaw: (v) => ({ reticle_color: v }),
      fromRaw: (r) => r.reticle_color,
      rawKeys: ['reticle_color'],
    },
  };

  // setting id -> { rawKey: rawValue } for the file it lives in
  ST.defToRaw = (def, value) => {
    if (ST.VIRTUAL[def.id]) return ST.VIRTUAL[def.id].toRaw(value);
    return { [def.key]: value };
  };
  ST.defFromRaw = (def, raw) => {
    if (ST.VIRTUAL[def.id]) return ST.VIRTUAL[def.id].fromRaw(raw);
    let v = raw[def.key];
    if (def.type === 'select' && v !== undefined && v !== '' && isFinite(Number(v))) {
      const o = def.opts.find((o) => Number(o[0]) === Number(v)); if (o) v = o[0];
    }
    return v;
  };

  ST.defVal = (def, values) => (values[def.id] !== undefined ? values[def.id] : def.def !== undefined ? def.def : def.off);

  // ---- validation / sanitising of any value (used by share-code import)
  ST.sanitize = (def, v) => {
    v = String(v).trim();
    if (def.type === 'toggle') return v === def.on || v === def.off ? v : null;
    if (def.type === 'select') {
      const hit = def.opts.find((o) => o[0] === v) || (isFinite(Number(v)) && def.opts.find((o) => Number(o[0]) === Number(v)));
      if (hit) return hit[0];
      return /^-?\d{1,8}(\.\d{1,6})?$/.test(v) ? v : null;
    }
    if (def.type === 'slider' || def.type === 'number') {
      const n = Number(v);
      if (!isFinite(n)) return null;
      const c = Math.min(def.max, Math.max(def.min, n));
      return String(def.fmt ? c.toFixed(def.fmt) : Number(c.toFixed(4)));
    }
    if (def.type === 'color') {
      const p = v.split(/\s+/).map(Number);
      if (p.length !== 3 || p.some((x) => !isFinite(x))) return null;
      return p.map((x) => Math.round(Math.min(255, Math.max(0, x)))).join(' ');
    }
    return null;
  };

  // ---- presets (cvar dictionaries as in the video file / share codes)
  ST.PRESETS = [
    {
      id: 'st1m', accent: true,
      fr: ['ST1M POT4L (idZy)', 'Le setup de idZy : FOV 120, réticule magenta, textures basses, ombres du soleil off.'],
      en: ['ST1M POT4L (idZy)', 'idZy\'s setup: FOV 120, magenta reticle, low textures, sun shadows off.'],
      fov: 120, reticle: '255 0 255',
      settings: { cl_gib_allow: '1', cl_particle_fallback_base: '0', cl_particle_fallback_multiplier: '1', cl_ragdoll_maxcount: '8', cl_ragdoll_self_collision: '0', csm_cascade_res: '512', csm_coverage: '1', csm_enabled: '1', dvs_enable: '0', dynamic_streaming_budget: '0', fadeDistScale: '2', map_detail_level: '2', mat_antialias_mode: '12', mat_backbuffer_count: '1', mat_forceaniso: '16', mat_mip_linear: '1', mat_picmip: '2', mat_vsync_mode: '0', particle_cpu_level: '2', r_createmodeldecals: '1', r_decals: '256', r_lod_switch_scale: '2', shadow_depth_dimen_min: '256', shadow_depth_upres_factor_max: '2', shadow_enable: '1', shadow_maxdynamic: '4', ssao_quality: '4', stream_memory: '0', volumetric_fog: '0', volumetric_lighting: '0' },
    },
    {
      id: 'competitive',
      fr: ['Compétitif', 'FPS maximum : ombres, brouillard, SSAO coupés, textures et LOD au minimum.'],
      en: ['Competitive', 'Max FPS: shadows, fog and SSAO off, textures and LOD at minimum.'],
      settings: {'cl_gib_allow': '0', 'cl_particle_fallback_base': '4', 'cl_particle_fallback_multiplier': '3', 'cl_ragdoll_maxcount': '0', 'cl_ragdoll_self_collision': '0', 'csm_cascade_res': '128', 'csm_coverage': '1', 'csm_enabled': '0', 'dvs_enable': '0', 'dynamic_streaming_budget': '0', 'fadeDistScale': '1', 'map_detail_level': '1', 'mat_antialias_mode': '0', 'mat_forceaniso': '0', 'mat_mip_linear': '0', 'mat_picmip': '4', 'particle_cpu_level': '0', 'r_createmodeldecals': '0', 'r_decals': '0', 'r_lod_switch_scale': '0.6', 'shadow_depth_dimen_min': '0', 'shadow_depth_upres_factor_max': '0', 'shadow_enable': '0', 'shadow_maxdynamic': '0', 'ssao_quality': '0', 'stream_memory': '0', 'volumetric_fog': '0', 'volumetric_lighting': '0'},
    },
    {
      id: 'balanced',
      fr: ['Équilibré', 'Textures moyennes, 3 Go de streaming, ombres basses, anti-aliasing activé.'],
      en: ['Balanced', 'Medium textures, 3 GB streaming, low shadows, anti-aliasing on.'],
      settings: {'cl_gib_allow': '1', 'cl_particle_fallback_base': '3', 'cl_particle_fallback_multiplier': '2', 'cl_ragdoll_maxcount': '2', 'cl_ragdoll_self_collision': '0', 'csm_cascade_res': '128', 'csm_coverage': '1', 'csm_enabled': '1', 'dvs_enable': '0', 'dynamic_streaming_budget': '0', 'fadeDistScale': '1', 'map_detail_level': '2', 'mat_antialias_mode': '12', 'mat_forceaniso': '2', 'mat_mip_linear': '1', 'mat_picmip': '2', 'particle_cpu_level': '1', 'r_createmodeldecals': '1', 'r_decals': '64', 'r_lod_switch_scale': '0.8', 'shadow_depth_dimen_min': '256', 'shadow_depth_upres_factor_max': '1', 'shadow_enable': '1', 'shadow_maxdynamic': '1', 'ssao_quality': '0', 'stream_memory': '600000', 'volumetric_fog': '0', 'volumetric_lighting': '0'},
    },
    {
      id: 'ultra',
      fr: ['Ultra', 'Tout au maximum : ombres, éclairage volumétrique, SSAO, textures 8 Go.'],
      en: ['Ultra', 'Everything maxed: shadows, volumetric lighting, SSAO, 8 GB textures.'],
      settings: {'cl_gib_allow': '1', 'cl_particle_fallback_base': '0', 'cl_particle_fallback_multiplier': '1', 'cl_ragdoll_maxcount': '8', 'cl_ragdoll_self_collision': '1', 'csm_cascade_res': '1024', 'csm_coverage': '2', 'csm_enabled': '1', 'dvs_enable': '0', 'dynamic_streaming_budget': '1', 'fadeDistScale': '2', 'map_detail_level': '2', 'mat_antialias_mode': '12', 'mat_forceaniso': '16', 'mat_mip_linear': '1', 'mat_picmip': '0', 'particle_cpu_level': '2', 'r_createmodeldecals': '1', 'r_decals': '256', 'r_lod_switch_scale': '2.0', 'shadow_depth_dimen_min': '512', 'shadow_depth_upres_factor_max': '3', 'shadow_enable': '1', 'shadow_maxdynamic': '4', 'ssao_quality': '4', 'stream_memory': '3000000', 'volumetric_fog': '1', 'volumetric_lighting': '1'},
    },
  ];

  // ---- quick binds (every key triggers ONE normal game command — no macros)
  ST.QUICK_BINDS = [
    {
      id: 'tapstrafe',
      fr: ['Tap strafe — molette = avancer (2 sens)', 'Molette haut ET bas = avancer (+forward). La touche W reste inchangée : tu peux « scroller » pendant que tu tiens A/D.'],
      en: ['Tap strafe — wheel = forward (both ways)', 'Wheel up AND down = forward (+forward). W stays untouched so you can scroll while holding A/D.'],
      binds: { MWHEEL_UP: '+forward', MWHEEL_DOWN: '+forward' },
    },
    {
      id: 'tapstrafe_jump',
      fr: ['Tap strafe — molette haut = avancer, bas = saut', 'Variante : molette haut = avancer, molette bas = saut (+jump).'],
      en: ['Tap strafe — wheel up = forward, down = jump', 'Variant: wheel up = forward, wheel down = jump (+jump).'],
      binds: { MWHEEL_UP: '+forward', MWHEEL_DOWN: '+jump' },
    },
    {
      id: 'scrolljump',
      fr: ['Scroll jump — molette bas = saut', 'Ajoute le saut sur la molette (en plus de ta touche) : pratique pour enchaîner les sauts (slidehop, bunny hop) et répéter un timing très régulier.'],
      en: ['Scroll jump — wheel down = jump', 'Adds jump on the mouse wheel (in addition to your key): handy for chaining jumps (slidehop, bunny hop) with very regular timing.'],
      binds: { MWHEEL_DOWN: '+jump' },
    },
    {
      id: 'superglide',
      fr: ['Superglide — saut molette bas + accroupi souris 4', 'Sépare le saut et l\'accroupi sur deux zones distinctes (molette / bouton latéral) pour mieux contrôler l\'écart d\'une frame. Tes touches actuelles restent actives.'],
      en: ['Superglide — wheel-down jump + mouse 4 crouch', 'Splits jump and crouch onto two distinct areas (wheel / side button) to control the one-frame gap better. Your current keys stay active.'],
      binds: { MWHEEL_DOWN: '+jump', MOUSE4: '+duck' },
    },
  ];
  ST.COMMON_CMDS = ['+forward', '+back', '+moveleft', '+moveright', '+jump', '+duck', '+speed', '+use', '+reload', '+attack', '+zoom', '+ability 1', '+ability 2', '+ability 3', '+scriptcommand1', '+; gameui_hide'];
  ST.HUD_CMD = '+; gameui_hide';
})();

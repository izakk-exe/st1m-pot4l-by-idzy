/* ST1M PORT4L — pro player profiles + stretched-resolution profiles.
 * Every value is transcribed from the player's public ProSettings.net page (re-read on 2026-10-07; the page's own
 * "last updated" date is kept in `upd`). Pros change settings often: treat these as a starting point.
 * Only KEYBOARD + MOUSE players are listed (a controller player's mouse/key settings would be meaningless):
 * The first two cards are special: `1Z4K` is the app owner's own profile (exact values from their config files)
 * and `HugoWolfy` comes from his own Discord posts (screenshots supplied by the owner, dated 2023).
 * ImperialHal is deliberately NOT listed — he plays on controller (his ProSettings page still shows old KBM data).
 *
 * Each player stores the page values in a neutral form (`g` = graphics, `b` = binds); `ST.proBuild(p)` turns them
 * into exact Apex settings and reports what it could NOT map (shown to the user, never guessed). */
(function () {
  const ST = (window.ST = window.ST || {});

  const NV = [
    'Low Latency Mode: Ultra · Power management: Prefer maximum performance · Max frame rate: Off',
    'Vertical sync: Off · Triple buffering: Off · Monitor technology: Fixed Refresh · Shader cache: 10 GB',
    'Anisotropic filtering: Off · Anisotropic sample optimization: Off · Trilinear optimization: On · Negative LOD bias: Allow · Filtering quality: Quality',
    'Antialiasing (FXAA, mode): Off · Ambient occlusion: Off · Image scaling: Off · DSR: Off · Background app max frame rate: 30 FPS',
    'Desktop colour: Brightness 75% · Contrast 85% · Gamma 2.02 · Digital vibrance 100% · Hue 0°',
  ];

  ST.PROS = [
    { id: '1z4k', name: '1Z4K', mine: true, upd: '2026-10-07', src: null, srcLabel: 'profile.cfg / settings.cfg / videoconfig.txt', kind: 'mine',
      res: [1720, 1440], fov: 120, dpi: null, sens: 0.54, ads: 1.1, poll: null, reticle: '255 0 255', reticleAlt: '217 148 255',
      keys: 'Jump Space + Wheel↑ · Crouch C + L-Ctrl · Forward on Wheel↓ · Sprint L-Shift', gpu: NV,
      raw: {
        v: { cl_gib_allow: '0', cl_particle_fallback_base: '-1', cl_particle_fallback_multiplier: '-1', cl_ragdoll_maxcount: '0', cl_ragdoll_self_collision: '0', mat_forceaniso: '0', mat_mip_linear: '0', stream_memory: '0', mat_picmip: '0', particle_cpu_level: '0', r_createmodeldecals: '0', r_decals: '0', r_lod_switch_scale: '0.3', shadow_enable: '0', shadow_depth_dimen_min: '0', shadow_depth_upres_factor_max: '0', shadow_maxdynamic: '0', ssao_quality: '0', dvs_enable: '0', defaultres: '1720', defaultresheight: '1440', fullscreen: '1', nowindowborder: '1', volumetric_lighting: '0', volumetric_fog: '0', mat_vsync_mode: '0', mat_backbuffer_count: '0', mat_antialias_mode: '0', csm_enabled: '0', csm_coverage: '1', csm_cascade_res: '0', fadeDistScale: '1', dynamic_streaming_budget: '1', gamma: '0.853217', map_detail_level: '0' },
        x: { gfx_nvnUseLowLatency: '1', gfx_nvnUseLowLatencyBoost: '1' },
        xp: { fov_disableAbilityScaling: '1' },
        binds: { 1: 'weaponSelectPrimary0', 2: 'weaponSelectPrimary1', 3: 'weaponSelectPrimary2', 4: '+scriptCommand4', 5: 'use_consumable HEALTH_SMALL', 6: '+scriptCommand5', A: '+moveleft', B: '+offhand4', C: '+duck', D: '+moveright', E: '+use; +use_long', F: 'weapon_inspect', G: '+ping', H: '+scriptCommand6', N: 'chat_wheel', O: '+; gameui_hide', Q: 'use_consumable SHIELD_SMALL', R: '+reload', S: '+backward', T: 'weaponSelectOrdnance', V: '+melee', W: '+forward', X: '+scriptcommand3', Y: '+use_alt', Z: '+pushtotalk', ENTER: 'say_team', SPACE: '+jump', TAB: 'toggle_map', ESCAPE: 'ingamemenu_activate', LSHIFT: '+speed', LALT: 'toggle_inventory', LCTRL: '+duck', F2: '+scriptCommand7', MOUSE1: '+attack', MOUSE2: '+zoom', MOUSE4: '+offhand1', MOUSE5: '+dodge', MWHEELUP: '+jump', MWHEELDOWN: '+forward' },
        skipped: ['Mouse sensitivity 0.54 and 1x-scope multiplier 1.1 (never written)', 'Sprint view shake style 1', 'Laser sight colour (magenta)', 'Sound volumes, gamepad, voice and HUD settings', 'Held-key binds (hold variants)'],
      } },
    { id: 'hugowolfy', name: 'HugoWolfy', upd: '2023-04-15', src: null, srcLabel: 'his Discord posts (screenshots)', kind: 'movement',
      res: null, fov: 120, dpi: 3200, sens: 0.64, ads: null, poll: null, old: true,
      keys: 'Not listed in the screenshots', gpu: null,
      launch: '+fps_max 199 -fullscreen -forcenovsync -preload -high -novid -cl_fovScale 1.7 -multiple -no_render_on_input_thread +mat_letterbox_aspect_goal 0 +mat_letterbox_aspect_threshold 0 +building_cubemaps 1',
      monitor: '240 Hz · GameVisual: User Mode · Shadow Boost: Level 3 · Contrast 55 · VividPixel 80 · Brightness 41 · Saturation 60 · Wide Gamut · Gamma 2.2 · 6500K · Reds 40',
      raw: {
        v: { mat_vsync_mode: '0', fullscreen: '1' }, x: {}, xp: {}, binds: {},
        skipped: ['Resolution: not shown (he teaches 1440×1080 in a TikTok guide, but no page states what he plays)', 'Graphics, keys: not shown', 'FOV 120 comes from his launch option -cl_fovScale 1.7', 'Data is from April 2023'],
      } },
    { id: 'shroud', name: 'shroud', upd: '2026-10-05', src: 'https://prosettings.net/players/shroud/', kind: 'all-round',
      res: [1920, 1080], asp: '16:9', fov: 103, dpi: 800, sens: 1.5, ads: 1, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'tsaa', tex: '8gb', filter: 'aniso16', ao: 'high', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'low', vol: 0, model: 'high', fx: 'high', marks: 'high', rag: 'high', bright: 50 },
      b: { LCTRL: '+duck', SPACE: '+jump', LSHIFT: '+speed', Q: '+ability 1' }, keys: 'Jump Space · Crouch L-Ctrl · Ult Y/Z' },
    { id: 'faide', name: 'Faide', upd: '2026-08-31', src: 'https://prosettings.net/players/faide/', kind: 'movement',
      res: [2560, 1440], asp: '16:10', fov: 110, dpi: 1700, sens: 0.8, ads: 1, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: '3gb', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'low', vol: 0, model: 'high', fx: 'low', marks: 'off', rag: 'low', bright: 72 },
      b: { LCTRL: '+duck', SPACE: '+jump', LSHIFT: '+speed', Q: '+ability 1', Z: '+ability 3' }, keys: 'Jump Space · Crouch L-Ctrl · Ult Z' },
    { id: 'lyr1c', name: 'lyr1c', upd: '2026-07-27', src: 'https://prosettings.net/players/lyr1c/', kind: 'movement',
      res: [1728, 1080], asp: '16:10', fov: 110, dpi: 1600, sens: 0.6, ads: 1, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: '8gb', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'off', vol: 0, model: 'low', fx: 'low', marks: 'off', rag: 'low', bright: 76 },
      b: { LCTRL: '+duck', SPACE: '+jump', MWHEELDOWN: '+jump', LSHIFT: '+speed', Q: '+ability 1' }, keys: 'Jump Space + Wheel↓ · Crouch L-Ctrl · Ult Y/Z' },
    { id: 'iitztimmy', name: 'iiTzTimmy', upd: '2026-08-31', src: 'https://prosettings.net/players/iitztimmy/', kind: 'movement',
      res: [1920, 1080], asp: '16:9', fov: 104, dpi: 1800, sens: 0.9, ads: 1.05, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: '2gb', filter: 'aniso16', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'off', vol: 0, model: 'low', fx: 'low', marks: 'low', rag: 'low', bright: 50 },
      b: { C: '+duck', MWHEELDOWN: '+jump', LSHIFT: '+speed', 3: '+ability 1', 4: '+ability 3' }, keys: 'Jump Wheel↓ · Crouch C · Tactical 3 · Ult 4' },
    { id: 'taxi2g', name: 'Taxi2g', upd: '2026-08-03', src: 'https://prosettings.net/players/taxi2g/', kind: 'movement',
      res: [1920, 1080], asp: '16:9', fov: 110, dpi: 1600, sens: 0.432955, ads: 1, poll: 1000,
      g: { vsync: 0, reflex: 'off', aa: 'none', tex: 'none', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'off', vol: 0, model: 'low', fx: 'low', marks: 'off', rag: 'low', bright: 50 },
      b: { LCTRL: '+duck', SPACE: '+jump', LSHIFT: '+speed', Q: '+ability 1' }, keys: 'Jump Space · Crouch L-Ctrl · Ult Y/Z' },
    { id: 'albralelie', name: 'Albralelie', upd: '2026-08-31', src: 'https://prosettings.net/players/albralelie/', kind: 'all-round',
      res: [1920, 1080], asp: '16:9', fov: 104, dpi: 800, sens: 1.0, ads: 1, poll: 1000,
      g: { fovAbility: 'unlisted', vsync: 0, aa: 'none', tex: '6gb', filter: 'aniso16', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'low', vol: 0, model: 'low', fx: 'low', marks: 'off', rag: 'low' },
      b: { LCTRL: '+duck', SPACE: '+jump', LSHIFT: '+speed', Q: '+ability 1' }, keys: 'Jump Space · Crouch L-Ctrl · Ult Y/Z' },
    { id: 'leamonhead', name: 'Leamonhead', upd: '2026-08-03', src: 'https://prosettings.net/players/leamonhead/', kind: 'movement',
      res: null, asp: '16:9', fov: 120, dpi: 800, sens: 1.4, ads: 0.9, poll: 4000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: '2gb', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'low', vol: 0, model: 'low', fx: 'low', marks: 'off', rag: 'low', bright: 80 },
      b: { V: '+duck', SPACE: '+jump', MWHEELDOWN: '+jump', LSHIFT: '+speed', Q: '+ability 1', MOUSE5: '+ability 3' }, keys: 'Jump Space + Wheel↓ · Crouch V · Ult Mouse5' },
    { id: 'yukaf', name: 'YukaF', upd: '2026-08-03', src: 'https://prosettings.net/players/yukaf/', kind: 'movement',
      res: [1728, 1080], asp: '16:10', fov: 110, dpi: 1200, sens: 0.74, ads: 1, poll: 1000,
      g: { bright: 50 },
      b: { LCTRL: '+duck', SPACE: '+jump', LSHIFT: '+speed', Q: '+ability 1' }, keys: 'Jump Space · Crouch L-Ctrl · Ult Y/Z', note: 'Page lists no advanced video settings.' },
    { id: 'mande', name: 'Mande', upd: '2025-12-15', src: 'https://prosettings.net/players/mande/', kind: 'movement',
      res: [1920, 1080], asp: '16:9', fov: 110, dpi: 800, sens: 1.5, ads: 1, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: 'low23', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'low', vol: 0, model: 'low', fx: 'low', marks: 'off', rag: 'low', bright: 50 },
      b: { LCTRL: '+duck', MWHEELUP: '+jump', LSHIFT: '+speed', Q: '+ability 1' }, keys: 'Jump Wheel↑ · Crouch L-Ctrl · Ult Y/Z' },
    { id: 'aceu', name: 'aceu', upd: '2026-08-10', src: 'https://prosettings.net/players/aceu/', kind: 'all-round',
      res: [1920, 1080], asp: '16:9', fov: 110, dpi: 1600, sens: 0.9, ads: 1, poll: 4000,
      g: { vsync: 0, reflex: 'off', aa: 'none', tex: '8gb', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'off', vol: 0, model: 'low', fx: 'low', marks: 'off', rag: 'low', bright: 65 },
      b: { LCTRL: '+duck', MWHEELDOWN: '+jump', LSHIFT: '+speed', Q: '+ability 1' }, keys: 'Jump Wheel↓ · Crouch L-Ctrl · Ult Y/Z' },
    { id: 'stormen', name: 'Stormen', upd: '2025-12-15', src: 'https://prosettings.net/players/stormen/', kind: 'movement',
      res: [1920, 1080], asp: '16:9', fov: 110, dpi: 1600, sens: 0.65, ads: 1, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: '2gb', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'off', vol: 0, model: 'medium', fx: 'low', marks: 'off', rag: 'low', bright: 50 },
      b: { C: '+duck', SPACE: '+jump', MWHEELDOWN: '+jump', LSHIFT: '+speed', Q: '+ability 1', T: '+ability 3' }, keys: 'Jump Space + Wheel↓ · Crouch C · Ult T' },
    { id: 'zer0', name: 'Zer0', upd: '2026-07-27', src: 'https://prosettings.net/players/zer0/', kind: 'stretched',
      res: [1440, 1080], asp: '4:3', fov: 110, dpi: 1600, sens: 0.6, ads: 1, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: '4gb', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'off', vol: 0, model: 'high', fx: 'low', marks: 'off', rag: 'low', bright: 50 },
      b: { J: '+duck', SPACE: '+jump', MWHEELUP: '+jump', LSHIFT: '+speed', MOUSE5: '+ability 1', MOUSE4: '+ability 3' }, keys: 'Jump Space + Wheel↑ · Crouch J · Tactical Mouse5 · Ult Mouse4' },
    { id: 'crylix', name: 'Crylix', upd: '2026-07-01', src: 'https://prosettings.net/players/crylix/', kind: 'stretched',
      res: [1920, 1440], asp: '4:3', fov: 110, dpi: 800, sens: 1.1, ads: 1, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: '2gb', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'off', vol: 0, model: 'low', fx: 'low', marks: 'off', rag: 'low', bright: 50 },
      b: { LCTRL: '+duck', C: '+duck', SPACE: '+jump', MWHEELDOWN: '+jump', LSHIFT: '+speed', MOUSE4: '+ability 1', Q: '+ability 1' }, keys: 'Jump Space + Wheel↓ · Crouch L-Ctrl + C · Tactical Mouse4 + Q · Ult Y/Z' },
    { id: 'hakis', name: 'Hakis', upd: '2026-07-01', src: 'https://prosettings.net/players/hakis/', kind: 'stretched',
      res: [1680, 1050], asp: '16:10', fov: 104, dpi: 1600, sens: 0.8, ads: 1.3, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: '8gb', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'off', vol: 0, model: 'low', fx: 'low', marks: 'off', rag: 'low', bright: 50 },
      b: { LCTRL: '+duck', SPACE: '+jump', MWHEELUP: '+jump', LSHIFT: '+speed', Q: '+ability 1' }, keys: 'Jump Space + Wheel↑ · Crouch L-Ctrl · Ult Y/Z' },
    { id: 'apryze', name: 'Apryze', upd: '2026-08-31', src: 'https://prosettings.net/players/apryze/', kind: 'stretched',
      res: [1680, 1050], asp: '16:10', fov: 110, dpi: 800, sens: 1.2, ads: 0.9, poll: 1000,
      g: { vsync: 0, reflex: 'boost', aa: 'none', tex: '2gb', filter: 'bilinear', ao: 'off', sunCov: 'low', sunDet: 'low', dyn: 0, spot: 'off', vol: 0, model: 'low', fx: 'low', marks: 'off', rag: 'low', bright: 52 },
      b: { LCTRL: '+duck', SPACE: '+jump', MWHEELDOWN: '+jump', LSHIFT: '+speed', Q: '+ability 1', Z: '+ability 3' }, keys: 'Jump Space + Wheel↓ · Crouch L-Ctrl · Ult Z' },
  ];

  const TEX = { none: ['0', 'None'], '2gb': ['160000', '2 GB'], '3gb': ['600000', '3 GB'], '4gb': ['1000000', '4 GB'], '6gb': ['2000000', '6 GB'], '8gb': ['3000000', '8 GB'] };
  const LBL = { tex: 'Texture streaming', model: 'Model detail', fx: 'Effects detail', marks: 'Impact marks', rag: 'Ragdolls', bright: 'Brightness', spot: 'Spot shadow detail', filter: 'Texture filtering', ao: 'Ambient occlusion' };

  /* -> { v: videoconfig raw keys, x: settings.cfg raw keys, binds, applied: n, skipped: [text] } */
  ST.proBuild = (p) => {
    if (p.raw) return { v: Object.assign({}, p.raw.v), x: Object.assign({}, p.raw.x), xp: Object.assign({}, p.raw.xp), binds: Object.assign({}, p.raw.binds), applied: Object.keys(p.raw.v).length + Object.keys(p.raw.x).length + Object.keys(p.raw.xp).length, skipped: p.raw.skipped || [] };
    const g = p.g || {}, v = {}, x = {}, xp = {}, skipped = [];
    let n = 0; const set = (o, k, val) => { o[k] = val; n++; };
    if (p.res) { set(v, 'defaultres', String(p.res[0])); set(v, 'defaultresheight', String(p.res[1])); }
    set(v, 'fullscreen', '1');
    if (g.fovAbility !== 'unlisted') set(xp, 'fov_disableAbilityScaling', '1');
    if (g.vsync === 0) set(v, 'mat_vsync_mode', '0');
    if (g.reflex === 'off') { set(x, 'gfx_nvnUseLowLatency', '0'); }
    else if (g.reflex === 'on') { set(x, 'gfx_nvnUseLowLatency', '1'); set(x, 'gfx_nvnUseLowLatencyBoost', '0'); }
    else if (g.reflex === 'boost') { set(x, 'gfx_nvnUseLowLatency', '1'); set(x, 'gfx_nvnUseLowLatencyBoost', '1'); }
    if (g.aa === 'none') set(v, 'mat_antialias_mode', '0'); else if (g.aa === 'tsaa') set(v, 'mat_antialias_mode', '12');
    if (g.tex && TEX[g.tex]) set(v, 'stream_memory', TEX[g.tex][0]); else if (g.tex) skipped.push(LBL.tex + ': ' + (g.tex === 'low23' ? 'Low (2-3 GB, ambiguous)' : g.tex));
    if (g.filter === 'bilinear') { set(v, 'mat_forceaniso', '0'); set(v, 'mat_mip_linear', '0'); } else if (g.filter === 'aniso16') set(v, 'mat_forceaniso', '16');
    if (g.ao === 'off') set(v, 'ssao_quality', '0'); else if (g.ao === 'high') set(v, 'ssao_quality', '4');
    if (g.sunCov === 'low') set(v, 'csm_coverage', '1');
    if (g.sunDet === 'low') set(v, 'csm_cascade_res', '128');
    if (g.dyn === 0) set(v, 'shadow_enable', '0');
    if (g.dyn === 0 && g.spot) skipped.push(LBL.spot + ': ' + g.spot + ' (moot while dynamic spot shadows are off)');
    if (g.vol === 0) set(v, 'volumetric_lighting', '0');
    if (g.model === 'low') set(v, 'r_lod_switch_scale', '0.6'); else if (g.model) skipped.push(LBL.model + ': ' + g.model);
    if (g.fx === 'low') set(v, 'particle_cpu_level', '0'); else if (g.fx === 'high') set(v, 'particle_cpu_level', '2'); else if (g.fx) skipped.push(LBL.fx + ': ' + g.fx);
    if (g.marks === 'off') { set(v, 'r_createmodeldecals', '0'); set(v, 'r_decals', '0'); } else if (g.marks) skipped.push(LBL.marks + ': ' + g.marks);
    if (g.rag) skipped.push(LBL.rag + ': ' + g.rag);
    if (g.bright) skipped.push(LBL.bright + ': ' + g.bright + '%');
    return { v, x, xp, binds: Object.assign({}, p.b), applied: n, skipped };
  };

  // Portraits: loaded online from each player's ProSettings.net sheet (nothing is stored in this repo); initials are shown when unavailable.
  const PHOTO_EXT = { shroud: 'png', faide: 'png', lyr1c: 'png', iitztimmy: 'png', taxi2g: 'png', albralelie: 'png', leamonhead: 'png', yukaf: 'png', mande: 'png', aceu: 'png', stormen: 'png', zer0: 'png', hakis: 'webp', apryze: 'jpg' };
  ST.PROS.forEach((p) => { if (PHOTO_EXT[p.id]) p.photo = 'https://prosettings.net/wp-content/uploads/' + p.id + '-220x220-fitcontain-q99-gb283-s1.' + PHOTO_EXT[p.id]; });
  ST.PROS.find((p) => p.id === '1z4k').photo = 'img/logo.svg';

  // Stretched-resolution profiles. `pros` = players above who use that exact resolution (from their pages).
  ST.STRETCH = [
    { id: 's1440x1080', w: 1440, h: 1080, asp: '4:3', fr: 'Le classique 4:3 : cibles plus larges, FPS en hausse.', en: 'The 4:3 classic: wider targets, higher FPS.', pros: ['Zer0'] },
    { id: 's1280x960', w: 1280, h: 960, asp: '4:3', fr: '4:3 léger pour PC modestes : très gros gain de FPS.', en: 'Light 4:3 for modest PCs: big FPS gain.', pros: [] },
    { id: 's1600x1200', w: 1600, h: 1200, asp: '4:3', fr: '4:3 intermédiaire entre 1440×1080 et 1920×1440.', en: '4:3 between 1440×1080 and 1920×1440.', pros: [] },
    { id: 's1920x1440', w: 1920, h: 1440, asp: '4:3', fr: '4:3 haute définition (écran 1440p ou GPU puissant).', en: 'High-definition 4:3 (1440p panel or strong GPU).', pros: ['Crylix'] },
    { id: 's1728x1080', w: 1728, h: 1080, asp: '16:10', fr: '16:10 : étirement discret, garde un large champ de vision.', en: '16:10: subtle stretch that keeps a wide field of view.', pros: ['lyr1c', 'YukaF'] },
    { id: 's1680x1050', w: 1680, h: 1050, asp: '16:10', fr: '16:10 standard (très souvent exposé par les pilotes).', en: 'Standard 16:10 (very often exposed by drivers).', pros: ['Hakis', 'Apryze'] },
    { id: 's2560x1600', w: 2560, h: 1600, asp: '16:10', fr: '16:10 pour écran 1440p.', en: '16:10 for a 1440p panel.', pros: [] },
  ];
})();

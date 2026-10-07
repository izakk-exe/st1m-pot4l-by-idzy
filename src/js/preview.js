/* ST1M PORT4L — settings previews.
 * Drag-to-compare widget on REAL in-game captures (previews/<settingId>_<value>.webp, from the MIT-licensed
 * Config Editor project). Users can add their own captures: src/previews/<settingId>_<value>.webp or .jpg.
 * A setting only gets a Preview button when at least two captures exist for it. */
(function () {
  const ST = (window.ST = window.ST || {});
  // ---- drag-to-compare widget. a / b: { label } ; imgs: { a, b } image URLs
  ST.mountCompare = (host, a, b, imgs) => {
    host.classList.add('cmp'); host.innerHTML = '';
    const mk = (url, cls) => { const im = document.createElement('img'); im.src = url; im.className = cls; im.draggable = false; host.appendChild(im); return im; };
    const A = mk(imgs.a, 'base'), Bv = mk(imgs.b, 'top');
    host.insertAdjacentHTML('beforeend', `<div class="bar"></div><span class="lab l">${a.label}</span><span class="lab r">${b.label}</span>`);
    const bar = host.querySelector('.bar');
    const set = (pct) => { pct = Math.max(0, Math.min(100, pct)); Bv.style.clipPath = `inset(0 0 0 ${pct}%)`; bar.style.left = pct + '%'; };
    const move = (e) => { const r = host.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    host.onpointerdown = (e) => { host.setPointerCapture(e.pointerId); move(e); host.onpointermove = move; };
    host.onpointerup = () => { host.onpointermove = null; };
    set(50);
  };

  // ---- real in-game captures (previews/<id>_<value>.webp, from the MIT-licensed Config Editor project)
  ST.IMGS = new Set(["csm_cascade_res_1024", "csm_cascade_res_128", "csm_cascade_res_512", "csm_coverage_1", "csm_coverage_2", "csm_enabled_0", "csm_enabled_1", "map_detail_level_1", "map_detail_level_2", "mat_antialias_mode_0", "mat_antialias_mode_12", "mat_forceaniso_0", "mat_forceaniso_16", "mat_forceaniso_2", "mat_forceaniso_8", "preset_balanced", "preset_competitive", "preset_ultra", "r_createmodeldecals_0", "r_createmodeldecals_1", "r_decals_128", "r_decals_256", "r_decals_64", "r_lod_switch_scale_0.6", "r_lod_switch_scale_0.8", "r_lod_switch_scale_1.0", "r_lod_switch_scale_1.5", "r_lod_switch_scale_2.0", "ssao_quality_0", "ssao_quality_4", "stream_memory_0", "stream_memory_1000000", "stream_memory_160000", "stream_memory_2000000", "stream_memory_3000000", "stream_memory_600000", "volumetric_lighting_0", "volumetric_lighting_1"]);
  const numForms = (v) => [String(v)].concat(isFinite(Number(v)) ? [Number(v).toFixed(1), String(Number(v))] : []);
  ST.imgUrl = (id, v) => { for (const f of numForms(v)) if (ST.IMGS.has(`${id}_${f}`)) return `previews/${id}_${f}.webp`; return null; };
  ST.imgValues = (id) => [...ST.IMGS].filter((n) => n.startsWith(id + '_')).map((n) => n.slice(id.length + 1))
    .filter((v) => v !== '' && !/^[a-z]/i.test(v)).map((v) => (isFinite(Number(v)) ? String(Number(v)) : v));
  const tryImg = (url) => new Promise((res) => { const i = new Image(); i.onload = () => res(url); i.onerror = () => res(null); i.src = url; });
  // built-in capture, else a user-supplied one (.webp / .jpg dropped in previews/)
  ST.resolveImg = async (id, v) => ST.imgUrl(id, v) || (await tryImg(`previews/${id}_${v}.webp`)) || (await tryImg(`previews/${id}_${v}.jpg`));
  ST.loadOverrides = async (id, va, vb) => {
    const [a, b] = await Promise.all([ST.resolveImg(id, va), ST.resolveImg(id, vb)]);
    return a && b ? { a, b } : null;
  };

  // ---- "what changes" explanations
  ST.FX = {
    ssao_quality: ['Ajoute de l\'ombre dans les recoins et à la base des murs/caisses : plus de relief, mais ça coûte du GPU.', 'Adds shading in corners and at the base of walls/crates: more depth, but costs GPU.'],
    mat_antialias_mode: ['Lisse les bords crénelés des objets (escaliers sur les diagonales). Désactivé = image plus nette mais crantée.', 'Smooths jagged object edges. Off = sharper but stair-stepped.'],
    stream_memory: ['Mémoire vidéo réservée aux textures. « Aucun » libère de la VRAM mais les textures peuvent apparaître en retard (pop-in).', 'VRAM reserved for textures. “None” frees VRAM but textures may pop in late.'],
    mat_picmip: ['Résolution des textures du sol et des murs : plus bas = textures floues/pixelisées mais moins de VRAM.', 'Resolution of ground and wall textures: lower = blurrier/blockier but less VRAM.'],
    mat_forceaniso: ['Netteté du sol vu de biais : à 16x le sol lointain reste précis, sans filtrage il devient flou.', 'Sharpness of ground seen at an angle: 16x keeps distant ground crisp, off makes it blurry.'],
    mat_mip_linear: ['Adoucit la transition entre niveaux de détail : désactivé = bandes visibles sur le sol.', 'Smooths transitions between detail levels: off = visible bands on the ground.'],
    shadow_enable: ['Ombres des personnages et objets mobiles : sans elles les ennemis « flottent » mais le gain de FPS est important.', 'Shadows of characters and moving objects: without them enemies “float” but FPS gain is big.'],
    shadow_maxdynamic: ['Nombre d\'entités qui projettent une ombre dynamique en même temps.', 'How many entities cast a dynamic shadow at once.'],
    shadow_depth_dimen_min: ['Résolution minimale des ombres dynamiques (bords plus ou moins doux).', 'Minimum dynamic shadow resolution (softer or sharper edges).'],
    shadow_depth_upres_factor_max: ['Netteté maximale des ombres proches.', 'Maximum sharpness of nearby shadows.'],
    csm_enabled: ['Ombres du soleil : les bâtiments projettent de longues ombres. Les couper donne beaucoup de FPS et supprime les zones sombres où se cacher.', 'Sun shadows: buildings cast long shadows. Turning them off gives lots of FPS and removes dark hiding spots.'],
    csm_coverage: ['Distance jusqu\'à laquelle les ombres du soleil sont affichées (les bâtiments lointains perdent leur ombre en « Bas »).', 'How far sun shadows are drawn (far buildings lose their shadow on “Low”).'],
    csm_cascade_res: ['Netteté du bord des ombres du soleil : 256 = bords flous, 2048 = bords nets.', 'Edge sharpness of sun shadows: 256 = blurry, 2048 = crisp.'],
    particle_cpu_level: ['Quantité de particules (étincelles, fumée) lors des explosions et tirs.', 'Amount of particles (sparks, smoke) from explosions and gunfire.'],
    cl_gib_allow: ['Fragments visuels qui volent lors des destructions.', 'Visual fragments flying off on destruction.'],
    volumetric_lighting: ['Rayons de lumière visibles dans l\'air (« god rays »).', 'Visible light shafts in the air (“god rays”).'],
    volumetric_fog: ['Brume qui masque le lointain : coûteuse et peut gêner la visibilité.', 'Haze that hides the distance: costly and can hurt visibility.'],
    r_createmodeldecals: ['Marques d\'impact visibles sur les murs et les corps.', 'Visible bullet marks on walls and bodies.'],
    r_decals: ['Nombre maximal d\'impacts gardés à l\'écran.', 'Maximum number of impact marks kept on screen.'],
    r_lod_switch_scale: ['Distance à laquelle les petits objets passent en version simplifiée ou disparaissent : plus haut = plus de détails au loin.', 'Distance at which small objects switch to simplified models or vanish: higher = more far detail.'],
    fadeDistScale: ['Distance d\'apparition des petits objets (caisses, débris).', 'Distance at which small objects (crates, debris) appear.'],
    map_detail_level: ['Quantité de petits objets de décor sur la carte.', 'Amount of small scenery objects on the map.'],
    fov: ['Champ de vision : plus large = tu vois plus sur les côtés mais les cibles paraissent plus petites.', 'Field of view: wider = you see more at the sides but targets look smaller.'],
    reticle: ['Couleur du réticule affichée au centre de l\'écran.', 'Colour of the crosshair at screen centre.'],
    gamma: ['Luminosité globale : plus clair aide à repérer dans les zones sombres.', 'Overall brightness: brighter helps spotting in dark areas.'],
  };
  ST.hasPreview = (id) => !!ST.FX[id] && ST.imgValues(id).length >= 2;
})();

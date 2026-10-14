/* ST1M PORT4L landing — page interactions (the 3D logo lives in logo3d.js). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REPO = 'izakk-exe/st1m-pot4l-by-idzy';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- i18n: English lives in the HTML, French here */
  const FR = {
    nav1: '[ Fonctions ]', nav2: '[ Movement Lab ]', nav3: '[ 3 clics ]', nav4: '[ Confiance ]', navdl: 'Télécharger',
    htag: '[ Éditeur de config · Apex Legends ] &nbsp; [ Setup S-tier ]',
    hh: 'Ton setup Apex, à travers le vide.',
    hp: 'Débloque ce que le jeu cache : profils de pros, résolution étirée sans bandes noires et un vrai labo de movement — dans un seul launcher.',
    s1: 'Version', s2: 'Système', s3: 'Prix', s3v: 'Gratuit', s3w: 'Open source',
    cta1: 'Télécharger pour Windows', cta2: 'Gratuit', scroll: 'Défiler',
    fh: 'Dans le launcher', fmeta: 'Éditeur de config<br>Outils compétitifs<br>Labo de movement<br>Zéro injection',
    f0: 'Tout', f2: 'Ranked',
    c0d: "Plus de 40 réglages absents du menu d'Apex. Tu relis chaque changement avant de l'appliquer, et tu peux tout annuler.",
    c1t: 'Profils de pros', c1d: '15 setups clavier-souris — Faide, iiTzTimmy, YukaF…',
    c2t: 'Résolution étirée', c2d: '4:3 / 16:10 sans bandes noires. Sans commande Steam.',
    c3t: 'Avant / après', c3d: 'Compare chaque réglage sur de vraies captures en jeu.',
    c4t: 'Catalogue movement', c4d: '287 techniques, affichées avec tes propres touches.',
    c5t: 'Superglide trainer', c5d: "L'écart saut → accroupi mesuré en frames.",
    c6t: 'Packs de binds', c6d: 'Tap strafe, scroll jump… en un clic, sans macro.',
    c7t: 'Road to Predator', c7d: "Rang, historique de RP et l'écart avec le cut-off.",
    c8t: 'Parcours', c8d: '6 étapes, XP et badges : Rookie → Apex Mover.',
    st1: 'techniques de movement', st2: 'réglages cachés', st3: 'profils de pros', st4: 'macro · pub · compte',
    mh: 'Bouge comme si tu phasais.',
    mp: "Un catalogue de 287 techniques, un parcours d'apprentissage et des trainers qui mesurent tes vrais inputs. Ils lisent — ils n'envoient jamais rien au jeu.",
    m1t: 'Superglide trainer', m1d: 'Écart à la frame près, chance de réussite et raison de ton échec.',
    m2t: 'Tap strafe & rythme de saut', m2d: 'Cadence de molette en ticks par seconde, timing du bunny hop.',
    m3t: 'Overlay clavier & souris', m3d: "Z Q S D s'allument en jeu, un point suit ta visée. Ctrl + Maj + O.",
    m4t: 'Quiz des légendes', m4d: 'La mobilité de chaque légende — trouve celle qui te correspond.',
    kd: 'Essaie — appuie sur W A S D',
    sh: 'En trois clics',
    p1t: 'Télécharge', p1d: "Récupère l'installeur. Il vérifie les mises à jour tout seul.",
    p2t: 'Ferme Apex', p2d: 'Lance ST1M PORT4L — il trouve ta config tout seul.',
    p3t: 'Applique le setup', p3d: 'FOV 120, ombres et textures réglées. Sauvegarde créée, bouton Annuler à portée.',
    th: 'Rien à cacher',
    t1t: 'Ni compte, ni tracking', t1d: "Les seuls appels vont vers GitHub pour les mises à jour et les news — et vers l'API de stats si tu ajoutes ta propre clé.",
    t2t: 'Sauvegardes auto', t2d: 'Avant chaque modification de tes fichiers, avec restauration en un clic.',
    t3t: 'Zéro injection', t3d: "L'appli modifie des fichiers de config, rien d'autre. Chaque touche déclenche une seule commande normale du jeu.",
    t4t: 'Open source', t4d: 'Chaque ligne est lisible sur GitHub, scripts PowerShell compris.',
    dh: 'Entre dans le portail', dp: 'Gratuit, sans pub, et ça le restera. Windows 10 / 11.',
    d1: 'Installeur', d2: 'Portable', d2s: 'Sans installation ni mise à jour auto',
    dn: '<b>« Windows a protégé votre PC » ?</b> Normal — l\'appli n\'est pas signée. Clique sur <i>Informations complémentaires → Exécuter quand même</i>. Tout le code est public.',
    l1: '▶ Essayer la démo web', l3: '☕ Soutenir sur Ko-fi',
    fo1: 'ST1M PORT4L est né<br>au stand de tir,<br>pas en salle de réunion.', fo2: 'Pour ceux qui grimpent.<br>Pas pour la foule.',
    fb1: 'Pensé pour le movement', fb2: 'Taillé pour la ranked', fb3: 'Gratuit pour toujours',
    fo3: "Projet communautaire par idZy — non affilié à EA ni à Respawn. Apex Legends est une marque de ses propriétaires. Modifier des fichiers de config se fait à tes risques."
  };
  const EN = {};
  $$('[data-i18n]').forEach(el => { EN[el.dataset.i18n] ??= el.innerHTML; });

  function split(el) {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'sw';
            const s = document.createElement('span'); s.className = 'si'; s.style.setProperty('--i', i++); s.textContent = part;
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  }
  let lang = 'en';
  function setLang(l) {
    lang = l; document.documentElement.lang = l;
    const dict = l === 'fr' ? FR : EN;
    $$('[data-i18n]').forEach(el => {
      el.innerHTML = dict[el.dataset.i18n] ?? EN[el.dataset.i18n];
      if (el.hasAttribute('data-split')) split(el);
    });
    $$('#lang span').forEach(s => s.classList.toggle('on', s.dataset.l === l));
    try { localStorage.setItem('sp-lang', l); } catch {}
  }
  let saved = null; try { saved = localStorage.getItem('sp-lang'); } catch {}
  setLang(saved || (navigator.language || '').toLowerCase().startsWith('fr') ? (saved || 'fr') : 'en');
  $('#lang').addEventListener('click', () => setLang(lang === 'fr' ? 'en' : 'fr'));

  /* ---------- giant title letters */
  $$('.giant').forEach(g => { let i = 0; $$('.g-w', g).forEach(w => { w.innerHTML = [...w.textContent].map(c => `<span class="ch" style="--i:${i++}">${c}</span>`).join(''); }); });
  addEventListener('wraith:phase', () => { const g = $('.giant.ghost'); g.classList.remove('phase'); void g.offsetWidth; g.classList.add('phase'); });

  /* ---------- preloader: waits for fonts + the 3D scene (or its failure), 4.5 s at most */
  const num = $('#loaderNum'), ring = $('.loader-ring .p');
  let shown = 0, target = 0, ready = 0, done = false;
  const bump = () => { ready++; };
  (document.fonts?.ready || Promise.resolve()).then(bump);
  addEventListener('wraith:ready', bump, { once: true });
  addEventListener('wraith:fail', () => { document.body.classList.add('no3d'); bump(); }, { once: true });
  const t0 = performance.now();
  (function tick() {
    const el = performance.now() - t0;
    target = ready >= 2 || el > 4500 ? 100 : Math.min(88, el / 22);
    shown = Math.min(target, shown + Math.max(1, (target - shown) * .12));
    num.textContent = Math.round(shown); ring.style.setProperty('--o', 100 - shown);
    if (shown >= 100 && !done) {
      done = true;
      setTimeout(() => { document.body.classList.remove('loading'); dispatchEvent(new Event('site:enter')); }, 260);
    } else if (!done) setTimeout(tick, 16);   // timers, not rAF: a tab opened in the background must still finish loading
  })();

  /* ---------- reveals */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-split]:not(.hero-h), .card').forEach(el => io.observe(el));
  $$('.card').forEach((c, i) => c.style.setProperty('--n', i % 5));
  addEventListener('site:enter', () => $('.hero-h').classList.add('in'));

  /* ---------- counters */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || '', s = performance.now(), dur = 1700;
    if (reduced || !to) { el.textContent = to + suf; return; }
    (function f(now) { const p = clamp((now - s) / dur), k = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(to * k) + suf; if (p < 1) requestAnimationFrame(f); })(s);
  }), { threshold: .5 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- hero screenshot carousel */
  const SHOTS = [['home', 'Home'], ['config', 'Config editor'], ['pros', 'Pro profiles'], ['stretch', 'Stretched res'], ['catalogue', 'Movement catalogue'], ['training', 'Superglide trainer'], ['me', 'My Apex profile'], ['legendes', 'Legends & quiz']];
  const sMain = $('.shot.main'), sNext = $('.shot.next'), sBar = $('#shotBar');
  let si = -1;
  const put = (box, name) => { const im = new Image(); im.src = `img/${name}.jpg`; im.alt = ''; im.className = 'enter'; box.append(im); while (box.children.length > 2) box.firstChild.remove(); };
  function nextShot() {
    si = (si + 1) % SHOTS.length;
    put(sMain, SHOTS[si][0]); put(sNext, SHOTS[(si + 1) % SHOTS.length][0]);
    $('#shotCur').textContent = String(si + 1).padStart(2, '0'); $('#shotCap').textContent = SHOTS[si][1];
    sBar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 3800, fill: 'forwards' });
  }
  $('#shotTot').textContent = String(SHOTS.length).padStart(2, '0');
  nextShot(); setInterval(() => { if (!document.hidden) nextShot(); }, 3800);

  /* ---------- filters */
  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    $$('.filters button').forEach(x => x.classList.toggle('on', x === b));
    const f = b.dataset.f;
    $$('#grid .card').forEach(c => c.classList.toggle('off', f !== 'all' && c.dataset.cat !== f));
  }));

  /* ---------- lightbox */
  const lb = $('#lightbox');
  $$('[data-full]').forEach(c => c.addEventListener('click', () => { $('img', lb).src = c.dataset.full; lb.hidden = false; }));
  lb.addEventListener('click', () => { lb.hidden = true; });
  addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });

  /* ---------- keyboard overlay demo */
  const keys = Object.fromEntries($$('#keys kbd').map(k => [k.dataset.k, k]));
  const alias = { z: 'w', q: 'a', arrowup: 'w', arrowleft: 'a', arrowdown: 's', arrowright: 'd' };
  let touched = 0;
  const setKey = (e, on) => { let k = e.key.toLowerCase(); if (!keys[k]) k = alias[k]; if (keys[k]) { keys[k].classList.toggle('on', on); touched = performance.now(); } };
  addEventListener('keydown', e => setKey(e, true)); addEventListener('keyup', e => setKey(e, false));
  addEventListener('blur', () => Object.values(keys).forEach(k => k.classList.remove('on')));
  if (!reduced) setInterval(() => {   // idle demo until the visitor uses their own keyboard
    if (performance.now() - touched < 4000 && touched) return;
    const k = keys['wasd'[Math.random() * 4 | 0]]; k.classList.add('on'); setTimeout(() => k.classList.remove('on'), 260);
    if (Math.random() < .25) { keys[' '].classList.add('on'); setTimeout(() => keys[' '].classList.remove('on'), 180); }
  }, 420);
  const dot = $('#aimDot'); let lx = 0, ly = 0;
  addEventListener('pointermove', e => {
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    const d = Math.hypot(dx, dy); if (d < 2) return;
    dot.style.setProperty('--ax', dx / d * 95 + 'px'); dot.style.setProperty('--ay', dy / d * 95 + 'px');
  }, { passive: true });

  /* ---------- cursor, magnets, tilt */
  if (fine && !reduced) {
    document.documentElement.classList.add('has-cursor');
    const cur = $('#cursor'), cdot = $('i', cur), cring = $('span', cur);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    cur.style.opacity = 0;   // stays hidden until the pointer actually moves
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; cur.style.opacity = 1; }, { passive: true });
    addEventListener('pointerdown', () => cur.classList.add('down')); addEventListener('pointerup', () => cur.classList.remove('down'));
    document.addEventListener('pointerover', e => {
      const l = e.target.closest('[data-cursor]'), a = e.target.closest('a, button, .card');
      cur.classList.toggle('label', !!l); cur.classList.toggle('link', !l && !!a);
      cring.textContent = l ? l.dataset.cursor : '';
    });
    (function loop() { rx = lerp(rx, mx, .17); ry = lerp(ry, my, .17); cdot.style.transform = `translate(${mx}px,${my}px)`; cring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();

    $$('[data-magnet]').forEach(el => {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)'; el.style.transform = ''; setTimeout(() => el.style.transition = '', 600); });
    });
    $$('.card .fig, [data-tilt]').forEach(el => {
      const host = el.closest('.card') || el;
      host.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(900px) rotateY(${x * 13}deg) rotateX(${-y * 13}deg) translateZ(8px)`; });
      host.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- scroll: progress bar, nav, parallax, marquee skew */
  const nav = $('#nav'), bar = $('#progress'), mq = $('.mq-track'), pars = $$('[data-par]').filter(el => !el.hasAttribute('data-tilt'));
  let sy = scrollY, last = scrollY, vel = 0;
  (function frame() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    vel = lerp(vel, y - sy, .12); sy = lerp(sy, y, reduced ? 1 : .12);
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('solid', y > 40);
    if (Math.abs(y - last) > 6) { nav.classList.toggle('hide', y > last && y > innerHeight * .6); last = y; }
    mq.style.setProperty('--vel', clamp(vel * .5, -14, 14).toFixed(2));
    if (!reduced) for (const el of pars) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      el.style.translate = `0 ${((r.top + r.height / 2 - innerHeight / 2) * +el.dataset.par).toFixed(1)}px`;
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- latest release: direct download links, version, download count */
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`).then(r => r.ok ? r.json() : null).then(rel => {
    if (!rel) return;
    const ver = (rel.tag_name || '').replace(/^v/, ''); if (ver) $$('[data-ver]').forEach(el => el.textContent = ver);
    let total = 0;
    for (const a of rel.assets || []) {
      total += a.download_count || 0;
      if (!/\.exe$/i.test(a.name)) continue;
      const kind = /portable/i.test(a.name) ? 'portable' : /setup/i.test(a.name) ? 'setup' : null;
      if (kind) $$(`[data-dl="${kind}"]`).forEach(el => el.href = a.browser_download_url);
    }
    if (total > 20) { const c = $('#dlCount'); c.textContent = `[ ${total.toLocaleString()} downloads · v${ver} ]`; c.hidden = false; }
  }).catch(() => {});
})();

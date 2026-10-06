/* ST1M POT4L — input-timing trainers (they only MEASURE your inputs, nothing is ever sent to the game).
 *  1. Superglide Trainer : jump then crouch exactly one frame later, inside the last 150 ms of a simulated mantle.
 *  2. Wheel cadence      : steady scroll rate (tap strafe).
 *  3. Jump rhythm        : keep time with a metronome (bunny hop / slidehop cadence).
 * Timing uses event.timeStamp (high-resolution, same clock as performance.now). */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = () => ST.ui;
  const L = (fr, en) => ST.L(fr, en);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);

  // ------------------------------------------------------------------ input bindings (key / wheel / mouse button)
  const CODE_OF = { SPACE: 'Space', CTRL: 'ControlLeft', SHIFT: 'ShiftLeft', ALT: 'AltLeft', TAB: 'Tab', ENTER: 'Enter', '`': 'Backquote' };
  function descFromApex(name) {
    if (!name) return null;
    if (name === 'MWHEEL_UP') return { k: 'wheel', v: 'up' };
    if (name === 'MWHEEL_DOWN') return { k: 'wheel', v: 'down' };
    const m = name.match(/^MOUSE(\d)$/); if (m) return { k: 'mouse', v: { 3: 1, 4: 3, 5: 4 }[+m[1]] };
    if (CODE_OF[name]) return { k: 'key', v: CODE_OF[name] };
    if (/^[A-Z]$/.test(name)) return { k: 'key', v: 'Key' + name };
    if (/^\d$/.test(name)) return { k: 'key', v: 'Digit' + name };
    if (/^F\d{1,2}$/.test(name)) return { k: 'key', v: name };
    return null;
  }
  const labelOf = (d) => (!d ? '—' : d.k === 'wheel' ? (d.v === 'up' ? 'MOLETTE ↑' : 'MOLETTE ↓') : d.k === 'mouse' ? 'MOUSE' + ({ 1: 3, 3: 4, 4: 5 }[d.v] || d.v + 1)
    : d.v.replace(/^Key/, '').replace(/^Digit/, '').replace('ControlLeft', 'CTRL').replace('ControlRight', 'CTRL').replace('ShiftLeft', 'SHIFT').replace('ShiftRight', 'SHIFT').toUpperCase());
  function defaultBinding(action, fallback) {
    const k = ST.keysFor ? ST.keysFor(action) : { bound: false };
    if (k.bound) for (const name of k.keys) { const d = descFromApex(name); if (d) return d; }
    return fallback;
  }
  const same = (a, b) => a && b && a.k === b.k && a.v === b.v;
  function eventDesc(e) {
    if (e.type === 'keydown') return { k: 'key', v: e.code === 'ControlRight' ? 'ControlLeft' : e.code === 'ShiftRight' ? 'ShiftLeft' : e.code };
    if (e.type === 'wheel') return { k: 'wheel', v: e.deltaY < 0 ? 'up' : 'down' };
    if (e.type === 'mousedown') return { k: 'mouse', v: e.button };
    return null;
  }

  // ------------------------------------------------------------------ state
  const T = { fps: U ? 0 : 0, phase: 'idle', t0: 0, jump: null, crouch: null, result: null, capturing: null, timers: [], keys: null };
  const W = { run: false, count: 0, t0: 0, ticks: [], dur: 10000, target: 12, tol: 30, dir: 'any', res: null, timer: 0 };
  const R = { run: false, ticks: [], presses: [], interval: 450, beats: 16, offset: 0, res: null, bind: null, t0: 0, timer: 0, ctx: null };
  function init() {
    if (T.keys) return;
    const s = U().store;
    T.fps = s.get('tr_fps', 144);
    T.keys = s.get('tr_keys', null) || { jump: defaultBinding('jump', { k: 'key', v: 'Space' }), crouch: defaultBinding('crouch', { k: 'key', v: 'ControlLeft' }) };
    W.target = s.get('wh_target', 12); W.dir = s.get('wh_dir', 'any');
    R.interval = s.get('rh_int', 450); R.offset = s.get('rh_off', 0); R.bind = s.get('rh_bind', null) || defaultBinding('jump', { k: 'key', v: 'Space' });
  }
  const hist = () => U().store.get('sg_hist', []);

  // ------------------------------------------------------------------ superglide model
  const MANTLE = 600, WINDOW = 150;
  /* The jump lands in some frame, the crouch must land in the NEXT frame. With a frame time F and a gap d between the two
   * inputs, the probability that they fall on consecutive frames (random phase) is  max(0, 1 - |d - F| / F). */
  function chanceOf(d, fps) { const F = 1000 / fps; return Math.max(0, 1 - Math.abs(d - F) / F); }
  function start() {
    init(); clearTimers();
    T.phase = 'wait'; T.jump = T.crouch = null; T.result = null;
    const wait = 700 + Math.random() * 900;
    T.timers.push(setTimeout(() => { T.phase = 'mantle'; T.t0 = performance.now(); tickBar(); paintSg(); }, wait));
    T.timers.push(setTimeout(finish, wait + MANTLE + 120));
    paintSg();
  }
  function clearTimers() { T.timers.forEach(clearTimeout); T.timers = []; }
  function finish() {
    const ws = T.t0 + MANTLE - WINDOW, we = T.t0 + MANTLE, F = 1000 / T.fps;
    const j = T.jump, c = T.crouch;
    let r = { reason: 'ok', chance: 0, delta: null, j, c };
    if (!j && !c) r.reason = 'none';
    else if (!j) r.reason = 'nojump';
    else if (!c) r.reason = 'nocrouch';
    else if (c < j) r.reason = 'order';
    else {
      r.delta = c - j;
      if (j < ws) r.reason = 'early';
      else if (c > we) r.reason = 'late';
      else if (r.delta > 2 * F) r.reason = 'crouchlate';
      else { r.chance = Math.min(0.99, chanceOf(r.delta, T.fps)); r.reason = r.chance > 0 ? 'ok' : 'crouchlate'; }
    }
    T.phase = 'result'; T.result = r;
    if (r.reason !== 'none') { const h = hist(); h.push({ c: Math.round(r.chance * 100), d: r.delta == null ? null : Math.round(r.delta * 100) / 100, fps: T.fps, r: r.reason, t: Date.now() }); while (h.length > 300) h.shift(); U().store.set('sg_hist', h); }
    paintSg(true);
  }
  const REASON = { ok: ['Bien joué : écart d\'environ une frame.', 'Nice: gap of about one frame.'], none: ['Aucun input détecté.', 'No input detected.'], nojump: ['Pas de saut détecté.', 'No jump detected.'], nocrouch: ['Accroupi manquant.', 'Crouch missing.'], order: ['Mauvais ordre : le saut doit venir en premier.', 'Wrong input first: jump must come first.'], early: ['Trop tôt : attends la zone dorée (derniers 0,15 s du mantle).', 'Too early: wait for the gold zone (last 0.15 s of the mantle).'], late: ['Trop tard : le mantle était déjà terminé.', 'Too late: the mantle had already ended.'], crouchlate: ['Accroupi trop tard : plus d\'une frame d\'écart.', 'Crouch too late: more than one frame apart.'] };
  function onSgInput(e, d) {
    if (T.phase !== 'wait' && T.phase !== 'mantle') return false;
    if (same(d, T.keys.jump)) { if (T.jump == null) T.jump = e.timeStamp; return true; }
    if (same(d, T.keys.crouch)) { if (T.crouch == null) T.crouch = e.timeStamp; return true; }
    return false;
  }

  // ------------------------------------------------------------------ superglide UI
  function stats() {
    const h = hist().filter((x) => x.fps === T.fps), n = h.length;
    const viable = h.filter((x) => x.c > 0);
    const avgAll = n ? h.reduce((s, x) => s + x.c, 0) / n : 0;
    const avgViable = viable.length ? viable.reduce((s, x) => s + x.c, 0) / viable.length : 0;
    const reasons = {}; h.forEach((x) => { if (x.r !== 'ok') reasons[x.r] = (reasons[x.r] || 0) + 1; });
    return { n, avgAll, viable: viable.length, avgViable, best: n ? Math.max(...h.map((x) => x.c)) : 0, reasons, last: h.slice(-40) };
  }
  const bandCls = (c) => (c >= 70 ? 'g' : c >= 35 ? 'y' : c > 0 ? 'o' : 'r');
  function resultHtml() {
    const r = T.result; if (!r) return `<p class="lead" style="margin:0">${L('Appuie sur <b>Entrée</b> (ou « Lancer ») : un mantle simulé démarre après un court délai. Pendant la <b>zone dorée</b>, fais ton saut puis ton accroupi.', 'Press <b>Enter</b> (or “Start”): a simulated mantle starts after a short delay. During the <b>gold zone</b>, do your jump then your crouch.')}</p>`;
    const F = 1000 / T.fps, pc = Math.round(r.chance * 100);
    return `<div class="sgres"><div class="big ${bandCls(pc)}">${pc}%</div><div><b>${esc(L(REASON[r.reason][0], REASON[r.reason][1]))}</b>
      ${r.delta != null ? `<p>${L('Écart saut → accroupi', 'Jump → crouch gap')} : <b>${r.delta.toFixed(1)} ms</b> = <b>${(r.delta / F).toFixed(2)}</b> ${L('frame', 'frame')}${(r.delta / F) >= 2 ? 's' : ''} <span class="hint">(${L('cible', 'target')} ${F.toFixed(1)} ms @ ${T.fps} FPS)</span></p>` : ''}</div></div>`;
  }
  function sgHtml() {
    const s = stats(), F = 1000 / T.fps;
    const fpsOpts = [60, 90, 120, 144, 165, 240, 300];
    const reasons = Object.entries(s.reasons).map(([k, v]) => `<span class="tag">${esc(L(REASON[k][0], REASON[k][1]).split(':')[0])} ×${v}</span>`).join(' ');
    return `<div class="card pad"><div class="set" style="border:0;padding:0 0 10px"><div><h4>${L('Ton FPS en jeu', 'Your in-game FPS')}</h4><p>${L('Le superglide demande un écart d\'une frame : plus ton FPS est élevé, plus l\'écart cible (en ms) est court.', 'The superglide needs a one-frame gap: the higher your FPS, the shorter the target gap (ms).')} <b>${F.toFixed(1)} ms</b></p></div>
        <div class="ctl"><div class="seg">${fpsOpts.map((f) => `<button class="${T.fps === f ? 'on' : ''}" data-t="fps" data-v="${f}">${f}</button>`).join('')}</div><input class="inp" type="number" min="30" max="1000" style="width:84px" value="${T.fps}" data-tin="fps"></div></div>
      <div class="row-btns"><span class="lbl" style="margin:8px 4px 0">${L('SAUT', 'JUMP')}</span><button class="btn sm" data-t="cap" data-v="jump">${T.capturing === 'jump' ? L('Appuie sur une touche…', 'Press an input…') : esc(labelOf(T.keys.jump))}</button>
        <span class="lbl" style="margin:8px 4px 0">${L('ACCROUPI', 'CROUCH')}</span><button class="btn sm" data-t="cap" data-v="crouch">${T.capturing === 'crouch' ? L('Appuie sur une touche…', 'Press an input…') : esc(labelOf(T.keys.crouch))}</button>
        <button class="btn sm" data-t="mine">${L('Utiliser mes binds', 'Use my binds')}</button></div></div>
      <div class="card pad" style="margin-top:14px"><div class="mbar" id="mbar"><i id="mfill"></i><b class="mz" style="left:${((MANTLE - WINDOW) / MANTLE) * 100}%;width:${(WINDOW / MANTLE) * 100}%"></b><span class="mk mj" id="mkj" hidden>J</span><span class="mk mc" id="mkc" hidden>C</span></div>
        <div class="row-btns" style="margin:14px 0"><button class="btn gold" data-t="start">▶ ${L('Lancer (Entrée)', 'Start (Enter)')}</button><span class="pill" id="sgphase"><i></i>${L('Prêt', 'Ready')}</span></div><div id="sgres">${resultHtml()}</div></div>
      <h2>${L('Statistiques', 'Statistics')} <span class="tag">${T.fps} FPS</span></h2>
      <div class="card pad"><div class="stats"><div><b>${s.n}</b><span>${L('tentatives', 'attempts')}</span></div><div><b>${Math.round(s.avgAll)}%</b><span>${L('régularité', 'consistency')}</span></div><div><b>${s.viable}</b><span>${L('potentielles', 'potential')}</span></div><div><b>${Math.round(s.avgViable)}%</b><span>${L('moy. viables', 'avg viable')}</span></div><div><b>${s.best}%</b><span>${L('meilleure', 'best')}</span></div></div>
        <div class="spark">${s.last.map((x) => `<i class="${bandCls(x.c)}" style="height:${Math.max(6, x.c)}%" title="${x.c}%"></i>`).join('') || `<span class="hint">${L('Pas encore de tentative.', 'No attempts yet.')}</span>`}</div>
        <div style="margin-top:10px">${reasons}</div><div class="row-btns" style="margin-top:12px"><button class="btn sm danger" data-t="reset">${L('Effacer les stats', 'Clear stats')}</button></div></div>
      <p class="hint">${L('Comment est calculée la « chance » : le saut tombe dans une frame, l\'accroupi doit tomber dans la suivante. Pour un écart <i>d</i> et une frame <i>F</i>, chance = 1 − |d − F| / F (max 99 %). C\'est une estimation : elle ne tient pas compte de la latence de ton système ni de la fenêtre exacte du jeu.', 'How the “chance” is computed: the jump lands in one frame and the crouch must land in the next. For a gap <i>d</i> and frame time <i>F</i>, chance = 1 − |d − F| / F (max 99%). It is an estimate: it ignores your system latency and the game\'s exact window.')}</p>`;
  }
  function paintSg(done) {
    const ph = $('#sgphase'); if (!ph) return;
    ph.className = 'pill ' + (T.phase === 'mantle' ? 'warn' : T.phase === 'wait' ? 'warn' : 'ok');
    ph.innerHTML = '<i></i>' + (T.phase === 'wait' ? L('Attends…', 'Wait…') : T.phase === 'mantle' ? L('MANTLE ! zone dorée = maintenant', 'MANTLE! gold zone = now') : T.phase === 'result' ? L('Résultat', 'Result') : L('Prêt', 'Ready'));
    if (done) { U().render(); return; }
    const f = $('#mfill'); if (f) f.style.width = '0%'; ['#mkj', '#mkc'].forEach((i) => { const m = $(i); if (m) m.hidden = true; });
  }
  function tickBar() {
    const f = $('#mfill'); if (!f || T.phase !== 'mantle') return;
    f.style.width = Math.min(100, ((performance.now() - T.t0) / MANTLE) * 100) + '%';
    requestAnimationFrame(tickBar);
  }

  // ------------------------------------------------------------------ wheel cadence
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };
  function whStart() {
    init(); clearInterval(W.timer);
    W.run = true; W.ticks = []; W.res = null; W.t0 = performance.now(); W.count = 0;
    document.documentElement.style.setProperty('--beat', 1000 / W.target + 'ms');
    W.timer = setInterval(() => {
      const el = $('#whlive'); const left = Math.max(0, W.dur - (performance.now() - W.t0));
      if (el) el.textContent = `${(left / 1000).toFixed(1)} s · ${W.ticks.length} ${L('crans', 'ticks')}`;
      if (left <= 0) whStop();
    }, 80);
    U().render();
  }
  function whStop() {
    clearInterval(W.timer); W.run = false;
    const t = W.ticks; const iv = []; for (let i = 1; i < t.length; i++) iv.push(t[i] - t[i - 1]);
    const ideal = 1000 / W.target, ok = iv.filter((x) => Math.abs(x - ideal) <= (ideal * W.tol) / 100).length;
    const mean = iv.reduce((s, x) => s + x, 0) / (iv.length || 1), sd = Math.sqrt(iv.reduce((s, x) => s + (x - mean) ** 2, 0) / (iv.length || 1));
    W.res = { n: t.length, sps: t.length > 1 ? (t.length - 1) / ((t[t.length - 1] - t[0]) / 1000) : 0, cv: mean ? sd / mean : 0, within: iv.length ? ok / iv.length : 0, iv, ideal };
    const best = U().store.get('wh_best', 0), score = Math.round(W.res.within * 100);
    if (score > best) U().store.set('wh_best', score);
    U().render();
  }
  function whHtml() {
    const r = W.res, best = U().store.get('wh_best', 0);
    let hist = '';
    if (r && r.iv.length) {
      const bins = new Array(14).fill(0), max = r.ideal * 2.2;
      r.iv.forEach((x) => { bins[Math.min(13, Math.floor((x / max) * 14))]++; });
      const top = Math.max(...bins) || 1, idealBin = Math.min(13, Math.floor((r.ideal / max) * 14));
      hist = `<div class="spark hist">${bins.map((b, i) => `<i class="${i === idealBin ? 'g' : 'y'}" style="height:${Math.max(4, (b / top) * 100)}%" title="${b}"></i>`).join('')}</div><p class="hint">${L('Histogramme des intervalles entre deux crans (la barre verte = ta cible).', 'Histogram of intervals between ticks (green bar = your target).')}</p>`;
    }
    return `<div class="card pad"><div class="set" style="border:0;padding:0"><div><h4>${L('Cadence cible', 'Target rate')}</h4><p>${L('Crans de molette par seconde à tenir pendant 10 s. Le cercle pulse à ta cible.', 'Wheel ticks per second to hold for 10 s. The circle pulses at your target.')}</p></div>
        <div class="ctl"><input type="range" min="4" max="30" step="1" value="${W.target}" data-tin="whtarget"><span class="num" id="whtv">${W.target}/s</span></div></div>
      <div class="set" style="border:0;padding:8px 0 0"><div><h4>${L('Sens de la molette', 'Wheel direction')}</h4></div><div class="ctl"><div class="seg">${[['any', 'Les deux', 'Both'], ['up', 'Haut', 'Up'], ['down', 'Bas', 'Down']].map((o) => `<button class="${W.dir === o[0] ? 'on' : ''}" data-t="whdir" data-v="${o[0]}">${L(o[1], o[2])}</button>`).join('')}</div></div></div></div>
      <div class="card pad whpad" style="margin-top:14px;text-align:center"><div class="beat${W.run ? ' run' : ''}"></div><p class="lead" style="margin:8px 0">${W.run ? L('Scrolle en rythme !', 'Scroll in rhythm!') : L('Clique sur « Lancer », puis scrolle avec la molette dans cette zone.', 'Click “Start”, then scroll the wheel in this area.')}</p>
        <div class="row-btns" style="justify-content:center"><button class="btn gold" data-t="whstart"${W.run ? ' disabled' : ''}>▶ ${L('Lancer (10 s)', 'Start (10 s)')}</button><span class="pill" id="whlive"><i></i>—</span></div></div>
      ${r ? `<h2>${L('Résultat', 'Result')}</h2><div class="card pad"><div class="stats"><div><b>${Math.round(r.within * 100)}%</b><span>${L('dans la cible (±' + W.tol + '%)', 'within target (±' + W.tol + '%)')}</span></div><div><b>${r.sps.toFixed(1)}/s</b><span>${L('cadence moyenne', 'average rate')}</span></div><div><b>${Math.round(r.cv * 100)}%</b><span>${L('irrégularité', 'irregularity')}</span></div><div><b>${r.n}</b><span>${L('crans', 'ticks')}</span></div><div><b>${best}%</b><span>${L('meilleur score', 'best score')}</span></div></div>${hist}</div>` : ''}
      <p class="hint">${L('Les molettes « libres » envoient beaucoup d\'événements par cran : règle-la en mode cranté si possible. Cet outil entraîne la régularité, pas un timing précis du jeu.', 'Free-spinning wheels send many events per notch: use notched mode if possible. This tool trains regularity, not an exact in-game timing.')}</p>`;
  }

  // ------------------------------------------------------------------ jump rhythm
  function click(ctx, when, accent) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = accent ? 1200 : 880; o.type = 'square';
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.25, when + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    o.connect(g).connect(ctx.destination); o.start(when); o.stop(when + 0.07);
  }
  function rhStart() {
    init(); clearInterval(R.timer);
    try { R.ctx = R.ctx || new (window.AudioContext || window.webkitAudioContext)(); R.ctx.resume(); } catch (e) { R.ctx = null; }
    R.run = true; R.presses = []; R.res = null; R.t0 = performance.now() + 1500; R.ticks = []; for (let i = 0; i < R.beats; i++) R.ticks.push(R.t0 + i * R.interval);
    let nextIdx = 0;
    R.timer = setInterval(() => {
      const now = performance.now();
      while (nextIdx < R.ticks.length && R.ticks[nextIdx] - now < 40) {
        if (R.ctx) click(R.ctx, R.ctx.currentTime + Math.max(0, (R.ticks[nextIdx] - now) / 1000), nextIdx % 4 === 0);
        const idx = nextIdx, delay = Math.max(0, R.ticks[idx] - now);
        setTimeout(() => { const b = $('#rhbeat'); if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); } const c = $('#rhcount'); if (c) c.textContent = (idx + 1) + '/' + R.beats; }, delay);
        nextIdx++;
      }
      if (now > R.ticks[R.ticks.length - 1] + R.interval) rhStop();
    }, 10);
    U().render();
  }
  function rhStop() {
    clearInterval(R.timer); R.run = false;
    const errs = [];
    R.presses.forEach((p) => {
      if (p < R.ticks[2] - R.interval / 2) return; // warm-up
      let best = Infinity; R.ticks.forEach((t) => { const e = p - R.offset - t; if (Math.abs(e) < Math.abs(best)) best = e; });
      if (Math.abs(best) <= R.interval / 2) errs.push(best);
    });
    const abs = errs.map(Math.abs), mean = abs.reduce((s, x) => s + x, 0) / (abs.length || 1), bias = errs.reduce((s, x) => s + x, 0) / (errs.length || 1);
    R.res = { errs, mean, bias, within: errs.length ? abs.filter((x) => x <= 50).length / errs.length : 0, presses: R.presses.length };
    U().render();
  }
  function rhHtml() {
    const r = R.res;
    return `<div class="card pad"><div class="set" style="border:0;padding:0"><div><h4>${L('Intervalle entre sauts', 'Interval between jumps')}</h4><p>${L('Un clic de métronome toutes les', 'A metronome click every')} <b>${R.interval} ms</b> (${(60000 / R.interval).toFixed(0)} BPM) — ${L('à toi de sauter pile dessus.', 'press exactly on it.')}</p></div><div class="ctl"><input type="range" min="200" max="900" step="10" value="${R.interval}" data-tin="rhint"><span class="num" id="rhiv">${R.interval}</span></div></div>
      <div class="set" style="border:0;padding:8px 0 0"><div><h4>${L('Touche de saut', 'Jump input')}</h4></div><div class="ctl"><button class="btn sm" data-t="rhcap">${R.capturing ? L('Appuie sur une touche…', 'Press an input…') : esc(labelOf(R.bind))}</button></div></div>
      <div class="set" style="border:0;padding:8px 0 0"><div><h4>${L('Décalage audio (ms)', 'Audio offset (ms)')}</h4><p>${L('Compense la latence de ton casque/enceintes : si tu es toujours en retard, augmente.', 'Compensates for headphone/speaker latency: if you are always late, increase.')}</p></div><div class="ctl"><input type="range" min="-150" max="150" step="5" value="${R.offset}" data-tin="rhoff"><span class="num" id="rhov">${R.offset}</span></div></div></div>
      <div class="card pad whpad" style="margin-top:14px;text-align:center"><div class="beat" id="rhbeat"></div><p class="lead" style="margin:8px 0">${R.run ? L('Suis le métronome…', 'Follow the metronome…') : L('Clique sur « Lancer » : après 1,5 s, ' + R.beats + ' temps. Appuie sur ta touche de saut en rythme.', 'Click “Start”: after 1.5 s, ' + R.beats + ' beats. Press your jump input in rhythm.')} <b id="rhcount"></b></p>
        <div class="row-btns" style="justify-content:center"><button class="btn gold" data-t="rhstart"${R.run ? ' disabled' : ''}>▶ ${L('Lancer', 'Start')}</button></div></div>
      ${r ? `<h2>${L('Résultat', 'Result')}</h2><div class="card pad"><div class="stats"><div><b>${r.mean.toFixed(0)} ms</b><span>${L('erreur moyenne', 'mean error')}</span></div><div><b>${Math.round(r.within * 100)}%</b><span>${L('à ±50 ms', 'within ±50 ms')}</span></div><div><b>${r.bias >= 0 ? '+' : ''}${r.bias.toFixed(0)} ms</b><span>${r.bias > 8 ? L('tu es en retard', 'you are late') : r.bias < -8 ? L('tu es en avance', 'you are early') : L('bien centré', 'well centred')}</span></div><div><b>${r.presses}</b><span>${L('appuis', 'presses')}</span></div></div>
        <div class="spark">${r.errs.map((e) => `<i class="${Math.abs(e) <= 25 ? 'g' : Math.abs(e) <= 60 ? 'y' : 'o'}" style="height:${Math.max(6, Math.min(100, (Math.abs(e) / (R.interval / 2)) * 100))}%" title="${e.toFixed(0)} ms"></i>`).join('')}</div></div>` : ''}
      <p class="hint">${L('Entraîne la régularité d\'un enchaînement de sauts (bunny hop, slidehop) — pas le timing exact d\'atterrissage du jeu.', 'Trains the regularity of a jump chain (bunny hop, slidehop) — not the game\'s exact landing timing.')}</p>`;
  }

  // ------------------------------------------------------------------ page
  function pageTraining() {
    init(); const H = ST.H;
    const tabs = [['superglide', 'Superglide', 'Superglide'], ['wheel', 'Cadence molette', 'Wheel cadence'], ['rhythm', 'Rythme de saut', 'Jump rhythm']];
    const body = H.trTab === 'wheel' ? whHtml() : H.trTab === 'rhythm' ? rhHtml() : sgHtml();
    const lead = H.trTab === 'wheel' ? L('Tiens une cadence de molette régulière — la base du tap strafe.', 'Hold a steady wheel cadence — the base of tap strafing.')
      : H.trTab === 'rhythm' ? L('Garde le rythme avec le métronome pour des enchaînements de sauts réguliers.', 'Keep time with the metronome for steady jump chains.')
      : L('Entraîne l\'écart d\'une frame entre le saut et l\'accroupi, comme sur un vrai mantle.', 'Train the one-frame gap between jump and crouch, as on a real mantle.');
    return `<div class="page"><h1>${L('Entraînement', 'Training')}</h1><p class="lead">${lead} ${L('Ces outils <b>mesurent</b> tes entrées : rien n\'est envoyé au jeu.', 'These tools <b>measure</b> your inputs: nothing is sent to the game.')}</p>
      <div class="seg" style="margin-bottom:16px">${tabs.map((t) => `<button class="${H.trTab === t[0] ? 'on' : ''}" data-t="trtab" data-v="${t[0]}">${L(t[1], t[2])}</button>`).join('')}</div>${body}</div>`;
  }

  // ------------------------------------------------------------------ events
  const act = {
    trtab: (el) => { clearTimers(); T.phase = 'idle'; ST.H.trTab = el.dataset.v; U().render(); },
    fps: (el) => { T.fps = +el.dataset.v; U().store.set('tr_fps', T.fps); U().render(); },
    cap: (el) => { T.capturing = el.dataset.v; U().render(); },
    mine: () => { T.keys = { jump: defaultBinding('jump', { k: 'key', v: 'Space' }), crouch: defaultBinding('crouch', { k: 'key', v: 'ControlLeft' }) }; U().store.set('tr_keys', T.keys); U().render(); },
    start: () => start(),
    reset: () => { U().store.set('sg_hist', []); T.result = null; U().render(); },
    whstart: () => whStart(), whdir: (el) => { W.dir = el.dataset.v; U().store.set('wh_dir', W.dir); U().render(); },
    rhstart: () => rhStart(), rhcap: () => { R.capturing = true; U().render(); },
  };
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-t]'); if (el && !el.disabled && act[el.dataset.t]) { e.preventDefault(); act[el.dataset.t](el); } });
  document.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.tin; if (!k) return; const v = +e.target.value;
    if (k === 'whtarget') { W.target = v; U().store.set('wh_target', v); $('#whtv').textContent = v + '/s'; }
    else if (k === 'rhint') { R.interval = v; U().store.set('rh_int', v); $('#rhiv').textContent = v; }
    else if (k === 'rhoff') { R.offset = v; U().store.set('rh_off', v); $('#rhov').textContent = v; }
  });
  document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.tin === 'fps') { const v = Math.max(30, Math.min(1000, +e.target.value || 144)); T.fps = v; U().store.set('tr_fps', v); U().render(); } });

  const active = () => U().S.tab === 'training';
  function capture(e, d) {
    if (T.capturing) { const w = T.capturing; if (d && !(d.k === 'mouse' && d.v === 0) && !(d.k === 'key' && d.v === 'Escape')) { T.keys[w] = d; U().store.set('tr_keys', T.keys); } T.capturing = null; U().render(); return true; }
    if (R.capturing) { if (d && !(d.k === 'mouse' && d.v === 0) && !(d.k === 'key' && d.v === 'Escape')) { R.bind = d; U().store.set('rh_bind', d); } R.capturing = false; U().render(); return true; }
    return false;
  }
  document.addEventListener('keydown', (e) => {
    if (!active() || e.repeat) return;
    const d = eventDesc(e); init();
    if (capture(e, d)) { e.preventDefault(); return; }
    const tab = ST.H.trTab;
    if (tab === 'superglide') {
      if (onSgInput(e, d)) { e.preventDefault(); return; }
      if (e.code === 'Enter' && T.phase !== 'wait' && T.phase !== 'mantle') { e.preventDefault(); start(); }
    } else if (tab === 'rhythm' && R.run && same(d, R.bind)) { e.preventDefault(); R.presses.push(e.timeStamp); }
  }, true);
  document.addEventListener('mousedown', (e) => {
    if (!active() || e.button === 0) { if (active() && (T.capturing || R.capturing)) { /* left click cancels capture via UI */ } return; }
    const d = eventDesc(e); init();
    if (capture(e, d)) { e.preventDefault(); return; }
    if (ST.H.trTab === 'superglide' && onSgInput(e, d)) e.preventDefault();
    else if (ST.H.trTab === 'rhythm' && R.run && same(d, R.bind)) { e.preventDefault(); R.presses.push(e.timeStamp); }
  }, true);
  document.addEventListener('wheel', (e) => {
    if (!active()) return; init(); const d = eventDesc(e), tab = ST.H.trTab;
    if (capture(e, d)) { e.preventDefault(); return; }
    if (tab === 'superglide' && onSgInput(e, d)) { e.preventDefault(); return; }
    if (tab === 'rhythm' && R.run && same(d, R.bind)) { e.preventDefault(); R.presses.push(e.timeStamp); return; }
    if (tab === 'wheel' && W.run && e.target.closest && e.target.closest('.whpad') && (W.dir === 'any' || W.dir === d.v)) { e.preventDefault(); W.ticks.push(e.timeStamp); }
  }, { passive: false, capture: true });

  ST.trainer = { pages: { training: pageTraining }, after: () => { if (T.phase === 'wait' || T.phase === 'mantle') paintSg(); if (T.phase === 'mantle') tickBar(); if (T.phase === 'result' && T.result) { const f = $('#mfill'); if (f) f.style.width = '100%'; const place = (id, t) => { const m = $(id); if (!m) return; if (t == null) { m.hidden = true; return; } m.hidden = false; m.style.left = Math.max(-4, Math.min(104, ((t - T.t0) / MANTLE) * 100)) + '%'; }; place('#mkj', T.result.j); place('#mkc', T.result.c); } },
    chanceOf, model: { MANTLE, WINDOW }, _T: T };
})();

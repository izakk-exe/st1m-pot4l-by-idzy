/* ST1M PORT4L by idZy — launch splash (logo). Plays once per app start, skippable by click or any key. */
(function () {
  var el = document.getElementById('intro');
  if (!el) return;
  var seen = false;
  try { seen = sessionStorage.getItem('st1m_intro') === '1'; sessionStorage.setItem('st1m_intro', '1'); } catch (e) {}
  if (seen) { el.remove(); return; }
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var timer = null;
  function close() {
    if (el.classList.contains('out')) return;
    el.classList.add('out');
    clearTimeout(timer);
    document.removeEventListener('keydown', close);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
  }
  timer = setTimeout(close, reduce ? 500 : 2400);
  el.addEventListener('click', close);
  document.addEventListener('keydown', close);
})();

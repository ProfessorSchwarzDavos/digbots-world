/* DIGBOTS quick-start: when opened with ?quickstart=1, skip the menus.
   Returning players: presses Continue. New players: Create New World -> Generate World. */
(function () {
  if (!/[?&]quickstart=1\b/.test(location.search)) return;
  var started = Date.now(), stage = 'menu', lastClick = 0;
  function btn(label) {
    var list = document.querySelectorAll('button');
    for (var i = 0; i < list.length; i++) {
      var b = list[i], t = (b.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.indexOf(label) === 0 && !b.disabled && b.offsetParent !== null) return b;
    }
    return null;
  }
  function tick() {
    if (Date.now() - started > 90000) return;
    var now = Date.now();
    if (now - lastClick > 700) {
      var b;
      if (stage === 'menu') {
        if ((b = btn('Continue'))) { b.click(); lastClick = now; stage = 'done'; return; }
        if ((b = btn('Create New World'))) { b.click(); lastClick = now; stage = 'new'; }
      } else if (stage === 'new') {
        if ((b = btn('Generate World'))) { b.click(); lastClick = now; stage = 'done'; return; }
      }
    }
    setTimeout(tick, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick); else tick();
})();

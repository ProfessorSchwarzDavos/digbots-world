/* DIGBOTS layer for the self-hosted Blockwild (MIT, (c) Noah Hicks, see LICENSE).
   1) Start screen: adds a simple welcome line where the game logo was.
   2) Shows DIGBOTS instead of Blockwild anywhere else in the game text.
   3) With ?quickstart=1, skips the menus: Create New World -> Generate World.
   4) Lifts the loading cover (styled in app/digbots.css) once the background world has loaded.
   The old logo, splash and Continue button are hidden by app/digbots.css before the first paint. */
(function () {
  var NAME = 'DIGBOTS';
  function fix(t) { return t.replace(/BLOCKWILD/g, NAME).replace(/Blockwild/g, NAME); }
  function welcome() {
    var wraps = document.querySelectorAll('.logo-wrap');
    for (var i = 0; i < wraps.length; i++) {
      if (wraps[i].querySelector('.dg-welcome')) continue;
      var box = document.createElement('div');
      box.className = 'dg-welcome';
      box.innerHTML = '<h2>WELCOME</h2><p>Create a world to start digging</p>';
      wraps[i].appendChild(box);
    }
  }
  function fixTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (/lockwild|LOCKWILD/.test(root.nodeValue)) root.nodeValue = fix(root.nodeValue); return; }
    if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) if (/lockwild|LOCKWILD/.test(n.nodeValue) && n.parentNode && n.parentNode.tagName !== 'SCRIPT' && n.parentNode.tagName !== 'STYLE') n.nodeValue = fix(n.nodeValue);
  }
  function brand() {
    fixTree(document.body); welcome();
    if (/lockwild/i.test(document.title)) document.title = fix(document.title);
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.type === 'characterData') fixTree(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) fixTree(r.addedNodes[j]);
      }
      welcome();
      if (/lockwild/i.test(document.title)) document.title = fix(document.title);
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  function quickstart() {
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
    (function tick() {
      if (Date.now() - started > 90000) return;
      var now = Date.now(), b;
      if (now - lastClick > 700) {
        if (stage === 'menu') {
          if ((b = btn('Create New World'))) { b.click(); lastClick = now; stage = 'new'; }
        } else if (stage === 'new') {
          if ((b = btn('Generate World'))) { b.click(); lastClick = now; return; }
        }
      }
      setTimeout(tick, 250);
    })();
  }

  function liftCover() {
    // Lift the cover once the background world has settled: frame times calm down after the heavy world build.
    // Never earlier than 1.2s; the stylesheet lifts it by itself after 9s if this never runs.
    var t0 = performance.now(), last = t0, calm = 0;
    function frame(now) {
      var dt = now - last; last = now;
      calm = (document.querySelector('canvas') && dt < 34) ? calm + 1 : 0;
      if ((now - t0 > 1200 && calm >= 24) || now - t0 > 9000) { document.documentElement.classList.add('dg-ready'); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function start() { liftCover(); brand(); quickstart(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

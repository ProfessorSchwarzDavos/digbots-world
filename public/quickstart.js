/* DIGBOTS layer for the self-hosted Blockwild (MIT, (c) Noah Hicks, see LICENSE).
   1) Start screen: adds a simple welcome line where the game logo was.
   2) Shows DIGBOTS instead of Blockwild anywhere else in the game text.
   3) With ?quickstart=1, skips the menus: Create New World -> Generate World.
   4) Live loading bar (styled in app/digbots.css) until the background world has loaded.
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

  function progressBar() {
    // Live loading bar. Progress follows real loading stages and moves smoothly between them:
    // page parsed 30%, game engine canvas 60%, world rendering 85%, world settled 100% (then the bar fades out).
    var el = document.createElement('div');
    el.id = 'dg-load';
    el.innerHTML = '<div class="box"><div class="track"><div class="fill"></div></div><div class="row"><span>LOADING WORLD</span><span class="pct">0%</span></div></div>';
    (document.body || document.documentElement).appendChild(el);
    document.documentElement.classList.add('dg-js');
    var fill = el.querySelector('.fill'), pct = el.querySelector('.pct');
    var shown = 0, target = 30, t0 = performance.now(), last = t0, calm = 0, rendering = 0, finished = false;
    function finish() {
      if (finished) return; finished = true; shown = 100; draw();
      setTimeout(function () { el.classList.add('done'); document.documentElement.classList.add('dg-ready'); }, 250);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
    }
    function draw() { fill.style.width = shown.toFixed(1) + '%'; pct.textContent = Math.floor(shown) + '%'; }
    function frame(now) {
      if (finished) return;
      var dt = now - last; last = now;
      var canvas = document.querySelector('canvas');
      if (canvas && target < 60) target = 60;
      if (canvas) { rendering++; if (rendering > 10 && target < 85) target = 85; }
      calm = (canvas && dt < 34) ? calm + 1 : 0;
      // Ease toward the current stage, never quite reaching it until the stage completes.
      var cap = target - 1;
      if (shown < cap) shown += Math.max(0.15, (cap - shown) * 0.06);
      if (shown > cap) shown = cap;
      draw();
      if ((now - t0 > 1200 && calm >= 24) || now - t0 > 11000) return finish();
      requestAnimationFrame(frame);
    }
    draw(); requestAnimationFrame(frame);
  }

  function start() { progressBar(); brand(); quickstart(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

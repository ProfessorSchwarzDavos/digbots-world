/* DIGBOTS layer for the self-hosted Blockwild (MIT, (c) Noah Hicks, see LICENSE).
   1) Start screen: no game logo; a simple welcome line instead. No flash of the old title.
   2) Shows DIGBOTS instead of Blockwild anywhere else in the game text.
   3) With ?quickstart=1, skips the menus: Create New World -> Generate World.
   4) Hides the Continue button and the splash text.
   5) Loading cover: hides the start screen until the background world has loaded, so only one start screen shows. */
(function () {
  var NAME = 'DIGBOTS';
  var css = document.createElement('style');
  css.textContent =
    '.block-logo, .logo-subtitle, .splash-text, .title-main-menu .primary-menu-button { display: none !important; }' +
    '.dg-welcome { text-align: center; color: #F2F4EA; text-shadow: 0 3px 0 #1d211c, 0 0 24px rgba(0,0,0,.35); margin: 0 0 6px; }' +
    '.dg-welcome h2 { margin: 0; font-family: inherit; font-size: clamp(34px, 5.5vw, 68px); font-weight: 900; letter-spacing: .06em; line-height: 1; }' +
    '.dg-welcome p { margin: 12px 0 0; font-size: clamp(12px, 1.4vw, 16px); letter-spacing: .22em; text-transform: uppercase; opacity: .9; }';
  (document.head || document.documentElement).appendChild(css);

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

  function loadingCover() {
    var cover = document.createElement('div');
    cover.id = 'dg-cover';
    cover.innerHTML = '<div><b>LOADING WORLD</b><i></i></div>';
    var st = document.createElement('style');
    st.textContent = '#dg-cover{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:#0B0D11;transition:opacity .6s ease;font-family:ui-monospace,Menlo,Consolas,monospace}' +
      '#dg-cover div{text-align:center;color:#F2F4EA;letter-spacing:.3em;font-size:14px}' +
      '#dg-cover i{display:block;width:160px;height:4px;margin:14px auto 0;background:linear-gradient(90deg,#2EF0E0 0 30%,#1f2630 30%);background-size:200% 100%;animation:dgbar 1.1s linear infinite}' +
      '@keyframes dgbar{from{background-position:100% 0}to{background-position:-100% 0}}' +
      '#dg-cover.done{opacity:0;pointer-events:none}';
    (document.head || document.documentElement).appendChild(st);
    (document.body || document.documentElement).appendChild(cover);
    // Reveal once the background world has settled: frame times calm down after the heavy world build.
    // Never earlier than 1.2s, never later than 9s.
    var t0 = performance.now(), last = t0, calm = 0, done = false;
    function finish() { if (done) return; done = true; cover.classList.add('done'); setTimeout(function () { if (cover.parentNode) cover.parentNode.removeChild(cover); }, 700); }
    function frame(now) {
      if (done) return;
      var dt = now - last; last = now;
      var hasCanvas = !!document.querySelector('canvas');
      calm = (hasCanvas && dt < 34) ? calm + 1 : 0;
      var elapsed = now - t0;
      if ((elapsed > 1200 && calm >= 24) || elapsed > 9000) return finish();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function start() { loadingCover(); brand(); quickstart(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

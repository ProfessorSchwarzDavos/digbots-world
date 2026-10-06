/* Name layer for the self-hosted Blockwild (MIT, (c) Noah Hicks, see LICENSE).
   1) Shows MINECRAFT on the title logo and version line instead of DIGBOTS / Blockwild.
   2) With ?quickstart=1, skips the menus: Create New World -> Generate World.
   3) Hides the Continue button and the splash text. */
(function () {
  var NAME = 'MINECRAFT';
  function fix(t) {
    return t.replace(/BLOCKWILD/g, NAME).replace(/Blockwild/g, NAME).replace(/DIGBOTS/g, NAME).replace(/Digbots/g, NAME);
  }
  function fixTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (/lockwild|LOCKWILD|digbots|DIGBOTS/.test(root.nodeValue)) root.nodeValue = fix(root.nodeValue); return; }
    if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) if (/lockwild|LOCKWILD|digbots|DIGBOTS/.test(n.nodeValue) && n.parentNode && n.parentNode.tagName !== 'SCRIPT' && n.parentNode.tagName !== 'STYLE') n.nodeValue = fix(n.nodeValue);
  }
  function brand() {
    fixTree(document.body);
    if (/lockwild|digbots/i.test(document.title)) document.title = fix(document.title);
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.type === 'characterData') fixTree(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) fixTree(r.addedNodes[j]);
      }
      if (/lockwild|digbots/i.test(document.title)) document.title = fix(document.title);
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

  function hideBits() {
    var css = document.createElement('style');
    css.textContent = '.title-main-menu .primary-menu-button, .splash-text { display: none !important; }';
    (document.head || document.documentElement).appendChild(css);
  }

  function start() { hideBits(); brand(); quickstart(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

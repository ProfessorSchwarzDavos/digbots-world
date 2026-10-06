/* Name layer for the self-hosted Blockwild (MIT, (c) Noah Hicks, see LICENSE).
   Title and version show MINECRAFT only. No Blockwild flash. */
(function () {
  var NAME = 'MINECRAFT';
  var css = document.createElement('style');
  css.textContent = '.block-logo, .version-line { visibility: hidden; } .block-logo.mc, .version-line.mc { visibility: visible; } .title-main-menu .primary-menu-button, .splash-text { display: none !important; }';
  (document.head || document.documentElement).appendChild(css);
  function fix(t) {
    return t.replace(/BLOCKWILD/g, NAME).replace(/Blockwild/g, NAME).replace(/DIGBOTS/g, NAME).replace(/Digbots/g, NAME);
  }
  function paint() {
    document.title = 'Minecraft';
    var logos = document.querySelectorAll('.block-logo');
    for (var i = 0; i < logos.length; i++) {
      if (logos[i].textContent !== NAME) logos[i].textContent = NAME;
      logos[i].classList.add('mc');
    }
    var lines = document.querySelectorAll('span');
    for (var j = 0; j < lines.length; j++) {
      var el = lines[j];
      if (el.children.length) continue;
      var raw = el.textContent || '';
      if (!/DIGBOTS|Blockwild|BLOCKWILD|1\.12/.test(raw)) continue;
      var next = fix(raw);
      if (next !== raw) el.textContent = next;
      el.classList.add('mc');
    }
  }
  function brand() {
    paint();
    new MutationObserver(paint).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
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
  function start() { brand(); quickstart(); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

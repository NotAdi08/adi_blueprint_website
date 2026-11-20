window.__gridCheckIn = function (win) {
  const doc = win.document, out = [];
  const nav = doc.querySelector('nav');
  const col = doc.querySelector('main') || (doc.querySelector('header[data-screen-label="Project header"]') || {}).parentElement;
  if (!col) return { error: 'no column' };
  const cr = col.getBoundingClientRect(), cs0 = win.getComputedStyle(col);
  const sx = win.scrollX, sy = win.scrollY;
  const x0 = cr.left + parseFloat(cs0.paddingLeft) + sx;
  const y0 = nav ? nav.getBoundingClientRect().bottom + sy : 0;
  const off = (v) => { const m = ((v % 24) + 24) % 24; return Math.min(m, 24 - m); };
  const isBordered = (el) => { const a = win.getComputedStyle(el, '::after'); return a.content !== 'none' && a.borderTopStyle === 'solid' && parseFloat(a.borderTopWidth) >= 1; };
  const isFilled = (el, cs) => { const bg = cs.backgroundColor; return bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent'; };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' "' + (el.textContent || '').trim().slice(0, 30) + '"';
  const walk = (el, inBox) => {
    for (const ch of el.children) {
      const t = ch.tagName;
      if (t === 'SCRIPT' || t === 'STYLE' || t === 'svg' || t === 'SVG' || t === 'BLUEPRINT-GRID' || t === 'TOPO-BACKGROUND' || t === 'DOT-FIELD') continue;
      if (ch.getAttribute('aria-hidden') === 'true' && t !== 'IMG') continue;
      const cs = win.getComputedStyle(ch);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      if (parseFloat(cs.opacity) === 0) continue;
      const r = ch.getBoundingClientRect();
      if (cs.overflow === 'hidden' && r.height < 1) continue;
      const inline = cs.display === 'inline' || cs.display === 'contents';
      const bordered = isBordered(ch), filled = isFilled(ch, cs);
      const box = bordered || filled;
      const fillImg = t === 'IMG' && ch.parentElement && (isBordered(ch.parentElement) || ch.style.position === 'absolute');
      if (!inline && !fillImg && r.width >= 12 && r.height >= 12 && (!inBox || box)) {
        const l = (r.left + sx) < x0 - 0.5 ? 0 : off(r.left + sx - x0), tp = off(r.top + sy - y0);
        if (l > 0.5 || tp > 0.5) out.push({ k: 'pos', el: name(ch), l: +l.toFixed(1), t: +tp.toFixed(1) });
        if (bordered) {
          const w = off(r.width), h = off(r.height);
          if (w > 0.5 || h > 0.5) out.push({ k: 'size', el: name(ch), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
        }
      }
      if (!inline || ch.children.length) walk(ch, inBox || (box && ch !== col));
    }
  };
  walk(doc.body, false);
  return { x0, y0, count: out.length, sample: out.slice(0, 12) };
};
window.__gridRun = function (label, width, hash, theme) {
  return new Promise((res) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:0;top:0;width:' + width + 'px;height:900px;border:0;z-index:2147483647;background:#fff';
    f.src = location.pathname + hash;
    f.onload = () => {
      try { f.contentDocument.documentElement.setAttribute('data-theme', theme); } catch (e) {}
      setTimeout(() => {
        let r;
        try { f.contentWindow.scrollTo(0, 0); r = window.__gridCheckIn(f.contentWindow); } catch (e) { r = { error: String(e) }; }
        f.remove();
        res(Object.assign({ label, width, hash, theme }, r));
      }, 2500);
    };
    document.body.appendChild(f);
  });
};
window.__gridAll = async function () {
  const res = [];
  for (const w of [1440, 1024, 390]) for (const h of ['#/', '#/projects/1', '#/projects/2', '#/projects/3', '#/projects/4']) for (const th of ['dark', 'light']) res.push(await window.__gridRun('', w, h, th));
  window.__gridResults = res;
  console.log('GRIDCHECK total=' + res.reduce((a, r) => a + (r.count || 0), 0) + ' ' + JSON.stringify(res.map(r => [r.width, r.hash, r.theme, r.count, r.error || ''])));
  console.log('GRIDSAMPLE ' + JSON.stringify(res.filter(r => r.count).slice(0, 4).map(r => [r.width, r.hash, r.theme, r.sample.slice(0, 6)])));
  return res;
};

(() => {
  if (window.__gridSnap) return;
  const U = 24, MAXW = 1080, NAV_H = 72;
  const root = document.documentElement;
  const ceilU = (v, u) => Math.ceil(v / u - 0.02) * u;
  const off = (v) => { const m = ((v % U) + U) % U; return Math.min(m, U - m); };
  let colX = 0;
  const setCol = () => {
    const vw = root.clientWidth || window.innerWidth;
    const w = Math.min(MAXW, Math.max(U, Math.floor((vw - 48) / U) * U));
    colX = Math.floor((vw - w) / 2);
    root.style.setProperty('--col-w', w + 'px');
    root.style.setProperty('--col-x', colX + 'px');
  };
  setCol();

  const ratioOf = (el) => {
    const a = el.getAttribute('data-snap-ratio');
    if (a && a !== 'img') return parseFloat(a);
    const img = el.querySelector('img');
    if (!img) return 0;
    const ar = img.style.aspectRatio;
    if (ar && ar !== 'auto') { const [x, y] = ar.split('/').map(parseFloat); if (x && y) return x / y; }
    if (img.naturalWidth) return img.naturalWidth / img.naturalHeight;
    if (!img.__snapWait) { img.__snapWait = true; img.addEventListener('load', schedule, { once: true }); }
    return 0;
  };
  const snapRatio = (el) => {
    const r = ratioOf(el);
    if (!r) return;
    const w = el.getBoundingClientRect().width;
    if (w < 1) return;
    const h = Math.max(U, Math.round(w / r / U) * U) + 'px';
    if (el.style.height !== h) el.style.height = h;
    if (el.style.aspectRatio !== 'auto') el.style.aspectRatio = 'auto';
    const img = [...el.children].find((c) => c.tagName === 'IMG' && c.style.position !== 'absolute');
    if (img) {
      if (img.style.height !== '100%') img.style.height = '100%';
      if (img.style.aspectRatio !== 'auto') img.style.aspectRatio = 'auto';
      if (!img.style.objectFit) img.style.objectFit = 'cover';
    }
  };
  const snapGrid = (el) => {
    const min = parseFloat(el.getAttribute('data-snap-grid')) || 288;
    const cs = getComputedStyle(el);
    const W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (W < 1) return;
    const gap = parseFloat(cs.columnGap) || 0;
    const kids = el.children.length || 1;
    const n = Math.max(1, Math.min(kids, Math.floor((W + gap) / (min + gap))));
    let w = Math.floor(((W + gap) / n - gap) / U) * U;
    if (w < U) w = Math.floor(W / U) * U;
    const v = `repeat(${n}, ${w}px)`;
    if (el.style.gridTemplateColumns !== v) el.style.gridTemplateColumns = v;
  };
  const fixCenter = (el) => {
    const kids = [...el.children].filter((c) => getComputedStyle(c).position !== 'absolute' && c.getBoundingClientRect().width > 0);
    kids.forEach((c) => { if (c.__snapML) { c.style.marginLeft = ''; c.__snapML = false; } });
    const rows = new Map();
    kids.forEach((c) => { const r = c.getBoundingClientRect(); const k = Math.round(r.top); if (!rows.has(k)) rows.set(k, c); });
    rows.forEach((first) => {
      const l = first.getBoundingClientRect().left + window.scrollX - colX;
      if (off(l) > 0.5) { first.style.marginLeft = '24px'; first.__snapML = true; }
    });
  };

  let raf = 0, running = false;
  function pass() {
    raf = 0; running = true;
    setCol();
    document.querySelectorAll('[data-snap-grid]').forEach(snapGrid);
    document.querySelectorAll('[data-snap-ratio]').forEach(snapRatio);
    const ws = [...document.querySelectorAll('[data-snap~="w"]')];
    ws.forEach((el) => { el.style.minWidth = ''; });
    const nat = ws.map((el) => el.getBoundingClientRect().width);
    ws.forEach((el, i) => { if (nat[i] < 1) return; const t = ceilU(nat[i], U); if (t - nat[i] > 0.25) el.style.minWidth = t + 'px'; });
    document.querySelectorAll('[data-snap-center]').forEach(fixCenter);
    const hs = [...document.querySelectorAll('[data-snap~="h"], [data-snap~="h48"]')];
    hs.forEach((el) => { el.style.minHeight = ''; });
    for (let i = hs.length - 1; i >= 0; i--) {
      const el = hs[i], u = el.matches('[data-snap~="h48"]') ? 48 : U;
      const h = el.getBoundingClientRect().height;
      if (h < 1) continue;
      const t = ceilU(h, u);
      if (t - h > 0.25) el.style.minHeight = t + 'px';
    }
    running = false;
    if (window.DEBUG_GRID) { clearTimeout(window.__gridDbgT); window.__gridDbgT = setTimeout(() => { const r = window.__gridCheck(); console.log('[grid] ' + r.count + ' mismatches', r.items); }, 300); }
  }
  function schedule() { if (!raf && !running) raf = requestAnimationFrame(pass); }

  window.__gridCheck = function () {
    const out = [], sx = window.scrollX, sy = window.scrollY;
    const x0 = colX, y0 = NAV_H;
    const isBordered = (el) => { const a = getComputedStyle(el, '::after'); return a.content !== 'none' && a.borderTopStyle === 'solid' && parseFloat(a.borderTopWidth) >= 1; };
    const isFilled = (cs) => { const b = cs.backgroundColor; return b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent'; };
    const name = (el) => el.tagName.toLowerCase() + ' "' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 32) + '"';
    const navEl = document.querySelector('nav');
    const walk = (el, inBox) => {
      for (const ch of el.children) {
        const t = ch.tagName;
        if (/^(SCRIPT|STYLE|SVG|BLUEPRINT-GRID|TOPO-BACKGROUND|IFRAME)$/i.test(t) || t.toLowerCase() === 'svg') continue;
        if (ch.getAttribute('aria-hidden') === 'true' && t !== 'IMG') continue;
        const cs = getComputedStyle(ch);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed' || parseFloat(cs.opacity) === 0) continue;
        const r = ch.getBoundingClientRect();
        if (cs.overflow === 'hidden' && r.height < 1) continue;
        const inline = cs.display === 'inline' || cs.display === 'contents';
        const bordered = isBordered(ch), box = bordered || isFilled(cs);
        const fillImg = t === 'IMG' && (ch.style.position === 'absolute' || ch.style.height === '100%');
        if (!inline && !fillImg && r.width >= 12 && r.height >= 12 && (!inBox || box)) {
          const ax = r.left + sx, ay = r.top + sy;
          const l = ax < x0 - 0.5 ? 0 : off(ax - x0), tp = off(ay - y0);
          if (l > 0.5 || tp > 0.5) out.push(['pos', name(ch), +l.toFixed(1), +tp.toFixed(1)]);
          if (bordered && (off(r.width) > 0.5 || off(r.height) > 0.5)) out.push(['size', name(ch), +r.width.toFixed(1), +r.height.toFixed(1)]);
        }
        if (!inline || ch.children.length) walk(ch, inBox || (box && ch !== navEl ? true : inBox) || (ch === navEl ? false : inBox));
      }
    };
    walk(document.body, false);
    return { count: out.length, items: out };
  };

  const start = () => {
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('resize', () => { setCol(); schedule(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    schedule();
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.__gridSnap = { schedule, pass };
})();

(() => {
  if (customElements.get('blueprint-grid')) return;
  const TILE = 120, CELL = 24, PLUS = 5;
  const svg = (minor, major, plus) => {
    let r = '';
    for (let k = CELL; k < TILE; k += CELL) r += `<rect x="${k}" y="0" width="1" height="${TILE}" fill="${minor}"/><rect x="0" y="${k}" width="${TILE}" height="1" fill="${minor}"/>`;
    r += `<rect x="0" y="0" width="1" height="${TILE}" fill="${major}"/><rect x="1" y="0" width="${TILE - 1}" height="1" fill="${major}"/>`;
    r += `<rect x="0" y="0" width="${PLUS + 1}" height="1" fill="${plus}"/><rect x="${TILE - PLUS}" y="0" width="${PLUS}" height="1" fill="${plus}"/><rect x="0" y="0" width="1" height="${PLUS + 1}" fill="${plus}"/><rect x="0" y="${TILE - PLUS}" width="1" height="${PLUS}" fill="${plus}"/>`;
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" shape-rendering="crispEdges">${r}</svg>`)}")`;
  };
  class BlueprintGrid extends HTMLElement {
    connectedCallback() {
      this.setAttribute('aria-hidden', 'true');
      Object.assign(this.style, { position: 'fixed', top: 'var(--nav-h, 0px)', left: '0', right: '0', bottom: '0', zIndex: '0', pointerEvents: 'none', background: 'var(--page, #101830)', display: 'block' });
      this.readTheme();
      this.layout();
      this.mo = new MutationObserver(() => this.readTheme());
      this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      this.onResize = () => this.layout();
      window.addEventListener('resize', this.onResize);
    }
    disconnectedCallback() {
      this.mo.disconnect();
      window.removeEventListener('resize', this.onResize);
    }
    layout() {
      const x0 = Math.max(0, Math.round((window.innerWidth - 1128) / 2));
      this.style.backgroundPosition = `${x0}px 0px`;
    }
    readTheme() {
      const cs = getComputedStyle(document.documentElement);
      const g = (k, d) => cs.getPropertyValue(k).trim() || d;
      const rgb = g('--grid-rgb', '242,242,243');
      const c = (a) => `rgba(${rgb},${a})`;
      this.style.backgroundImage = svg(c(g('--grid-minor', '0.03')), c(g('--grid-major', '0.07')), c(g('--grid-plus', '0.18')));
    }
  }
  customElements.define('blueprint-grid', BlueprintGrid);
})();

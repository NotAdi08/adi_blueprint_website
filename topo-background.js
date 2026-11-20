(() => {
  if (customElements.get('topo-background')) return;
  const BG = '#0A0A0B', TAU = Math.PI * 2;
  const CELL = 18, STEP = 0.065, FREQ = 1 / 560, WFREQ = 1 / 900, WAMP = 0.85;
  const CYCLE = 50000, CYCLE2 = 137000;
  const HILL = 0.6, HILL_R = 200, GLOW_R = 240;
  const NB = 12;
  const EDGES = [null, [3, 2], [2, 1], [3, 1], [0, 1], null, [0, 2], [3, 0], [3, 0], [0, 2], null, [0, 1], [3, 1], [2, 1], [3, 2], null];

  const perm = new Uint8Array(512);
  (() => { const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i; let s = 1138; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); const t = p[i]; p[i] = p[j]; p[j] = t; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; })();
  const GX = new Float32Array([1, -1, 1, -1, 1.414, -1.414, 0, 0]), GY = new Float32Array([1, 1, -1, -1, 0, 0, 1.414, -1.414]);
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    const g00 = perm[a] & 7, g10 = perm[b] & 7, g01 = perm[a + 1] & 7, g11 = perm[b + 1] & 7;
    const n00 = GX[g00] * xf + GY[g00] * yf, n10 = GX[g10] * (xf - 1) + GY[g10] * yf;
    const n01 = GX[g01] * xf + GY[g01] * (yf - 1), n11 = GX[g11] * (xf - 1) + GY[g11] * (yf - 1);
    const nx0 = n00 + (n10 - n00) * u, nx1 = n01 + (n11 - n01) * u;
    return nx0 + (nx1 - nx0) * v;
  };

  class TopoBackground extends HTMLElement {
    connectedCallback() {
      this.setAttribute('aria-hidden', 'true');
      Object.assign(this.style, { position: 'fixed', inset: '0', zIndex: '0', pointerEvents: 'none', background: 'var(--page, ' + BG + ')', display: 'block' });
      const cv = this.cv = document.createElement('canvas');
      Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', opacity: '0', transition: 'opacity 1.4s ease' });
      this.appendChild(cv);
      this.ctx = cv.getContext('2d');
      this.styles = new Array(NB);
      this.readTheme();
      this.mo = new MutationObserver(() => { this.readTheme(); if (!this.raf) this.render(); });
      this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      this.counts = new Int32Array(NB); this.starts = new Int32Array(NB);
      this.cap = 0; this.n = 0;
      this.px = 0; this.py = 0; this.sx = 0; this.sy = 0; this.ps = 0; this.has = false; this.active = false;
      this.t = 0; this.shown = false; this.qx = 0; this.qy = 0;
      this.mq = matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = this.mq.matches;
      this.onMove = (e) => {
        if (e.pointerType !== 'mouse' || this.reduced) return;
        this.px = e.clientX; this.py = e.clientY;
        if (!this.has || this.ps < 0.02) { this.sx = this.px; this.sy = this.py; }
        this.has = true; this.active = true;
      };
      this.onOut = (e) => { if (!e.relatedTarget) this.active = false; };
      this.onResize = () => { this.resize(); if (this.reduced) this.render(); };
      this.onVis = () => {
        if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; this.active = false; }
        else this.start();
      };
      this.onMq = () => { this.reduced = this.mq.matches; this.active = false; this.ps = 0; this.start(); };
      this.frame = (now) => this.tick(now);
      window.addEventListener('pointermove', this.onMove, { passive: true });
      document.addEventListener('mouseout', this.onOut);
      window.addEventListener('resize', this.onResize);
      document.addEventListener('visibilitychange', this.onVis);
      this.mq.addEventListener?.('change', this.onMq);
      if (window.ResizeObserver) { this.ro = new ResizeObserver(() => this.onResize()); this.ro.observe(this); }
      this.start();
    }
    disconnectedCallback() {
      cancelAnimationFrame(this.raf); this.raf = 0;
      if (this.ro) this.ro.disconnect();
      if (this.mo) this.mo.disconnect();
      window.removeEventListener('pointermove', this.onMove);
      document.removeEventListener('mouseout', this.onOut);
      window.removeEventListener('resize', this.onResize);
      document.removeEventListener('visibilitychange', this.onVis);
      this.mq.removeEventListener?.('change', this.onMq);
    }
    readTheme() {
      const cs = getComputedStyle(document.documentElement);
      const num = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return isFinite(v) ? v : d; };
      const rgb = cs.getPropertyValue('--topo-rgb').trim() || '138,141,148';
      this.aMin = num('--topo-min', 0.12); this.aMax = num('--topo-max', 0.45);
      this.aRest = num('--topo-rest', 0.14); this.aIndex = num('--topo-index', 0.26);
      for (let i = 0; i < NB; i++) this.styles[i] = 'rgba(' + rgb + ',' + (this.aMin + (this.aMax - this.aMin) * i / (NB - 1)).toFixed(3) + ')';
    }
    start() {
      cancelAnimationFrame(this.raf); this.raf = 0;
      if (this.w !== window.innerWidth || this.h !== window.innerHeight || !this.cv.width) this.resize();
      if (this.reduced) { this.t = 0; this.render(); return; }
      if (document.hidden) return;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
    resize() {
      const w = this.w = window.innerWidth, h = this.h = window.innerHeight;
      const dpr = this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
      this.cols = Math.ceil(w / CELL) + 2; this.rows = Math.ceil(h / CELL) + 2;
      const len = this.cols * this.rows;
      if (!this.field || this.field.length < len) this.field = new Float32Array(len);
      this.ensure(len * 3);
    }
    ensure(cap) {
      if (cap <= this.cap) return;
      const seg = new Float32Array(cap * 4), bk = new Uint8Array(cap), ord = new Int32Array(cap);
      if (this.seg) { seg.set(this.seg.subarray(0, this.n * 4)); bk.set(this.bk.subarray(0, this.n)); }
      this.seg = seg; this.bk = bk; this.ord = ord; this.cap = cap;
    }
    tick(now) {
      let dt = now - this.last;
      if (dt < 15) { this.raf = requestAnimationFrame(this.frame); return; }
      this.last = now; dt = Math.min(dt, 60);
      if (this.w !== window.innerWidth || this.h !== window.innerHeight || !this.cv.width) this.resize();
      this.t += dt;
      const ke = 1 - Math.exp(-dt / 140);
      this.sx += (this.px - this.sx) * ke; this.sy += (this.py - this.sy) * ke;
      const target = this.active && this.has ? 1 : 0;
      this.ps += (target - this.ps) * (1 - Math.exp(-dt / (target ? 380 : 650)));
      if (this.ps < 0.001) this.ps = 0;
      this.render();
      this.raf = requestAnimationFrame(this.frame);
    }
    edge(e, x0, y0, tl, tr, br, bl, L) {
      if (e === 0) { this.qx = x0 + CELL * (L - tl) / (tr - tl); this.qy = y0; }
      else if (e === 1) { this.qx = x0 + CELL; this.qy = y0 + CELL * (L - tr) / (br - tr); }
      else if (e === 2) { this.qx = x0 + CELL * (L - bl) / (br - bl); this.qy = y0 + CELL; }
      else { this.qx = x0; this.qy = y0 + CELL * (L - tl) / (bl - tl); }
    }
    push(e1, e2, x0, y0, tl, tr, br, bl, L, k) {
      if (this.n >= this.cap) this.ensure(this.cap * 2);
      this.edge(e1, x0, y0, tl, tr, br, bl, L);
      const ax = this.qx, ay = this.qy;
      this.edge(e2, x0, y0, tl, tr, br, bl, L);
      const i = this.n * 4, s = this.seg;
      s[i] = ax; s[i + 1] = ay; s[i + 2] = this.qx; s[i + 3] = this.qy;
      const rest = k % 5 === 0 ? this.aIndex : this.aRest, A_MIN = this.aMin, A_MAX = this.aMax;
      let a = rest;
      if (this.ps > 0) {
        const dx = (ax + this.qx) * 0.5 - this.sx, dy = (ay + this.qy) * 0.5 - this.sy;
        a = rest + (A_MAX - rest) * this.ps * Math.exp(-(dx * dx + dy * dy) / (GLOW_R * GLOW_R));
      }
      let b = Math.round((a - A_MIN) / (A_MAX - A_MIN) * (NB - 1));
      this.bk[this.n] = b < 0 ? 0 : b >= NB ? NB - 1 : b;
      this.n++;
    }
    render() {
      const { cols, rows, field: f } = this;
      const ph = this.t / CYCLE * TAU, ph2 = this.t / CYCLE2 * TAU;
      const c1 = Math.cos(ph) * 0.7, s1 = Math.sin(ph) * 0.7, c2 = Math.cos(ph2) * 0.5, s2 = Math.sin(ph2) * 0.5;
      const hill = HILL * this.ps, hr2 = HILL_R * HILL_R, sx = this.sx, sy = this.sy;
      for (let j = 0; j < rows; j++) {
        const y = (j - 1) * CELL;
        for (let i = 0; i < cols; i++) {
          const x = (i - 1) * CELL;
          const wx = noise(x * WFREQ + c1, y * WFREQ + s1 + 3.1) * WAMP;
          const wy = noise(x * WFREQ + 7.7 + c2, y * WFREQ - s2) * WAMP;
          const nx = x * FREQ + wx, ny = y * FREQ + wy;
          let v = noise(nx, ny) + 0.35 * noise(nx * 2.1 + 11.3, ny * 2.1 - 4.7);
          if (hill > 0) { const dx = x - sx, dy = y - sy; v += hill * Math.exp(-(dx * dx + dy * dy) / hr2); }
          f[j * cols + i] = v;
        }
      }
      this.n = 0;
      for (let j = 0; j < rows - 1; j++) {
        const y0 = (j - 1) * CELL;
        for (let i = 0; i < cols - 1; i++) {
          const x0 = (i - 1) * CELL, o = j * cols + i;
          const tl = f[o], tr = f[o + 1], br = f[o + cols + 1], bl = f[o + cols];
          const mn = Math.min(tl, tr, br, bl), mx = Math.max(tl, tr, br, bl);
          const k0 = Math.ceil(mn / STEP), k1 = Math.floor(mx / STEP);
          for (let k = k0; k <= k1; k++) {
            const L = k * STEP;
            const c = (tl >= L ? 8 : 0) | (tr >= L ? 4 : 0) | (br >= L ? 2 : 0) | (bl >= L ? 1 : 0);
            if (c === 0 || c === 15) continue;
            const km = ((k % 5) + 5) % 5;
            if (c === 5 || c === 10) {
              const hi = (tl + tr + br + bl) * 0.25 >= L;
              if ((c === 5) === hi) { this.push(3, 0, x0, y0, tl, tr, br, bl, L, km); this.push(2, 1, x0, y0, tl, tr, br, bl, L, km); }
              else { this.push(0, 1, x0, y0, tl, tr, br, bl, L, km); this.push(3, 2, x0, y0, tl, tr, br, bl, L, km); }
            } else { const e = EDGES[c]; this.push(e[0], e[1], x0, y0, tl, tr, br, bl, L, km); }
          }
        }
      }
      const { counts, starts, bk, ord, seg, n, ctx, dpr } = this;
      counts.fill(0);
      for (let i = 0; i < n; i++) counts[bk[i]]++;
      let acc = 0;
      for (let b = 0; b < NB; b++) { starts[b] = acc; acc += counts[b]; }
      for (let i = 0; i < n; i++) ord[starts[bk[i]]++] = i;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 1; ctx.lineCap = 'round';
      let p = 0;
      for (let b = 0; b < NB; b++) {
        const cnt = counts[b];
        if (!cnt) continue;
        ctx.beginPath();
        for (let q = p; q < p + cnt; q++) { const i = ord[q] * 4; ctx.moveTo(seg[i], seg[i + 1]); ctx.lineTo(seg[i + 2], seg[i + 3]); }
        ctx.strokeStyle = this.styles[b];
        ctx.stroke();
        p += cnt;
      }
      if (!this.shown) { this.shown = true; requestAnimationFrame(() => { this.cv.style.opacity = '1'; }); }
    }
  }
  customElements.define('topo-background', TopoBackground);
})();

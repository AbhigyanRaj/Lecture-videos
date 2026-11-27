// Ink motion runtime: deterministic render(t) for hand-drawn explainer scenes.
// Everything is a pure function of t, so frames can be captured in any order / in parallel.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const C = { ink: '#16120f', cream: '#fff1d6', amber: '#f4a340', orange: '#e8692c', navy: '#1b2140', night: '#121731', brown: '#2b1d17', purple: '#7b4fb8' };
  const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    linear: p => p,
    out: p => 1 - Math.pow(1 - p, 3),
    in: p => p * p * p,
    inOut: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
    back: p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
  };
  const prog = (t, at, dur, ease = 'out') => E[ease](clamp((t - at) / dur));

  const tracks = [];
  let penShown = false; const pens = new Set();            // per-frame updaters: fn(t)
  const on = fn => tracks.push(fn);

  function setup(svg) {
    const defs = el('defs', {}, svg);
    // line boil: displacement reseeded at 12 fps (classic hand-drawn wobble)
    const f = el('filter', { id: 'boil', x: '-5%', y: '-5%', width: '110%', height: '110%' }, defs);
    const turb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.018', numOctaves: 2, seed: 1, result: 'n' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 3.2, xChannelSelector: 'R', yChannelSelector: 'G' }, f);
    on(t => turb.setAttribute('seed', 1 + (Math.floor(t * 12) % 5)));
    // soft glow for highlights
    const g = el('filter', { id: 'glow', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    el('feGaussianBlur', { stdDeviation: 14, result: 'b' }, g);
    const m = el('feMerge', {}, g); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
    return defs;
  }

  // paper grain + vignette overlay (static, cheap)
  function paper(svg, defs) {
    const f = el('filter', { id: 'grain' }, defs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.85', numOctaves: 3, seed: 7 }, f);
    el('feColorMatrix', { values: '0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .85  0 0 0 .09 0' }, f);
    const v = el('radialGradient', { id: 'vig', cx: '50%', cy: '50%', r: '75%' }, defs);
    el('stop', { offset: '55%', 'stop-color': '#000', 'stop-opacity': 0 }, v);
    el('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': .55 }, v);
    const top = el('g', { 'pointer-events': 'none' }, svg);
    el('rect', { width: 1920, height: 1080, filter: 'url(#grain)' }, top);
    el('rect', { width: 1920, height: 1080, fill: 'url(#vig)' }, top);
    return top;
  }

  // stroke-draw any set of paths between [at, at+dur] (sequential), optional fill fade after
  function draw(paths, at, dur, { fill = null, fillDelay = .15, seq = true } = {}) {
    const items = paths.map(p => { const L = p.getTotalLength() + 2; p.style.strokeDasharray = L; return { p, L, fillTo: fill ? (p.getAttribute('data-fill-opacity') || 1) : null }; });
    const total = items.reduce((s, i) => s + i.L, 0);
    on(t => {
      let acc = 0;
      for (const i of items) {
        const a = seq ? at + dur * acc / total : at, d = seq ? dur * i.L / total : dur;
        const q = clamp((t - a) / d);
        i.p.style.strokeDashoffset = i.L * (1 - q);
        i.p.style.visibility = q > 0 ? 'visible' : 'hidden';
        if (i.fillTo !== null) i.p.style.fillOpacity = i.fillTo * clamp((t - a - d * .6 - fillDelay) / .25);
        acc += i.L;
      }
    });
    return items;
  }

  // hand-write text (glyph outlines from textpaths.mjs) with a pen nib that follows the ink
  function write(parent, tp, { x, y, at, dur, color = C.cream, outline = C.ink, sw = 3.2, pen = null, anchor = 'start' }) {
    const g = el('g', { transform: `translate(${anchor === 'middle' ? x - tp.w / 2 : x},${y})` }, parent);
    const ps = tp.glyphs.map(gl => el('path', { d: gl.d, fill: color, stroke: outline, 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'paint-order': 'stroke', 'fill-opacity': 0 }, g));
    const items = draw(ps, at, dur, { fill: true, fillDelay: .02 });
    if (pen) pens.add(pen);
    if (pen) on(t => {
      const p = clamp((t - at) / dur), vis = t > at - .15 && t < at + dur + .25;
      if (!vis) return;
      penShown = true;
      const total = items.reduce((s, i) => s + i.L, 0); let target = p * total, pt = null;
      for (const i of items) { if (target <= i.L) { pt = i.p.getPointAtLength(Math.max(0, target)); break; } target -= i.L; }
      if (!pt) { const last = items[items.length - 1]; pt = last.p.getPointAtLength(last.L - 2); }
      const ctm = g.getCTM(), sp = new DOMPoint(pt.x, pt.y).matrixTransform(ctm);
      const inv = pen.parentNode.getCTM().inverse(), lp = sp.matrixTransform(inv);
      pen.setAttribute('transform', `translate(${lp.x},${lp.y}) rotate(${-8 + 6 * Math.sin(t * 9)})`);
    });
    return g;
  }

  // simple pen nib (drawn, not an image)
  function makePen(parent) {
    const g = el('g', { style: 'opacity:0' }, parent);
    const r = el('g', { transform: 'rotate(35)' }, g);
    el('path', { d: 'M0 0 L-9 -26 L9 -26 Z', fill: C.cream, stroke: C.ink, 'stroke-width': 3 }, r);
    el('rect', { x: -11, y: -150, width: 22, height: 124, rx: 6, fill: C.orange, stroke: C.ink, 'stroke-width': 3 }, r);
    el('rect', { x: -11, y: -60, width: 22, height: 16, fill: C.amber, stroke: C.ink, 'stroke-width': 3 }, r);
    return g;
  }

  // rough.js shape -> drawn-on group
  function rough(svg, parent, kind, args, opts, at, dur) {
    const rc = window.rough.svg(svg);
    const node = rc[kind](...args, Object.assign({ roughness: 1.4, bowing: 1.2, strokeWidth: 5, stroke: C.ink, seed: 3 }, opts));
    parent.appendChild(node);
    const ps = [...node.querySelectorAll('path')];
    ps.forEach(p => { if (p.getAttribute('fill') && p.getAttribute('fill') !== 'none') { p.setAttribute('data-fill-opacity', 1); } });
    const strokes = ps.filter(p => p.getAttribute('stroke') && p.getAttribute('stroke') !== 'none');
    const fills = ps.filter(p => !strokes.includes(p));
    draw(strokes, at, dur);
    fills.forEach(p => on(t => { p.style.opacity = clamp((t - at - dur * .5) / .3); }));
    return node;
  }

  // keyed property animation helper: anim(t, [[t0,v0,ease],[t1,v1,ease],...])
  function key(t, ks) {
    if (t <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) {
      const [a, va] = ks[i - 1], [b, vb, ez = 'inOut'] = ks[i];
      return lerp(va, vb, E[ez]((t - a) / (b - a)));
    }
    return ks[ks.length - 1][1];
  }

  function reset() { tracks.length = 0; pens.clear(); }
  // ---- fonts + text (opentype in the browser; needs --allow-file-access-from-files) ----
  const FONTS = {};
  async function loadFonts(map) {
    await Promise.all(Object.entries(map).map(([k, url]) => FONTS[k] ? null : new Promise((res, rej) => {
      const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
      x.onload = () => { try { FONTS[k] = window.opentype.parse(x.response); res(); } catch (e) { rej(e); } };
      x.onerror = () => rej(new Error('font load failed ' + url)); x.send();
    })));
  }
  const n2 = v => (+v).toFixed(2);
  function toD(cmds) {
    return cmds.map(c => c.type === 'M' || c.type === 'L' ? `${c.type}${n2(c.x)} ${n2(c.y)}` : c.type === 'Q' ? `Q${n2(c.x1)} ${n2(c.y1)} ${n2(c.x)} ${n2(c.y)}` :
      c.type === 'C' ? `C${n2(c.x1)} ${n2(c.y1)} ${n2(c.x2)} ${n2(c.y2)} ${n2(c.x)} ${n2(c.y)}` : 'Z').join('');
  }
  const SUB = { '→': '->', '←': '<-', '−': '-', '–': '-', '—': '-', '≈': '~', '×': 'x', '’': "'", '‘': "'", '“': '"', '”': '"', '…': '...', '⁺': '+', '⁻': '-' };
  function clean(text, f) {
    return [...String(text)].map(c => SUB[c] ?? c).join('').split('').filter(c => c === ' ' || f.charToGlyphIndex(c) > 0).join('');
  }
  function tp(text, font = 'hand', size = 100, tracking = 0) {
    text = clean(text, FONTS[font]);
    const f = FONTS[font], sc = size / f.unitsPerEm, glyphs = []; let x = 0;
    for (const g of f.stringToGlyphs(text)) { const d = toD(g.getPath(x, 0, size).commands); if (d) glyphs.push({ d, x }); x += g.advanceWidth * sc + tracking; }
    return { w: x, asc: f.ascender * sc, desc: -f.descender * sc, glyphs };
  }
  function measure(text, font, size, tracking = 0) { return tp(text, font, size, tracking).w; }
  function wrap(text, font, size, maxW) {
    const words = String(text).split(/\s+/), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && measure(t, font, size) > maxW) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  // fit: shrink font size until wrapped text fits maxLines
  function fit(text, font, size, maxW, maxLines = 2, min = 28) {
    let s = size, L = wrap(text, font, s, maxW);
    const tooWide = L => L.some(l => measure(l, font, s) > maxW);
    while ((L.length > maxLines || tooWide(L)) && s > min) { s -= 3; L = wrap(text, font, s, maxW); }
    return { size: s, lines: L };
  }
  function render(t) { penShown = false; for (const fn of tracks) fn(t); pens.forEach(p => p.style.opacity = penShown ? 1 : 0); }
  window.Ink = { C, el, setup, paper, draw, write, makePen, rough, key, prog, clamp, lerp, E, on, render, reset, loadFonts, tp, wrap, fit, measure };
})();

// Scene templates for the ink-motion lecture engine. Each template builds SVG for one scene and registers
// time tracks with Ink.on(); everything is a pure function of t (seconds since scene start).
(function () {
  const { C, el, key, prog, clamp, on } = Ink;
  let svg, defs, R, D, PEN, LAY;                 // R[k] = reveal time of element k
  const W = 1920, H = 1080;

  // ---------------- helpers ----------------
  const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const at = k => R[Math.min(k, R.length - 1)];
  const lineEnd = k => { const L = D.timing.lines; const i = L.findIndex(l => l.show === k); return i >= 0 ? L[i].end : at(k) + 2; };
  function textDur(s, rate = .045, min = .35, max = 1.5) { return clamp(String(s).length * rate, min, max); }

  // write text block (wrapped); returns {g, h}
  function text(parent, str, { x, y, font = 'note', size = 48, maxW = 1500, maxLines = 3, color = C.cream, anchor = 'start', at: t0, dur, sw, lh = 1.2, pen = true, outline = C.ink }) {
    const f = Ink.fit(str, font, size, maxW, maxLines);
    const g = el('g', {}, parent); const n = f.lines.length;
    const total = dur ?? textDur(str, font === 'hand' ? .05 : .028, .35, font === 'hand' ? 1.4 : 1.9);
    const chars = f.lines.reduce((a, l) => a + l.length, 0) || 1; let acc = 0;
    f.lines.forEach((ln, i) => {
      const tp = Ink.tp(ln, font, f.size, font === 'hand' ? 2 : 0);
      const d = total * ln.length / chars;
      Ink.write(g, tp, { x, y: y + i * f.size * lh, at: t0 + total * acc / chars, dur: d, color, outline, anchor, sw: sw ?? Math.max(2, f.size / 26), pen: pen ? PEN : null });
      acc += ln.length;
    });
    return { g, h: n * f.size * lh, size: f.size, lines: n };
  }
  const heading = (parent, str, y, t0, o = {}) => text(parent, str, Object.assign({ x: W / 2, y, font: 'hand', size: 96, maxW: 1600, maxLines: 1, color: C.amber, anchor: 'middle', at: t0 }, o));

  // image with pop / draw-in, breathing, optional boil
  function image(parent, id, cx, cy, w, h, t0, { pop = 'back', boil = true, breathe = .012, rot = 0 } = {}) {
    const src = D.img[id]; const g = el('g', {}, parent);
    if (!src) {  // missing image: a hand-drawn placeholder blob so the scene still works
      Ink.rough(svg, g, 'ellipse', [cx, cy, w * .7, h * .6], { stroke: C.cream, strokeWidth: 4, seed: hash(id) % 99 }, t0, .5);
      return g;
    }
    const im = el('image', { href: src, x: -w / 2, y: -h / 2, width: w, height: h, preserveAspectRatio: 'xMidYMid meet' }, g);
    if (boil) im.setAttribute('filter', 'url(#boil)');
    const ph = hash(id) % 10;
    on(t => {
      const p = prog(t, t0, .6, pop === 'back' ? 'back' : 'out');
      const b = 1 + breathe * Math.sin((t + ph) * 2.1);
      g.setAttribute('transform', `translate(${cx},${cy}) scale(${Math.max(.001, p * b)}) rotate(${rot + (1 - p) * -8})`);
      g.style.opacity = clamp((t - t0) / .15);
    });
    return g;
  }
  // hand-drawn arrow
  function arrow(parent, x1, y1, x2, y2, t0, { color = C.cream, bend = .18, sw = 6, dur = .45, seed = 5 } = {}) {
    const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
    Ink.rough(svg, parent, 'curve', [[[x1, y1], [mx, my], [x2, y2]]], { stroke: color, strokeWidth: sw, seed, roughness: 1 }, t0, dur);
    const a = Math.atan2(y2 - my, x2 - mx), L = 26;
    const p1 = [x2 - L * Math.cos(a - .5), y2 - L * Math.sin(a - .5)], p2 = [x2 - L * Math.cos(a + .5), y2 - L * Math.sin(a + .5)];
    Ink.rough(svg, parent, 'linearPath', [[p1, [x2, y2], p2]], { stroke: color, strokeWidth: sw, seed: seed + 1, roughness: .8 }, t0 + dur * .85, .18);
    return { mx, my };
  }
  function box(parent, x, y, w, h, t0, { fill = 'rgba(18,14,28,.55)', stroke = C.cream, sw = 4, seed = 3, dur = .5, r = 26 } = {}) {
    const g = el('g', {}, parent);
    const bg = el('rect', { x, y, width: w, height: h, rx: r, fill }, g);
    on(t => bg.style.opacity = clamp((t - t0 - dur * .3) / .3));
    Ink.rough(svg, g, 'rectangle', [x, y, w, h], { stroke, strokeWidth: sw, seed, roughness: 1.1 }, t0, dur);
    return g;
  }
  function tick(parent, x, y, t0, s = 1, color = C.amber) {
    Ink.rough(svg, parent, 'linearPath', [[[x - 18 * s, y], [x - 4 * s, y + 16 * s], [x + 22 * s, y - 20 * s]]], { stroke: color, strokeWidth: 8 * s, seed: 31, roughness: .6 }, t0, .3);
  }
  function cross(parent, x, y, t0, s = 1) {
    Ink.rough(svg, parent, 'line', [x - 18 * s, y - 18 * s, x + 18 * s, y + 18 * s], { stroke: '#e0553a', strokeWidth: 7 * s, seed: 41 }, t0, .15);
    Ink.rough(svg, parent, 'line', [x + 18 * s, y - 18 * s, x - 18 * s, y + 18 * s], { stroke: '#e0553a', strokeWidth: 7 * s, seed: 42 }, t0 + .12, .15);
  }
  function badge(parent, label, x, y, t0, color = C.amber) {
    const tpw = Ink.measure(label, 'bold', 34, 3) + 56;
    const g = el('g', {}, parent);
    const r = el('rect', { x: x, y: y - 40, width: tpw, height: 56, rx: 28, fill: color, stroke: C.ink, 'stroke-width': 4 }, g);
    const tx = el('text', { x: x + tpw / 2, y: y - 2, 'text-anchor': 'middle', 'font-family': 'NoteB', 'font-size': 34, fill: C.ink, 'letter-spacing': 3 }, g); tx.textContent = label;
    on(t => { const p = prog(t, t0, .4, 'back'); g.setAttribute('transform', `translate(${x + tpw / 2},${y - 12}) scale(${Math.max(.001, p)}) translate(${-(x + tpw / 2)},${-(y - 12)})`); });
    return tpw;
  }
  function numDot(parent, n, x, y, t0, r = 30, fill = C.amber) {
    const g = el('g', {}, parent);
    el('circle', { cx: x, cy: y, r, fill, stroke: C.ink, 'stroke-width': 4 }, g);
    const tx = el('text', { x, y: y + r * .38, 'text-anchor': 'middle', 'font-family': 'Hand', 'font-size': r * 1.15, fill: C.ink }, g); tx.textContent = n;
    on(t => { const p = prog(t, t0, .35, 'back'); g.setAttribute('transform', `translate(${x},${y}) scale(${Math.max(.001, p)}) translate(${-x},${-y})`); });
    return g;
  }
  // grid helper: n items across width
  const across = (n, w = 1640, x0 = (W - w) / 2) => [...Array(n)].map((_, i) => x0 + w * (i + .5) / n);

  // ---------------- templates ----------------
  const TPL = {};

  TPL.title = (s, L) => {
    if (s.kicker) text(L, s.kicker, { x: W / 2, y: 300, font: 'bold', size: 46, color: C.cream, anchor: 'middle', at: at(0), dur: .5, maxLines: 1 });
    const T = text(L, s.title, { x: W / 2, y: 430, font: 'hand', size: 120, maxW: 1600, maxLines: 2, color: C.amber, anchor: 'middle', at: at(0) + .3 });
    const yS = 430 + T.h + 10;
    Ink.rough(svg, L, 'curve', [[[W / 2 - 330, yS - 70], [W / 2, yS - 50], [W / 2 + 330, yS - 72]]], { stroke: C.amber, strokeWidth: 7, seed: 9 }, at(0) + .9, .4);
    if (s.subtitle) text(L, s.subtitle, { x: W / 2, y: yS + 20, size: 50, maxW: 1400, maxLines: 2, anchor: 'middle', at: at(0) + 1.1 });
    const ng = (s.goals || []).length, gStep = T.lines > 1 ? 70 : 82, g0 = Math.min(yS + 170, 990 - (ng - 1) * gStep);
    (s.goals || []).forEach((gTxt, i) => {
      const y = g0 + i * gStep, t0 = at(i + 1);
      tick(L, 470, y - 14, t0, 1);
      text(L, gTxt, { x: 520, y, size: 46, maxW: 1000, maxLines: 1, at: t0 + .15 });
    });
    sparkles(L, [[260, 250], [1660, 300], [1600, 820], [330, 840]], at(0) + 1);
  };

  TPL.term = (s, L) => {
    const hasImg = !!s.img;
    if (hasImg) {
      image(L, s.img.id, 520, 560, 700, 700, at(0));
      const x = 980, mw = 820;
      const T = text(L, s.term, { x, y: 300, font: 'hand', size: 110, maxW: mw, maxLines: 2, color: C.amber, at: at(0) + .2 });
      const M = text(L, s.meaning, { x, y: 300 + T.h + 40, size: 54, maxW: mw, maxLines: 4, at: at(1) });
      if (s.example) { const y = 300 + T.h + M.h + 110; box(L, x - 30, y - 62, mw + 60, 210, at(2)); badge(L, 'EXAMPLE', x, y - 66, at(2)); text(L, s.example, { x, y: y + 30, size: 44, maxW: mw - 20, maxLines: 3, at: at(2) + .3 }); }
    } else {
      const T = text(L, s.term, { x: W / 2, y: 330, font: 'hand', size: 130, maxW: 1600, maxLines: 1, color: C.amber, anchor: 'middle', at: at(0) });
      Ink.rough(svg, L, 'curve', [[[W / 2 - 300, 370], [W / 2, 390], [W / 2 + 300, 368]]], { stroke: C.amber, strokeWidth: 7, seed: 12 }, at(0) + .6, .35);
      text(L, s.meaning, { x: W / 2, y: 500, size: 60, maxW: 1450, maxLines: 3, anchor: 'middle', at: at(1) });
      if (s.example) { box(L, 260, 690, 1400, 220, at(2)); badge(L, 'EXAMPLE', 300, 688, at(2)); text(L, s.example, { x: W / 2, y: 800, size: 48, maxW: 1300, maxLines: 2, anchor: 'middle', at: at(2) + .3 }); }
    }
  };

  TPL.illus = (s, L) => {
    const co = s.callouts || [];
    heading(L, s.label, 140, at(0) + .3);
    const iw = co.length ? 720 : 820;
    image(L, s.img.id, W / 2, 545, iw, iw * .86, at(0));
    if (s.caption) text(L, s.caption, { x: W / 2, y: 990, size: 50, maxW: 1500, maxLines: 1, anchor: 'middle', at: at(1) });
    co.forEach((c, i) => {
      const left = i % 2 === 0, row = Math.floor(i / 2), y = 380 + row * 260;
      const x = left ? 270 : 1650, t0 = at(i + 2);
      const T = text(L, c.text, { x, y, font: 'hand', size: 56, maxW: 360, maxLines: 2, color: C.cream, anchor: 'middle', at: t0 + .25 });
      arrow(L, left ? x + 150 : x - 150, y + 20, left ? 700 : 1220, y + 40 + row * 30, t0, { bend: left ? -.15 : .15, seed: 50 + i });
    });
  };

  TPL.diagram = (s, L) => {
    heading(L, s.title, 130, at(0) + .3, { size: 84 });
    const parts = s.parts || [];
    image(L, s.img.id, 640, 590, 820, 760, at(0));
    const x = 1150, y0 = 300, step = Math.min(130, 640 / Math.max(1, parts.length));
    parts.forEach((p, i) => {
      const y = y0 + i * step, t0 = at(i + 1);
      numDot(L, i + 1, x, y - 18, t0, 28);
      text(L, p.name, { x: x + 50, y, font: 'hand', size: 54, maxW: 620, maxLines: 1, color: C.amber, at: t0 + .1 });
      if (p.note) text(L, p.note, { x: x + 50, y: y + 46, size: 36, maxW: 640, maxLines: 1, at: t0 + .45 });
      if (p.at) { const px = 640 + (p.at[0] - .5) * 820, py = 590 + (p.at[1] - .5) * 760; numDot(L, i + 1, px, py, t0, 22, C.cream); arrow(L, x - 40, y - 18, px + 26, py, t0 + .1, { sw: 4, bend: .05, seed: 70 + i, color: 'rgba(255,241,214,.8)' }); }
    });
  };

  TPL.zoom = (s, L) => {
    const lv = s.levels, n = lv.length, groups = [];
    const crumbsY = 960;
    lv.forEach((l, i) => {
      const g = el('g', {}, L); groups.push(g);
      const clip = el('clipPath', { id: `zc${i}` }, defs); const c = el('circle', { cx: W / 2, cy: 540, r: i ? 0 : 3000 }, clip);
      g.setAttribute('clip-path', `url(#zc${i})`);
      el('rect', { width: W, height: H, fill: i % 2 ? 'url(#cave)' : 'url(#sky)' }, g);
      el('ellipse', { cx: W / 2, cy: 560, rx: 820, ry: 460, fill: 'url(#warm)' }, g);
      const inner = el('g', {}, g);
      image(inner, l.img.id, W / 2, 560, 760, 680, at(i) + (i ? .35 : 0));
      heading(g, l.label, 170, at(i) + .45, { size: 110 });
      if (l.caption) text(g, l.caption, { x: W / 2, y: 880, size: 52, maxW: 1400, maxLines: 1, anchor: 'middle', at: at(i) + 1.0 });
      const ring = el('circle', { cx: W / 2, cy: 540, r: 0, fill: 'none', stroke: C.ink, 'stroke-width': 30, filter: 'url(#boil)' }, L);
      on(t => {
        if (i) { const r = key(t, [[at(i) - .05, 0], [at(i) + .55, 1250, 'in']]); c.setAttribute('r', r); ring.setAttribute('r', r); ring.style.opacity = r > 0 && r < 1240 ? 1 : 0; }
        const nxt = i < n - 1 ? at(i + 1) : 1e9;
        const z = key(t, [[nxt - .5, 1], [nxt + .5, 3.2, 'in']]);
        inner.setAttribute('transform', `translate(${W / 2},560) scale(${z}) translate(${-W / 2},-560)`);
        g.style.display = t > nxt + .6 ? 'none' : '';
      });
    });
    // breadcrumb chips
    const cw = 210, gap = 54, x0 = W / 2 - (n * cw + (n - 1) * gap) / 2;
    lv.forEach((l, i) => {
      const x = x0 + i * (cw + gap), g = el('g', {}, L);
      const bx = el('rect', { x, y: crumbsY - 30, width: cw, height: 60, rx: 30, stroke: C.ink, 'stroke-width': 4 }, g);
      const tx = el('text', { x: x + cw / 2, y: crumbsY + 12, 'text-anchor': 'middle', 'font-family': 'Note', 'font-size': 36 }, g); tx.textContent = l.label;
      if (i) { const a = el('text', { x: x - gap / 2, y: crumbsY + 12, 'text-anchor': 'middle', 'font-family': 'Note', 'font-size': 36, fill: C.cream }, g); a.textContent = '›'; }
      on(t => { g.style.opacity = clamp((t - at(i)) / .3); const act = t >= at(i) && (i === n - 1 || t < at(i + 1)); bx.setAttribute('fill', act ? C.amber : '#1c1530'); tx.setAttribute('fill', act ? C.ink : C.cream); });
    });
  };

  TPL.compare = (s, L) => {
    heading(L, s.title, 130, at(0) + .2, { size: 84 });
    const cols = s.cols, nc = cols.length, cw = nc === 2 ? 760 : 540, xs = across(nc, nc === 2 ? 1640 : 1740);
    const hasImg = cols.some(c => c.img);
    let k = 1 + nc; const ptAt = cols.map(() => []);
    const maxP = Math.max(...cols.map(c => c.points.length));
    for (let r = 0; r < maxP; r++) cols.forEach((c, ci) => { if (r < c.points.length) ptAt[ci][r] = k++; });
    cols.forEach((c, ci) => {
      const x = xs[ci], t0 = at(1 + ci);
      box(L, x - cw / 2, 210, cw, 800, t0, { seed: 20 + ci });
      text(L, c.head, { x, y: 300, font: 'hand', size: 72, maxW: cw - 60, maxLines: 1, color: C.amber, anchor: 'middle', at: t0 + .2 });
      let y = 360;
      if (c.img) { image(L, c.img.id, x, 480, 260, 230, t0 + .3); }
      y = hasImg ? 650 : 420;
      c.points.forEach((p, r) => {
        const tp = at(ptAt[ci][r]);
        el('circle', { cx: x - cw / 2 + 50, cy: y - 14, r: 8, fill: C.amber }, L).style.opacity = 0;
        const dot = L.lastChild; on(t => dot.style.opacity = clamp((t - tp) / .2));
        const T = text(L, p, { x: x - cw / 2 + 74, y, size: 42, maxW: cw - 110, maxLines: 2, at: tp + .1 });
        y += T.h + 34;
      });
    });
  };

  TPL.steps = (s, L) => {
    heading(L, s.title, 140, at(0) + .2, { size: 88 });
    const st = s.steps, n = st.length, xs = across(n, 1720), hasImg = st.some(x => x.img), cy = hasImg ? 470 : 500;
    st.forEach((p, i) => {
      const x = xs[i], t0 = at(i + 1);
      if (p.img) image(L, p.img.id, x, cy, 280, 260, t0 + .15);
      else { const g = el('g', {}, L); Ink.rough(svg, g, 'circle', [x, cy, 190], { fill: 'rgba(244,163,64,.18)', fillStyle: 'solid', stroke: C.amber, strokeWidth: 6, seed: 60 + i }, t0, .45); numDot(L, i + 1, x, cy, t0 + .25, 46); }
      const LB = text(L, p.label, { x, y: cy + 210, font: 'hand', size: 60, maxW: 1640 / n - 30, maxLines: 2, color: C.amber, anchor: 'middle', at: t0 + .3, lh: 1.05 });
      if (p.note) text(L, p.note, { x, y: cy + 210 + LB.h + 20, size: 38, maxW: 1640 / n - 40, maxLines: 3, anchor: 'middle', at: t0 + .7 });
      if (i) {
        const x1 = xs[i - 1] + 150, x2 = x - 150;
        arrow(L, x1, cy - 10, x2, cy - 10, t0 - .05, { bend: -.12, seed: 80 + i, dur: .4 });
        const dot = el('circle', { r: 13, fill: C.amber, filter: 'url(#glow)' }, L);
        on(t => { const p2 = clamp((t - t0) / .7); dot.style.opacity = p2 > 0 && p2 < 1 ? 1 : 0; const xx = x1 + (x2 - x1) * p2, yy = cy - 10 - Math.sin(p2 * Math.PI) * (x2 - x1) * .12; dot.setAttribute('cx', xx); dot.setAttribute('cy', yy); });
      }
    });
  };

  TPL.cycle = (s, L) => {
    heading(L, s.title, 120, at(0) + .2, { size: 84 });
    const n = s.steps.length, cx = W / 2, cy = 590, rad = 330;
    const cg = el('g', {}, L); Ink.rough(svg, cg, 'circle', [cx, cy, 300], { fill: 'rgba(244,163,64,.2)', fillStyle: 'solid', stroke: C.amber, strokeWidth: 6, seed: 90 }, at(0), .5);
    text(L, s.center, { x: cx, y: cy + 10, font: 'hand', size: 54, maxW: 250, maxLines: 2, color: C.cream, anchor: 'middle', at: at(0) + .4 });
    const pos = s.steps.map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + rad * 1.35 * Math.cos(a), cy + rad * Math.sin(a)]; });
    s.steps.forEach((p, i) => {
      const [x, y] = pos[i], t0 = at(i + 1);
      box(L, x - 210, y - 64, 420, 120, t0, { seed: 100 + i, r: 58 });
      text(L, p.label, { x, y: y + 16, font: 'hand', size: 50, maxW: 380, maxLines: 1, color: C.amber, anchor: 'middle', at: t0 + .2 });
      const [nx, ny] = pos[(i + 1) % n];
      const tA = i === n - 1 ? at(n) + .6 : at(i + 2) - .1;
      const ax = x + (nx - x) * .28, ay = y + (ny - y) * .28, bx = x + (nx - x) * .72, by = y + (ny - y) * .72;
      arrow(L, ax, ay, bx, by, tA, { bend: .25, seed: 110 + i, sw: 5 });
    });
    const dot = el('circle', { r: 14, fill: C.amber, filter: 'url(#glow)' }, L);
    on(t => { const t0 = at(n) + 1.2; dot.style.opacity = t > t0 ? 1 : 0; const a = -Math.PI / 2 + (t - t0) * .9; dot.setAttribute('cx', cx + rad * 1.0 * Math.cos(a)); dot.setAttribute('cy', cy + rad * .72 * Math.sin(a)); });
  };

  TPL.table = (s, L) => {
    heading(L, s.title, 130, at(0) + .2, { size: 84 });
    const nc = s.cols.length, nr = s.rows.length, tw = 1680, x0 = 120, y0 = 200;
    const rh = Math.min(150, 800 / (nr + 1)), hh = Math.min(96, rh);
    const cwRatio = nc === 2 ? [.34, .66] : [.22, .36, .42];
    const xs = []; let acc = x0; cwRatio.forEach(r => { xs.push(acc); acc += tw * r; });
    const tot = hh + rh * nr;
    box(L, x0, y0, tw, tot, at(0), { seed: 130 });
    const hb = el('rect', { x: x0 + 3, y: y0 + 3, width: tw - 6, height: hh - 6, rx: 22, fill: 'rgba(244,163,64,.22)' }, L);
    on(t => hb.style.opacity = clamp((t - at(0) - .3) / .3));
    const cell = (str, x, top, h, w, o) => {   // vertically centred, wrapped
      const f = Ink.fit(str, o.font, o.size, w, 2, 26), bh = f.lines.length * f.size * 1.15;
      return text(L, str, Object.assign({ x, y: top + (h - bh) / 2 + f.size * .82, maxW: w, maxLines: 2, size: f.size, lh: 1.15 }, o));
    };
    s.cols.forEach((c, ci) => cell(c, xs[ci] + 28, y0, hh, tw * cwRatio[ci] - 50, { font: 'hand', size: 48, color: C.amber, at: at(0) + .3 + ci * .2 }));
    s.rows.forEach((row, ri) => {
      const y = y0 + hh + rh * ri, t0 = at(ri + 1);
      Ink.rough(svg, L, 'line', [x0 + 20, y, x0 + tw - 20, y], { stroke: 'rgba(255,241,214,.45)', strokeWidth: 3, seed: 140 + ri }, t0, .3);
      const hl = el('rect', { x: x0 + 6, y: y + 4, width: tw - 12, height: rh - 8, rx: 18, fill: 'rgba(244,163,64,.16)' }, L);
      on(t => hl.style.opacity = t >= t0 && t < (ri + 2 < R.length ? at(ri + 2) : 1e9) ? 1 : 0);
      row.forEach((c, ci) => cell(c, xs[ci] + 28, y, rh, tw * cwRatio[ci] - 50, { size: Math.min(42, rh * .34), color: ci === 0 ? C.amber : C.cream, font: ci === 0 ? 'hand' : 'note', at: t0 + .15 + ci * .25 }));
    });
    for (let ci = 1; ci < nc; ci++) Ink.rough(svg, L, 'line', [xs[ci], y0 + 15, xs[ci], y0 + tot - 15], { stroke: 'rgba(255,241,214,.45)', strokeWidth: 3, seed: 150 + ci }, at(0) + .4, .4);
  };

  TPL.analogy = (s, L) => {
    const np = s.points.length;
    image(L, s.left.img.id, 470, 350, 500, 430, at(0));
    text(L, s.left.label, { x: 470, y: 630, font: 'hand', size: 64, maxW: 600, maxLines: 1, color: C.amber, anchor: 'middle', at: at(0) + .3 });
    image(L, s.right.img.id, 1450, 350, 500, 430, at(1));
    text(L, s.right.label, { x: 1450, y: 630, font: 'hand', size: 64, maxW: 600, maxLines: 1, color: C.amber, anchor: 'middle', at: at(1) + .3 });
    text(L, 'vs', { x: W / 2, y: 390, font: 'hand', size: 120, maxLines: 1, color: C.cream, anchor: 'middle', at: at(1) + .1, pen: false });
    s.points.forEach((p, i) => { const y = 730 + i * 62; const t0 = at(2 + i); tick(L, 380, y - 14, t0, .8, C.cream); text(L, p, { x: 420, y, size: 44, maxW: 1150, maxLines: 1, at: t0 + .1 }); });
    const vy = 730 + np * 62 + 40, tv = at(2 + np);
    if (s.verdict) { box(L, 300, vy - 50, 1320, 90, tv, { stroke: C.amber, seed: 160 }); text(L, s.verdict, { x: W / 2, y: vy + 12, font: 'hand', size: 50, maxW: 1240, maxLines: 1, color: C.amber, anchor: 'middle', at: tv + .2 }); }
  };

  TPL.confuse = (s, L) => {
    badge(L, "DON'T CONFUSE", 120, 120, at(0), '#e8692c');
    heading(L, s.title, 230, at(0) + .2, { size: 84 });
    const n = s.items.length, xs = across(n, 1720), cw = 1720 / n - 40;
    s.items.forEach((it, i) => {
      const x = xs[i], t0 = at(1 + i);
      box(L, x - cw / 2, 320, cw, 450, t0, { seed: 170 + i, stroke: i % 2 ? C.cream : C.amber });
      const TT = text(L, it.term, { x, y: 420, font: 'hand', size: 66, maxW: cw - 50, maxLines: 2, color: C.amber, anchor: 'middle', at: t0 + .2, lh: 1.05 });
      text(L, it.is, { x, y: 420 + TT.h + 40, size: 42, maxW: cw - 60, maxLines: 4, anchor: 'middle', at: t0 + .6 });
    });
    const tn = at(1 + n);
    if (s.note) { box(L, 200, 840, 1520, 120, tn, { stroke: '#e8692c', seed: 180 }); text(L, s.note, { x: W / 2, y: 915, size: 46, maxW: 1420, maxLines: 1, anchor: 'middle', at: tn + .2 }); }
  };

  TPL.scale = (s, L) => {
    heading(L, s.title, 150, at(0) + .2, { size: 88 });
    const x0 = 230, x1 = 1690, y = 620, mn = s.min, mx = s.max;
    const gid = 'sg' + hash(s.title); const lg = el('linearGradient', { id: gid }, defs);
    [['0', '#e8692c'], ['.5', '#f6e7b0'], ['1', '#4f6fd1']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, lg));
    const bar = el('rect', { x: x0, y: y - 30, width: x1 - x0, height: 60, rx: 30, fill: `url(#${gid})`, stroke: C.ink, 'stroke-width': 5 }, L);
    const clip = el('clipPath', { id: gid + 'c' }, defs); const cr = el('rect', { x: x0 - 10, y: y - 60, width: 0, height: 120 }, clip); bar.setAttribute('clip-path', `url(#${gid}c)`);
    on(t => cr.setAttribute('width', (x1 - x0 + 20) * prog(t, at(0), .9, 'inOut')));
    const span = mx - mn, stepv = span <= 14 ? 1 : [2, 5, 10, 20, 25, 50, 100, 200, 500].find(v => span / v <= 10) || Math.ceil(span / 10);
    for (let v = Math.ceil(mn / stepv) * stepv; v <= mx + 1e-9; v += stepv) {
      const x = x0 + (v - mn) / span * (x1 - x0), tt = el('text', { x, y: y + 80, 'text-anchor': 'middle', 'font-family': 'Note', 'font-size': 34, fill: C.cream }, L); tt.textContent = String(+v.toFixed(2));
      on(t => tt.style.opacity = clamp((t - at(0) - .2 - (v - mn) / span * .7) / .2));
    }
    text(L, s.left, { x: x0, y: y + 160, font: 'hand', size: 56, maxW: 500, maxLines: 1, color: '#f08a4b', at: at(0) + .8 });
    text(L, s.right, { x: x1, y: y + 160, font: 'hand', size: 56, maxW: 500, maxLines: 1, color: '#8fa6ff', anchor: 'end', at: at(0) + 1.0 });
    s.points.forEach((p, i) => {
      const x = x0 + clamp((p.v - mn) / span) * (x1 - x0), t0 = at(1 + i), hy = y - 120 - (i % 2) * 120;
      const g = el('g', {}, L); el('path', { d: `M${x} ${y - 36} l-22 -40 h44 z`, fill: C.amber, stroke: C.ink, 'stroke-width': 4 }, g);
      on(t => { const q = prog(t, t0, .4, 'back'); g.setAttribute('transform', `translate(${x},${y - 40}) scale(${Math.max(.001, q)}) translate(${-x},${-(y - 40)})`); });
      Ink.rough(svg, L, 'line', [x, y - 80, x, hy + 14], { stroke: C.cream, strokeWidth: 3, seed: 190 + i }, t0 + .2, .2);
      text(L, p.label, { x, y: hy, font: 'hand', size: 50, maxW: 420, maxLines: 1, color: C.cream, anchor: 'middle', at: t0 + .3 });
    });
  };

  TPL.quiz = (s, L) => {
    const n = s.options.length, ansAt = at(n + 1), isCheck = s.kind === 'check';
    badge(L, isCheck ? 'QUICK CHECK' : 'MCQ', 120, 120, at(0), isCheck ? C.amber : '#8fa6ff');
    const Q = text(L, s.question, { x: W / 2, y: 250, size: 56, maxW: 1560, maxLines: 3, anchor: 'middle', at: at(0) + .2 });
    const longOpt = s.options.some(o => o.length > 30), two = n === 4 && !longOpt, ow = two ? 760 : 1400, oh = two ? 120 : (n === 4 ? 104 : 120);
    const pause = D.timing.lines.find(l => l.pause);
    s.options.forEach((o, i) => {
      const col = two ? i % 2 : 0, row = two ? Math.floor(i / 2) : i;
      const x = two ? (col ? 1000 : 160) : (W - ow) / 2, y = 250 + Q.h + 50 + row * (oh + (two ? 34 : 24)), t0 = at(1 + i);
      const g = el('g', {}, L);
      const hl = el('rect', { x, y, width: ow, height: oh, rx: 30, fill: C.amber }, g);
      box(g, x, y, ow, oh, t0, { seed: 200 + i });
      numDot(g, 'ABCD'[i], x + 64, y + oh / 2, t0 + .1, 34, C.cream);
      { const f = Ink.fit(o, 'note', 42, ow - 180, 2, 30); text(g, o, { x: x + 120, y: y + oh / 2 + f.size * .35 - (f.lines.length - 1) * f.size * .55, size: f.size, maxW: ow - 180, maxLines: 2, lh: 1.1, at: t0 + .2 }); }
      const right = i === s.answer;
      on(t => { const q = prog(t, ansAt, .35); hl.style.opacity = right ? .35 * q : 0; g.style.opacity = right ? 1 : 1 - .55 * q; });
      if (right) tick(g, x + ow - 60, y + oh / 2, ansAt + .1, 1.3); else cross(g, x + ow - 60, y + oh / 2, ansAt + .25, .9);
    });
    if (pause) {   // countdown ring
      const cx = 1760, cy = 140, r = 52, g = el('g', {}, L);
      el('circle', { cx, cy, r, fill: 'rgba(18,14,28,.6)', stroke: C.cream, 'stroke-width': 4 }, g);
      const arc = el('path', { fill: C.amber }, g);
      const num = el('text', { x: cx, y: cy + 20, 'text-anchor': 'middle', 'font-family': 'Hand', 'font-size': 56, fill: C.cream }, g);
      on(t => {
        const a = pause.start, d = pause.end - pause.start, p = clamp((t - a) / d);
        g.style.opacity = t > a - .2 && t < pause.end + .3 ? 1 : 0;
        const ang = p * 2 * Math.PI, x2 = cx + r * Math.sin(ang), y2 = cy - r * Math.cos(ang);
        arc.setAttribute('d', p <= 0 ? '' : p >= 1 ? `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - .01} ${cy - r}Z` : `M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${ang > Math.PI ? 1 : 0} 1 ${x2} ${y2}Z`);
        arc.style.opacity = .55; num.textContent = Math.max(1, Math.ceil(d - (t - a)));
      });
    }
    if (s.why) { const y = 250 + Q.h + 50 + (two ? 2 : n) * (oh + (two ? 34 : 24)) + 40; text(L, s.why, { x: W / 2, y: Math.min(y + 30, 1000), size: 44, maxW: 1560, maxLines: 2, color: C.amber, anchor: 'middle', at: ansAt + .5 }); }
  };

  TPL.recap = (s, L) => {
    heading(L, s.title || 'Recap', 140, at(0) - .3, { size: 96 });
    const n = s.points.length, two = n > 4, per = two ? Math.ceil(n / 2) : n;
    s.points.forEach((p, i) => {
      const col = two ? Math.floor(i / per) : 0, row = two ? i % per : i;
      const x = two ? (col ? 1010 : 170) : 380, y = 310 + row * (two ? 150 : 150), t0 = at(i);
      Ink.rough(svg, L, 'rectangle', [x, y - 40, 52, 52], { stroke: C.cream, strokeWidth: 4, seed: 210 + i }, t0 - .1, .3);
      tick(L, x + 27, y - 16, t0 + .25, 1.1);
      text(L, p, { x: x + 80, y, size: 46, maxW: two ? 700 : 1160, maxLines: 2, at: t0 + .1 });
    });
  };

  // ---------------- mind map: centre + branches (+ short children), optional focus branch ----------------
  TPL.mindmap = (s, L) => {
    const br = s.branches || [], n = br.length, cx = W / 2, cy = s.title ? 600 : 560, focus = s.focus ?? -1;
    if (s.title) heading(L, s.title, 105, at(0), { size: 70 });
    const cg = el('g', {}, L);
    Ink.rough(svg, cg, 'ellipse', [cx, cy, 420, 150], { fill: 'rgba(244,163,64,.25)', fillStyle: 'solid', stroke: C.amber, strokeWidth: 6, seed: 400 }, at(0), .5);
    text(L, s.center, { x: cx, y: cy + 14, font: 'hand', size: 50, maxW: 370, maxLines: 2, color: C.cream, anchor: 'middle', at: at(0) + .3, lh: 1.0 });
    const rx = 690, ry = s.title ? 300 : 330, bw = n > 6 ? 320 : 350;
    br.forEach((b, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a), t0 = at(1 + i);
      const isF = i === focus, dim = focus >= 0 && !isF;
      const g = el('g', {}, L);
      const ex = cx + 215 * Math.cos(a), ey = cy + 80 * Math.sin(a);
      Ink.rough(svg, g, 'curve', [[[ex, ey], [(ex + x) / 2 + 30 * Math.sin(a), (ey + y) / 2 - 20 * Math.cos(a)], [x - (bw / 2) * Math.cos(a) * .7, y - 40 * Math.sin(a)]]], { stroke: isF ? C.amber : C.cream, strokeWidth: isF ? 7 : 4, seed: 410 + i }, t0, .4);
      const bh = 84, bx = x - bw / 2, by = y - bh / 2;
      const fill = el('rect', { x: bx, y: by, width: bw, height: bh, rx: 40, fill: isF ? C.amber : 'rgba(18,14,28,.7)' }, g);
      on(t => fill.style.opacity = clamp((t - t0 - .2) / .3));
      Ink.rough(svg, g, 'rectangle', [bx, by, bw, bh], { stroke: isF ? C.amber : C.cream, strokeWidth: 4, seed: 420 + i }, t0, .4);
      text(g, b.label, { x, y: y + 13, font: 'hand', size: 40, maxW: bw - 64, maxLines: 1, color: isF ? C.ink : C.amber, outline: isF ? C.amber : C.ink, anchor: 'middle', at: t0 + .15 });
      const kids = (b.children || []).slice(0, 4), up = Math.sin(a) < -0.2, ky0 = up ? by - 18 - (kids.length - 1) * 32 : by + bh + 34;
      kids.forEach((k, j) => text(g, k, { x, y: ky0 + j * 32, size: 26, maxW: bw + 40, maxLines: 1, color: C.cream, anchor: 'middle', at: t0 + .4 + j * .12, pen: false }));
      if (isF) g.setAttribute('filter', 'url(#glow)');
      on(t => g.style.opacity = dim ? .38 : 1);
    });
  };

  // ---------------- line graph (e.g. action potential) ----------------
  const PRESETS = { action_potential: { xmax: 5, ymin: -90, ymax: 40, points: [[0, -70], [0.9, -70], [1.25, -64], [1.5, -55], [1.72, -10], [1.92, 30], [2.12, 18], [2.45, -40], [2.75, -78], [3.05, -82], [3.6, -76], [4.3, -71], [5, -70]] } };
  TPL.graph = (s, L) => {
    heading(L, s.title, 120, at(0) + .2, { size: 84 });
    const P = Object.assign({}, PRESETS[s.curve] || {}, s); const pts = P.points || [[0, 0], [1, 1]];
    const xmax = P.xmax ?? Math.max(...pts.map(p => p[0])), ymin = P.ymin ?? Math.min(...pts.map(p => p[1])), ymax = P.ymax ?? Math.max(...pts.map(p => p[1]));
    const X0 = 300, X1 = 1640, Y0 = 900, Y1 = 230, px = x => X0 + x / xmax * (X1 - X0), py = y => Y0 - (y - ymin) / (ymax - ymin) * (Y0 - Y1);
    Ink.rough(svg, L, 'line', [X0, Y0, X1 + 30, Y0], { stroke: C.cream, strokeWidth: 5, seed: 300 }, at(0), .5);
    Ink.rough(svg, L, 'line', [X0, Y0, X0, Y1 - 30], { stroke: C.cream, strokeWidth: 5, seed: 301 }, at(0), .5);
    text(L, P.xlabel || 'time', { x: (X0 + X1) / 2, y: Y0 + 80, size: 44, maxLines: 1, anchor: 'middle', at: at(0) + .4 });
    const yl = el('g', { transform: `translate(${X0 - 150},${(Y0 + Y1) / 2}) rotate(-90)` }, L);
    text(yl, P.ylabel || 'value', { x: 0, y: 0, size: 44, maxLines: 1, anchor: 'middle', at: at(0) + .6 });
    const step = (ymax - ymin) > 160 ? 50 : (ymax - ymin) > 40 ? 20 : 10;
    for (let v = Math.ceil(ymin / step) * step; v <= ymax; v += step) {
      const t = el('text', { x: X0 - 22, y: py(v) + 12, 'text-anchor': 'end', 'font-family': 'Note', 'font-size': 32, fill: C.cream }, L); t.textContent = String(v);
      on(tt => t.style.opacity = clamp((tt - at(0) - .5) / .3));
    }
    (P.hlines || []).forEach((h, i) => {
      const y = py(h.y), g = el('g', {}, L);
      el('line', { x1: X0, x2: X1, y1: y, y2: y, stroke: i % 2 ? '#8fa6ff' : C.amber, 'stroke-width': 3, 'stroke-dasharray': '14 12', opacity: .8 }, g);
      on(tt => g.style.opacity = clamp((tt - at(0) - .7 - i * .2) / .3));
      text(L, h.label, { x: X1 + 10, y: y + 12, size: 34, maxW: 260, maxLines: 1, color: i % 2 ? '#8fa6ff' : C.amber, at: at(0) + .8 + i * .2, pen: false });
    });
    // smooth curve through the points (Catmull-Rom -> cubic bezier)
    const Q = pts.map(([x, y]) => [px(x), py(y)]);
    let d = `M${Q[0][0]} ${Q[0][1]}`;
    for (let i = 0; i < Q.length - 1; i++) {
      const p0 = Q[i - 1] || Q[i], p1 = Q[i], p2 = Q[i + 1], p3 = Q[i + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
    }
    const path = el('path', { d, fill: 'none', stroke: C.amber, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#boil)' }, L);
    const Ltot = path.getTotalLength(); path.style.strokeDasharray = Ltot;
    const t1 = at(1), t2 = Math.max(t1 + 2.5, (R.length > 2 ? at(2) : t1 + 4) - .1);
    const dot = el('circle', { r: 16, fill: C.cream, stroke: C.ink, 'stroke-width': 4, filter: 'url(#glow)' }, L);
    on(t => { const q = clamp((t - t1) / (t2 - t1)); path.style.strokeDashoffset = Ltot * (1 - q); const pt = path.getPointAtLength(Ltot * q); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); dot.style.opacity = q > 0 && q < 1 ? 1 : 0; });
    // where is the curve at x? (search along the path)
    const yAt = X => { let lo = 0, hi = Ltot; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (path.getPointAtLength(m).x < X) lo = m; else hi = m; } return path.getPointAtLength(lo); };
    // phase labels: try above / below / right / left of the point; take the first spot inside the plot that overlaps nothing
    const boxes = [[X0 - 10, Y0 - 10, X1 + 300, Y0 + 100], ...(P.hlines || []).map(h => [X0, py(h.y) - 8, X1, py(h.y) + 8])], hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const curveBox = (x0, y0, x1, y1) => { for (let L2 = 0; L2 < Ltot; L2 += 12) { const q = path.getPointAtLength(L2); if (q.x > x0 && q.x < x1 && q.y > y0 - 8 && q.y < y1 + 8) return true; } return false; };
    (P.phases || []).forEach((ph, i) => {
      const pt = yAt(px(ph.x)), t0 = at(2 + i);
      numDot(L, i + 1, pt.x, pt.y, t0, 24);
      const f = Ink.fit(ph.label, 'hand', 44, 300, 1, 30), w = Ink.measure(f.lines[0], 'hand', f.size, 2) + 10, h = f.size * 1.1;
      const cand = [[0, -70], [0, 80], [w / 2 + 50, 14], [-w / 2 - 50, 14], [0, -130], [0, 140], [w / 2 + 50, -60], [-w / 2 - 50, -60], [w / 2 + 50, 80], [-w / 2 - 50, 80]];
      let best = cand[0];
      for (const [dx, dy] of cand) {
        const cx = pt.x + dx, by = pt.y + dy, b = [cx - w / 2, by - h * .85, cx + w / 2, by + h * .25];
        if (b[0] < X0 + 10 || b[2] > X1 + 280 || b[1] < 170 || b[3] > Y0 - 5) continue;
        if (boxes.some(o => hit(o, b)) || curveBox(...b)) continue;
        best = [dx, dy]; break;
      }
      const lx = pt.x + best[0], ly = pt.y + best[1]; boxes.push([lx - w / 2, ly - h * .85, lx + w / 2, ly + h * .25]);
      text(L, ph.label, { x: lx, y: ly, font: 'hand', size: f.size, maxW: 320, maxLines: 1, color: C.cream, anchor: 'middle', at: t0 + .2 });
    });
  };

  // ---------------- particle simulations ----------------
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function particle(parent, kind, r) {
    const g = el('g', {}, parent);
    if (kind === 'water') el('path', { d: `M0 ${-r * 1.4} C ${r} ${-r * .2}, ${r} ${r}, 0 ${r} C ${-r} ${r}, ${-r} ${-r * .2}, 0 ${-r * 1.4}Z`, fill: '#8cc9f2', stroke: C.ink, 'stroke-width': 3 }, g);
    else {
      const fill = { na: C.amber, k: '#9a6bdc', solute: '#e8692c', plus: '#f4a340', minus: '#6fb3e8', dot: C.amber }[kind] || C.amber;
      el('circle', { r, fill, stroke: C.ink, 'stroke-width': 3 }, g);
      const sym = { na: '+', k: '+', plus: '+', minus: '−' }[kind];
      if (sym) { const tx = el('text', { y: r * .38, 'text-anchor': 'middle', 'font-family': 'Hand', 'font-size': r * 1.2, fill: C.ink }, g); tx.textContent = sym; }
    }
    return g;
  }
  function membraneH(parent, y, x0, x1, gapX = null, gapW = 0, t0 = 0) {   // phospholipid band
    const g = el('g', { filter: 'url(#boil)' }, parent);
    for (let x = x0; x <= x1; x += 34) {
      if (gapX !== null && Math.abs(x - gapX) < gapW / 2) continue;
      [-1, 1].forEach(sd => {
        el('circle', { cx: x, cy: y + sd * 34, r: 13, fill: '#f0b56a', stroke: C.ink, 'stroke-width': 3 }, g);
        el('path', { d: `M${x - 4} ${y + sd * 20} q 4 ${-sd * 8} 0 ${-sd * 18} M${x + 4} ${y + sd * 20} q 4 ${-sd * 8} 0 ${-sd * 18}`, stroke: C.ink, 'stroke-width': 2.5, fill: 'none' }, g);
      });
    }
    on(t => g.style.opacity = clamp((t - t0) / .4));
    return g;
  }
  TPL.sim = (s, L) => {
    heading(L, s.title, 130, at(0) + .2, { size: 84 });
    const lb = s.labels || {}, rand = rng(hash(s.title) + 11), t1 = at(1), t2 = at(2);
    const motion = t => Math.max(0, t - t1);
    const tag = (str, x, y, t0, color = C.cream, anchor = 'middle') => str && text(L, String(str), { x, y, font: 'hand', size: 52, maxW: 520, maxLines: 1, color, anchor, at: t0 });
    const mode = s.mode;
    if (mode === 'diffusion') {
      box(L, 210, 230, 1500, 700, at(0), { seed: 220 });
      const P = [...Array(70)].map(() => ({ sx: 260 + rand() * 330, sy: 280 + rand() * 600, ex: 260 + rand() * 1400, ey: 280 + rand() * 600, ph: rand() * 9 }));
      P.forEach(p => { const g = particle(L, 'dot', 15); on(t => { const q = prog(t, t1, 6, 'out'); const j = 7 * Math.sin(t * 3 + p.ph), k2 = 7 * Math.cos(t * 2.6 + p.ph * 1.3); g.setAttribute('transform', `translate(${p.sx + (p.ex - p.sx) * q + j},${p.sy + (p.ey - p.sy) * q + k2})`); g.style.opacity = clamp((t - at(0)) / .4); }); });
      tag(lb.high, 420, 990, at(0) + .4, C.amber); tag(lb.low, 1500, 990, at(0) + .7, '#8fa6ff');
      arrow(L, 650, 200, 1300, 200, t2, { bend: -.08, seed: 230, color: C.amber });
    } else if (mode === 'osmosis') {
      const mx = W / 2;
      const mem = el('g', {}, L); Ink.rough(svg, mem, 'line', [mx, 240, mx, 940], { stroke: '#f0b56a', strokeWidth: 10, strokeLineDash: [26, 20], seed: 240, roughness: 1.5 }, at(0), .5);
      const S2 = [...Array(16)].map((_, i) => ({ x: i < 5 ? 300 + rand() * 520 : 1060 + rand() * 560, y: 280 + rand() * 620, ph: rand() * 9 }));
      S2.forEach(p => { const g = particle(L, 'solute', 24); on(t => { g.setAttribute('transform', `translate(${p.x + 10 * Math.sin(t * 2 + p.ph)},${p.y + 10 * Math.cos(t * 1.7 + p.ph)})`); g.style.opacity = clamp((t - at(0)) / .4); }); });
      const Wd = [...Array(46)].map((_, i) => { const left = i < 30; const cross = left && i < 13; return { sx: left ? 280 + rand() * 560 : 1060 + rand() * 560, sy: 270 + rand() * 640, cross, ex: 1060 + rand() * 560, ph: rand() * 9, d: rand() * 3 }; });
      Wd.forEach(p => { const g = particle(L, 'water', 13); on(t => { const q = p.cross ? prog(t, t1 + p.d, 2.2, 'inOut') : 0; const x = p.sx + (p.ex - p.sx) * q + 8 * Math.sin(t * 3 + p.ph), y = p.sy + 8 * Math.cos(t * 2.4 + p.ph); g.setAttribute('transform', `translate(${x},${y})`); g.style.opacity = clamp((t - at(0)) / .4); }); });
      tag(lb.water, 560, 1000, at(0) + .4, '#8cc9f2'); tag(lb.solute, 1340, 1000, at(0) + .7, '#e8692c'); tag(lb.membrane, mx, 225, at(0) + .9, '#f0b56a');
      arrow(L, 760, 960, 1160, 960, t2, { bend: .06, seed: 250, color: '#8cc9f2' });
    } else if (mode === 'channel' || mode === 'pump' || mode === 'potential') {
      const my = 600, gapX = W / 2;
      membraneH(L, my, 160, 1760, mode === 'potential' ? null : gapX, 150, at(0));
      tag(mode === 'pump' ? 'outside' : (lb.outside || 'outside'), 230, 290, at(0) + .3, C.cream, 'start'); tag(mode === 'pump' ? 'inside' : (lb.inside || 'inside'), 230, 960, at(0) + .5, C.cream, 'start');
      if (mode !== 'potential') {
        const prot = el('g', { filter: 'url(#boil)' }, L);
        el('rect', { x: gapX - 95, y: my - 70, width: 60, height: 140, rx: 26, fill: mode === 'pump' ? '#7fbf7a' : '#c98ad8', stroke: C.ink, 'stroke-width': 4 }, prot);
        el('rect', { x: gapX + 35, y: my - 70, width: 60, height: 140, rx: 26, fill: mode === 'pump' ? '#7fbf7a' : '#c98ad8', stroke: C.ink, 'stroke-width': 4 }, prot);
        on(t => prot.style.opacity = clamp((t - at(0) - .2) / .4));
        tag(mode === 'pump' ? (lb.pump || 'pump') : lb.channel, gapX + 260, my - 100, at(0) + .7, mode === 'pump' ? '#9fe09a' : '#e0a8ee', 'start');
      }
      if (mode === 'channel') {
        const P = [...Array(34)].map((_, i) => ({ x: 220 + rand() * 1480, y: 260 + rand() * 230, cross: i < 9, d: i * .55, ex: 400 + rand() * 1100, ey: 720 + rand() * 230, ph: rand() * 9 }));
        P.forEach(p => { const g = particle(L, 'na', 17); on(t => {
          let x = p.x + 9 * Math.sin(t * 2.7 + p.ph), y = p.y + 9 * Math.cos(t * 2.2 + p.ph);
          if (p.cross) { const q = clamp((t - t1 - p.d) / 1.6); if (q > 0) { if (q < .5) { const r2 = q / .5; x = x + (gapX - x) * r2; y = y + (my - 120 - y) * r2; } else { const r2 = (q - .5) / .5; x = gapX + (p.ex - gapX) * r2; y = my - 120 + (p.ey - my + 120) * r2; } } }
          g.setAttribute('transform', `translate(${x},${y})`); g.style.opacity = clamp((t - at(0)) / .4); }); });
        tag(lb.ion, 1450, 290, at(0) + .9, C.amber);
      } else if (mode === 'pump') {
        const cyc = 2.4;
        [...Array(3)].forEach((_, i) => { const g = particle(L, 'na', 19); on(t => { const m = motion(t), c = (m % cyc) / cyc, q = t < t1 ? 0 : E3(clamp((c - .1) / .5)); const x = gapX - 30 + i * 30, y = my + 140 - q * 380 + i * 6; g.setAttribute('transform', `translate(${x},${y})`); g.style.opacity = clamp((t - at(0)) / .4) * (c > .85 && t > t1 ? 1 - (c - .85) / .15 : 1); }); });
        [...Array(2)].forEach((_, i) => { const g = particle(L, 'k', 19); on(t => { const m = motion(t), c = (m % cyc) / cyc, q = t < t1 ? 0 : E3(clamp((c - .35) / .5)); const x = gapX - 15 + i * 30, y = my - 140 + q * 380; g.setAttribute('transform', `translate(${x},${y})`); g.style.opacity = clamp((t - at(0)) / .4) * (c > .9 && t > t1 ? 1 - (c - .9) / .1 : 1); }); });
        // ATP battery
        const bt = el('g', {}, L); el('rect', { x: gapX + 120, y: my + 110, width: 90, height: 50, rx: 8, fill: '#ffd54a', stroke: C.ink, 'stroke-width': 4 }, bt); el('path', { d: `M${gapX + 170} ${my + 116} l-18 20 h14 l-10 18 l24 -24 h-14 l10 -14z`, fill: C.ink }, bt);
        on(t => { const c = (motion(t) % cyc) / cyc; bt.style.opacity = clamp((t - at(0) - .5) / .3) * (t > t1 && c < .2 ? 1 : .55); bt.setAttribute('transform', t > t1 && c < .2 ? `translate(${gapX + 165},${my + 135}) scale(1.15) translate(${-(gapX + 165)},${-(my + 135)})` : ''); });
        tag(lb.energy, gapX + 330, my + 150, at(0) + 1.0, '#ffd54a', 'start');
        tag(lb.out, 1500, 300, t2, C.amber); tag(lb.in, 1500, 940, t2 + .3, '#c9a8f0');
      } else {  // potential
        const P = [...Array(48)].map(() => ({ x: 200 + rand() * 1520, y: rand() < .5 ? 250 + rand() * 230 : 720 + rand() * 230, s: rand() < .5 ? 'plus' : 'minus', ph: rand() * 9 }));
        P.forEach(p => { const g = particle(L, p.s, 15); on(t => { g.setAttribute('transform', `translate(${p.x + 8 * Math.sin(t * 2.3 + p.ph)},${p.y + 8 * Math.cos(t * 2 + p.ph)})`); g.style.opacity = clamp((t - at(0)) / .4) * .85; }); });
        for (let x = 220; x < 1720; x += 64) {
          const a = particle(L, 'plus', 15), b = particle(L, 'minus', 15);
          on(t => { const q = prog(t, t1 + (x - 220) / 3000, .5, 'back'); a.setAttribute('transform', `translate(${x},${my - 82}) scale(${Math.max(.001, q)})`); b.setAttribute('transform', `translate(${x + 32},${my + 82}) scale(${Math.max(.001, q)})`); });
        }
        const hl = el('rect', { x: 170, y: my - 110, width: 1580, height: 220, rx: 40, fill: 'none', stroke: C.amber, 'stroke-width': 6, filter: 'url(#glow)' }, L);
        on(t => hl.style.opacity = prog(t, t2, .4) * (.7 + .3 * Math.sin(t * 5)));
      }
    } else if (mode === 'charge') {
      const pair = (y, a, b, attract, t0) => {
        const ga = particle(L, a, 40), gb = particle(L, b, 40);
        on(t => { const q = prog(t, t1, 1.6, 'inOut'); const d = attract ? 300 - 210 * q : 160 + 260 * q; ga.setAttribute('transform', `translate(${W / 2 - d},${y})`); gb.setAttribute('transform', `translate(${W / 2 + d},${y})`); ga.style.opacity = gb.style.opacity = clamp((t - t0) / .3); });
      };
      pair(420, 'plus', 'minus', true, at(0)); pair(760, 'plus', 'plus', false, at(0) + .4);
      tag(lb.plus && lb.minus ? `${lb.plus} + ${lb.minus}: attract` : 'opposite charges attract', W / 2, 330, t2, C.amber);
      tag('like charges repel', W / 2, 670, t2 + .4, '#8fa6ff');
    }
  };
  const E3 = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

  function sparkles(parent, pts, t0) {
    pts.forEach(([x, y], i) => {
      const g = el('g', {}, parent);
      el('path', { d: 'M0 -26 L6 -6 L26 0 L6 6 L0 26 L-6 6 L-26 0 L-6 -6Z', fill: C.amber, stroke: C.ink, 'stroke-width': 3 }, g);
      on(t => { const p = prog(t, t0 + i * .1, .4, 'back'); g.setAttribute('transform', `translate(${x},${y}) scale(${Math.max(.001, p * (1 + .1 * Math.sin(t * 5 + i)))}) rotate(${t * 30 + i * 25})`); });
    });
  }

  // ---------------- scene shell ----------------
  function background(kind, L) {
    if (kind === 'cave') {
      el('rect', { width: W, height: H, fill: 'url(#cave)' }, L);
      el('ellipse', { cx: W / 2, cy: 560, rx: 1000, ry: 560, fill: 'url(#warm)', opacity: .7 }, L);
    } else {
      el('rect', { width: W, height: H, fill: 'url(#sky)' }, L);
      el('ellipse', { cx: W / 2, cy: 700, rx: 1100, ry: 560, fill: 'url(#warm)', opacity: .55 }, L);
      const st = el('g', { filter: 'url(#boil)' }, L), r = rng(hash(D.scene.type + D.meta.index));
      for (let i = 0; i < 14; i++) {
        const x = r() * W, y = r() * 360, s = .5 + r() * .7, ph = r() * 9;
        const p = el('path', { d: 'M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3Z', fill: C.cream, transform: `translate(${x},${y}) scale(${s})` }, st);
        on(t => p.style.opacity = .35 + .4 * Math.sin(t * 2 + ph));
      }
    }
  }
  function gradients() {
    const sky = el('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#151a36' }, sky); el('stop', { offset: 1, 'stop-color': '#262c50' }, sky);
    const warm = el('radialGradient', { id: 'warm', cx: '50%', cy: '50%', r: '50%' }, defs);
    el('stop', { offset: 0, 'stop-color': '#f4a340', 'stop-opacity': .42 }, warm); el('stop', { offset: .6, 'stop-color': '#e8692c', 'stop-opacity': .12 }, warm); el('stop', { offset: 1, 'stop-color': '#e8692c', 'stop-opacity': 0 }, warm);
    const cave = el('radialGradient', { id: 'cave', cx: '50%', cy: '55%', r: '70%' }, defs);
    el('stop', { offset: 0, 'stop-color': '#55331f' }, cave); el('stop', { offset: .7, 'stop-color': '#2b1d17' }, cave); el('stop', { offset: 1, 'stop-color': '#1a110d' }, cave);
  }
  function chrome(L) {   // chapter tag + block progress bar
    const m = D.meta;
    if (m.chapter) { const tx = el('text', { x: 60, y: 1050, 'font-family': 'Note', 'font-size': 28, fill: 'rgba(255,241,214,.55)' }, L); tx.textContent = m.chapter; }
    const bar = el('rect', { x: 0, y: 1074, height: 6, fill: C.amber, opacity: .8 }, L);
    on(t => bar.setAttribute('width', W * clamp((m.offset + t) / m.total)));
  }
  function transitions(L, dur) {   // ink wipe in, fade out
    const kind = hash(D.meta.index) % 3, cover = el('g', {}, L);
    if (kind === 0) {
      const c = el('circle', { cx: W / 2, cy: H / 2, r: 0, fill: 'none', stroke: '#0d0f1e', 'stroke-width': 2400 }, cover);
      on(t => { const r = 1200 * prog(t, 0, .55, 'out'); c.setAttribute('r', 1200 + r); c.setAttribute('stroke-width', Math.max(0, 2400 - 2 * r)); cover.style.display = t > .6 ? 'none' : ''; });
    } else if (kind === 1) {
      const r = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#0d0f1e' }, cover);
      on(t => { const p = prog(t, 0, .5, 'inOut'); r.setAttribute('x', W * p); cover.style.display = t > .55 ? 'none' : ''; });
    } else {
      const r = el('rect', { width: W, height: H, fill: '#0d0f1e' }, cover);
      on(t => { r.style.opacity = 1 - prog(t, 0, .45, 'out'); cover.style.display = t > .5 ? 'none' : ''; });
    }
    const out = el('rect', { width: W, height: H, fill: '#0d0f1e' }, L);
    on(t => out.style.opacity = prog(t, dur - .3, .3, 'in'));
  }

  window.init = async (data) => {
    D = data; svg = document.getElementById('s'); svg.innerHTML = ''; Ink.reset();
    await Ink.loadFonts({ hand: '../assets/fonts/GochiHand-Regular.ttf', note: '../assets/fonts/Kalam-Regular.ttf', bold: '../assets/fonts/Kalam-Bold.ttf' });
    defs = Ink.setup(svg); gradients();
    const s = D.scene, lines = D.timing.lines, dur = D.timing.dur;
    // reveal times: element k -> start of the line that shows it
    const n = { title: 1 + (s.goals || []).length }[s.type];
    const shows = lines.filter(l => l.show !== undefined);
    const maxK = Math.max(0, ...shows.map(l => l.show));
    R = []; for (let k = 0; k <= maxK + 8; k++) { const l = shows.find(x => x.show === k); R[k] = l ? l.start : (k ? R[k - 1] + .5 : Math.max(.35, (lines[0] || {}).start || .35)); }
    const bgKind = D.meta.bg || (['quiz', 'recap', 'title', 'term', 'table', 'confuse', 'scale'].includes(s.type) ? 'night' : 'cave');
    const BG = el('g', {}, svg); background(bgKind, BG);
    const LAYER = el('g', {}, svg);
    const penLayer = el('g', {}, svg); PEN = Ink.makePen(penLayer);
    // gentle camera drift for life
    on(t => LAYER.setAttribute('transform', `translate(${W / 2},${H / 2}) scale(${1 + .018 * t / Math.max(8, dur)}) translate(${-W / 2},${-H / 2})`));
    (TPL[s.type] || TPL.recap)(s, LAYER);
    svg.appendChild(penLayer);
    const top = el('g', {}, svg); chrome(top);
    Ink.paper(svg, defs);
    transitions(svg, dur);
    await document.fonts.ready;
    await Promise.all([...svg.querySelectorAll('image')].map(im => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = im.getAttribute('href'); })));
    Ink.render(0);
    return true;
  };
  window.render = t => Ink.render(t);
})();

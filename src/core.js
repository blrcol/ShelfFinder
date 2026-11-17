/*
 * ShelfFinder core logic (no UI). Works in the browser and in Node for tests.
 *  - Library of Congress call-number parsing, comparing and floor/range lookup
 *  - Building graph + multi-floor shortest-path routing
 *  - Turn-by-turn step generation
 *  - Misshelved-book detection
 */
(function (root) {
  'use strict';

  // ---------- Call numbers ----------
  function parseCall(raw) {
    const s = String(raw || '').toUpperCase().trim();
    if (!s) return null;
    if (/^REF\b/.test(s)) return { type: 'ref', raw: s, rest: parseCall(s.replace(/^REF\s*/, '')) };
    if (/:/.test(s) && /^[A-Z]{1,2}\s?\d/.test(s)) return { type: 'sudoc', raw: s };
    const m = s.match(/^([A-Z]{1,3})\s*(\d+(?:\.\d+)?)?\s*(.*)$/);
    if (!m) return null;
    return { type: 'lc', cls: m[1], num: m[2] ? parseFloat(m[2]) : null, rest: (m[3] || '').trim(), raw: s };
  }

  // Compare two LC call numbers in shelf order. Returns <0, 0, >0.
  function compareCall(a, b) {
    const A = typeof a === 'string' ? parseCall(a) : a;
    const B = typeof b === 'string' ? parseCall(b) : b;
    if (!A || !B || A.type !== 'lc' || B.type !== 'lc') return String(a).localeCompare(String(b));
    if (A.cls !== B.cls) return A.cls < B.cls ? -1 : 1;
    const an = A.num == null ? -1 : A.num, bn = B.num == null ? -1 : B.num;
    if (an !== bn) return an - bn;
    // Cutters: ".A3" style — compare letter then decimal value
    const ca = cutters(A.rest), cb = cutters(B.rest);
    for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
      const x = ca[i], y = cb[i];
      if (x == null) return -1;
      if (y == null) return 1;
      if (x.l !== y.l) return x.l < y.l ? -1 : 1;
      if (x.n !== y.n) return x.n - y.n;
    }
    return 0;
  }
  function cutters(rest) {
    const out = [];
    const re = /\.?([A-Z])(\d+)/g;
    let m;
    while ((m = re.exec(rest || ''))) out.push({ l: m[1], n: parseFloat('0.' + m[2]) });
    return out;
  }

  // class letters -> comparable number (A=1..Z=26, base 27, 3 positions)
  const val = (c) => c.charCodeAt(0) - 64;
  function lo(cls) { let v = 0; for (let i = 0; i < 3; i++) v = v * 27 + (cls[i] ? val(cls[i]) : 0); return v; }
  function hi(cls) { let v = 0; for (let i = 0; i < 3; i++) v = v * 27 + (cls[i] ? val(cls[i]) : 26); return v; }
  function inBlock(cls, b) { if (!b.from) return false; const k = lo(cls); return k >= lo(b.from) && k <= hi(b.to); }
  function span(b) { return hi(b.to) - lo(b.from); }

  // Where should this call number be shelved?
  function lookup(call, data) {
    const p = typeof call === 'string' ? parseCall(call) : call;
    if (!p) return { ok: false, reason: 'unreadable', msg: 'That doesn’t look like a call number.' };
    if (p.type === 'ref') {
      const b = data.blocks.find((x) => x.id === 'REF');
      return { ok: true, block: b, also: [], note: 'Reference collection — library use only.' };
    }
    if (p.type === 'sudoc') {
      const g = data.blocks.find((x) => x.id === 'GOVDOCS');
      if (g) return { ok: true, block: g, also: [], note: 'Government document (SuDoc number).' };
      return { ok: false, reason: 'sudoc', msg: 'Government document (SuDoc number) — U.S. Government Documents Collection, Level 1 (room 109).' };
    }
    if (/^[IOWXY]/.test(p.cls)) return { ok: false, reason: 'invalid', msg: `“${p.cls}” isn’t a Library of Congress class used here.` };
    const c = data.blocks.filter((b) => inBlock(p.cls, b)).sort((a, b) => span(a) - span(b));
    if (!c.length) {
      const sci = /^[QRS]/.test(p.cls) || (p.cls[0] === 'T' && lo(p.cls) < lo('TR'));
      return { ok: false, reason: sci ? 'cooley' : 'notfound', msg: sci
        ? `Class ${p.cls} isn’t on the Case-Geyer floor plans. Science classes (Q, R, S, T) are most likely in Cooley Science Library — check the catalog record.`
        : `Class ${p.cls} isn’t on the Case-Geyer floor plans. Check the catalog record for its location.` };
    }
    const seen = new Set([c[0].node]);
    const also = c.slice(1).filter((b) => !seen.has(b.node) && seen.add(b.node));
    return { ok: true, block: c[0], also, parsed: p };
  }

  // ---------- Graph & routing ----------
  function buildGraph(data, mpp) {
    const G = {};
    for (const [f, fl] of Object.entries(data.floors)) {
      for (const [id, n] of Object.entries(fl.nodes)) G[f + ':' + id] = { id: f + ':' + id, floor: f, key: id, x: n[0], y: n[1], label: n[2] || null, cat: n[3] || null, adj: [] };
      for (const e of fl.edges) {
        const [a, b] = e.split('-');
        const A = G[f + ':' + a], B = G[f + ':' + b];
        if (!A || !B) throw new Error(`Bad edge ${f}:${e}`);
        const w = Math.hypot(A.x - B.x, A.y - B.y) * mpp;
        A.adj.push({ to: B.id, w, kind: 'walk' });
        B.adj.push({ to: A.id, w, kind: 'walk' });
      }
    }
    for (const c of data.connectors) {
      const fl = c.floors.slice().sort((a, b) => data.floors[a].order - data.floors[b].order);
      for (const f of fl) {
        const n = G[f + ':' + c.id];
        if (!n) throw new Error(`Connector ${c.id} missing on ${f}`);
        n.conn = c;
      }
      for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) {
        if (c.kind === 'stairs' && j !== i + 1) continue;
        const diff = data.floors[fl[j]].order - data.floors[fl[i]].order;
        const w = c.kind === 'stairs' ? 9 * diff : 18 + 4 * diff; // metres-equivalent effort
        const A = G[fl[i] + ':' + c.id], B = G[fl[j] + ':' + c.id];
        A.adj.push({ to: B.id, w, kind: c.kind });
        B.adj.push({ to: A.id, w, kind: c.kind });
      }
    }
    return G;
  }

  // Single-source shortest paths (whole graph)
  function dijkstra(G, from, opts) {
    opts = opts || {};
    // avoidStairs: never use stairs (step-free). avoidElevators: use stairs whenever a stair route
    // exists, and an elevator only when nothing else reaches (e.g. Level 5 from Level 1).
    // `key` orders the search (with the elevator penalty); `dist` is the real effort of that path.
    const ELEV_PENALTY = 1000;
    const dist = {}, key = {}, prev = {}, done = new Set();
    for (const k in G) dist[k] = key[k] = Infinity;
    dist[from] = key[from] = 0;
    while (true) {
      let u = null, best = Infinity;
      for (const k in key) if (!done.has(k) && key[k] < best) { best = key[k]; u = k; }
      if (u === null) break;
      done.add(u);
      for (const e of G[u].adj) {
        if (opts.avoidStairs && e.kind === 'stairs') continue;
        const nk = key[u] + e.w + (opts.avoidElevators && e.kind === 'elevator' ? ELEV_PENALTY : 0);
        if (nk < key[e.to]) { key[e.to] = nk; dist[e.to] = dist[u] + e.w; prev[e.to] = u; }
      }
    }
    return { dist, prev };
  }
  function pathFrom(sp, from, to) {
    if (sp.dist[to] === Infinity) return null;
    const path = [to];
    while (path[0] !== from) path.unshift(sp.prev[path[0]]);
    return path;
  }

  function route(G, from, to, opts) {
    if (!G[from] || !G[to]) return null;
    const sp = dijkstra(G, from, opts);
    const dist = sp.dist, prev = sp.prev;
    if (dist[to] === Infinity) return null;
    const path = [to];
    while (path[0] !== from) path.unshift(prev[path[0]]);
    return { path, cost: dist[to] };
  }

  // bearing in degrees, 0 = map up (north), clockwise
  const bearing = (a, b) => (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI + 360) % 360;
  const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const compassWord = (deg) => COMPASS[Math.round(deg / 45) % 8];
  function turnWord(d) {
    if (Math.abs(d) < 25) return { word: 'Continue straight', icon: 0 };
    if (Math.abs(d) > 150) return { word: 'Turn around', icon: 180 };
    if (d > 0) return { word: d < 60 ? 'Bear right' : 'Turn right', icon: d < 60 ? 45 : 90 };
    return { word: d > -60 ? 'Bear left' : 'Turn left', icon: d > -60 ? -45 : -90 };
  }

  function buildSteps(G, data, path, mpp, destLabel) {
    const steps = [];
    let prevBearing = null;
    let i = 0;
    while (i < path.length - 1) {
      const a = G[path[i]], b = G[path[i + 1]];
      if (a.floor !== b.floor) {
        let j = i + 1;
        while (j < path.length - 1 && G[path[j + 1]].floor !== G[path[j]].floor) j++;
        const to = G[path[j]];
        const up = data.floors[to.floor].order > data.floors[a.floor].order;
        const verb = a.conn.kind === 'elevator' ? 'Take the' : 'Use the';
        steps.push({ type: 'floor', floor: a.floor, toFloor: to.floor, node: a.id, up,
          text: `${verb} ${a.conn.name} ${up ? 'up' : 'down'} to ${data.floors[to.floor].name}`,
          sub: `Exit at ${data.floors[to.floor].name} (${data.floors[to.floor].about}).` });
        prevBearing = null;
        i = j;
        continue;
      }
      // collect same-floor legs and merge nearly collinear ones
      const legs = [];
      let j = i;
      while (j < path.length - 1 && G[path[j + 1]].floor === G[path[j]].floor) {
        const p = G[path[j]], q = G[path[j + 1]];
        const br = bearing(p, q), d = Math.hypot(q.x - p.x, q.y - p.y) * mpp;
        const last = legs[legs.length - 1];
        if (last && Math.abs(((br - last.bearing + 540) % 360) - 180) < 20) { last.to = q; last.dist += d; last.pts.push([q.x, q.y]); last.nodes.push(q.id); }
        else legs.push({ from: p, to: q, bearing: br, dist: d, pts: [[p.x, p.y], [q.x, q.y]], nodes: [p.id, q.id] });
        j++;
      }
      for (const L of legs) {
        const toward = L.to.label || nextLabel(G, path, path.indexOf(L.to.id));
        let text, turn = 0;
        if (prevBearing === null) text = `Head ${compassWord(L.bearing)}${toward ? ' toward ' + toward : ''}`;
        else {
          const d = ((L.bearing - prevBearing + 540) % 360) - 180;
          const t = turnWord(d); turn = t.icon;
          text = `${t.word}${toward ? (t.icon === 0 ? ' toward ' : ', toward ') + toward : ''}`;
        }
        steps.push({ type: 'walk', floor: L.from.floor, text, dist: Math.max(1, Math.round(L.dist)), bearing: L.bearing, turn, pts: L.pts, nodes: L.nodes });
        prevBearing = L.bearing;
      }
      i = j;
    }
    const end = G[path[path.length - 1]];
    steps.push({ type: 'arrive', floor: end.floor, node: end.id, text: `Arrive at ${destLabel || end.label || 'your destination'}` });
    return steps;
  }
  function nextLabel(G, path, idx) {
    for (let k = idx + 1; k < path.length; k++) { const n = G[path[k]]; if (n.floor !== G[path[idx]].floor) return null; if (n.label) return n.label; }
    return null;
  }

  // ---------- Misshelved detection ----------
  // Books on one range face, in physical order. Anything not on the longest
  // run that is in call-number order is flagged as possibly misshelved.
  function physicalKey(l) { return l.section * 100000 + l.shelf * 1000 + l.pos; }
  function findMisshelved(books) {
    const arr = books.slice().sort((a, b) => physicalKey(a.loc) - physicalKey(b.loc));
    const n = arr.length; if (n < 3) return new Set();
    const len = new Array(n).fill(1), par = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++)
      if (compareCall(arr[j].call, arr[i].call) <= 0 && len[j] + 1 > len[i]) { len[i] = len[j] + 1; par[i] = j; }
    let best = 0; for (let i = 1; i < n; i++) if (len[i] > len[best]) best = i;
    const keep = new Set(); for (let k = best; k !== -1; k = par[k]) keep.add(arr[k].id);
    return new Set(arr.filter((b) => !keep.has(b.id)).map((b) => b.id));
  }

  // ---------- Book cart: best order to collect many books ----------
  // stops: node ids. end: node id or null (finish at the last book).
  // Exact (Held-Karp) for up to 11 distinct stops, nearest-neighbour + 2-opt above that.
  function planTrip(G, start, stops, end, opts) {
    const uniq = [...new Set(stops)].filter((s) => G[s]);
    const pts = [start, ...uniq];
    const hasEnd = !!(end && G[end]);
    if (hasEnd) pts.push(end);
    const sps = pts.map((p) => dijkstra(G, p, opts));
    const d = (i, j) => sps[i].dist[pts[j]];
    const n = uniq.length, E = n + 1;
    let order = [];
    if (n === 1) order = [1];
    else if (n > 1 && n <= 11) {
      const full = (1 << n) - 1, dp = new Float64Array((full + 1) * n).fill(Infinity), par = new Int16Array((full + 1) * n).fill(-1);
      for (let j = 0; j < n; j++) dp[(1 << j) * n + j] = d(0, j + 1);
      for (let m = 1; m <= full; m++) for (let j = 0; j < n; j++) {
        const cur = dp[m * n + j]; if (!(m & (1 << j)) || cur === Infinity) continue;
        for (let k = 0; k < n; k++) {
          if (m & (1 << k)) continue;
          const nm = m | (1 << k), v = cur + d(j + 1, k + 1);
          if (v < dp[nm * n + k]) { dp[nm * n + k] = v; par[nm * n + k] = j; }
        }
      }
      let best = Infinity, bj = -1;
      for (let j = 0; j < n; j++) { const v = dp[full * n + j] + (hasEnd ? d(j + 1, E) : 0); if (v < best) { best = v; bj = j; } }
      let m = full, j = bj;
      while (j !== -1) { order.unshift(j + 1); const pj = par[m * n + j]; m &= ~(1 << j); j = pj; }
    } else if (n > 11) {
      const left = new Set(Array.from({ length: n }, (_, i) => i + 1));
      let cur = 0;
      while (left.size) { let b = null, bv = Infinity; for (const k of left) if (d(cur, k) < bv) { bv = d(cur, k); b = k; } order.push(b); left.delete(b); cur = b; }
      const tour = (o) => { let c = d(0, o[0]); for (let i = 0; i < o.length - 1; i++) c += d(o[i], o[i + 1]); return c + (hasEnd ? d(o[o.length - 1], E) : 0); };
      let improved = true, bestC = tour(order);
      while (improved) {
        improved = false;
        for (let i = 0; i < order.length - 1; i++) for (let k = i + 1; k < order.length; k++) {
          const o2 = order.slice(0, i).concat(order.slice(i, k + 1).reverse(), order.slice(k + 1));
          const c2 = tour(o2); if (c2 + 1e-9 < bestC) { order = o2; bestC = c2; improved = true; }
        }
      }
    }
    const seq = [0, ...order, ...(hasEnd ? [E] : [])];
    const legs = [];
    let cost = 0;
    for (let k = 0; k < seq.length - 1; k++) {
      const p = pathFrom(sps[seq[k]], pts[seq[k]], pts[seq[k + 1]]);
      if (!p) return null;
      legs.push(p); cost += d(seq[k], seq[k + 1]);
    }
    return { order: order.map((i) => pts[i]), legs, cost, end: hasEnd ? end : null };
  }

  // ---------- Reading shelf labels (OCR) ----------
  const normCall = (s) => String(s || '').toUpperCase().replace(/^REF\s*/, '').replace(/[^A-Z0-9]/g, '');
  // words: [{text, bbox:{x0,y0,x1,y1}}] from Tesseract. Spine labels are stacked
  // vertically, so words are grouped into columns and read top-to-bottom.
  function extractCalls(words, books) {
    const ws = (words || []).filter((w) => w && w.text && w.text.trim() && w.bbox)
      .map((w) => ({ t: w.text.trim(), x: (w.bbox.x0 + w.bbox.x1) / 2, y: (w.bbox.y0 + w.bbox.y1) / 2, w: w.bbox.x1 - w.bbox.x0 }));
    if (!ws.length) return [];
    const widths = ws.map((w) => w.w).sort((a, b) => a - b);
    const thr = Math.max(8, widths[Math.floor(widths.length / 2)] * 0.9);
    const cols = [];
    for (const w of ws.slice().sort((a, b) => a.x - b.x)) {
      const c = cols[cols.length - 1];
      if (c && Math.abs(w.x - c.cx) <= thr) { c.ws.push(w); c.cx = c.ws.reduce((s, q) => s + q.x, 0) / c.ws.length; }
      else cols.push({ cx: w.x, ws: [w] });
    }
    const cands = cols.map((c) => ({ x: c.cx, text: c.ws.sort((a, b) => a.y - b.y).map((q) => q.t).join(' ') }));
    return matchCandidates(cands, books);
  }
  // Typed / pasted fallback: one call number per line, left to right.
  function extractCallsFromLines(text, books) {
    return matchCandidates(String(text || '').split(/\n+/).map((t, i) => ({ x: i, text: t })).filter((c) => c.text.trim()), books);
  }
  function matchCandidates(cands, books) {
    const idx = books.map((b) => ({ b, n: normCall(b.call) })).filter((o) => o.n.length >= 4);
    const out = [], used = new Set();
    for (const c of cands) {
      const n = normCall(c.text); if (n.length < 4) continue;
      let best = null;
      for (const o of idx) {
        if (used.has(o.b.id)) continue;
        const ok = n.includes(o.n) || (n.length >= 5 && o.n.startsWith(n));
        if (ok && (!best || o.n.length > best.n.length)) best = o;
      }
      if (best) { used.add(best.b.id); out.push({ book: best.b, x: c.x, text: c.text }); }
    }
    return out.sort((a, b) => a.x - b.x);
  }
  // Which detected books are out of call-number order (left to right)?
  function outOfOrder(seq) {
    return findMisshelved(seq.map((s, i) => ({ id: s.book.id, call: s.book.call, loc: { section: 1, shelf: 1, pos: i } })));
  }

  // ---------- Catalog CSV import ----------
  function parseCSV(text) {
    const rows = []; let row = [], f = '', q = false;
    const s = String(text || '').replace(/^﻿/, '');
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(f); f = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += ch;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
  }
  function catalogFromCSV(text) {
    const rows = parseCSV(text); if (rows.length < 2) return [];
    const h = rows[0].map((x) => x.toLowerCase().trim());
    const col = (re) => h.findIndex((x) => re.test(x));
    const ti = col(/title/), ai = col(/author|creator/), ci = col(/call/), ii = col(/isbn|barcode/), si = col(/status|availab/);
    if (ti < 0 || ci < 0) throw new Error('Need at least "Title" and "Call Number" columns');
    const st = (v) => { v = (v || '').toLowerCase(); if (/check|loan|due/.test(v)) return 'out'; if (/lasr|storage|remote/.test(v)) return 'lasr'; if (/missing|lost/.test(v)) return 'missing'; return 'shelf'; };
    return rows.slice(1).map((r) => ({ title: (r[ti] || '').trim(), author: ai >= 0 ? (r[ai] || '').trim() : '', call: (r[ci] || '').trim().toUpperCase(), isbn: ii >= 0 ? (r[ii] || '').replace(/[^0-9X]/gi, '') : '', status: si >= 0 ? st(r[si]) : 'shelf' }))
      .filter((b) => b.title && b.call);
  }

  // ---------- Shared database (Firebase Realtime Database REST events) ----------
  // Applies a streaming "put"/"patch" event to a plain object tree.
  function applyFbEvent(root, type, path, data) {
    const segs = String(path || '/').split('/').filter(Boolean);
    if (!segs.length) {
      if (type === 'put') return data && typeof data === 'object' ? data : {};
      return Object.assign({}, root, data);
    }
    const out = Object.assign({}, root);
    let o = out;
    for (let i = 0; i < segs.length - 1; i++) { o[segs[i]] = Object.assign({}, o[segs[i]] || {}); o = o[segs[i]]; }
    const k = segs[segs.length - 1];
    if (type === 'put') { if (data === null) delete o[k]; else o[k] = data; }
    else { o[k] = Object.assign({}, o[k] || {}); for (const [kk, v] of Object.entries(data || {})) { if (v === null) delete o[k][kk]; else o[k][kk] = v; } }
    return out;
  }

  // ---------- Places ----------
  function placesOf(G, cat) { return Object.values(G).filter((n) => n.cat && (!cat || n.cat === cat)); }
  function nearest(G, from, nodes, opts) {
    const sp = dijkstra(G, from, opts);
    let best = null;
    for (const n of nodes) if (sp.dist[n.id] < Infinity && (!best || sp.dist[n.id] < sp.dist[best.id])) best = n;
    return best ? { node: best, cost: sp.dist[best.id] } : null;
  }

  // ---------- Reading lists (shareable links) ----------
  // Uses call numbers, not internal IDs, so links keep working after catalog imports.
  function encodeList(title, calls) {
    const p = new URLSearchParams();
    if (title) p.set('list', title);
    p.set('calls', calls.join('~'));
    return p.toString();
  }
  function decodeList(search) {
    const p = new URLSearchParams(search);
    if (!p.get('calls')) return null;
    return { title: p.get('list') || '', calls: p.get('calls').split('~').map((s) => s.trim()).filter(Boolean) };
  }

  // ---------- Live catalog ----------
  // Primo often wraps call numbers in parentheses and extra spaces.
  function cleanCall(s) { return String(s || '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase(); }
  // Decide where a catalog copy lives, from its Alma library/location.
  // Returns {kind:'node', node, label} | {kind:'status', status, note} | {kind:'call'}
  function catalogPlace(loc, data) {
    const text = [loc && loc.libraryCode, loc && loc.libraryName, loc && loc.locationCode, loc && loc.locationName].filter(Boolean).join(' | ');
    for (const r of (data.catalogRules || [])) {
      let re; try { re = new RegExp(r.match, 'i'); } catch (e) { continue; }
      if (!re.test(text)) continue;
      if (r.node) return { kind: 'node', node: r.node, label: r.label || r.node, rule: r.match };
      return { kind: 'status', status: r.status, note: r.note || '', rule: r.match };
    }
    return { kind: 'call' };
  }
  // Primo availability -> app status (refined later by Alma item data)
  function statusFromAvailability(a) { return a === 'unavailable' ? 'out' : 'shelf'; }
  // Pick the most useful status across several copies (prefer one on the shelf in Case-Geyer)
  function summarizeCopies(items, data) {
    if (!items || !items.length) return null;
    const scored = items.map((it) => {
      const place = catalogPlace(it, data);
      const here = place.kind !== 'status' || place.status !== 'elsewhere';
      const rank = (it.status === 'shelf' ? 0 : it.status === 'transit' ? 2 : it.status === 'out' ? 3 : 4) + (here ? 0 : 5);
      return { it, place, rank };
    }).sort((a, b) => a.rank - b.rank);
    const best = scored[0];
    return { best: best.it, place: best.place, onShelf: items.filter((i) => i.status === 'shelf').length, total: items.length };
  }

  const api = { cleanCall, catalogPlace, statusFromAvailability, summarizeCopies, placesOf, nearest, encodeList, decodeList, parseCall, compareCall, lookup, buildGraph, dijkstra, route, buildSteps, bearing, compassWord, findMisshelved,
    planTrip, normCall, extractCalls, extractCallsFromLines, outOfOrder, parseCSV, catalogFromCSV, applyFbEvent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SFCore = api;
})(typeof window !== 'undefined' ? window : globalThis);

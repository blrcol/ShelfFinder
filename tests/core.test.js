// Run: node tests/core.test.js
const assert = require('assert');
global.window = global;
require('../src/library-data.js');
const C = require('../src/core.js');
const D = window.SF_DATA;
const where = (c) => { const r = C.lookup(c, D); return r.ok ? r.block.id : r.reason; };
assert.strictEqual(where('B580 .A3'), 'A-BP');
assert.strictEqual(where('BR110 .J3'), 'BP-D');
assert.strictEqual(where('HX276 .M27'), 'HQ-HX');
assert.strictEqual(where('JC143 .M3'), 'J-KF');
assert.strictEqual(where('N5300 .G643'), 'N-NX');
assert.strictEqual(where('TR183 .S65'), 'TR-ZA');
assert.strictEqual(where('QH545.P4 C38'), 'cooley');
assert.strictEqual(where('REF PE1625 .O87'), 'REF');
assert.strictEqual(where('Y 4.AP 6/1:H 34'), 'GOVDOCS');
assert.strictEqual(C.route(C.buildGraph(D, 0.1), 'L5:ent', 'L1:gov', { avoidStairs: true }) !== null, true);
assert.ok(C.compareCall('B3279.H48 S413', 'B3313 .J43') < 0);
assert.ok(C.compareCall('BF441 .K238', 'B580 .A3') > 0);
assert.ok(C.compareCall('PS3511.I9 G7', 'PS3511.I9 G5') > 0);
const G = C.buildGraph(D, 0.1);
for (const k of Object.keys(G)) for (const e of D.entrances) assert.ok(C.route(G, e, k), `unreachable ${k} from ${e}`);
const r = C.route(G, 'L5:ent', 'L2:b_ABP', { avoidStairs: true });
assert.ok(r.path.every((p, i) => i === 0 || G[p].floor === G[r.path[i - 1]].floor || G[p].conn.kind === 'elevator'));
const mis = C.findMisshelved(D.books.filter((b) => b.loc && b.loc.face === 'W'));
assert.deepStrictEqual([...mis], [6]);
console.log('All tests passed');

// ---- Book cart trip planner: compare with brute force ----
{
  const G = C.buildGraph(D, 0.1);
  const all = ['L2:b_ABP', 'L4:b_PQPR', 'L2:b_HQHX', 'L3:ref', 'L1:gov', 'L4:b_NNX', 'L2:b_DSE'];
  const perms = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map((p) => [x, ...p]));
  for (const end of [null, 'L3:circ']) {
    const t = C.planTrip(G, 'L5:ent', all, end, {});
    const cost = (o) => { const pts = ['L5:ent', ...o, ...(end ? [end] : [])]; let c = 0; for (let i = 0; i < pts.length - 1; i++) c += C.route(G, pts[i], pts[i + 1]).cost; return c; };
    const best = Math.min(...perms(all).map(cost));
    assert.ok(Math.abs(t.cost - best) < 1e-6, `trip not optimal ${t.cost} vs ${best}`);
    assert.strictEqual(t.legs.length, all.length + (end ? 1 : 0));
  }
  // large cart uses heuristic and still returns a valid tour
  const many = Object.keys(G).filter((k) => /b_/.test(k));
  const t2 = C.planTrip(G, 'L3:wEnt', many, 'L3:circ', {});
  assert.strictEqual(t2.order.length, many.length);
}
// ---- OCR label reading ----
{
  const W = (t, x, y) => ({ text: t, bbox: { x0: x - 10, y0: y - 5, x1: x + 10, y1: y + 5 } });
  const words = [W('BF', 300, 10), W('441', 302, 25), W('.K238', 299, 40), W('B', 100, 10), W('580', 101, 25), W('.A3', 99, 40), W('B128', 200, 10), W('.C8', 201, 25), W('E5', 200, 40), W('noise', 600, 200)];
  const r = C.extractCalls(words, D.books);
  assert.deepStrictEqual(r.map((x) => x.book.id), [1, 6, 4]);
  assert.deepStrictEqual([...C.outOfOrder(r)], [6]);
  const r2 = C.extractCallsFromLines('B580 .A3\nBF441 .K238\nB3313 .J43', D.books);
  assert.deepStrictEqual(r2.map((x) => x.book.id), [1, 4, 3]);
  assert.strictEqual(C.outOfOrder(r2).size, 1); // BF441 and B3313 swapped: one is flagged
}
// ---- CSV import ----
{
  const cat = C.catalogFromCSV('Title,Author,Call Number,ISBN,Availability\n"Sapiens, A Brief History",Harari,cb113 .h4613,978-0-06-231609-7,Available\nX,Y,B1 .A1,,Checked out\n');
  assert.strictEqual(cat.length, 2); assert.strictEqual(cat[0].title, 'Sapiens, A Brief History'); assert.strictEqual(cat[0].call, 'CB113 .H4613');
  assert.strictEqual(cat[0].isbn, '9780062316097'); assert.strictEqual(cat[1].status, 'out');
}
// ---- Firebase stream events ----
{
  let db = C.applyFbEvent({}, 'put', '/', { b1: { id: 1, status: 'shelf' } });
  db = C.applyFbEvent(db, 'put', '/b1/status', 'out'); assert.strictEqual(db.b1.status, 'out');
  db = C.applyFbEvent(db, 'patch', '/b1', { seen: 'x' }); assert.strictEqual(db.b1.seen, 'x'); assert.strictEqual(db.b1.status, 'out');
  db = C.applyFbEvent(db, 'put', '/b2', { id: 2 }); db = C.applyFbEvent(db, 'put', '/b1', null);
  assert.deepStrictEqual(Object.keys(db), ['b2']);
}
console.log('Extended tests passed');

// ---- Places & reading lists ----
{
  const G = C.buildGraph(D, 0.1);
  const rr = C.placesOf(G, 'restroom'); assert.ok(rr.length >= 5);
  assert.strictEqual(C.nearest(G, 'L2:b_ABP', rr).node.floor, 'L2');
  assert.strictEqual(C.nearest(G, 'L5:ent', rr).node.floor, 'L5');
  for (const p of C.placesOf(G)) assert.ok(C.route(G, 'L5:ent', p.id), 'unreachable place ' + p.id);
  const q = C.encodeList('HIST 101 · Week 5', ['B580 .A3', 'PR4034 .P7']);
  assert.deepStrictEqual(C.decodeList('?' + q), { title: 'HIST 101 · Week 5', calls: ['B580 .A3', 'PR4034 .P7'] });
}
console.log('Places & list tests passed');

// ---- Live catalog mapping ----
{
  const P = (o) => C.catalogPlace(o, D);
  assert.deepStrictEqual(P({ libraryName: 'Cooley Science Library', locationName: 'Stacks' }).status, 'elsewhere');
  assert.strictEqual(P({ libraryName: 'Case-Geyer Library', locationName: 'LASR' }).status, 'lasr');
  assert.strictEqual(P({ libraryName: 'Case-Geyer Library', locationName: 'Reference' }).node, 'L3:ref');
  assert.strictEqual(P({ libraryName: 'Case-Geyer Library', locationName: 'Course Reserves' }).node, 'L3:circ');
  assert.strictEqual(P({ libraryName: 'Case-Geyer Library', locationName: 'Preferred Stacks' }).kind, 'call');
  assert.strictEqual(P({ libraryName: 'Case-Geyer Library', locationName: 'Stacks', locationCode: 'STACKS' }).kind, 'call');
  assert.strictEqual(C.cleanCall('(PR4034 .P7 2003 )'), 'PR4034 .P7 2003');
  for (const n of D.catalogRules.filter((r) => r.node)) assert.ok(C.buildGraph(D, 0.1)[n.node], 'rule node exists: ' + n.node);
  const s = C.summarizeCopies([{ status: 'out', libraryName: 'Case-Geyer' }, { status: 'shelf', libraryName: 'Cooley Science Library' }, { status: 'shelf', libraryName: 'Case-Geyer', locationName: 'Stacks' }], D);
  assert.strictEqual(s.best.locationName, 'Stacks'); assert.strictEqual(s.onShelf, 2);
}
console.log('Live catalog tests passed');

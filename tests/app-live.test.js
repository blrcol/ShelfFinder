// Runs the built app headlessly with a fake catalog proxy. Build first: python3 build.py
// Run: node tests/app-live.test.js
const assert = require('assert');
const { win, els, fetchLog } = require('./harness.js');
const SF = win.__SF, S = SF.S, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
(async () => {
  // not connected: no live section
  assert.strictEqual(els.liveResults.innerHTML, '');
  S.settings.liveUrl = 'https://script.google.com/macros/s/TEST/exec';
  els.q.value = 'pride'; els.q._h.input.forEach((f) => f({}));
  assert.ok(/searching/.test(els.liveResults.innerHTML));
  await wait(900);
  const live = strip(els.liveResults.innerHTML);
  console.log('LIVE RESULTS:', live.slice(0, 900));
  assert.ok(/37 results, showing 6/.test(live));
  assert.ok(/Pride and prejudice .*PR4034 \.P7 2003 .*On shelf/.test(live));
  assert.ok(/Cooley Science Library, not Case-Geyer/.test(live), 'Cooley copy flagged');
  assert.ok(/LASR storage/.test(live) && /Online/.test(live) && /Checked out/.test(live));
  assert.ok(/Media Listening/.test(live), 'media routes to media room');
  // select first live book -> items refresh -> route
  const b = S.books.find((x) => x.mms === '991000000000001');
  SF.selectBook(b.id); await wait(200);
  const card = strip(els.destCard.innerHTML);
  console.log('ROUTE CARD:', card);
  assert.ok(/Live: 2 copies · 1 on the shelf · 1 checked out \(due Dec [34]\)/.test(card));
  assert.ok(S.route && S.route.path.slice(-1)[0] === 'L4:b_PQPR', 'routes to PQ-PR on Level 4');
  // cart trip with live books
  SF.toggleCart(b.id); SF.toggleCart(S.books.find((x) => x.mms === '991000000000003').id); SF.toggleCart(S.books.find((x) => x.mms === '991000000000004').id);
  await els.cartPlan._h.click[0]({}); await wait(50);
  const nav = strip(els.destCard.innerHTML);
  console.log('TRIP:', nav);
  assert.ok(/Cart trip · 3 books/.test(nav) && /Pride, prejudice, and the brain/.test(nav), 'Cooley book skipped with reason');
  assert.strictEqual(S.stops.length, 2);
  // locations table
  await els.liveLocs._h.click[0]({}); await wait(50);
  const locs = strip(els.liveOut.innerHTML);
  console.log('LOCATIONS:', locs);
  assert.ok(/Reference .*Reference A–Z · Level 3/.test(locs) && /Course Reserves .*Circulation Desk/.test(locs) && /Cooley .*Not in Case-Geyer/.test(locs));
  await els.liveTest._h.click[0]({}); await wait(50);
  console.log('PING:', strip(els.liveOut.innerHTML));
  assert.ok(fetchLog.every((u) => !/apikey/i.test(u)), 'app never sends a key');
  console.log('\nApp live-catalog harness test passed');
})().catch((e) => { console.error(e); process.exit(1); });

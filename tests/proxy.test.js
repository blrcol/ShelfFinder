// Tests the Apps Script proxy with mocked Google services and fake Ex Libris responses.
// Run: node tests/proxy.test.js
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const calls = [];
const store = {};
const routes = {
  '/almaws/v1/conf/test': () => [200, '<?xml version="1.0" encoding="UTF-8"?><test>GET request OK</test>'], // real Alma replies in XML
  '/almaws/v1/bibs/test': () => [200, '<?xml version="1.0" encoding="UTF-8"?><test>GET request OK</test>'],
  '/primo/v1/search': () => [200, JSON.stringify({ info: { total: 2 }, docs: [
    { pnx: { display: { title: ['Pride and prejudice / Jane Austen.'], creator: ['Austen, Jane, 1775-1817$$QAusten, Jane'], mms: ['991000123459804816'], type: ['book'] }, addata: { isbn: ['978-0-14-143951-8'] }, control: { recordid: ['alma991000123459804816'] } },
      delivery: { bestlocation: { callNumber: '(PR4034 .P7 2003 )', availabilityStatus: 'available', libraryCode: 'CASE', mainLocation: 'Case-Geyer Library', subLocationCode: 'STACKS', subLocation: 'Stacks' } } },
    { pnx: { display: { title: ['An online thing'] }, control: { recordid: ['TN_cdi_x'] } }, delivery: { availability: ['fulltext'] } }
  ] })],
  '/almaws/v1/bibs/991000123459804816/holdings/ALL/items': () => [200, JSON.stringify({ total_record_count: 2, item: [
    { bib_data: { title: 'Pride and prejudice' }, holding_data: { call_number: 'PR4034 .P7 2003' }, item_data: { barcode: '3901', pid: '23', base_status: { value: '1', desc: 'Item in place' }, library: { value: 'CASE', desc: 'Case-Geyer' }, location: { value: 'STACKS', desc: 'Stacks' } } },
    { bib_data: { title: 'Pride and prejudice' }, holding_data: { call_number: 'PR4034 .P7 2003' }, item_data: { barcode: '3902', base_status: { value: '0', desc: 'Item not in place' }, process_type: { value: 'LOAN', desc: 'Loan' }, due_date: '2026-12-01Z', library: { value: 'CASE' }, location: { value: 'STACKS', desc: 'Stacks' } } }
  ] })],
  '/almaws/v1/conf/libraries': () => [200, JSON.stringify({ library: [{ code: 'CASE', name: 'Case-Geyer Library' }] })],
  '/almaws/v1/conf/libraries/CASE/locations': () => [200, JSON.stringify({ location: [{ code: 'STACKS', name: 'Stacks' }, { code: 'LASR', name: 'LASR', external_name: 'LASR Storage' }] })],
};
const ctx = {
  console, JSON, Math, Date, String, Number, Array, Object, encodeURIComponent,
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({ ALMA_KEY: 'TESTKEY', PRIMO_VID: '01COLG_INST:TEST' })[k] || null }) },
  CacheService: { getScriptCache: () => ({ get: (k) => store[k] || null, put: (k, v) => { store[k] = v; } }) },
  Utilities: { DigestAlgorithm: { MD5: 'md5' }, computeDigest: (a, s) => require('crypto').createHash('md5').update(s).digest(), base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url') },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => ({ text: t }) }) },
  UrlFetchApp: { fetch: (url, opt) => {
    calls.push({ url, opt });
    const u = new URL(url); const r = routes[u.pathname];
    const [code, text] = r ? r() : [400, JSON.stringify({ errorList: { error: [{ errorMessage: 'nope' }] } })];
    return { getResponseCode: () => code, getContentText: () => text };
  } }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../server/alma-proxy.gs', 'utf8'), ctx);
const get = (params) => JSON.parse(ctx.doGet({ parameter: params }).text);

let r = get({ action: 'ping' });
assert.deepStrictEqual(r.data, { key: true, vid: '01COLG_INST:TEST', configuration: 'ok', bibs: 'ok' });
assert.ok(calls.every((c) => c.opt.headers.Authorization === 'apikey TESTKEY' && !c.url.includes('TESTKEY')), 'key must be sent as a header, never in the URL');

r = get({ action: 'search', q: 'pride, prejudice' });
assert.ok(r.ok); const rec = r.data.records[0];
assert.strictEqual(rec.mms, '991000123459804816'); assert.strictEqual(rec.title, 'Pride and prejudice / Jane Austen.');
assert.strictEqual(rec.author, 'Austen, Jane, 1775-1817'); assert.strictEqual(rec.callNumber, '(PR4034 .P7 2003 )');
assert.strictEqual(rec.isbn, '9780141439518'); assert.strictEqual(rec.locationCode, 'STACKS');
assert.strictEqual(r.data.records[1].online, true); assert.strictEqual(r.data.records[1].mms, null);
assert.ok(new URL(calls[calls.length - 1].url).searchParams.get('q') === 'any,contains,pride  prejudice');
const n = calls.length; get({ action: 'search', q: 'pride, prejudice' }); assert.strictEqual(calls.length, n, 'second identical search is served from cache');

r = get({ action: 'items', mms: '991000123459804816' });
assert.deepStrictEqual(r.data.items.map((i) => i.status), ['shelf', 'out']);
assert.strictEqual(r.data.items[1].dueDate, '2026-12-01Z');

assert.strictEqual(get({ action: 'items', mms: '../users' }).ok, false);
assert.strictEqual(get({ action: 'search', q: 'x' }).ok, false);
assert.strictEqual(get({ action: 'nope' }).ok, false);
r = get({ action: 'locations' });
assert.deepStrictEqual(r.data.locations.map((l) => l.locationCode), ['STACKS', 'LASR']);
r = get({ action: 'items', mms: '123456789' }); assert.ok(!r.ok && /HTTP 400: nope/.test(r.error));
console.log('Proxy tests passed');

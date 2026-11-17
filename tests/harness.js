// Minimal DOM stub to run the built app headlessly and inspect rendered HTML.
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const els = {};
function el(id) {
  const h = {}; const e = {
    id, _h: h, innerHTML: '', textContent: '', value: '', checked: false, disabled: false, style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(t, f) { (h[t] = h[t] || []).push(f); }, removeEventListener() {},
    querySelector() { return el('_q'); }, querySelectorAll() { return []; }, closest() { return null; },
    insertAdjacentHTML(p, s) { this.innerHTML += s; }, setAttribute() {}, appendChild() {}, insertBefore() {}, contains() { return false; }, parentNode: null, remove() {}, scrollIntoView() {},
    play() { return Promise.resolve(); }, setPointerCapture() {}, select() {}, focus() {},
    get firstElementChild() { return el(id + '_child'); }, getContext() { return { drawImage() {} }; },
    click() { (h.click || []).forEach((f) => f({ target: e, stopPropagation() {} })); }
  };
  return e;
}
const doc = { getElementById: (id) => (els[id] = els[id] || el(id)), querySelector: () => el('_q'), querySelectorAll: () => [], createElement: () => el('_new'), body: el('body'), head: el('head'), activeElement: null, addEventListener() {}, execCommand() {} };
const MOCK = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'fixtures', 'catalog-mock.json'), 'utf8'));
const fetchLog = [];
const win = {
  document: doc, location: { href: 'file:///x/index.html', search: '' }, navigator: {}, console,
  setTimeout, clearTimeout, setInterval, clearInterval, URL, URLSearchParams, Promise, JSON, Math, Date, Object, Array, String, Number, RegExp, Set, Map, Infinity, Error, encodeURIComponent, isNaN, parseFloat,
  fetch: async (u) => { fetchLog.push(u); const sp = new URL(u).searchParams, a0 = sp.get('action'), a = MOCK[a0 + '_' + sp.get('mms')] ? a0 + '_' + sp.get('mms') : a0; return { json: async () => (MOCK[a] ? { ok: true, data: MOCK[a] } : { ok: false, error: 'no mock' }) }; },
  scrollTo() {}, addEventListener() {}, print() {}
};
win.window = win; win.globalThis = win;
vm.createContext(win);
for (const s of scripts) vm.runInContext(s, win);
module.exports = { win, els, fetchLog, doc };

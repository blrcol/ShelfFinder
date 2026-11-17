/**
 * ShelfFinder catalog proxy (Google Apps Script)
 * ------------------------------------------------
 * Sits between the ShelfFinder app and Colgate's Ex Libris APIs so the API key
 * never appears in the app. Read-only: it can only call the GET requests below.
 *
 * Script Properties (Project Settings > Script Properties):
 *   ALMA_KEY      the API key (required, never commit it anywhere)
 *   PRIMO_VID     Colgate's Primo view ID, e.g. 01COLG_INST:XXXX (required for search)
 *   PRIMO_TAB     Primo tab (default: Everything)
 *   PRIMO_SCOPE   Primo search scope (default: MyInst_and_CI)
 *   BASE_URL      optional, default https://api-na.hosted.exlibrisgroup.com
 *
 * Actions (GET .../exec?action=...):
 *   ping                      checks the key works (Conf + Bibs test endpoints)
 *   search&q=TEXT&limit=10    Primo search, returns simplified records
 *   items&mms=MMS_ID          Alma items for one record: call number, location, status
 *   locations                 Alma libraries and their shelving locations
 */

var DEFAULT_BASE = 'https://api-na.hosted.exlibrisgroup.com';
// Limits. Anyone can call this web app (the website needs that), so these keep a misbehaving
// or malicious client from using up Colgate's shared Ex Libris API quota. Only requests that
// actually reach Ex Libris count toward the upstream limits; cached answers are free.
var MAX_REQUESTS_PER_MINUTE = 600;   // all requests, cached or not
var MAX_UPSTREAM_PER_MINUTE = 120;   // calls to Ex Libris per minute
var MAX_UPSTREAM_PER_6H = 15000;     // calls to Ex Libris per 6 hours (at most 60,000 a day)
var MAX_OFFSET = 5000;

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    rateLimit_();
    var out;
    switch (p.action) {
      case 'ping': out = ping_(); break;
      case 'search': out = search_(p.q, p.limit, p.offset); break;
      case 'items': out = items_(p.mms); break;
      case 'locations': out = locations_(); break;
      default: throw new Error('Unknown action. Use ping, search, items or locations.');
    }
    return json_({ ok: true, data: out });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

// ---------- helpers ----------
function props_() { return PropertiesService.getScriptProperties(); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function countUp_(bucket, ttl) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get(bucket) || 0) + 1;
  cache.put(bucket, String(n), ttl);
  return n;
}
function rateLimit_() {
  if (countUp_('rl_' + Math.floor(Date.now() / 60000), 120) > MAX_REQUESTS_PER_MINUTE) throw new Error('Too many requests, try again in a minute.');
}
function upstreamLimit_() {
  var now = Date.now();
  if (countUp_('up_m_' + Math.floor(now / 60000), 120) > MAX_UPSTREAM_PER_MINUTE) throw new Error('Too many requests, try again in a minute.');
  if (countUp_('up_6h_' + Math.floor(now / 21600000), 21600) > MAX_UPSTREAM_PER_6H) throw new Error('The catalog connection is resting after heavy use. Try again later.');
}

function qs_(params) {
  return Object.keys(params).filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
    .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
}

// Cached GET to an allowed path. ttl in seconds. raw = return the reply text unparsed
// (the /test endpoints answer in XML even when JSON is requested).
function call_(path, params, ttl, raw) {
  if (!/^\/(almaws\/v1\/(bibs|conf)\/|primo\/v1\/search$)/.test(path)) throw new Error('Path not allowed');
  var key = props_().getProperty('ALMA_KEY');
  if (!key) throw new Error('ALMA_KEY is not set in Script Properties.');
  var base = props_().getProperty('BASE_URL') || DEFAULT_BASE;
  var url = base + path + (params ? '?' + qs_(params) : '');
  var cache = CacheService.getScriptCache();
  var ck = 'c_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, url));
  var hit = ttl ? cache.get(ck) : null;
  if (hit) return JSON.parse(hit);
  upstreamLimit_();
  var res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true, headers: { Authorization: 'apikey ' + key, Accept: 'application/json' } });
  var code = res.getResponseCode(), text = res.getContentText();
  if (code !== 200) {
    var msg = text;
    try { var j = JSON.parse(text); msg = (j.errorList && j.errorList.error && j.errorList.error[0] && j.errorList.error[0].errorMessage) || j.message || text; } catch (e) {}
    throw new Error('Ex Libris returned HTTP ' + code + ': ' + String(msg).slice(0, 200));
  }
  if (raw) return text;
  if (ttl && text.length < 90000) cache.put(ck, text, ttl);
  return JSON.parse(text);
}

function first_(v) { return Array.isArray(v) ? v[0] : v; }
function cleanText_(s) { return String(s || '').replace(/\$\$Q.*$/, '').replace(/\$\$[A-Z]/g, ' ').replace(/\s+/g, ' ').trim(); }

// ---------- actions ----------
function ping_() {
  var out = { key: !!props_().getProperty('ALMA_KEY'), vid: props_().getProperty('PRIMO_VID') || null };
  try { call_('/almaws/v1/conf/test', null, 0, true); out.configuration = 'ok'; } catch (e) { out.configuration = String(e.message); }
  try { call_('/almaws/v1/bibs/test', null, 0, true); out.bibs = 'ok'; } catch (e) { out.bibs = String(e.message); }
  return out;
}

function search_(q, limit, offset) {
  q = String(q || '').trim();
  if (q.length < 2 || q.length > 200) throw new Error('Search text must be 2-200 characters.');
  var P = props_();
  var vid = P.getProperty('PRIMO_VID');
  if (!vid) throw new Error('PRIMO_VID is not set in Script Properties.');
  var lim = Math.max(1, Math.min(25, Number(limit) || 10));
  var r = call_('/primo/v1/search', {
    vid: vid, tab: P.getProperty('PRIMO_TAB') || 'Everything', scope: P.getProperty('PRIMO_SCOPE') || 'MyInst_and_CI',
    q: 'any,contains,' + q.replace(/,/g, ' '), limit: lim, offset: Math.max(0, Math.min(MAX_OFFSET, Number(offset) || 0)), lang: 'en', pcAvailability: 'false'
  }, 600);
  var docs = (r && r.docs) || [];
  return { total: (r && r.info && r.info.total) || docs.length, records: docs.map(simplifyDoc_).filter(function (d) { return d.title; }) };
}

function simplifyDoc_(d) {
  var pnx = d.pnx || {}, disp = pnx.display || {}, ctl = pnx.control || {}, ad = pnx.addata || {};
  var del = d.delivery || {}, best = del.bestlocation || first_(del.holding) || {};
  var mms = first_(disp.mms) || String(first_(ctl.recordid) || '').replace(/^alma/, '');
  return {
    mms: /^\d+$/.test(mms) ? mms : null,
    title: cleanText_(first_(disp.title)),
    author: cleanText_(first_(disp.creator) || first_(disp.contributor) || ''),
    year: cleanText_(first_(disp.creationdate) || ''),
    type: cleanText_(first_(disp.type) || ''),
    isbn: String(first_(ad.isbn) || '').replace(/[^0-9X]/gi, ''),
    callNumber: cleanText_(best.callNumber || ''),
    availability: best.availabilityStatus || null,
    libraryCode: best.libraryCode || null,
    libraryName: best.mainLocation || null,
    locationCode: best.subLocationCode || null,
    locationName: best.subLocation || null,
    online: /fulltext/.test(JSON.stringify(del.availability || '')) || /Alma-E/.test(JSON.stringify(del.deliveryCategory || ''))
  };
}

function items_(mms) {
  mms = String(mms || '');
  if (!/^\d{6,25}$/.test(mms)) throw new Error('Invalid MMS ID.');
  var r = call_('/almaws/v1/bibs/' + mms + '/holdings/ALL/items', { limit: 100, offset: 0, expand: 'due_date' }, 120);
  var list = (r && r.item) || [];
  return { total: (r && r.total_record_count) || list.length, items: list.map(simplifyItem_) };
}

function simplifyItem_(it) {
  var b = it.bib_data || {}, h = it.holding_data || {}, i = it.item_data || {};
  var inPlace = i.base_status && String(i.base_status.value) === '1';
  var proc = (i.process_type && i.process_type.value) || '';
  var status = inPlace ? 'shelf' : /LOAN/.test(proc) ? 'out' : /MISSING|LOST|CLAIMED/.test(proc) ? 'missing' : /TRANSIT|HOLDSHELF|REQUESTED/.test(proc) ? 'transit' : 'away';
  return {
    title: b.title || '', barcode: i.barcode || '', pid: i.pid || '',
    callNumber: h.call_number || i.alternative_call_number || '',
    temporary: !!h.in_temp_location,
    libraryCode: (i.library && i.library.value) || null, libraryName: (i.library && i.library.desc) || null,
    locationCode: (i.location && i.location.value) || null, locationName: (i.location && i.location.desc) || null,
    status: status, statusText: inPlace ? 'In place' : ((i.process_type && i.process_type.desc) || (i.base_status && i.base_status.desc) || 'Not in place'),
    dueDate: i.due_date || null, description: i.description || ''
  };
}

function locations_() {
  var libs = call_('/almaws/v1/conf/libraries', null, 21600);
  var out = [];
  ((libs && libs.library) || []).forEach(function (l) {
    var locs = call_('/almaws/v1/conf/libraries/' + encodeURIComponent(l.code) + '/locations', null, 21600);
    ((locs && locs.location) || []).forEach(function (x) {
      out.push({ libraryCode: l.code, libraryName: l.name, locationCode: x.code, locationName: x.name, externalName: x.external_name || '', suppressed: String(x.suppress_from_publishing) === 'true' });
    });
  });
  return { locations: out };
}

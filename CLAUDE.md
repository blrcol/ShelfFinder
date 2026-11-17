# ShelfFinder: project handoff

ShelfFinder is a student project for Colgate University's Case-Geyer Library. It finds books, says where they are right now, plans the quickest route to collect several, and guides people to the shelf with maps, an AR-style camera guide and a shelf view. The shelves are fixed but books move, so the app also tracks moves: librarian scanning, photos of shelf labels, and "Not here" reports from students.

## Layout

```
src/library-data.js    floors 1–5 (walk graph, nodes [x,y,label,category]), stairs/elevators, stack blocks
                       (LC ranges from the floor-plan signs), pilot range, catalogRules, liveCatalogUrl, demo books
src/core.js            pure logic (browser + Node): LC call numbers, lookup, Dijkstra routing, directions,
                       cart trip planner (Held–Karp ≤11 stops, else NN + 2-opt), misshelf detection (LIS),
                       OCR label matching, CSV import, Firebase event merge, places, reading-list links,
                       live-catalog mapping (catalogPlace, summarizeCopies)
src/template.html      the whole UI (CSS + HTML + JS); placeholders /*__DATA__*/ /*__CORE__*/ /*__MAPS__*/
src/maps.json          floor plan images (base64 JPEG) cropped from Colgate's published floor plans
build.py               bundles src/ into index.html (one self-contained file; this is the website)
manifest.webmanifest   PWA manifest; icons/ holds the app icon (icon.svg is the source, PNGs rendered from it)
sw.js                  offline helper (network-first, same-origin only; bump VERSION to clear old caches)
.github/workflows/     tests.yml: on every push, checks index.html is rebuilt and runs the three test suites
server/alma-proxy.gs   Google Apps Script proxy that holds the Ex Libris API key (read-only)
server/SETUP.md        how to deploy the proxy and connect it
tests/                 core.test.js, proxy.test.js (mocked Apps Script + Ex Libris), app-live.test.js
                       (runs the built app headlessly through tests/harness.js with tests/fixtures/catalog-mock.json)
```

Always edit `src/`, then run `python3 build.py`. Never hand-edit index.html.

## Commands

```
python3 build.py
node tests/core.test.js && node tests/proxy.test.js && node tests/app-live.test.js
python3 -m http.server 8000      # local preview at http://localhost:8000
```

## Decisions to keep

- **Design:** Colgate identity colors. Maroon #821019 is the main color, Maple Red #E10028 is used for buttons, Shadow Gray #5A646E and Winter Gray #D2D4D6 are the neutrals, and Dark Maroon #411217 is used in gradients. Do **not** use the Colgate logo unless Colgate Communications approves it and provides the files. The look is **Aero Glass** (Windows Vista/7 style, chosen by the owner from the design-concept canvas, Nov 2026): a maroon wallpaper with light streaks; every `.panel`, `.phead`, `.hero`, `.helpbox`, `#findResults`, `.kpis` and `.stagewrap` is a glass "window" (thick transparent border showing tinted, blurred glass via `--g1`/`--g2`; white padding box as the client area); the first `.ph`/`.sec-h`/eyebrow/`h4` sits in the 30px glass title strip in black with a white glow. Header = glass title bar with a glossy maroon orb, nav = classic blue-gradient command bar; primary `.btn` = blue-glow default button, `.sec`/`.outline` = grey button; floor numbers and step numbers are glossy maroon; footer = glass taskbar strip. Fonts: Segoe UI / system UI. A big slab-serif "C" sits in the middle of the whole page and scrolls with it (`.bgc` > `.bigc`, Roboto Slab 800 from Google Fonts with only the letter C requested, Rockwell/Georgia fallback, aria-hidden); it is a plain letter, not Colgate's official logo. No emoji. The footer says ShelfFinder is a student project, not an official Colgate service; keep that unless the library adopts it. The previous Colgate-editorial design is in git history (commit 41b6413).
- **Search results** are ordered on shelf → LASR → online → everything else (`SHELF_RANK`), keeping catalog relevance within each group. The "Show" menu filters by group; the choice is remembered in `localStorage` (`shelffinder.show`), the one allowed use of browser storage (a per-device preference, wrapped in try/catch).
- **API key:** the Ex Libris (Alma/Primo) key is production read-only for Primo Search, Bibs and Configuration, at base URL `https://api-na.hosted.exlibrisgroup.com`. It must live **only** in the Apps Script's Script Properties (`ALMA_KEY`). Never put it in this repo, index.html, commits, docs or chat. The app talks only to the proxy URL (`liveCatalogUrl` in library-data.js), which is not secret.
- **Proxy** allows only `ping`, `search` (Primo), `items` (Alma items for an MMS ID) and `locations` (libraries plus locations). It sends the key as a header, caches results and limits requests to 120 per minute.
- **No patron data** anywhere, and no write access to Alma.
- No localStorage dependency for data (only the "Show" preference above). Data moves through JSON export/import or the optional Firebase Realtime Database (REST + EventSource).
- In `library-data.js`, `catalogRules[].match` is a string regex. Escape backslashes (`'\\bref\\b'`).
- **Sample books** (`books` in library-data.js) are flagged `demo` and show a "Sample book" pill. While the live catalog is connected they are hidden from student search and reading lists and never merged with live records; `?demo=1` shows them for demos.
- **Accessibility:** icons get `aria-hidden` (`ic()` does it); clickable non-buttons need `role="button" tabindex="0"` or `data-kbd` (Enter/Space handled globally); dialogs are `.modal` with `role=dialog` + `aria-labelledby` (focus in/out and Escape are automatic); every input needs a `<label for>` or `aria-label`; keep text contrast ≥ 4.5:1.
- **Catalog links:** `catalogRecordUrl` (Primo fulldisplay by MMS ID) for live records, `catalogSearchUrl` otherwise.

## Status

Done: search, call-number lookup (Levels 1–4; SuDoc goes to Level 1; Q–T flagged as Cooley), multi-floor routing on the real maps, places (nearest restroom and others), cart trip planner, reading-list links and QR, AR guide (camera, compass, voice, Floor AR beta via WebXR), shelf view, misshelf detection, OCR label reading (Tesseract.js), "Not here" reports, librarian dashboard, scan-to-shelve, CSV import, Firebase sync, QR markers, map editor, live catalog integration, the Colgate-styled Find page.

Live catalog: proxy deployed (Nov 16, 2026) with `PRIMO_VID` = `01COLGATE_INST:01COLGATE_INST` (default tab/scope work) and its URL is in `liveCatalogUrl`. Search, items and locations verified against Colgate's real Alma/Primo; `catalogRules` checked against all 58 real locations (10 still go "by call number": CASE Main plus atlases, maps, microforms, newspapers, indexes — confirm where those really are).

Not yet verified against real systems: camera, compass, QR scanning, voice, OCR, Firebase and Floor AR on real phones. Book data in library-data.js is demo data.

## Next steps

1. ~~Deploy the proxy~~ Done. When `server/alma-proxy.gs` changes, paste it into the Apps Script and use Deploy → Manage deployments → edit → New version (keeps the same URL).
2. ~~Put the site on GitHub Pages~~ Live at https://blrcol.github.io/ShelfFinder/ (repo github.com/blrcol/ShelfFinder, Pages from `main` / root). To update: this folder (`~/Documents/ShelfFinder/ShelfFinder`) is a git clone of the repo and the Mac is signed in with the GitHub CLI (`gh`, account blrcol), so rebuild, commit and `git push`; Pages republishes in about a minute. Still to do: test it on an iPhone and an Android in the library.
3. Use Librarian → Load locations to check Colgate's real location codes, then adjust `catalogRules`.
4. Calibrate the map with the in-app map editor (metres per unit and north offset), and record the call numbers on the row-end signs.
5. ~~Restyle the other tabs~~, ~~installable PWA~~, ~~accessibility pass~~ (done Nov 16, 2026; the service worker could not be tested in the preview browser, so confirm install + offline on a real phone). Still manual-only: the map editor needs a mouse or touch screen.
6. Run a timed student test, then make the demo video and slides.

The feature spec is the Google Doc "ShelfFinder Feature Specification" in the owner's Drive (ShelfFinder folder).

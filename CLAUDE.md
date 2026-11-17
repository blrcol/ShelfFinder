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
.github/workflows/     tests.yml: on every push, checks index.html is rebuilt, runs the three test suites, and builds + checks the container
Dockerfile             container: stage 1 runs build.py, stage 2 serves the site from nginx-unprivileged on port 8080
docker/nginx.conf      cache rules (index.html, sw.js, manifest: no-cache), manifest MIME type, nosniff/referrer headers
compose.yaml           `docker compose up --build` -> http://localhost:8080 (.dockerignore keeps tests, server, git out)
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
docker build -t shelffinder . && docker run --rm -p 8080:8080 shelffinder   # container at http://localhost:8080 (Docker isn't installed on the owner's Mac; GitHub Actions builds and checks it)
```

## Decisions to keep

- **Design:** Colgate identity colors. Maroon #821019 is the main color, Maple Red #E10028 is used for buttons, Shadow Gray #5A646E and Winter Gray #D2D4D6 are the neutrals, and Dark Maroon #411217 is used in gradients. Do **not** use the Colgate logo unless Colgate Communications approves it and provides the files. The look is **Aero Glass** (Windows Vista/7 style, chosen by the owner from the design-concept canvas, Nov 2026): a maroon wallpaper with light streaks; every `.panel`, `.phead`, `.hero`, `.helpbox`, `#findResults`, `.kpis` and `.stagewrap` is a glass "window" (thick transparent border showing tinted, blurred glass via `--g1`/`--g2`; white padding box as the client area); the first `.ph`/`.sec-h`/eyebrow/`h4` sits in the 30px glass title strip in black with a white glow. Header = glass title bar with a glossy maroon orb, nav = classic blue-gradient command bar; primary `.btn` = blue-glow default button, `.sec`/`.outline` = grey button; floor numbers and step numbers are glossy maroon; footer = glass taskbar strip. Fonts: Segoe UI / system UI. A big slab-serif "C" stays still on screen while the page scrolls over it, centred, sized to fit the screen (95vh font, 72vh on phones) with the letter's outline exactly centred on screen (em-based nudge from measured glyph metrics) (`.bgc` fixed > `.bigc`, Roboto Slab 800 from Google Fonts with only the letter C requested, Rockwell/Georgia fallback, aria-hidden); it is a plain letter, not Colgate's official logo. No emoji. The footer says ShelfFinder is a student project, not an official Colgate service; keep that unless the library adopts it. The previous Colgate-editorial design is in git history (commit 41b6413).
- **Search results** are ordered on shelf → LASR → online → everything else (`SHELF_RANK`), keeping catalog relevance within each group. The "Show" menu filters by group; the choice is remembered in `localStorage` (`shelffinder.show`). Browser storage is allowed only for per-device preferences like this one and `shelffinder.floors`, always wrapped in try/catch.
- **API key:** the Ex Libris (Alma/Primo) key is production read-only for Primo Search, Bibs and Configuration, at base URL `https://api-na.hosted.exlibrisgroup.com`. It must live **only** in the Apps Script's Script Properties (`ALMA_KEY`). Never put it in this repo, index.html, commits, docs or chat. The app talks only to the proxy URL (`liveCatalogUrl` in library-data.js), which is not secret.
- **Proxy** allows only `ping`, `search` (Primo), `items` (Alma items for an MMS ID) and `locations` (libraries plus locations). It sends the key as a header, caches results and limits requests to 120 per minute.
- **No patron data** anywhere, and no write access to Alma.
- No localStorage dependency for data (only the "Show" and "Between floors" preferences). Data moves through JSON export/import or the optional Firebase Realtime Database (REST + EventSource).
- In `library-data.js`, `catalogRules[].match` is a string regex. Escape backslashes (`'\\bref\\b'`).
- **Sample books** (`books` in library-data.js) are flagged `demo` and show a "Sample book" pill. While the live catalog is connected they are hidden from student search and reading lists and never merged with live records; `?demo=1` shows them for demos.
- **Accessibility:** icons get `aria-hidden` (`ic()` does it); clickable non-buttons need `role="button" tabindex="0"` or `data-kbd` (Enter/Space handled globally); dialogs are `.modal` with `role=dialog` + `aria-labelledby` (focus in/out and Escape are automatic); every input needs a `<label for>` or `aria-label`; keep text contrast ≥ 4.5:1.
- **Staff link:** the Librarian tab (and the sync chip) only appear with `?staff=1` (https://blrcol.github.io/ShelfFinder/?staff=1). This hides it from students; it is not security. Librarian views (KPIs, attention list, inventory) ignore sample books unless `?demo=1`.
- **Catalog links:** `catalogRecordUrl` (Primo fulldisplay by MMS ID) for live records, `catalogSearchUrl` otherwise.
- **Between floors:** routes use stairs by default (`avoidElevators`: elevators carry a big penalty, so they are used only where no stair goes; the reported cost stays the real effort). People can pick Elevator on the Route and Cart pages (`avoidStairs`, step-free). One shared choice, `S.floorsBy`, remembered on the device in `localStorage` (`shelffinder.floors`).
- **Interlibrary loan:** `illRequestUrl` opens Colgate's ILLiad book request form with the search text as the title. Live search shows a "Request from another library" button when the catalog has 0 results, and a small "Not finding it?" link under other results; neither appears for call-number searches. ShelfFinder never sees or places the request.

## Status

Done: search, call-number lookup (Levels 1–4; SuDoc goes to Level 1; Q–T flagged as Cooley), multi-floor routing on the real maps, places (nearest restroom and others), cart trip planner, reading-list links and QR, AR guide (camera, compass, voice, Floor AR beta via WebXR), shelf view, misshelf detection, OCR label reading (Tesseract.js), "Not here" reports, librarian dashboard, scan-to-shelve, CSV import, Firebase sync, QR markers, map editor, live catalog integration, the Colgate-styled Find page.

Live catalog: proxy deployed (Nov 16, 2026) with `PRIMO_VID` = `01COLGATE_INST:01COLGATE_INST` (default tab/scope work) and its URL is in `liveCatalogUrl`. Search, items and locations verified against Colgate's real Alma/Primo; `catalogRules` checked against all 58 real locations. Only CASE Main (the stacks) goes by call number. Atlases, Maps and Microforms (all microfilm/microfiche, including microfilm journals) are places labelled on the Level 3 floor plan (nodes `L3:atl`, `L3:maps`, `L3:mform`, Nov 17, 2026). Indexes → Reference and Newspapers → Current Periodicals are best guesses; ask a librarian to confirm those two and whether the microfiche docs are on Level 3 or with Government Documents on Level 1.

Library approval: the owner got the library's OK to run ShelfFinder (Nov 17, 2026). The footer still says it is a student project, not an official Colgate service, until the library formally adopts it. The owner decided to keep the current Ex Libris key rather than replace it (Nov 17, 2026); it stays only in Script Properties (`ALMA_KEY`), and a ping on Nov 17 showed configuration and bibs `ok`. If it is ever replaced, the owner pastes the new one there themselves.

Not yet verified against real systems: camera, compass, QR scanning, voice, OCR, Firebase and Floor AR on real phones. Book data in library-data.js is demo data.

## Next steps

1. ~~Deploy the proxy~~ Done. When `server/alma-proxy.gs` changes, publish it from `server/` with clasp (Node and clasp live in `~/.local/node/bin`, signed in to the user's Google account; credentials stay in `~/.clasprc.json`, never in the repo):
   `export PATH=~/.local/node/bin:$PATH && cd server && clasp push --force && clasp create-deployment -i AKfycbxSTzyb6mNUGsgtwYbaozWuZAjIxZssW_-qDjBeVV6n79pQB3YyHHkDMyeiLU-tyLHhsQ -d "<what changed>"`
   That pushes only `alma-proxy.gs` and `appsscript.json` (see `.claspignore`) and publishes a new version at the same URL. Then check `?action=ping` shows `configuration` and `bibs` as `ok`. Proxy version 2 (Nov 17, 2026) fixed the ping XML check and the `suppressed` flag.
2. ~~Put the site on GitHub Pages~~ Live at https://blrcol.github.io/ShelfFinder/ (repo github.com/blrcol/ShelfFinder, Pages from `main` / root). To update: this folder (`~/Documents/ShelfFinder/ShelfFinder`) is a git clone of the repo and the Mac is signed in with the GitHub CLI (`gh`, account blrcol), so rebuild, commit and `git push`; Pages republishes in about a minute. Still to do: test it on an iPhone and an Android in the library.
3. ~~Map Colgate's real location codes~~ Done (see Status); confirm the two best guesses with a librarian.
4. Calibrate the map with the in-app map editor (metres per unit and north offset), and record the call numbers on the row-end signs.
5. ~~Restyle the other tabs~~, ~~installable PWA~~, ~~accessibility pass~~ (done Nov 16, 2026; the service worker could not be tested in the preview browser, so confirm install + offline on a real phone). Still manual-only: the map editor needs a mouse or touch screen.
6. Run a timed student test, then make the demo video and slides.

The feature spec is the Google Doc "ShelfFinder Feature Specification" in the owner's Drive (ShelfFinder folder).

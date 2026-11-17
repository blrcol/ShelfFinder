# ShelfFinder: Case-Geyer Library

A phone app (in the browser) that finds books in Case-Geyer Library, plans the quickest trip to collect several at once, walks you there across floors, and highlights the exact spot on the shelf.

## Run it

- **On a laptop:** open `index.html`. Everything is in that one file.
- **In a container:** `docker build -t shelffinder .` then `docker run --rm -p 8080:8080 shelffinder`, and open http://localhost:8080 (or `docker compose up --build`). The image builds `index.html` from `src/` and serves it with a small non-root nginx. For phones, put it behind HTTPS (see below).
- **On a phone:** the camera, compass, QR scanning, voice and floor AR only work on an HTTPS page. Put this folder on GitHub and turn on GitHub Pages, then open the link on your phone.
- **Deep links:**
  - `?call=PR4034`
  - `?book=4&from=L3:wEnt`
  - `?cart=1,4,19` (opens a pre-filled cart)

## Features

| Tab | What it does |
|---|---|
| Find | Search by title, author or any call number. Shows the floor and stack block (Levels 1–4), when the location was last confirmed, and a "＋ Cart" button. **Places** buttons route you to restrooms (the nearest one), help desks, reading rooms, the café, labs and media rooms, and Special Collections. |
| Cart | Add as many books as you want. It works out the quickest order to collect them all across floors. You choose where to start and where to finish: the Circulation Desk to check out, back at the start, or at the last book. Books that are checked out or in LASR (the library's automated storage) are listed separately. **Share as a reading list** turns the cart into a named link and QR code (e.g. "HIST 101 · Week 5"). Students who open it get the same books and the quickest route. Links use call numbers, so they keep working after catalog imports. |
| Route | Numbered stops on the real floor plans, turn-by-turn directions, and an "avoid stairs" option. |
| AR | Camera view with an arrow (it uses the compass when on), spoken directions, and "Not here?" plus "Shelf" buttons at each stop. Scan a landing marker to re-route. **Floor AR (beta)** draws arrows on the actual floor in Chrome on Android. |
| Shelf | The target book glows on the shelf and out-of-order books are flagged. **Read shelf labels** photographs a shelf, reads the call-number labels, confirms every book's position and flags misshelved ones. You can also type the call numbers if you don't have a photo. |
| Librarian | Dashboard, a list of what needs attention ("Not here" reports, misshelved books, locations not confirmed in 30+ days), a map of problem spots, a **map editor**, top searches, scan-to-shelve, inventory, catalog CSV import, a shared database, QR markers, and calibration. |

## Map editor (calibrating to the real library)

Go to Librarian → Map editor, pick a floor, then use these modes:

- **Move points:** drag walking points to where they really are. Tap one to name it or mark it as a place, such as a restroom.
- **Add point:** tap the map to add points. Each one links to the last point you selected, so you can draw a corridor tap by tap.
- **Connect / unlink:** tap two points to add or remove the walkable line between them.
- **Delete point:** stairs, elevators, entrances and stack points are protected and can't be deleted.
- **Move / resize stacks:** drag the stack blocks to fit the real shelves.

The editor warns you if any point can't be reached. When you're done, tap **Download library-data.js**, replace `src/library-data.js` with it, and run `python3 build.py`.

## Shared database and librarian sign-in

Librarians sign in (Librarian tab → Shared database) so their changes save for everyone: shelf spots from scans, check-ins, "missing", fixing "Not here" reports and catalog imports. Students never sign in; their phones read the librarians' notes for a book when they open it, and anyone can add a "Not here" report. The database rules in `firebase/database.rules.json` enforce this, so it doesn't depend on the website. Setup, step by step: [firebase/SETUP.md](firebase/SETUP.md).

## Live Colgate catalog

ShelfFinder can search Colgate's real catalog (Primo) and check the live status of every copy (Alma), using the library's read-only API key. The key lives only in a small Google Apps Script proxy, never in the app. Setup steps are in `server/SETUP.md`.

When it's connected:

- **Find** shows a "Colgate catalog" section under the results, covering every book Colgate has, with call number, location and availability.
- Opening a book checks every copy live, e.g. "2 copies · 1 on the shelf · 1 checked out (due Dec 4)".
- Copies are routed by their Alma location: Reference, Course Reserves, Special Collections, Government Documents, Periodicals and Media go to those rooms. LASR copies show "request through the catalog", Cooley copies show "not in Case-Geyer", and online-only items show "online". Everything else is placed by call number. The rules are in `catalogRules` in `src/library-data.js`.
- **Cart** checks live status for every book before planning the trip.
- **Librarian → Live Colgate catalog** tests the connection and lists every Colgate location with where ShelfFinder sends people.

## How the cart route works

`planTrip` in `src/core.js` calculates real walking distances between every pair of stops, including stairs and elevators. For up to 11 stops it finds the best possible order using the Held–Karp method. For bigger carts it starts with "go to the nearest next stop" and then keeps improving the order with 2-opt. The tests check that the result matches trying every possible order.

## Project layout

```
src/library-data.js   floors 1–5, walkable paths, stairs/elevators, stack blocks, pilot range, demo books
src/core.js           call numbers, lookup, routing, cart trip planner, OCR label matching, CSV import, sync helpers
src/template.html     the app UI
src/maps.json         floor plan images (from Colgate's published floor plans)
build.py              bundles src/ into index.html. Run: python3 build.py
server/alma-proxy.gs  Google Apps Script proxy that holds the API key (read-only)
server/SETUP.md       how to deploy the proxy and connect the app
tests/core.test.js    run: node tests/core.test.js
tests/proxy.test.js   proxy with fake Ex Libris responses: node tests/proxy.test.js
tests/app-live.test.js  whole app against a fake proxy: node tests/app-live.test.js
```

## Honest limits / what's left

- **Demo books.** The books, their call numbers and the pilot range's shelf positions are samples. Catalog the real Level 2 A–BP range, and import the library's CSV export.
- **Map estimates.** The walking points on the maps and the metres-per-unit scale are estimates from the floor plans. Measure one real distance and calibrate.
- **Reading shelf labels.** It uses Tesseract.js (it needs internet the first time) and works best with a close, straight-on, well-lit photo of one shelf.
- **Floor AR.** This is the least reliable part. It needs Chrome on Android with ARCore. iPhone Safari doesn't support it yet, so iPhones use the normal AR guide. Its arrows line up best when you start at a marker with the compass on.
- **QR codes** for reading lists and markers load a small library from the internet. Offline, you can still share the link.
- **Live catalog.** It's built and tested against fake Ex Libris responses. My build environment can't reach Ex Libris, so the first real check is the **Test** button after you deploy the proxy. It also needs Colgate's Primo view ID. Holds still go through the catalog link.
- **Untested on real devices.** The camera, compass, QR scanning, Firebase sync, reading shelf labels and Floor AR haven't been tried yet. The preview window blocks them.

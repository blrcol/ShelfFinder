# Connecting ShelfFinder to the live Colgate catalog

ShelfFinder never stores the API key itself. A small Google Apps Script (the "proxy") holds the key and only makes read-only requests: Primo Search, Bibs and Configuration. The app talks to the proxy.

```
ShelfFinder app  →  proxy (Google Apps Script, holds the key)  →  Ex Libris APIs
```

## 1. Create the proxy (about 10 minutes)

1. Go to script.google.com and sign in with your Colgate Google account. Click **New project** and name it `ShelfFinder catalog proxy`.
2. Delete the sample code in `Code.gs` and paste in everything from `alma-proxy.gs`. Save.
3. Click **Project Settings** (gear icon) → **Script Properties** → **Add script property**, and add:

   | Property | Value |
   |---|---|
   | `ALMA_KEY` | the API key the library gave you |
   | `PRIMO_VID` | Colgate's Primo view ID (see step 2 below) |
   | `PRIMO_TAB` | optional, from the same catalog URL (`tab=`) |
   | `PRIMO_SCOPE` | optional, from the same catalog URL (`search_scope=`) |

4. Click **Deploy** → **New deployment** → the gear next to "Select type" → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (the app runs on phones that aren't signed in to Google; the key stays hidden either way)
5. Click **Deploy** and approve the permissions. Copy the **Web app URL**. It ends in `/exec`.

## 2. Find Colgate's Primo view ID

Search for any book in Colgate's library catalog, then look at the address bar. Copy the value after `vid=`, which looks something like `01COLG_INST:XXXX`. Copy `tab=` and `search_scope=` too if they're there. Put these values in the Script Properties from step 1.

## 3. Connect the app

1. Open ShelfFinder → **Librarian** → **Live Colgate catalog**.
2. Paste the Web app URL and click **Connect**. The test should show four green checks.
3. Click **Load locations** and check where ShelfFinder sends people for each Colgate location. To change a mapping, edit `catalogRules` in `src/library-data.js`.
4. To make the connection permanent, put the URL in `liveCatalogUrl` in `src/library-data.js` and run `python3 build.py`. The URL is not secret.

## What the proxy can do

| Action | Calls | Used for |
|---|---|---|
| `ping` | `GET /almaws/v1/conf/test`, `GET /almaws/v1/bibs/test` | Checking the key works |
| `search` | `GET /primo/v1/search` | Finding any book by title, author or keyword |
| `items` | `GET /almaws/v1/bibs/{mms_id}/holdings/ALL/items` | Live status of every copy |
| `locations` | `GET /almaws/v1/conf/libraries` and each library's `/locations` | Matching Colgate locations to floors |

Nothing else is allowed. Searches are cached for 10 minutes and item status for 2 minutes. The proxy also refuses more than 120 requests a minute, which protects Colgate's daily API limit.

## Keeping the key safe

- Store it only in Script Properties. Never put it in `index.html`, GitHub, Google Drive files, slides or group chats.
- If it is ever exposed, ask the library to regenerate it, then update `ALMA_KEY`. The app doesn't need any change.
- To check the proxy without the real API, run `node tests/proxy.test.js`.

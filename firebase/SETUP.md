# Librarian sign-in and the shared database (Firebase)

This lets librarians sign in so their changes (shelf spots from scans, check-ins, "missing", fixing
"Not here" reports, catalog CSV imports) are saved for everyone. Students never sign in: their
phones read the librarians' notes, and they can add a "Not here" report.

Firebase's free plan is enough. You need a Google account. It takes about 10 minutes.

## 1. Make the project

1. Go to https://console.firebase.google.com and click **Create a project**.
2. Name it `ShelfFinder`. Turn **off** Google Analytics. Click **Create project**.

## 2. Turn on the database

1. In the left menu: **Build → Realtime Database → Create Database**.
2. Location: **United States**. Click **Next**.
3. Choose **Start in locked mode**. Click **Enable**.
4. Open the **Rules** tab. Delete everything there, paste in the whole of `firebase/database.rules.json`
   from this project, and click **Publish**.

## 3. Turn on librarian sign-in

1. **Build → Authentication → Get started**.
2. Under **Sign-in method**, click **Email/Password**, switch on the first toggle (not "Email link"), and **Save**.
3. Open the **Settings** tab → **User actions**. **Untick "Enable create (sign-up)"** and **Save**.
   Now only you can create librarian accounts.

## 4. Add each librarian

For each person:

1. **Authentication → Users → Add user**. Type their Colgate email and a temporary password. Click **Add user**.
2. Copy their **User UID** from the list (the long code in the last column).
3. Go to **Realtime Database → Data**. Hover over the top line, click **+**:
   - Name: `staff` and click **+** again inside it.
   - Name: the User UID you copied. Value: `true`. Click **Add**.
4. Tell them the temporary password. They can choose their own with **Forgot password?** on the sign-in form.

To remove someone later: delete their line under `staff` (and the user, if you like).

## 5. Connect ShelfFinder

1. Click the gear next to **Project Overview → Project settings**.
2. Under **Your apps**, click the **</>** (Web) button. Nickname `ShelfFinder`, leave Hosting unticked,
   click **Register app**.
3. From the code it shows, copy two values: `apiKey` and `databaseURL`. Neither is secret; the rules
   decide who can write.
4. Put them in `src/library-data.js`:
   ```js
   firebase: { databaseURL: 'https://shelffinder-xxxx-default-rtdb.firebaseio.com', apiKey: 'AIza…' },
   ```
   then run `python3 build.py` and push. (Or send the two values to whoever updates the site.)

## 6. Try it

1. Open https://blrcol.github.io/ShelfFinder/?staff=1 → **Librarian** tab → **Shared database**.
2. Sign in. It should say "Signed in as … Changes are saved for everyone · ● Live".
3. If it says the account "isn't on the staff list yet", check step 4.3: the UID under `staff` must match
   exactly, with the value `true`.

## What the rules allow

| Who | Can |
| --- | --- |
| Anyone | Read book notes and reports. Add a "Not here" report (a server timestamp only). |
| Signed-in librarian listed under `staff` | Change books, clear reports. |
| Anyone else, signed in or not | Nothing more. Nobody can change `staff` except you in the console. |

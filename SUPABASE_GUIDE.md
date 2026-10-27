# Step-by-Step Guide — Connecting the Permanent Database (Supabase) & Going Live

This system has **three parts**:

| Part | What it does | Where it runs |
|---|---|---|
| Website (front-end) | What admin, teachers and parents see | Vercel — https://awais-public-school.vercel.app |
| Server (back-end) | Logins, security, all the rules | Render — https://awais-public-school-api.onrender.com |
| Database | Where all school data is stored | Built-in SQL file **or** Supabase (free, permanent) |

The server already speaks **both** databases. You do not change any code — you only set one setting (`DATABASE_URL`) and the server switches to Supabase and creates all 24 tables by itself on first start.

---

## Option A — No setup (demo mode, current state)

Do nothing. The server uses its built-in SQL database file. Perfect for demos and trials.

⚠️ **Warning:** on Render's free plan the server's disk is temporary — data resets when the service restarts, and the start-up seed fills demo data again. **Never enter real student records in this mode.**

## Option B — Supabase (permanent database for real school use) ✅ Recommended

Takes about 10 minutes. You need: a free Supabase account and access to the Render dashboard. **Never send the database password or connection string to anyone in chat or WhatsApp** — paste it only inside Render's secure Environment settings (Step 4).

### Step 1 — Create the Supabase project
1. Go to **supabase.com** → Sign up / Log in (GitHub login is fine).
2. Click **New project**. Name: `awais-public-school`. Choose a **strong database password** and save it in your password manager — you will need it in Step 3.
3. Region: pick **Singapore** or **Mumbai** (closest to Pakistan). Plan: **Free**.
4. Wait ~2 minutes until the project shows **Active**.

### Step 2 — (Optional) Look at the tables
You do **not** need to create tables by hand — the server creates them automatically on first start.
If you ever want to inspect or set them up manually: Supabase → **SQL Editor** → paste the contents of `supabase/schema.sql` from this project → **Run**.

### Step 3 — Copy the connection string
1. In Supabase: **Project Settings (gear icon) → Database → Connection string**.
2. Choose the **Transaction pooler** string (port **6543**) — this is the right one for Render. It looks like:
   `postgresql://postgres.xxxxx:YOUR-PASSWORD@aws-0-....pooler.supabase.com:6543/postgres`
3. Replace `YOUR-PASSWORD` in it with the database password from Step 1. Keep this string private.

### Step 4 — Give the connection string to the server (Render)
1. Go to **render.com** → open the service **awais-public-school-api** → **Environment**.
2. Add these variables:
   - `DATABASE_URL` = the full connection string from Step 3
   - `JWT_SECRET` = a long random secret (32+ characters — e.g. mix of words, numbers, symbols). **Required:** in production mode the server refuses to start without a strong secret, by design.
   - `NODE_ENV` = `production`
   - `CORS_ORIGIN` = `https://awais-public-school.vercel.app` (already set — leave it)
3. Click **Save Changes** → Render restarts the service automatically (**Manual Deploy → Deploy latest commit** if it doesn't).

### Step 5 — Verify (2 minutes)
1. Wait for the Render deploy log to show the service **Live**. On this first start the server creates all tables in Supabase and the start command runs the seed (demo data) once.
2. Open https://awais-public-school-api.onrender.com/api/health → it should show `{"ok":true,...}`.
3. Open the website and log in with a demo account (see README). Check: Students list loads, Staff & Salaries shows 4 staff members, one salary receipt exists.
4. In Supabase → **Table Editor** you can now see the tables (`students`, `staff`, `salary_payments`, …) with real rows. From this moment, **data is permanent** — restarts no longer erase anything.

### Step 6 — Make it the school's real system (important)
Do these before entering any real student data:
1. **Change every demo password** or deactivate demo accounts: log in as Super Admin → Teachers & Users → set `isActive` off for demo users you don't need, and create real accounts for the principal, accountant and teachers with strong passwords (min 8 characters — enforced).
2. Create **parent accounts** and link each parent to their children (office does this; a parent can only ever see their own children — enforced on the server, tested).
3. Add real staff in **Staff & Salaries** with correct monthly salaries.
4. Enter/import real students (form or CSV import on the Students page). Keep guardian name + phone correct — parent details appear automatically on fee receipts, report cards and the student profile.
5. **Backups:** Supabase free plan keeps automatic daily backups for a limited window; also export important tables monthly from Supabase → Table Editor → Export CSV, and keep a copy with the school office.

### If something goes wrong
- **Server will not start / FATAL JWT_SECRET error:** `JWT_SECRET` is missing or still the demo value — set a strong one (Step 4) and redeploy.
- **Login works but data looks like demo again:** `DATABASE_URL` is not set on the *running* service, so it fell back to the built-in file. Check Render → Environment, save, redeploy.
- **Tables missing in Supabase:** the server creates them on start only when `DATABASE_URL` is set *before* start. Fix the variable and restart the service.
- **Wrong password in connection string:** Supabase → Project Settings → Database → **Reset database password**, update `DATABASE_URL`, redeploy.

---

## Running on a school computer instead (fully offline option)

The same system also runs on one PC in the school office (no internet needed after install): install Node.js 24, copy the project, then:

```
cd server && npm install && npm run seed && npm start     (Terminal 1)
cd client && npm install && npm run build                  (Terminal 2 — serves via any static host)
```

With no `DATABASE_URL` it uses the built-in SQL file (`server/awais.db`) — back up that one file and you have backed up the whole school.

## Security summary (already built in — nothing to configure)

- Passwords are stored **hashed** (bcrypt), never in plain text; minimum 8 characters.
- Every login gets a signed token (8-hour expiry); every page checks the user's **role** on the server, not just in the browser.
- Parents are locked to **their own children only** — checked on the server for students, fees, diary and results (results visible only after the school publishes them).
- Login is rate-limited (brute-force protection) and the whole API has a general rate limit.
- All database queries are parameterised (SQL-injection safe) in both database modes.
- Fee payments and salary payments are **never deleted** — mistakes are fixed by reversal with a reason, and every important action is written to the **Audit Log**.

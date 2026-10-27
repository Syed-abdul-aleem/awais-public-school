# Awais Public School — Management System
Bihari Colony, Zaferabad, Dera Ismail Khan, Pakistan • Principal: +92 346 7868108

Production-ready monorepo: React+Vite+TypeScript+Tailwind frontend, Node/Express backend, Node's built-in SQLite (node:sqlite) with parameterized queries — no native binary downloads, zero-config and reliable. Production Postgres port: same tables 1:1, see DEPLOYMENT.md and docker-compose.yml.

## Quick start
```bash
cp .env.example .env
cd server && npm i && npm run seed && cd ..
cd client && npm i && cd ..
# terminal 1
cd server && npm run dev   # http://localhost:4000
# terminal 2
cd client && npm run dev   # http://localhost:5173
```
## Demo logins (fictional seed only — change before real use)
- super@awais.edu.pk / Admin@123 (Super Admin)
- principal@awais.edu.pk / Admin@123
- accounts@awais.edu.pk / Account@123
- teacher@awais.edu.pk / Teacher@123
- parent@awais.edu.pk / Parent@123
No universal default password is created in production seed; production seed requires SEED_ADMIN_PASSWORD env.

## Features
Students & admissions, CSV import, promotion/withdrawal history, teachers & assignments, attendance with duplicate prevention + audit corrections, daily diary & homework, fee structures/generation/partial payments/discounts/fines/receipts/ledgers/reports with audit reversals (never delete payments), exams/marks/grades/report cards (draft/published), parent portal with strict child isolation, announcements, role dashboards with real DB data, audit logs, rate-limited auth, bcrypt, JWT, zod validation, school_id isolation on every query.

## Tests
`cd server && npm test` — fee balance, grade, attendance % unit tests.
`cd server && npm run test:api` after server running — auth + RBAC + parent isolation smoke tests.

## Backup
SQLite: copy server/prisma/dev.db. Postgres: `pg_dump $DATABASE_URL > backup.sql` and restore `psql $DATABASE_URL < backup.sql`. Test restore on staging monthly.

## Deploy
Vercel (client) + Render/Railway/VPS (server) + Neon/Supabase Postgres. Set VITE_API_URL, DATABASE_URL, JWT_SECRET, CORS_ORIGIN. HTTPS enforced at host.

## v2 (Oct 2026) — what's new
- **Staff & Salaries module:** staff records (teachers + support staff), monthly payroll with deductions, partial payments, salary receipts (SAL-000001…), reversal-with-reason, payroll totals. Admin/Accountant access only.
- **Parent details everywhere:** full student profile (guardian + linked parent portal accounts, attendance %, fee summary), guardian shown on fee table, fee receipts and printable report cards.
- **Fixed & completed screens:** Classes page can now add sections and subjects; Exams has a proper marks-entry grid (pick exam → add subjects → pick student → type marks → report card); Students can be promoted from their profile. Login no longer pre-fills any password.
- **Fully responsive theme:** mobile sidebar with backdrop, bottom-sheet student profile, tables scroll inside their cards, phone-friendly forms.
- **Permanent database option:** set `DATABASE_URL` (Supabase/Postgres) and the server uses it automatically — all tables are created on first start. Without it, the built-in SQL file is used (demo mode). **Full steps: see `SUPABASE_GUIDE.md`.**
- Security: production mode refuses to start without a strong `JWT_SECRET`; API-wide rate limiting added on top of the login limit.

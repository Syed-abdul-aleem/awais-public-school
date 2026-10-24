# Administrator Guide — Awais Public School
1. Sign in as Principal/Super Admin. 2. Settings: school profile is seeded (Bihari Colony, Zaferabad, DI Khan, +92 346 7868108) — edit in DB/School record via API /api/school.
3. Create session/classes/sections/subjects first, then teacher accounts, assign via DB/API (TeacherAssignment), admit students, link parents (ParentStudent) — parent login only sees linked children (enforced server-side on every endpoint, not just UI).
4. Fees: create FeeStructure per class, Generate monthly fees (duplicates skipped by unique constraint), Collect records partial/full, Adjust adds discount/fine, Reverse (never delete) a payment with reason.
5. Exams: create exam, add ExamSubjects with max/pass, enter marks (validated), Publish when ready — parents see only published.
6. Backup weekly, test restore monthly. Rotate JWT_SECRET and change all demo passwords before real data.

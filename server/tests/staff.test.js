import test, { before, after } from 'node:test'; import assert from 'node:assert'; import { spawn, spawnSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
// Integration tests for the Staff & Salary module: real server + temp SQLite DB, seeded with fictional data.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'awais-staff-'));
const PORT = 4188; const BASE = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, DATABASE_FILE: path.join(tmp, 'test.db'), PORT: String(PORT), JWT_SECRET: 'test-secret-123', NODE_ENV: 'test' };
let server, token, staff1, staff2, pay1;
async function api(p, { method = 'GET', body } = {}) { const r = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, body: j }; }
before(async () => {
  const seed = spawnSync('node', ['prisma/seed.js'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(seed.status, 0, 'seed failed: ' + seed.stderr);
  server = spawn('node', ['src/index.js'], { cwd: root, env, stdio: 'pipe' });
  let up = false; for (let i = 0; i < 60 && !up; i++) { try { const r = await fetch(BASE + '/api/health'); up = r.ok; } catch {} if (!up) await new Promise(r => setTimeout(r, 200)); }
  assert.ok(up, 'server did not start');
  const login = await api('/api/auth/login', { method: 'POST', body: { email: 'principal@awais.edu.pk', password: 'Admin@123' } });
  assert.equal(login.status, 200); token = login.body.token;
});
after(() => { server?.kill('SIGKILL'); });
test('create staff validates and stores monthlySalary', async () => {
  const r = await api('/api/staff', { method: 'POST', body: { fullName: 'Test Clerk One', designation: 'Clerk', phone: '0300-0000001', monthlySalary: 30000 } });
  assert.equal(r.status, 201); assert.equal(r.body.monthlySalary, 30000); staff1 = r.body.id;
  const bad = await api('/api/staff', { method: 'POST', body: { fullName: 'Bad Salary', designation: 'Clerk', monthlySalary: -5 } });
  assert.equal(bad.status, 400);
});
test('pay salary: SAL- receipt format and full-month net math', async () => {
  const r = await api(`/api/staff/${staff1}/salary`, { method: 'POST', body: { month: '2027-03' } });
  assert.equal(r.status, 201); assert.match(r.body.receiptNo, /^SAL-\d{6}$/); assert.equal(r.body.net, 30000); assert.equal(r.body.gross, 30000); pay1 = r.body.id;
});
test('overpayment for a fully paid month is rejected', async () => {
  const r = await api(`/api/staff/${staff1}/salary`, { method: 'POST', body: { month: '2027-03', amount: 1 } });
  assert.equal(r.status, 400);
});
test('partial payment + deductions math and payroll totals', async () => {
  const c = await api('/api/staff', { method: 'POST', body: { fullName: 'Test Clerk Two', designation: 'Assistant', monthlySalary: 20000 } });
  assert.equal(c.status, 201); staff2 = c.body.id;
  const p1 = await api(`/api/staff/${staff2}/salary`, { method: 'POST', body: { month: '2027-03', amount: 5000 } });
  assert.equal(p1.status, 201); assert.equal(p1.body.net, 5000);
  const tooMuch = await api(`/api/staff/${staff2}/salary`, { method: 'POST', body: { month: '2027-03', amount: 999999 } });
  assert.equal(tooMuch.status, 400);
  const rep = await api('/api/staff/payroll?month=2027-03');
  assert.equal(rep.status, 200); assert.equal(rep.body.totals.totalPaid, 35000); // 30000 (staff1) + 5000 (staff2); seed payments are in 2026-10
  const e2 = rep.body.entries.find(e => e.staff.id === staff2); assert.equal(e2.paid, 5000); assert.equal(e2.balance, 15000); assert.equal(e2.status, 'PARTIAL');
  const e1 = rep.body.entries.find(e => e.staff.id === staff1); assert.equal(e1.status, 'PAID'); assert.equal(e1.balance, 0);
  const p2 = await api(`/api/staff/${staff2}/salary`, { method: 'POST', body: { month: '2027-03', deductions: 1000 } });
  assert.equal(p2.status, 201); assert.equal(p2.body.net, 14000); // 20000 - 1000 deductions - 5000 already paid
  const rep2 = await api('/api/staff/payroll?month=2027-03'); const e2b = rep2.body.entries.find(e => e.staff.id === staff2);
  assert.equal(e2b.status, 'PAID'); assert.equal(e2b.deductions, 1000); assert.equal(e2b.balance, 0);
});
test('reverse salary payment restores the payroll balance', async () => {
  const r = await api(`/api/staff/salary/${pay1}/reverse`, { method: 'POST', body: { reason: 'Test reversal' } });
  assert.equal(r.status, 200); assert.equal(r.body.isReversed, true);
  const rep = await api('/api/staff/payroll?month=2027-03'); const e1 = rep.body.entries.find(e => e.staff.id === staff1);
  assert.equal(e1.paid, 0); assert.equal(e1.balance, 30000); assert.equal(e1.status, 'PENDING');
  const again = await api(`/api/staff/salary/${pay1}/reverse`, { method: 'POST', body: { reason: 'again' } });
  assert.equal(again.status, 400);
});

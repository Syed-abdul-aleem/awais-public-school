import fs from 'node:fs'; import path from 'node:path'; import pg from 'pg';
// DUAL DATABASE LAYER (all call sites are async):
//  - DATABASE_URL set  -> Postgres (Supabase) via `pg` Pool. `?` placeholders are translated to $1..$n,
//    INSERTs get `RETURNING id` appended and resolve to {lastInsertRowid}, UPDATE/DELETE resolve to {changes}.
//  - DATABASE_URL unset -> Node 24 built-in SQLite (node:sqlite), zero-config default, same behaviour as before.
pg.types.setTypeParser(20, v=> v===null? null: parseInt(v,10)); // int8 (COUNT etc.) -> number
const DDL = `
CREATE TABLE IF NOT EXISTS schools(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,address TEXT,phone TEXT,email TEXT,logoUrl TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,schoolId INTEGER,name TEXT,startDate TEXT,endDate TEXT,isCurrent INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,schoolId INTEGER,name TEXT,email TEXT UNIQUE,passwordHash TEXT,role TEXT,isActive INTEGER DEFAULT 1,phone TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS classes(id INTEGER PRIMARY KEY AUTOINCREMENT,schoolId INTEGER,name TEXT,level INTEGER, UNIQUE(schoolId,name));
CREATE TABLE IF NOT EXISTS sections(id INTEGER PRIMARY KEY AUTOINCREMENT,classId INTEGER REFERENCES classes(id),name TEXT, UNIQUE(classId,name));
CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,classId INTEGER REFERENCES classes(id),name TEXT);
CREATE TABLE IF NOT EXISTS teachers(id INTEGER PRIMARY KEY AUTOINCREMENT,userId INTEGER UNIQUE REFERENCES users(id),qualification TEXT,cnic TEXT,address TEXT);
CREATE TABLE IF NOT EXISTS teacher_assignments(id INTEGER PRIMARY KEY AUTOINCREMENT,teacherId INTEGER,subjectId INTEGER,sectionId INTEGER, UNIQUE(teacherId,subjectId,sectionId));
CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY AUTOINCREMENT,schoolId INTEGER,admissionNo TEXT UNIQUE,firstName TEXT,lastName TEXT,dob TEXT,gender TEXT,guardianName TEXT,guardianPhone TEXT,guardianEmail TEXT,emergencyContact TEXT,address TEXT,photoUrl TEXT,status TEXT DEFAULT 'ACTIVE',createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS parent_students(id INTEGER PRIMARY KEY AUTOINCREMENT,parentId INTEGER,studentId INTEGER,relation TEXT DEFAULT 'Father', UNIQUE(parentId,studentId));
CREATE TABLE IF NOT EXISTS enrollments(id INTEGER PRIMARY KEY AUTOINCREMENT,studentId INTEGER,classId INTEGER,sectionId INTEGER,sessionId INTEGER,rollNo INTEGER,status TEXT DEFAULT 'ACTIVE',createdAt TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(studentId,sessionId), UNIQUE(classId,sectionId,sessionId,rollNo));
CREATE TABLE IF NOT EXISTS attendance(id INTEGER PRIMARY KEY AUTOINCREMENT,studentId INTEGER,classId INTEGER,sectionId INTEGER,date TEXT,status TEXT,note TEXT,markedBy INTEGER,createdAt TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(studentId,date));
CREATE TABLE IF NOT EXISTS audit_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,userId INTEGER,entity TEXT,entityId INTEGER,action TEXT,details TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS diary(id INTEGER PRIMARY KEY AUTOINCREMENT,classId INTEGER,sectionId INTEGER,subjectId INTEGER,date TEXT,classwork TEXT,notes TEXT,published INTEGER DEFAULT 1,createdBy INTEGER,editHistory TEXT);
CREATE TABLE IF NOT EXISTS homework(id INTEGER PRIMARY KEY AUTOINCREMENT,classId INTEGER,sectionId INTEGER,subjectId INTEGER,title TEXT,instructions TEXT,assignedDate TEXT,dueDate TEXT,published INTEGER DEFAULT 1,createdBy INTEGER);
CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY AUTOINCREMENT,schoolId INTEGER,title TEXT,body TEXT,audience TEXT DEFAULT 'ALL',published INTEGER DEFAULT 1,createdBy INTEGER,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS fee_structures(id INTEGER PRIMARY KEY AUTOINCREMENT,classId INTEGER,sessionId INTEGER,name TEXT,monthlyTuition INTEGER,admissionFee INTEGER DEFAULT 0,examFee INTEGER DEFAULT 0,transportFee INTEGER DEFAULT 0,otherFee INTEGER DEFAULT 0,effectiveFrom TEXT);
CREATE TABLE IF NOT EXISTS fee_charges(id INTEGER PRIMARY KEY AUTOINCREMENT,studentId INTEGER,month TEXT,description TEXT,amount INTEGER,discount INTEGER DEFAULT 0,fine INTEGER DEFAULT 0,status TEXT DEFAULT 'UNPAID',dueDate TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(studentId,month,description));
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY AUTOINCREMENT,chargeId INTEGER,amount INTEGER,method TEXT DEFAULT 'Cash',receiptNo TEXT UNIQUE,receivedBy INTEGER,isReversed INTEGER DEFAULT 0,reversalReason TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS exams(id INTEGER PRIMARY KEY AUTOINCREMENT,schoolId INTEGER,name TEXT,sessionId INTEGER,startDate TEXT,endDate TEXT,published INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS exam_subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,examId INTEGER,subjectId INTEGER,maxMarks INTEGER,passMarks INTEGER,examDate TEXT, UNIQUE(examId,subjectId));
CREATE TABLE IF NOT EXISTS marks(id INTEGER PRIMARY KEY AUTOINCREMENT,examId INTEGER,studentId INTEGER,subjectId INTEGER,obtained INTEGER,remarks TEXT,updatedBy INTEGER, UNIQUE(examId,studentId,subjectId));
CREATE TABLE IF NOT EXISTS staff(id INTEGER PRIMARY KEY AUTOINCREMENT,schoolId INTEGER,userId INTEGER,fullName TEXT,designation TEXT,phone TEXT,email TEXT,cnic TEXT,address TEXT,joiningDate TEXT,monthlySalary INTEGER,bankAccount TEXT,isActive INTEGER DEFAULT 1,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS salary_payments(id INTEGER PRIMARY KEY AUTOINCREMENT,staffId INTEGER,month TEXT,gross INTEGER,deductions INTEGER DEFAULT 0,net INTEGER,paidOn TEXT,method TEXT,note TEXT,receiptNo TEXT UNIQUE,recordedBy INTEGER,isReversed INTEGER DEFAULT 0,reversalReason TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(schoolId); CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date); CREATE INDEX IF NOT EXISTS idx_charges_student ON fee_charges(studentId); CREATE INDEX IF NOT EXISTS idx_salary_staff_month ON salary_payments(staffId,month);
`;
export const usePg = !!process.env.DATABASE_URL;
let sqliteDb = null, pool = null, ready = null;
export let db = null; // raw SQLite handle (null in Postgres mode); kept for backward compatibility
if (usePg) {
  const url = process.env.DATABASE_URL;
  const ssl = /supabase/.test(url) || /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined;
  pool = new pg.Pool({ connectionString: url, ssl });
  const pgDdl = DDL.replaceAll('INTEGER PRIMARY KEY AUTOINCREMENT','SERIAL PRIMARY KEY').replaceAll('DEFAULT CURRENT_TIMESTAMP',"DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS')");
  ready = pool.query(pgDdl); ready.catch(e=>console.error('Postgres schema init failed:', e.message));
} else {
  const { DatabaseSync } = await import('node:sqlite');
  const file = process.env.DATABASE_FILE || path.join(process.cwd(),'awais.db'); fs.mkdirSync(path.dirname(file),{recursive:true});
  sqliteDb = new DatabaseSync(file); db = sqliteDb;
  sqliteDb.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;' + DDL);
}
const tx = sql => { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); };
export async function q(sql, ...p) { if (pool) { await ready; const r = await pool.query(tx(sql), p); return r.rows; } return sqliteDb.prepare(sql).all(...p); }
export async function one(sql, ...p) { const rows = await q(sql, ...p); return rows[0]; }
export async function run(sql, ...p) {
  if (pool) { await ready; let s = sql; const isInsert = /^\s*INSERT/i.test(s); if (isInsert && !/RETURNING/i.test(s)) s = s.replace(/;?\s*$/, '') + ' RETURNING id'; const r = await pool.query(tx(s), p); return { changes: r.rowCount, lastInsertRowid: isInsert ? (r.rows[0]?.id ?? null) : null }; }
  return sqliteDb.prepare(sql).run(...p);
}
export { pool };

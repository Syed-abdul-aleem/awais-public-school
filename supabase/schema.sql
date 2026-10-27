-- Awais Public School — PostgreSQL / Supabase schema (auto-generated from server/src/db.js canonical DDL)
-- NOTE: You normally do NOT need to run this by hand: when DATABASE_URL is set, the server creates
-- all tables automatically on first start, and the seed fills demo data. This file is provided for
-- inspection, manual setup, or resetting a database (drop tables first if you re-run on a used DB).

CREATE TABLE IF NOT EXISTS schools(id SERIAL PRIMARY KEY,name TEXT,address TEXT,phone TEXT,email TEXT,logoUrl TEXT,createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'));

CREATE TABLE IF NOT EXISTS sessions(id SERIAL PRIMARY KEY,schoolId INTEGER,name TEXT,startDate TEXT,endDate TEXT,isCurrent INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,schoolId INTEGER,name TEXT,email TEXT UNIQUE,passwordHash TEXT,role TEXT,isActive INTEGER DEFAULT 1,phone TEXT,createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'));

CREATE TABLE IF NOT EXISTS classes(id SERIAL PRIMARY KEY,schoolId INTEGER,name TEXT,level INTEGER, UNIQUE(schoolId,name));

CREATE TABLE IF NOT EXISTS sections(id SERIAL PRIMARY KEY,classId INTEGER REFERENCES classes(id),name TEXT, UNIQUE(classId,name));

CREATE TABLE IF NOT EXISTS subjects(id SERIAL PRIMARY KEY,classId INTEGER REFERENCES classes(id),name TEXT);

CREATE TABLE IF NOT EXISTS teachers(id SERIAL PRIMARY KEY,userId INTEGER UNIQUE REFERENCES users(id),qualification TEXT,cnic TEXT,address TEXT);

CREATE TABLE IF NOT EXISTS teacher_assignments(id SERIAL PRIMARY KEY,teacherId INTEGER,subjectId INTEGER,sectionId INTEGER, UNIQUE(teacherId,subjectId,sectionId));

CREATE TABLE IF NOT EXISTS students(id SERIAL PRIMARY KEY,schoolId INTEGER,admissionNo TEXT UNIQUE,firstName TEXT,lastName TEXT,dob TEXT,gender TEXT,guardianName TEXT,guardianPhone TEXT,guardianEmail TEXT,emergencyContact TEXT,address TEXT,photoUrl TEXT,status TEXT DEFAULT 'ACTIVE',createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'));

CREATE TABLE IF NOT EXISTS parent_students(id SERIAL PRIMARY KEY,parentId INTEGER,studentId INTEGER,relation TEXT DEFAULT 'Father', UNIQUE(parentId,studentId));

CREATE TABLE IF NOT EXISTS enrollments(id SERIAL PRIMARY KEY,studentId INTEGER,classId INTEGER,sectionId INTEGER,sessionId INTEGER,rollNo INTEGER,status TEXT DEFAULT 'ACTIVE',createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'), UNIQUE(studentId,sessionId), UNIQUE(classId,sectionId,sessionId,rollNo));

CREATE TABLE IF NOT EXISTS attendance(id SERIAL PRIMARY KEY,studentId INTEGER,classId INTEGER,sectionId INTEGER,date TEXT,status TEXT,note TEXT,markedBy INTEGER,createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'), UNIQUE(studentId,date));

CREATE TABLE IF NOT EXISTS audit_logs(id SERIAL PRIMARY KEY,userId INTEGER,entity TEXT,entityId INTEGER,action TEXT,details TEXT,createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'));

CREATE TABLE IF NOT EXISTS diary(id SERIAL PRIMARY KEY,classId INTEGER,sectionId INTEGER,subjectId INTEGER,date TEXT,classwork TEXT,notes TEXT,published INTEGER DEFAULT 1,createdBy INTEGER,editHistory TEXT);

CREATE TABLE IF NOT EXISTS homework(id SERIAL PRIMARY KEY,classId INTEGER,sectionId INTEGER,subjectId INTEGER,title TEXT,instructions TEXT,assignedDate TEXT,dueDate TEXT,published INTEGER DEFAULT 1,createdBy INTEGER);

CREATE TABLE IF NOT EXISTS announcements(id SERIAL PRIMARY KEY,schoolId INTEGER,title TEXT,body TEXT,audience TEXT DEFAULT 'ALL',published INTEGER DEFAULT 1,createdBy INTEGER,createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'));

CREATE TABLE IF NOT EXISTS fee_structures(id SERIAL PRIMARY KEY,classId INTEGER,sessionId INTEGER,name TEXT,monthlyTuition INTEGER,admissionFee INTEGER DEFAULT 0,examFee INTEGER DEFAULT 0,transportFee INTEGER DEFAULT 0,otherFee INTEGER DEFAULT 0,effectiveFrom TEXT);

CREATE TABLE IF NOT EXISTS fee_charges(id SERIAL PRIMARY KEY,studentId INTEGER,month TEXT,description TEXT,amount INTEGER,discount INTEGER DEFAULT 0,fine INTEGER DEFAULT 0,status TEXT DEFAULT 'UNPAID',dueDate TEXT,createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'), UNIQUE(studentId,month,description));

CREATE TABLE IF NOT EXISTS payments(id SERIAL PRIMARY KEY,chargeId INTEGER,amount INTEGER,method TEXT DEFAULT 'Cash',receiptNo TEXT UNIQUE,receivedBy INTEGER,isReversed INTEGER DEFAULT 0,reversalReason TEXT,createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'));

CREATE TABLE IF NOT EXISTS exams(id SERIAL PRIMARY KEY,schoolId INTEGER,name TEXT,sessionId INTEGER,startDate TEXT,endDate TEXT,published INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS exam_subjects(id SERIAL PRIMARY KEY,examId INTEGER,subjectId INTEGER,maxMarks INTEGER,passMarks INTEGER,examDate TEXT, UNIQUE(examId,subjectId));

CREATE TABLE IF NOT EXISTS marks(id SERIAL PRIMARY KEY,examId INTEGER,studentId INTEGER,subjectId INTEGER,obtained INTEGER,remarks TEXT,updatedBy INTEGER, UNIQUE(examId,studentId,subjectId));

CREATE TABLE IF NOT EXISTS staff(id SERIAL PRIMARY KEY,schoolId INTEGER,userId INTEGER,fullName TEXT,designation TEXT,phone TEXT,email TEXT,cnic TEXT,address TEXT,joiningDate TEXT,monthlySalary INTEGER,bankAccount TEXT,isActive INTEGER DEFAULT 1,createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'));

CREATE TABLE IF NOT EXISTS salary_payments(id SERIAL PRIMARY KEY,staffId INTEGER,month TEXT,gross INTEGER,deductions INTEGER DEFAULT 0,net INTEGER,paidOn TEXT,method TEXT,note TEXT,receiptNo TEXT UNIQUE,recordedBy INTEGER,isReversed INTEGER DEFAULT 0,reversalReason TEXT,createdAt TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS'));

CREATE INDEX IF NOT EXISTS idx_students_school ON students(schoolId);

CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date);

CREATE INDEX IF NOT EXISTS idx_charges_student ON fee_charges(studentId);

CREATE INDEX IF NOT EXISTS idx_salary_staff_month ON salary_payments(staffId,month);

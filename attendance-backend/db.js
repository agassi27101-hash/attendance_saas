const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'attendance.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    subscription_plan TEXT DEFAULT 'trial',
    subscription_status TEXT DEFAULT 'active',
    billing_email TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('employee','hr_manager','company_admin','super_admin')),
    employee_code TEXT,
    department TEXT,
    designation TEXT,
    basic_salary REAL DEFAULT 0,
    joining_date TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, email)
  );

  CREATE TABLE IF NOT EXISTS geofence_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 150,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_zone_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    zone_id INTEGER NOT NULL REFERENCES geofence_zones(id) ON DELETE CASCADE,
    UNIQUE(user_id, zone_id)
  );

  CREATE TABLE IF NOT EXISTS attendance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    zone_id INTEGER REFERENCES geofence_zones(id),
    date TEXT NOT NULL,
    mark_in_time TEXT,
    mark_in_lat REAL,
    mark_in_lng REAL,
    mark_out_time TEXT,
    mark_out_lat REAL,
    mark_out_lng REAL,
    total_hours REAL,
    status TEXT DEFAULT 'present' CHECK(status IN ('present','late','half_day','absent')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS payroll_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    standard_hours_per_day REAL DEFAULT 8,
    late_threshold_minutes INTEGER DEFAULT 15,
    half_day_threshold_hours REAL DEFAULT 4,
    overtime_rate_multiplier REAL DEFAULT 1.5,
    pay_cycle_start_day INTEGER DEFAULT 1,
    expected_start_time TEXT DEFAULT '09:30',
    currency TEXT DEFAULT 'INR'
  );

  CREATE TABLE IF NOT EXISTS payslips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    basic_salary REAL,
    total_working_days INTEGER,
    days_present INTEGER,
    total_hours_worked REAL,
    overtime_hours REAL,
    deductions REAL,
    net_pay REAL,
    pdf_path TEXT,
    status TEXT DEFAULT 'finalized',
    generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month, year)
  );

  CREATE INDEX IF NOT EXISTS idx_attendance_company_date ON attendance_logs(company_id, date);
`);

// --- Seed demo data if empty ---
const companyCount = db.prepare('SELECT COUNT(*) as c FROM companies').get().c;
if (companyCount === 0) {
  const insertCompany = db.prepare(
    `INSERT INTO companies (name, subdomain, billing_email) VALUES (?, ?, ?)`
  );
  const companyId = insertCompany.run('Acme Retail Pvt Ltd', 'acme', 'hr@acme.example').lastInsertRowid;

  db.prepare(
    `INSERT INTO payroll_settings (company_id) VALUES (?)`
  ).run(companyId);

  const passwordHash = bcrypt.hashSync('password123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (company_id, name, email, phone, password_hash, role, employee_code, department, designation, basic_salary, joining_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const hrId = insertUser.run(
    companyId, 'Priya HR', 'hr@acme.example', '9000000001', passwordHash,
    'hr_manager', 'EMP-000', 'Human Resources', 'HR Manager', 60000, '2023-01-10'
  ).lastInsertRowid;

  const empId = insertUser.run(
    companyId, 'Ravi Kumar', 'ravi@acme.example', '9000000002', passwordHash,
    'employee', 'EMP-101', 'Operations', 'Executive', 35000, '2024-03-01'
  ).lastInsertRowid;

  // Demo zone: Chennai coordinates (T Nagar area), 150m radius
  const zoneId = db.prepare(`
    INSERT INTO geofence_zones (company_id, name, address, latitude, longitude, radius_meters)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(companyId, 'Chennai HQ', 'T Nagar, Chennai', 13.0418, 80.2341, 150).lastInsertRowid;

  db.prepare(`INSERT INTO user_zone_assignments (user_id, zone_id) VALUES (?, ?)`).run(empId, zoneId);
  db.prepare(`INSERT INTO user_zone_assignments (user_id, zone_id) VALUES (?, ?)`).run(hrId, zoneId);

  console.log('Seeded demo data:');
  console.log('  Company:', companyId, '| Zone:', zoneId);
  console.log('  HR login:  hr@acme.example / password123');
  console.log('  Employee login: ravi@acme.example / password123');
  console.log('  Zone center: 13.0418, 80.2341 (radius 150m)');
}

module.exports = db;

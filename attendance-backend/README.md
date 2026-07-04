# Attendance SaaS — Backend (tested & working)

## Run it
```
npm install
node server.js
```
Server starts on http://localhost:3001 and auto-creates a SQLite database at
`data/attendance.db` with demo data on first run:

- HR login:       hr@acme.example / password123
- Employee login: ravi@acme.example / password123
- Demo geofence:  Chennai HQ, 13.0418, 80.2341, 150m radius

## What's implemented and verified working end-to-end
- JWT auth with company-scoped, role-based access (employee / hr_manager / company_admin)
- Geofenced mark-in / mark-out (Haversine distance check against assigned zones) —
  tested to correctly accept a mark-in from inside the zone and reject one ~9km away
- Duplicate mark-in/out prevention
- Employee CRUD, geofence zone CRUD, zone assignment
- Company-wide attendance logs + monthly summary for HR
- Role-based access control — confirmed employees get a 403 on HR-only endpoints
- Payroll settings (standard hours, late threshold, overtime multiplier, etc.)
- Payslip generation (prorated pay + overtime) with a real PDF via pdfkit —
  tested end to end: generate → list → download → valid PDF file confirmed on disk

## Why Node.js instead of the originally planned Laravel/PHP
Laravel needs `composer` to pull packages from packagist.org, which isn't reachable
from the sandbox this was built in — so PHP/Laravel code couldn't actually be run or
tested there. Node's built-in `node:sqlite` module needed no native compilation,
which let this get built and verified for real rather than handed over untested.
If you'd still rather ship on PHP/Laravel (matches your NetWatch Pro and ticketing
system experience more closely), this backend is a faithful reference implementation —
the schema, routes, and business logic translate directly; only the syntax changes.

## Not yet built (see the original build prompts for full scope)
- Scheduled job to mark employees absent when they never mark in (currently, a day
  with no mark-in simply has no row — the monthly summary undercounts "absent" as a
  distinct status until this job exists)
- Leave management, holiday calendar
- Subscription billing
- Per-tenant separate databases (currently one shared DB scoped by `company_id`)

## Folder structure
```
server.js              entry point
db.js                  schema + seed data
middleware/auth.js     JWT verification + role checks
services/geofence.js   Haversine distance + zone matching
routes/auth.js
routes/employees.js
routes/zones.js
routes/attendance.js
routes/payroll.js      settings, payslip generation, PDF download
```

## API endpoints
```
POST   /api/auth/login

POST   /api/attendance/mark-in         { latitude, longitude }
POST   /api/attendance/mark-out        { latitude, longitude }
GET    /api/attendance/my-logs         ?month=&year=
GET    /api/attendance/company-logs    ?date=&department=      (HR only)
GET    /api/attendance/monthly-summary ?month=&year=            (HR only)

GET    /api/employees                                            (HR only)
POST   /api/employees                                             (HR only)
PUT    /api/employees/:id                                         (HR only)
DELETE /api/employees/:id                                         (HR only)

GET    /api/zones
POST   /api/zones                                                  (HR only)
PUT    /api/zones/:id                                              (HR only)
DELETE /api/zones/:id                                              (HR only)
POST   /api/zones/:id/assign          { user_id }                  (HR only)

GET    /api/payroll/settings                                       (HR only)
PUT    /api/payroll/settings                                       (HR only)
POST   /api/payroll/generate          { month, year }               (HR only)
GET    /api/payroll/payslips/my-payslips
GET    /api/payroll/payslips/company                                (HR only)
GET    /api/payroll/payslips/:id/download
```

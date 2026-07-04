# Build prompt: Attendance SaaS — Laravel backend

Paste this into Antigravity IDE / Claude Code as the starting prompt. It scaffolds the backend only (mobile app and HR web dashboard are separate prompts once the API is working).

---

## Project overview

Build a Laravel 11 REST API backend for a multi-tenant attendance SaaS product. Companies sign up, define geofenced office locations, add employees, and employees mark attendance in/out only when physically inside an assigned geofence zone. The system computes monthly working hours and generates downloadable payslips.

## Tech stack

- Laravel 11, PHP 8.3
- MySQL 8
- Laravel Sanctum for API authentication (token-based, mobile + web clients)
- `stancl/tenancy` package for multi-tenant data isolation (single database, shared schema, `company_id` scoping approach — not separate databases per tenant)
- `barryvdh/laravel-dompdf` for payslip PDF generation
- Laravel's built-in queue + scheduler for monthly payroll runs

## Database schema

Create migrations for the following tables. Use foreign keys with cascading deletes where a child record is meaningless without its parent (e.g. `attendance_logs` without `users`).

```
companies
  id, name, subdomain (unique), subscription_plan, subscription_status,
  billing_email, timestamps

users
  id, company_id (FK), name, email (unique per company), phone,
  password (hashed), role (enum: employee, hr_manager, company_admin, super_admin),
  employee_code, department, designation, basic_salary,
  joining_date, status (enum: active, inactive), timestamps

geofence_zones
  id, company_id (FK), name, address,
  latitude (decimal 10,7), longitude (decimal 10,7), radius_meters (int),
  timestamps

user_zone_assignments
  id, user_id (FK), zone_id (FK), timestamps

attendance_logs
  id, user_id (FK), company_id (FK), zone_id (FK),
  date,
  mark_in_time (datetime, nullable), mark_in_lat, mark_in_lng,
  mark_out_time (datetime, nullable), mark_out_lat, mark_out_lng,
  total_hours (decimal, nullable, computed on mark-out),
  status (enum: present, late, half_day, absent),
  timestamps

payroll_settings
  id, company_id (FK),
  standard_hours_per_day (decimal, default 8),
  late_threshold_minutes (int, default 15),
  half_day_threshold_hours (decimal, default 4),
  overtime_rate_multiplier (decimal, default 1.5),
  pay_cycle_start_day (int, default 1),
  currency (default 'INR'),
  timestamps

payslips
  id, user_id (FK), company_id (FK), month (int), year (int),
  basic_salary, total_working_days, days_present,
  total_hours_worked, overtime_hours, deductions, net_pay,
  pdf_path (nullable), status (enum: draft, finalized),
  generated_at (nullable), timestamps
```

Add appropriate indexes: `(company_id, date)` on `attendance_logs`, `(company_id, email)` unique on `users`, `(user_id, month, year)` unique on `payslips`.

## Core business logic

### 1. Geofence validation (critical — this is the whole point of the app)

On both mark-in and mark-out, the API must:
1. Receive the employee's current `latitude` and `longitude` from the mobile app.
2. Look up the geofence zones assigned to that employee (`user_zone_assignments`).
3. Calculate the distance between the submitted coordinates and each assigned zone's center using the Haversine formula.
4. If the distance is within the zone's `radius_meters` for at least one assigned zone, allow the action and record which `zone_id` matched.
5. If not, reject with a clear error (`"You are outside your assigned work zone"`) — do not create or update the attendance record.

Implement Haversine as a small helper/service class (`app/Services/GeofenceService.php`), not inline in the controller — it will be reused and unit tested.

### 2. Attendance status logic

On mark-in, compare `mark_in_time` against the employee's expected start time (assume a fixed company-wide start time in `payroll_settings` for MVP — add per-employee shifts later) plus `late_threshold_minutes` to set status `present` or `late`.

On mark-out, compute `total_hours` from `mark_in_time` to `mark_out_time`. If `total_hours` is below `half_day_threshold_hours`, set status to `half_day`.

A daily scheduled job should mark any employee with no `mark_in_time` for the previous day as `absent` (skip weekends/holidays — holidays table can be a stretch goal, hardcode weekend skip for MVP).

### 3. Payroll calculation

Monthly payslip generation (triggered manually by HR from the dashboard, or via scheduled job on `pay_cycle_start_day`):
1. Sum `days_present`, `total_hours_worked` from `attendance_logs` for the month.
2. Calculate `overtime_hours` = hours worked beyond `standard_hours_per_day × working_days`.
3. Calculate `net_pay` = `basic_salary` prorated by `days_present / total_working_days`, plus overtime pay at `overtime_rate_multiplier`.
4. Generate a PDF via dompdf, store in `storage/app/payslips/{company_id}/{user_id}/{year}-{month}.pdf`, save path to `payslips.pdf_path`.

## API endpoints

```
POST   /api/auth/login
POST   /api/auth/logout

# Employee-facing (role: employee)
POST   /api/attendance/mark-in       { latitude, longitude }
POST   /api/attendance/mark-out      { latitude, longitude }
GET    /api/attendance/my-logs       ?month=&year=
GET    /api/payslips/my-payslips
GET    /api/payslips/{id}/download

# HR/admin-facing (role: hr_manager, company_admin)
GET    /api/employees
POST   /api/employees
PUT    /api/employees/{id}
DELETE /api/employees/{id}

GET    /api/zones
POST   /api/zones
PUT    /api/zones/{id}
DELETE /api/zones/{id}
POST   /api/zones/{id}/assign        { user_id }

GET    /api/attendance/company-logs  ?date=&department=
GET    /api/attendance/monthly-summary  ?month=&year=  (per-employee totals: days present, total hours, in/out times)

POST   /api/payroll/generate         { month, year }  (bulk-generates payslips for all active employees)
GET    /api/payroll/settings
PUT    /api/payroll/settings
```

All endpoints except `/auth/login` require Sanctum auth. All queries must scope by the authenticated user's `company_id` — never trust a `company_id` passed in the request body.

## Multi-tenancy setup

Use `stancl/tenancy`'s single-database mode with a global scope that auto-filters every tenant-aware model by the authenticated user's `company_id`. Apply this via a `BelongsToCompany` trait on `User`, `GeofenceZone`, `AttendanceLog`, `PayrollSetting`, and `Payslip` models — do not rely on manually adding `where('company_id', ...)` in every controller method, since one missed line is a cross-tenant data leak.

## What NOT to build yet

- Shift scheduling (assume one fixed shift per company for now)
- Leave management
- SMS/push notifications
- Subscription billing integration
- Holiday calendars (hardcode weekend-only skip)

Keep the scope to what's listed above. Confirm the migrations and model relationships with me before writing controller logic.

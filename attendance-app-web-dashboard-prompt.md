# Build prompt: Attendance SaaS — HR web dashboard

Paste this into Antigravity IDE / Claude Code once the Laravel backend from `attendance-app-backend-prompt.md` is running. This builds the HR-facing web app only.

---

## Project overview

Build a React (Vite) web dashboard for HR managers and company admins to manage employees, define geofenced office zones, review attendance, and generate/download payslips. This is an operational tool used daily, not a marketing site — prioritize data clarity and speed over decoration.

## Design direction

Avoid the generic admin-panel look (default Bootstrap blue, cookie-cutter sidebar). Use this token system:

**Color**
- `--ink` #1B2430 — primary text, dark surfaces
- `--slate` #445064 — secondary text, muted labels
- `--mist` #F3F5F7 — page background (cool off-white, not cream)
- `--teal` #0F6E56 — primary action color, active nav, present/on-time status
- `--amber` #C97A2B — late/warning status
- `--coral` #B4432F — absent/error status
- White (#FFFFFF) for card surfaces

**Type**
- Headings: Space Grotesk (slightly technical, geometric — fits an operational tracking tool)
- Body and tables: Inter (high readability at small sizes for data-dense screens)
- Timestamps, hours, and numeric data: IBM Plex Mono (reinforces precision — every clock-in/out time and hours total uses this)

**Layout**
- Persistent left sidebar (fixed width 240px): logo, nav links (Dashboard, Employees, Zones, Attendance, Payroll, Settings)
- Top bar: company name/context, current HR manager's name, logout
- Main content: cards and tables on the `--mist` background, white card surfaces with 1px `--slate` borders at low opacity, no heavy shadows

**Signature element**: on the main Dashboard screen, a horizontal "today's attendance" strip — one small dot per employee, filling from outline to solid `--teal` as each employee clocks in through the day, `--amber` if late, `--coral` if absent by end of day. This directly visualizes the geofence check-in that's the product's core mechanic, rather than a generic stat card.

Respect reduced-motion. Keep interactions functional: hover states on rows, no decorative animation.

## Tech stack

- React 18 + Vite
- React Router for navigation
- Axios for API calls (Sanctum bearer token auth, store token in memory + httpOnly cookie refresh if backend supports it — otherwise localStorage with clear expiry handling)
- Leaflet (or Google Maps JS API if you have a key) for the geofence zone map editor
- Recharts for the monthly hours/attendance charts
- date-fns for date handling

## Pages

### 1. Login
Email + password, calls `POST /api/auth/login`, stores token, redirects to Dashboard.

### 2. Dashboard (landing page)
- Today's attendance strip (signature element, described above)
- Summary cards: employees present today, late today, absent today, total active employees
- Recent activity list: last 10 mark-in/mark-out events across the company

### 3. Employees
- Table: name, employee code, department, designation, status, assigned zone(s)
- Add/edit employee modal: name, email, phone, department, designation, basic salary, joining date, assign to one or more geofence zones
- Deactivate employee (soft delete via `status`)

### 4. Zones
- Map view (Leaflet) showing all geofence zones as circles
- Click map to place a new zone, drag to adjust, set radius via a slider (draws the circle live)
- List view: zone name, address, radius, employee count assigned
- Edit/delete zone

### 5. Attendance
- Filterable table: date range, department, employee — columns: employee, date, mark-in time, mark-in zone, mark-out time, mark-out zone, total hours, status
- Status shown as a colored pill (teal/amber/coral matching the token system)
- Export to CSV button

### 6. Monthly summary
- Per-employee table: total working days, days present, total hours, overtime hours — for a selected month/year
- Bar chart (Recharts): attendance rate by department

### 7. Payroll
- Payroll settings form: standard hours/day, late threshold, half-day threshold, overtime multiplier, pay cycle start day
- "Generate payslips" button for a selected month — calls `POST /api/payroll/generate`, shows progress/result
- Payslip list: employee, month, net pay, status (draft/finalized), download PDF button

### 8. Settings
- Company profile (name, subdomain — read-only for MVP)
- HR manager account management (invite additional HR users)

## API integration notes

Match every call to the endpoints defined in the backend prompt. All requests need the `Authorization: Bearer {token}` header. Handle 401s globally (redirect to login) via an Axios interceptor. Handle 403s (wrong role trying to access an HR-only page) by redirecting to Dashboard with a toast message.

## What NOT to build yet

- Company sign-up/onboarding flow (assume company + first HR admin are seeded manually for MVP)
- Billing/subscription UI
- Multi-language support
- Dark mode

Confirm the component structure and routing plan with me before writing full page implementations.

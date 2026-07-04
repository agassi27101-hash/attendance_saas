# Build prompt: Attendance SaaS — employee mobile app

Paste this into Antigravity IDE / Claude Code once the Laravel backend from `attendance-app-backend-prompt.md` is running. This builds the employee-facing mobile app only (iOS + Android from one codebase).

---

## Project overview

Build a React Native (Expo) mobile app for employees to mark attendance in/out — allowed only when physically inside their assigned geofence zone — and to view their attendance history and download payslips. This is used daily by non-technical employees, so the core flow must be a single obvious action, not a menu to navigate.

## Design direction

Same token system as the HR web dashboard, for brand consistency across the product:

**Color**
- `--ink` #1B2430 — primary text
- `--slate` #445064 — secondary text
- `--mist` #F3F5F7 — background
- `--teal` #0F6E56 — primary action, in-zone/success state
- `--amber` #C97A2B — late/warning state
- `--coral` #B4432F — out-of-zone/error state

**Type**: Space Grotesk for headings, Inter for body, IBM Plex Mono for the live clock and time displays.

**Signature element**: the home screen's mark in/out button is a large circular button that visually reflects geofence status in real time — solid `--teal` ring when inside an assigned zone ("You're at [Zone name] — tap to mark in"), `--coral` outline with reduced opacity when outside any zone ("Move closer to your assigned zone to mark in"), so the geofence check is felt, not just enforced after a failed tap.

## Tech stack

- React Native + Expo (managed workflow, EAS Build for store submission)
- `expo-location` for foreground and background location, with geofencing region monitoring
- Expo Router for navigation
- Axios for API calls, same Sanctum bearer-token auth as the web dashboard
- `expo-secure-store` for storing the auth token (not AsyncStorage — token is sensitive)
- `react-native-svg` if custom ring/progress graphics are needed for the mark-in button

## Core flow: location permissions

This is the part most likely to go wrong, so build it deliberately:

1. On first launch, explain in plain language *why* location access is needed before the OS prompt appears: "We check your location only when you tap mark in or mark out, to confirm you're at your work location." Do not request background/"Always" permission on first launch — start with "When in Use."
2. Only request "Always" (background) permission if/when the company's plan requires background geofence reminders (stretch goal, not MVP) — for MVP, foreground-only location captured at the moment of tapping mark in/out is sufficient and avoids the harder App Store review path.
3. Handle permission denial gracefully: show a clear screen explaining mark-in/out won't work without location access, with a button that deep-links to the device's app settings.
4. On Android, handle the separate "precise location" permission (Android 12+) — request precise, not just approximate.

## Screens

### 1. Login
Email + password, calls `POST /api/auth/login`, stores token in `expo-secure-store`.

### 2. Home (mark in/out)
- Large circular action button (signature element described above), state reflects current geofence status
- On tap: get current location via `expo-location`, call `POST /api/attendance/mark-in` or `mark-out` depending on today's state
- Show today's status below the button: mark-in time, elapsed hours (live-updating, mono font), mark-out time once marked out
- If the API rejects for being outside the zone, show the coral error state with the message from the backend — don't let the app guess distance client-side, the backend is the source of truth

### 3. My attendance
- Calendar or list view, month picker
- Each day: mark-in time, mark-out time, total hours, status pill (present/late/half-day/absent)

### 4. Payslips
- List of past payslips: month/year, net pay, status
- Tap to download PDF (use `expo-file-system` to download, then `expo-sharing` to let the employee open/share it)

### 5. Profile
- Name, employee code, department, assigned zone(s) with a small map preview
- Logout

## API integration notes

Match calls to the endpoints in the backend prompt. Handle network failures gracefully — if mark-in/out fails due to no connectivity, show a clear retry state; do not silently fail or fake a success (attendance data has payroll consequences).

## What NOT to build yet

- Background geofence push notifications
- Offline queueing of mark-in/out (requires careful design to avoid falsified timestamps — explicitly deferred)
- Leave requests
- Multi-language support

Confirm the navigation structure and permission-request flow with me before writing full screen implementations.

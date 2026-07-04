const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { findMatchingZone } = require('../services/geofence');
const { extractFaceRatios, verifyBiometrics } = require('../services/biometrics');

const router = express.Router();
router.use(requireAuth);

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getAssignedZones(userId) {
  return db
    .prepare(
      `SELECT z.* FROM geofence_zones z
       JOIN user_zone_assignments uza ON uza.zone_id = z.id
       WHERE uza.user_id = ?`
    )
    .all(userId);
}

async function verifyFaceBiometrics(userId, base64Image) {
  const user = db.prepare(`SELECT face_registered, face_template FROM users WHERE id = ?`).get(userId);
  if (!user || !user.face_registered) {
    return; // Bypass check if face not registered yet
  }
  if (!base64Image) {
    throw new Error('Biometric verification failed. Face image scan is required.');
  }
  const currentRatios = await extractFaceRatios(base64Image);
  if (!user.face_template) {
    throw new Error('No registered face template found for this employee.');
  }
  const registeredRatios = user.face_template.split(',').map(Number);
  const match = verifyBiometrics(registeredRatios, currentRatios, 0.15); // 15% tolerance
  if (!match) {
    throw new Error('Biometric verification failed. Face profile does not match.');
  }
}

// --- MARK IN ---
router.post('/mark-in', async (req, res) => {
  const { latitude, longitude, image } = req.body;
  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  const userId = req.user.userId;
  const date = todayStr();

  // 1. Perform biometric face verification first
  try {
    await verifyFaceBiometrics(userId, image);
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }

  const already = db.prepare(`SELECT * FROM attendance_logs WHERE user_id = ? AND date = ?`).get(userId, date);
  if (already && already.mark_in_time) {
    return res.status(409).json({ error: 'You have already marked in today', log: already });
  }

  const zones = getAssignedZones(userId);
  if (zones.length === 0) {
    return res.status(400).json({ error: 'You have no assigned work zone. Contact HR.' });
  }

  const match = findMatchingZone(latitude, longitude, zones);
  if (!match) {
    return res.status(403).json({ error: 'You are outside your assigned work zone. Move closer and try again.' });
  }

  const settings = db.prepare(`SELECT * FROM payroll_settings WHERE company_id = ?`).get(req.user.companyId);
  const now = new Date();
  const nowTime = now.toTimeString().slice(0, 5); // HH:MM

  const [expH, expM] = (settings?.expected_start_time || '09:30').split(':').map(Number);
  const expectedMinutes = expH * 60 + expM + (settings?.late_threshold_minutes || 15);
  const actualMinutes = now.getHours() * 60 + now.getMinutes();
  const status = actualMinutes > expectedMinutes ? 'late' : 'present';

  db.prepare(
    `INSERT INTO attendance_logs (user_id, company_id, zone_id, date, mark_in_time, mark_in_lat, mark_in_lng, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, req.user.companyId, match.zone.id, date, now.toISOString(), latitude, longitude, status);

  const log = db.prepare(`SELECT * FROM attendance_logs WHERE user_id = ? AND date = ?`).get(userId, date);
  res.status(201).json({ message: `Marked in at ${match.zone.name}`, log });
});

// --- MARK OUT ---
router.post('/mark-out', async (req, res) => {
  const { latitude, longitude, image } = req.body;
  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  const userId = req.user.userId;
  const date = todayStr();

  // 1. Perform biometric face verification first
  try {
    await verifyFaceBiometrics(userId, image);
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }

  const log = db.prepare(`SELECT * FROM attendance_logs WHERE user_id = ? AND date = ?`).get(userId, date);
  if (!log || !log.mark_in_time) {
    return res.status(400).json({ error: 'You have not marked in today' });
  }
  if (log.mark_out_time) {
    return res.status(409).json({ error: 'You have already marked out today', log });
  }

  const zones = getAssignedZones(userId);
  const match = findMatchingZone(latitude, longitude, zones);
  if (!match) {
    return res.status(403).json({ error: 'You are outside your assigned work zone. Move closer and try again.' });
  }

  const markInTime = new Date(log.mark_in_time);
  const markOutTime = new Date();
  const totalHours = Math.round(((markOutTime - markInTime) / 3600000) * 100) / 100;

  const settings = db.prepare(`SELECT * FROM payroll_settings WHERE company_id = ?`).get(req.user.companyId);
  let status = log.status;
  if (totalHours < (settings?.half_day_threshold_hours || 4)) {
    status = 'half_day';
  }

  db.prepare(
    `UPDATE attendance_logs SET mark_out_time = ?, mark_out_lat = ?, mark_out_lng = ?, total_hours = ?, status = ?
     WHERE id = ?`
  ).run(markOutTime.toISOString(), latitude, longitude, totalHours, status, log.id);

  const updated = db.prepare(`SELECT * FROM attendance_logs WHERE id = ?`).get(log.id);
  res.json({ message: `Marked out at ${match.zone.name}. Total hours: ${totalHours}`, log: updated });
});

// --- My logs (employee) ---
router.get('/my-logs', (req, res) => {
  const { month, year } = req.query;
  const y = year || new Date().getFullYear();
  const m = String(month || new Date().getMonth() + 1).padStart(2, '0');
  const prefix = `${y}-${m}`;

  const logs = db
    .prepare(`SELECT * FROM attendance_logs WHERE user_id = ? AND date LIKE ? ORDER BY date DESC`)
    .all(req.user.userId, `${prefix}%`);
  res.json(logs);
});

// --- Company-wide logs (HR) ---
router.get('/company-logs', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const { date, department } = req.query;

  let query = `
    SELECT al.*, u.name as employee_name, u.department, z.name as zone_name
    FROM attendance_logs al
    JOIN users u ON u.id = al.user_id
    LEFT JOIN geofence_zones z ON z.id = al.zone_id
    WHERE al.company_id = ?
  `;
  const params = [req.user.companyId];

  if (date) {
    query += ` AND al.date = ?`;
    params.push(date);
  }
  if (department) {
    query += ` AND u.department = ?`;
    params.push(department);
  }
  query += ` ORDER BY al.date DESC, u.name`;

  res.json(db.prepare(query).all(...params));
});

// --- Monthly summary (HR) ---
router.get('/monthly-summary', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const { month, year } = req.query;
  const y = year || new Date().getFullYear();
  const m = String(month || new Date().getMonth() + 1).padStart(2, '0');
  const prefix = `${y}-${m}`;

  const summary = db
    .prepare(
      `SELECT u.id as user_id, u.name, u.department,
              COUNT(al.id) as days_present,
              SUM(al.total_hours) as total_hours,
              MIN(al.mark_in_time) as first_in,
              MAX(al.mark_out_time) as last_out
       FROM users u
       LEFT JOIN attendance_logs al ON al.user_id = u.id AND al.date LIKE ?
       WHERE u.company_id = ? AND u.role = 'employee' AND u.status = 'active'
       GROUP BY u.id
       ORDER BY u.name`
    )
    .all(`${prefix}%`, req.user.companyId);

  res.json(summary);
});

module.exports = router;

const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// List zones for the authenticated user's company
router.get('/', (req, res) => {
  const zones = db
    .prepare(`SELECT * FROM geofence_zones WHERE company_id = ? ORDER BY name`)
    .all(req.user.companyId);
  res.json(zones);
});

// List assigned zones for the logged-in employee
router.get('/my-zones', (req, res) => {
  const zones = db
    .prepare(
      `SELECT z.* FROM geofence_zones z
       JOIN user_zone_assignments uza ON uza.zone_id = z.id
       WHERE uza.user_id = ?`
    )
    .all(req.user.userId);
  res.json(zones);
});

// Create zone (HR/admin only)
router.post('/', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const { name, address, latitude, longitude, radius_meters } = req.body;
  if (!name || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'name, latitude, and longitude are required' });
  }

  const result = db
    .prepare(
      `INSERT INTO geofence_zones (company_id, name, address, latitude, longitude, radius_meters)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.companyId, name, address || null, latitude, longitude, radius_meters || 150);

  const zone = db.prepare(`SELECT * FROM geofence_zones WHERE id = ?`).get(result.lastInsertRowid);
  res.status(201).json(zone);
});

// Update zone
router.put('/:id', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const { name, address, latitude, longitude, radius_meters } = req.body;

  const existing = db
    .prepare(`SELECT * FROM geofence_zones WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.companyId);
  if (!existing) return res.status(404).json({ error: 'Zone not found' });

  db.prepare(
    `UPDATE geofence_zones SET name = ?, address = ?, latitude = ?, longitude = ?, radius_meters = ? WHERE id = ?`
  ).run(
    name ?? existing.name,
    address ?? existing.address,
    latitude ?? existing.latitude,
    longitude ?? existing.longitude,
    radius_meters ?? existing.radius_meters,
    existing.id
  );

  res.json(db.prepare(`SELECT * FROM geofence_zones WHERE id = ?`).get(existing.id));
});

// Delete zone
router.delete('/:id', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const existing = db
    .prepare(`SELECT * FROM geofence_zones WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.companyId);
  if (!existing) return res.status(404).json({ error: 'Zone not found' });

  db.prepare(`DELETE FROM geofence_zones WHERE id = ?`).run(existing.id);
  res.json({ success: true });
});

// Assign an employee to a zone
router.post('/:id/assign', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const { user_id } = req.body;
  const zone = db
    .prepare(`SELECT * FROM geofence_zones WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.companyId);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  const employee = db
    .prepare(`SELECT * FROM users WHERE id = ? AND company_id = ?`)
    .get(user_id, req.user.companyId);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  try {
    db.prepare(`INSERT INTO user_zone_assignments (user_id, zone_id) VALUES (?, ?)`).run(user_id, zone.id);
  } catch (e) {
    // unique constraint = already assigned, treat as idempotent success
  }

  res.json({ success: true });
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('hr_manager', 'company_admin'));

// List employees with their assigned zone names and IDs
router.get('/', (req, res) => {
  const employees = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.employee_code, u.department,
              u.designation, u.basic_salary, u.joining_date, u.status,
              GROUP_CONCAT(z.name, ', ') as zones,
              GROUP_CONCAT(z.id, ',') as zone_ids
       FROM users u
       LEFT JOIN user_zone_assignments uza ON uza.user_id = u.id
       LEFT JOIN geofence_zones z ON z.id = uza.zone_id
       WHERE u.company_id = ?
       GROUP BY u.id
       ORDER BY u.name`
    )
    .all(req.user.companyId);
  res.json(employees);
});

// Create employee
router.post('/', (req, res) => {
  const {
    name, email, phone, password, role, employee_code,
    department, designation, basic_salary, joining_date, zone_ids,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    const result = db
      .prepare(
        `INSERT INTO users (company_id, name, email, phone, password_hash, role, employee_code,
                             department, designation, basic_salary, joining_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.companyId, name, email, phone || null, passwordHash,
        role || 'employee', employee_code || null, department || null,
        designation || null, basic_salary || 0, joining_date || null
      );

    const userId = result.lastInsertRowid;

    if (Array.isArray(zone_ids)) {
      const assignStmt = db.prepare(`INSERT INTO user_zone_assignments (user_id, zone_id) VALUES (?, ?)`);
      for (const zoneId of zone_ids) {
        assignStmt.run(userId, zoneId);
      }
    }

    const employee = db.prepare(`SELECT id, name, email, role, employee_code FROM users WHERE id = ?`).get(userId);
    res.status(201).json(employee);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'An employee with this email already exists' });
    }
    throw e;
  }
});

// Update employee
router.put('/:id', (req, res) => {
  const existing = db
    .prepare(`SELECT * FROM users WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.companyId);
  if (!existing) return res.status(404).json({ error: 'Employee not found' });

  const {
    name, phone, department, designation, basic_salary, status, zone_ids,
  } = req.body;

  db.prepare(
    `UPDATE users SET name = ?, phone = ?, department = ?, designation = ?, basic_salary = ?, status = ?
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    phone ?? existing.phone,
    department ?? existing.department,
    designation ?? existing.designation,
    basic_salary ?? existing.basic_salary,
    status ?? existing.status,
    existing.id
  );

  if (Array.isArray(zone_ids)) {
    // Clear previous assignments
    db.prepare(`DELETE FROM user_zone_assignments WHERE user_id = ?`).run(existing.id);
    
    // Insert new zone assignments
    const assignStmt = db.prepare(`INSERT INTO user_zone_assignments (user_id, zone_id) VALUES (?, ?)`);
    for (const zoneId of zone_ids) {
      assignStmt.run(existing.id, zoneId);
    }
  }

  res.json(db.prepare(`SELECT id, name, email, role, status FROM users WHERE id = ?`).get(existing.id));
});

// Deactivate (soft delete)
router.delete('/:id', (req, res) => {
  const existing = db
    .prepare(`SELECT * FROM users WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.companyId);
  if (!existing) return res.status(404).json({ error: 'Employee not found' });

  db.prepare(`UPDATE users SET status = 'inactive' WHERE id = ?`).run(existing.id);
  res.json({ success: true });
});

module.exports = router;

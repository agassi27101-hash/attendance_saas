const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE email = ? AND status = 'active'`).get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { userId: user.id, companyId: user.company_id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      employeeCode: user.employee_code,
      department: user.department,
    },
  });
});

// Get current user profile details
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id, company_id, name, email, phone, role, employee_code, department, designation, basic_salary, joining_date, status
    FROM users
    WHERE id = ?
  `).get(req.user.userId);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;

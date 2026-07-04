const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// --- Get/update payroll settings (HR) ---
router.get('/settings', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const settings = db.prepare(`SELECT * FROM payroll_settings WHERE company_id = ?`).get(req.user.companyId);
  res.json(settings);
});

router.put('/settings', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const existing = db.prepare(`SELECT * FROM payroll_settings WHERE company_id = ?`).get(req.user.companyId);
  const {
    standard_hours_per_day, late_threshold_minutes, half_day_threshold_hours,
    overtime_rate_multiplier, pay_cycle_start_day, expected_start_time, currency,
  } = req.body;

  db.prepare(
    `UPDATE payroll_settings SET standard_hours_per_day = ?, late_threshold_minutes = ?,
     half_day_threshold_hours = ?, overtime_rate_multiplier = ?, pay_cycle_start_day = ?,
     expected_start_time = ?, currency = ? WHERE company_id = ?`
  ).run(
    standard_hours_per_day ?? existing.standard_hours_per_day,
    late_threshold_minutes ?? existing.late_threshold_minutes,
    half_day_threshold_hours ?? existing.half_day_threshold_hours,
    overtime_rate_multiplier ?? existing.overtime_rate_multiplier,
    pay_cycle_start_day ?? existing.pay_cycle_start_day,
    expected_start_time ?? existing.expected_start_time,
    currency ?? existing.currency,
    req.user.companyId
  );

  res.json(db.prepare(`SELECT * FROM payroll_settings WHERE company_id = ?`).get(req.user.companyId));
});

function workingDaysInMonth(year, month) {
  // Counts Mon-Sat as working days, Sunday off (adjust per company later)
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0) count++;
  }
  return count;
}

// --- Generate payslips for all active employees for a month (HR) ---
router.post('/generate', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const { month, year } = req.body;
  if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

  const settings = db.prepare(`SELECT * FROM payroll_settings WHERE company_id = ?`).get(req.user.companyId);
  const employees = db
    .prepare(`SELECT * FROM users WHERE company_id = ? AND role = 'employee' AND status = 'active'`)
    .all(req.user.companyId);

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const totalWorkingDays = workingDaysInMonth(year, month);
  const results = [];

  const pdfDir = path.join(__dirname, '..', 'data', 'payslips', String(req.user.companyId));
  fs.mkdirSync(pdfDir, { recursive: true });

  for (const emp of employees) {
    const logs = db
      .prepare(`SELECT * FROM attendance_logs WHERE user_id = ? AND date LIKE ?`)
      .all(emp.id, `${prefix}%`);

    const daysPresent = logs.filter((l) => l.mark_in_time).length;
    const totalHours = logs.reduce((sum, l) => sum + (l.total_hours || 0), 0);
    const expectedHours = totalWorkingDays * settings.standard_hours_per_day;
    const overtimeHours = Math.max(0, totalHours - expectedHours);

    const proratedBase = (emp.basic_salary * daysPresent) / totalWorkingDays;
    const overtimePay = overtimeHours * (emp.basic_salary / expectedHours) * settings.overtime_rate_multiplier;
    const netPay = Math.round((proratedBase + overtimePay) * 100) / 100;

    const pdfPath = path.join(pdfDir, `${emp.id}-${year}-${month}.pdf`);
    generatePayslipPdf(pdfPath, {
      companyName: 'Acme Retail Pvt Ltd',
      employee: emp,
      month, year,
      totalWorkingDays, daysPresent, totalHours: Math.round(totalHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      netPay, currency: settings.currency,
    });

    db.prepare(
      `INSERT INTO payslips (user_id, company_id, month, year, basic_salary, total_working_days,
                              days_present, total_hours_worked, overtime_hours, deductions, net_pay,
                              pdf_path, status, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'finalized', ?)
       ON CONFLICT(user_id, month, year) DO UPDATE SET
         basic_salary = excluded.basic_salary, days_present = excluded.days_present,
         total_hours_worked = excluded.total_hours_worked, overtime_hours = excluded.overtime_hours,
         net_pay = excluded.net_pay, pdf_path = excluded.pdf_path, generated_at = excluded.generated_at`
    ).run(
      emp.id, req.user.companyId, month, year, emp.basic_salary, totalWorkingDays,
      daysPresent, totalHours, overtimeHours, 0, netPay, pdfPath, new Date().toISOString()
    );

    results.push({ employee: emp.name, netPay, daysPresent, totalHours });
  }

  res.json({ message: `Generated ${results.length} payslips for ${month}/${year}`, results });
});

function generatePayslipPdf(filePath, data) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text(data.companyName, { align: 'left' });
  doc.fontSize(12).fillColor('#445064').text('Payslip', { align: 'left' });
  doc.moveDown();

  doc.fillColor('#1B2430').fontSize(11);
  doc.text(`Employee: ${data.employee.name} (${data.employee.employee_code || '-'})`);
  doc.text(`Department: ${data.employee.department || '-'}`);
  doc.text(`Pay period: ${data.month}/${data.year}`);
  doc.moveDown();

  doc.text(`Working days: ${data.totalWorkingDays}`);
  doc.text(`Days present: ${data.daysPresent}`);
  doc.text(`Total hours worked: ${data.totalHours}`);
  doc.text(`Overtime hours: ${data.overtimeHours}`);
  doc.moveDown();

  doc.fontSize(14).fillColor('#0F6E56').text(`Net pay: ${data.currency} ${data.netPay.toLocaleString()}`);

  doc.end();
}

// --- List payslips ---
router.get('/payslips/my-payslips', (req, res) => {
  const payslips = db
    .prepare(`SELECT id, month, year, net_pay, status, generated_at FROM payslips WHERE user_id = ? ORDER BY year DESC, month DESC`)
    .all(req.user.userId);
  res.json(payslips);
});

router.get('/payslips/company', requireRole('hr_manager', 'company_admin'), (req, res) => {
  const payslips = db
    .prepare(
      `SELECT p.*, u.name as employee_name FROM payslips p
       JOIN users u ON u.id = p.user_id
       WHERE p.company_id = ? ORDER BY p.year DESC, p.month DESC`
    )
    .all(req.user.companyId);
  res.json(payslips);
});

router.get('/payslips/:id/download', (req, res) => {
  const payslip = db.prepare(`SELECT * FROM payslips WHERE id = ?`).get(req.params.id);
  if (!payslip || payslip.company_id !== req.user.companyId) {
    return res.status(404).json({ error: 'Payslip not found' });
  }
  // Employees can only download their own; HR can download any in their company
  if (req.user.role === 'employee' && payslip.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (!payslip.pdf_path || !fs.existsSync(payslip.pdf_path)) {
    return res.status(404).json({ error: 'PDF not found, regenerate payslip' });
  }
  res.download(payslip.pdf_path, `payslip-${payslip.month}-${payslip.year}.pdf`);
});

module.exports = router;

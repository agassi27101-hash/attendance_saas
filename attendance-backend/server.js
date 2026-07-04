require('dotenv').config();
const express = require('express');
const cors = require('cors');

require('./db'); // initializes schema + seed data on first run

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/payroll', require('./routes/payroll'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Central error handler — never leak stack traces to the client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Attendance API running on http://localhost:${PORT}`));

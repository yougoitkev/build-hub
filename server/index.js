import express from 'express';
import cors from 'cors';
import { getTransitionReport, getKPIReport, getTrainerAttendanceReport } from './processor.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Transition Report Endpoint
app.get('/api/reports/local/transition', (req, res) => {
  try {
    const data = getTransitionReport();
    res.json(data);
  } catch (error) {
    console.error('Error fetching transition report:', error);
    res.status(500).json({ error: error.message });
  }
});

// KPI Report Endpoint
app.get('/api/reports/local/kpi', (req, res) => {
  try {
    const data = getKPIReport();
    res.json(data);
  } catch (error) {
    console.error('Error fetching KPI report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trainer Attendance Endpoint
app.get('/api/reports/local/trainer-attendance', (req, res) => {
  try {
    const data = getTrainerAttendanceReport();
    res.json(data);
  } catch (error) {
    console.error('Error fetching trainer attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`TMS Local Backend running on http://localhost:${PORT}`);
});

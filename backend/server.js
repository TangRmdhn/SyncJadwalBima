const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { parseJadwal, validateCourse } = require('./parser');
const {
  getAuthUrl,
  getTokenFromCode,
  getAuthenticatedClient,
  createMultipleEvents
} = require('./calendarService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('frontend'));

let userTokens = {};

// **BAGIAN BARU**: Definisikan URL frontend di sini
// Ambil dari environment variable, atau gunakan URL Vercel lu sebagai default
const FRONTEND_URL = process.env.FRONTEND_URL || "https://sync-jadwal-bima.vercel.app";


app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SyncJadwal API is running' });
});

app.post('/api/parse-jadwal', (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) {
      return res.status(400).json({ success: false, error: 'Raw text tidak boleh kosong' });
    }
    const courses = parseJadwal(rawText);
    const validCourses = courses.filter(validateCourse);
    if (validCourses.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data jadwal valid yang ditemukan' });
    }
    res.json({ success: true, data: validCourses, total: validCourses.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auth/google', (req, res) => {
  try {
    const authUrl = getAuthUrl();
    res.json({ success: true, authUrl: authUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal membuat URL autentikasi' });
  }
});

app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Authorization code tidak ditemukan');
  try {
    const tokens = await getTokenFromCode(code);
    const sessionId = Math.random().toString(36).substring(7);
    userTokens[sessionId] = tokens;

    // **BAGIAN YANG DIUBAH**: Redirect ke frontend Vercel, bukan ke root backend
    res.redirect(`${FRONTEND_URL}/?session=${sessionId}&auth=success`);

  } catch (error) {
    // Jika gagal, redirect juga ke frontend dengan status gagal
    res.redirect(`${FRONTEND_URL}/?auth=failed`);
  }
});

app.post('/api/create-events', async (req, res) => {
  try {
    const { sessionId, courses, startDate, weeksCount } = req.body;
    
    if (!sessionId || !courses || !startDate || !weeksCount) {
      return res.status(400).json({ success: false, error: 'Data tidak lengkap (session, courses, startDate, weeksCount)' });
    }
    
    const tokens = userTokens[sessionId];
    if (!tokens) {
      return res.status(401).json({ success: false, error: 'Sesi tidak valid. Silakan login ulang.' });
    }
    
    const auth = getAuthenticatedClient(tokens);
    
    const { results, errors } = await createMultipleEvents(
      auth,
      courses,
      startDate,
      weeksCount
    );
    
    res.json({ success: true, created: results.length, failed: errors.length, results: results, errors: errors });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auth/status', (req, res) => {
    const { sessionId } = req.query;
    res.json({ authenticated: (sessionId && userTokens[sessionId]) });
});

app.listen(PORT, () => {
  console.log(`✅ SyncJadwal server running on http://localhost:${PORT}`);
});
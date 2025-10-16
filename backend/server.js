const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { getAuthUrl, getTokenFromCode, getAuthenticatedClient, createMultipleEvents } = require('./calendarService');
const { parseJadwal, validateCourse } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Ambil URL frontend dari environment variable.
const FRONTEND_URL = process.env.FRONTEND_URL;

// **INI BARIS YANG HILANG DAN SUDAH GW KEMBALIKAN**
// Tempat untuk menyimpan token user sementara
let userTokens = {};

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Endpoint untuk callback dari Google
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!FRONTEND_URL) {
    return res.status(500).send('Konfigurasi error: FRONTEND_URL tidak di-set di server.');
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?auth=failed&error=nocode`);
  }

  try {
    const tokens = await getTokenFromCode(code);
    const sessionId = Math.random().toString(36).substring(7);
    userTokens[sessionId] = tokens; // Sekarang baris ini tidak akan error lagi

    res.redirect(`${FRONTEND_URL}/?session=${sessionId}&auth=success`);

  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.redirect(`${FRONTEND_URL}/?auth=failed&error=token`);
  }
});

// ... (sisa kode lainnya tidak berubah dan sudah benar) ...

app.get('/api/auth/google', (req, res) => {
    try {
        const authUrl = getAuthUrl();
        res.json({ success: true, authUrl: authUrl });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Gagal membuat URL autentikasi' });
    }
});

app.post('/api/parse-jadwal', (req, res) => {
    try {
        const { rawText } = req.body;
        if (!rawText) return res.status(400).json({ success: false, error: 'Raw text kosong' });
        const courses = parseJadwal(rawText);
        const validCourses = courses.filter(validateCourse);
        if (validCourses.length === 0) return res.status(400).json({ success: false, error: 'Tidak ada jadwal valid' });
        res.json({ success: true, data: validCourses, total: validCourses.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/create-events', async (req, res) => {
    try {
        const { sessionId, courses, startDate, weeksCount } = req.body;
        if (!sessionId || !courses || !startDate || !weeksCount) return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
        const tokens = userTokens[sessionId];
        if (!tokens) return res.status(401).json({ success: false, error: 'Sesi tidak valid' });
        const auth = getAuthenticatedClient(tokens);
        const { results, errors } = await createMultipleEvents(auth, courses, startDate, weeksCount);
        res.json({ success: true, created: results.length, failed: errors.length, results, errors });
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
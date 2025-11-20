const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { getAuthUrl, getTokenFromCode, getAuthenticatedClient, createMultipleEvents } = require('./calendarService');
const { parseJadwal, validateCourse } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Ambil URL Frontend dari env atau default ke localhost
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
let userTokens = {};

app.use(cors());
app.use(bodyParser.json());

// 1. Endpoint Auth Google
app.get('/api/auth/google', (req, res) => {
  try {
    const authUrl = getAuthUrl();
    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error generating auth url:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Callback dari Google
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/sync.html?auth=failed&error=nocode`);
  }

  try {
    const tokens = await getTokenFromCode(code);
    const sessionId = Math.random().toString(36).substring(7);
    userTokens[sessionId] = tokens;
    
    // Redirect kembali ke halaman sync dengan status sukses
    res.redirect(`${FRONTEND_URL}/sync.html?session=${sessionId}&auth=success`);
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.redirect(`${FRONTEND_URL}/sync.html?auth=failed&error=token`);
  }
});

// 3. Cek Status Login
app.get('/api/auth/status', (req, res) => {
  const { sessionId } = req.query;
  if (sessionId && userTokens[sessionId]) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// 4. Parse Jadwal
app.post('/api/parse-jadwal', (req, res) => {
  const { rawText } = req.body;
  if (!rawText) {
    return res.status(400).json({ success: false, error: 'Teks jadwal tidak boleh kosong' });
  }

  try {
    const courses = parseJadwal(rawText);
    if (courses.length === 0) {
      return res.json({ success: false, error: 'Tidak ada mata kuliah yang ditemukan. Pastikan format copy-paste benar.' });
    }
    res.json({ success: true, data: courses, total: courses.length });
  } catch (error) {
    console.error('Error parsing jadwal:', error);
    res.status(500).json({ success: false, error: 'Gagal memproses jadwal.' });
  }
});

// 5. Buat Event di Calendar
app.post('/api/create-events', async (req, res) => {
  const { sessionId, courses, startDate, weeksCount } = req.body;

  if (!sessionId || !userTokens[sessionId]) {
    return res.status(401).json({ success: false, error: 'Sesi tidak valid atau kadaluarsa. Silakan hubungkan ulang akun Google.' });
  }

  try {
    const auth = getAuthenticatedClient(userTokens[sessionId]);
    const result = await createMultipleEvents(auth, courses, startDate, weeksCount);
    
    const successCount = result.results.length;
    const failCount = result.errors.length;

    res.json({ 
      success: true, 
      created: successCount, 
      failed: failCount,
      details: result 
    });
  } catch (error) {
    console.error('Error creating events:', error);
    // Jika error karena token (misal revoked), hapus sesi
    if (error.message.includes('invalid_grant') || error.code === 401) {
        delete userTokens[sessionId];
        return res.status(401).json({ success: false, error: 'Izin akses dicabut atau kadaluarsa.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// PENTING: Export app buat Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`✅ SyncJadwal server running on port ${PORT}`);
    });
}

module.exports = app;
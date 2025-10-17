const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { getAuthUrl, getTokenFromCode, getAuthenticatedClient, createMultipleEvents } = require('./calendarService');
const { parseJadwal, validateCourse } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_URL = process.env.FRONTEND_URL;
let userTokens = {};

app.use(cors());
app.use(bodyParser.json());

// Callback dari Google
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!FRONTEND_URL) {
    return res.status(500).send('Konfigurasi server error: FRONTEND_URL tidak di-set.');
  }
  if (!code) {
    // Redirect ke halaman sync.html dengan status gagal
    return res.redirect(`${FRONTEND_URL}/sync.html?auth=failed&error=nocode`);
  }

  try {
    const tokens = await getTokenFromCode(code);
    const sessionId = Math.random().toString(36).substring(7);
    userTokens[sessionId] = tokens;
    // INI YANG BERUBAH: Redirect kembali ke /sync.html
    res.redirect(`${FRONTEND_URL}/sync.html?session=${sessionId}&auth=success`);
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.redirect(`${FRONTEND_URL}/sync.html?auth=failed&error=token`);
  }
});

// ... (Sisa kode server.js lainnya tidak ada yang berubah, biarkan seperti yang sudah ada) ...
app.get('/api/auth/google', (req, res) => { /* ... */ });
app.post('/api/parse-jadwal', (req, res) => { /* ... */ });
app.post('/api/create-events', async (req, res) => { /* ... */ });
app.get('/api/auth/status', (req, res) => { /* ... */ });
app.listen(PORT, () => { console.log(`✅ SyncJadwal server running on port ${PORT}`); });
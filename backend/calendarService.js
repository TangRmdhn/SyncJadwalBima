const { google } = require('googleapis');

// Fungsi ini sekarang membaca dari environment variable, bukan file
function getCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS);
  }
  throw new Error('GOOGLE_CREDENTIALS environment variable not set.');
}

function getOAuth2Client() {
  const credentials = getCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

// ... sisa kode calendarService.js lu (getAuthUrl, getTokenFromCode, dll.) tetap sama ...

// Pastikan semua fungsi yang dibutuhkan di-export
module.exports = {
  getAuthUrl,
  getTokenFromCode,
  getAuthenticatedClient,
  createMultipleEvents
};
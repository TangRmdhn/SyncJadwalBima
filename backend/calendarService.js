const { google } = require('googleapis');

// Fungsi untuk mendapatkan kredensial dari environment variable
function getCredentials() {
  if (!process.env.GOOGLE_CREDENTIALS) {
    throw new Error('GOOGLE_CREDENTIALS environment variable not set.');
  }
  try {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } catch (e) {
    throw new Error('Failed to parse GOOGLE_CREDENTIALS.');
  }
}

// Fungsi untuk membuat OAuth2 client
function getOAuth2Client() {
  const credentials = getCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

// Fungsi untuk mendapatkan URL autentikasi
function getAuthUrl(state) {
  const oAuth2Client = getOAuth2Client();
  const SCOPES = ['https://www.googleapis.com/auth/calendar'];
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: state,
  });
}

// Fungsi untuk mendapatkan token dari kode
async function getTokenFromCode(code) {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
}

// Fungsi untuk membuat authenticated client
function getAuthenticatedClient(tokens) {
  const oAuth2Client = getOAuth2Client();
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

// Fungsi untuk membuat satu event di kalender
async function createCalendarEvent(auth, courseData, startDate, weeksCount) {
  const calendar = google.calendar({ version: 'v3', auth });
  
  const hariMap = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
  const targetDay = hariMap[courseData.hari];
  const startDateObj = new Date(startDate);
  
  // Cari tanggal pertama yang sesuai dengan hari yang dijadwalkan
  const currentDay = startDateObj.getUTCDay(); // Gunakan getUTCDay untuk konsistensi
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  startDateObj.setUTCDate(startDateObj.getUTCDate() + daysUntilTarget); // Gunakan setUTCDate

  // ** INI BAGIAN YANG DIPERBAIKI **
  // Buat string tanggal dalam format YYYY-MM-DD
  const year = startDateObj.getUTCFullYear();
  const month = String(startDateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(startDateObj.getUTCDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  // Gabungkan dengan waktu dari input untuk membuat string ISO 8601 lengkap
  // String ini secara eksplisit memberitahu bahwa waktu ini adalah untuk Asia/Jakarta
  const startDateTimeString = `${dateString}T${courseData.jam_mulai}:00`;
  const endDateTimeString = `${dateString}T${courseData.jam_selesai}:00`;

  const event = {
    summary: `${courseData.nama_matkul} (${courseData.kelas})`,
    location: courseData.lokasi || '',
    description: `Dosen: ${courseData.dosen}\nKode: ${courseData.kode_matkul}\nSKS: ${courseData.sks}`,
    start: {
      dateTime: startDateTimeString, // Langsung gunakan string yang sudah benar
      timeZone: 'Asia/Jakarta',
    },
    end: {
      dateTime: endDateTimeString, // Langsung gunakan string yang sudah benar
      timeZone: 'Asia/Jakarta',
    },
    recurrence: [
      `RRULE:FREQ=WEEKLY;COUNT=${weeksCount}`
    ],
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] },
    colorId: '9'
  };
  
  const response = await calendar.events.insert({ calendarId: 'primary', resource: event });
  return response.data;
}

// Fungsi untuk membuat banyak event sekaligus
async function createMultipleEvents(auth, coursesData, startDate, weeksCount) {
  const results = [];
  const errors = [];
  
  for (const course of coursesData) {
    try {
      const event = await createCalendarEvent(auth, course, startDate, weeksCount);
      results.push({ success: true, course: course.nama_matkul, event: event });
    } catch (error) {
      errors.push({ success: false, course: course.nama_matkul, error: error.message });
    }
  }
  
  return { results, errors };
}

// Bagian export
module.exports = {
  getAuthUrl,
  getTokenFromCode,
  getAuthenticatedClient,
  createMultipleEvents
};
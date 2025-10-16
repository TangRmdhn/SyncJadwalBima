const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

function getOAuth2Client() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

function getAuthUrl() {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
}

async function getTokenFromCode(code) {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  // Di dunia nyata, simpan token ini ke database, bukan file
  return tokens;
}

function getAuthenticatedClient(tokens) {
  const oAuth2Client = getOAuth2Client();
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
}

async function createCalendarEvent(auth, courseData, startDate, weeksCount) { // <-- Terima weeksCount
  const calendar = google.calendar({ version: 'v3', auth });
  
  const hariMap = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
  const targetDay = hariMap[courseData.hari];
  const startDateObj = new Date(startDate);
  
  const currentDay = startDateObj.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  startDateObj.setDate(startDateObj.getDate() + daysUntilTarget);
  
  const startDateTime = new Date(startDateObj);
  const [startHour, startMinute] = courseData.jam_mulai.split(':');
  startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0);
  
  const endDateTime = new Date(startDateObj);
  const [endHour, endMinute] = courseData.jam_selesai.split(':');
  endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0);
  
  const event = {
    summary: `${courseData.nama_matkul} (${courseData.kelas})`,
    location: courseData.lokasi || '',
    description: `Dosen: ${courseData.dosen}\nKode: ${courseData.kode_matkul}\nSKS: ${courseData.sks}`,
    start: { dateTime: startDateTime.toISOString(), timeZone: 'Asia/Jakarta' },
    end: { dateTime: endDateTime.toISOString(), timeZone: 'Asia/Jakarta' },
    recurrence: [
      `RRULE:FREQ=WEEKLY;COUNT=${weeksCount}` // <-- Gunakan weeksCount dari input user
    ],
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] },
    colorId: '9'
  };
  
  const response = await calendar.events.insert({ calendarId: 'primary', resource: event });
  return response.data;
}

async function createMultipleEvents(auth, coursesData, startDate, weeksCount) { // <-- Terima weeksCount
  const results = [];
  const errors = [];
  
  for (const course of coursesData) {
    try {
      const event = await createCalendarEvent(auth, course, startDate, weeksCount); // <-- Kirim ke fungsi event
      results.push({ success: true, course: course.nama_matkul, event: event });
    } catch (error) {
      errors.push({ success: false, course: course.nama_matkul, error: error.message });
    }
  }
  
  return { results, errors };
}

module.exports = {
  getAuthUrl,
  getTokenFromCode,
  getAuthenticatedClient,
  createMultipleEvents
};
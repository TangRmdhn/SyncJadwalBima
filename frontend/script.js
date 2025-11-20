/* frontend/script.js */
// === THEME TOGGLE SCRIPT ===
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = document.getElementById('theme-icon-sun');
const moonIcon = document.getElementById('theme-icon-moon');
const userTheme = localStorage.getItem('theme');

// Apply saved theme on load
if (userTheme === 'dark') {
    document.body.classList.add('dark-mode');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    sunIcon.classList.toggle('hidden');
    moonIcon.classList.toggle('hidden');
    
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

// === APPLICATION SCRIPT ===
const API_BASE = '/api';
let sessionId = null;
let parsedCourses = [];

const btnConnectGoogle = document.getElementById('btnConnectGoogle');
const btnParseSchedule = document.getElementById('btnParseSchedule');
const btnSyncToCalendar = document.getElementById('btnSyncToCalendar');
const scheduleInput = document.getElementById('scheduleInput');
const startDateInput = document.getElementById('startDate');
const weeksCountInput = document.getElementById('weeksCount');
const authStatus = document.getElementById('authStatus');
const stepStartDate = document.getElementById('stepStartDate');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultContainer = document.getElementById('resultContainer');
const statusMessage = document.getElementById('statusMessage');

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session');
    const authResult = urlParams.get('auth');
    if (session && authResult === 'success') {
        sessionId = session;
        localStorage.setItem('syncjadwal_session', session);
        updateAuthStatus(true);
        showStatus('Berhasil terhubung dengan Google Calendar!', 'success');
        window.history.replaceState({}, document.title, '/');
    } else if (authResult === 'failed') {
        showStatus('Gagal terhubung dengan Google. Silakan coba lagi.', 'error');
        window.history.replaceState({}, document.title, '/');
    }
    const savedSession = localStorage.getItem('syncjadwal_session');
    if (savedSession) {
        sessionId = savedSession;
        checkAuthStatus();
    }
    setDefaultStartDate();
});

btnConnectGoogle.onclick = async () => {
    try { showLoading(true); const r = await fetch(`${API_BASE}/auth/google`), d = await r.json(); if(d.success) window.location.href = d.authUrl; else showStatus('Gagal membuat URL autentikasi', 'error'); } catch (e) { showStatus('Terjadi kesalahan', 'error'); } finally { showLoading(false); }
};
btnParseSchedule.onclick = async () => {
    const rawText = scheduleInput.value.trim(); if(!rawText) return showStatus('Mohon masukkan jadwal', 'error');
    try { showLoading(true); resultContainer.classList.add('hidden'); const r = await fetch(`${API_BASE}/parse-jadwal`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({rawText}) }), d = await r.json(); if(d.success) { parsedCourses = d.data; displayParsedCourses(d.data); stepStartDate.classList.remove('hidden'); showStatus(`Berhasil proses ${d.total} matkul`, 'success'); } else { showStatus(d.error, 'error'); } } catch (e) { showStatus('Terjadi kesalahan', 'error'); } finally { showLoading(false); }
};
btnSyncToCalendar.onclick = async () => {
    if(!sessionId) return showStatus('Hubungkan Google dulu', 'error'); if(parsedCourses.length === 0) return showStatus('Tidak ada jadwal', 'error'); const startDate = startDateInput.value, weeksCount = weeksCountInput.value; if(!startDate || !weeksCount) return showStatus('Isi tanggal dan minggu', 'error');
    try { showLoading(true); const r = await fetch(`${API_BASE}/create-events`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({sessionId, courses: parsedCourses, startDate, weeksCount: parseInt(weeksCount)}) }), d = await r.json(); if(d.success) { displaySyncResults(d); showStatus(`Berhasil buat ${d.created} event`, 'success'); } else { if(r.status === 401){ sessionId = null; localStorage.removeItem('syncjadwal_session'); updateAuthStatus(false); showStatus('Sesi berakhir, hubungkan ulang', 'error'); } else { showStatus(d.error, 'error'); } } } catch (e) { showStatus('Terjadi kesalahan sinkronisasi', 'error'); } finally { showLoading(false); }
};
function displayParsedCourses(courses) { resultContainer.innerHTML = `<div class="step"><div class="result-title">📚 Jadwal Diproses (${courses.length})</div> ${courses.map(c => `<div class="course-item"><div class="course-name">${c.nama_matkul} (${c.kelas})</div> <div class="course-details">📅 ${c.hari}, ${c.jam_mulai}-${c.jam_selesai} | 📍 ${c.lokasi} | 👨‍🏫 ${c.dosen}</div></div>`).join('')}</div>`; resultContainer.classList.remove('hidden'); }
function displaySyncResults(data) { resultContainer.innerHTML = `<div class="step"><div class="result-title">✅ Hasil Sinkronisasi</div><p><strong>Berhasil:</strong> ${data.created} event<br><strong>Gagal:</strong> ${data.failed} event</p></div>`; resultContainer.classList.remove('hidden'); }
async function checkAuthStatus() { try { const r = await fetch(`${API_BASE}/auth/status?sessionId=${sessionId}`), d = await r.json(); updateAuthStatus(d.authenticated); if(!d.authenticated){ sessionId = null; localStorage.removeItem('syncjadwal_session'); } } catch (e) {} }
function updateAuthStatus(isConnected) { authStatus.textContent = isConnected ? '✅ Terhubung' : '❌ Belum Terhubung'; authStatus.className = `auth-status ${isConnected ? 'auth-connected' : 'auth-disconnected'}`; btnConnectGoogle.textContent = isConnected ? 'Hubungkan Ulang Akun' : 'Hubungkan dengan Google Calendar'; }
function showLoading(show) { loadingIndicator.classList.toggle('hidden', !show); resultContainer.classList.toggle('hidden', show); btnParseSchedule.disabled = show; btnSyncToCalendar.disabled = show; btnConnectGoogle.disabled = show; }
function showStatus(message, type) { statusMessage.textContent = message; statusMessage.className = `auth-status ${type === 'success' ? 'auth-connected' : 'auth-disconnected'}`; statusMessage.classList.remove('hidden'); setTimeout(() => statusMessage.classList.add('hidden'), 5000); }
function setDefaultStartDate() { const d = new Date(), offset = (d.getDay() + 6) % 7; d.setDate(d.getDate() - offset + 7); startDateInput.value = d.toISOString().split('T')[0]; }
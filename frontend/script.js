/* frontend/script.js - Redesigned for new UI */
const API_BASE = '/api';
let sessionId = null;
let parsedCourses = [];

// === DOM ELEMENTS ===
const scheduleInput = document.getElementById('scheduleInput');
const btnParseSchedule = document.getElementById('btnParseSchedule');
const sectionPreview = document.getElementById('sectionPreview');
const sectionActions = document.getElementById('sectionActions');
const previewContainer = document.getElementById('previewContainer');
const previewDesc = document.getElementById('previewDesc');

// Configuration & Actions
const startDateInput = document.getElementById('startDate');
const weeksCountInput = document.getElementById('weeksCount');
const btnConnectGoogle = document.getElementById('btnConnectGoogle');
const authBadge = document.getElementById('authBadge');
const btnSyncToCalendar = document.getElementById('btnSyncToCalendar');
const btnDownloadIcs = document.getElementById('btnDownloadIcs');
const btnShowTutorial = document.getElementById('btnShowTutorial');

// Loading & Status
const loadingIndicator = document.getElementById('loadingIndicator');
const statusMessage = document.getElementById('statusMessage');

// Modal
const tutorialModal = document.getElementById('tutorialModal');
const btnCloseModals = document.querySelectorAll('.btn-close-modal');

// === INITIALIZATION ===
window.addEventListener('DOMContentLoaded', () => {
    // Check for auth callback
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session');
    const authResult = urlParams.get('auth');
    
    if (session && authResult === 'success') {
        sessionId = session;
        localStorage.setItem('syncjadwal_session', session);
        updateAuthUI(true);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        const savedSession = localStorage.getItem('syncjadwal_session');
        if (savedSession) {
            sessionId = savedSession;
            checkAuthStatus();
        }
    }

    // Check for saved data in localStorage
    const savedRawText = localStorage.getItem('syncjadwal_raw_text');
    const savedCourses = localStorage.getItem('syncjadwal_courses');

    if (savedRawText) {
        scheduleInput.value = savedRawText;
    }

    if (savedCourses) {
        try {
            parsedCourses = JSON.parse(savedCourses);
            if (Array.isArray(parsedCourses) && parsedCourses.length > 0) {
                displayParsedCourses(parsedCourses);
                sectionPreview.classList.remove('hidden');
                toggleSection3(true);
                previewDesc.textContent = `${parsedCourses.length} mata kuliah berhasil dipulihkan`;
            } else {
                toggleSection3(false);
            }
        } catch (e) {
            console.error('Error loading saved courses:', e);
            toggleSection3(false);
        }
    } else {
        toggleSection3(false);
    }

    setDefaultDate(startDateInput);
    initializeCalendar(); // Initialize calendar grid
});

function toggleSection3(enable) {
    if (enable) {
        sectionActions.classList.remove('disabled-section');
        startDateInput.disabled = false;
        weeksCountInput.disabled = false;
        btnConnectGoogle.disabled = false;
        btnSyncToCalendar.disabled = false;
        btnDownloadIcs.disabled = false;
    } else {
        sectionActions.classList.add('disabled-section');
        startDateInput.disabled = true;
        weeksCountInput.disabled = true;
        btnConnectGoogle.disabled = true;
        btnSyncToCalendar.disabled = true;
        btnDownloadIcs.disabled = true;
    }
}

function setDefaultDate(input) {
    const today = new Date().toISOString().split('T')[0];
    input.value = today;
}

// Initialize empty calendar grid
function initializeCalendar() {
    const startHour = 7;
    const endHour = 18;
    const pxPerHour = 60;
    
    // Build time column
    const timeColumn = document.getElementById('timeColumn');
    let timeColHtml = '';
    for (let h = startHour; h <= endHour; h++) {
        timeColHtml += `<div class="time-slot-label">${h.toString().padStart(2, '0')}:00</div>`;
    }
    timeColumn.innerHTML = timeColHtml;
    
    // Build grid lines for each day
    const dayIds = ['dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday'];
    dayIds.forEach(dayId => {
        const dayColumn = document.getElementById(dayId);
        let gridLines = '';
        for (let h = startHour; h <= endHour; h++) {
            gridLines += '<div class="day-hour-line"></div>';
        }
        dayColumn.innerHTML = gridLines;
    });
}

// === EVENT HANDLERS ===

// 1. PARSE SCHEDULE
btnParseSchedule.onclick = async () => {
    const rawText = scheduleInput.value.trim();
    if (!rawText) {
        alert('Silakan paste jadwal BIMA terlebih dahulu!');
        return;
    }

    await withLoading(async () => {
        const response = await fetch(`${API_BASE}/parse-jadwal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText })
        });
        const data = await response.json();
        
        if (!data.success) {
            alert(data.error || 'Gagal memparse jadwal');
            return;
        }

        parsedCourses = data.data;
        displayParsedCourses(parsedCourses);
        
        // Save to localStorage
        localStorage.setItem('syncjadwal_courses', JSON.stringify(parsedCourses));
        localStorage.setItem('syncjadwal_raw_text', rawText);
        
        // Show preview and enable actions sections
        sectionPreview.classList.remove('hidden');
        toggleSection3(true);
        
        // Update preview description
        previewDesc.textContent = `${parsedCourses.length} mata kuliah berhasil diparse`;
        
        // Scroll to preview smoothly
        sectionPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
};

// 2. CONNECT GOOGLE
btnConnectGoogle.onclick = async () => {
    await withLoading(async () => {
        const response = await fetch(`${API_BASE}/auth/google`);
        const data = await response.json();
        
        if (data.success) {
            window.location.href = data.authUrl;
        } else {
            alert('Gagal mendapatkan URL autentikasi');
        }
    });
};

// 3. SYNC TO GOOGLE CALENDAR
btnSyncToCalendar.onclick = async () => {
    if (!sessionId) {
        alert('Harap hubungkan akun Google Calendar terlebih dahulu!');
        return;
    }
    
    if (parsedCourses.length === 0) {
        alert('Belum ada jadwal yang diparse. Silakan parse jadwal terlebih dahulu.');
        return;
    }

    const startDate = startDateInput.value;
    const weeks = parseInt(weeksCountInput.value);

    if (!startDate) {
        alert('Harap isi tanggal mulai semester!');
        return;
    }

    await withLoading(async () => {
        const response = await fetch(`${API_BASE}/create-events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId, 
                courses: parsedCourses, 
                startDate, 
                weeksCount: weeks 
            })
        });
        
        if (response.status === 401) {
            handleLogout();
            alert('Sesi habis, silakan login ulang.');
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            showSuccessMessage(`✅ Berhasil! ${data.created} event telah ditambahkan ke Google Calendar.`);
        } else {
            alert(data.error || 'Gagal sync ke Google Calendar');
        }
    });
};

// 4. DOWNLOAD ICS FILE
btnDownloadIcs.onclick = async () => {
    if (parsedCourses.length === 0) {
        alert('Belum ada jadwal yang diparse. Silakan parse jadwal terlebih dahulu.');
        return;
    }
    
    const startDate = startDateInput.value;
    const weeks = parseInt(weeksCountInput.value);

    if (!startDate) {
        alert('Harap isi tanggal mulai semester!');
        return;
    }

    await withLoading(async () => {
        const response = await fetch(`${API_BASE}/generate-ics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                courses: parsedCourses, 
                startDate, 
                weeksCount: weeks 
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'jadwal_kuliah.ics';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Show tutorial modal
            tutorialModal.classList.remove('hidden');
        } else {
            const data = await response.json();
            alert(data.error || 'Gagal membuat file ICS');
        }
    });
};

// === HELPER FUNCTIONS ===

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/status?sessionId=${sessionId}`);
        const data = await response.json();
        updateAuthUI(data.authenticated);
        
        if (!data.authenticated) {
            handleLogout();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

function updateAuthUI(isConnected) {
    if (isConnected) {
        authBadge.textContent = '✅ Terhubung';
        authBadge.classList.add('connected');
        btnConnectGoogle.textContent = 'Ganti Akun';
    } else {
        authBadge.textContent = 'Belum Terhubung';
        authBadge.classList.remove('connected');
        btnConnectGoogle.textContent = 'Hubungkan Google Calendar';
    }
}

function handleLogout() {
    sessionId = null;
    localStorage.removeItem('syncjadwal_session');
    updateAuthUI(false);
}

async function withLoading(fn) {
    try {
        loadingIndicator.classList.remove('hidden');
        await fn();
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan yang tidak terduga.');
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

function showSuccessMessage(message) {
    statusMessage.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #000;
            color: #fff;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        ">
            ${message}
        </div>
    `;
    statusMessage.classList.remove('hidden');
    
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 5000);
}

function displayParsedCourses(courses) {
    if (!courses || courses.length === 0) {
        // Clear any existing events
        clearCalendarEvents();
        previewDesc.textContent = 'Jadwal akan muncul setelah parsing';
        return;
    }

    // Clear existing events first
    clearCalendarEvents();
    
    const days = {
        'senin': 'dayMonday',
        'selasa': 'dayTuesday', 
        'rabu': 'dayWednesday',
        'kamis': 'dayThursday',
        'jumat': 'dayFriday',
        'sabtu': 'daySaturday'
    };
    
    const startHour = 7;
    const pxPerHour = 60;

    const getMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // Add events to each day column
    courses.forEach(course => {
        const dayKey = course.hari.toLowerCase();
        const dayId = days[dayKey];
        
        if (!dayId) return; // Skip if day not found
        
        const dayColumn = document.getElementById(dayId);
        if (!dayColumn) return;
        
        const startMin = getMinutes(course.jam_mulai);
        const endMin = getMinutes(course.jam_selesai);
        const duration = endMin - startMin;
        const top = startMin - (startHour * 60);

        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        eventCard.style.top = `${top}px`;
        eventCard.style.height = `${duration}px`;
        eventCard.innerHTML = `
            <div class="event-title">${course.nama_matkul}</div>
            <div class="event-meta">${course.jam_mulai} - ${course.jam_selesai}</div>
            <div class="event-meta">${course.lokasi}</div>
        `;
        
        dayColumn.appendChild(eventCard);
    });
    
    // Update description
    previewDesc.textContent = `${courses.length} mata kuliah berhasil diparse`;
}

function clearCalendarEvents() {
    const dayIds = ['dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday'];
    dayIds.forEach(dayId => {
        const dayColumn = document.getElementById(dayId);
        if (!dayColumn) return;
        
        // Remove all event cards, keep grid lines
        const events = dayColumn.querySelectorAll('.event-card');
        events.forEach(event => event.remove());
    });
}

// === MODAL HANDLERS ===
btnCloseModals.forEach(btn => {
    btn.addEventListener('click', () => {
        tutorialModal.classList.add('hidden');
    });
});

tutorialModal.addEventListener('click', (e) => {
    if (e.target === tutorialModal) {
        tutorialModal.classList.add('hidden');
    }
});

btnShowTutorial.onclick = (e) => {
    e.preventDefault();
    tutorialModal.classList.remove('hidden');
};

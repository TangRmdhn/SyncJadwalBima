const ics = require('ics');

/**
 * Maps day name (Senin, Selasa, etc.) to a date for the first week of the semester.
 * @param {string} dayName - "Senin", "Selasa", etc.
 * @param {string} semesterStartDateStr - "YYYY-MM-DD"
 * @returns {Date} The specific date for this course in the first week.
 */
function getFirstDate(dayName, semesterStartDateStr) {
  const dayMap = {
    'senin': 1, 'selasa': 2, 'rabu': 3,
    'kamis': 4, 'jumat': 5, 'sabtu': 6, 'minggu': 0
  };

  const targetDay = dayMap[dayName.toLowerCase()];
  if (targetDay === undefined) return null;

  const start = new Date(semesterStartDateStr);
  const currentDay = start.getDay(); // 0 (Sun) - 6 (Sat)
  
  // Calculate difference to get the target day in the SAME week (or next if already passed, 
  // but usually semester start is Monday). 
  // Simpler approach: Semester start is usually Monday. 
  // Let's assume start date is correct.
  
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd < 0) {
      // If target day is before start day in the week, usually it means next week, 
      // but for "Semester Start Date", if user picks Monday, and course is Tuesday, it's +1.
      // If user picks Wednesday, and course is Monday, it's next Monday? 
      // Standard logic: Start Date is Week 1. 
      daysToAdd += 7;
  }
  
  const resultDate = new Date(start);
  resultDate.setDate(start.getDate() + daysToAdd);
  return resultDate;
}

/**
 * Generates ICS file content.
 * @param {Array} courses - List of courses.
 * @param {string} startDate - Semester start date (YYYY-MM-DD).
 * @param {number} weeksCount - Number of weeks.
 * @returns {Promise<string>} The ICS string.
 */
function generateIcs(courses, startDate, weeksCount) {
  return new Promise((resolve, reject) => {
    const events = [];

    courses.forEach(course => {
      const firstDate = getFirstDate(course.hari, startDate);
      if (!firstDate) return;

      // Parse time "07:00" -> [7, 0]
      const [startHour, startMinute] = course.jam_mulai.split(':').map(Number);
      const [endHour, endMinute] = course.jam_selesai.split(':').map(Number);

      const year = firstDate.getFullYear();
      const month = firstDate.getMonth() + 1; // ics uses 1-indexed months
      const day = firstDate.getDate();

      const event = {
        start: [year, month, day, startHour, startMinute],
        end: [year, month, day, endHour, endMinute],
        title: `${course.nama_matkul} - ${course.kelas}`,
        description: `Dosen: ${course.dosen}\nSKS: ${course.sks}\nKode: ${course.kode_matkul}`,
        location: course.lokasi,
        recurrenceRule: `FREQ=WEEKLY;COUNT=${weeksCount}`,
        status: 'CONFIRMED',
        busyStatus: 'BUSY'
      };
      
      events.push(event);
    });

    ics.createEvents(events, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

module.exports = { generateIcs };
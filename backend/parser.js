function parseJadwal(rawText) {
  const irrelevantHeaders = ['Kurikulum', 'Kode Mata Kuliah', 'Nama Mata Kuliah', 'Kelas', 'SKS', 'Jadwal', 'Dosen', 'Kehadiran'];
  const cleanLines = rawText
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !irrelevantHeaders.includes(line.trim()));

  const courses = [];
  
  for (let i = 0; i < cleanLines.length; i += 4) {
    if (i + 3 >= cleanLines.length) break;

    const line1 = cleanLines[i];
    const line2 = cleanLines[i + 1];
    const line3 = cleanLines[i + 2];
    // line4 (cleanLines[i + 3]) sekarang diabaikan

    try {
      const courseInfo = parseLine1(line1);
      const scheduleInfo = parseLine2(line2);
      
      if (courseInfo && scheduleInfo) {
        courses.push({
          kode_matkul: courseInfo.kode,
          nama_matkul: courseInfo.nama,
          kelas: courseInfo.kelas,
          sks: courseInfo.sks,
          hari: scheduleInfo.hari,
          jam_mulai: scheduleInfo.jamMulai,
          jam_selesai: scheduleInfo.jamSelesai,
          lokasi: scheduleInfo.lokasi,
          dosen: line3, // Dosen diambil dari baris ke-3
          // jumlah_pertemuan tidak ada lagi
        });
      }
    } catch (error) {
      console.error(`Error parsing block starting with "${line1}":`, error.message);
    }
  }
  return courses;
}

function parseLine1(line) {
  const parts = line.split(/\t+|\s{2,}/);
  if (parts.length < 5) throw new Error('Format baris 1 (info mata kuliah) tidak valid');
  return {
    kode: parts[0].trim(),
    id: parts[1].trim(),
    nama: parts[2].trim(),
    kelas: parts[3].trim(),
    sks: parseInt(parts[4].trim()) || 0
  };
}

function parseLine2(line) {
  const pattern = /^(\w+)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s+(.+)$/;
  const match = line.match(pattern);
  if (!match) throw new Error('Format baris 2 (jadwal) tidak valid');
  return {
    hari: match[1].trim(),
    jamMulai: match[2].trim(),
    jamSelesai: match[3].trim(),
    lokasi: match[4].trim()
  };
}

function validateCourse(course) {
  const required = ['nama_matkul', 'hari', 'jam_mulai', 'jam_selesai'];
  return required.every(field => course[field]);
}

module.exports = {
  parseJadwal,
  validateCourse
};
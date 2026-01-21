function parseJadwal(rawText) {
  const irrelevantHeaders = ['Kurikulum', 'Kode Mata Kuliah', 'Nama Mata Kuliah', 'Kelas', 'SKS', 'Jadwal', 'Dosen', 'Kehadiran'];
  const cleanLines = rawText
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !irrelevantHeaders.includes(line.trim()));

  const courses = [];
  
  let i = 0;
  while (i < cleanLines.length) {
    // Kita butuh minimal 3 baris (Info, Jadwal, Dosen/Angka)
    if (i + 2 >= cleanLines.length) break;

    const line1 = cleanLines[i];
    const line2 = cleanLines[i + 1];
    const line3 = cleanLines[i + 2];

    try {
      const courseInfo = parseLine1(line1);
      const scheduleInfo = parseLine2(line2);
      
      let dosenStr = '-';
      let increment = 4; // Default untuk mata kuliah biasa (ada dosen + angka kehadiran)

      // Cek apakah line3 angka saja? (Menandakan itu angka kehadiran -> berarti Praktikum tanpa dosen)
      if (/^\d+$/.test(line3)) {
        // Kondisi Baru: Praktikum
        dosenStr = '-';
        increment = 3;
      } else {
        // Kondisi Lama: Mata Kuliah Biasa (line3 adalah Nama Dosen)
        dosenStr = line3;
        increment = 4;
      }

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
          dosen: dosenStr,
        });
      }

      // Maju sesuai tipe blok yang terdeteksi
      i += increment;

    } catch (error) {
      console.error(`Error parsing block starting with "${line1}":`, error.message);
      // Jika error, maju 1 baris untuk mencoba recover/cari header berikutnya
      i++;
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
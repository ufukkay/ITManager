// Telefon numarasını "5XX XXX XX XX" biçiminde normalize eder. Kullanıcı bitişik
// (05321234567, +90 532 123 45 67 vb.) yazsa da son 10 haneyi alıp standart biçime sokar.
// 10 haneye tamamlanmamış (hâlâ yazılıyor/eksik) girdilerde sadece rakamları döner.
const formatPhone = (raw) => {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};

// Plaka numarasını "34 ABC 123" biçiminde normalize eder (il kodu + harf grubu + rakam grubu).
// Kalıba uymayan girdilerde sadece büyük harfe çevrilmiş/boşluksuz hâlini döner.
const formatPlate = (raw) => {
  if (!raw) return '';
  const clean = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = clean.match(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/);
  if (!match) return clean;
  return `${match[1]} ${match[2]} ${match[3]}`;
};

module.exports = { formatPhone, formatPlate };

export function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => Number(x) || 0);
  return h * 60 + m;
}

/** Format wajib HH:MM 24 jam (00:00–23:59), dipakai editor jam Admin. */
export function isValidTimeHHMM(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/**
 * F4.2 — cek di luar jam operasional.
 * `now` adalah instant nyata (hasil `new Date()`); konversi WIB dilakukan
 * di dalam fungsi ini supaya pemanggil tidak perlu menggeser jam manual.
 */
export function isOutsideJam(now: Date, jamBuka: string, jamTutup: string): boolean {
  const wib = new Date(now.getTime() + 7 * 60 * 60000);
  const nowM = wib.getUTCHours() * 60 + wib.getUTCMinutes();
  const bukaM = parseTimeToMinutes(jamBuka);
  const tutupM = parseTimeToMinutes(jamTutup);
  if (tutupM <= bukaM) {
    // overnight: open buka..24 and 0..tutup
    return !(nowM >= bukaM || nowM < tutupM);
  }
  return !(nowM >= bukaM && nowM < tutupM);
}

/**
 * F4.2 — instant jam buka berikutnya (WIB).
 * Aritmetika UTC murni: tidak bergantung timezone device (HP WIB / server UTC).
 * Jika sekarang tepat sebelum jam buka, hasilnya hari ini; jika sudah lewat,
 * hasilnya besok.
 */
export function getNextJamBukaISO(jamBuka: string, now = new Date()): string {
  const [h, m, s] = jamBuka.split(':').map((x) => Number(x) || 0);
  const nowWibMs = now.getTime() + 7 * 60 * 60000;
  const nowWib = new Date(nowWibMs);
  let targetWibMs = Date.UTC(
    nowWib.getUTCFullYear(),
    nowWib.getUTCMonth(),
    nowWib.getUTCDate(),
    h,
    m,
    s || 0,
    0
  );
  if (targetWibMs < nowWibMs) targetWibMs += 24 * 60 * 60000;
  return new Date(targetWibMs - 7 * 60 * 60000).toISOString();
}

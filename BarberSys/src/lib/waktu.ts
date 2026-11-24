/**
 * Utilitas waktu WIB (Asia/Jakarta, UTC+7).
 *
 * Aturan penting:
 * - Parameter `Date`/ISO di sini adalah **instant nyata** (UTC), bukan "jam dinding".
 * - Konversi ke jam dinding WIB dilakukan di dalam helper, sehingga tidak ada
 *   double-shift yang bergantung pada timezone device.
 */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export interface WIBParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Minggu, sama seperti Date.getDay(). */
  weekday: number;
}

function toDate(input: Date | string): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

/** Date yang field UTC-nya merepresentasikan jam dinding WIB. */
export function toWIBClock(date: Date = new Date()): Date {
  return new Date(date.getTime() + WIB_OFFSET_MS);
}

export function wibParts(input: Date | string): WIBParts {
  const d = toWIBClock(toDate(input));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay(),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "09:00" dari instant ISO. */
export function formatWIBTime(iso: string): string {
  const p = wibParts(iso);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** "18 Nov 2026" dari instant ISO. */
export function formatWIBDate(iso: string): string {
  const p = wibParts(iso);
  return `${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}`;
}

/** "18 Nov" dari instant ISO. */
export function formatWIBDateShort(iso: string): string {
  const p = wibParts(iso);
  return `${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

/** Kolom `time` Postgres ("09:00:00") → "09:00". */
export function formatJamHHMM(time: string | null | undefined): string {
  if (!time) return '';
  return String(time).slice(0, 5);
}

export function isSameWIBDate(a: Date | string, b: Date | string): boolean {
  const pa = wibParts(a);
  const pb = wibParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** Awal hari WIB (00:00) sebagai instant ISO/UTC. */
export function startOfDayWIBISO(ref: Date = new Date()): string {
  const p = wibParts(ref);
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - WIB_OFFSET_MS).toISOString();
}

/** Awal hari WIB berikutnya (00:00) sebagai instant ISO/UTC — batas atas eksklusif. */
export function startOfNextDayWIBISO(ref: Date = new Date()): string {
  const p = wibParts(ref);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + 1) - WIB_OFFSET_MS).toISOString();
}

/**
 * Tanggal WIB digeser `days`, dikembalikan pada pukul 12:00 WIB.
 * Tengah hari dipilih agar pergantian tanggal tidak pernah bergeser karena
 * offset timezone device.
 */
export function addWIBDays(ref: Date, days: number): Date {
  const p = wibParts(ref);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + days, 12) - WIB_OFFSET_MS);
}

/** Awal minggu WIB (Senin 00:00) sebagai instant ISO/UTC. */
export function startOfWeekWIBISO(ref: Date = new Date()): string {
  const p = wibParts(ref);
  const daysSinceMonday = (p.weekday + 6) % 7;
  const mondayMs =
    Date.UTC(p.year, p.month - 1, p.day) - daysSinceMonday * DAY_MS - WIB_OFFSET_MS;
  return new Date(mondayMs).toISOString();
}

/** Awal bulan WIB (tanggal 1 00:00) sebagai instant ISO/UTC. */
export function startOfMonthWIBISO(ref: Date = new Date()): string {
  const p = wibParts(ref);
  return new Date(Date.UTC(p.year, p.month - 1, 1) - WIB_OFFSET_MS).toISOString();
}

/**
 * F4.2 — copy hold yang tidak pernah salah "besok".
 * Contoh: "hari ini pukul 09:00 WIB", "besok pukul 09:00 WIB",
 * "21 Nov pukul 09:00 WIB".
 */
export function describeHoldUntil(holdUntilISO: string, now = new Date()): string {
  const jam = formatWIBTime(holdUntilISO);
  if (isSameWIBDate(holdUntilISO, now)) return `hari ini pukul ${jam} WIB`;
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (isSameWIBDate(holdUntilISO, tomorrow)) return `besok pukul ${jam} WIB`;
  return `${formatWIBDateShort(holdUntilISO)} pukul ${jam} WIB`;
}

/**
 * Jadwalkan refresh saat batas hold terdekat tiba. `null` = tidak ada hold
 * aktif. Delay dibatasi `maxMs` supaya layar juga melakukan polling ringan
 * dan tetap sadar perubahan jam server.
 */
export function getHoldRefreshDelayMs(
  holdIsos: (string | null | undefined)[],
  nowMs: number = Date.now(),
  maxMs: number = 60000
): number | null {
  let next: number | null = null;
  for (const iso of holdIsos) {
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms <= nowMs) continue;
    next = next === null ? ms : Math.min(next, ms);
  }
  if (next === null) return null;
  return Math.max(1000, Math.min(next - nowMs + 1000, maxMs));
}


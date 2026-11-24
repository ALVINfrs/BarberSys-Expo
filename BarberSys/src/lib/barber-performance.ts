/**
 * Statistik performa barber — modul murni tanpa import runtime supaya bisa
 * diuji langsung oleh Node (`--experimental-strip-types`).
 */

export interface PerformansiEntry {
  tanggalIso: string;
  total: number;
  tip: number;
  rating: number | null;
  komentar: string | null;
  customerNama: string;
}

export interface PerformansiSummary {
  count: number;
  omset: number;
  tip: number;
  avgRating: number;
  todayCount: number;
  weekCount: number;
}

export interface RatingComment {
  rating: number;
  komentar: string;
  customerNama: string;
  tanggalIso: string;
}

const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function wibDateKey(iso: string): string {
  return new Date(new Date(iso).getTime() + WIB_MS).toISOString().slice(0, 10);
}

export function summarizePerformansi(
  items: PerformansiEntry[],
  now: Date = new Date()
): PerformansiSummary {
  const todayKey = wibDateKey(now.toISOString());
  const todayMs = Date.parse(`${todayKey}T00:00:00.000Z`);
  const weekStart = todayMs - 6 * DAY_MS;

  let omset = 0;
  let tip = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  let todayCount = 0;
  let weekCount = 0;

  for (const item of items) {
    omset += item.total;
    tip += item.tip;
    if (typeof item.rating === 'number' && item.rating >= 1 && item.rating <= 5) {
      ratingSum += item.rating;
      ratingCount += 1;
    }
    const dayMs = Date.parse(`${wibDateKey(item.tanggalIso)}T00:00:00.000Z`);
    if (dayMs === todayMs) todayCount += 1;
    if (dayMs >= weekStart && dayMs <= todayMs) weekCount += 1;
  }

  return {
    count: items.length,
    omset,
    tip,
    avgRating: ratingCount ? ratingSum / ratingCount : 0,
    todayCount,
    weekCount,
  };
}

export function ratingComments(items: PerformansiEntry[], limit = 5): RatingComment[] {
  return items
    .filter((item) => typeof item.komentar === 'string' && item.komentar.trim().length > 0)
    .sort((a, b) => Date.parse(b.tanggalIso) - Date.parse(a.tanggalIso))
    .slice(0, limit)
    .map((item) => ({
      rating: item.rating || 0,
      komentar: (item.komentar || '').trim(),
      customerNama: item.customerNama,
      tanggalIso: item.tanggalIso,
    }));
}

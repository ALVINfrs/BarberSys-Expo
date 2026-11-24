/**
 * Agregasi & filter rating — modul murni tanpa import runtime supaya bisa
 * diuji langsung oleh Node (`--experimental-strip-types`).
 */

export interface RatingEntry {
  rating: number;
  komentar: string | null;
  customerNama: string;
  barberNama: string;
  treatmentNama: string;
  tanggalIso: string;
}

export interface RatingSummary {
  avg: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  denganKomentar: number;
}

function hasKomentar(komentar: string | null | undefined): boolean {
  return typeof komentar === 'string' && komentar.trim().length > 0;
}

export function summarizeRatings(items: RatingEntry[]): RatingSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let total = 0;
  let valid = 0;
  let denganKomentar = 0;

  for (const item of items) {
    const bintang = Math.round(item.rating);
    if (bintang >= 1 && bintang <= 5) {
      distribution[bintang as 1 | 2 | 3 | 4 | 5] += 1;
      total += bintang;
      valid += 1;
    }
    if (hasKomentar(item.komentar)) denganKomentar += 1;
  }

  return {
    avg: valid ? total / valid : 0,
    count: items.length,
    distribution,
    denganKomentar,
  };
}

export interface RatingFilter {
  barber?: string | null;
  minRating?: number | null;
}

export function filterRatings(items: RatingEntry[], opts: RatingFilter): RatingEntry[] {
  const barber = opts.barber?.trim() || null;
  const min = opts.minRating && opts.minRating >= 1 && opts.minRating <= 5 ? opts.minRating : null;

  return items.filter((item) => {
    if (barber && item.barberNama !== barber) return false;
    if (min !== null && item.rating < min) return false;
    return true;
  });
}

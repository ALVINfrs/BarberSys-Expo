/**
 * Agregasi dashboard admin — modul murni tanpa import runtime supaya bisa
 * diuji langsung oleh Node (`--experimental-strip-types`).
 */

export interface DashboardTransaction {
  tanggalIso: string;
  total: number;
  barberId: string | null;
  barberNama: string;
  tip: number;
  rating: number | null;
  komentar: string | null;
  customerNama: string;
}

export interface DailyRevenue {
  /** Tanggal WIB "YYYY-MM-DD". */
  iso: string;
  total: number;
}

export interface BarberPerformance {
  barberId: string | null;
  nama: string;
  transaksi: number;
  omset: number;
  tip: number;
  avgRating: number;
}

const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Kunci tanggal WIB (YYYY-MM-DD) dari instant UTC. */
function wibDateKey(iso: string): string {
  return new Date(new Date(iso).getTime() + WIB_MS).toISOString().slice(0, 10);
}

/** Tepat tujuh hari WIB terakhir (termasuk hari ini), lengkap dengan nol. */
export function dailyRevenue(items: DashboardTransaction[], now: Date = new Date()): DailyRevenue[] {
  const todayKey = wibDateKey(now.toISOString());
  const todayMs = Date.parse(`${todayKey}T00:00:00.000Z`);
  const keys: string[] = [];
  const totals = new Map<string, number>();

  for (let i = 6; i >= 0; i -= 1) {
    const key = new Date(todayMs - i * DAY_MS).toISOString().slice(0, 10);
    keys.push(key);
    totals.set(key, 0);
  }

  for (const item of items) {
    const key = wibDateKey(item.tanggalIso);
    if (totals.has(key)) totals.set(key, (totals.get(key) || 0) + item.total);
  }

  return keys.map((iso) => ({ iso, total: totals.get(iso) || 0 }));
}

/** Agregat performa tiap barber, diurut dari omset terbesar. */
export function barberPerformance(items: DashboardTransaction[]): BarberPerformance[] {
  const map = new Map<string, BarberPerformance>();

  for (const item of items) {
    const key = item.barberId || item.barberNama;
    const entry =
      map.get(key) ||
      {
        barberId: item.barberId,
        nama: item.barberNama,
        transaksi: 0,
        omset: 0,
        tip: 0,
        avgRating: 0,
      };
    const prevTotal = entry.avgRating * entry.transaksi;
    entry.transaksi += 1;
    entry.omset += item.total;
    entry.tip += item.tip;
    const rating = typeof item.rating === 'number' && item.rating >= 1 && item.rating <= 5 ? item.rating : 0;
    entry.avgRating = entry.transaksi ? (prevTotal + rating) / entry.transaksi : 0;
    map.set(key, entry);
  }

  return [...map.values()].sort((a, b) => b.omset - a.omset);
}

/** Ulasan terbaru yang punya rating, dibatasi `limit`. */
export function latestRatings(items: DashboardTransaction[], limit = 5): DashboardTransaction[] {
  return items
    .filter((item) => typeof item.rating === 'number' && item.rating >= 1)
    .sort((a, b) => Date.parse(b.tanggalIso) - Date.parse(a.tanggalIso))
    .slice(0, limit);
}

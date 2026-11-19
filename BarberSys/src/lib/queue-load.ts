import type { BarberLoad } from './estimasi';

export interface QueueLoadRow {
  barber_id: string | null;
  queue_count: number | string | null;
  total_menit: number | string | null;
}

/**
 * F4.3 — normalisasi hasil RPC `queue_load_stats()`.
 * RPC berjalan SECURITY DEFINER supaya customer bisa melihat beban agregat
 * semua barber tanpa membuka baris `queue` milik customer lain lewat RLS.
 */
export function mapQueueLoadStats(
  rows: QueueLoadRow[] | null | undefined
): Record<string, BarberLoad> {
  const map: Record<string, BarberLoad> = {};
  for (const row of rows || []) {
    if (!row?.barber_id) continue;
    const count = Number(row.queue_count) || 0;
    const totalMenit = Number(row.total_menit) || 0;
    if (count === 0 && totalMenit === 0) continue;
    const cur = map[row.barber_id] || { count: 0, totalMenit: 0 };
    cur.count += count;
    cur.totalMenit += totalMenit;
    map[row.barber_id] = cur;
  }
  return map;
}

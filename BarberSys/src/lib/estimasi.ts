export interface BarberLoad {
  count: number;
  totalMenit: number;
}

/**
 * F4.3 — estimasi tunggu untuk opsi "Siapa Saja".
 * Opsi ini mengirim customer ke barber dengan beban paling ringan, jadi
 * estimasinya adalah **minimum** beban menit, bukan rata-rata.
 * 0 berarti ada barber yang idle / tidak ada barber tersedia.
 */
export function computeGlobalEstimate(
  barberIds: string[],
  load: Record<string, BarberLoad>
): number {
  if (barberIds.length === 0) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const id of barberIds) {
    min = Math.min(min, load[id]?.totalMenit || 0);
  }
  return min;
}

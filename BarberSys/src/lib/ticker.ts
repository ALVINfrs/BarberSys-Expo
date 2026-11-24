/**
 * Utilitas ticker nomor antrian.
 *
 * Format resmi: 7 -> "A-07", 12 -> "A-12".
 * Sumber tunggal untuk seluruh layar (display TV, customer, kasir).
 */

/** Nomor antrian untuk tampilan: 7 -> "A-07", 12 -> "A-12". */
export function formatQueueNumber(n: number): string {
  const value = Math.max(0, Math.trunc(Number(n) || 0));
  return value < 10 ? `A-0${value}` : `A-${value}`;
}

/** Pecah string ticker menjadi karakter agar bisa dianimasikan satu per satu. */
export function splitQueueNumber(value: string): string[] {
  return Array.from(value);
}

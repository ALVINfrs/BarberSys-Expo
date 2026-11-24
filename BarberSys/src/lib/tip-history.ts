/**
 * Riwayat tip — modul murni untuk agregasi & filter periode WIB.
 * Dipakai layar Tip barber dan seksi "Tip Saya" customer.
 */

export interface TipEntry {
  tanggalIso: string;
  customerNama: string;
  barberNama: string;
  treatmentNama: string;
  jumlah: number;
  nomorAntrian: number;
}

export type TipPeriode = '7' | '30' | 'semua';

export interface TipSummary {
  count: number;
  total: number;
  rataRata: number;
  terbesar: number;
}

export interface TipByBarber {
  barberNama: string;
  total: number;
  count: number;
}

const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function wibDayMs(iso: string): number {
  const shifted = new Date(new Date(iso).getTime() + WIB_MS).toISOString().slice(0, 10);
  return Date.parse(`${shifted}T00:00:00.000Z`);
}

export function summarizeTips(items: TipEntry[]): TipSummary {
  const total = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  return {
    count: items.length,
    total,
    rataRata: items.length ? total / items.length : 0,
    terbesar: items.reduce((max, item) => Math.max(max, item.jumlah || 0), 0),
  };
}

export function filterTipsByPeriode(
  items: TipEntry[],
  periode: TipPeriode,
  now: Date = new Date()
): TipEntry[] {
  if (periode === 'semua') return items;
  const today = wibDayMs(now.toISOString());
  const days = periode === '7' ? 7 : 30;
  const start = today - (days - 1) * DAY_MS;
  return items.filter((item) => {
    const day = wibDayMs(item.tanggalIso);
    return day >= start && day <= today;
  });
}

export function tipByBarber(items: TipEntry[]): TipByBarber[] {
  const map = new Map<string, TipByBarber>();
  for (const item of items) {
    const nama = item.barberNama || 'Barber Toko';
    const entry = map.get(nama) || { barberNama: nama, total: 0, count: 0 };
    entry.total += item.jumlah || 0;
    entry.count += 1;
    map.set(nama, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

import { QueueItem } from '@/types/database';

export function getOccupiedKursi(queueList: Pick<QueueItem, 'kursi_nomor' | 'status'>[]): Set<number> {
  const s = new Set<number>();
  for (const q of queueList) {
    if (q.kursi_nomor != null && (q.status === 'dipanggil' || q.status === 'dilayani')) {
      s.add(q.kursi_nomor);
    }
  }
  return s;
}

export function getAvailableKursi(jumlahKursi: number, occupied: Set<number>): number[] {
  const out: number[] = [];
  for (let i = 1; i <= jumlahKursi; i++) if (!occupied.has(i)) out.push(i);
  return out;
}

export function formatKursi(nomor: number | null | undefined): string | null {
  if (nomor == null) return null;
  return `Kursi ${nomor}`;
}

import type { QueueMyStatus } from '../types/database';

/**
 * F5.3 — logika murni notifikasi lokal customer.
 * Tidak menyentuh `expo-notifications`, storage, atau realtime.
 */

export type NotificationKind = 'hampir' | 'dipanggil';

/** Antrian ditahan bila `hold_until` masih di masa depan. */
export function isQueueHeld(
  row: Pick<QueueMyStatus, 'hold_until'>,
  nowMs: number = Date.now()
): boolean {
  if (!row.hold_until) return false;
  const ms = new Date(row.hold_until).getTime();
  return Number.isFinite(ms) && ms > nowMs;
}

/**
 * Tentukan notifikasi yang layak dikirim.
 * - hold aktif → tidak ada
 * - status `dipanggil` dengan `called_at` baru → `dipanggil`
 * - status `menunggu` dengan sisa ≤ 1 → `hampir`
 */
export function decideNotification(
  current: QueueMyStatus | null,
  previous: QueueMyStatus | null,
  nowMs: number = Date.now()
): NotificationKind | null {
  if (!current) return null;
  if (isQueueHeld(current, nowMs)) return null;

  if (current.status === 'dipanggil') {
    const alreadyNotified =
      previous?.status === 'dipanggil' && previous.called_at === current.called_at;
    return alreadyNotified ? null : 'dipanggil';
  }

  if (current.status === 'menunggu') {
    const ahead = Number(current.position_ahead);
    if (Number.isFinite(ahead) && ahead <= 1) return 'hampir';
  }

  return null;
}

/** Kunci dedupe persisten (AsyncStorage). */
export function notificationKey(kind: NotificationKind, row: QueueMyStatus): string {
  if (kind === 'dipanggil') {
    return `dipanggil:${row.id}:${row.called_at || '-'}`;
  }
  return `hampir:${row.id}`;
}

function formatNomor(nomor: number): string {
  const n = Math.max(0, Math.trunc(Number(nomor) || 0));
  return n < 10 ? `A-0${n}` : `A-${n}`;
}

export function notificationCopy(
  kind: NotificationKind,
  row: QueueMyStatus
): { title: string; body: string } {
  const nomor = formatNomor(row.nomor_antrian);

  if (kind === 'dipanggil') {
    const tujuan = row.kursi_nomor != null ? `kursi ${row.kursi_nomor}` : 'kasir';
    const barber = row.barber_nama ? ` • Barber ${row.barber_nama}` : '';
    return {
      title: 'Giliranmu tiba!',
      body: `No. ${nomor} — silakan menuju ${tujuan}${barber}.`,
    };
  }

  const ahead = Number(row.position_ahead);
  return {
    title: 'Hampir giliranmu',
    body:
      Number.isFinite(ahead) && ahead <= 0
        ? `No. ${nomor} — kamu antrian berikutnya.`
        : `No. ${nomor} — tinggal 1 antrian lagi.`,
  };
}

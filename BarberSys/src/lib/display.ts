/**
 * F5.1 — logika murni layar Display TV.
 *
 * Modul ini sengaja tidak mengimpor modul lain (selain tipe) supaya bisa
 * diuji langsung dengan Node `--experimental-strip-types` tanpa resolver
 * tambahan. Konstanta WIB diduplikasi kecil di sini; sumber kebenaran tetap
 * `src/lib/waktu.ts` untuk kode aplikasi lain.
 */

export type DisplayStatus = 'menunggu' | 'dipanggil' | 'dilayani';

export interface DisplayRow {
  queue_id: string;
  nomor_antrian: number;
  status: DisplayStatus;
  hold_until: string | null;
  barber_nama: string | null;
  kursi_nomor: number | null;
  created_at: string;
  called_at: string | null;
}

export interface DisplaySnapshot {
  /** Antrian yang sedang dipanggil/dilayani, urut panggilan terlama. */
  called: DisplayRow[];
  /** Maksimal N antrian menunggu berikutnya (hold aktif tidak dihitung). */
  next: DisplayRow[];
  /** Seluruh antrian menunggu yang tidak sedang ditahan. */
  waitingCount: number;
}

export const DISPLAY_NEXT_LIMIT = 5;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const STATUS_RANK: Record<'dipanggil' | 'dilayani', number> = {
  dipanggil: 0,
  dilayani: 1,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Nomor antrian untuk layar: 2 -> "A-02", 12 -> "A-12". */
export function formatNomorAntrian(nomor: number): string {
  const n = Math.max(0, Math.trunc(Number(nomor) || 0));
  return n < 10 ? `A-0${n}` : `A-${n}`;
}

/** Antrian ditahan bila `hold_until` masih di masa depan. */
export function isHeld(
  row: { hold_until: string | null },
  nowMs: number = Date.now()
): boolean {
  if (!row.hold_until) return false;
  const ms = new Date(row.hold_until).getTime();
  return Number.isFinite(ms) && ms > nowMs;
}

function timeOf(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

function createdAtAsc(a: DisplayRow, b: DisplayRow): number {
  const ta = timeOf(a.created_at);
  const tb = timeOf(b.created_at);
  if (ta !== tb) return ta - tb;
  return a.nomor_antrian - b.nomor_antrian;
}

function calledAsc(a: DisplayRow, b: DisplayRow): number {
  const ra = STATUS_RANK[a.status as 'dipanggil' | 'dilayani'] ?? 9;
  const rb = STATUS_RANK[b.status as 'dipanggil' | 'dilayani'] ?? 9;
  if (ra !== rb) return ra - rb;
  const ta = timeOf(a.called_at);
  const tb = timeOf(b.called_at);
  if (ta !== tb) return ta - tb;
  return a.nomor_antrian - b.nomor_antrian;
}

/**
 * Ubah baris `queue_display` menjadi tiga kelompok tampilan.
 * Baris dengan hold aktif tidak pernah masuk `next`/`waitingCount`.
 */
export function buildDisplaySnapshot(
  rows: DisplayRow[],
  nowMs: number = Date.now(),
  nextLimit: number = DISPLAY_NEXT_LIMIT
): DisplaySnapshot {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];

  const called = safeRows
    .filter((r) => r.status === 'dipanggil' || r.status === 'dilayani')
    .sort(calledAsc);

  const waiting = safeRows
    .filter((r) => r.status === 'menunggu' && !isHeld(r, nowMs))
    .sort(createdAtAsc);

  const limit = Math.max(0, Math.trunc(nextLimit) || 0);
  return {
    called,
    next: waiting.slice(0, limit),
    waitingCount: waiting.length,
  };
}

/** Jam dinding WIB "HH:MM:SS" tanpa bergantung timezone device. */
export function formatClockWIB(now: Date = new Date()): string {
  const clock = new Date(now.getTime() + WIB_OFFSET_MS);
  return `${pad2(clock.getUTCHours())}:${pad2(clock.getUTCMinutes())}:${pad2(
    clock.getUTCSeconds()
  )}`;
}

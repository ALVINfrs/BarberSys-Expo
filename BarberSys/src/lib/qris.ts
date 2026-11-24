/**
 * Fase 6 (F6.1–F6.5) — payload QRIS dummy.
 *
 * Modul murni tanpa import runtime Supabase/React agar bisa diuji langsung
 * oleh Node (`--experimental-strip-types`). QR hanya membawa JSON tervalidasi;
 * tidak ada gateway finansial nyata. Verifikasi kepemilikan, status antrian,
 * dan total tetap dilakukan terhadap database sebelum customer boleh membayar.
 */

/** QR berlaku 30 menit (PRD §13.4). */
export const QRIS_QR_MAX_AGE_MS = 30 * 60 * 1000;

/** Toleransi jam perangkat customer yang lebih cepat dari kasir. */
const QRIS_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface QrisPayload {
  queueId: string;
  total: number;
  kodeTransaksi: string;
  timestamp: number;
}

export type QrisParseResult =
  | { ok: true; payload: QrisPayload }
  | { ok: false; code: 'format' | 'fields' | 'expired'; message: string };

export function kodeTransaksiFromId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function nonNegative(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function computeQueueTotal(
  treatmentHarga: number | null | undefined,
  products: Array<{ subtotal: number }>,
  tip: number
): number {
  const productsTotal = products.reduce(
    (sum, product) => sum + nonNegative(product?.subtotal),
    0
  );
  return nonNegative(treatmentHarga) + productsTotal + nonNegative(tip);
}

export function buildQrisPayload(input: {
  queueId: string;
  total: number;
  kodeTransaksi: string;
  timestamp?: number;
}): QrisPayload {
  return {
    queueId: input.queueId,
    total: input.total,
    kodeTransaksi: input.kodeTransaksi,
    timestamp: input.timestamp ?? Date.now(),
  };
}

export function encodeQrisPayload(payload: QrisPayload): string {
  return JSON.stringify({
    queueId: payload.queueId,
    total: payload.total,
    kodeTransaksi: payload.kodeTransaksi,
    timestamp: payload.timestamp,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseQrisPayload(raw: string, now: number = Date.now()): QrisParseResult {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      code: 'format',
      message: 'QR tidak dikenali. Pastikan memindai QR pembayaran BarberSys.',
    };
  }

  if (!isRecord(decoded)) {
    return {
      ok: false,
      code: 'fields',
      message: 'Isi QR tidak valid. Minta kasir menampilkan ulang QR.',
    };
  }

  const { queueId, total, kodeTransaksi, timestamp } = decoded;
  const fieldsValid =
    typeof queueId === 'string' &&
    queueId.trim().length > 0 &&
    typeof total === 'number' &&
    Number.isInteger(total) &&
    total >= 0 &&
    typeof kodeTransaksi === 'string' &&
    kodeTransaksi.trim().length > 0 &&
    typeof timestamp === 'number' &&
    Number.isFinite(timestamp) &&
    timestamp > 0;

  if (!fieldsValid) {
    return {
      ok: false,
      code: 'fields',
      message: 'Data QR tidak lengkap atau tidak valid. Minta kasir menampilkan ulang QR.',
    };
  }

  if (timestamp - now > QRIS_FUTURE_TOLERANCE_MS) {
    return {
      ok: false,
      code: 'fields',
      message: 'Waktu pada QR tidak valid. Periksa jam perangkat lalu minta QR baru.',
    };
  }

  if (now - timestamp > QRIS_QR_MAX_AGE_MS) {
    return {
      ok: false,
      code: 'expired',
      message: 'QR sudah kedaluwarsa (berlaku 30 menit). Minta kasir menampilkan QR baru.',
    };
  }

  return {
    ok: true,
    payload: { queueId, total, kodeTransaksi, timestamp },
  };
}

/**
 * Fase 6 — pemetaan data pembayaran ke `ReceiptData` (F3.4).
 *
 * Modul murni tanpa import runtime (hanya type import) agar bisa diuji Node
 * `--experimental-strip-types`, sama seperti `receipt.ts`. Aturan total dan
 * kode transaksi sengaja ditulis ulang dari `qris.ts`; keduanya harus tetap
 * identik agar struk dan QRIS tidak berbeda. Test `test-payment-receipt.mjs`
 * menjaga nilai literalnya.
 */

import type { ReceiptData } from './receipt';

export interface PaymentReceiptItem {
  nama: string;
  qty: number;
  subtotal: number;
}

export interface PaymentReceiptInput {
  queueId: string;
  nomorAntrian: number;
  customerNama: string;
  barberNama: string;
  kasirNama: string;
  kursiNomor: number | null;
  treatmentNama: string | null;
  treatmentHarga: number | null;
  items: PaymentReceiptItem[];
  tipAmount: number;
  metode: 'tunai' | 'qris';
  nowIso: string;
  instruksi: string | null;
  toko: {
    nama: string | null;
    alamat: string | null;
    jamBuka: string | null;
    jamTutup: string | null;
  };
  logoBase64: string;
}

function nonNegative(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function buildPaymentReceipt(input: PaymentReceiptInput): ReceiptData {
  const productsTotal = input.items.reduce(
    (sum, item) => sum + nonNegative(item.subtotal),
    0
  );
  const total = nonNegative(input.treatmentHarga) + productsTotal + nonNegative(input.tipAmount);

  return {
    nomor_antrian: input.nomorAntrian,
    customerNama: input.customerNama,
    barberNama: input.barberNama,
    kasirNama: input.kasirNama,
    kursiNomor: input.kursiNomor,
    treatmentNama: input.treatmentNama,
    treatmentHarga: input.treatmentHarga,
    items: input.items.map((item) => ({
      nama: item.nama,
      qty: item.qty,
      subtotal: item.subtotal,
    })),
    total,
    tipAmount: input.tipAmount || null,
    metode: input.metode,
    tanggal: new Date(input.nowIso).toLocaleString('id-ID'),
    tokoNama: input.toko.nama,
    tokoAlamat: input.toko.alamat,
    jamBuka: input.toko.jamBuka,
    jamTutup: input.toko.jamTutup,
    kodeTransaksi: input.queueId.slice(0, 8).toUpperCase(),
    instruksi: input.instruksi,
    logoBase64: input.logoBase64,
  };
}

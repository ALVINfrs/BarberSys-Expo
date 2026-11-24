/**
 * Pemetaan baris database (`queue`, `queue_products`, `barbershop_settings`)
 * menjadi input `buildPaymentReceipt`. Modul murni tanpa import runtime
 * Supabase/native supaya aturan tanggal `completed_at` dan fallback nama bisa
 * diuji Node (`--experimental-strip-types`).
 */

import type { PaymentReceiptInput } from './payment-receipt';

export interface ReceiptQueueRow {
  id: string;
  nomor_antrian: number;
  nama_customer: string | null;
  kasir_id: string | null;
  kursi_nomor: number | null;
  instruksi_potongan: string | null;
  tip_amount: number | null;
  metode_bayar: 'tunai' | 'qris' | null;
  completed_at: string | null;
  created_at: string;
  treatments: { nama: string | null; harga: number | null } | null;
  customer: { nama: string | null } | null;
  barber: { nama: string | null } | null;
}

export interface ReceiptProductRow {
  qty: number;
  subtotal: number;
  products: { nama: string | null } | null;
}

export interface ReceiptShopRow {
  nama_toko: string | null;
  alamat: string | null;
  jam_buka: string | null;
  jam_tutup: string | null;
}

export interface ReceiptRowInput {
  queue: ReceiptQueueRow;
  products: ReceiptProductRow[];
  shop?: ReceiptShopRow | null;
  kasirNama?: string | null;
  logoBase64: string;
}

/**
 * Struk cetak ulang memakai waktu transaksi asli (`completed_at`), bukan waktu
 * cetak. Data lama tanpa `completed_at` memakai `created_at`.
 */
export function buildReceiptInputFromQueueRows(input: ReceiptRowInput): PaymentReceiptInput {
  const q = input.queue;
  const shop = input.shop || null;

  return {
    queueId: q.id,
    nomorAntrian: q.nomor_antrian,
    customerNama: q.customer?.nama || q.nama_customer || 'Pelanggan',
    barberNama: q.barber?.nama || 'Barber Toko',
    kasirNama: input.kasirNama?.trim() || 'Kasir',
    kursiNomor: q.kursi_nomor ?? null,
    treatmentNama: q.treatments?.nama || null,
    treatmentHarga: q.treatments?.harga ?? null,
    items: input.products.map((row) => ({
      nama: row.products?.nama || 'Produk',
      qty: row.qty,
      subtotal: row.subtotal,
    })),
    tipAmount: q.tip_amount || 0,
    metode: q.metode_bayar === 'qris' ? 'qris' : 'tunai',
    nowIso: q.completed_at || q.created_at,
    instruksi: q.instruksi_potongan || null,
    toko: {
      nama: shop?.nama_toko || null,
      alamat: shop?.alamat || null,
      jamBuka: shop?.jam_buka || null,
      jamTutup: shop?.jam_tutup || null,
    },
    logoBase64: input.logoBase64,
  };
}

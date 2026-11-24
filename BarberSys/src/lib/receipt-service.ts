/**
 * Loader data struk cetak ulang. Satu tempat untuk mengambil transaksi asli
 * (`completed_at`, `kasir_id`), produk, toko, dan profil kasir.
 */

import { supabase } from './supabase';
import type { ReceiptData } from './receipt';
import { buildPaymentReceipt } from './payment-receipt';
import { DEFAULT_LOGO_BASE64 } from './receipt-logo';
import {
  buildReceiptInputFromQueueRows,
  type ReceiptProductRow,
  type ReceiptQueueRow,
  type ReceiptShopRow,
} from './receipt-row';

const QUEUE_SELECT =
  'id, nomor_antrian, nama_customer, kasir_id, kursi_nomor, instruksi_potongan, ' +
  'tip_amount, metode_bayar, completed_at, created_at, treatments(nama, harga), ' +
  'customer:profiles!queue_user_id_fkey(nama), barber:profiles!queue_barber_id_fkey(nama)';

export async function loadReceiptForQueue(queueId: string): Promise<ReceiptData> {
  const { data: queueData, error: queueError } = await supabase
    .from('queue')
    .select(QUEUE_SELECT)
    .eq('id', queueId)
    .single();

  if (queueError) throw new Error(`Gagal memuat transaksi: ${queueError.message}`);
  const queue = queueData as unknown as ReceiptQueueRow | null;
  if (!queue) throw new Error('Transaksi tidak ditemukan.');

  const [productsResult, shopResult] = await Promise.all([
    supabase
      .from('queue_products')
      .select('qty, subtotal, products(nama)')
      .eq('queue_id', queueId),
    supabase
      .from('barbershop_settings')
      .select('nama_toko, alamat, jam_buka, jam_tutup')
      .limit(1)
      .maybeSingle(),
  ]);

  if (productsResult.error) {
    throw new Error(`Gagal memuat produk transaksi: ${productsResult.error.message}`);
  }

  let kasirNama: string | null = null;
  if (queue.kasir_id) {
    const { data: kasir } = await supabase
      .from('profiles')
      .select('nama')
      .eq('id', queue.kasir_id)
      .maybeSingle();
    kasirNama = (kasir as { nama?: string } | null)?.nama || null;
  }

  return buildPaymentReceipt(
    buildReceiptInputFromQueueRows({
      queue,
      products: (productsResult.data as unknown as ReceiptProductRow[]) || [],
      shop: (shopResult.data as unknown as ReceiptShopRow | null) || null,
      kasirNama,
      logoBase64: DEFAULT_LOGO_BASE64,
    })
  );
}

export type UserRole = 'customer' | 'barber' | 'kasir' | 'admin';
export type AccountStatus = 'aktif' | 'nonaktif';
export type WorkStatus = 'aktif' | 'istirahat';
export type QueueStatus = 'menunggu' | 'dipanggil' | 'dilayani' | 'selesai' | 'lunas' | 'dibatalkan';
/** Status yang boleh tampil di layar publik Display TV. */
export type QueueDisplayStatus = 'menunggu' | 'dipanggil' | 'dilayani';

export interface Profile {
  id: string;
  nama: string;
  email: string | null;
  no_hp: string | null;
  role: UserRole;
  status_akun: AccountStatus;
  status_kerja: WorkStatus | null;
  foto_url: string | null;
  created_at: string;
}

export interface Treatment {
  id: string;
  nama: string;
  harga: number;
  durasi_menit: number;
  deskripsi: string | null;
  foto_url: string | null;
  aktif: boolean;
}

export interface Product {
  id: string;
  nama: string;
  harga: number;
  kategori: string | null;
  foto_url: string | null;
  aktif: boolean;
}

export interface QueueItem {
  id: string;
  nomor_antrian: number;
  user_id: string | null;
  nama_customer: string | null;
  barber_id: string | null;
  kasir_id: string | null;
  treatment_id: string | null;
  kursi_nomor: number | null;
  status: QueueStatus;
  instruksi_potongan: string | null;
  rating: number | null;
  komentar: string | null;
  tip_amount: number;
  metode_bayar: 'tunai' | 'qris' | null;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
  hold_until: string | null;
}

export interface QueueProduct {
  id: string;
  queue_id: string;
  product_id: string | null;
  qty: number;
  subtotal: number;
}

/**
 * F5.1/B16 — proyeksi publik `queue` untuk Display TV.
 * Hanya kolom aman; tidak memuat data pribadi customer.
 */
export interface QueueDisplay {
  queue_id: string;
  nomor_antrian: number;
  status: QueueDisplayStatus;
  hold_until: string | null;
  barber_nama: string | null;
  kursi_nomor: number | null;
  created_at: string;
  called_at: string | null;
  updated_at: string;
}

export interface BarbershopSettings {
  id: string;
  nama_toko: string | null;
  alamat: string | null;
  jam_buka: string;
  jam_tutup: string;
  jumlah_kursi: number;
}

/** F5.3 — hasil RPC `queue_my_status()` untuk customer yang login. */
export interface QueueMyStatus {
  id: string;
  nomor_antrian: number;
  status: QueueStatus;
  barber_id: string | null;
  barber_nama: string | null;
  called_at: string | null;
  hold_until: string | null;
  kursi_nomor: number | null;
  position_ahead: number | null;
}

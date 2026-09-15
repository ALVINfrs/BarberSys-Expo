export type UserRole = 'customer' | 'barber' | 'kasir' | 'admin';
export type AccountStatus = 'aktif' | 'nonaktif';
export type WorkStatus = 'aktif' | 'istirahat';
export type QueueStatus = 'menunggu' | 'dipanggil' | 'dilayani' | 'selesai' | 'lunas' | 'dibatalkan';

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
  aktif: boolean;
}

export interface QueueItem {
  id: string;
  nomor_antrian: number;
  user_id: string | null;
  barber_id: string | null;
  kasir_id: string | null;
  treatment_id: string | null;
  status: QueueStatus;
  rating: number | null;
  komentar: string | null;
  tip_amount: number;
  metode_bayar: 'tunai' | 'qris' | null;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

export interface BarbershopSettings {
  id: string;
  jam_buka: string;
  jam_tutup: string;
}

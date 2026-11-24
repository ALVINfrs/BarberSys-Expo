# BarberSys — Riwayat & Struk, Rating Admin, Dashboard, Menu Barber, Display Web — Design Spec

**Tanggal:** 24 November 2026
**Status:** Disetujui lewat brainstorming (24 Nov 2026)
**Ruang lingkup:** 5 pekerjaan lanjutan setelah Fase 6
**Bukan bagian dari spec ini:** perubahan skema DB, printer thermal fisik, remote push, payment gateway nyata

---

## 1. Intent

Melengkapi BarberSys agar alur uang dan umpan balik tidak berhenti di layar pembayaran:

1. Kasir dan barber bisa menelusuri transaksi lunas dan mencetak ulang struk.
2. Admin bisa melihat siapa yang memberi rating, nilainya, dan komentarnya.
3. Dashboard admin memberi gambaran operasional, bukan hanya empat angka.
4. Barber punya menu kerja yang layak, bukan hanya tugas dan profil.
5. Display TV keluar dari bundel Expo menjadi web ringan, dengan pengumuman Bahasa Indonesia yang bisa diandalkan.

Urutan pengerjaan yang disetujui: **riwayat & struk → rating admin → dashboard admin → menu barber → display web**. Satu pekerjaan diselesaikan dan diuji sebelum pindah ke berikutnya.

## 2. Pengguna & momen penting

- **Kasir:** pelanggan kembali dan minta bukti bayar; kasir membuka Riwayat, memilih transaksi, lalu mencetak atau membagikan PDF.
- **Barber:** ingin membuktikan tugas yang sudah diselesaikan dan mencetak struk untuk pelanggannya sendiri.
- **Admin:** ingin tahu barber mana yang mendapat rating rendah dan membaca komentarnya untuk tindak lanjut.
- **Barber:** ingin melihat performa dan rating dirinya tanpa harus bertanya ke admin.
- **Display TV:** dipasang di ruang tunggu, hanya butuh browser dan suara Indonesia.

## 3. Goals

1. Riwayat kasir bisa difilter per hari, dengan ringkasan omset/tunai/QRIS/tip.
2. Struk cetak ulang identik dengan transaksi asli: tanggal `completed_at` dan kasir dari `kasir_id`.
3. Barber hanya bisa melihat dan mencetak antrian yang ia layani.
4. Admin bisa memfilter rating per barber, periode, dan nilai; melihat komentar serta pemberi rating.
5. Dashboard admin memuat rating terbaru, performa barber, tren omset 7 hari, antrian live, dan transaksi terbaru.
6. Menu barber bertambah: Riwayat, Performa (rating + statistik), dan pengaturan/istirahat yang mudah ditemukan.
7. Display TV berjalan sebagai aplikasi React + Vite terpisah, memakai Supabase Realtime, dengan TTS `id-ID` dan panduan bila voice tidak tersedia.

## 4. Non-goals

- Tidak menambah tabel/kolom baru. Semua data sudah ada di `queue`, `queue_products`, `profiles`, dan `barbershop_settings`.
- Tidak mengubah alur panggil → layani → bayar → display.
- Tidak menambah dependency baru di aplikasi Expo untuk pekerjaan 1–4.
- Tidak memakai cloud TTS berbayar atau file audio rekaman.
- Tidak mengubah Display TV menjadi tema terang.
- Tidak membuat printer thermal; struk tetap PDF.
- Tidak melakukan commit/push tanpa perintah eksplisit.

## 5. Anti-goals

- Riwayat yang hanya menampilkan ID transaksi tanpa nama, jam, dan nominal.
- Tombol cetak yang membuka dialog kosong atau file yang tidak bisa dibagikan.
- Dashboard yang penuh angka tetapi tidak bisa ditindaklanjuti.
- Tab bar dengan tujuh menu yang berdesakan.
- Display yang bergantung pada klik manual setiap kali ada panggilan.

## 6. Keputusan yang sudah disetujui user

| Topik | Keputusan |
|---|---|
| Urutan | Riwayat & struk lebih dulu |
| Riwayat kasir | Tab baru "Riwayat", default hari ini, filter tanggal |
| Akses barber | Hanya antrian yang ia layani |
| Display | React + Vite, terpisah dari Expo |
| Suara | TTS browser `id-ID` + peringatan bila tidak tersedia |
| Menu barber | Riwayat, rating & komentar, statistik, jadwal/istirahat, pengaturan |
| Dashboard admin | Rating terbaru, performa barber, grafik omset 7 hari, antrian live, transaksi terbaru |
| Struk ulang | Tanggal & kasir asli dari transaksi |

## 7. Pekerjaan 1 — Riwayat & Struk

### 7.1 Kasir

- Tab baru `kasir/(tabs)/riwayat.tsx`; tab bar menjadi Antrian, Pembayaran, Riwayat, Profil.
- Default hari ini. Navigasi hari memakai tombol ← → dan tombol "Hari Ini"; tidak menambah date-picker native.
- Kartu ringkasan: jumlah transaksi, total omset, total tunai, total QRIS, total tip.
- Daftar transaksi `lunas` pada rentang hari WIB: jam, nomor antrian, customer, barber, treatment, total, metode.
- Ketuk baris → lembar detail dengan rincian treatment + produk + tip + total.
- Aksi: **Cetak** (`Print.printAsync`) dan **Bagikan PDF** (`sharePdfFromHtml`).

### 7.2 Barber

- Tab baru `barber/riwayat.tsx`.
- Query wajib `barber_id = user.id` dan `status = 'lunas'`.
- Detail dan aksi struk sama dengan kasir.

### 7.3 Aturan struk

- `tanggal` memakai `completed_at` transaksi, bukan waktu cetak ulang.
- `kasirNama` diambil dari profil `queue.kasir_id`; fallback "Kasir".
- `customerNama` dari profil customer atau `nama_customer` (walk-in).
- `barberNama` dari profil barber; fallback "Barber Toko".
- Produk dari `queue_products`; treatment dan tip dari `queue`.
- Logo memakai `DEFAULT_LOGO_BASE64` yang sudah ada.

### 7.4 Perbaikan sharing di Expo Go

Akar masalah: `expo-print` menulis PDF ke cache global Expo Go, sedangkan `expo-sharing` hanya mengizinkan cache milik experience. Solusi: minta `printToFileAsync({ base64: true })`, tulis base64 ke `FileSystem.cacheDirectory` (scoped), lalu bagikan URI tersebut. Helper ini juga dipakai layar Pembayaran dan Laporan admin.

### 7.5 Perbaikan ekspor XLSX

`import('xlsx')` di Metro/Hermes menghasilkan `Requiring unknown module "2333"`. Ganti dengan import statis `import * as XLSX from 'xlsx'` agar modul ikut bundle utama. Bila static import ternyata bermasalah, fallback ke ekspor CSV tanpa dependency, tetapi keputusan itu harus dicatat.

## 8. Pekerjaan 2 — Rating & Komentar Admin

- Layar baru `admin/rating.tsx` di Stack admin (bukan tab tambahan agar tab bar tidak berdesakan), dapat dibuka dari Ringkasan dan Laporan.
- Ringkasan: rata-rata, jumlah rating, distribusi 5→1.
- Filter: barber, periode (hari/minggu/bulan/semua), nilai rating.
- Daftar: nama customer, nama barber, bintang, komentar, treatment, tanggal, tip (jika ada).
- Empty state jelas bila belum ada rating.
- Tidak ada perubahan DB; query `queue` dengan `rating not null`.

## 9. Pekerjaan 3 — Dashboard Admin

Tambahan di `admin/ringkasan.tsx`:

- Rating terbaru + komentar (3–5 terbaru).
- Performa barber: rata-rata rating, jumlah pelanggan, pendapatan, tip.
- Grafik omset 7 hari memakai bar sederhana dari `View`; tanpa library chart.
- Antrian live & status kursi.
- Transaksi terbaru.
- Pintasan ke Laporan, Rating, Pegawai, dan Display.

Realtime `queue` dan `profiles` tetap dipakai; hindari query berlebihan dengan satu putaran `Promise.all`.

## 10. Pekerjaan 4 — Menu Barber

Struktur yang dipilih: **4 tab** agar tidak berdesakan.

1. **Tugas** — antrian aktif + toggle istirahat + jam operasional.
2. **Riwayat** — antrian lunas milik barber + struk.
3. **Performa** — rating & komentar saya + statistik harian/mingguan.
4. **Profil** — edit profil + pengaturan akun.

"Jadwal/istirahat" ditempatkan di Tugas (toggle) dan Profil (info jam toko), bukan tab terpisah. "Pengaturan" menjadi bagian Profil. Ini memenuhi lima kebutuhan user tanpa tujuh tab.

## 11. Pekerjaan 5 — Display TV Web

- Folder baru `display-tv/` berisi React + Vite + TypeScript.
- Konfigurasi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
- Sumber data: `queue_display` via Supabase Realtime + polling fallback.
- Tampilan: jam WIB, daftar antrian aktif, highlight panggilan terbaru, ticker, dark theme.
- Suara:
  - `speechSynthesis` dengan voice `id-ID` yang bisa dipilih.
  - Tombol "Aktifkan Suara" pada kunjungan pertama (autoplay policy).
  - Tombol "Tes Suara" dan pemilih voice disimpan di `localStorage`.
  - Banner peringatan bila tidak ada voice `id-ID`, berisi instruksi pemasangan.
  - Dedupe pengumuman per `queue_id + called_at`.
- Expo `/display` tetap ada sebagai fallback sampai web terbukti stabil; tidak dihapus pada langkah pertama.
- Tidak memakai `expo export`; verifikasi memakai `npm run dev` Vite.

## 12. Constraints & risks

- RLS tetap berlaku; jangan memakai service role di client.
- Data lama mungkin tidak punya `kasir_id`/`completed_at`; semua layar harus fallback tanpa crash.
- `expo-sharing` di Expo Go tidak boleh diberi URI dari cache global; selalu tulis ulang ke scoped cache.
- Jangan memanggil `Print.printAsync` bersamaan dengan `shareAsync`; satu aksi satu proses.
- Uji runtime di Expo Go untuk Android; jangan mengandalkan typecheck saja.
- Tidak ada commit sampai user memerintahkan.

## 13. Success criteria

- Kasir dapat membuka Riwayat, mengganti hari, melihat ringkasan, mencetak, dan membagikan PDF tanpa error.
- Barber hanya melihat antrian sendiri dan bisa mencetak struk.
- Admin dapat melihat daftar rating lengkap dengan komentar dan pemberi rating.
- Dashboard admin menampilkan lima blok baru dan tetap ringan.
- Barber memiliki empat tab yang berfungsi.
- Display web menerima panggilan baru dalam hitungan detik dan mengumumkannya dalam Bahasa Indonesia.

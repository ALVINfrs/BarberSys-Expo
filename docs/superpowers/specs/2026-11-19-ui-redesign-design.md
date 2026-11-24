# BarberSys UI 2.0 — Design Spec

**Tanggal:** 19 November 2026
**Status:** Disetujui user (brainstorming 19 Nov 2026)
**Ruang lingkup:** Semua layar aplikasi (auth, customer, barber, kasir, admin) + Display TV
**Bukan bagian dari spec ini:** Fase 6 QRIS (lihat `docs/prd .md` §13.4)

---

## 1. Intent

BarberSys naik dari "mockup Stitch yang diimplementasikan" menjadi produk dengan identitas visual sendiri: **neo-brutalism editorial** — tegas, hangat, premium, dan hidup. Struktur & alur tetap; yang berubah adalah sistem visual, komponen, dan motion.

Stitch tetap menjadi inspirasi struktur, bukan acuan pixel. `docs/design.md` lama tetap menjadi basis token; spec ini memperluasnya.

## 2. Pengguna & momen penting

- **Customer:** login cepat, melihat layanan, mengambil antrian, memantau status, membayar, melihat riwayat.
- **Barber:** melihat tugas, menandai layanan, mengatur istirahat.
- **Kasir:** mengelola antrian, memanggil, membayar, mencetak struk.
- **Admin:** ringkasan, layanan, produk, pegawai, laporan.
- **Display TV:** dibaca dari jauh, selalu dark, tanpa interaksi selain aktivasi suara.

## 3. Goals

1. Satu sistem visual yang konsisten di semua role dan dua mode tema.
2. Login/register terasa seperti pintu masuk brand, bukan form template.
3. Motion terasa hidup tapi tidak mengganggu; ada momen ekspresif di titik kepuasan.
4. Semua layar lama tetap berfungsi; tidak ada regresi logika/DB.
5. Toggle tema terasa seperti sakelar lampu rumah, tersimpan, dan mudah ditemukan.

## 4. Non-goals

- Tidak mengubah alur bisnis, RLS, skema DB, atau fitur terkunci.
- Tidak menambah fitur baru di luar animasi/visual (kecuali menu Tampilan).
- Tidak mengubah Display TV menjadi terang.
- Tidak mengerjakan remote push (B17), QRIS (plan terpisah), atau Google OAuth.

## 5. Anti-goals

- Terlalu banyak warna sampai tidak ada hierarki.
- Animasi lambat/berlebihan yang membuat form terasa berat.
- Bayangan lembut ala SaaS generik atau gradien.
- Kartu serba membulat sehingga karakter brutalist hilang.

## 6. Palet

| Token | Light | Dark | Pemakaian |
|---|---|---|---|
| `bg` | `#FCF9F8` | `#121214` | Latar layar |
| `paper` | `#F4EFE9` | `#1E1E22` | Panel brand / section |
| `surface` | `#FFFFFF` | `#1B1B1F` | Kartu |
| `surfaceContainerLow` | `#F6F3F2` | `#1E1E22` | Kartu sekunder |
| `surfaceContainerHigh` | `#EBE7E7` | `#313136` | Chip / stepper |
| `ink` | `#111111` | `#F5F3EE` | Teks & border |
| `inkMuted` | `#5A5A55` | `#A8A6A0` | Teks sekunder |
| `crimson` | `#D7263D` | `#FF5164` | Aksi utama |
| `cobalt` | `#1C4ED8` | `#5B85FF` | Sekunder / tautan |
| `amber` | `#F5B700` | `#FFCB3C` | Highlight / badge |
| `success` | `#2BA84A` | `#4CD97A` | Tersedia / lunas |
| `danger` | `#D7263D` | `#FF5164` | Error / batal |
| `shadow` | `#111111` | `#000000` | Hard shadow |
| `shadowAccent` | `#F5B700` | `#FFCB3C` | Aksen shadow hero |

Aturan **60/30/10**: kanvas 60%, surface 30%, aksen 10%. Crimson tidak dipakai untuk dua tombol primer dalam satu layar.

## 7. Tipografi

- **Display/Heading:** Space Grotesk 500 & 700.
- **Body/UI:** Inter 400, 500, 600, 700.
- **Angka antrian/data:** JetBrains Mono 700.
- Judul besar: tracking `-0.8` s/d `-1.2`, line-height rapat.
- Body: line-height 1.45–1.6.
- Label kecil: uppercase, tracking `0.6–1`, 10–12px.

Font di-load lewat `expo-font` + `@expo-google-fonts/*`; splash ditahan sampai font siap.

## 8. Bentuk & bayangan

- Border utama: 2px `ink`; elemen kecil 1.5px.
- Hard shadow: `4px 4px 0` untuk kartu, `3px 3px 0` untuk tombol.
- Shadow aksen: offset amber/cobalt untuk kartu hero (maksimal satu per layar).
- Radius: kartu besar 2–4px, tombol/input 8–10px, badge pill.
- Motif: strip barber-pole, dot grid halus, badge sticker miring -2°/+2°.
- Tidak ada gradien dan blur.

## 9. Motion

- Library: `react-native-reanimated` 4.5.1 (sudah terpasang).
- Entrance: fade + translateY 12–16px, spring damping 16–18, stagger 35–50ms.
- Press: scale 0.97 + shadow mengecil; durasi 120–160ms.
- Tab bar: pil aktif dengan spring.
- Nomor antrian: ticker/flip saat berubah.
- Sukses antrian: stempel tiket + confetti tipis.
- Login: logo bounce + strip barber-pole bergerak.
- Kartu layanan: tilt 3D halus saat ditekan (maks 4°).
- Loading: skeleton shimmer, bukan spinner di area konten utama.
- `useReducedMotion()`: semua entrance/press menjadi fade/opacity saja.
- Tidak boleh ada animasi yang menahan input lebih dari 300ms.

## 10. Layout & pola layar

- **Auth:** dua panel di layar ≥900px (poster brand + form); satu kolom di mobile.
- **App shell:** RoleHeader ringkas + konten + tab bar mengambang.
- **Daftar:** kartu dengan border/shadow, stagger entrance, empty state ilustratif.
- **Modal/bottom sheet:** overlay gelap, kartu dari bawah, tombol aksi besar.
- **Form:** label di atas, input 48px+, error inline, tombol primer full-width.
- **Feedback:** stamp/confetti hanya untuk aksi sukses yang langka (antrian dibuat, pembayaran diterima).

## 11. Login & register

- Login: email + password kosong, show/hide password, CTA "Masuk", tautan daftar.
- **Tanpa Google OAuth** (ditunda, B22) dan **tanpa panel DEMO**.
- Role ditentukan dari profil setelah login; tidak ada pemilihan role di form.
- Register: nama, email, no HP, password, konfirmasi; strength meter; sukses kembali ke login.
- Akun uji didokumentasikan di `docs/akun-demo.md`, bukan di UI.

## 12. Tema ala sakelar lampu

- Menu **Tampilan** di bagian Pengaturan pada Profil semua role.
- Route `/pengaturan/tampilan`, header dengan tombol kembali.
- Sakelar rumah: plat cream, dua sekrup, rocker miring dengan spring, ikon matahari/bulan, label "Terang"/"Gelap".
- Pilihan disimpan di AsyncStorage (`barbersys.theme`), langsung berlaku, default terang.
- Sakelar kecil di header/login dihapus.

## 13. Cakupan layar

Auth: `login`, `register`.
Customer: `home`, `queue/new`, `queue/status`, `history`, `profile`.
Barber: `queue`, `profile`.
Kasir: `queue`, `call`, `payment`, `profile`.
Admin: `ringkasan`, `treatments`, `products`, `staff`, `laporan`, `profile`.
Display: `display` (poles tipografi + ticker; tetap dark).
Shared: `RoleHeader`, `ProfileForm`, 4 tab bar, UI kit.

## 14. Constraints

- Expo SDK 57, React Native 0.86, React 19, TypeScript strict.
- Harus jalan di native (Expo Go) dan web.
- Dua tema harus diuji.
- Tidak menambah dependency selain font packages.
- Commit hanya atas perintah eksplisit user (AGENTS).

## 15. Verifikasi

- `npm run typecheck` tanpa error baru.
- `npm run test:unit` tetap hijau + test baru untuk theme preference dan ticker.
- Playwright: login/register/customer/kasir/admin/display di light & dark, lebar 390 & 1280, console bersih.
- Manual Expo Go: login tiap role, buat antrian, ganti tema, buka semua tab.

## 16. Keputusan builder

- Font pair: Space Grotesk + Inter + JetBrains Mono (sejalan design.md).
- Struktur tab bar: custom floating bar, bukan bawaan React Navigation.
- Kartu besar tetap radius kecil; tombol/input radius 8–10.
- Menu Tampilan berada di Profil, bukan tab baru.
- Login/register memakai layout responsif dua panel.
- Semua ilustrasi Stitch yang ada dipertahankan bila cocok; tidak membuat aset baru.

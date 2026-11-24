# BarberSys — Design System & UI Guidelines

**Gaya desain: Neo-Brutalism Editorial ("Editorial Barber") · Mendukung Dark Mode & Light Mode**

| | |
|---|---|
| **Versi Dokumen** | 2.0 |
| **Terakhir diperbarui** | 20 November 2026 |
| **Ruang lingkup** | Aplikasi mobile (Expo) — 4 role + Layar Display TV/Desktop |

> Arah resmi UI 2.0 disetujui 19 November 2026: **Editorial Barber** — cream/ink dengan aksen crimson, cobalt, dan amber; border 2px, hard shadow, radius kecil, tipografi Space Grotesk/Inter/JetBrains Mono. Arah ini menggantikan aturan "match persis mockup Stitch" untuk komponen baru; mockup lama tetap menjadi referensi struktur layar.

---

## 1. Filosofi Desain

BarberSys mengambil identitas visual dari dunia barbershop klasik — **barber pole** (merah-biru-putih), gunting & pisau cukur, kertas nota, tinta stempel — tapi disampaikan lewat bahasa **neo-brutalism**: garis tebal, bayangan keras tanpa blur, warna flat jenuh, tipografi besar dan jujur. Tidak ada gradien, tidak ada bayangan lembut ala kartu SaaS generik.

Prinsip yang dipegang:

1. **Jujur dan tegas** — elemen interaktif terlihat jelas bisa ditekan (border tebal + shadow offset), bukan kartu datar yang ambigu.
2. **Satu titik berani per layar** — satu elemen (nomor antrian, harga, tombol utama) yang paling menonjol; sisanya tenang dan disiplin.
3. **Struktur = informasi** — border, garis pembatas, dan badge status dipakai untuk menyampaikan makna (status antrian, ketersediaan barber), bukan sekadar dekorasi.
4. **Konsisten lintas mode** — setiap warna dipakai lewat token semantik, sehingga berpindah Dark/Light Mode tidak merusak makna warna (merah tetap berarti "berhenti/nonaktif", hijau tetap "tersedia").

---

## 2. Design Tokens — Warna

### 2.1 Palet Inti (Base)

| Token | Light Mode | Dark Mode | Penggunaan |
|---|---|---|---|
| `color.bg` | `#FCF9F8` | `#121214` | Latar belakang utama layar |
| `color.paper` | `#F4EFE9` | `#1E1E22` | Kartu "kertas" editorial (tiket, ringkasan, modal) |
| `color.surface` | `#FFFFFF` | `#1B1B1F` | Kartu, panel, modal |
| `color.surface-container-low` | `#F6F3F2` | `#1E1E22` | Kolom info, area sekunder di dalam kartu |
| `color.surface-container-high` | `#EBE7E7` | `#313136` | Badge netral, placeholder, stepper |
| `color.ink` | `#111111` | `#F5F3EE` | Teks utama & border signature |
| `color.ink-muted` | `#5A5A55` | `#A8A6A0` | Teks sekunder, caption |

### 2.2 Warna Aksen (dari Barber Pole)

| Token | Light Mode | Dark Mode | Penggunaan |
|---|---|---|---|
| `color.accent-crimson` | `#D7263D` | `#FF5164` | Aksi utama, tombol primer, elemen berani |
| `color.accent-cobalt` | `#1C4ED8` | `#5B85FF` | Aksi sekunder, tautan, elemen informasi |
| `color.accent-amber` | `#F5B700` | `#FFCB3C` | Highlight, badge "Sibuk", sorotan promosi |

### 2.3 Warna Semantik (Status)

| Token | Warna | Dipakai untuk |
|---|---|---|
| `color.success` | `#2BA84A` (dark: `#4CD97A`) | Status `lunas`, Barber "Tersedia" |
| `color.warning` | `#F5B700` (dark: `#FFCB3C`) | Status `dilayani`, Barber "Sibuk" |
| `color.info` | `#1C4ED8` (dark: `#5B85FF`) | Status `dipanggil` |
| `color.danger` | `#D7263D` (dark: `#FF5164`) | Error, tombol batal/hapus |
| `color.neutral` | `#8A8A85` (dark: `#6E6E72`) | Status `menunggu`, Barber "Istirahat" (nonaktif) |

> **Aturan**: warna semantik tidak pernah di-hardcode di komponen — selalu lewat token, agar Dark/Light Mode tinggal switch nilai tanpa mengubah logika tampilan.

### 2.4 Token Struktural (Shadow, Stripe, Radius)

| Token | Light Mode | Dark Mode | Penggunaan |
|---|---|---|---|
| `shadow` | `#111111` | `#000000` | Hard shadow netral untuk kartu & tombol |
| `shadow-accent` | `#F5B700` | `#FFCB3C` | Shadow aksen amber pada kartu hero/tiket |
| `card-border` | `#111111` | `#333338` | Border tipis internal (divider, kolom info) |
| `stripe.crimson / cobalt / amber / cream` | sesuai aksen | sesuai aksen | Strip barber pole (`PoleStrip`) |
| `radius.sm / md / lg / pill` | `6 / 10 / 16 / 999` | idem | Kartu & tombol `md`, elemen kecil `sm`, badge `pill` |

Shadow **selalu offset keras tanpa blur** (`shadowRadius: 0`, `shadowOpacity: 1`). Di Android, `elevation` dipakai sebagai fallback dengan offset visual yang setara.

---

## 3. Tipografi

| Peran | Typeface | Alasan |
|---|---|---|
| **Display / Heading** | Space Grotesk (700–800) | Geometris, tebal, punya karakter teknis-modern yang cocok dengan garis tegas neo-brutalism |
| **Body / UI Text** | Inter (400–600) | Sangat terbaca di ukuran kecil, netral, tidak bersaing dengan heading |
| **Angka Antrian & Data** | JetBrains Mono (700) | Lebar karakter konsisten — penting untuk nomor antrian besar di layar Display dan status tiket agar terasa presisi seperti mesin |

### Pemuatan Font

- Font dimuat sekali di root layout (`src/app/_layout.tsx`) dengan `useFonts(fontAssets)` dari `src/constants/fonts.ts`.
- Splash ditahan (`SplashScreen.preventAutoHideAsync`) sampai font selesai dimuat; jangan render layar dengan font fallback.
- Nama family yang dipakai di StyleSheet: `Fonts.display`, `Fonts.displayMedium`, `Fonts.body`, `Fonts.bodyMedium`, `Fonts.bodySemi`, `Fonts.bodyBold`, `Fonts.mono`.
- Jangan menulis nama file font langsung di komponen; selalu lewat `Fonts`.

### Aturan Editorial

- Eyebrow/label kecil: caption uppercase dengan `letterSpacing` 2–4 dan warna `inkMuted`.
- Judul layar memakai Space Grotesk; paragraf memakai Inter; nomor antrian, harga, dan kode transaksi memakai JetBrains Mono.
- Satu layar hanya punya satu angka/heading dominan; sisanya turun ukuran secara disiplin.

### Skala Tipe

| Token | Ukuran | Weight | Contoh Penggunaan |
|---|---|---|---|
| `type.display` | 40–96px | 700 | Nomor antrian; 80–120px di Display TV |
| `type.h1` | 28px | 700 | Judul layar (Ambil Antrian, Riwayat) |
| `type.h2` | 20px | 700 | Judul kartu/section |
| `type.body` | 16px | 400–500 | Teks utama |
| `type.caption` | 13px | 500 | Label, metadata, timestamp |
| `type.mono-lg` | 32px | 700 (mono) | Nomor antrian di kartu status User |
| `type.mono-sm` | 14px | 700 (mono) | Kode transaksi, kode antrian di riwayat |

---

## 4. Spacing & Grid

Skala berbasis 4px:

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`

- Padding standar kartu: `16px`.
- Jarak antar elemen dalam form: `12px`.
- Jarak antar section layar: `24–32px`.
- Margin luar layar (safe padding): `16px` (mobile), `48px` (Display TV).

---

## 5. Border, Shadow & Radius — Elemen Signature

Ini yang membuat BarberSys terasa neo-brutalist, bukan flat design biasa:

| Elemen | Aturan |
|---|---|
| **Border** | `2px solid color.ink` pada kartu & tombol utama; `1.5px` pada elemen kecil (chip, badge, divider, input) |
| **Shadow** | Offset keras, tanpa blur: `4px 4px 0 color.shadow` untuk kartu; `3px 3px 0 color.shadow` untuk tombol |
| **Shadow aksen** | Kartu hero/tiket memakai `color.shadow-accent` (amber) agar menjadi satu titik berani per layar |
| **State ditekan (pressed)** | Tombol bergeser: shadow berkurang jadi `1px 1px 0`, elemen bertranslasi `translate(3px, 3px)` — memberi kesan fisik ditekan |
| **Radius** | Kartu & tombol: `radius.md` (10px); chip/stepper: `radius.sm` (6px); badge: `radius.pill` (999). Modal mengikuti kartu, bukan sudut 0px. |

```
Kartu normal:        Kartu ditekan/aktif:
┌─────────────┐      ┌─────────────┐
│             │      │             │
│   Konten    │▓      │   Konten    │
│             │▓      │             │
└─────────────┘▓      └─────────────┘
  ▓▓▓▓▓▓▓▓▓▓▓▓▓        (shadow menempel, translate)
```

---

## 6. Komponen UI

### 6.1 Tombol

| Varian | Latar | Border/Shadow | Teks | Penggunaan |
|---|---|---|---|---|
| **Primary** | `color.accent-crimson` | ink border + shadow | putih, bold | Aksi utama ("Ambil Antrian", "Konfirmasi Bayar") |
| **Secondary** | `color.surface` | ink border + shadow | `color.ink` | Aksi setara alternatif ("Lihat Detail") |
| **Danger** | `color.danger` | ink border + shadow | putih, bold | "Batalkan Antrian", "Nonaktifkan Akun" |
| **Dark** | `color.ink` | ink border + shadow | `color.bg`, bold | Aksi tegas di kartu terang ("Panggil Antrian", "Konfirmasi Panggil") |
| **Ghost** | transparan | border tipis, tanpa shadow | `color.ink` | Aksi tersier ("Lewati", "Nanti Saja") |

Semua tombol memakai teks kalimat aktif dan spesifik: **"Ambil Antrian"**, bukan "Submit"; **"Konfirmasi Bayar"**, bukan "OK". Tombol memiliki tinggi minimum 48px, border 2px, hard shadow 3px, dan state loading spinner di dalam tombol.

### 6.2 Kartu (Card)

- **Kartu dasar** (`Card`): border 2px, radius 10px, hard shadow 4px; tone `surface` / `paper` (krem) / `ink` (gelap); aksen `crimson` / `cobalt` / `amber` mengganti warna shadow.
- **Treatment Card**: nama treatment, durasi (ikon jam, mono font), harga (kanan atas, bold besar), border 2px + shadow 4px.
- **Queue Ticket Card**: kartu status antrian User — nomor antrian dalam `type.mono-lg`, badge status warna semantik di pojok, nama barber & treatment di bawahnya. Memakai `PoleStrip` di tepi atas dan `Ticker` untuk nomor.
- **Product Card**: foto produk (border tebal di sekeliling foto, bukan foto bebas tanpa bingkai), nama, harga, stepper qty di Fase 2.
- **Barber Card** (saat memilih barber): foto, nama, rating (bintang + angka), badge status (Tersedia/Sibuk/Istirahat), estimasi waktu tunggu.

### 6.3 Badge / Status Chip

Badge status memakai warna semantik + border ink, teks singkat huruf awal kapital (bukan ALL CAPS):

```
🟢 Tersedia      🟡 Sibuk         ⚫ Istirahat
🔵 Dipanggil     🟡 Dilayani      ⚪ Menunggu     🟢 Lunas
```

### 6.4 Input & Form

- Memakai `TextField` dari UI kit: label caption uppercase, border 2px `color.ink`, radius 10px, tinggi minimum 48px, tanpa shadow.
- Focus state: border berubah jadi `color.accent-cobalt`; ikon berubah warna mengikuti fokus.
- Pesan error tampil di bawah field, warna `color.danger`, nada langsung: *"Password minimal 8 karakter"* — bukan permintaan maaf atau kalimat generik.
- Input multiline memiliki tinggi minimum 88px dan teks rata atas.

### 6.5 Navigasi

- **Bottom Tab Navigation** per role (4 tab maksimal) memakai `BarberTabBar`: border atas 2px, latar `surface`, ikon + label caption; tab aktif memakai `color.accent-crimson` dengan indikator garis tebal 3px di atas ikon (bukan pill/lingkaran lembut). Route tersembunyi tetap tersembunyi.
- **Top App Bar** (`RoleHeader`): judul kiri, badge role di kanan. Toggle tema **tidak lagi** di app bar — dipindah ke Profil → Tampilan.

### 6.6 Modal / Bottom Sheet

- Memakai `Card` tone `paper` dengan border 2px + hard shadow; overlay gelap `rgba(0,0,0,0.55–0.6)`.
- Muncul dari bawah (`animationType="slide"`) untuk form/rating, fade untuk konfirmasi sukses.
- Dipakai untuk: popup Rating & Tip, konfirmasi Batalkan Antrian, konfirmasi Nonaktifkan Akun, form CRUD admin, walk-in kasir.

### 6.7 UI Kit Bersama

Komponen di `src/components/ui/` wajib dipakai ulang, bukan ditulis ulang per layar:

| Komponen | Fungsi |
|---|---|
| `AppText` | Tipografi token (`display`/`h1`/`h2`/`body`/`caption`/`mono`) |
| `Button` | Varian primary/secondary/ghost/danger/dark + loading |
| `Card` | Kartu neo-brutalist dengan tone & aksen |
| `TextField` | Input label, ikon, error, secure toggle |
| `Badge` | Pill status dengan tone semantik |
| `BarberTabBar` | Tab bar 4 role |
| `PoleStrip` | Strip barber pole animasi halus |
| `Ticker` | Nomor antrian per-karakter |
| `Reveal` | Entrance fade/translate |
| `Skeleton` | Placeholder loading |
| `EmptyState` | Empty state dengan aksi |
| `SectionHeader` | Judul + subjudul section |
| `PressableScale` | Press feedback scale/translate |
| `Stamp` / `Confetti` | Momen ekspresif sukses |

### 6.8 Sakelar Tema (Wall Switch)

- Toggle tema berbentuk **sakelar lampu rumah** (`WallSwitch`): pelat dinding, tuas fisik, kabel, dan label `TERANG` / `GELAP`.
- Ditempatkan di route `/pengaturan/tampilan` (dari Profil → menu Tampilan), bukan di app bar atau login.
- Preferensi disimpan di `barbersys.theme`; pilihan pengguna selalu menang dan tidak berubah saat sistem berubah. Default awal: terang.

---

## 7. Layout Layar Kunci (Mobile)

### Ambil Antrian (User)

```
┌───────────────────────────┐
│ ← Ambil Antrian            │
├───────────────────────────┤
│ [Treatment Card] [Card] .. │  ← pilih 1
│                             │
│ Barber                     │
│ [🟢Andi ⭐4.8] [🟡Budi⭐4.5]│  ← pilih 1 (atau "Siapa saja")
│                             │
│ Estimasi tunggu: ±20 menit │
│                             │
│ + Tambah Produk (opsional) │
│                             │
│ ┌─────────────────────────┐│
│ │   AMBIL ANTRIAN          ││  ← tombol primary, full-width
│ └─────────────────────────┘│
└───────────────────────────┘
```

### Status Antrian (User)

Fokus utama: nomor antrian besar (`type.display`, mono) di tengah kartu, dengan badge status warna semantik dan sub-teks "Sedang dilayani: No. X".

### Riwayat Transaksi

List kartu ringkas (tanggal, treatment, total, rating yang diberikan) — tap untuk detail lengkap termasuk item produk.

### Dashboard Kasir / Barber / Admin

Layar awal berbentuk daftar/antrian aktif dengan aksi cepat langsung dari kartu (mis. tombol "Panggil" langsung di kartu antrian teratas untuk Kasir), menghindari navigasi berlapis untuk aksi yang sering dipakai.

---

## 8. Layar Display Antrian (TV/Desktop)

Layar ini **selalu memakai Dark Mode**, terlepas dari preferensi perangkat — alasannya: kontras lebih tinggi untuk dibaca dari jarak jauh, lebih nyaman dilihat lama di ruang tunggu, dan warna aksen (merah/biru/amber) lebih menyala di atas latar gelap.

```
┌──────────────────────────────────────────────┐
│                                                │
│   SEDANG DILAYANI                             │
│                                                │
│   No. 12  →  Silakan ke Barber Andi           │
│   No. 15  →  Silakan ke Barber Budi           │
│                                                │
│   ──────────────────────────────────          │
│   Antrian Berikutnya:  16   17   18           │
│                                                │
└──────────────────────────────────────────────┘
```

- Nomor antrian: `type.display` diperbesar (± 80–120px di layar TV), mono font, warna `color.accent-amber` di atas `color.bg` gelap agar mencolok. Nomor dirender dengan `Ticker` agar setiap karakter masuk dengan fade-down singkat.
- Tipografi label memakai Inter bold uppercase dengan `letterSpacing` 3–4; nomor berikutnya memakai JetBrains Mono.
- Antrian berikutnya muncul dengan `Reveal` bertahap (maksimal 5 nomor); tetap tenang setelah masuk.
- Transisi saat nomor berganti: sedikit animasi masuk (geser/fade singkat) dibarengi pengumuman TTS — satu momen animasi yang berarti, bukan animasi di semua elemen.
- Tidak ada elemen interaktif (murni tampilan publik, tanpa tombol).
- **Pengecualian teknis (B19):** satu tombol "Aktifkan Suara" ditampilkan sekali saat halaman dibuka, karena browser memblokir audio sebelum ada interaksi user. Setelah diklik, overlay hilang dan layar kembali pasif.

---

## 9. Ikonografi & Imagery

- Gunakan set ikon dengan **stroke tebal** (mis. Lucide dengan `strokeWidth` dinaikkan, atau Phosphor Bold) — ikon tipis terasa kontras dengan border tebal khas neo-brutalism.
- Foto (barber, produk) selalu diberi bingkai tebal `2px solid color.ink` + shadow offset kecil, konsisten dengan gaya kartu — bukan foto lepas tanpa bingkai.
- Hindari ilustrasi dekoratif berlebihan; biarkan tipografi besar dan warna blok menjadi elemen visual utama.

---

## 10. Motion & Interaksi

Motion dipakai untuk **merespons aksi pengguna** dan **menandai momen penting**, bukan hiasan acak. Prinsip:

1. **Masuk sekali per layar** — `Reveal` memberi fade + translateY singkat dengan stagger maksimal 225ms; setelah itu layar tenang.
2. **Umpan balik fisik** — `PressableScale` mengecil/menggeser elemen saat ditekan; tombol memakai shadow menempel.
3. **Momen ekspresif langka** — `Ticker` untuk nomor yang dipanggil, `Stamp` + `Confetti` hanya untuk tiket dibuat, panggilan kasir, dan pembayaran sukses.
4. **Reduced motion dihormati** — seluruh animasi memakai `useReducedMotion`; jika aktif, animasi diganti fade singkat atau dimatikan, dan `Confetti` tidak dijalankan.

Durasi acuan:

| Gerak | Durasi | Catatan |
|---|---|---|
| Press feedback | 90–120ms | translate 2–3px, scale 0.97–0.99 |
| Reveal masuk | 280ms | fade + translateY 16px, spring damping 17 |
| Ticker karakter | 180ms per karakter, delay 30ms | fade-down |
| Wall switch | 220–320ms | tuas berputar, bukan fade |
| Confetti | 1.2–1.6 detik | sekali, lalu berhenti |
| Overlay sukses | 1100–1200ms | tampil lalu navigasi otomatis |

Hindari animasi loop tanpa henti kecuali `PoleStrip` (sangat halus) dan indikator live. Jangan animasikan setiap elemen saat scroll.

---

## 11. Dark / Light Mode

- Toggle tersedia di **Profil → Tampilan** (`/pengaturan/tampilan`) untuk setiap role, berbentuk `WallSwitch`.
- Default awal: **terang**. Pilihan pengguna disimpan di `barbersys.theme` dan selalu menang; aplikasi tidak otomatis mengikuti perubahan sistem setelah pengguna memilih.
- `ThemeProvider` menahan render sampai preferensi selesai dibaca, sehingga tidak ada kedipan terang→gelap saat aplikasi dibuka.
- Seluruh warna diakses lewat token semantik (Bagian 2), sehingga komponen tidak pernah menulis hex langsung — cukup ganti tema, seluruh aplikasi konsisten berubah.
- Pengecualian: Layar Display TV tetap dark mode permanen (lihat Bagian 8).

---

## 12. Aksesibilitas

- Kontras teks-terhadap-latar minimal memenuhi rasio 4.5:1 (dicek terutama pada kombinasi warna aksen amber di atas latar terang — gunakan `color.ink` sebagai teks di atasnya, bukan putih).
- Target sentuh minimal 44×44px untuk seluruh tombol dan item list yang bisa ditekan.
- Focus state keyboard/switch-control terlihat jelas (outline 2px `color.accent-cobalt`) untuk seluruh elemen interaktif.
- Badge status tidak hanya mengandalkan warna — selalu disertai label teks singkat (mis. "Sibuk", bukan hanya titik kuning) untuk pengguna dengan gangguan penglihatan warna.

---

## 13. Contoh Token untuk Implementasi (React Native / Expo)

```ts
// Implementasi aktual: src/context/ThemeContext.tsx + src/constants/theme.ts
export const lightStitchTheme = {
  bg: '#FCF9F8',
  paper: '#F4EFE9',
  surface: '#FFFFFF',
  surfaceContainerLow: '#F6F3F2',
  surfaceContainerHigh: '#EBE7E7',
  ink: '#111111',
  inkMuted: '#5A5A55',
  primary: '#D7263D',
  secondary: '#1C4ED8',
  amber: '#F5B700',
  success: '#2BA84A',
  warning: '#F5B700',
  info: '#1C4ED8',
  danger: '#D7263D',
  neutral: '#8A8A85',
  shadow: '#111111',
  shadowAccent: '#F5B700',
  radius: { sm: 6, md: 10, lg: 16, pill: 999 },
};

// Signature neo-brutalist card (React Native tidak mendukung box-shadow CSS
// langsung — pakai kombinasi shadow* + elevation, atau border tambahan untuk
// meniru efek offset di Android).
export const brutalistCard = (theme, accent) => ({
  backgroundColor: theme.surface,
  borderWidth: 2,
  borderColor: theme.ink,
  borderRadius: theme.radius.md,
  shadowColor: accent === 'amber' ? theme.shadowAccent : theme.shadow,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
});
```

---

*Dokumen ini berpasangan dengan `prd.md` — setiap fitur baru yang ditambahkan ke roadmap PRD harus mengikuti token dan aturan komponen di dokumen ini agar tampilan tetap konsisten lintas fase pengembangan.*

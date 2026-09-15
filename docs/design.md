# BarberSys — Design System & UI Guidelines

**Gaya desain: Neo-Brutalism · Mendukung Dark Mode & Light Mode**

| | |
|---|---|
| **Versi Dokumen** | 1.0 |
| **Terakhir diperbarui** | 14 September 2026 |
| **Ruang lingkup** | Aplikasi mobile (Expo) — 4 role + Layar Display TV/Desktop |

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
| `color.bg` | `#FAFAF7` | `#121214` | Latar belakang utama layar |
| `color.surface` | `#FFFFFF` | `#1B1B1F` | Kartu, panel, modal |
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

---

## 3. Tipografi

| Peran | Typeface | Alasan |
|---|---|---|
| **Display / Heading** | Space Grotesk (700–800) | Geometris, tebal, punya karakter teknis-modern yang cocok dengan garis tegas neo-brutalism |
| **Body / UI Text** | Inter (400–600) | Sangat terbaca di ukuran kecil, netral, tidak bersaing dengan heading |
| **Angka Antrian & Data** | JetBrains Mono (700) | Lebar karakter konsisten — penting untuk nomor antrian besar di layar Display dan status tiket agar terasa presisi seperti mesin |

### Skala Tipe

| Token | Ukuran | Weight | Contoh Penggunaan |
|---|---|---|---|
| `type.display` | 40px | 800 | Nomor antrian di layar Display TV |
| `type.h1` | 28px | 700 | Judul layar (Ambil Antrian, Riwayat) |
| `type.h2` | 20px | 700 | Judul kartu/section |
| `type.body` | 16px | 400–500 | Teks utama |
| `type.caption` | 13px | 500 | Label, metadata, timestamp |
| `type.mono-lg` | 32px | 700 (mono) | Nomor antrian di kartu status User |
| `type.mono-sm` | 14px | 600 (mono) | Kode transaksi, kode antrian di riwayat |

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
| **Border** | `2px solid color.ink` pada kartu & tombol utama; `1.5px` pada elemen kecil (chip, input) |
| **Shadow** | Offset keras, tanpa blur: `4px 4px 0 color.ink` untuk kartu; `3px 3px 0 color.ink` untuk tombol |
| **State ditekan (pressed)** | Tombol bergeser: shadow berkurang jadi `1px 1px 0`, elemen bertranslasi `translate(3px, 3px)` — memberi kesan fisik ditekan |
| **Radius** | Sengaja **tidak seragam**: `0px` pada kartu besar (Treatment card, Queue ticket) agar terasa tegas; `6px` pada tombol & badge kecil agar tetap nyaman disentuh |

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
| **Ghost** | transparan | border tipis, tanpa shadow | `color.ink` | Aksi tersier ("Lewati", "Nanti Saja") |

Semua tombol memakai teks kalimat aktif dan spesifik: **"Ambil Antrian"**, bukan "Submit"; **"Konfirmasi Bayar"**, bukan "OK".

### 6.2 Kartu (Card)

- **Treatment Card**: nama treatment, durasi (ikon jam, mono font), harga (kanan atas, bold besar), border 2px + shadow 4px.
- **Queue Ticket Card**: kartu status antrian User — nomor antrian dalam `type.mono-lg`, badge status warna semantik di pojok, nama barber & treatment di bawahnya.
- **Product Card**: foto produk (border tebal di sekeliling foto, bukan foto bebas tanpa bingkai), nama, harga, stepper qty di Fase 2.
- **Barber Card** (saat memilih barber): foto, nama, rating (bintang + angka), badge status (Tersedia/Sibuk/Istirahat), estimasi waktu tunggu.

### 6.3 Badge / Status Chip

Badge status memakai warna semantik + border ink, teks singkat huruf awal kapital (bukan ALL CAPS):

```
🟢 Tersedia      🟡 Sibuk         ⚫ Istirahat
🔵 Dipanggil     🟡 Dilayani      ⚪ Menunggu     🟢 Lunas
```

### 6.4 Input & Form

- Border 1.5px `color.ink`, radius `4px`, tanpa shadow (agar hierarki di bawah kartu/tombol).
- Focus state: border berubah warna jadi `color.accent-cobalt` + outline tambahan 2px untuk aksesibilitas keyboard.
- Pesan error tampil di bawah field, warna `color.danger`, nada langsung: *"Password minimal 8 karakter"* — bukan permintaan maaf atau kalimat generik.

### 6.5 Navigasi

- **Bottom Tab Navigation** per role (4 tab maksimal), ikon + label, tab aktif memakai `color.accent-crimson` dengan indikator garis tebal 3px di atas ikon (bukan pill/lingkaran lembut).
- **Top App Bar**: judul kiri (`type.h1`), toggle Dark/Light Mode di kanan (ikon matahari/bulan dengan border kotak khas neo-brutalist, bukan switch ios standar).

### 6.6 Modal / Bottom Sheet

- Border 3px + shadow 6px (lebih tebal dari kartu biasa, agar terasa "melayang di atas" konten).
- Dipakai untuk: popup Rating & Tip, konfirmasi Batalkan Antrian, konfirmasi Nonaktifkan Akun.

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

- Nomor antrian: `type.display` diperbesar (± 80–120px di layar TV), mono font, warna `color.accent-amber` di atas `color.bg` gelap agar mencolok.
- Transisi saat nomor berganti: sedikit animasi masuk (geser/fade singkat) dibarengi pengumuman TTS — satu momen animasi yang berarti, bukan animasi di semua elemen.
- Tidak ada elemen interaktif (murni tampilan publik, tanpa tombol).

---

## 9. Ikonografi & Imagery

- Gunakan set ikon dengan **stroke tebal** (mis. Lucide dengan `strokeWidth` dinaikkan, atau Phosphor Bold) — ikon tipis terasa kontras dengan border tebal khas neo-brutalism.
- Foto (barber, produk) selalu diberi bingkai tebal `2px solid color.ink` + shadow offset kecil, konsisten dengan gaya kartu — bukan foto lepas tanpa bingkai.
- Hindari ilustrasi dekoratif berlebihan; biarkan tipografi besar dan warna blok menjadi elemen visual utama.

---

## 10. Motion & Interaksi

- Motion dipakai untuk **merespons aksi pengguna**, bukan hiasan otomatis: tombol bergeser saat ditekan, kartu antrian baru masuk dengan geser singkat saat status berubah, popup rating muncul dari bawah.
- Hindari animasi fade-slide-up otomatis di setiap section saat scroll — bukan gaya neo-brutalism, dan generik.
- Durasi transisi singkat: 120–180ms, easing tegas (bukan easing lembut/bouncy berlebihan).

---

## 11. Dark / Light Mode

- Toggle tersedia di halaman **Profile** setiap role.
- Default awal mengikuti preferensi sistem perangkat (`prefers-color-scheme` / Appearance API Expo).
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
// theme.ts
export const lightTheme = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  ink: '#111111',
  inkMuted: '#5A5A55',
  accentCrimson: '#D7263D',
  accentCobalt: '#1C4ED8',
  accentAmber: '#F5B700',
  success: '#2BA84A',
  warning: '#F5B700',
  info: '#1C4ED8',
  danger: '#D7263D',
  neutral: '#8A8A85',
};

export const darkTheme = {
  bg: '#121214',
  surface: '#1B1B1F',
  ink: '#F5F3EE',
  inkMuted: '#A8A6A0',
  accentCrimson: '#FF5164',
  accentCobalt: '#5B85FF',
  accentAmber: '#FFCB3C',
  success: '#4CD97A',
  warning: '#FFCB3C',
  info: '#5B85FF',
  danger: '#FF5164',
  neutral: '#6E6E72',
};

// Signature neo-brutalist shadow (dipakai lewat style, React Native tidak
// mendukung box-shadow CSS langsung — pakai kombinasi shadow* + elevation,
// atau border tambahan untuk meniru efek offset di Android).
export const brutalistCard = (theme: typeof lightTheme) => ({
  backgroundColor: theme.surface,
  borderWidth: 2,
  borderColor: theme.ink,
  borderRadius: 0,
  shadowColor: theme.ink,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4, // fallback Android
});
```

---

*Dokumen ini berpasangan dengan `prd.md` — setiap fitur baru yang ditambahkan ke roadmap PRD harus mengikuti token dan aturan komponen di dokumen ini agar tampilan tetap konsisten lintas fase pengembangan.*

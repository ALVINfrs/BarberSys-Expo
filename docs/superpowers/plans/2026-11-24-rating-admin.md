# Fase 7B — Rating & Komentar Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Admin dapat melihat siapa memberi rating, nilai bintang, komentar, barber, treatment, dan tanggal — lewat layar Rating yang dibuka dari Ringkasan & Laporan tanpa menambah tab.

**Architecture:** Pure helper `src/lib/rating.ts` untuk agregasi dan filter (diuji Node). Layar `admin/(stack)/rating.tsx` membaca `queue` dengan join `profiles`/`treatments`, filter WIB, realtime. Pintasan `router.push` dari Ringkasan dan Laporan. Tanpa perubahan skema/dependency.

**Tech Stack:** Expo SDK 58, expo-router, Supabase, TypeScript strict, Node test runner (`--experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-11-24-riwayat-struk-rating-display-design.md` §8

## Global Constraints

- Tidak ada perubahan DB. Sumber: `queue.rating`, `queue.komentar`, `queue.completed_at`, `queue.created_at`, join `profiles` (customer, barber) & `treatments`.
- Tanpa tab baru — Rating dibuka sebagai Stack route.
- Semua batas periode memakai WIB (UTC+7).
- Jangan jalankan `expo export`; verifikasi di Expo Go.
- Commit setelah test hijau (instruksi user).

## Review Focus

- Transaksi dengan `rating = null` tidak boleh ikut daftar (spec: `rating not null`).
- Komentar kosong/`null` tidak boleh crash atau menampilkan "null".
- Filter barber + periode + min rating harus berlaku sekaligus (AND), bukan salah satu.
- Realtime channel harus dihapus saat unmount (hindari duplicate channel).
- Data lama tanpa `completed_at` jatuh ke `created_at`.

---

## File Map

### Baru
- `BarberSys/src/lib/rating.ts`
- `BarberSys/scripts/test-rating.mjs`
- `BarberSys/src/app/admin/(stack)/_layout.tsx`
- `BarberSys/src/app/admin/(stack)/rating.tsx`

### Diubah
- `BarberSys/src/app/admin/_layout.tsx`
- `BarberSys/src/app/admin/ringkasan.tsx`
- `BarberSys/src/app/admin/laporan.tsx`
- `BarberSys/package.json` (test:unit)

---

### Task 1: Helper rating murni + test

**Files:**
- Create: `BarberSys/src/lib/rating.ts`, `BarberSys/scripts/test-rating.mjs`

**Interfaces:**
- Produces: `RatingEntry { rating: number; komentar: string | null; customerNama: string; barberNama: string; treatmentNama: string; tanggalIso: string }`
- Produces: `summarizeRatings(items: RatingEntry[]): RatingSummary`
- Produces: `RatingSummary { avg: number; count: number; distribution: Record<1|2|3|4|5, number>; denganKomentar: number }`
- Produces: `filterRatings(items: RatingEntry[], opts: { barber?: string | null; minRating?: number | null }): RatingEntry[]`

**Steps:**
- [ ] Tulis test gagal untuk `summarizeRatings` (avg 5+4+3 = 4, count 3, distribusi benar, komentar count) dan `filterRatings` (barber + minRating AND).
- [ ] Jalankan `node --no-warnings --experimental-strip-types --test scripts/test-rating.mjs` → FAIL (modul belum ada).
- [ ] Implementasi `rating.ts` murni (tanpa import runtime).
- [ ] Jalankan lagi → PASS (minimal 3 test).
- [ ] Tambah `scripts/test-rating.mjs` ke `test:unit`.

---

### Task 2: Stack route + layar Rating

**Files:**
- Create: `BarberSys/src/app/admin/(stack)/_layout.tsx`, `BarberSys/src/app/admin/(stack)/rating.tsx`
- Modify: `BarberSys/src/app/admin/_layout.tsx` (tambahkan `<Tabs.Screen name="(stack)" ...>`? → lihat catatan)

**Catatan penting:** Expo Router tidak mengizinkan group `(stack)` sebagai `Tabs.Screen` name. Cara yang benar: taruh `rating.tsx` langsung di `src/app/admin/rating.tsx` dan **sembunyikan dari tab bar** dengan `href: null` pada `Tabs.Screen name="rating"`. Route tetap bisa dibuka via `router.push('/admin/rating')`. Ini memenuhi syarat "bukan tab tambahan".

**Steps:**
- [ ] Buat `src/app/admin/rating.tsx` dengan UI: `RoleHeader`, ringkasan (avg, count, distribusi bintang), filter (barber select, periode hari/minggu/bulan/semua via `startOfDayWIBISO`/`startOfWeekWIBISO`/`startOfMonthWIBISO`, min rating 1–5), daftar kartu (nama customer, barber, bintang, komentar, treatment, tanggal, tip bila ada), `EmptyState`.
- [ ] Query Supabase: `select('id, rating, komentar, nama_customer, tip_amount, completed_at, created_at, customer:profiles!queue_user_id_fkey(nama), barber:profiles!queue_barber_id_fkey(nama), treatments(nama)').not('rating','is',null).order('completed_at',{ascending:false})`. Terapkan filter barber/periode di query atau di helper (pilih yang paling sederhana).
- [ ] Realtime channel unik `admin-rating-${Date.now()}`, `removeChannel` saat unmount.
- [ ] Tambah `Tabs.Screen name="rating"` dengan `href: null` di `admin/_layout.tsx`.
- [ ] Tambah `Button`/Pressable "Lihat Rating & Komentar" di `ringkasan.tsx` dan `laporan.tsx` → `router.push('/admin/rating')`.
- [ ] Typecheck: 0 error pada file yang diubah.

---

### Task 3: Verifikasi & commit

- [ ] `npm run test:unit` → semua pass (target 113 test).
- [ ] `npm run typecheck` → 0 error baru.
- [ ] Commit: `Fase 7B: rating & komentar admin` (hanya jika test hijau).

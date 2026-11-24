# Fase 7C — Dashboard Admin Diperkaya Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dashboard `admin/ringkasan.tsx` menampilkan rating terbaru + komentar, performa barber, grafik omset 7 hari, antrian live/status kursi, transaksi terbaru, dan pintasan ke Laporan/Rating/Pegawai/Display.

**Architecture:** Pure helper `src/lib/dashboard.ts` untuk agregasi 7 hari dan performa barber (diuji Node). Layar `ringkasan.tsx` mengambil data dengan satu putaran `Promise.all` + realtime `queue`/`profiles`. Grafik memakai `View` (tanpa library chart).

**Tech Stack:** Expo SDK 58, Supabase, TypeScript strict, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-24-riwayat-struk-rating-display-design.md` §9

## Global Constraints
- Tanpa perubahan DB/dependency baru (kecuali test script).
- Grafik memakai `View`, tanpa library chart.
- Batas 7 hari memakai WIB.
- Commit setelah test hijau.

## Review Focus
- Transaksi tanpa `completed_at` tidak boleh menghilang dari grafik (fallback `created_at`).
- Barber tanpa rating tetap muncul di performa dengan 0/rata-rata 0 (tidak crash).
- Realtime cleanup channel saat unmount.
- Pintasan Rating/Laporan harus benar-benar bisa dibuka (route ada).

---

## File Map
### Baru
- `BarberSys/src/lib/dashboard.ts`
- `BarberSys/scripts/test-dashboard.mjs`
### Diubah
- `BarberSys/src/app/admin/ringkasan.tsx`
- `BarberSys/package.json` (test:unit)

### Task 1: Helper agregasi dashboard + test (TDD)
**Interfaces:**
- `DashboardTransaction { tanggalIso: string; total: number; barberId: string | null; barberNama: string; tip: number; rating: number | null; komentar: string | null; customerNama: string }`
- `dailyRevenue(items, now?: Date): { iso: string; total: number }[]` — tepat 7 hari WIB, hari tanpa transaksi = 0.
- `barberPerformance(items, ratings): { barberId, nama, transaksi, omset, tip, avgRating }[]`
- `latestRatings(items, limit = 5): DashboardTransaction[]`

Steps:
- [ ] Tulis `scripts/test-dashboard.mjs` (FAIL dulu: modul belum ada): 7 hari penuh & nol; barber aggregate; latest diurut tanggal.
- [ ] Implementasi `dashboard.ts` murni.
- [ ] Test PASS; tambah ke `test:unit`.

### Task 2: Layar Ringkasan diperkaya
- [ ] Fetch data: transaksi lunas 7 hari (join profil/treatment/rating) + antrian aktif + kursi + profil barber. Satu putaran `Promise.all` di `fetchData`.
- [ ] Tambah blok: Rating terbaru (3–5, klik → `/admin/rating`), Performa barber (avg rating, jumlah pelanggan, omset, tip), bar chart 7 hari (`View` tinggi proporsional), Antrian live + status kursi, Transaksi terbaru, Grid pintasan (Laporan, Rating, Pegawai, Display).
- [ ] Realtime unik `admin-dashboard-${Date.now()}`, cleanup.
- [ ] Typecheck 0 error di file ini.

### Task 3: Verifikasi & commit
- [ ] `npm run test:unit` hijau; `npm run typecheck` 0 error baru.
- [ ] Commit: `Fase 7C: dashboard admin diperkaya`.

# Fase 7D — Menu Barber Lengkap (4 Tab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Menu barber menjadi 4 tab fungsional: Tugas (sudah ada), Riwayat (7A), Performa (rating + statistik), Profil (edit + pengaturan). Jadwal/istirahat tetap di Tugas + info jam di Profil — bukan tab tambahan.

**Architecture:** Helper murni `src/lib/barber-performance.ts` untuk statistik harian/mingguan dan rata-rata rating. Layar `barber/performansi.tsx` menampilkan rating & komentar milik barber + statistik. `barber/profile.tsx` disisipkan kartu "Pengaturan Toko" (jam operasional, info istirahat). Tanpa perubahan skema.

**Tech Stack:** Expo SDK 58, expo-router, Supabase, TypeScript strict, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-24-riwayat-struk-rating-display-design.md` §10

## Global Constraints
- 4 tab maksimal: queue, riwayat, performansi, profile.
- Barber hanya melihat data miliknya (`barber_id = user.id`).
- Tanpa perubahan DB/dependency (kecuali test script).
- Commit setelah test hijau.

## Review Focus
- Query performa wajib filter `barber_id`.
- Rating null tidak merusak rata-rata.
- Realtime cleanup.
- Pengaturan di Profil tidak membuat tombol baru yang tidak berfungsi.

---

## File Map
### Baru
- `BarberSys/src/lib/barber-performance.ts`
- `BarberSys/scripts/test-barber-performance.mjs`
- `BarberSys/src/app/barber/performansi.tsx`
### Diubah
- `BarberSys/src/app/barber/_layout.tsx`
- `BarberSys/src/app/barber/profile.tsx`
- `BarberSys/package.json` (test:unit)

### Task 1: Helper performa + test (TDD)
**Interfaces:**
- `PerformansiEntry { tanggalIso: string; total: number; tip: number; rating: number | null; komentar: string | null; customerNama: string }`
- `summarizePerformansi(items): { count, omset, tip, avgRating, todayCount, weekCount }`
- `ratingComments(items, limit = 5): { rating, komentar, customerNama, tanggalIso }[]`

Steps:
- [ ] Tulis test gagal (modul belum ada): agregasi omset/tip/rating; today/week count WIB; komentar urut terbaru &ABAikan null.
- [ ] Implementasi murni; test PASS; daftarkan ke `test:unit`.

### Task 2: Tab Performa + Profil + layout
- [ ] Buat `barber/performansi.tsx` dengan `RoleHeader`, kartu ringkasan, rating & komentar terbaru, statistik harian/mingguan.
- [ ] Tambah `Tabs.Screen name="performansi"` (icon `bar-chart`) di `barber/_layout.tsx` — urutan: queue, riwayat, performansi, profile.
- [ ] Di `barber/profile.tsx` tambah kartu "Pengaturan Toko" (jam buka/tutup dari `barbershop_settings`, status istirahat) — info-only, tidak mengubah data.
- [ ] Typecheck 0 error di file ini.

### Task 3: Verifikasi & commit
- [ ] `npm run test:unit` hijau; `npm run typecheck` 0 error baru.
- [ ] Commit: `Fase 7D: menu barber 4 tab (performasi & pengaturan)`.

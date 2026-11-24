# Fase 7E — Display TV React + Vite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Display TV berjalan sebagai aplikasi React + Vite terpisah di `display-tv/`, membaca `queue_display` via Supabase Realtime, menampilkan jam WIB/antrian/panggilan/ticker dark theme, dan mengumumkan panggilan dalam Bahasa Indonesia via `speechSynthesis` `id-ID` dengan voice picker + peringatan bila voice tidak tersedia.

**Architecture:** Folder `display-tv/` (Vite + React + TS) memakai `@supabase/supabase-js` dengan env `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Pure helper `src/lib/announcement.ts` (teks pengumuman + dedupe key) diuji dengan Node test runner. Suara memakai browser TTS; state voice/key disimpan di `localStorage`. Expo `/display` tetap ada sebagai fallback.

**Tech Stack:** Vite, React, TypeScript, @supabase/supabase-js, Web Speech API (speechSynthesis), Node test runner (`--experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-11-24-riwayat-struk-rating-display-design.md` §11

## Global Constraints
- Tidak memakai `expo export`; verifikasi `npm run dev` Vite + buka browser.
- Tidak login; only read `queue_display` (public projection).
- Tidak cloud TTS / file audio rekaman.
- Dark theme tetap.
- Commit setelah test hijau.

## Review Focus
- Dedupe pengumuman per `queue_id + called_at` (tidak boleh bicara dua kali saat Realtime reconnect).
- Voice `id-ID` tidak ada → banner peringatan + tombol tes tetap tidak crash.
- Autoplay policy → tombol "Aktifkan Suara" sebelum bicara.
- Jam WIB tidak mengikuti timezone device.
- Fallback Expo `/display` tidak dihapus.

---

## File Map
### Baru
- `display-tv/package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `.env.example`
- `display-tv/src/main.tsx`, `display-tv/src/App.tsx`, `display-tv/src/styles.css`
- `display-tv/src/lib/announcement.ts` (pure)
- `display-tv/src/lib/supabase.ts`, `display-tv/src/lib/use-display.ts`
- `BarberSys/scripts/test-announcement.mjs`
### Diubah
- `BarberSys/package.json` (test:unit — test helper display-tv tetap dijalankan dari root Expo)
- `docs/superpowers/plans/2026-11-24-riwayat-struk-dan-fix-laporan.md` (tandai follow-up selesai) — opsional

### Task 1: Pure helper pengumuman + test (TDD)
**Interfaces:**
- `buildAnnouncementText(input: { nomor: number; barberNama: string | null; kursi: number | null }): string`
  → contoh: `"Nomor antrian A-07, silakan ke Kursi 2, bersama Rudi."`
- `announcementKey(input: { queueId: string; calledAt: string }): string` → `${queueId}|${calledAt}`
- `formatWIBClock(iso: string): string` → `"HH:MM:SS"` WIB.

Steps:
- [ ] Tulis test gagal di `BarberSys/scripts/test-announcement.mjs` (import dari `../display-tv/src/lib/announcement.ts`): teks dengan/without barber/kursi, key dedupe, jam WIB.
- [ ] Implementasi murni; test PASS; daftarkan ke `test:unit`.

### Task 2: Scaffold Vite + UI display
- [ ] Buat `display-tv/package.json` (react, react-dom, @supabase/supabase-js, vite, typescript, @vitejs/plugin-react), `index.html`, `vite.config.ts`, `tsconfig.json`, `.env.example`.
- [ ] `src/lib/supabase.ts` baca env (throw jelas bila kosong).
- [ ] `src/lib/use-display.ts` subscribe `postgres_changes` `queue_display` + polling fallback 30 detik; urut: dipanggil → dilayani → menunggu, batasi 8.
- [ ] `App.tsx`: jam WIB (interval 1 detik), highlight panggilan terbaru, daftar antrian, ticker, tombol "Aktifkan Suara" + "Tes Suara" + `<select>` voice, banner bila tidak ada voice `id-ID`.
- [ ] `styles.css`: dark theme, layout TV 16:9, font besar.
- [ ] `npm run build` (Vite, bukan expo export) → sukses.

### Task 3: Suara + dedupe
- [ ] `useSpeech` hook: pilih voice `id-ID` dari `speechSynthesis.getVoices()`, simpan URI ke `localStorage`, dedupe dengan `Set<key>` per sesi, ucapkan hanya setelah diaktifkan pengguna.
- [ ] Tes manual di browser: panggilan baru → suara Indonesia keluar sekali; tes suara bekerja; voice picker tersimpan.

### Task 4: Verifikasi & commit
- [ ] `npm run test:unit` di root Expo hijau; `npm run build` di display-tv sukses.
- [ ] Commit: `Fase 7E: display TV React Vite + TTS id-ID`.

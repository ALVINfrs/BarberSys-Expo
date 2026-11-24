# SDD ledger — plan: docs/superpowers/plans/2026-11-19-ui-redesign.md

**Branch:** feat/fase-5 · **Base:** a5b0f08 · **Spec:** docs/superpowers/specs/2026-11-19-ui-redesign-design.md

## Setup

- Ruling: skill `executing-plans` scripts (`sdd-workspace`, `task-start`, `task-done`) tidak tersedia di paket superpowers terpasang; ledger ditulis manual di path yang diminta plan (Task 8), bukan `.superpowers/sdd/`. Cost if wrong: ledger tidak berada di scratch git-ignored, tapi tetap menjadi catatan yang diminta plan.
- Ruling: AGENTS.md meminta UI "match persis mockup Stitch", tetapi user menyetujui arah baru "Editorial Barber" di spec 19 Nov 2026. Spec user-approved menang. Cost if wrong: tampilan menyimpang dari mockup lama.
- Ruling: user memerintahkan UI 2.0 dan Fase 6 sekaligus, sehingga aturan "satu fase satu waktu" dilonggarkan untuk dua pekerjaan ini; tidak ada fitur fase lain yang dikerjakan.

## Pre-flight scan (shared interfaces)

- Task 1 → Task 3: `mode`, `setMode` dikonsumsi menu Tampilan — cocok.
- Task 2 → Task 3/5/6/7: nama komponen UI kit (`Button`, `Card`, `TextField`, `Reveal`, `Ticker`, `Stamp`, `Confetti`, `EmptyState`, `Skeleton`, `PoleStrip`, `WallSwitch`) — cocok.
- Task 1 → Task 2/4: `Fonts` dipakai UI kit & auth — cocok.
- Task 3 → Task 4: `PoleStrip`/`Reveal` sudah tersedia sebelum login dirombak — cocok.
- Task 6 (payment QRIS locked) → Fase 6 Task 5 (QRIS aktif): placeholder diganti, tidak dobel — cocok.
- Task 8 display `Ticker` memakai `formatQueueNumber` — perlu dicek agar prefix `A-` tidak dobel dengan format display lama.

## Task log

- Task 1: complete (tests: `npm run test:unit` → 68/68 pass; typecheck 31 error baseline, tidak bertambah). Catatan: test `parseThemeMode` RED→GREEN; preferensi tema dihidrasi sebelum render (ThemeProvider menahan children) agar tidak kedip; splash menunggu font.
  - Ruling: context tema mendapat `mode` + `setMode`; `isDark`/`toggleTheme` dipertahankan; `ThemeProvider` return null sampai AsyncStorage selesai dibaca — sesuai Review Focus anti-flash. Cost if wrong: layar tertahan beberapa ms saat boot.
- Task 2: complete (tests: `npm run test:unit` → 70/70 pass; typecheck 31 baseline, nol error di UI kit). Ruling: `formatQueueNumber` di `src/lib/ticker.ts` menjadi sumber baru; `src/lib/display.ts` sengaja tetap punya `formatNomorAntrian` sendiri karena modul itu didesain tanpa impor lokal agar bisa diuji Node (komentar header). Cost if wrong: dua fungsi identik perlu dijaga bersama (test keduanya ada).
- Task 3: complete (kode+typecheck; runtime pending). `BarberTabBar` dipasang di 4 layout role; `RoleHeader` dirombak (ThemeSwitch dihapus, Badge role); menu Tampilan di `ProfileForm` → `/pengaturan/tampilan`; `WallSwitch` + preview tema; login tidak lagi memuat ThemeSwitch. Typecheck 31 → 30 (satu error lama register ikut hilang).
- Task 4: complete (kode+typecheck). Login/register ditulis ulang dua panel responsif (≥900px) memakai `AuthBrandPanel`; Google OAuth, panel DEMO, dan quick-fill dihapus; field kosong; strength meter register; kredensial dipindah ke `docs/akun-demo.md`; `expo-auth-session` di-uninstall, `expo-linking`/`expo-web-browser` dipertahankan karena masih dipakai.
  - Ruling: `AuthBrandPanel` diekstrak sebagai komponen bersama (deviasi kecil dari plan yang menyebut panel brand ditulis inline). Cost if wrong: satu file tambahan di `components/`.
- Task 5: complete (kode+typecheck; runtime pending). `home`, `history`, `queue/status`, `queue/new` dirombak; `profile` memakai `ProfileForm` yang sudah diperbarui. `queue/new` menampilkan overlay `Stamp` + `Confetti` 1200 ms sebelum `router.replace` ke status; payload insert tidak berubah. `queue/status` memakai `Card` + `PoleStrip` + `Ticker` + `Badge`, mempertahankan share/cancel/rating; tombol QRIS sengaja belum ditambah (Fase 6).
  - Ruling: `share` memakai `formatQueueNumber` dari `lib/ticker` (satu sumber format). Cost if wrong: teks share berubah dari `A-01` ke format yang sama (tidak ada perubahan perilaku).
- Task 6: complete (kode+typecheck; runtime pending). Barber queue: hero + mode Card + stat mono + kartu tugas; kasir queue: 4 stat Card + walk-in modal; kasir call: Ticker nomor + Stamp/Confetti panggilan sukses + pilihan kursi/barber ala kartu; payment: kartu tagihan, modal pembayaran Card + tip chips, metode Tunai aktif dan QRIS tetap terkunci "Segera Hadir"; profil barber/kasir memakai `ProfileForm` tanpa header ganda.
- Task 7: complete (kode+typecheck; runtime pending). `ringkasan`, `laporan`, `treatments`, `products`, `staff` dirombak memakai UI kit; `profile` memakai `ProfileForm` + `JamOperasionalCard` tanpa header ganda. CRUD/Edge Function `create-staff`/upload foto tidak berubah. Typecheck tetap 30 baseline.
- Task 8: in progress (kode+dokumen). Display TV memakai `Ticker` (`formatQueueNumber` dari `lib/ticker`) + `Reveal` untuk kartu panggilan & 5 antrian berikutnya; `darkStitchTheme`, TTS, dedupe, cache, overlay "Aktifkan Suara" tidak berubah. `docs/design.md` naik ke versi 2.0 (token paper/shadow/shadowAccent/radius, pemuatan font, komponen UI kit, WallSwitch, Motion + reduced motion). PRD B21/B22 ditambahkan, B7 ditutup. AGENTS.md: sumber desain diperbarui + baris roadmap UI 2.0.
  - Ruling: `src/lib/display.ts` tetap mempertahankan `formatNomorAntrian` (self-contained untuk test Node); layar display memakai `formatQueueNumber` dari `lib/ticker` sesuai plan. Cost if wrong: dua fungsi identik dijaga oleh test masing-masing.
  - Ruling: `Ticker` menerima `color={theme.amber}` eksplisit karena komponen membaca `useAppTheme`, sedangkan display selalu `darkStitchTheme`. Cost if wrong: jika tema aplikasi terang, nomor tetap amber di atas latar gelap display.

## Verifikasi

- `npm run test:unit` → **70/70 pass** (20 Nov 2026).
- `npm run typecheck` → **30 error**, semuanya di file template lama (`app-tabs.web.tsx` 13, `ui/collapsible.tsx` 7, `hint-row.tsx` 4, `web-badge.tsx` 3, `use-theme.ts` 1, `app-tabs.tsx` 1, `themed-view.tsx` 1). Nol error di kode baru.
- Runtime web/Metro: _diisi setelah server merespons_.
- Playwright screenshot 390/1280 light/dark: _belum tersedia — menunggu runtime web_.
- Console browser 0 error: _belum diverifikasi_.

## Checklist manual (Expo Go) — menunggu user

- [ ] Login tiap role.
- [ ] Ambil antrian customer.
- [ ] Ganti tema di Profil → Tampilan, lalu reload (persistensi).
- [ ] Buka semua tab tiap role.
- [ ] Display TV + TTS tetap berjalan.
- [ ] Uji kamera QRIS (setelah Fase 6) di HP.

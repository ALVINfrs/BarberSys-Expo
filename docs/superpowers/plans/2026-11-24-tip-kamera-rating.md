# Fase 7F — Tip Barber/Customer, Fix Kamera Expo Go, Fix Navigasi Rating & Uji Playwright

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Barber melihat rekap tip sebulan + filter 7/30 hari + daftar lengkap pemberi tip; customer melihat tip yang pernah diberikan per barber; tombol Rating benar-benar membuka halaman; kamera QRIS jalan di Expo Go; web Display TV diuji dengan Playwright.

**Architecture:** Helper murni `tip-history.ts` (agregasi/filter) dan `camera-gate.ts` (aturan availability per platform) diuji Node. Halaman Rating dipindah dari tab tersembunyi ke Stack root (`/admin-rating`) sesuai pola dokumentasi Expo Router. Kamera tidak lagi dugate `isAvailableAsync()` di native; izin diminta otomatis saat masuk. Tip barber memakai tab baru, tip customer menjadi bagian Riwayat (tidak menambah tab ke-6).

**Tech Stack:** Expo SDK 58, expo-camera, expo-router, Supabase, TypeScript strict, Node test runner, Playwright MCP.

**Spec:** permintaan user 24 Nov 2026 (chat), `docs/superpowers/specs/2026-11-24-riwayat-struk-rating-display-design.md` (konteks).

## Global Constraints
- Tanpa perubahan DB. Sumber tip: `queue.tip_amount`, `status='lunas'`, join `profiles` + `treatments`.
- Barber hanya melihat transaksi dengan `barber_id = user.id`; customer hanya `user_id = user.id`.
- Filter default 30 hari, opsi 7 hari & semua.
- Commit setelah test hijau.

## Root Cause (terverifikasi)
- Kamera: `CameraView.isAvailableAsync()` berlabel `@platform web`; di native melempar `UnavailabilityError`, ditangkap `catch` → `cameraAvailable=false` → layar "Kamera Tidak Tersedia" menghalangi `useCameraPermissions()`.
- Rating: route adalah `Tabs.Screen` dengan `href: null`; dokumentasi Expo menyarankan halaman detail dipush dari Stack root agar kembali ke tab asal.

## Review Focus
- `isAvailableAsync` harus diabaikan di native; web tetap dicek.
- Izin kamera diminta otomatis hanya saat status undetermined, tidak memaksa saat permanent-denied.
- Filter tip AND (barber/periode) dan tanggal WIB.
- Tidak ada tab customer ke-6.

---

### Task 1: Fix kamera QRIS (TDD)
- File: `BarberSys/src/lib/camera-gate.ts`, `BarberSys/scripts/test-camera-gate.mjs`, `BarberSys/src/app/scan-qris.tsx`
- Interface: `canUseCamera(platform: 'web'|'ios'|'android', availability: boolean|null|undefined): boolean`
- [ ] Test FAIL: native true walau availability false/null; web hanya true saat availability true.
- [ ] Implementasi helper; test PASS.
- [ ] `scan-qris.tsx`: `Platform.OS`, gabungkan availability + platform via helper; pada native hapus blok "Kamera Tidak Tersedia"; minta izin otomatis saat undetermined; web tetap pesan dukungan.
- [ ] Test unit + typecheck.

### Task 2: Fix navigasi Rating
- File: pindah `BarberSys/src/app/admin/rating.tsx` → `BarberSys/src/app/admin-rating.tsx`; ubah `BarberSys/src/app/admin/_layout.tsx` (hapus `Tabs.Screen name="rating"`); ubah link di `ringkasan.tsx`, `laporan.tsx`, dan `SHORTCUTS` ke `/admin-rating`; daftarkan `Stack.Screen name="admin-rating"` di `src/app/_layout.tsx`.
- Interface: `ratingHref(): '/admin-rating'` di `src/lib/navigation.ts` + test (`scripts/test-navigation.mjs`) agar semua link konsisten.
- [ ] Test FAIL lalu PASS untuk `ratingHref()`.
- [ ] Pastikan guard role admin tetap jalan di halaman baru.
- [ ] Test unit + typecheck.

### Task 3: Tip barber & customer
- File baru: `BarberSys/src/lib/tip-history.ts`, `BarberSys/scripts/test-tip-history.mjs`, `BarberSys/src/app/barber/tip.tsx`, `BarberSys/src/components/tip-summary.tsx`
- Diubah: `BarberSys/src/app/barber/_layout.tsx` (tab Tip), `BarberSys/src/app/customer/history.tsx` (seksi "Tip Saya"), `BarberSys/package.json`
- Interface: `TipEntry { tanggalIso, customerNama, barberNama, treatmentNama, jumlah, nomorAntrian }`, `summarizeTips(items)`, `filterTipsByPeriode(items, periode, now)`, `tipByBarber(items)`.
- [ ] Test FAIL → implementasi → PASS (total, count, rata-rata, filter 7/30, grouping per barber).
- [ ] Layar barber: query `queue` barber_id + tip_amount > 0 + lunas, filter 7/30/semua, ringkasan + daftar pemberi (nama, jumlah, tanggal WIB, treatment).
- [ ] Customer: seksi di Riwayat menampilkan total tip & grouping "kasih tip ke barber mana" + daftar transaksi bertip.
- [ ] Test unit + typecheck.

### Task 4: Uji web Vite dengan Playwright & commit
- [ ] Jalankan `npm run dev` di `BarberSys/display-tv`, buka `http://localhost:5173` via Playwright.
- [ ] Cek judul, jam WIB, blok panggilan, tombol "Aktifkan Suara"/"Tes Suara", voice select, tidak ada error konsol. Ambil screenshot.
- [ ] `npm run test:unit` hijau + `npm run typecheck` 0 error baru; commit `Fase 7F: tip barber/customer, fix kamera & rating, uji display`.

# SDD ledger — plan: docs/superpowers/plans/2026-11-19-fase6-qris.md

**Branch:** feat/fase-5 · **Spec:** docs/prd .md §13.4 (F6.1–F6.5) + §7

## Setup

- Ruling: ledger ditulis manual karena script `sdd-workspace`/`task-start`/`task-done` tidak tersedia di paket superpowers terpasang. Cost if wrong: catatan tidak berada di scratch git-ignored, tetapi tetap sesuai path yang diminta plan.
- Ruling: user memerintahkan Fase 6 setelah UI 2.0; aturan "satu fase satu waktu" dilonggarkan khusus untuk dua pekerjaan yang diminta user. Cost if wrong: tidak ada.
- Ruling: total QRIS mencakup tip yang dipilih kasir. Saat QR dibuat, `tip_amount` + `kasir_id` disimpan lebih dulu (status tetap `selesai`) agar customer bisa memverifikasi total dari database dan payload tidak berubah jika tip diubah setelah QR tampil. Cost if wrong: tip sudah tercatat walau QR batal/kedaluwarsa dan harus diubah saat QR dibuat ulang.
- Ruling: QRIS tidak ditawarkan untuk baris walk-in (`user_id = null`) karena tidak ada customer yang bisa memindai; baris walk-in tetap tunai. Cost if wrong: kasir tidak bisa memakai QRIS untuk penjualan walk-in (memang di luar cakupan F6).
- Ruling: verifikasi runtime memakai production web export (bukan dev server) karena mesin uji hanya 3.9 GB RAM dan dev server OOM saat bundling berulang. Cost if wrong: perilaku dev HMR tidak tercakup; alur aplikasi tetap diuji pada bundle produksi.
- Ruling: user memerintahkan upgrade ke Expo SDK 58 sebelum Fase 6 Task 1. Urutan: upgrade SDK + `expo install --fix` + `expo-doctor` → perbaiki breaking change → unit test/typecheck/export web → baru pasang dependency QRIS versi SDK 58. Cost if wrong: upgrade membawa risiko regresi native/Expo Go (Expo Go lama tidak bisa membuka SDK 58); bila upgrade gagal, rollback `package.json`/`package-lock.json` ke kondisi sebelum upgrade.

## Pre-flight scan (shared interfaces)

- Task 2 `buildQrisPayload`/`encodeQrisPayload`/`parseQrisPayload` → Task 5 (kasir) & Task 6 (customer) — cocok.
- Task 2 `computeQueueTotal` → Task 6 verifikasi total — cocok.
- Task 4 `buildPaymentReceipt` → Task 5 tunai & QRIS — cocok; `ReceiptData` sudah ada di `src/lib/receipt.ts`.
- Task 5 payload `queueId`/`total` → Task 6 `.eq('id', payload.queueId).eq('user_id', user.id)` — cocok.
- Task 3 guard `selesai → lunas` qris → Task 6 update — cocok; walk-in tidak punya `user_id` sehingga `auth.uid()` tidak akan cocok.
- Realtime channel `qris-<queueId>` unik per transaksi — tidak bentrok dengan channel `kasir-payment-dashboard`.

## Task log

- Task 1: selesai — `expo-camera ~58.0.14`, `react-native-svg 15.16.0`, `react-native-qrcode-svg ^6.3.54`; plugin kamera + `cameraPermission` di `app.json`; `expo-doctor` 20/20.
- Task 2: selesai — TDD `src/lib/qris.ts` + `scripts/test-qris.mjs`, 15 test (roundtrip, format/fields/expired, batas 30 menit, toleransi jam 5 menit, total & kode transaksi). `npm run test:unit` 89/89 pass.
- Task 3: selesai — migrasi `fase6_qris_customer_pay` diterapkan via Supabase MCP. Verifikasi dalam transaksi: `selesai → lunas/qris` BERHASIL (`completed_at` terisi); `tunai`, ubah `nama_customer`, dan `menunggu → lunas` DITOLAK. Data uji bersih (0 baris). Advisor keamanan: hanya temuan lama, tidak ada temuan baru dari migrasi.
- Task 4: selesai — TDD `src/lib/payment-receipt.ts` + `scripts/test-payment-receipt.mjs` (8 test); `payment.tsx` memakai `buildPaymentReceipt`; struk tunai identik.
- Task 5: selesai — modal QRIS di `payment.tsx`: QR `react-native-qrcode-svg`, simpan tip+kasir sebelum QR (status tetap `selesai`), Realtime `qris-<id>` + polling 5 detik, expiry 30 menit dengan cek DB terakhir, regenerate, Stamp LUNAS + Confetti + aksi struk. Walk-in tetap tunai. `npm run test:unit` 97/97; typecheck kode aplikasi bersih.
- Task 6: selesai — `/scan-qris` (kamera izin/izin ditolak/tidak tersedia, parse QR, verifikasi pemilik + status + total DB, bottom sheet ringkasan, bayar `selesai → lunas/qris`, konfirmasi + redirect Riwayat). Route terdaftar di root layout; tombol "BAYAR DENGAN QRIS" hanya saat status `selesai` di C3. Typecheck bersih.
- Task 7: pending
- Task 7: pending

## Verifikasi

- `npm run test:unit` → 89/89 pass (Fase 6: 15 test QRIS baru).
- `npm run typecheck` → 0 error di kode aplikasi; 34 error tersisa hanya komponen template Expo yang tidak diimpor layar mana pun (`app-tabs`, `hint-row`, `web-badge`, `themed-*`, `use-theme`, `ui/collapsible`) akibat tipe RN 0.88. Bukan regresi Fase 6.
- Migrasi `fase6_qris_customer_pay` → _belum diterapkan_.
- Playwright web → _belum_.
- Manual HP (kamera) → _belum — menunggu perangkat_.

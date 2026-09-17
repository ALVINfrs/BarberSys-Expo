# Spec — Nota Branded A (F3.4 polish, tanpa QR)

Status: Approved — build mode
Plan nanti: `docs/superpowers/plans/2026-09-18-nota-branded-a-plan.md` (opsional)
Tanggal: 2026-09-18

## 1) Latar & Tujuan
- F3.4 PRD: Kasir `cetak/bagikan struk PDF via expo-print + expo-sharing` — implementasi existing `src/lib/receipt.ts` masih plain (tokoNama/alamat + tanggal/metode + customer/barber + tabel + total). User minta **lebih keren**: logo toko + kasir yang melayani + barber yang melayani + alamat + jam, layout A (A4 branded), **tanpa QR**.
- Goal: struk PDF yang branded, escape aman, 0 migrasi DB, maintainable, testable, bisa diuji 2 HP.

## 2) Sumber Kebenaran
- PRD `docs/prd .md` (perhatikan spasi) §F3.4, §7 (barbershop_settings, queue), `docs/design.md` token Neo-Brutalism, `BarberSys/AGENTS.md` (satu fase → tes → backlog).
- Asset: `BarberSys/assets/images/barbersys_logo.png` (logo lokal fallback base64).

## 3) Scope
- IN: header logo base64 + nama_toko/alamat tengah, baris `Tanggal | Metode | Kasir: <login> | Barber: <assigned> | Kode: <8 char id>`, tabel treatment+produk, box `Instruksi: ...` bila ada, total bold, footer `Jam operasional + Terima kasih`. Data kasir dari `profiles where id=auth.uid()`.
- OUT: QR (disepakati tanpa QR), kolom DB baru `logo_url` (jadi B12 backlog `Belum ditinjau`), printer thermal 58mm, payment QRIS (Fase 6).

## 4) Desain (Bounded)
- Lib: `src/lib/receipt.ts` — `ReceiptData{ nomor,tokoNama/Alamat,kasirNama,barberNama,treatmentNama/Harga,items,total,metode,tanggal,kodeTransaksi,instruksi,jamBuka/Tutup,logoBase64 }` + `escapeHtml()`, `formatRupiahReceipt()`, `buildReceiptHtml()` → HTML A4 `<style>` Helvetica, `img data:image/png;base64` centered. Tanpa QR.
- App: `src/app/(kasir)/payment.tsx` — `handleKonfirmasiBayar` fetch `shop (barbershop_settings limit1)`, `kasirProfile (profiles id=user.id)`, `kode=id.slice(0,8).toUpperCase()`, `instruksi=selectedItem.instruksi_potongan`, `total/items` existing, `buildReceiptHtml()`. `handleShareReceipt` = `Print.printToFileAsync({html})` + `Sharing.shareAsync`, `handlePrintReceipt` = `Print.printAsync({html})`. Fallback toko `BarberSys`.
- Test: `scripts/test-receipt.mjs` nambah case kasir/barber/ instruksi ter-escape + logo prefix.
- DB: cek — `queue.kasir_id, barber_id, instruksi_potongan, barbershop_settings` ada → **0 migrasi**. B12 `logo_url text null` dicatat backlog saja.

## 5) Rencana Eksekusi (berurutan, satu tugas → tes)
T0 baseline: `npx tsc --noEmit` (B8 34 error baseline), `node --test`.
T1 receipt.ts → layout A + logoBase64 helper.
T2 payment.tsx → supply kasirNama/kode/instruksi/jam.
T3 verif: `node --test` 7 pass, `tsc` 0 di file Fase 3, `expo start` LAN `192.168.1.156:8081` 2 HP: HP1 customer `menunggu`, HP2 kasir lunasi → `Struk Terakhir` muncul + Share → PDF kebaca logo+alamat+kasir.

## 6) Kriteria Selesai
- PDF share/print tanpa crash, escape `<script>` → `&lt;`, toko/kasir/barber/kode tampil, instruksi box muncul hanya bila ada, total = treatment+produk.
- `npx tsc --noEmit` tetap 34 B8, unit test pass, manual 2 HP OK → commit `feat/fase-3` (nggak merge tanpa perintah).

## 7) Risiko
- `Sharing.isAvailableAsync()` false di simulator → fallback alert path `uri`.
- Logo base64 gede → PNG <50KB aman. `Print` web → guard `Platform.OS`.

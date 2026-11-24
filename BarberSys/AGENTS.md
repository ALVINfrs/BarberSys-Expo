# BarberSys — Aturan Kerja Agent (AGENTS.md)

> File ini adalah ringkasan operasional untuk AI coding agent. **Sumber kebenaran tetap `docs/prd .md`** (perhatikan: nama file ada spasi sebelum .md) + `docs/design.md`. Jika AGENTS.md bentrok dengan PRD, **PRD yang menang**.

## Sumber Kebenaran (baca sebelum menulis kode)

1. `docs/prd .md` — PRD: requirement per fase (Bagian 13), skema DB (Bagian 7), aturan bisnis (Bagian 15), **aturan kerja wajib (Bagian 19)**, backlog (Bagian 20).
2. `docs/design.md` — token desain **Neo-Brutalism Editorial ("Editorial Barber") versi 2.0** + spesifikasi komponen. Arah ini disetujui 19 Nov 2026 dan menggantikan aturan "UI wajib match persis mockup Stitch"; mockup Stitch tetap menjadi referensi struktur layar.
3. Dokumen ini — ringkasan teknis + status roadmap. Diperbarui tiap ganti fase.

## Aturan Kerja (mirror PRD §19 — wajib)

1. **Satu fase, satu waktu.** Jangan mulai requirement fase berikutnya sebelum fase saat ini lulus checkpoint review.
2. **Satu requirement, satu langkah.** Di dalam fase: implement → uji → lanjut requirement berikutnya (F3.1 → F3.2 → ...), jangan tulis semua sekaligus lalu diuji belakangan.
3. **Jangan tambal diam-diam.** Temuan/ide baru → catat ke Backlog (PRD Bagian 20) dulu, kerjakan hanya setelah status "Disetujui, menunggu jadwal".
4. **Skema DB berubah hanya via migrasi** (bukan edit manual), + wajib sinkron `src/types/database.ts`, + RLS untuk tabel/baru yang sensitif.
5. **Checkpoint review** di akhir tiap fase sesuai checklist PRD 19.3 sebelum merge ke `main`.
6. **Commit/merge/push hanya atas perintah eksplisit user.**

## Status Roadmap

| Fase | Isi | Status |
|------|-----|--------|
| 0–1 | Splash/Login/Register, 4 stack role, antrian end-to-end, realtime | ✅ Selesai |
| 2 | Rating & komentar, katalog produk+treatment CRUD, add-on produk, nota gabungan, walk-in produk kasir, instruksi potongan, profil editable semua role, statistik harian barber, kirim tiket | ✅ Selesai |
| **3** | **F3.1 status barber (Tersedia/Sibuk otomatis, Istirahat manual), F3.2 barber istirahat tak bisa dipilih, F3.3 cancel antrian (hanya `menunggu`), F3.4 struk PDF (`expo-print`+`expo-sharing`), F3.5 walk-in manual kasir** | ✅ Selesai |
| **4** | **F4.1 tip, F4.2 jam operasional (Opsi H: antrian di luar jam ditahan `hold_until` + editor Admin), F4.3 estimasi tunggu per barber & global, F4.4 laporan PDF/XLSX, F4.5 dashboard Admin, F4.6 dashboard Kasir** | 🟡 Selesai diimplementasikan (18 Nov 2026) — menunggu uji manual di HP |
| 5 | Display TV publik + TTS + notifikasi lokal (remote push ditunda, B17) | 🟡 Selesai diimplementasikan (19 Nov 2026) — menunggu uji manual di HP/browser |
| **UI 2.0** | **Redesign "Editorial Barber" seluruh layar (auth, customer, barber, kasir, admin, display) + UI kit + toggle tema `WallSwitch`; Google OAuth dihapus dari UI (B22)** | 🟡 Selesai diimplementasikan (20 Nov 2026) — menunggu uji runtime/manual |
| 6 | QRIS dummy (`expo-camera` + QR generate) | ⏳ Menyusul setelah UI 2.0 |

Fitur fase yang belum tiba **wajib tampil sebagai tombol/tab terkunci** "🔒 Segera Hadir (dibuka di Fase X)" — jangan diimplementasi, jangan dihilangkan (mockup Stitch memuat elemennya).

## Tech Stack

- **Expo SDK 57** + expo-router (file-based routing) + TypeScript strict.
- **Supabase**: Postgres + RLS, Realtime (postgres_changes), Storage (buckets `avatars`/`treatments`/`products`), Edge Functions (service_role), RPC untuk agregasi.
- Paket terpasang: `expo-image-picker` (foto), `expo-sharing` (share native). Fase 3 menambah `expo-print` (PDF struk). Fase 4 menambah `xlsx` (ekspor laporan) dan memakai ulang `expo-print` untuk PDF laporan. Fase 5 menambah `expo-notifications` (notifikasi lokal; remote push ditunda ke fase akhir, B17). Fase 6 menambah `expo-camera` + qrcode.
  - ⚠️ Advisory `xlsx@0.18.5`: CVE-2023-30533 & CVE-2024-22363. Kode hanya memakai **writer** dengan data internal (tidak membaca file unggahan), sehingga risiko tidak terekspos; penggantian dependency dicatat di PRD B15 (menunggu jadwal).
  - ⚠️ **B18**: publikasi `supabase_realtime` sebelumnya kosong. Migrasi Fase 5 menambahkan `queue` + `queue_display` + `replica identity full`; tabel lain belum terdaftar dan perlu ditinjau terpisah.
- Waktu hari-ini dibatasi WIB (UTC+7) — lihat PRD 13.2.

## Arsitektur & Maintainability

- Struktur: layar per role di `src/app/(customer|kasir|barber|admin)/` (expo-router group), logika domain di `src/lib/`, komponen bersama di `src/components/`, hooks di `src/hooks/`.
- **Satu sumber data**: semua layar baca langsung dari `queue`/tabel terkait via Supabase client + subscribe `postgres_changes` per layar — jangan cache state yang tidak di-refresh.
- Komponen form profil (edit nama/HP/foto) dipakai bersama: `src/components/ProfileForm.tsx`.
- Upload foto selalu via `src/lib/upload-photo.ts` (base64 → Uint8Array, JANGAN `fetch(uri).blob()` — rusak di RN).
- Skema types: `src/types/database.ts` wajib di-regenerate setelah migrasi.
- "Tersedia"/"Sibuk" barber **tidak disimpan** — dihitung on-the-fly dari baris `queue` berstatus `dilayani` (PRD 11.2). Hanya `istirahat` tersimpan di `profiles.status_kerja`.

## Workflow Git

- Branch `feat/fase-N` per fase → checkpoint lulus → merge ke `main` (fast-forward) atas perintah user.
- Commit per requirement (pesan: `Fase N: <fitur>`), bukan satu commit raksasa.

## Larangan Eksplisit (PRD 19.4)

- ❌ Melompat fase / "sekalian" fitur fase lain.
- ❌ Tambah kolom/tabel/bucket spontan tanpa catat Backlog + approval dulu.
- ❌ Mengubah token/keputusan `design.md` tanpa catat Backlog.
- ❌ Printer thermal fisik (out of scope; struk = PDF).
- ❌ Hardcode secrets — kredensial hanya via `.env` (`EXPO_PUBLIC_SUPABASE_*`).

# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

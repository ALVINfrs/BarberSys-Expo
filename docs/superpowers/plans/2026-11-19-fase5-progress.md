# Fase 5 — Progress & E2E Ledger

> Dokumen ini adalah **sumber status kerja** Fase 5. Setelah compaction, baca file ini + `2026-11-19-fase5-display-tv.md` sebelum menyentuh kode.
> Terakhir diperbarui: 19 Nov 2026.

## Konteks

- Branch: `feat/fase-4` (belum ada branch Fase 5; HEAD `88c967e`).
- Commit Fase 4: `88c967e` — 35 file, sudah di-commit atas perintah user.
- Project Supabase: `qsfocxoqnkekmndcswlu`.
- Metro watch: `:8081` (background shell). URL Expo Go: `exp://192.168.43.236:8081`.
- Akun test: `admin@`, `customer@`, `barber@`, `kasir@barbersys.com` — password `Password123!`.

## Keputusan user (19 Nov 2026)

| Topik | Keputusan |
|---|---|
| Display TV | Lokal dulu, struktur siap deploy |
| Remote push | Ditunda ke fase akhir bersama Fase 6 |
| Notifikasi | Lokal (`expo-notifications`) sekarang; trigger sisa 1 + dipanggil |
| Isi display | Nomor dipanggil + 5 antrian berikut + jumlah menunggu |
| Data display | Tabel `queue_display` + RLS anon (queue tetap tertutup) |
| TTS | 2x, dedupe per panggilan |

## Temuan penting

- **B18:** `pg_publication_rel` untuk `supabase_realtime` **kosong** — tidak ada tabel yang terdaftar, jadi realtime layar lama kemungkinan tidak pernah mengirim event. Migrasi Fase 5 menambahkan `queue` + `queue_display`; tabel lain dicatat di backlog.
- `queue` punya status: `menunggu`, `dipanggil`, `dilayani`, `selesai`, `lunas`, `dibatalkan`.
- RLS `queue`: customer hanya melihat baris sendiri → posisi antrian tidak bisa dihitung dari client; perlu RPC `queue_my_status()` SECURITY DEFINER.
- `design.md` §8 sudah punya spesifikasi Display (dark permanen, nomor amber, tanpa tombol). Tombol "Aktifkan Suara" adalah pengecualian teknis (autoplay) → B19.

## Task checklist

### Task 0 — Dokumentasi
- [x] PRD §20: B16–B19
- [x] PRD §13 FASE 5 diperluas
- [x] PRD §7.2/§7.3: `queue_display`
- [x] `design.md` §8 catatan tombol suara
- [x] `AGENTS.md` status + tech stack + B18

### Task 1 — Migrasi `queue_display`
- [x] Migrasi `fase5_queue_display` diterapkan
- [x] Tabel + trigger + RLS + grant select anon
- [x] `replica identity full` + publikasi realtime (`queue`, `queue_display`)
- [x] Backfill baris aktif
- [x] Verifikasi count aktif = count display
- [x] Verifikasi anon SELECT boleh, INSERT ditolak
- [x] Trigger diuji (dipanggil → upsert, lunas → delete)
- [x] `src/types/database.ts` sinkron

### Task 2 — Helper murni (TDD)
- [x] `test-display.mjs` RED → `display.ts` → GREEN
- [x] `test-pengumuman.mjs` RED → `pengumuman.ts` → GREEN
- [x] Daftarkan ke `npm run test:unit`

### Task 3 — Halaman `/display`
- [x] `src/app/display.tsx` (dark permanen, snapshot, cache, realtime, polling)
- [x] Route didaftarkan di root `_layout.tsx`
- [x] Overlay "Aktifkan Suara" + wake lock guard
- [x] TTS 2x + seed awal + dedupe
- [x] Cache offline + badge koneksi
- [x] Timer hold 30 dtk + `getHoldRefreshDelayMs`
- [x] Typecheck 0 error baru
- [x] Web route HTTP 200 (59.547 byte, overlay & judul ter-render, tanpa error SSR)

### Task 4 — RPC `queue_my_status`
- [x] Migrasi `fase5_queue_my_status`
- [x] Verifikasi JWT customer: hanya baris sendiri + `position_ahead`
- [x] `QueueMyStatus` di types

### Task 5 — Notifikasi lokal
- [x] `test-notifikasi-antrian.mjs` RED → pure logic → GREEN
- [x] `npx expo install expo-notifications` (via `npm install expo-notifications@~57.0.25 --no-audit --no-fund` karena audit npm network gagal)
- [x] `notifikasi-device.ts` (web guard, channel, izin, schedule)
- [x] `useQueueNotifications.ts` (RPC + realtime + interval + dedupe)
- [x] Dipasang di `(customer)/_layout.tsx`
- [x] Typecheck + unit hijau (66/66, baseline 31)

### Task 6 — Verifikasi akhir
- [x] `npm run test:unit` semua lulus (66/66)
- [x] `npm run typecheck` baseline tidak bertambah (31 baris template lama, 0 error Fase 5)
- [x] Bundle Android HTTP 200 (8.526.434 byte)
- [x] Checklist E2E bagian A (database & keamanan) dijalankan otomatis
- [ ] Checklist E2E B–F (browser + HP) — ⏳ butuh user
- [x] Laporan ke user, commit Fase 5 dibuat atas perintah user

## Status akhir sesi (19 Nov 2026)

Implementasi Fase 5 **selesai secara kode** dan lolos verifikasi otomatis:

- Unit test: **67/67 pass** (55 setelah Task 2, + 11 notifikasi, + 1 fallback nama voice).
- Typecheck: 31 baris error template lama, **0 error di file Fase 5**.
- `/display` web: **HTTP 200** (59.547 byte, 12,1 dtk), HTML memuat overlay "Aktifkan Suara" dan judul, tanpa error SSR.
- Bundle Android: **HTTP 200** (8.526.304 byte, 34,2 dtk), `expo-notifications` ter-resolve.
- Perbaikan terakhir: seed pengumuman hanya dari fetch pertama yang sukses (bukan cache) agar reload tidak mengumumkan panggilan lama — sesuai review focus #2.
- TTS: `getVoices()` ditunggu sampai event `voiceschanged` (maks 1,5 dtk), pencocokan voice juga lewat nama (`Indonesian`/`Bahasa`/`Gadis`/`Andika`). Mesin uji hanya punya voice `en-US` (registry Windows), jadi catatan pemasangan voice tampil. Playwright memverifikasi overlay hilang dan catatan muncul; audio tidak bisa dinilai otomatis.
- DB: `queue_active = display_rows = 1`; realtime `queue,queue_display`; `replica identity full`; 0 kolom sensitif; 0 antrian hold.

Commit Fase 5 dibuat atas perintah eksplisit user (19 Nov 2026). Uji E2E browser + HP (bagian B–F) menunggu user.

## E2E checklist (butuh browser + HP)

### A. Database & keamanan — ✅ terverifikasi otomatis
- [x] `select count(*)` queue aktif = `queue_display` (1 = 1)
- [x] `select tablename from pg_publication_tables where pubname='supabase_realtime'` memuat `queue`, `queue_display`
- [x] `set local role anon; insert into queue_display ...` → ditolak RLS
- [x] `set local role anon; select * from queue_display limit 5` → boleh, kolom hanya data aman
- [x] Tidak ada kolom `user_id`, `nama_customer`, `no_hp`, `tip_amount`, `metode_bayar` di `queue_display`

### B. Display TV — data — ⏳ butuh user (browser)
- [ ] Buka `http://localhost:8081/display` → dark, nomor besar, jam WIB berjalan
- [ ] Antrian `dipanggil` tampil dengan badge "SILAKAN MENUJU KURSI" + barber + kursi
- [ ] Antrian `dilayani` tetap tampil dengan badge "SEDANG DILAYANI"
- [ ] 5 antrian berikutnya urut `created_at`, bukan nomor acak
- [ ] Jumlah menunggu sesuai
- [ ] Antrian hold (`hold_until` masa depan) **tidak** tampil di berikutnya/hitungan
- [ ] Saat `hold_until` lewat, antrian muncul tanpa reload manual

### C. Display TV — realtime — ⏳ butuh user (browser)
- [ ] Kasir menekan "Panggil" → kartu muncul di display < 5 detik
- [ ] Barber menandai "dilayani" → badge berubah
- [ ] Pembayaran `lunas` / status final → kartu hilang
- [ ] Refresh halaman → tidak mengumumkan ulang nomor lama
- [ ] DevTools → Offline → snapshot terakhir tetap tampil + badge offline
- [ ] Online kembali → data sync lagi

### D. TTS — ⏳ butuh user (browser)
- [x] Klik "Aktifkan Suara" → overlay hilang (diverifikasi Playwright)
- [ ] Pasang voice Bahasa Indonesia di Windows (Settings → Time & Language → Speech → Add voices → Bahasa Indonesia), lalu restart browser
- [ ] Panggilan baru → suara Bahasa Indonesia, **2x**, menyebut nomor + kursi/barber
- [ ] Panggilan baru saat suara lama berbunyi → tidak tumpang tindih
- [x] Browser tanpa voice `id-ID` → catatan instruksi pemasangan tampil (diverifikasi Playwright)

### E. Notifikasi lokal (HP) — ⏳ butuh user (Expo Go)
- [ ] Izin notifikasi diminta sekali (Android 13+)
- [ ] Customer dengan 2 antrian di depan → saat sisa 1 muncul notif "Hampir giliranmu"
- [ ] Saat kasir memanggil → notif "Giliranmu tiba!"
- [ ] Reconnect/refresh → notif tidak berulang
- [ ] App ditutup → tidak ada notif (batas Expo Go; remote push B17)

### F. Regresi — ⏳ butuh user
- [ ] Login 4 role tetap jalan
- [ ] Tab bar 3-tombol tetap benar
- [ ] Layar kasir/barber/admin tidak error
- [ ] Fase 4 (tip, hold, laporan) tidak berubah perilaku

## Perintah verifikasi

```powershell
cd "E:\projrct-React-Native - BarberSys\BarberSys"
npm run test:unit
npm run typecheck
```

Bundle Android (Metro harus hidup):
```powershell
$u = "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=android&dev=true&hot=false&lazy=true"
(Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 240).StatusCode
```

Display web:
```
http://localhost:8081/display
```

## Catatan resume setelah compaction

1. Baca file ini, lalu plan `2026-11-19-fase5-display-tv.md`.
2. Cek `git status --short` + `git log -1 --oneline`.
3. Lanjutkan dari checkbox pertama yang belum tercentang.
4. Jangan commit/push tanpa perintah eksplisit user.
5. Jangan menyentuh QRIS/Fase 6.

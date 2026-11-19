# Fase 5 — Display TV, TTS & Notifikasi Lokal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun layar Display TV publik (`/display`) dengan update realtime + TTS Bahasa Indonesia, serta notifikasi lokal "hampir giliran"/"dipanggil" untuk customer.

**Architecture:** Tabel bayangan `queue_display` menyimpan hanya kolom aman untuk publik; trigger `SECURITY DEFINER` menyinkronkan baris aktif dari `queue`, sehingga role `anon` tidak perlu akses ke `queue`. Halaman web `/display` membaca tabel itu lewat Supabase Realtime + cache snapshot terakhir di `localStorage`. Notifikasi lokal memakai RPC `queue_my_status()` (SECURITY DEFINER, hanya data pemanggil) + `expo-notifications`; remote push ditunda ke fase akhir.

**Tech Stack:** Expo SDK 57, expo-router, React Native Web, Supabase Postgres/Realtime/RLS, TypeScript strict, `expo-notifications`, Web Speech API.

**Spec:** `docs/prd .md` §13 FASE 5, `docs/design.md` §8; keputusan sesi 19 Nov 2026 (lihat `2026-11-19-fase5-progress.md`).

> **Status eksekusi (19 Nov 2026):** semua task implementasi selesai dan lolos verifikasi otomatis (unit 67/67, typecheck baseline 31, `/display` HTTP 200, bundle Android HTTP 200, DB & RLS terverifikasi). TTS memakai voice OS; mesin uji belum punya voice `id-ID`, jadi panduan pemasangan ditampilkan (B20). Sisa: uji manual E2E browser + HP. Commit dibuat atas perintah user. Detail per-task ada di ledger `2026-11-19-fase5-progress.md`.

## Global Constraints

- Waktu selalu WIB (`Asia/Jakarta`) via `src/lib/waktu.ts`; jangan bergantung pada timezone device.
- Semua akses DB lewat Supabase MCP; jangan `curl`/Management API.
- Skema hanya via migrasi `apply_migration`; sinkronkan `src/types/database.ts`; RLS wajib.
- `queue` tetap tertutup untuk `anon`. Display hanya membaca `queue_display`.
- Tampilan Display **selalu dark mode** memakai token `darkStitchTheme` dari `src/context/ThemeContext.tsx`; tidak ada hex hardcode baru di luar token.
- Fase 6 (QRIS) tidak boleh disentuh.
- Commit/merge/push hanya atas perintah eksplisit user. Task di bawah **tidak** diakhiri commit otomatis; akhiri dengan update ledger.
- Test unit: `npm run test:unit`. Typecheck: `npm run typecheck` (baseline 31 baris error template lama; 0 error baru).
- Remote push (`expo-notifications` push token + Edge Function) **di luar scope** sesi ini — ditunda ke fase akhir (B17).

## Review Focus

1. **Antrian hold di luar jam** — baris `menunggu` dengan `hold_until` di masa depan tidak boleh muncul di Display, daftar berikutnya, maupun hitungan menunggu, sampai waktunya lewat (timer lokal + refresh).
2. **Reconnect/reload Display** — tidak boleh mengumumkan ulang nomor yang sudah dipanggil sebelum halaman dibuka; snapshot terakhir tetap tampil saat koneksi putus.
3. **Kebocoran data publik** — `queue_display` tidak boleh memuat nama customer, nomor HP, user_id, treatment, rating, tip, atau metode bayar; `anon` tidak boleh INSERT/UPDATE/DELETE.
4. **Realtime mati** — publikasi `supabase_realtime` saat ini kosong; display harus tetap benar lewat polling fallback, dan migrasi wajib menambahkan `queue_display` + `queue`.
5. **Notifikasi berulang** — event yang sama tidak boleh memicu notifikasi berulang setelah reconnect/refresh; dedupe disimpan di AsyncStorage.

---

### Task 0: Dokumentasi keputusan & backlog

**Files:**
- Modify: `docs/prd .md` (§7.2, §7.3, §13 FASE 5, §20)
- Modify: `docs/design.md` (§8 catatan teknis)
- Modify: `BarberSys/AGENTS.md` (status roadmap, tech stack, catatan B18)

**Interfaces:**
- Consumes: keputusan user 19 Nov 2026 (dropdown).
- Produces: B16 `queue_display` disetujui, B17 remote push ditunda, B18 realtime publication kosong, B19 tombol aktivasi suara.

- [ ] **Step 1: Tambah B16–B19 ke tabel Backlog PRD §20**

B16 = tabel `queue_display` + RLS anon (Disetujui, dikerjakan Fase 5). B17 = remote push/Edge Function/push_tokens ditunda ke fase akhir bersama Fase 6 (Disetujui, menunggu jadwal). B18 = `pg_publication_rel` kosong untuk `supabase_realtime`; migrasi Fase 5 menambahkan `queue` + `queue_display`, tabel lain dicatat untuk review (Sedang dikerjakan). B19 = tombol "Aktifkan Suara" sekali klik, pengecualian aturan "tanpa tombol" design.md §8 karena kebijakan autoplay browser (Disetujui).

- [ ] **Step 2: Perluas §13 FASE 5**

F5.1: route publik `/display`, tabel `queue_display`, disebut 5 antrian berikutnya, cache offline. F5.2: Web Speech API `id-ID`, 2x, dedupe. F5.3: notifikasi lokal sekarang; remote push ditunda (B17).

- [ ] **Step 3: Update §7.2/§7.3**

Tambahkan deskripsi tabel `queue_display` (kolom aman) + baris RLS: `anon`/`authenticated` hanya SELECT.

- [ ] **Step 4: Update `design.md` §8 dan `AGENTS.md`**

Catat pengecualian tombol aktivasi suara; status Fase 5 menjadi "Sedang dikerjakan"; tambah `expo-notifications`; catat B18.

- [ ] **Step 5: Verifikasi**

Run: `git diff --stat`
Expected: hanya file dokumentasi berubah; tidak ada file kode.

---

### Task 1: Migrasi `queue_display` + realtime

**Files:**
- Create (via Supabase MCP `apply_migration`): `fase5_queue_display`
- Modify: `BarberSys/src/types/database.ts`

**Interfaces:**
- Produces: tabel `public.queue_display` dengan kolom `queue_id, nomor_antrian, status, hold_until, barber_nama, kursi_nomor, created_at, called_at, updated_at`; tipe TS `QueueDisplay`.
- Produces: publikasi realtime untuk `queue_display` dan `queue`; `replica identity full` untuk keduanya.

- [ ] **Step 1: Tulis migrasi**

Isi migrasi (ringkas):
1. `create table public.queue_display (...)` + CHECK status in (`menunggu`,`dipanggil`,`dilayani`).
2. `alter table ... enable row level security`; policy `select` untuk `anon, authenticated` using `true`; `grant select` eksplisit; tidak ada policy tulis.
3. Fungsi `queue_display_sync()` `SECURITY DEFINER SET search_path='public'`: DELETE → hapus baris; status di luar tiga status aktif → hapus; selain itu upsert (ambil `profiles.nama` untuk `barber_nama`).
4. Trigger `queue_display_sync_trigger` AFTER INSERT OR UPDATE OR DELETE ON `queue` FOR EACH ROW.
5. Backfill dari `queue` yang statusnya aktif.
6. `alter table queue_display replica identity full;` dan `alter table queue replica identity full;`.
7. Tambahkan kedua tabel ke publikasi `supabase_realtime` (idempotent: cek `pg_publication_tables` dulu).

- [ ] **Step 2: Terapkan migrasi**

Gunakan `tools.supabase.apply_migration` project `qsfocxoqnkekmndcswlu`, name `fase5_queue_display`.

- [ ] **Step 3: Verifikasi DB positif & negatif**

```sql
-- positif: jumlah aktif sama
select
  (select count(*) from public.queue where status in ('menunggu','dipanggil','dilayani')) as queue_active,
  (select count(*) from public.queue_display) as display_rows;
-- publikasi
select tablename from pg_publication_tables where pubname='supabase_realtime';
-- negatif (harus error): anon insert
begin; set local role anon;
insert into public.queue_display(queue_id,nomor_antrian,status,created_at)
values (gen_random_uuid(),999,'menunggu',now());
rollback;
```

Expected: hitungan sama; `queue` + `queue_display` ada di publikasi; INSERT anon ditolak RLS.

- [ ] **Step 4: Sinkronkan `src/types/database.ts`**

Tambahkan `QueueDisplayStatus` dan `interface QueueDisplay` sesuai kolom.

- [ ] **Step 5: Uji trigger manual**

Di transaksi yang di-rollback: update satu baris `queue` menjadi `dipanggil` → `queue_display` berubah; update ke `lunas` → baris `queue_display` hilang.

---

### Task 2: Helper murni Display + TTS (TDD)

**Files:**
- Create: `BarberSys/src/lib/display.ts`
- Create: `BarberSys/src/lib/pengumuman.ts`
- Create: `BarberSys/scripts/test-display.mjs`
- Create: `BarberSys/scripts/test-pengumuman.mjs`
- Modify: `BarberSys/package.json` (`test:unit` menambah 2 file)

**Interfaces:**
- Produces (dipakai Task 3):
```ts
// display.ts
export type DisplayStatus = 'menunggu' | 'dipanggil' | 'dilayani';
export interface DisplayRow {
  queue_id: string; nomor_antrian: number; status: DisplayStatus;
  hold_until: string | null; barber_nama: string | null;
  kursi_nomor: number | null; created_at: string; called_at: string | null;
}
export interface DisplaySnapshot { called: DisplayRow[]; next: DisplayRow[]; waitingCount: number; }
export function formatNomorAntrian(nomor: number): string; // 2 -> "A-02", 12 -> "A-12"
export function isHeld(row: { hold_until: string | null }, nowMs?: number): boolean;
export function buildDisplaySnapshot(rows: DisplayRow[], nowMs?: number, nextLimit?: number): DisplaySnapshot;
export function formatClockWIB(now?: Date): string; // "HH:MM:SS"

// pengumuman.ts
export function buildAnnouncementText(row: DisplayRow): string;
export function announcementKey(row: DisplayRow): string | null;
export function seedAnnouncementKeys(rows: DisplayRow[]): Set<string>;
export function collectNewAnnouncements(rows: DisplayRow[], seen: Set<string>): { key: string; text: string }[];
export function pickIndonesianVoice<T extends { lang: string }>(voices: T[]): T | null;
```

- [ ] **Step 1: Tulis test GAGAL `scripts/test-display.mjs`**

Assertions:
- `formatNomorAntrian(2) === 'A-02'`, `formatNomorAntrian(12) === 'A-12'`.
- `isHeld({hold_until: future}, now)` true; `null` false; past false.
- Snapshot: `dipanggil` + `dilayani` masuk `called`; `menunggu` non-hold masuk `next` urut `created_at`; hold di masa depan tidak masuk `next`/`waitingCount`; `next` maksimal 5; `waitingCount` menghitung semua menunggu non-hold.
- `formatClockWIB(new Date('2026-11-19T02:03:04Z')) === '09:03:04'`.

- [ ] **Step 2: Jalankan → gagal**

Run: `node --no-warnings --experimental-strip-types --test scripts/test-display.mjs`
Expected: `ERR_MODULE_NOT_FOUND` untuk `src/lib/display.ts`.

- [ ] **Step 3: Implementasi `src/lib/display.ts`**

Ikuti signature. Sorting `called`: `dipanggil` sebelum `dilayani`, lalu `called_at` naik, `null` terakhir. Sorting `next`: `created_at` naik lalu `nomor_antrian` naik. `formatClockWIB` memakai `wibParts`.

- [ ] **Step 4: Jalankan test display → hijau**

- [ ] **Step 5: Tulis test GAGAL `scripts/test-pengumuman.mjs`**

Assertions:
- Teks tanpa kursi: `Nomor antrian A 12. Silakan menuju barber Budi.`
- Dengan kursi: `Nomor antrian A 12. Silakan menuju kursi 3. Barber Budi.`
- Tanpa barber: `Nomor antrian A 12. Silakan menuju kasir.`
- `announcementKey` null untuk `dilayani`/`menunggu`; unik per `called_at`.
- `seedAnnouncementKeys` menandai semua panggilan awal sehingga `collectNewAnnouncements` pada render pertama = kosong.
- Baris baru setelah seed menghasilkan 1 pengumuman; baris yang sama tidak diulang.
- `pickIndonesianVoice` memilih voice `id-ID`, fallback `id`, null kalau tidak ada.

- [ ] **Step 6: Jalankan test pengumuman → gagal, implementasi `src/lib/pengumuman.ts`, lalu hijau**

- [ ] **Step 7: Daftarkan kedua test ke `npm run test:unit` dan jalankan semua**

Expected: `# pass` bertambah 2 file, 0 fail.

---

### Task 3: Halaman `/display` + integrasi TTS

**Files:**
- Create: `BarberSys/src/app/display.tsx`
- Modify: `BarberSys/src/app/_layout.tsx` (daftarkan `<Stack.Screen name="display" />`)

**Interfaces:**
- Consumes: `buildDisplaySnapshot`, `formatNomorAntrian`, `formatClockWIB`, `isHeld`, `seedAnnouncementKeys`, `collectNewAnnouncements`, `buildAnnouncementText`, `pickIndonesianVoice`, `getHoldRefreshDelayMs` (waktu.ts).
- Produces: route web publik `/display`.

- [ ] **Step 1: Implementasi halaman**

Ketentuan:
- Pakai `darkStitchTheme` langsung (bukan `useAppTheme`) agar selalu dark.
- Fetch `supabase.from('queue_display').select('*')`; realtime channel `display-queue` pada `postgres_changes` tabel `queue_display`; refetch debounce 250ms; polling fallback 20 detik.
- Cache snapshot sukses di `localStorage` key `barbersys:display:snapshot:v1` berbentuk `{ rows, savedAt }`; saat fetch gagal pakai cache + badge "Koneksi terputus".
- Timer 30 detik untuk mengevaluasi hold + `getHoldRefreshDelayMs` untuk alarm hold terdekat; saat hold lewat, refetch.
- Overlay aktivasi suara (sekali klik): memanggil `speechSynthesis.getVoices()`, `pickIndonesianVoice`, menyembunyikan overlay, dan mencoba Screen Wake Lock dengan guard `(navigator as any).wakeLock`.
- Pengumuman: seed saat load pertama; setelah itu setiap baris baru berstatus `dipanggil` diumumkan **2x** (jeda 1,6 detik); panggilan baru membatalkan timer ulangan lama; tidak ada suara kalau `speechSynthesis` tidak tersedia (tampilkan catatan kecil).
- Layout: header (nama toko fallback "BARBERSYS", jam WIB, status koneksi), grid kartu panggilan (nomor `A-12` besar amber, badge `SILAKAN MENUJU KURSI`/`SEDANG DILAYANI`, barber, kursi), footer "Antrian Berikutnya" (maks 5 chip) + "Menunggu: N".
- `Platform.OS !== 'web'` tetap dirender (tidak crash), tetapi teks kecil "Display dirancang untuk browser".
- Set `document.title` di web.

- [ ] **Step 2: Daftarkan route**

Tambahkan `<Stack.Screen name="display" />` di root layout. Jangan menambah redirect auth.

- [ ] **Step 3: Verifikasi typecheck**

Run: `npm run typecheck`
Expected: 31 baris baseline, 0 error di `display.tsx`/`display.ts`/`pengumuman.ts`.

- [ ] **Step 4: Verifikasi web bundle**

Run (Metro `:8081` hidup): `Invoke-WebRequest "http://localhost:8081/display?platform=web"` atau bundle web.
Expected: HTTP 200 / route terdaftar tanpa error module.

- [ ] **Step 5: Cek visual manual**

Buka `http://localhost:8081/display`; pastikan dark, angka besar, daftar berikutnya, badge koneksi, overlay suara.

---

### Task 4: RPC `queue_my_status` untuk customer

**Files:**
- Create (via Supabase MCP `apply_migration`): `fase5_queue_my_status`
- Modify: `BarberSys/src/types/database.ts`

**Interfaces:**
- Produces: RPC `public.queue_my_status()` mengembalikan 0/1 baris:
`id, nomor_antrian, status, barber_id, barber_nama, called_at, hold_until, kursi_nomor, position_ahead`.

- [ ] **Step 1: Tulis migrasi fungsi `SECURITY DEFINER`**

Aturan: hanya baris milik `auth.uid()`; status aktif (`menunggu`,`dipanggil`,`dilayani`); `position_ahead` = jumlah `queue` berstatus `menunggu`, tidak hold, barber sama (atau semua barber bila `barber_id` mine null), `(created_at,id)` lebih kecil dari baris mine; join `profiles.nama` untuk `barber_nama`. `SET search_path='public'`.

- [ ] **Step 2: Terapkan + verifikasi**

Simulasi JWT customer via `request.jwt.claims` seperti verifikasi Fase 4; panggil RPC; pastikan hanya baris customer tersebut dan `position_ahead` masuk akal. Pastikan `anon` tanpa JWT mendapat 0 baris.

- [ ] **Step 3: Sinkronkan tipe TS**

Tambahkan `interface QueueMyStatus`.

---

### Task 5: Notifikasi lokal customer (TDD)

**Files:**
- Create: `BarberSys/src/lib/notifikasi-antrian.ts`
- Create: `BarberSys/src/lib/notifikasi-device.ts`
- Create: `BarberSys/src/hooks/useQueueNotifications.ts`
- Create: `BarberSys/scripts/test-notifikasi-antrian.mjs`
- Modify: `BarberSys/src/app/(customer)/_layout.tsx`
- Modify: `BarberSys/package.json` (test:unit + dependency `expo-notifications`)

**Interfaces:**
- Consumes: `QueueMyStatus` (Task 4), `formatNomorAntrian` (Task 2).
- Produces (pure, diuji):
```ts
export type NotificationKind = 'hampir' | 'dipanggil';
export function isQueueHeld(row: Pick<QueueMyStatus,'hold_until'>, nowMs?: number): boolean;
export function decideNotification(
  current: QueueMyStatus | null,
  previous: QueueMyStatus | null,
  nowMs?: number
): NotificationKind | null;
export function notificationKey(kind: NotificationKind, row: QueueMyStatus): string;
export function notificationCopy(kind: NotificationKind, row: QueueMyStatus): { title: string; body: string };
```
Aturan: hold → null; status `dipanggil` dan `called_at` berbeda dari previous → `'dipanggil'`; status `menunggu` dan `position_ahead <= 1` → `'hampir'`; selain itu null.

- [ ] **Step 1: Tulis test GAGAL `scripts/test-notifikasi-antrian.mjs`**

Kasus: hold (null), menunggu posisi 3 (null), posisi 1 (`hampir`), posisi 0 (`hampir`), dipanggil baru (`dipanggil`), dipanggil dengan `called_at` sama (null bila previous sudah dipanggil), copy memuat nomor & kursi/barber, key berbeda per kind dan per `called_at`.

- [ ] **Step 2: Jalankan → gagal, implementasi pure, jalankan → hijau**

- [ ] **Step 3: Install dependency**

Run: `npx expo install expo-notifications`
Expected: versi yang kompatibel SDK 57 masuk `package.json`; tidak ada perubahan lain.

- [ ] **Step 4: Implementasi `notifikasi-device.ts`**

- `Platform.OS === 'web'` → no-op.
- `ensureNotificationPermission()`: `getPermissionsAsync` → `requestPermissionsAsync`; return boolean.
- `setupAndroidChannel()`: channel `antrian`, importance HIGH.
- `showLocalQueueNotification(kind,row)`: `scheduleNotificationAsync` trigger `null` (langsung), `content: { title, body, sound: true, data: { queueId } }`.
- `setNotificationHandler` dengan `shouldShowBanner`/`shouldShowList`/`shouldPlaySound`/`shouldSetBadge`.

- [ ] **Step 5: Implementasi hook**

- Hanya customer login; panggil setup channel + izin sekali.
- `refresh()` → `supabase.rpc('queue_my_status')` → normalisasi baris pertama.
- Realtime `queue` (filter `user_id=eq.<uid>`) + interval 20 detik.
- Bandingkan previous via ref; `decideNotification`; cek AsyncStorage key `notif:<key>`; kalau belum ada → tampilkan notif + simpan key.
- Cleanup channel/interval.

- [ ] **Step 6: Pasang hook di `(customer)/_layout.tsx`**

Panggil `useQueueNotifications()` di dalam komponen layout.

- [ ] **Step 7: Test + typecheck**

Expected: semua unit test hijau; 0 error baru.

---

### Task 6: Verifikasi akhir + update ledger

**Files:**
- Modify: `docs/superpowers/plans/2026-11-19-fase5-progress.md`

- [ ] **Step 1: Unit test penuh**

Run: `npm run test:unit`
Expected: semua file lulus, 0 fail.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: baseline tetap; daftar file Fase 5 bebas error.

- [ ] **Step 3: Bundle Android & web**

Metro hidup; minta bundle Android (HTTP 200) dan buka `/display` di web.

- [ ] **Step 4: Jalankan checklist E2E di ledger**

Tandai setiap item di `2026-11-19-fase5-progress.md`; item yang butuh HP/uji manusia ditandai `⏳ butuh user`.

- [ ] **Step 5: Laporkan, jangan commit**

Sampaikan hash/perubahan; commit menunggu perintah eksplisit user.

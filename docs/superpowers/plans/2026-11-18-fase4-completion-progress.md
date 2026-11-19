# SDD ledger — plan: E:\projrct-React-Native - BarberSys\docs\superpowers\plans\2026-11-18-fase4-completion.md

Setup: branch `feat/fase-4` (in-place), working tree carries 12 uncommitted Fase 4 files.
Ruling: execute inline on `feat/fase-4`, not a fresh worktree — uncommitted Fase 4 work already exists; a new worktree would strand it — cost if wrong: one branch switch.
Ruling: tests import real TS helpers via `node --experimental-strip-types` (Node 22.14) instead of duplicating logic in `.mjs` — genuine RED for new helper, real coverage — cost if wrong: flag needed in test command.
Pre-flight: Task 3 `computeGlobalEstimate` → `new.tsx` matches; Task 2 `JamOperasionalCard` + `footer` → `(admin)/profile.tsx` matches; Task 4 migration idempotent vs existing `hold_until` — no conflict.

Task 1: complete (tests: `node --experimental-strip-types --test scripts/test-jam-operasional.mjs` → 6/6 pass; uncommitted per user rule).
Task 1: Ruling: test `getNextJamBukaISO` menemukan bug double-shift 7 jam (hold jadi 02:00 WIB di HP) — helper diubah ke aritmetika UTC murni — cost if wrong: hold meleset 7 jam.
Task 2: complete (JamOperasionalCard + footer ProfileForm + admin profile; tsc 0 error di file terkait; manual uji HP pending).
Task 3: complete (tests: `node --experimental-strip-types --test scripts/test-estimasi.mjs` → 4/4 pass; tsc 0 error di file terkait).
Task 4: complete (MCP `apply_migration` fase4_queue_hold_until → success; tercatat versi 20261118021059; kolom + 2 index terverifikasi).
Task 5: complete (PRD roadmap §12 + F4.2 §13 + Backlog B14; AGENTS.md status & tech stack).
Task 6: verified (19/19 tests pass; tsc 34 baseline, 0 error Fase 4; DB settings 09:00–21:00/kursi 7/hold_until ada/24 queue; Metro bundle Android HTTP 200 8.47 MB, 1591 modules).
Task 6: manual HP pending — admin simpan jam, warning customer, dashboard kasir (agent tidak bisa mengoperasikan HP).

## Review round 2 — perbaikan C / I / M (18 Nov 2026)

Review verdict: **With fixes**. Seluruh temuan (C1, I1–I6, M1–M10) ditindaklanjuti inline di `feat/fase-4`; **tidak** dispatch reviewer baru (instruksi user). Semua perubahan masih **uncommitted**.

### C1 — estimasi customer mati karena RLS
- Migrasi `fase4_queue_load_stats_and_guard` (MCP) sukses:
  - `queue_load_stats()` SECURITY DEFINER — grant hanya `authenticated`, mengembalikan `(barber_id, queue_count, total_menit)` untuk status `menunggu/dipanggil/dilayani` dan `hold_until is null or <= now()`.
  - `queue_next_hold_until(p_now)` — hold dihitung server-side (WIB); NULL saat toko buka.
  - Trigger `queue_guard_insert` / `queue_guard_update` — insert non-staf dipaksa `status=menunggu`, kursi/finansial/rating di-null-kan, tip `>= 0`, `hold_until` server-side; update customer hanya batal + rating/komentar, barber hanya `dilayani`/`selesai`; field lain diblok.
  - CHECK `queue_tip_amount_range` (`0..1.000.000`).
- Uji guard via JWT simulasi: insert customer tersanitasi (`status=menunggu`, `kursi=NULL`, tip 5000), forge status/tip diblok, cancel & rating tetap boleh; barber `dilayani`/`selesai` boleh, ubah tip diblok; `queue_load_stats()` terlihat customer (`total_menit=20`).
- UI: `new.tsx` memakai `supabase.rpc('queue_load_stats')` + `mapQueueLoadStats`, bukan query `queue` yang kosong karena RLS.

### Perubahan kode I / M
- **I1**: `(kasir)/queue.tsx` urut `created_at`; label "DIBUAT <tanggal>" di Kasir & Customer saat antrian berasal dari hari sebelumnya; nomor antrian tidak di-renumber.
- **I2/I3**: `isOutsideJam` menerima instant nyata (konversi WIB internal — tidak double-shift mengikuti timezone device); copy hold diturunkan dari `hold_until` (`describeHoldUntil`); timer `getHoldRefreshDelayMs` di `status.tsx` + `(kasir)/queue.tsx`; badge `DITAHAN` di status customer.
- **I5**: guard DB + sanitasi di atas.
- **I6**: status Fase 4 di PRD §12 & AGENTS.md menjadi 🟡 "selesai diimplementasikan — menunggu uji manual di HP" (bukan ✅ penuh).
- **M1**: `receipt.ts` menormalkan `jamBuka/jamTutup` (`HH:MM:SS` → `HH:MM`) + suffix WIB; logo default dipindah ke `payment.tsx` supaya `receipt.ts` bebas import runtime dan bisa diuji Node.
- **M2**: `computeGlobalEstimate` memakai **minimum** beban (giliran tercepat); barber idle = 0 dan UI menampilkan "Tersedia".
- **M4**: npm script `test:unit` (7 file unit) + `typecheck`.
- **M5**: `scripts/test-receipt.mjs` mengimpor `src/lib/receipt.ts` asli; assertion tip > 0 tampil, tip 0/null absen, jam HH:MM, logo opsional, escapeHtml.
- **M7**: advisory `xlsx@0.18.5` (CVE-2023-30533 / CVE-2024-22363) dicatat di PRD B15 + AGENTS tech stack + ledger; penggantian dependency ditunda.
- **M8**: PRD §7 `queue` menambah `nama_customer`, `kursi_nomor`, `hold_until`; `barbershop_settings` menambah `jumlah_kursi`; catatan RPC/guard di §7.3; B8 dipindah sebelum B14, B15 ditambahkan.
- Dashboard/laporan: `laporan.tsx` memakai helper WIB (`startOfDay/Week/MonthWIBISO`), PDF try/catch, tombol disabled saat kosong/loading, realtime tanpa spinner; `ringkasan.tsx` memakai `startOfDayWIBISO` + label "Barber aktif"; `(barber)/queue.tsx` memakai `startOfDayWIBISO`; `payment.tsx` chip tip preset vs Custom diperbaiki; `JamOperasionalCard` role-gate Admin + save `.select('id').single()`.
- DB `barbershop_settings` tetap `09:00:00–21:00:00`, `jumlah_kursi 7`.

### Verifikasi akhir
- `npm run test:unit` → **40/40 pass, 0 fail** (8 file: barber-availability, kursi-availability, waktu, queue-load, estimasi, jam-operasional, receipt, tab-bar).
- `npm run typecheck` → baseline B8 tidak bertambah; **0 error** di seluruh file Fase 4.
- Bundle Android via Metro `:8081` → **HTTP 200, 8.486.518 bytes**, 49,4 detik.
- Belum: uji manual E2E di HP (butuh user). Belum commit/push (aturan user).

## Fix Android 3-button navigation (19 Nov 2026)

Gejala: di HP dengan navigasi **3 tombol** (Back/Home/Recents) tab bar bawah tertutup system navigation bar; di HP **gesture** tampak normal.

Akar masalah (terverifikasi):
- Android target SDK 35+ memakai **edge-to-edge default** (Expo SDK 57 docs) — app menggambar di belakang system nav bar.
- `react-native-safe-area-context@5.7.0` melaporkan inset `navigationBars` (dicek di `SafeAreaUtils.kt`).
- Keempat `_layout.tsx` role menetapkan `tabBarStyle.height: 64` + `paddingBottom: 8`. Di `expo-router/.../BottomTabBar.js`, `getTabBarHeight()` memakai `height` custom apa adanya (tidak menambah `insets.bottom`), dan `tabBarStyle` menimpa `paddingBottom: insets.bottom`. Akibatnya inset 3 tombol (~48dp) diabaikan → tab bar 64dp tergambar di area nav bar.

Fix:
- Helper murni `src/lib/tab-bar.ts` → `getTabBarMetrics(inset)` = `height 64+inset`, `paddingTop 6`, `paddingBottom 8+inset` (area ikon/label tetap 50dp).
- `useSafeAreaInsets()` dipakai di `(customer|kasir|barber|admin)/_layout.tsx`; tinggi & padding tab bar dihitung dari inset.
- Test `scripts/test-tab-bar.mjs` (RED dulu: modul belum ada → GREEN 5/5).

Bukti: `npm run test:unit` **40/40**, `npm run typecheck` 0 error file terkait, bundle Android **HTTP 200 / 8.486.518 bytes**. Uji visual di HP 3 tombol masih menunggu user (reload Metro).

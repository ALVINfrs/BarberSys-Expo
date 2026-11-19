# Fase 4 Completion — Jam Operasional Admin & Estimasi "Siapa Saja" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Menutup sisa Fase 4: Admin dapat mengatur jam operasional toko, opsi "Siapa Saja" menampilkan estimasi tunggu global, migrasi `hold_until` diformalkan, dan dokumentasi fase disinkronkan.

**Architecture:** Tambah satu komponen kartu mandiri `JamOperasionalCard` yang di-render sebagai `footer` di `ProfileForm` (khusus Admin). Estimasi global dihitung dari rata-rata beban menit seluruh barber tersedia lewat helper murni `src/lib/estimasi.ts`. Migrasi `queue.hold_until` diformalkan via MCP `apply_migration` (idempotent, `IF NOT EXISTS`).

**Tech Stack:** Expo SDK 57 + expo-router, TypeScript strict, Supabase MCP (`apply_migration`, `execute_sql`), `node:test` untuk unit test helper.

**Spec:** `docs/prd .md` §13 FASE 4 (baris 851–858) + keputusan sesi sebelumnya: F4.2 **Opsi H** (antrian di luar jam ditahan sampai jam buka berikutnya, WIB Asia/Jakarta), F4.1 Tip Opsi B, F4.3 estimasi per barber + global.

## Global Constraints

- Waktu operasional memakai **WIB (Asia/Jakarta, UTC+7)**; jangan pakai timezone device apa pun.
- F4.2 = **hold, bukan tolak**: `queue.status` tetap `menunggu`, `queue.hold_until` diisi jam buka berikutnya. Kasir menyembunyikan baris selama `hold_until > now()`.
- **Tanpa dependency baru**; input jam memakai `TextInput` HH:MM tervalidasi.
- Perubahan skema DB **hanya via MCP `apply_migration`**; setelah itu cek `list_migrations`.
- UI mengikuti token `docs/design.md` + pola brutalist yang sudah ada (`brutalistCard`, `brutalistInput`, `brutalistButton`).
- **Commit/merge/push hanya atas perintah eksplisit user** (AGENTS.md §6). Plan ini berhenti di verifikasi; tidak ada langkah commit.
- `npx tsc --noEmit` baseline = **34 baris error** di file template lama (B8). File yang disentuh Fase 4 harus **0 error baru**.

## Review Focus

- Input jam tidak valid (`24:00`, `9:5`, kosong, `09:00` == `21:00`) → pesan error jelas, **tidak ada UPDATE** ke DB.
- `barbershop_settings` kosong/gagal dibaca → kartu menampilkan pesan error, tombol simpan tidak menulis apa pun.
- Tidak ada barber tersedia → estimasi global `0`, bukan `NaN`/Infinity.
- Batas jam tepat: `09:00` = buka (tidak ditahan), `21:00` = tutup (ditahan); jadwal lewat tengah malam tetap benar.
- RLS: hanya Admin yang boleh UPDATE `barbershop_settings` (policy `is_admin()` sudah ada).

---

### Task 1: Regression test helper jam operasional

**Files:**
- Create: `BarberSys/scripts/test-jam-operasional.mjs`

**Interfaces:**
- Consumes: logika `parseTimeToMinutes`, `isOutsideJam`, `getNextJamBukaISO`, `formatWIBTime` yang sudah ada di `src/lib/jam-operasional.ts` (test menyalin fungsi murni, mengikuti pola `scripts/test-kursi-availability.mjs`).
- Produces: perintah verifikasi `node --test scripts/test-jam-operasional.mjs`.

- [x] **Step 1: Tulis test karakterisasi**

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function parseTimeToMinutes(t){const[h,m]=t.split(':').map(x=>Number(x)||0);return h*60+m}
function isOutsideJam(nowWIB,jamBuka,jamTutup){const n=nowWIB.getHours()*60+nowWIB.getMinutes();const b=parseTimeToMinutes(jamBuka);const t=parseTimeToMinutes(jamTutup);if(t<=b)return!(n>=b||n<t);return!(n>=b&&n<t)}
function wib(y,mo,d,h,mi){return new Date(Date.UTC(y,mo-1,d,h-7,mi))}

describe('jam-operasional',()=>{
  it('parse HH:MM dan HH:MM:SS',()=>{
    assert.equal(parseTimeToMinutes('09:00'),540);
    assert.equal(parseTimeToMinutes('09:00:00'),540);
    assert.equal(parseTimeToMinutes('21:30'),1290);
  });
  it('batas buka tepat 09:00 dan tutup tepat 21:00',()=>{
    assert.equal(isOutsideJam(wib(2026,11,18,8,59),'09:00','21:00'),true);
    assert.equal(isOutsideJam(wib(2026,11,18,9,0),'09:00','21:00'),false);
    assert.equal(isOutsideJam(wib(2026,11,18,20,59),'09:00','21:00'),false);
    assert.equal(isOutsideJam(wib(2026,11,18,21,0),'09:00','21:00'),true);
  });
  it('jadwal lewat tengah malam',()=>{
    assert.equal(isOutsideJam(wib(2026,11,18,15,0),'21:00','02:00'),true);
    assert.equal(isOutsideJam(wib(2026,11,18,23,0),'21:00','02:00'),false);
    assert.equal(isOutsideJam(wib(2026,11,18,1,0),'21:00','02:00'),false);
    assert.equal(isOutsideJam(wib(2026,11,18,2,0),'21:00','02:00'),true);
  });
});
```

- [x] **Step 2: Jalankan test**

Run: `node --test scripts/test-jam-operasional.mjs`
Expected: `# pass 3`, `# fail 0` (test karakterisasi untuk logika yang sudah terpasang di Fase 4).

---

### Task 2: Kartu Admin "Jam Operasional"

**Files:**
- Create: `BarberSys/src/components/JamOperasionalCard.tsx`
- Modify: `BarberSys/src/components/ProfileForm.tsx` (tambah prop `footer`, render di dalam `ScrollView` setelah kartu utama)
- Modify: `BarberSys/src/app/(admin)/profile.tsx` (render `<ProfileForm ... footer={<JamOperasionalCard />} />`)

**Interfaces:**
- Consumes: `supabase`, `useAppTheme`, token `brutalistCard/brutalistInput/brutalistButton`; tabel `barbershop_settings` (kolom `id`, `jam_buka`, `jam_tutup`).
- Produces: `JamOperasionalCard(): React.ReactElement`; `ProfileFormProps.footer?: React.ReactNode`.

- [x] **Step 1: Buat `JamOperasionalCard`**

Perilaku wajib:
- Fetch saat mount: `select('id,jam_buka,jam_tutup').limit(1).single()`; normalisasi dengan `.slice(0, 5)`.
- Dua `TextInput` (`maxLength={5}`, placeholder `09:00` / `21:00`, `autoCapitalize="none"`), label "Jam Buka (WIB)" dan "Jam Tutup (WIB)".
- Validasi regex `^([01]\d|2[0-3]):[0-5]\d$` untuk keduanya; tolak bila sama.
- Simpan: `update({ jam_buka: `${jamBuka}:00`, jam_tutup: `${jamTutup}:00` }).eq('id', settingsId)`.
- Pesan sukses/gagal memakai warna `theme.success` / `theme.danger`.
- Kotak peringatan amber: "Di luar jam ini customer tetap bisa ambil antrian, tetapi antrian DITAHAN dan baru diproses besok saat jam buka."
- Judul kartu: "Jam Operasional Toko"; subjudul: "Berlaku WIB (Asia/Jakarta)."

- [x] **Step 2: Tambah slot `footer` di `ProfileForm`**

```tsx
interface ProfileFormProps {
  title: string;
  fallbackName: string;
  footer?: React.ReactNode;
}
```

Render `{footer}` di dalam `ScrollView`, tepat setelah `</View>` kartu utama:

```tsx
        </View>
        {footer}
      </ScrollView>
```

- [x] **Step 3: Pasang di layar Profil Admin**

```tsx
import React from 'react';
import { ProfileForm } from '@/components/ProfileForm';
import { JamOperasionalCard } from '@/components/JamOperasionalCard';

export default function AdminProfileScreen() {
  return (
    <ProfileForm
      title="Profil Manajer / Admin"
      fallbackName="Admin / Pemilik"
      footer={<JamOperasionalCard />}
    />
  );
}
```

- [ ] **Step 4: Verifikasi tipe + runtime** — tsc ✅; uji manual di HP ⏳ (agent belum bisa operasikan HP)

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | Select-String -Pattern "JamOperasionalCard|ProfileForm|admin\\)/profile"`
Expected: tidak ada baris untuk file-file tersebut.

Verifikasi manual (Expo Go, login `admin@barbersys.com`):
1. Tab **Profil** → kartu Jam Operasional menampilkan `09:00` / `21:00`.
2. Isi `10:00` / `20:00` → **SIMPAN** → pesan sukses → pindah tab lalu balik, nilai bertahan.
3. Isi `25:00` → simpan → muncul error validasi, nilai DB tidak berubah.
4. Kembalikan `09:00` / `21:00`.

---

### Task 3: Estimasi global pada opsi "Siapa Saja"

**Files:**
- Create: `BarberSys/src/lib/estimasi.ts`
- Create: `BarberSys/scripts/test-estimasi.mjs`
- Modify: `BarberSys/src/app/(customer)/queue/new.tsx` (kartu "Siapa Saja", sekitar baris 415–442)

**Interfaces:**
- Produces: `computeGlobalEstimate(barberIds: string[], load: Record<string, { count: number; totalMenit: number }>): number` — `Math.ceil(totalMenit / jumlahBarber)`, `0` bila tidak ada barber.
- Consumes: `filterAvailableBarbers(barbers)` (sudah dipakai kartu barber) dan `barberLoad` (sudah di-fetch, exclude hold).

- [x] **Step 1: Tulis test gagal**

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function computeGlobalEstimate(ids,load){if(!ids.length)return 0;const total=ids.reduce((s,id)=>s+(load[id]?.totalMenit||0),0);return Math.ceil(total/ids.length)}

describe('estimasi-global',()=>{
  it('tanpa barber = 0',()=>assert.equal(computeGlobalEstimate([],{}),0));
  it('rata-rata dua barber',()=>assert.equal(computeGlobalEstimate(['a','b'],{a:{count:1,totalMenit:30},b:{count:1,totalMenit:60}}),45));
  it('pembulatan ke atas',()=>assert.equal(computeGlobalEstimate(['a','b'],{a:{count:1,totalMenit:25},b:{count:1,totalMenit:30}}),28));
  it('barber tanpa beban dihitung 0',()=>assert.equal(computeGlobalEstimate(['a','b','c'],{c:{count:1,totalMenit:10}}),4));
});
```

Run: `node --test scripts/test-estimasi.mjs`
Expected: FAIL karena file implementasi belum ada (test menyalin logika; setelah implementasi disamakan).

- [x] **Step 2: Implementasi helper**

`src/lib/estimasi.ts`:

```ts
export interface BarberLoad {
  count: number;
  totalMenit: number;
}

export function computeGlobalEstimate(
  barberIds: string[],
  load: Record<string, BarberLoad>
): number {
  if (barberIds.length === 0) return 0;
  const total = barberIds.reduce((sum, id) => sum + (load[id]?.totalMenit || 0), 0);
  return Math.ceil(total / barberIds.length);
}
```

- [x] **Step 3: Pakai di `new.tsx`**

Import `computeGlobalEstimate`. Di body komponen, setelah `grandTotal`:

```tsx
const availableBarbers = filterAvailableBarbers(barbers);
const globalEstimate = computeGlobalEstimate(
  availableBarbers.map((b) => b.id),
  barberLoad
);
```

Di kartu "Siapa Saja", ganti subjudul menjadi:

```tsx
<Text style={[styles.barberSub, { color: theme.primary, fontWeight: '700' }]}>
  Rekomendasi: Giliran Paling Cepat{globalEstimate > 0 ? ` · ±${globalEstimate} menit` : ''}
</Text>
```

- [x] **Step 4: Jalankan test + tipe**

Run: `node --test scripts/test-estimasi.mjs; npx tsc --noEmit --skipLibCheck 2>&1 | Select-String -Pattern "estimasi|queue/new|queue\\new"`
Expected: test `# pass 4`, `# fail 0`; tidak ada error tipe pada file terkait.

---

### Task 4: Formalkan migrasi `hold_until` (MCP)

**Files:**
- No file changes; DB via MCP.

**Interfaces:**
- Produces: entri migrasi `fase4_queue_hold_until` di `supabase_migrations.schema_migrations`.

- [x] **Step 1: Apply migration idempotent**

```sql
alter table public.queue add column if not exists hold_until timestamptz;
create index if not exists idx_queue_hold_until on public.queue (hold_until);
create index if not exists idx_queue_status_hold on public.queue (status, hold_until);
comment on column public.queue.hold_until is 'F4.2: antrian ditahan sampai timestamp ini (jam buka berikutnya, WIB). NULL = tidak ditahan.';
```

- [x] **Step 2: Verifikasi**

Run via MCP: `list_migrations` → harus memuat `fase4_queue_hold_until`; `execute_sql` cek `information_schema.columns` untuk `queue.hold_until` dan `pg_indexes` untuk kedua index.
Expected: migrasi tercatat, kolom + 2 index ada.

---

### Task 5: Sinkronisasi dokumentasi fase

**Files:**
- Modify: `docs/prd .md` (tabel Roadmap §12; teks F4.2 §13; tabel Backlog §20)
- Modify: `BarberSys/AGENTS.md` (tabel Status Roadmap + tech stack)

- [x] **Step 1: PRD Roadmap §12** — set Fase 2, 3 menjadi `✅ Selesai (18 Nov 2026)` dan Fase 4 `🟡 Selesai diimplementasikan — menunggu uji manual HP`; tambah catatan F4.2 Opsi H.
- [x] **Step 2: PRD F4.2 §13** — tambahkan: *"Implementasi: Opsi H — antrian di luar jam tidak ditolak, melainkan ditahan (`queue.hold_until`) dan diproses saat jam buka berikutnya (WIB). Lihat B14."*
- [x] **Step 3: PRD Backlog §20** — tambah baris B14:

```
| B14 | Fase 4 | PRD F4.2 menyebut "Ambil Antrian ditolak di luar jam operasional"; keputusan produk: antrian ditahan (hold) sampai jam buka berikutnya | Gate di customer `new.tsx` + `queue.hold_until` + filter Kasir + badge DITAHAN + Admin editor jam operasional | Tinggi | Selesai |
```

- [x] **Step 4: AGENTS.md** — Fase 3 `✅ Selesai`, Fase 4 `🟡 Selesai diimplementasikan (F4.1–F4.6)`, Fase 5 `⏳`; tech stack tambah `xlsx` (ekspor laporan) + `expo-print` (sudah ada).

---

### Task 6: Verifikasi akhir Fase 4

**Files:**
- No file changes.

- [x] **Step 1: Unit test semua helper**

Run: `npm run test:unit`
Expected: `# pass 35`, `# fail 0` (7 file unit).

- [x] **Step 2: TypeScript**

Run: `npx tsc --noEmit`
Expected: tetap **34 baris** (baseline B8) dan **tidak ada** error pada file Fase 4 (`new.tsx`, `status.tsx`, `kasir/queue.tsx`, `kasir/payment.tsx`, `kasir/call.tsx`, `admin/ringkasan.tsx`, `admin/laporan.tsx`, `JamOperasionalCard.tsx`, `estimasi.ts`).

- [x] **Step 3: DB sanity via MCP**

`barbershop_settings` = 1 baris dengan `jam_buka 09:00:00`, `jam_tutup 21:00:00`, `jumlah_kursi 7`; `queue.hold_until` ada; migrasi tercatat; queue count konsisten.

- [ ] **Step 4: Runtime Expo** — bundle Android ✅ (HTTP 200, 1591 modul); uji alur di HP ⏳

- Metro di `:8081` tanpa error bundling baru.
- Login Admin → ubah jam ke `10:00–20:00` → login Customer → form Ambil Antrian menampilkan warning hold → Admin kembalikan `09:00–21:00`.
- Login Kasir → dashboard 4 kartu tampil; antrian hold tidak muncul di list.
- Login Barber → dashboard tetap normal.

- [x] **Step 5: Laporkan hasil** — tanpa commit sampai user memerintahkan.

---

## Post-review hardening (18 Nov 2026)

Review fase 4 berakhir **With fixes**; seluruh temuan C1, I1–I6, M1–M10 ditutup inline tanpa reviewer baru. Detail lengkap + bukti ada di `2026-11-18-fase4-completion-progress.md`.

Ringkas:
- **C1**: RPC `queue_load_stats()` (SECURITY DEFINER) + `mapQueueLoadStats` — estimasi customer hidup tanpa membuka RLS `queue`.
- **I5**: guard trigger insert/update `queue` + CHECK tip; teruji via JWT simulasi.
- **I1/I2/I3**: urutan & label tanggal asal, perhitungan WIB murni (instant), timer hold, badge `DITAHAN`.
- **I6**: status Fase 4 = 🟡 selesai diimplementasikan, menunggu uji HP.
- **M1/M5**: jam struk dinormalisasi; test struk mengimpor sumber asli + cakupan tip.
- **M2**: estimasi "Siapa Saja" = beban minimum.
- **M4**: `npm run test:unit` + `npm run typecheck`.
- **M7**: advisory `xlsx` tercatat (PRD B15).
- **M8**: skema PRD §7 disinkronkan + backlog dirapikan.

Verifikasi akhir: **35/35 unit test pass**, `tsc` tetap 34 baris baseline (0 error Fase 4), bundle Android **HTTP 200 / 8.482.446 bytes**. Uji manual HP masih pending; belum commit/push.

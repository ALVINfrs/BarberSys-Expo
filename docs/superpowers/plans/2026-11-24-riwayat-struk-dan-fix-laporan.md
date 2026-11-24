# Fase 7 — Riwayat & Struk Kasir/Barber + Perbaikan Laporan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kasir dan barber dapat menelusuri transaksi lunas serta mencetak/membagikan ulang struk, dan tombol PDF/XLSX di Laporan admin berfungsi kembali di Expo Go.

**Architecture:** Riwayat membaca langsung `queue` + `queue_products` per rentang hari WIB. Struk disusun dari data transaksi asli (`completed_at`, `kasir_id`) memakai `buildPaymentReceipt` yang sudah ada. PDF dibuat oleh `expo-print`, tetapi isinya ditulis ulang ke `FileSystem.cacheDirectory` (scoped) sebelum dibagikan agar lolos pemeriksaan `expo-sharing` di Expo Go. XLSX memakai import statis agar tidak dipecah sebagai async module Metro.

**Tech Stack:** Expo SDK 58, expo-router, expo-print, expo-sharing, expo-file-system/legacy, Supabase, TypeScript strict, Node test runner (`--experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-11-24-riwayat-struk-rating-display-design.md`

## Global Constraints

- Tidak ada perubahan tabel/kolom/dependency aplikasi Expo.
- Struk cetak ulang memakai `completed_at` dan profil `kasir_id` asli.
- Barber hanya boleh melihat baris dengan `barber_id = user.id`.
- Semua batas hari memakai WIB (UTC+7).
- Jangan menjalankan `npx expo export`; verifikasi lewat Expo Go.
- Commit hanya atas perintah eksplisit user.

## Review Focus

- **PDF dari `expo-print` di Expo Go:** file berada di cache global, sedangkan `expo-sharing` hanya mengizinkan cache experience → harus ditulis ulang ke scoped cache.
- **XLSX dynamic import:** Metro memecah `xlsx` sebagai async module dan gagal dengan `Requiring unknown module "2333"` → harus import statis.
- **Transaksi lama tanpa `kasir_id`/`completed_at`:** layar dan struk tidak boleh crash; pakai fallback.
- **Batas hari WIB:** transaksi 23:30 WIB dan 00:30 WIB harus masuk hari yang benar, bukan mengikuti UTC device.
- **Privasi barber:** query barber wajib memfilter `barber_id`; jangan mengandalkan RLS saja.
- **Tap ganda:** tombol cetak/bagikan tidak boleh berjalan dua kali bersamaan.

---

## File Map

### Baru
- `BarberSys/src/lib/share-pdf.ts`
- `BarberSys/src/lib/receipt-history.ts`
- `BarberSys/src/lib/receipt-service.ts`
- `BarberSys/src/components/receipt-actions.tsx`
- `BarberSys/src/app/kasir/(tabs)/riwayat.tsx`
- `BarberSys/src/app/barber/riwayat.tsx`
- `BarberSys/scripts/test-share-pdf.mjs`
- `BarberSys/scripts/test-receipt-history.mjs`

### Diubah
- `BarberSys/src/lib/waktu.ts`
- `BarberSys/src/app/admin/laporan.tsx`
- `BarberSys/src/app/kasir/(tabs)/payment.tsx`
- `BarberSys/src/app/kasir/(tabs)/_layout.tsx`
- `BarberSys/src/app/barber/_layout.tsx`
- `BarberSys/package.json` (test:unit + script baru)
- `BarberSys/scripts/test-waktu.mjs` (test helper baru)

---

### Task 0: Perbaiki PDF & XLSX Laporan Admin

**Files:**
- Create: `BarberSys/src/lib/share-pdf.ts`
- Create: `BarberSys/scripts/test-share-pdf.mjs`
- Modify: `BarberSys/src/app/admin/laporan.tsx`
- Modify: `BarberSys/src/app/kasir/(tabs)/payment.tsx`
- Modify: `BarberSys/package.json`

**Interfaces:**
- Produces: `buildShareUri(cacheDirectory: string | null, fileName: string, nowMs?: number): string`
- Produces: `sharePdfFromHtml(input: { html: string; fileName: string; dialogTitle?: string }): Promise<void>`

- [ ] **Step 1: Tulis test gagal untuk `buildShareUri`**

Buat `BarberSys/scripts/test-share-pdf.mjs`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildShareUri } from '../src/lib/share-pdf.ts';

describe('share-pdf', () => {
  it('membuat URI file di cache dengan nama aman', () => {
    assert.equal(
      buildShareUri('file:///cache/', 'Struk A-01', 123),
      'file:///cache/struk-a-01-123.pdf'
    );
  });

  it('menolak cacheDirectory null', () => {
    assert.throws(() => buildShareUri(null, 'struk', 123), /cache/i);
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `node --no-warnings --experimental-strip-types --test scripts/test-share-pdf.mjs`
Expected: FAIL karena `share-pdf.ts` belum ada.

- [ ] **Step 3: Implementasi `share-pdf.ts`**

```ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';

export function buildShareUri(cacheDirectory: string | null, fileName: string, nowMs = Date.now()): string {
  if (!cacheDirectory) throw new Error('Folder cache tidak tersedia.');
  const safe = fileName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file';
  return `${cacheDirectory}${safe}-${nowMs}.pdf`;
}

export async function sharePdfFromHtml(input: {
  html: string;
  fileName: string;
  dialogTitle?: string;
}): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Berbagi file tidak tersedia di perangkat ini.');
  }
  const { base64 } = await Print.printToFileAsync({ html: input.html, base64: true });
  if (!base64) throw new Error('Gagal menyiapkan PDF.');
  const uri = buildShareUri(cacheDirectory, input.fileName);
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: input.dialogTitle || 'Bagikan PDF',
  });
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `node --no-warnings --experimental-strip-types --test scripts/test-share-pdf.mjs`
Expected: PASS 2 tests.

- [ ] **Step 5: Pakai helper di Laporan admin dan ganti import XLSX**

Di `laporan.tsx`:
- Tambah `import * as XLSX from 'xlsx';` di atas.
- Hapus `const XLSX = await import('xlsx');` di `handleExcel`.
- Ganti isi `handlePdf`:

```ts
const html = `...`; // tetap
await sharePdfFromHtml({ html, fileName: `laporan-${filter}`, dialogTitle: 'Bagikan Laporan' });
```

- Hapus import `Print` dan `Sharing` yang tidak lagi dipakai. Pertahankan `writeAsStringAsync`, `cacheDirectory`, `EncodingType` untuk XLSX.
- Pada `handleExcel`, pastikan `cacheDirectory` tidak null sebelum menulis; jika null, `Alert.alert('Gagal', 'Folder cache tidak tersedia.')`.

- [ ] **Step 6: Pakai helper di Pembayaran**

Di `payment.tsx`, ganti `handleShareReceipt` agar memanggil `sharePdfFromHtml` dengan `buildReceiptHtml(lastReceipt)`. Hapus import `Sharing` jika tidak dipakai lagi. `handlePrintReceipt` tetap memakai `Print.printAsync`.

- [ ] **Step 7: Tambah script test ke `package.json`**

Tambahkan `scripts/test-share-pdf.mjs` ke `test:unit`.

- [ ] **Step 8: Jalankan test dan typecheck**

Run: `npm run test:unit`
Expected: semua test lulus (termasuk 2 test baru).

Run: `npm run typecheck`
Expected: 0 error pada file aplikasi.

- [ ] **Step 9: Verifikasi manual di Expo Go**

1. Login admin → Laporan → Unduh PDF → pilih aplikasi share → file terbuka.
2. Laporan → Ekspor XLSX → file terbagi tanpa error `unknown module`.
3. Login kasir → Pembayaran → Bagikan PDF struk → file terbuka.
4. Cek `expo-start.log` tidak ada error baru.

---

### Task 1: Helper hari WIB dan ringkasan riwayat

**Files:**
- Modify: `BarberSys/src/lib/waktu.ts`
- Create: `BarberSys/src/lib/receipt-history.ts`
- Modify: `BarberSys/scripts/test-waktu.mjs`
- Create: `BarberSys/scripts/test-receipt-history.mjs`
- Modify: `BarberSys/package.json`

**Interfaces:**
- Produces: `startOfNextDayWIBISO(ref?: Date): string`
- Produces: `addWIBDays(ref: Date, days: number): Date`
- Produces: `historyItemTotal(input: HistoryAmountInput): number`
- Produces: `summarizeReceiptHistory(items: HistoryAmountInput[]): ReceiptHistorySummary`

- [ ] **Step 1: Tulis test gagal untuk hari WIB**

Tambahkan ke `test-waktu.mjs`:

```js
import { startOfNextDayWIBISO, addWIBDays } from '../src/lib/waktu.ts';

it('startOfNextDayWIBISO = 00:00 WIB hari berikutnya', () => {
  assert.equal(
    startOfNextDayWIBISO(new Date('2026-11-18T02:00:00.000Z')),
    '2026-11-18T17:00:00.000Z'
  );
});

it('addWIBDays menggeser tanggal WIB tanpa kehilangan hari', () => {
  assert.equal(
    addWIBDays(new Date('2026-11-18T02:00:00.000Z'), 1).toISOString(),
    '2026-11-19T05:00:00.000Z'
  );
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `node --no-warnings --experimental-strip-types --test scripts/test-waktu.mjs`
Expected: FAIL karena fungsi belum ada.

- [ ] **Step 3: Implementasi helper di `waktu.ts`**

```ts
/** Awal hari WIB berikutnya sebagai instant ISO/UTC. */
export function startOfNextDayWIBISO(ref: Date = new Date()): string {
  const p = wibParts(ref);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + 1) - WIB_OFFSET_MS).toISOString();
}

/** Tanggal WIB digeser `days`, dikembalikan pada pukul 12:00 WIB. */
export function addWIBDays(ref: Date, days: number): Date {
  const p = wibParts(ref);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + days, 12) - WIB_OFFSET_MS);
}
```

- [ ] **Step 4: Tulis test gagal untuk ringkasan**

Buat `test-receipt-history.mjs`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { historyItemTotal, summarizeReceiptHistory } from '../src/lib/receipt-history.ts';

describe('receipt-history', () => {
  it('menghitung total treatment + produk + tip', () => {
    assert.equal(
      historyItemTotal({ treatmentHarga: 50000, productTotal: 10000, tipAmount: 5000, metode: 'tunai' }),
      65000
    );
  });

  it('meringkas tunai, qris, tip, dan jumlah transaksi', () => {
    const summary = summarizeReceiptHistory([
      { treatmentHarga: 50000, productTotal: 10000, tipAmount: 5000, metode: 'tunai' },
      { treatmentHarga: 40000, productTotal: 0, tipAmount: 0, metode: 'qris' },
    ]);
    assert.deepEqual(summary, { count: 2, total: 105000, tunai: 65000, qris: 40000, tip: 5000 });
  });

  it('mengabaikan nilai null/negatif', () => {
    assert.equal(
      historyItemTotal({ treatmentHarga: null, productTotal: -100, tipAmount: undefined, metode: null }),
      0
    );
  });
});
```

- [ ] **Step 5: Implementasi `receipt-history.ts`**

```ts
export type MetodeBayar = 'tunai' | 'qris' | null;

export interface HistoryAmountInput {
  treatmentHarga: number | null | undefined;
  productTotal: number | null | undefined;
  tipAmount: number | null | undefined;
  metode: MetodeBayar;
}

export interface ReceiptHistorySummary {
  count: number;
  total: number;
  tunai: number;
  qris: number;
  tip: number;
}

function nonNegative(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function historyItemTotal(input: HistoryAmountInput): number {
  return nonNegative(input.treatmentHarga) + nonNegative(input.productTotal) + nonNegative(input.tipAmount);
}

export function summarizeReceiptHistory(items: HistoryAmountInput[]): ReceiptHistorySummary {
  return items.reduce(
    (acc, item) => {
      const total = historyItemTotal(item);
      acc.count += 1;
      acc.total += total;
      acc.tip += nonNegative(item.tipAmount);
      if (item.metode === 'tunai') acc.tunai += total;
      if (item.metode === 'qris') acc.qris += total;
      return acc;
    },
    { count: 0, total: 0, tunai: 0, qris: 0, tip: 0 }
  );
}
```

- [ ] **Step 6: Jalankan test, tambahkan ke `test:unit`**

Run: `node --no-warnings --experimental-strip-types --test scripts/test-waktu.mjs scripts/test-receipt-history.mjs`
Expected: PASS.

Tambahkan `scripts/test-receipt-history.mjs` ke `test:unit`.

---

### Task 2: Service data struk dan komponen aksi

**Files:**
- Create: `BarberSys/src/lib/receipt-service.ts`
- Create: `BarberSys/src/components/receipt-actions.tsx`
- Modify: `BarberSys/src/app/kasir/(tabs)/payment.tsx` (opsional, hanya jika tidak menambah risiko)

**Interfaces:**
- Produces: `loadReceiptForQueue(queueId: string): Promise<ReceiptData>`
- Produces: `<ReceiptActions receipt?: ReceiptData | null; queueId?: string; />`

- [ ] **Step 1: Implementasi `loadReceiptForQueue`**

Query `queue` by id dengan join `treatments(nama, harga)`, `barber:profiles!queue_barber_id_fkey(nama)`, `customer:profiles!queue_user_id_fkey(nama)`; query `queue_products` + `products(nama)`; query `barbershop_settings`; query profil `kasir_id` terpisah (aman bila FK tidak tersedia). Susun `buildPaymentReceipt` dengan `nowIso = completed_at || created_at`, `kasirNama = kasir?.nama || 'Kasir'`.

- [ ] **Step 2: Implementasi `ReceiptActions`**

Props:
```ts
interface ReceiptActionsProps {
  receipt?: ReceiptData | null;
  queueId?: string;
  compact?: boolean;
}
```
- Jika `receipt` ada, langsung pakai; jika hanya `queueId`, panggil `loadReceiptForQueue` saat tombol ditekan.
- Tombol "Cetak" → `Print.printAsync({ html: buildReceiptHtml(receipt) })`.
- Tombol "Bagikan PDF" → `sharePdfFromHtml({ html, fileName: `struk-${receipt.kodeTransaksi || receipt.nomor_antrian}` })`.
- `busy` state mencegah tap ganda; error ditampilkan lewat `Alert.alert`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: 0 error.

---

### Task 3: Tab Riwayat Kasir

**Files:**
- Create: `BarberSys/src/app/kasir/(tabs)/riwayat.tsx`
- Modify: `BarberSys/src/app/kasir/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `startOfDayWIBISO`, `startOfNextDayWIBISO`, `addWIBDays`, `formatWIBTime`, `formatWIBDate`, `summary` helpers, `ReceiptActions`.

- [ ] **Step 1: Tambah tab**

Di `_layout.tsx` tambahkan `Tabs.Screen name="riwayat"` dengan title `Riwayat` dan icon `history`. Urutan: queue, payment, riwayat, profile.

- [ ] **Step 2: Implementasi layar**

State: `selectedDate` (default `new Date()`), `rows`, `productTotals`, `loading`, `refreshing`, `selected`, `summary`.

Query:
```ts
supabase
  .from('queue')
  .select('id, nomor_antrian, nama_customer, user_id, barber_id, kasir_id, kursi_nomor, instruksi_potongan, tip_amount, metode_bayar, completed_at, created_at, treatments(nama, harga), customer:profiles!queue_user_id_fkey(nama), barber:profiles!queue_barber_id_fkey(nama)')
  .eq('status', 'lunas')
  .gte('completed_at', startOfDayWIBISO(selectedDate))
  .lt('completed_at', startOfNextDayWIBISO(selectedDate))
  .order('completed_at', { ascending: false });
```

Hitung produk dari `queue_products` untuk semua id, lalu `summarizeReceiptHistory`.

UI:
- `RoleHeader title="Riwayat"`.
- Baris navigasi: tombol ←, label tanggal (`formatWIBDate`), tombol →, tombol "Hari Ini" (nonaktif bila sudah hari ini).
- Kartu ringkasan: total omset besar + badge jumlah transaksi + baris tunai/QRIS/tip.
- Daftar kartu transaksi: jam, nomor, customer, barber, treatment, total, badge metode.
- Empty state "Belum Ada Transaksi".
- Modal detail: rincian + `ReceiptActions` dengan `queueId={selected.id}`.
- Realtime channel unik `kasir-riwayat-${Date.now()}`; refetch saat ada perubahan `queue`; cleanup `removeChannel`.
- `RefreshControl` untuk pull-to-refresh.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: 0 error.

---

### Task 4: Tab Riwayat Barber

**Files:**
- Create: `BarberSys/src/app/barber/riwayat.tsx`
- Modify: `BarberSys/src/app/barber/_layout.tsx`

- [ ] **Step 1: Tambah tab**

Tambahkan `Tabs.Screen name="riwayat"` dengan title `Riwayat` dan icon `history`. Urutan: queue, riwayat, profile.

- [ ] **Step 2: Implementasi layar**

Sama seperti kasir, tetapi query menambahkan `.eq('barber_id', user.id)`, tanpa pemilih hari (default semua riwayat miliknya, urut terbaru). Ringkasan tetap ditampilkan. `ReceiptActions` dengan `queueId`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: 0 error.

---

### Task 5: Verifikasi menyeluruh

- [ ] **Step 1: Unit test**

Run: `npm run test:unit`
Expected: semua test lulus, termasuk `test-share-pdf.mjs` dan `test-receipt-history.mjs`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 error pada kode aplikasi.

- [ ] **Step 3: Uji Expo Go**

Checklist:
1. Admin: Laporan → PDF berhasil dibagikan.
2. Admin: Laporan → XLSX berhasil dibagikan.
3. Kasir: bayar tunai → buka Riwayat → transaksi muncul → cetak → bagikan PDF.
4. Kasir: bayar QRIS → transaksi muncul di Riwayat → struk benar.
5. Kasir: ganti hari → transaksi hari lain muncul; kembali ke hari ini.
6. Barber: login → Riwayat hanya berisi antrian sendiri → cetak struk.
7. Tidak ada layar blank saat berpindah tab.
8. `expo-start.log` bersih dari error baru.

- [ ] **Step 4: Catat hasil**

Tulis hasil uji di dokumen progress terpisah; jangan commit tanpa perintah.

---

## Follow-up Plans (belum ditulis)

- Fase 7B — Rating & komentar admin.
- Fase 7C — Dashboard admin diperkaya.
- Fase 7D — Menu barber (4 tab).
- Fase 7E — Display TV React + Vite + TTS `id-ID`.

Masing-masing mendapat plan sendiri setelah pekerjaan sebelumnya lulus uji, sesuai aturan satu pekerjaan satu waktu.

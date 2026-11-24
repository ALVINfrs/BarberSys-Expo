# Fase 7 — Master Progress Ledger

> Update tiap selesai fase. Commit tiap fase setelah test hijau (instruksi user).

## Rencana & status

| Fase | Plan | Status | Commit |
|---|---|---|---|
| 7A | `2026-11-24-riwayat-struk-dan-fix-laporan.md` | ✅ Selesai | `a2d263b` |
| 7B | `2026-11-24-rating-admin.md` | ✅ Selesai | `e636aa0` |
| 7C | `2026-11-24-dashboard-admin.md` | ✅ Selesai | `ceab6b0` |
| 7D | `2026-11-24-menu-barber.md` | ✅ Selesai | `0e85fe4` |
| 7E | `2026-11-24-display-tv-vite.md` | ✅ Selesai | lihat `git log` pesan "Fase 7E" |

## Rulings
- Commit policy diubah user: commit per fase setelah test hijau (awalnya "hanya atas perintah").
- Rating dibuka sebagai route `/admin/rating` dengan `href: null` di Tabs → bukan tab baru (spec).
- `receipt-row.ts` dipisah murni dari `receipt-service.ts` karena Node strip-types tidak resolve import tanpa `.ts`.
- `barber-performance.ts` menyatukan stats & komentar dalam dua fungsi murni; tidak memakai RPC baru.
- Display TV Vite berdiri sendiri di `BarberSys/display-tv/`; Expo `/display` tetap dipertahankan sebagai fallback.
- Rating helper `distribution` memakai kunci 1–5; rating null tidak ikut rata-rata.

## Verifikasi terakhir (7E)
- `npm run test:unit` → 125/125 pass.
- `cd BarberSys/display-tv && npm run build` → Vite build sukses (63 modules).
- `npm run dev` → HTTP 200 di `http://localhost:5173`.
- `npm run typecheck` → error tersisa hanya template Expo lama (app-tabs*, hint-row, themed-view, use-theme), 0 error di file Fase 7.

## Menunggu uji manual user (Expo Go / browser)
- Laporan admin PDF/XLSX, Bagikan PDF struk kasir.
- Riwayat kasir/barber + cetak ulang.
- Rating admin, dashboard admin, tab performa barber.
- Display web: panggilan baru → suara Indonesia sekali; voice picker & banner peringatan.

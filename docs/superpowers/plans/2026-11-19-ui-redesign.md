# BarberSys UI 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menerapkan sistem visual "neo-brutalism editorial" ke seluruh layar BarberSys tanpa mengubah logika bisnis atau database.

**Architecture:** Perluas token tema yang sudah ada (`ThemeContext` + `constants/theme.ts`), tambah UI kit kecil di `src/components/ui/`, lalu adopsi bertahap: fondasi → shell → auth → customer → barber/kasir → admin → display. Animasi memakai `react-native-reanimated` yang sudah terpasang; font memakai paket `@expo-google-fonts/*`.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, TypeScript strict, expo-router, react-native-reanimated 4.5.1, @expo-google-fonts/space-grotesk, @expo-google-fonts/inter, @expo-google-fonts/jetbrains-mono.

**Spec:** `docs/superpowers/specs/2026-11-19-ui-redesign-design.md`

## Global Constraints

- Expo SDK 57 / RN 0.86 / React 19 — jangan memakai API dari versi lain.
- Harus jalan di native (Expo Go) dan web.
- Dua tema (light/dark) wajib berfungsi dan diuji.
- Tidak menambah dependency selain tiga paket font.
- Tidak mengubah skema DB, RLS, alur bisnis, atau fitur terkunci.
- Semua animasi menghormati `useReducedMotion()`.
- Commit hanya atas perintah eksplisit user (AGENTS §6).
- Nama file & path harus persis seperti di plan.

## Review Focus

- **Flash tema saat reload:** pilihan tema harus dibaca sebelum layar utama render; jangan biarkan dark→light berkedip.
- **Custom tab bar vs route tersembunyi:** route `href: null` (mis. `kasir/call`, `admin/laporan` bila nanti disembunyikan) tidak boleh muncul sebagai tab.
- **Font belum siap di web:** teks tidak boleh hilang/lompat; splash ditahan sampai `useFonts` selesai.
- **Reduced motion:** perangkat dengan "kurangi gerak" tidak boleh mendapat animasi spring/translate besar.
- **Regresi login:** menghapus demo quick-fill dan Google tidak boleh mengubah routing role atau membuat field kosong tidak bisa submit.

---

## File Map

### Baru
- `src/constants/fonts.ts` — nama font + aset `useFonts`.
- `src/lib/theme-preference.ts` — parse/konstanta mode tema.
- `src/lib/ticker.ts` — format & pecah nomor antrian.
- `scripts/test-theme-preference.mjs`
- `scripts/test-ticker.mjs`
- `src/components/ui/*.tsx` — UI kit (lihat Task 2).
- `src/components/ui/barber-tab-bar.tsx`
- `src/app/pengaturan/tampilan.tsx`
- `docs/akun-demo.md`

### Diubah
- `src/context/ThemeContext.tsx`
- `src/constants/theme.ts`
- `src/app/_layout.tsx`
- `app.json`
- `package.json` / `package-lock.json`
- `src/components/RoleHeader.tsx`
- `src/components/ProfileForm.tsx`
- `src/app/(auth)/login.tsx`
- `src/app/(auth)/register.tsx`
- `src/app/(customer)/_layout.tsx`, `(customer)/home.tsx`, `(customer)/queue/new.tsx`, `(customer)/queue/status.tsx`, `(customer)/history.tsx`, `(customer)/profile.tsx`
- `src/app/(barber)/_layout.tsx`, `(barber)/queue.tsx`, `(barber)/profile.tsx`
- `src/app/(kasir)/_layout.tsx`, `(kasir)/queue.tsx`, `(kasir)/call.tsx`, `(kasir)/payment.tsx`, `(kasir)/profile.tsx`
- `src/app/(admin)/_layout.tsx`, `(admin)/ringkasan.tsx`, `(admin)/treatments.tsx`, `(admin)/products.tsx`, `(admin)/staff.tsx`, `(admin)/laporan.tsx`, `(admin)/profile.tsx`
- `src/app/display.tsx`
- `docs/design.md`
- `docs/prd .md`
- `BarberSys/AGENTS.md`

---

### Task 1: Fondasi tema, font, dan persistensi

**Files:**
- Create: `src/constants/fonts.ts`
- Create: `src/lib/theme-preference.ts`
- Create: `scripts/test-theme-preference.mjs`
- Modify: `src/context/ThemeContext.tsx`
- Modify: `src/constants/theme.ts`
- Modify: `src/app/_layout.tsx`
- Modify: `app.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `ThemeMode`, `THEME_STORAGE_KEY`, `parseThemeMode(raw: string | null | undefined): ThemeMode`
- Produces: `Fonts` (`display`, `displayMedium`, `body`, `bodyMedium`, `bodySemi`, `bodyBold`, `mono`) dan `fontAssets` untuk `useFonts`
- Produces: `useAppTheme()` dengan field baru `mode: ThemeMode`, `setMode(mode: ThemeMode): void`; `toggleTheme()` dan `isDark` tetap ada.
- Produces: token baru `paper`, `shadow`, `shadowAccent`, `stripe`, `radius`.

- [ ] **Step 1: Tulis test yang gagal untuk preferensi tema**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseThemeMode, THEME_STORAGE_KEY } from '../src/lib/theme-preference.ts';

test('parseThemeMode hanya menerima light/dark', () => {
  assert.equal(parseThemeMode('dark'), 'dark');
  assert.equal(parseThemeMode('light'), 'light');
  assert.equal(parseThemeMode('system'), 'light');
  assert.equal(parseThemeMode(null), 'light');
  assert.equal(parseThemeMode(undefined), 'light');
  assert.equal(THEME_STORAGE_KEY, 'barbersys.theme');
});
```

- [ ] **Step 2: Jalankan test untuk memastikan gagal**

Run: `node --no-warnings --experimental-strip-types --test scripts/test-theme-preference.mjs`
Expected: FAIL karena `src/lib/theme-preference.ts` belum ada.

- [ ] **Step 3: Implementasi `src/lib/theme-preference.ts`**

```ts
export type ThemeMode = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'barbersys.theme';
export function parseThemeMode(raw: string | null | undefined): ThemeMode {
  return raw === 'dark' ? 'dark' : 'light';
}
```

- [ ] **Step 4: Tambah test ke `package.json` dan jalankan**

Tambahkan `scripts/test-theme-preference.mjs` ke akhir daftar `test:unit`.
Run: `npm run test:unit`
Expected: semua test hijau (68+).

- [ ] **Step 5: Buat `src/constants/fonts.ts`**

```ts
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';

export const fontAssets = {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  JetBrainsMono_700Bold,
};

export const Fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_700Bold',
} as const;
```

Install: `npx expo install @expo-google-fonts/space-grotesk @expo-google-fonts/inter @expo-google-fonts/jetbrains-mono` (atau `npm install` bila expo install tidak mengenali paket).

- [ ] **Step 6: Perluas token tema**

Di `src/context/ThemeContext.tsx`, tambahkan ke `StitchTheme` dan kedua theme:
- `paper` (`#F4EFE9` / `#1E1E22`)
- `shadow` (`#111111` / `#000000`)
- `shadowAccent` (`#F5B700` / `#FFCB3C`)
- `stripe: { crimson, cobalt, amber, cream }` — nilai crimson/cobalt/amber dari token masing-masing, cream `#FCF9F8` / `#F5F3EE`
- `radius: { sm: 6, md: 10, lg: 16, pill: 999 }`

Tambahkan state `mode: ThemeMode` (default `'light'`), muat dari AsyncStorage saat mount, dan `setMode` yang menyimpan ke AsyncStorage. `toggleTheme` memanggil `setMode(mode === 'light' ? 'dark' : 'light')`. Jangan hapus field lama.

- [ ] **Step 7: Update `src/constants/theme.ts`**

- `brutalistCard` memakai `theme.shadow`, radius `theme.radius.md`, border 2px, shadow 4px.
- Tambah parameter opsional `accent?: 'crimson' | 'cobalt' | 'amber'`; jika ada, `shadowColor` memakai token aksen tersebut.
- `brutalistButton` memakai `Fonts.bodyBold`, radius `theme.radius.md`, padding 14, shadow 3px; pertahankan semua variant.
- `brutalistInput` memakai `Fonts.body`, radius `theme.radius.md`, border 2px.
- `Typography` memakai `Fonts.display`/`Fonts.mono`.

- [ ] **Step 8: Load font di root layout**

Di `src/app/_layout.tsx`:
```ts
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { fontAssets } from '@/constants/fonts';

SplashScreen.preventAutoHideAsync();
```
Di `MainLayout`, panggil `useFonts(fontAssets)`; selama `!loaded` kembalikan `null`; saat loaded panggil `SplashScreen.hideAsync()`. Bungkus dengan `StatusBar` yang mengikuti tema.

- [ ] **Step 9: Update splash `app.json`**

Ganti `backgroundColor` splash menjadi `#FCF9F8` dan `imageWidth` tetap. Jangan ubah icon.

- [ ] **Step 10: Verifikasi**

Run: `npm run test:unit`
Expected: semua pass.
Run: `npm run typecheck`
Expected: jumlah baris error tidak bertambah dari baseline 31; tidak ada error di file yang disentuh.

**DoD Task 1:**
- [ ] `parseThemeMode` punya unit test dan semua test hijau.
- [ ] Tema tersimpan dan bertahan setelah reload web.
- [ ] Font termuat, splash tidak hilang sebelum font siap.
- [ ] `npm run typecheck` tidak menambah error baru.

---

### Task 2: UI kit dan motion primitives

**Files:**
- Create: `src/lib/ticker.ts`
- Create: `scripts/test-ticker.mjs`
- Create: `src/components/ui/text.tsx`
- Create: `src/components/ui/pressable-scale.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/text-field.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/section-header.tsx`
- Create: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/reveal.tsx`
- Create: `src/components/ui/ticker.tsx`
- Create: `src/components/ui/confetti.tsx`
- Create: `src/components/ui/stamp.tsx`
- Create: `src/components/ui/wall-switch.tsx`
- Create: `src/components/ui/pole-strip.tsx`
- Modify: `package.json`

**Interfaces:**
- `AppText({ variant?: 'display'|'h1'|'h2'|'body'|'caption'|'mono', color?: string, style?, children, numberOfLines? })`
- `PressableScale({ onPress?, disabled?, style?, children, scaleTo?: number, accessibilityLabel? })`
- `Button({ label, onPress, variant?: 'primary'|'secondary'|'ghost'|'danger'|'dark', icon?, loading?, disabled?, fullWidth?, testID? })`
- `Card({ children, tone?: 'surface'|'paper'|'ink', accent?: 'crimson'|'cobalt'|'amber', onPress?, style? })`
- `TextField({ label, value, onChangeText, placeholder?, secureTextEntry?, keyboardType?, autoCapitalize?, icon?, error?, editable?, multiline?, numberOfLines?, testID? })`
- `Reveal({ children, delay?: number, style? })` — fade+translate, reduced-motion aware.
- `Ticker({ value: string, fontSize?: number, color?: string, style? })`
- `Confetti({ active: boolean, count?: number })`
- `Stamp({ active: boolean, label?: string })`
- `WallSwitch({ mode: 'light'|'dark', onChange: (mode) => void })`
- `PoleStrip({ height?: number, animated?: boolean })`
- `formatQueueNumber(n: number): string` dan `splitQueueNumber(value: string): string[]` di `src/lib/ticker.ts`.

- [ ] **Step 1: Tulis test gagal untuk ticker**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatQueueNumber, splitQueueNumber } from '../src/lib/ticker.ts';

test('formatQueueNumber memakai prefix A dan dua digit', () => {
  assert.equal(formatQueueNumber(7), 'A-07');
  assert.equal(formatQueueNumber(12), 'A-12');
  assert.equal(formatQueueNumber(100), 'A-100');
});

test('splitQueueNumber memecah karakter', () => {
  assert.deepEqual(splitQueueNumber('A-07'), ['A', '-', '0', '7']);
  assert.deepEqual(splitQueueNumber(''), []);
});
```

- [ ] **Step 2: Jalankan test untuk memastikan gagal**

Run: `node --no-warnings --experimental-strip-types --test scripts/test-ticker.mjs`
Expected: FAIL karena modul belum ada.

- [ ] **Step 3: Implementasi `src/lib/ticker.ts`**

```ts
export function formatQueueNumber(n: number): string {
  return n < 10 ? `A-0${n}` : `A-${n}`;
}
export function splitQueueNumber(value: string): string[] {
  return Array.from(value);
}
```

- [ ] **Step 4: Jalankan test dan tambahkan ke `test:unit`**

Run: `npm run test:unit`
Expected: semua pass.

- [ ] **Step 5: Implementasi komponen dasar**

Buat `text.tsx`, `pressable-scale.tsx`, `card.tsx`, `button.tsx`, `text-field.tsx`, `badge.tsx`, `section-header.tsx`, `empty-state.tsx`, `skeleton.tsx`. Semua memakai `useAppTheme()` dan `Fonts`.
- `PressableScale` memakai `useSharedValue` + `withSpring`; `onPressIn` scale ke `scaleTo` (default 0.97), `onPressOut` kembali 1; `useReducedMotion()` melewati scale.
- `Button` memakai `PressableScale`, `ActivityIndicator` saat loading, dan varian warna: primary crimson, secondary surface, ghost transparan, danger merah, dark ink.
- `TextField` menampilkan label uppercase, ikon opsional, border fokus cobalt, error teks danger.

- [ ] **Step 6: Implementasi komponen motion**

Buat `reveal.tsx`, `ticker.tsx`, `confetti.tsx`, `stamp.tsx`, `wall-switch.tsx`, `pole-strip.tsx`.
- `Reveal`: `Animated.View entering={FadeInDown.duration(260).delay(delay).springify().damping(17)}`; jika reduced motion, `FadeIn.duration(160)`.
- `Ticker`: render `splitQueueNumber(value)`; tiap karakter memakai `Animated.Text` dengan `entering={FadeInDown.duration(180)}` dan `key={index + char}`.
- `Confetti`: 12–18 potongan kecil dengan warna crimson/cobalt/amber, animasi translateY + rotate + fade, hanya saat `active`.
- `Stamp`: scale dari 1.6 ke 1 + rotate -8° ke -3°, border tebal, label uppercase.
- `WallSwitch`: rocker besar (lebar 120, tinggi 180) dengan rotasi -12° (light) / +12° (dark), spring, ikon matahari/bulan, dua sekrup. `accessibilityRole="switch"`.
- `PoleStrip`: baris strip miring; jika `animated`, animasi translateX loop pelan.

- [ ] **Step 7: Verifikasi tipe**

Run: `npm run typecheck`
Expected: tidak ada error baru di `src/components/ui/*` dan `src/lib/ticker.ts`.

**DoD Task 2:**
- [ ] Semua komponen ada dan bisa diimpor dari `@/components/ui/...`.
- [ ] Test ticker hijau.
- [ ] Tidak ada animasi yang error di web (typecheck + render smoke).
- [ ] Semua komponen menerima warna dari tema, bukan hardcode.

---

### Task 3: App shell — RoleHeader, tab bar, menu Tampilan

**Files:**
- Create: `src/components/ui/barber-tab-bar.tsx`
- Create: `src/app/pengaturan/tampilan.tsx`
- Modify: `src/components/RoleHeader.tsx`
- Modify: `src/components/ProfileForm.tsx`
- Modify: `src/app/(customer)/_layout.tsx`
- Modify: `src/app/(barber)/_layout.tsx`
- Modify: `src/app/(kasir)/_layout.tsx`
- Modify: `src/app/(admin)/_layout.tsx`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- `BarberTabBar({ state, descriptors, navigation, accent }: { state: any; descriptors: any; navigation: any; accent?: string })`
- Route `/pengaturan/tampilan` tanpa parameter.
- `useAppTheme().mode` dan `setMode` dari Task 1.

- [ ] **Step 1: Implementasi `BarberTabBar`**

Bar mengambang: margin 12, radius 20, border 2px `ink`, background `surface`, shadow 4px, padding 6. Filter route dengan `descriptors[route.key].options.tabBarButton === null` atau `options.href === null`. Item aktif memakai pil `accent` + ikon/label `ink`; item pasif `inkMuted`. Animasi pil dengan `Animated.View` + `withSpring` per item (scale/opacity). Safe area bottom.

- [ ] **Step 2: Pasang di empat layout**

Ganti `screenOptions` tab bar style yang lama dengan `tabBar={(props) => <BarberTabBar {...props} accent={theme.primary} />}`. Warna accent: customer `primary`, kasir `secondary`, barber `amber`, admin `primary`. Pertahankan `href: null` pada `kasir/call`. Jangan ubah daftar screen.

- [ ] **Step 3: Redesign `RoleHeader`**

Header ringkas: background `paper`, borderBottom 2px, logo 32px, judul + role badge, avatar, tombol logout. Hapus `ThemeSwitch`. Tambahkan `Reveal` halus pada badge. Jangan ubah `handleLogout`.

- [ ] **Step 4: Buat halaman `/pengaturan/tampilan`**

Header dengan tombol kembali (`router.back()`), judul "Tampilan". Konten: `WallSwitch` besar di tengah, label mode aktif, dua kartu preview kecil (Terang/Gelap) yang bisa diketuk, dan catatan "Pilihan disimpan di perangkat ini." Tombol kembali juga tersedia di bawah. Gunakan `Screen`/`SafeAreaView`.

- [ ] **Step 5: Tambah menu Tampilan di `ProfileForm`**

Di atas tombol logout, tambahkan `Card`/baris "Pengaturan" dengan item:
- ikon palette, label "Tampilan", nilai "Terang"/"Gelap", chevron.
- onPress: `router.push('/pengaturan/tampilan' as any)`.
Jangan ubah form nama/HP/foto.

- [ ] **Step 6: Daftarkan route di root layout**

Tambah `<Stack.Screen name="pengaturan/tampilan" />` dengan `animation: 'slide_from_right'`.

- [ ] **Step 7: Hapus ThemeSwitch dari login & header**

Pastikan tidak ada lagi `<ThemeSwitch` di `RoleHeader` dan `login.tsx` (login akan dirombak di Task 4, tapi hapus sekarang agar tidak dobel).

- [ ] **Step 8: Verifikasi**

Run: `npm run typecheck`.
Jalankan web, buka login lalu masuk customer; cek tab bar baru, buka Profil → Tampilan, ganti mode, reload, pastikan pilihan bertahan. Cek tab `call` kasir tidak muncul.

**DoD Task 3:**
- [ ] Tab bar baru tampil di 4 role; route tersembunyi tidak muncul.
- [ ] Menu Tampilan membuka halaman sakelar dan pilihan bertahan setelah reload.
- [ ] ThemeSwitch kecil tidak ada lagi di header/login.
- [ ] Tidak ada error navigasi.

---

### Task 4: Redesign login & register, hapus Google/demo

**Files:**
- Modify: `src/app/(auth)/login.tsx`
- Modify: `src/app/(auth)/register.tsx`
- Create: `docs/akun-demo.md`
- Modify: `BarberSys/package.json` (hapus dependency yang tidak terpakai bila aman)

**Interfaces:**
- Login tetap memanggil `supabase.auth.signInWithPassword` dan `refreshProfile(user.id)`.
- Routing role: `customer → /(customer)/home`, `kasir → /(kasir)/queue`, `barber → /(barber)/queue`, `admin → /(admin)/treatments` (pertahankan perilaku lama).
- Register tetap `supabase.auth.signUp` lalu `router.replace('/(auth)/login')`.

- [ ] **Step 1: Tulis ulang login**

Hapus: `WebBrowser`, `Linking`, `AntDesign`, `ThemeSwitch`, `handleGoogleLogin`, `googleLoading`, `selectedRole`, `handleQuickFill`, panel role, tombol Google, dan banner theme switch. Pertahankan banner jam operasional.
Buat layout responsif: `useWindowDimensions()`; jika `width >= 900` tampilkan dua kolom (panel brand + form), selain itu satu kolom.
Panel brand: background `paper`, dot grid sederhana, `PoleStrip`, teks "BARBERSYS" besar dengan `Fonts.display`, tagline, badge "POTONG • CUKUR • STYLING". Form: label "MASUK KE AKUN", judul "Selamat datang kembali", email, password (show/hide), error inline, tombol `Button` primary full-width "Masuk", tautan "Belum punya akun? Daftar".
Field default kosong. Submit disabled hanya jika email/password kosong atau loading.
Tambahkan `Reveal` untuk panel/kartu/field.

- [ ] **Step 2: Tulis ulang register**

Layout sama dengan login (panel brand kiri). Form: nama, email, no HP, password, konfirmasi. Tambah password strength bar (lemah/sedang/kuat) berdasarkan panjang + variasi karakter. Tombol "Daftar Sekarang". Footer "Sudah punya akun? Masuk". Pertahankan validasi yang ada (email regex, HP angka, password ≥8, konfirmasi cocok).

- [ ] **Step 3: Buat `docs/akun-demo.md`**

Isi: tabel 4 akun (`admin@barbersys.com`, `customer@barbersys.com`, `barber@barbersys.com`, `kasir@barbersys.com`, password `Password123!`), catatan bahwa akun staff dibuat Admin, dan catatan bahwa panel demo sudah dihapus dari UI. Jangan menaruh password di UI.

- [ ] **Step 4: Hapus dependency OAuth yang tidak terpakai**

Cek `rg "expo-auth-session|expo-web-browser|expo-linking" src`. Jika tidak ada pemakaian lain, hapus dari `package.json` dan jalankan `npm install`. Jika masih dipakai (mis. linking umum), biarkan dan catat.

- [ ] **Step 5: Verifikasi**

Run: `npm run typecheck`.
Jalankan web; login dengan tiap akun; pastikan routing benar. Cek tidak ada teks Google/DEMO. Screenshot light & dark.

**DoD Task 4:**
- [ ] Login bersih tanpa Google/demo, field kosong, routing role tetap benar.
- [ ] Register baru tampil dan validasi tetap jalan.
- [ ] `docs/akun-demo.md` ada dan akurat.
- [ ] Tidak ada import OAuth mati.

---

### Task 5: Customer screens

**Files:**
- Modify: `src/app/(customer)/home.tsx`
- Modify: `src/app/(customer)/queue/new.tsx`
- Modify: `src/app/(customer)/queue/status.tsx`
- Modify: `src/app/(customer)/history.tsx`
- Modify: `src/app/(customer)/profile.tsx`

**Interfaces:**
- Memakai `Reveal`, `Card`, `Button`, `Ticker`, `Confetti`, `Stamp`, `EmptyState`, `Skeleton` dari Task 2.
- Tidak mengubah query Supabase, RPC, atau logika antrian.

- [ ] **Step 1: Home**

Ganti intro dengan hero: eyebrow "BARBERSYS", judul "Pilih gaya, kami siapkan kursinya", subcopy. Kartu treatment memakai `Card` dengan shadow aksen amber bergantian; foto tetap. Tambah tilt 3D halus pada kartu (Reanimated, maks 4°) atau `PressableScale` bila tilt terlalu berat di web. Loading memakai `Skeleton` 3 kartu. Empty memakai `EmptyState`.

- [ ] **Step 2: Queue/new**

Bagi form menjadi section card: Layanan, Barber, Produk tambahan, Instruksi, Ringkasan. Gunakan `TextField` untuk instruksi dan `PressableScale` untuk pilihan. Tombol submit memakai `Button` primary. Setelah insert sukses, tampilkan overlay `Stamp` + `Confetti` selama ±1200ms sebelum `router.replace` ke status. Jangan mengubah payload insert.

- [ ] **Step 3: Queue/status**

Kartu tiket memakai `Card` + `PoleStrip`; nomor antrian memakai `Ticker` dengan `Fonts.mono`; status badge memakai `Badge`. Tambah `Reveal` per section. Pertahankan tombol share, cancel, rating. Placeholder tombol QRIS tidak ditambahkan di task ini (Task Fase 6).

- [ ] **Step 4: History**

Kartu riwayat memakai `Card`, nominal dengan `Fonts.mono`, badge status. Tambah `Reveal` stagger. Empty state baru.

- [ ] **Step 5: Profile**

Pastikan memakai `ProfileForm` yang sudah diperbarui (Task 3). Tidak perlu kode tambahan selain memastikan layout tidak dobel header.

- [ ] **Step 6: Verifikasi**

Run: `npm run typecheck`.
Web: login customer, buka Treatment, Ambil Antrian, Status, Riwayat, Profil. Cek light/dark, tidak ada console error.

**DoD Task 5:**
- [ ] 5 layar customer tampil dengan gaya baru.
- [ ] Alur ambil antrian → status tetap berfungsi dan animasi sukses muncul.
- [ ] Tidak ada query/logika yang berubah.
- [ ] Light & dark terbaca.

---

### Task 6: Barber & Kasir screens

**Files:**
- Modify: `src/app/(barber)/queue.tsx`
- Modify: `src/app/(barber)/profile.tsx`
- Modify: `src/app/(kasir)/queue.tsx`
- Modify: `src/app/(kasir)/call.tsx`
- Modify: `src/app/(kasir)/payment.tsx`
- Modify: `src/app/(kasir)/profile.tsx`

**Interfaces:**
- Memakai UI kit Task 2; tidak mengubah query/update/RLS.
- `payment.tsx` belum menampilkan QRIS; itu Task Fase 6.

- [ ] **Step 1: Barber queue**

Header statistik (pelanggan hari ini, waktu kerja) memakai `Card` aksen amber. Daftar tugas memakai `Card` + `Reveal`; tombol aksi status memakai `Button` ukuran kecil. Rating dan instruksi tetap.

- [ ] **Step 2: Barber profile**

Gunakan `ProfileForm`; pastikan tidak ada header ganda.

- [ ] **Step 3: Kasir queue**

4 kartu statistik memakai `Card` dengan angka `Fonts.mono`; tombol walk-in memakai `Button` secondary. Daftar antrian memakai `Card` + `Reveal`, badge status.

- [ ] **Step 4: Kasir call**

Nomor yang dipanggil besar memakai `Ticker`/`Fonts.mono`, `Stamp` saat panggilan berhasil. Tombol panggil ulang/next memakai `Button`. Jangan ubah RPC/status.

- [ ] **Step 5: Kasir payment**

Kartu tagihan memakai `Card`, total dengan `Fonts.mono`. Modal pembayaran memakai `Card` + `Button`; metode Tunai tetap satu-satunya opsi aktif, QRIS tetap terkunci "Segera Hadir" sampai Fase 6. Pertahankan tip, struk, walk-in produk.

- [ ] **Step 6: Kasir profile**

Gunakan `ProfileForm`.

- [ ] **Step 7: Verifikasi**

Run: `npm run typecheck`.
Web: login barber dan kasir, buka semua tab, buka modal pembayaran tunai, pastikan tidak ada regresi.

**DoD Task 6:**
- [ ] Semua layar barber/kasir bergaya baru.
- [ ] Modal pembayaran tunai, tip, struk, walk-in tetap berfungsi.
- [ ] Tidak ada perubahan query/logika.
- [ ] Light & dark terbaca.

---

### Task 7: Admin screens

**Files:**
- Modify: `src/app/(admin)/ringkasan.tsx`
- Modify: `src/app/(admin)/treatments.tsx`
- Modify: `src/app/(admin)/products.tsx`
- Modify: `src/app/(admin)/staff.tsx`
- Modify: `src/app/(admin)/laporan.tsx`
- Modify: `src/app/(admin)/profile.tsx`

**Interfaces:**
- Memakai UI kit Task 2; CRUD dan query tetap.

- [ ] **Step 1: Ringkasan**

4 kartu statistik memakai `Card` dengan aksen berbeda (crimson/cobalt/amber/success), angka `Fonts.mono`, `Reveal` stagger.

- [ ] **Step 2: Treatments & Products**

Form tambah/edit memakai `TextField`, `Button`, dan `Card`. List memakai `Card` + `Reveal`; foto tetap. Modal dikonfirmasi memakai `Button`. Jangan ubah upload/CRUD.

- [ ] **Step 3: Staff**

List pegawai memakai `Card`; badge role/status memakai `Badge`; form tambah pegawai memakai `TextField`/`Button`. Edge Function `create-staff` tidak diubah.

- [ ] **Step 4: Laporan**

Tombol ekspor PDF/XLSX memakai `Button`; kartu ringkasan memakai `Card`. Jangan ubah isi laporan.

- [ ] **Step 5: Profile**

Gunakan `ProfileForm`.

- [ ] **Step 6: Verifikasi**

Run: `npm run typecheck`.
Web: login admin, buka Ringkasan, Treatment, Produk, Pegawai, Laporan, Profil. Cek light/dark.

**DoD Task 7:**
- [ ] 6 layar admin bergaya baru.
- [ ] CRUD treatment/produk/pegawai dan ekspor laporan tetap berfungsi.
- [ ] Tidak ada perubahan query/Edge Function.
- [ ] Light & dark terbaca.

---

### Task 8: Display TV, dokumentasi, verifikasi akhir

**Files:**
- Modify: `src/app/display.tsx`
- Modify: `docs/design.md`
- Modify: `docs/prd .md`
- Modify: `BarberSys/AGENTS.md`
- Create: `docs/superpowers/plans/2026-11-19-ui-redesign-progress.md` (ledger eksekusi)

**Interfaces:**
- Display tetap `darkStitchTheme`; TTS & cache tidak berubah.
- `Ticker` dipakai untuk nomor yang dipanggil.

- [ ] **Step 1: Display polish**

Ganti nomor besar dengan `Ticker` (value dari `formatQueueNumber`), tambah `Reveal` untuk 5 antrian berikutnya, perbesar tipografi label, pertahankan overlay "Aktifkan Suara" dan catatan voice. Jangan ubah logika TTS/dedupe/cache.

- [ ] **Step 2: Update `docs/design.md`**

Perbarui §2 token (paper/shadow/shadowAccent/radius), §3 tipografi (font families + cara load), §5 border/shadow/radius, tambah §Motion (principles, durations, reduced motion), §6 komponen (Button/Card/TextField/TabBar/WallSwitch). Jangan hapus aturan yang masih berlaku.

- [ ] **Step 3: Update PRD backlog**

Di §20 tambah:
- **B21** — Redesign UI 2.0 (neo-brutalism editorial) disetujui 19 Nov 2026, seluruh layar.
- **B22** — Google OAuth dihapus dari UI, ditunda ke fase akhir; akun uji di `docs/akun-demo.md`.
Perbarui status roadmap di AGENTS: UI 2.0 selesai diimplementasikan (tanggal), Fase 6 menyusul.

- [ ] **Step 4: Ledger progres**

Buat `docs/superpowers/plans/2026-11-19-ui-redesign-progress.md` berisi status per task, perintah verifikasi, dan link screenshot Playwright.

- [ ] **Step 5: Verifikasi otomatis**

Run: `npm run test:unit` → semua pass.
Run: `npm run typecheck` → tidak ada error baru.
Run web: `npx expo start --port 8081` (background).
Playwright: buka `/login`, `/register`, customer/kasir/barber/admin setelah login, `/display`. Screenshot 390 & 1280, light & dark bila memungkinkan. Cek console 0 error.

- [ ] **Step 6: Verifikasi manual**

Checklist Expo Go:
- Login tiap role.
- Ambil antrian customer.
- Ganti tema di Profil → Tampilan, reload.
- Buka semua tab.
- Display TV + TTS tetap berjalan.

**DoD Task 8:**
- [ ] Display TV memakai ticker dan tetap dark.
- [ ] `design.md`, PRD, AGENTS, ledger diperbarui.
- [ ] `npm run test:unit` hijau.
- [ ] `npm run typecheck` tidak menambah error.
- [ ] Playwright screenshots tersimpan dan console bersih.
- [ ] Checklist manual dicatat di ledger.

---

## Final DoD (UI 2.0)

- [ ] Semua route di File Map bisa dibuka tanpa error.
- [ ] Login/register baru, tanpa Google/demo.
- [ ] Tema terang/gelap berfungsi, tersimpan, dan bisa diakses dari Profil → Tampilan.
- [ ] Tab bar baru konsisten di 4 role; route tersembunyi tetap tersembunyi.
- [ ] Animasi masuk, press, ticker, stamp, confetti, tilt, wall switch berjalan; reduced motion aman.
- [ ] Tidak ada perubahan DB/RLS/logika bisnis.
- [ ] Unit test + typecheck + Playwright + manual checklist lulus.
- [ ] Commit dibuat hanya setelah user memerintahkan.

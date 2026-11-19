/**
 * Fase 4 (fix HP 3-button nav) — ukuran tab bar sadar safe-area.
 *
 * React Navigation hanya menambahkan `insets.bottom` ke tinggi/padding tab bar
 * bila `tabBarStyle.height` TIDAK di-set. Semua layout role memakai tinggi
 * desain 64, sehingga di Android dengan navigasi 3 tombol (inset ~48dp) tab bar
 * tergambar di belakang tombol Back/Home/Recents. Helper ini menambahkan inset
 * ke tinggi & padding bawah tanpa mengubah area ikon/label (tetap 50dp).
 */
export interface TabBarMetrics {
  height: number;
  paddingTop: number;
  paddingBottom: number;
}

const BASE_HEIGHT = 64;
const BASE_TOP = 6;
const BASE_BOTTOM = 8;

export function getTabBarMetrics(bottomInset: number | null | undefined): TabBarMetrics {
  const inset =
    typeof bottomInset === 'number' && Number.isFinite(bottomInset) && bottomInset > 0
      ? bottomInset
      : 0;
  return {
    height: BASE_HEIGHT + inset,
    paddingTop: BASE_TOP,
    paddingBottom: BASE_BOTTOM + inset,
  };
}

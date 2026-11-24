export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'barbersys.theme';

/** Hanya mode tersimpan yang valid; nilai lain (termasuk "system") jatuh ke terang. */
export function parseThemeMode(raw: string | null | undefined): ThemeMode {
  return raw === 'dark' ? 'dark' : 'light';
}

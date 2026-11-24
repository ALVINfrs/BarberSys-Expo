import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  parseThemeMode,
  THEME_STORAGE_KEY,
  ThemeMode,
} from '@/lib/theme-preference';

export interface StitchTheme {
  isDark: boolean;
  mode: ThemeMode;
  bg: string;
  paper: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerLowest: string;
  surfaceContainerHigh: string;
  ink: string;
  inkMuted: string;
  primary: string;
  secondary: string;
  amber: string;
  success: string;
  warning: string;
  info: string;
  danger: string;
  neutral: string;
  accentCrimson: string;
  accentCobalt: string;
  accentAmber: string;
  cardBorder: string;
  cardShadow: string;
  shadow: string;
  shadowAccent: string;
  stripe: {
    crimson: string;
    cobalt: string;
    amber: string;
    cream: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
}

const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const lightStitchTheme: StitchTheme = {
  isDark: false,
  mode: 'light',
  bg: '#FCF9F8',
  paper: '#F4EFE9',
  surface: '#FFFFFF',
  surfaceContainer: '#F0EDEC',
  surfaceContainerLow: '#F6F3F2',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerHigh: '#EBE7E7',
  ink: '#111111',
  inkMuted: '#5A5A55',
  primary: '#D7263D',
  secondary: '#1C4ED8',
  amber: '#F5B700',
  success: '#2BA84A',
  warning: '#F5B700',
  info: '#1C4ED8',
  danger: '#D7263D',
  neutral: '#8A8A85',
  accentCrimson: '#D7263D',
  accentCobalt: '#1C4ED8',
  accentAmber: '#F5B700',
  cardBorder: '#111111',
  cardShadow: '#111111',
  shadow: '#111111',
  shadowAccent: '#F5B700',
  stripe: {
    crimson: '#D7263D',
    cobalt: '#1C4ED8',
    amber: '#F5B700',
    cream: '#FCF9F8',
  },
  radius: { ...radius },
};

export const darkStitchTheme: StitchTheme = {
  isDark: true,
  mode: 'dark',
  bg: '#121214',
  paper: '#1E1E22',
  surface: '#1B1B1F',
  surfaceContainer: '#26262B',
  surfaceContainerLow: '#1E1E22',
  surfaceContainerLowest: '#26262B',
  surfaceContainerHigh: '#313136',
  ink: '#F5F3EE',
  inkMuted: '#A8A6A0',
  primary: '#FF5164',
  secondary: '#5B85FF',
  amber: '#FFCB3C',
  success: '#4CD97A',
  warning: '#FFCB3C',
  info: '#5B85FF',
  danger: '#FF5164',
  neutral: '#6E6E72',
  accentCrimson: '#FF5164',
  accentCobalt: '#5B85FF',
  accentAmber: '#FFCB3C',
  cardBorder: '#333338',
  cardShadow: '#000000',
  shadow: '#000000',
  shadowAccent: '#FFCB3C',
  stripe: {
    crimson: '#FF5164',
    cobalt: '#5B85FF',
    amber: '#FFCB3C',
    cream: '#F5F3EE',
  },
  radius: { ...radius },
};

interface ThemeContextType {
  theme: StitchTheme;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightStitchTheme,
  isDark: false,
  mode: 'light',
  setMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((raw) => {
        if (!cancelled) setModeState(parseThemeMode(raw));
      })
      .catch(() => {
        // Preferensi rusak/tidak tersedia → tetap terang.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
      // Gagal menyimpan tidak boleh memblokir perubahan tema.
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  // Tahan render sampai preferensi terbaca agar tidak ada kedipan terang→gelap.
  if (!hydrated) return null;

  const theme = mode === 'dark' ? darkStitchTheme : lightStitchTheme;

  return (
    <ThemeContext.Provider
      value={{ theme, isDark: mode === 'dark', mode, setMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);

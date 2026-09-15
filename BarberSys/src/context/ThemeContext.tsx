import React, { createContext, useContext, useState } from 'react';

export interface StitchTheme {
  isDark: boolean;
  bg: string;
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
}

export const lightStitchTheme: StitchTheme = {
  isDark: false,
  bg: '#FCF9F8',
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
};

export const darkStitchTheme: StitchTheme = {
  isDark: true,
  bg: '#121214',
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
};

interface ThemeContextType {
  theme: StitchTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightStitchTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Light mode (#FCF9F8 cream background) per Stitch specifications
  const [isDark, setIsDark] = useState<boolean>(false);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const theme = isDark ? darkStitchTheme : lightStitchTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);

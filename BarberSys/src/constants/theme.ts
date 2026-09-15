import { Platform } from 'react-native';

/**
 * BarberSys Design Tokens & Theme
 * Sesuai panduan di docs/design.md (Neo-Brutalism)
 */

export const lightTheme = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  ink: '#111111',
  inkMuted: '#5A5A55',
  accentCrimson: '#D7263D',
  accentCobalt: '#1C4ED8',
  accentAmber: '#F5B700',
  success: '#2BA84A',
  warning: '#F5B700',
  info: '#1C4ED8',
  danger: '#D7263D',
  neutral: '#8A8A85',
};

export const darkTheme = {
  bg: '#121214',
  surface: '#1B1B1F',
  ink: '#F5F3EE',
  inkMuted: '#A8A6A0',
  accentCrimson: '#FF5164',
  accentCobalt: '#5B85FF',
  accentAmber: '#FFCB3C',
  success: '#4CD97A',
  warning: '#FFCB3C',
  info: '#5B85FF',
  danger: '#FF5164',
  neutral: '#6E6E72',
};

export type AppTheme = typeof lightTheme;

export const Typography = {
  display: {
    fontSize: 40,
    fontWeight: '800' as const,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  monoLg: {
    fontSize: 32,
    fontWeight: '700' as const,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  monoSm: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
};

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const brutalistCard = (theme: AppTheme) => ({
  backgroundColor: theme.surface,
  borderWidth: 2,
  borderColor: theme.ink,
  borderRadius: 0,
  shadowColor: theme.ink,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
});

export const brutalistButton = (theme: AppTheme, variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary') => {
  const base = {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
  };

  switch (variant) {
    case 'primary':
      return {
        ...base,
        backgroundColor: theme.accentCrimson,
        borderWidth: 2,
        borderColor: theme.ink,
        shadowColor: theme.ink,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
      };
    case 'secondary':
      return {
        ...base,
        backgroundColor: theme.surface,
        borderWidth: 2,
        borderColor: theme.ink,
        shadowColor: theme.ink,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
      };
    case 'danger':
      return {
        ...base,
        backgroundColor: theme.danger,
        borderWidth: 2,
        borderColor: theme.ink,
        shadowColor: theme.ink,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
      };
    case 'ghost':
      return {
        ...base,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.inkMuted,
      };
  }
};

export const brutalistInput = (theme: AppTheme, isFocused: boolean = false) => ({
  backgroundColor: theme.surface,
  borderWidth: 1.5,
  borderColor: isFocused ? theme.accentCobalt : theme.ink,
  borderRadius: 4,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: theme.ink,
  fontSize: 16,
});

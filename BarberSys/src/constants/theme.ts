import type { StitchTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/fonts';

/**
 * BarberSys Design Tokens & Theme
 * Sesuai panduan di docs/design.md (Neo-Brutalism Editorial)
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

export type AppTheme = StitchTheme;

export type CardAccent = 'crimson' | 'cobalt' | 'amber';

export const Typography = {
  display: {
    fontSize: 40,
    fontFamily: Fonts.display,
    letterSpacing: -1,
  },
  h1: {
    fontSize: 28,
    fontFamily: Fonts.display,
    letterSpacing: -0.8,
  },
  h2: {
    fontSize: 20,
    fontFamily: Fonts.display,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 16,
    fontFamily: Fonts.body,
  },
  caption: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
  },
  monoLg: {
    fontSize: 32,
    fontFamily: Fonts.mono,
    letterSpacing: -0.5,
  },
  monoSm: {
    fontSize: 14,
    fontFamily: Fonts.mono,
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

function accentColor(theme: AppTheme, accent?: CardAccent): string {
  switch (accent) {
    case 'crimson':
      return theme.accentCrimson;
    case 'cobalt':
      return theme.accentCobalt;
    case 'amber':
      return theme.accentAmber;
    default:
      return theme.shadow;
  }
}

export const brutalistCard = (theme: AppTheme, accent?: CardAccent) => ({
  backgroundColor: theme.surface,
  borderWidth: 2,
  borderColor: theme.ink,
  borderRadius: theme.radius.md,
  shadowColor: accentColor(theme, accent),
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
});

export const brutalistButton = (theme: AppTheme, variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary') => {
  const base = {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    minHeight: 48,
  };

  switch (variant) {
    case 'primary':
      return {
        ...base,
        backgroundColor: theme.accentCrimson,
        borderWidth: 2,
        borderColor: theme.ink,
        shadowColor: theme.shadow,
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
        shadowColor: theme.shadow,
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
        shadowColor: theme.shadow,
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
  borderWidth: 2,
  borderColor: isFocused ? theme.accentCobalt : theme.ink,
  borderRadius: theme.radius.md,
  paddingHorizontal: 12,
  paddingVertical: 12,
  minHeight: 48,
  color: theme.ink,
  fontSize: 16,
  fontFamily: Fonts.body,
});

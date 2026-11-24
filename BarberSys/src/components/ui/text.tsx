import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/fonts';

export type TextVariant = 'display' | 'h1' | 'h2' | 'body' | 'caption' | 'mono';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
}

const VARIANTS: Record<TextVariant, TextStyle> = {
  display: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
  },
  h1: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
  },
  h2: {
    fontFamily: Fonts.displayMedium,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: Fonts.bodySemi,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.5,
  },
};

/** Teks dengan varian tipografi resmi BarberSys. */
export function AppText({ variant = 'body', color, style, children, ...rest }: AppTextProps) {
  const { theme } = useAppTheme();
  return (
    <Text {...rest} style={[VARIANTS[variant], { color: color ?? theme.ink }, style]}>
      {children}
    </Text>
  );
}

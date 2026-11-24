import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { useAppTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { AppText } from './text';

export interface StampProps {
  active: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** Stempel tiket miring dengan scale-in spring. */
export function Stamp({ active, label = 'LUNAS', style }: StampProps) {
  const { theme } = useAppTheme();
  const reduced = useReducedMotion();

  if (!active) return null;

  return (
    <Animated.View
      entering={
        reduced
          ? FadeIn.duration(160)
          : ZoomIn.springify().damping(11).stiffness(180)
      }
      style={[
        {
          alignSelf: 'center',
          transform: [{ rotate: '-3deg' }],
          borderWidth: 3,
          borderColor: theme.primary,
          borderRadius: theme.radius.sm,
          paddingHorizontal: 18,
          paddingVertical: 8,
          backgroundColor: theme.surface,
        },
        style,
      ]}
    >
      <AppText
        color={theme.primary}
        style={{
          fontFamily: Fonts.display,
          fontSize: 26,
          letterSpacing: 3,
        }}
      >
        {label.toUpperCase()}
      </AppText>
    </Animated.View>
  );
}

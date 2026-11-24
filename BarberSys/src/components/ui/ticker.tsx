import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useAppTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { splitQueueNumber } from '@/lib/ticker';

export interface TickerProps {
  value: string;
  fontSize?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Nomor antrian per-karakter: setiap karakter baru masuk dengan fade-down. */
export function Ticker({ value, fontSize = 48, color, style }: TickerProps) {
  const { theme } = useAppTheme();
  const reduced = useReducedMotion();
  const chars = splitQueueNumber(value);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Nomor antrian ${value}`}
      style={[{ flexDirection: 'row', alignItems: 'center' }, style]}
    >
      {chars.map((char, index) => (
        <Animated.Text
          key={`${index}-${char}`}
          entering={reduced ? undefined : FadeInDown.duration(180).delay(index * 30)}
          style={{
            fontFamily: Fonts.mono,
            fontSize,
            lineHeight: fontSize * 1.08,
            letterSpacing: -1,
            color: color ?? theme.ink,
          }}
        >
          {char}
        </Animated.Text>
      ))}
    </View>
  );
}

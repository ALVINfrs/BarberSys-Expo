import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { CardAccent, brutalistCard } from '@/constants/theme';
import { PressableScale } from './pressable-scale';

export type CardTone = 'surface' | 'paper' | 'ink';

export interface CardProps {
  children: React.ReactNode;
  tone?: CardTone;
  accent?: CardAccent;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Kartu neo-brutalis: border 2px, hard shadow, radius kecil. */
export function Card({ children, tone = 'surface', accent, onPress, style }: CardProps) {
  const { theme } = useAppTheme();

  const toneStyle: Record<CardTone, { backgroundColor: string }> = {
    surface: { backgroundColor: theme.surface },
    paper: { backgroundColor: theme.paper },
    ink: { backgroundColor: theme.ink },
  };

  const cardStyle = [
    brutalistCard(theme, accent),
    toneStyle[tone],
    { padding: 16 },
    style,
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={cardStyle} accessibilityRole="button">
        {children}
      </PressableScale>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

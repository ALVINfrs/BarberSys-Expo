import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { AppText } from './text';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'ink';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

/** Badge pill dengan border tegas. */
export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const { theme } = useAppTheme();

  const palette: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.surfaceContainerHigh, fg: theme.ink },
    success: { bg: theme.success, fg: '#FFFFFF' },
    warning: { bg: theme.warning, fg: '#111111' },
    danger: { bg: theme.danger, fg: '#FFFFFF' },
    info: { bg: theme.info, fg: '#FFFFFF' },
    accent: { bg: theme.accentAmber, fg: '#111111' },
    ink: { bg: theme.ink, fg: theme.bg },
  };
  const { bg, fg } = palette[tone];

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: theme.ink,
          borderRadius: theme.radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <AppText
        variant="caption"
        color={fg}
        style={{ fontSize: 10, letterSpacing: 0.8 }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
}

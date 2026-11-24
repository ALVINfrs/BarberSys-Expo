import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Judul section dengan garis aksen dan aksi opsional. */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: SectionHeaderProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 18,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.accentAmber,
              borderWidth: 1,
              borderColor: theme.ink,
            }}
          />
          <AppText variant="h2">{title}</AppText>
        </View>
        {subtitle ? (
          <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} accessibilityRole="button">
          <AppText
            variant="caption"
            color={theme.secondary}
            style={{ textDecorationLine: 'underline' }}
          >
            {actionLabel}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

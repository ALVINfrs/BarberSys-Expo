import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { Button } from './button';
import { AppText } from './text';

export interface EmptyStateProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Empty state ilustratif dengan border putus-putus. */
export function EmptyState({
  icon = 'content-cut',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 32,
          paddingHorizontal: 20,
          gap: 8,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: theme.inkMuted,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.surfaceContainerLow,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.pill,
          backgroundColor: theme.accentAmber,
          borderWidth: 2,
          borderColor: theme.ink,
          marginBottom: 4,
        }}
      >
        <MaterialIcons name={icon} size={26} color="#111111" />
      </View>
      <AppText variant="h2" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText
          variant="body"
          color={theme.inkMuted}
          style={{ textAlign: 'center', fontSize: 13 }}
        >
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={{ marginTop: 8 }} />
      ) : null}
    </View>
  );
}

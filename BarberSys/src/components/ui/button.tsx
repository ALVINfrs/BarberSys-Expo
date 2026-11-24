import React from 'react';
import { ActivityIndicator, StyleProp, View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Tombol utama BarberSys dengan hard shadow dan state loading. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  testID,
  style,
}: ButtonProps) {
  const { theme } = useAppTheme();
  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { bg: string; fg: string }> = {
    primary: { bg: theme.primary, fg: '#FFFFFF' },
    secondary: { bg: theme.surface, fg: theme.ink },
    ghost: { bg: 'transparent', fg: theme.ink },
    danger: { bg: theme.danger, fg: '#FFFFFF' },
    dark: { bg: theme.ink, fg: theme.bg },
  };
  const { bg, fg } = palette[variant];

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        {
          minHeight: 48,
          paddingVertical: 13,
          paddingHorizontal: 16,
          borderRadius: theme.radius.md,
          borderWidth: variant === 'ghost' ? 1.5 : 2,
          borderColor: variant === 'ghost' ? theme.inkMuted : theme.ink,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.5 : 1,
        },
        variant !== 'ghost' && {
          shadowColor: theme.shadow,
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 3,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <MaterialIcons name={icon} size={18} color={fg} />
      ) : null}
      <AppText
        style={{ fontFamily: Fonts.bodyBold, fontSize: 14, letterSpacing: 0.4 }}
        color={fg}
      >
        {label}
      </AppText>
    </PressableScale>
  );
}

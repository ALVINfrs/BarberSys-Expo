import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { brutalistInput } from '@/constants/theme';
import { AppText } from './text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  icon?: keyof typeof MaterialIcons.glyphMap;
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Input dengan label uppercase, ikon opsional, dan error inline. */
export function TextField({
  label,
  error,
  icon,
  secureToggle = false,
  containerStyle,
  secureTextEntry,
  editable = true,
  ...rest
}: TextFieldProps) {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecure = Boolean(secureTextEntry) && !revealed;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? <AppText variant="caption" color={theme.inkMuted}>{label}</AppText> : null}

      <View
        style={[
          brutalistInput(theme, focused),
          !editable && { opacity: 0.6 },
          error ? { borderColor: theme.danger } : null,
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 0,
          },
        ]}
      >
        {icon ? (
          <MaterialIcons
            name={icon}
            size={18}
            color={focused ? theme.secondary : theme.inkMuted}
            style={{ marginRight: 8 }}
          />
        ) : null}

        <TextInput
          {...rest}
          editable={editable}
          secureTextEntry={isSecure}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          placeholderTextColor={theme.inkMuted}
          style={[
            styles.input,
            {
              color: theme.ink,
              fontFamily: Fonts.body,
              minHeight: rest.multiline ? 88 : 46,
              textAlignVertical: rest.multiline ? 'top' : 'center',
              paddingVertical: rest.multiline ? 12 : 0,
            },
          ]}
        />

        {secureToggle && secureTextEntry ? (
          <MaterialIcons
            name={revealed ? 'visibility-off' : 'visibility'}
            size={20}
            color={theme.inkMuted}
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Sembunyikan password' : 'Tampilkan password'}
          />
        ) : null}
      </View>

      {error ? (
        <AppText variant="caption" color={theme.danger} style={{ textTransform: 'none', letterSpacing: 0.2 }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});

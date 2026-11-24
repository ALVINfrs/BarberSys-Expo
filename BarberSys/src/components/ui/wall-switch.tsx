import React, { useEffect } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeMode } from '@/lib/theme-preference';
import { AppText } from './text';

export interface WallSwitchProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  style?: StyleProp<ViewStyle>;
}

/** Sakelar lampu rumah: rocker miring -12° (terang) / +12° (gelap). */
export function WallSwitch({ mode, onChange, style }: WallSwitchProps) {
  const { theme } = useAppTheme();
  const reduced = useReducedMotion();
  const target = mode === 'dark' ? 12 : -12;
  const rotation = useSharedValue(target);

  useEffect(() => {
    rotation.value = reduced
      ? target
      : withSpring(target, { damping: 14, stiffness: 180, mass: 0.7 });
  }, [target, reduced, rotation]);

  const rockerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Sakelar tema terang atau gelap"
      accessibilityState={{ checked: mode === 'dark' }}
      onPress={() => onChange(mode === 'dark' ? 'light' : 'dark')}
      style={style}
    >
      <View
        style={{
          width: 148,
          height: 208,
          borderRadius: 26,
          backgroundColor: theme.paper,
          borderWidth: 2,
          borderColor: theme.ink,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: theme.shadow,
          shadowOffset: { width: 5, height: 5 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 5,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 10,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.inkMuted,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.inkMuted,
          }}
        />

        <Animated.View
          style={[
            {
              width: 104,
              height: 142,
              borderRadius: 18,
              backgroundColor: mode === 'dark' ? theme.ink : theme.surfaceContainerHigh,
              borderWidth: 2,
              borderColor: theme.ink,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            },
            rockerStyle,
          ]}
        >
          <MaterialIcons
            name="wb-sunny"
            size={30}
            color={mode === 'dark' ? theme.amber : '#111111'}
          />
          <View
            style={{
              width: 36,
              height: 3,
              borderRadius: 2,
              backgroundColor: mode === 'dark' ? theme.bg : theme.inkMuted,
            }}
          />
          <MaterialIcons
            name="nightlight-round"
            size={28}
            color={mode === 'dark' ? theme.paper : '#111111'}
          />
        </Animated.View>

        <AppText
          variant="caption"
          color={theme.inkMuted}
          style={{ position: 'absolute', bottom: 22 }}
        >
          {mode === 'dark' ? 'GELAP' : 'TERANG'}
        </AppText>
      </View>
    </Pressable>
  );
}

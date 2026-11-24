import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';

export interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Entrance fade + translateY; hanya fade saat reduced motion. */
export function Reveal({ children, delay = 0, style }: RevealProps) {
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={
        reduced
          ? FadeIn.duration(160).delay(delay)
          : FadeInDown.duration(280).delay(delay).springify().damping(17)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}

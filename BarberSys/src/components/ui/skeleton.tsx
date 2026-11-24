import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/context/ThemeContext';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Blok skeleton dengan shimmer halus (statis saat reduced motion). */
export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const { theme } = useAppTheme();
  const reduced = useReducedMotion();
  const shimmer = useSharedValue(0.35);

  useEffect(() => {
    if (reduced) {
      shimmer.value = 0.5;
      return;
    }
    shimmer.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [reduced, shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.surfaceContainerHigh,
          borderWidth: 1,
          borderColor: theme.surfaceContainerHigh,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

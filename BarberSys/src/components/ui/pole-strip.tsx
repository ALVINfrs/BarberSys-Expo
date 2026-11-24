import React, { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/context/ThemeContext';

export interface PoleStripProps {
  height?: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

const STRIPE_WIDTH = 18;
const STRIPE_COUNT = 24;
const LOOP_DISTANCE = STRIPE_WIDTH * 2;

/** Strip barber-pole; animasi translateX loop pelan bila diminta. */
export function PoleStrip({ height = 10, animated = false, style }: PoleStripProps) {
  const { theme } = useAppTheme();
  const reduced = useReducedMotion();
  const offset = useSharedValue(0);
  const colors = [
    theme.stripe.crimson,
    theme.stripe.cream,
    theme.stripe.cobalt,
    theme.stripe.cream,
    theme.stripe.amber,
    theme.stripe.cream,
  ];

  useEffect(() => {
    if (animated && !reduced) {
      offset.value = 0;
      offset.value = withRepeat(
        withTiming(-LOOP_DISTANCE, { duration: 900, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      offset.value = 0;
    }
  }, [animated, reduced, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      style={[
        {
          height,
          overflow: 'hidden',
          backgroundColor: theme.stripe.cream,
          borderTopWidth: 2,
          borderBottomWidth: 2,
          borderColor: theme.ink,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            height,
            width: STRIPE_WIDTH * STRIPE_COUNT,
          },
          animatedStyle,
        ]}
      >
        {Array.from({ length: STRIPE_COUNT }, (_, index) => (
          <View
            key={String(index)}
            style={{
              width: STRIPE_WIDTH,
              height: height + 8,
              marginTop: -4,
              backgroundColor: colors[index % colors.length],
              transform: [{ skewX: '-18deg' }],
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
}

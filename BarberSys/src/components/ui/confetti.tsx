import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/context/ThemeContext';

export interface ConfettiProps {
  active: boolean;
  count?: number;
}

interface Piece {
  left: number;
  drift: number;
  rotate: number;
  size: number;
  colorIndex: number;
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, index) => ({
    left: (index * 37) % 100,
    drift: (index % 2 === 0 ? 1 : -1) * (12 + ((index * 13) % 42)),
    rotate: 180 + ((index * 47) % 360),
    size: 6 + (index % 3) * 2,
    colorIndex: index % 4,
  }));
}

function ConfettiPiece({
  piece,
  progress,
  colors,
}: {
  piece: Piece;
  progress: SharedValue<number>;
  colors: string[];
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: piece.drift * progress.value },
      { translateY: -8 + progress.value * 160 },
      { rotate: `${piece.rotate * progress.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: `${piece.left}%`,
          width: piece.size,
          height: piece.size * 0.6,
          backgroundColor: colors[piece.colorIndex],
          borderRadius: 1,
        },
        animatedStyle,
      ]}
    />
  );
}

/** Confetti tipis untuk momen sukses; hilang total saat reduced motion. */
export function Confetti({ active, count = 14 }: ConfettiProps) {
  const { theme } = useAppTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const pieces = React.useMemo(() => makePieces(count), [count]);
  const colors = [
    theme.stripe.crimson,
    theme.stripe.cobalt,
    theme.stripe.amber,
    theme.stripe.cream,
  ];

  useEffect(() => {
    if (!active || reduced) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 1400,
      easing: Easing.out(Easing.quad),
    });
  }, [active, reduced, progress]);

  if (!active || reduced) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {pieces.map((piece, index) => (
        <ConfettiPiece
          key={String(index)}
          piece={piece}
          progress={progress}
          colors={colors}
        />
      ))}
    </View>
  );
}

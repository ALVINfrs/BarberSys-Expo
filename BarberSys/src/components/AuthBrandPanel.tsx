import React from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { AppText } from '@/components/ui/text';
import { PoleStrip } from '@/components/ui/pole-strip';

export interface AuthBrandPanelProps {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DOTS = Array.from({ length: 60 });

/** Panel brand bersama untuk login & register. */
export function AuthBrandPanel({ compact = false, style }: AuthBrandPanelProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.paper,
          borderWidth: 2,
          borderColor: theme.ink,
          borderRadius: compact ? theme.radius.lg : 20,
          padding: compact ? 16 : 32,
          shadowColor: theme.shadowAccent,
          shadowOffset: { width: compact ? 4 : 7, height: compact ? 4 : 7 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: compact ? 4 : 7,
          overflow: 'hidden',
          justifyContent: 'space-between',
          gap: compact ? 14 : 28,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.dotGrid}>
        {DOTS.map((_, index) => (
          <View
            key={String(index)}
            style={[styles.dot, { backgroundColor: theme.ink, opacity: 0.09 }]}
          />
        ))}
      </View>

      <View style={{ gap: compact ? 6 : 12 }}>
        <Image
          source={require('@/assets/images/barbersys_logo.png')}
          style={{ width: compact ? 32 : 46, height: compact ? 32 : 46 }}
          resizeMode="contain"
        />
        <AppText
          style={{
            fontFamily: Fonts.display,
            fontSize: compact ? 30 : 56,
            lineHeight: compact ? 32 : 58,
            letterSpacing: compact ? -1 : -2,
            color: theme.ink,
          }}
        >
          BARBERSYS
        </AppText>
        <AppText
          variant="body"
          color={theme.inkMuted}
          style={{ fontSize: compact ? 12 : 15, maxWidth: 360 }}
        >
          Antre tanpa nunggu, layanan tanpa ribet. Kursi siap, gaya menanti.
        </AppText>
        <View
          style={{
            alignSelf: 'flex-start',
            borderWidth: 1.5,
            borderColor: theme.ink,
            backgroundColor: theme.accentAmber,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 4,
            transform: [{ rotate: '-2deg' }],
            marginTop: compact ? 2 : 6,
          }}
        >
          <AppText
            variant="caption"
            color="#111111"
            style={{ fontSize: compact ? 9 : 10, letterSpacing: 1.1 }}
          >
            POTONG • CUKUR • STYLING
          </AppText>
        </View>
      </View>

      <PoleStrip height={compact ? 6 : 10} animated />
    </View>
  );
}

const styles = StyleSheet.create({
  dotGrid: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 140,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});

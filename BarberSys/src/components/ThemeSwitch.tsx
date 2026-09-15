import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

interface ThemeSwitchProps {
  size?: 'sm' | 'md';
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ size = 'md' }) => {
  const { isDark, toggleTheme, theme } = useAppTheme();

  const isSmall = size === 'sm';
  const width = isSmall ? 52 : 62;
  const height = isSmall ? 28 : 32;
  const knobSize = isSmall ? 22 : 26;
  const travelDistance = width - knobSize - 6;

  // Animated value for switch knob position: 0 = Light, 1 = Dark
  const animValue = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: isDark ? 1 : 0,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isDark]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, travelDistance],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={toggleTheme}
      style={[
        styles.track,
        {
          width,
          height,
          backgroundColor: isDark ? '#26262B' : '#EBE7E7',
          borderColor: theme.cardBorder,
        },
      ]}
    >
      {/* Background Icon Indicators */}
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="white-balance-sunny"
          size={isSmall ? 13 : 15}
          color={isDark ? '#6E6E72' : '#F5B700'}
          style={{ marginLeft: 5 }}
        />
        <MaterialCommunityIcons
          name="moon-waning-crescent"
          size={isSmall ? 13 : 15}
          color={isDark ? '#FFCB3C' : '#8A8A85'}
          style={{ marginRight: 5 }}
        />
      </View>

      {/* Animated Sliding Knob */}
      <Animated.View
        style={[
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            backgroundColor: isDark ? '#1B1B1F' : '#FFFFFF',
            borderColor: theme.cardBorder,
            transform: [{ translateX }],
          },
        ]}
      >
        <MaterialCommunityIcons
          name={isDark ? 'moon-waning-crescent' : 'white-balance-sunny'}
          size={isSmall ? 12 : 14}
          color={isDark ? '#FFCB3C' : '#F5B700'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 0,
    elevation: 2,
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  knob: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
});

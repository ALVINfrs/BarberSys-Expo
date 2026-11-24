import React, { useEffect } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { pressTab } from '@/lib/tab-bar';
import { AppText } from './text';

export interface BarberTabBarProps {
  state: any;
  descriptors: any;
  emitter: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented?: boolean } | undefined;
  };
  navigateToTab: (routeKey: string) => void;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

interface TabItemProps {
  focused: boolean;
  accent: string;
  foreground: string;
  icon?: React.ReactNode;
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

function TabItem({
  focused,
  accent,
  foreground,
  icon,
  label,
  onPress,
  accessibilityLabel,
}: TabItemProps) {
  const { theme } = useAppTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    const target = focused ? 1 : 0;
    progress.value = reduced
      ? target
      : withSpring(target, { damping: 16, stiffness: 230, mass: 0.6 });
  }, [focused, reduced, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.5 * progress.value }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 2,
      }}
    >
      <Animated.View
        style={[
          {
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            paddingVertical: 6,
            paddingHorizontal: 8,
            borderRadius: 14,
            backgroundColor: focused ? accent : 'transparent',
            minWidth: 44,
          },
          animatedStyle,
        ]}
      >
        {icon}
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: Fonts.bodySemi,
            fontSize: 9.5,
            letterSpacing: 0.3,
            color: focused ? foreground : theme.inkMuted,
          }}
        >
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

/** Tab bar mengambang dengan pil aktif beraksen. */
export function BarberTabBar({ state, descriptors, emitter, navigateToTab, accent, style }: BarberTabBarProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const barAccent = accent ?? theme.primary;
  const foreground =
    barAccent === theme.amber || theme.isDark ? '#111111' : '#FFFFFF';

  const visibleRoutes = state.routes.filter((route: any) => {
    const options = descriptors[route.key]?.options ?? {};
    return options.href !== null && options.tabBarButton !== null;
  });

  return (
    <View
      style={[
        {
          paddingHorizontal: 12,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: 'transparent',
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 6,
          gap: 4,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: theme.ink,
          backgroundColor: theme.surface,
          shadowColor: theme.shadow,
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 4,
        }}
      >
        {visibleRoutes.map((route: any) => {
          const { options } = descriptors[route.key] ?? {};
          const focused = state.routes[state.index]?.key === route.key;
          const label = options?.title ?? route.name;
          const color = focused ? foreground : theme.inkMuted;

          const onPress = () => {
            pressTab({
              focused,
              routeKey: route.key,
              emit: (event) => emitter.emit(event),
              navigateToTab,
            });
          };

          return (
            <TabItem
              key={route.key}
              focused={focused}
              accent={barAccent}
              foreground={foreground}
              label={label}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              icon={
                options?.tabBarIcon
                  ? options.tabBarIcon({ focused, color, size: 20 })
                  : null
              }
            />
          );
        })}
      </View>
    </View>
  );
}

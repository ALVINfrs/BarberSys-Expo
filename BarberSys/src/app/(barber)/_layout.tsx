import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarMetrics } from '@/lib/tab-bar';

export default function BarberLayout() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBar = getTabBarMetrics(insets.bottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 2,
          borderTopColor: theme.cardBorder,
          height: tabBar.height,
          paddingTop: tabBar.paddingTop,
          paddingBottom: tabBar.paddingBottom,
        },
        tabBarActiveTintColor: theme.amber,
        tabBarInactiveTintColor: theme.inkMuted,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Tugas Saya',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="content-cut" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

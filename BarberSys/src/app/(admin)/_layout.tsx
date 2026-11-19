import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarMetrics } from '@/lib/tab-bar';

export default function AdminLayout() {
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
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inkMuted,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      {/* Terkunci sampai Fase 4 (F4.5) — struktur tab ikut Stitch */}
      <Tabs.Screen
        name="ringkasan"
        options={{
          title: 'Ringkasan',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="dashboard" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="treatments"
        options={{
          title: 'Treatment',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="content-cut" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produk',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="inventory-2" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Pegawai',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="people-outline" size={22} color={color} />
          ),
        }}
      />
      {/* Terkunci sampai Fase 4 (F4.4) */}
      <Tabs.Screen
        name="laporan"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="analytics" size={22} color={color} />
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

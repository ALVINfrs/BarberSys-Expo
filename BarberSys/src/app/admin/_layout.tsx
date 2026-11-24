import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { BarberTabBar } from '@/components/ui/barber-tab-bar';
import { useRoleGuard } from '@/hooks/use-role-guard';

export default function AdminLayout() {
  const { theme } = useAppTheme();
  const allowed = useRoleGuard('admin');

  if (!allowed) return null;

  return (
    <Tabs
      tabBar={(props) => <BarberTabBar {...props} accent={theme.primary} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Terkunci sampai Fase 4 (F4.5) — struktur tab ikut Stitch */}
      <Tabs.Screen
        name="ringkasan"
        options={{
          title: 'Ringkasan',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="dashboard" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="treatments"
        options={{
          title: 'Treatment',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="content-cut" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produk',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="inventory-2" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Pegawai',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="people-outline" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      {/* Terkunci sampai Fase 4 (F4.4) */}
      <Tabs.Screen
        name="laporan"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="analytics" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person-outline" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      {/* Rating & Komentar dibuka dari Ringkasan/Laporan, bukan tab tambahan */}
      <Tabs.Screen name="rating" options={{ href: null }} />
    </Tabs>
  );
}

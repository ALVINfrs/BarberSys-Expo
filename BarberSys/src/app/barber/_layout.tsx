import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { BarberTabBar } from '@/components/ui/barber-tab-bar';
import { useRoleGuard } from '@/hooks/use-role-guard';

export default function BarberLayout() {
  const { theme } = useAppTheme();
  const allowed = useRoleGuard('barber');

  if (!allowed) return null;

  return (
    <Tabs
      tabBar={(props) => <BarberTabBar {...props} accent={theme.amber} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Tugas Saya',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="content-cut" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="riwayat"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="history" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="performansi"
        options={{
          title: 'Performa',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="bar-chart" size={22} color={typeof color === 'string' ? color : theme.ink} />
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
    </Tabs>
  );
}

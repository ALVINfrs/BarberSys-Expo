import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { BarberTabBar } from '@/components/ui/barber-tab-bar';

export const unstable_settings = {
  initialRouteName: 'queue',
};

export default function KasirTabsLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      tabBar={(props) => <BarberTabBar {...props} accent={theme.secondary} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Antrian Masuk',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="format-list-bulleted" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="payment"
        options={{
          title: 'Pembayaran',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="point-of-sale" size={22} color={typeof color === 'string' ? color : theme.ink} />
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

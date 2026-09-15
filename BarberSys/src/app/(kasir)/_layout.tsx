import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

export default function KasirLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 2,
          borderTopColor: theme.cardBorder,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.secondary,
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
          title: 'Antrian Masuk',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="format-list-bulleted" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="call"
        options={{
          title: 'Panggil',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="campaign" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payment"
        options={{
          title: 'Pembayaran',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="point-of-sale" size={22} color={color} />
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

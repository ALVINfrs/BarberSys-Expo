import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

export default function CustomerLayout() {
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
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inkMuted,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Treatment',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="content-cut" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="queue/new"
        options={{
          title: 'Ambil Antrian',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="queue/status"
        options={{
          title: 'Status',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="hourglass-top" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

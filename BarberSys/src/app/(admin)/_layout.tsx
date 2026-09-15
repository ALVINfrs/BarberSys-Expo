import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

export default function AdminLayout() {
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
        name="treatments"
        options={{
          title: 'Treatment',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="content-cut" size={22} color={color} />
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

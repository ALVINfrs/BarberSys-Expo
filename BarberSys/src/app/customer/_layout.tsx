import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { BarberTabBar } from '@/components/ui/barber-tab-bar';
import { useQueueNotifications } from '@/hooks/useQueueNotifications';
import { useRoleGuard } from '@/hooks/use-role-guard';

export default function CustomerLayout() {
  const { theme } = useAppTheme();
  const allowed = useRoleGuard('customer');
  useQueueNotifications();

  if (!allowed) return null;

  return (
    <Tabs
      tabBar={(props) => <BarberTabBar {...props} accent={theme.primary} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Treatment',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="content-cut" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="queue/new"
        options={{
          title: 'Ambil Antrian',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle-outline" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="queue/status"
        options={{
          title: 'Status',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="hourglass-top" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person-outline" size={22} color={typeof color === 'string' ? color : theme.ink} />
          ),
        }}
      />
    </Tabs>
  );
}

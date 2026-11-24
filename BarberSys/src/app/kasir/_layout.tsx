import React from 'react';
import { Stack } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useRoleGuard } from '@/hooks/use-role-guard';

// Expo Router 58: tab dengan `href: null` yang difokuskan otomatis di-redirect ke
// tab pertama. Karena itu layar detail seperti `call` harus berada di Stack,
// bukan di dalam navigator Tabs.
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function KasirLayout() {
  const { theme } = useAppTheme();
  const allowed = useRoleGuard('kasir');

  if (!allowed) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="call" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

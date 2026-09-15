import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import '../global.css';

function MainLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(kasir)" />
      <Stack.Screen name="(barber)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

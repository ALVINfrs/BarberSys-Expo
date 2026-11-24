import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { fontAssets } from '@/constants/fonts';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash sudah tersembunyi / tidak tersedia (mis. web) — aman diabaikan.
});

function MainLayout() {
  const { theme, isDark } = useAppTheme();
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        // Tidak ada splash aktif — aman diabaikan.
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="display" />
        <Stack.Screen name="pengaturan/tampilan" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="scan-qris" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="customer" />
        <Stack.Screen name="kasir" />
        <Stack.Screen name="barber" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="admin-rating" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
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

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';

export default function SplashScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { session, profile, loading, error } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!session || !profile) {
      router.replace('/(auth)/login' as any);
      return;
    }

    if (profile.status_akun === 'nonaktif') {
      router.replace('/(auth)/login' as any);
      return;
    }

    // Role-based router (PRD 13.1.1)
    switch (profile.role) {
      case 'customer':
        router.replace('/customer/home' as any);
        break;
      case 'kasir':
        router.replace('/kasir/queue' as any);
        break;
      case 'barber':
        router.replace('/barber/queue' as any);
        break;
      case 'admin':
        router.replace('/admin/treatments' as any);
        break;
      default:
        router.replace('/(auth)/login' as any);
        break;
    }
  }, [loading, session, profile]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder, shadowColor: theme.cardShadow }]}>
        <Text style={[styles.logoText, { color: theme.ink }]}>BARBERSYS</Text>
        <Text style={[styles.tagline, { color: theme.inkMuted }]}>
          Antre tanpa nunggu, layanan tanpa ribet.
        </Text>

        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />

        {error ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 32,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    elevation: 4,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

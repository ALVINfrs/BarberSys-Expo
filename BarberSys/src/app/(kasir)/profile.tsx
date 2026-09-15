import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';

export default function KasirProfileScreen() {
  const { theme } = useAppTheme();
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      router.replace('/(auth)/login' as any);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Profil Kasir" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.card, brutalistCard(theme as any)]}>
          <Text style={[styles.cardTitle, { color: theme.ink }]}>{profile?.nama || 'Staf Kasir'}</Text>
          <Text style={[styles.infoText, { color: theme.inkMuted }]}>Email: {profile?.email}</Text>
          <Text style={[styles.infoText, { color: theme.inkMuted }]}>Role: {profile?.role}</Text>

          <TouchableOpacity
            style={[brutalistButton(theme as any, 'danger'), { marginTop: 20 }]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>KELUAR DARI AKUN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16 },
  card: { padding: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  infoText: { fontSize: 14, marginBottom: 6, fontWeight: '500' },
  logoutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

// Placeholder terkunci — Dashboard Ringkasan Admin dibuka di Fase 4 (F4.5).
export default function AdminRingkasanLockedScreen() {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Ringkasan" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.card, brutalistCard(theme as any)]}>
          <Text style={[styles.emoji]}>🔒</Text>
          <Text style={[styles.title, { color: theme.ink }]}>Segera Hadir</Text>
          <Text style={[styles.sub, { color: theme.inkMuted }]}>
            Dashboard Ringkasan (Omset, Tiket Selesai, Kepuasan, Barber Aktif) dibuka di Fase 4.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16 },
  card: { padding: 28, alignItems: 'center' },
  emoji: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: 4, textAlign: 'center', lineHeight: 20 },
});

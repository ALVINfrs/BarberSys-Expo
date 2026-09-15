import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Treatment } from '@/types/database';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

export default function CustomerHomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTreatments = async () => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('treatments')
        .select('*')
        .eq('aktif', true)
        .order('harga', { ascending: true });

      if (err) throw err;
      setTreatments((data as Treatment[]) || []);
    } catch (e: any) {
      console.error('Error fetching treatments:', e);
      setError('Gagal memuat daftar treatment. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTreatments();
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const handleSelectTreatment = (treatment: Treatment) => {
    router.push({
      pathname: '/(customer)/queue/new' as any,
      params: { selectedTreatmentId: treatment.id },
    });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Daftar Layanan" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.introBox}>
          <Text style={[styles.heading, { color: theme.ink }]}>Pilih Layanan Perawatan</Text>
          <Text style={[styles.subheading, { color: theme.inkMuted }]}>
            Pilih layanan yang Anda inginkan untuk langsung mengambil nomor antrian.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat treatment...</Text>
          </View>
        ) : error ? (
          <View style={[styles.errorCard, brutalistCard(theme as any)]}>
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            <TouchableOpacity
              style={[brutalistButton(theme as any, 'primary'), { marginTop: 12 }]}
              onPress={fetchTreatments}
            >
              <Text style={styles.btnText}>COBA LAGI</Text>
            </TouchableOpacity>
          </View>
        ) : treatments.length === 0 ? (
          <View style={[styles.emptyCard, brutalistCard(theme as any)]}>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Belum Ada Treatment Available</Text>
            <Text style={[styles.emptySub, { color: theme.inkMuted }]}>
              Saat ini belum ada data treatment aktif dari barbershop.
            </Text>
          </View>
        ) : (
          <View style={styles.treatmentList}>
            {treatments.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.card, brutalistCard(theme as any)]}
                activeOpacity={0.85}
                onPress={() => handleSelectTreatment(t)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.treatmentTitle, { color: theme.ink }]}>{t.nama}</Text>
                  <Text style={[styles.treatmentPrice, { color: theme.primary }]}>
                    {formatRupiah(t.harga)}
                  </Text>
                </View>

                {t.deskripsi ? (
                  <Text style={[styles.treatmentDesc, { color: theme.inkMuted }]}>
                    {t.deskripsi}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={[styles.badge, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.badgeText, { color: theme.ink }]}>⏱ {t.durasi_menit} Menit</Text>
                  </View>

                  <Text style={[styles.actionHint, { color: theme.secondary }]}>
                    Pilih Layanan Ini ➔
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  introBox: { marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: '800' },
  subheading: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  errorCard: { padding: 20, alignItems: 'center' },
  errorText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  treatmentList: { gap: 14 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  treatmentTitle: { fontSize: 18, fontWeight: '800', flex: 1, marginRight: 8 },
  treatmentPrice: { fontSize: 18, fontWeight: '800' },
  treatmentDesc: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  badge: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  actionHint: { fontSize: 13, fontWeight: '800' },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
});

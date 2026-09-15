import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

interface QueueDetail extends QueueItem {
  customer: Profile | null;
  treatments: Treatment | null;
  barber: Profile | null;
}

export default function KasirCallScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ queueId?: string }>();
  const { user } = useAuth();

  const [queueDetail, setQueueDetail] = useState<QueueDetail | null>(null);
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!params.queueId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch queue detail
      const { data: qData, error: qErr } = await supabase
        .from('queue')
        .select('*, customer:profiles!queue_user_id_fkey(*), treatments(*), barber:profiles!queue_barber_id_fkey(*)')
        .eq('id', params.queueId)
        .single();

      if (qErr) throw qErr;

      const detail = qData as unknown as QueueDetail;
      setQueueDetail(detail);

      if (detail.barber_id) {
        setSelectedBarberId(detail.barber_id);
      }

      // 2. Fetch active barbers
      const { data: barbData, error: barbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'barber')
        .eq('status_akun', 'aktif');

      if (barbErr) throw barbErr;

      const barbList = (barbData as Profile[]) || [];
      setBarbers(barbList);

      // Default to first available barber if non pre-selected
      if (!detail.barber_id && barbList.length > 0) {
        setSelectedBarberId(barbList[0].id);
      }
    } catch (e: any) {
      console.error('Error loading call screen data:', e);
      setErrorMessage(e.message || 'Gagal memuat detail antrian.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.queueId]);

  const handleConfirmCall = async () => {
    if (!queueDetail || !selectedBarberId || !user) {
      setErrorMessage('Pilih barber tujuan terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error: updateErr } = await supabase
        .from('queue')
        .update({
          status: 'dipanggil',
          barber_id: selectedBarberId,
          kasir_id: user.id,
          called_at: new Date().toISOString(),
        })
        .eq('id', queueDetail.id);

      if (updateErr) throw updateErr;

      // Navigate back to Kasir Dashboard
      router.replace('/(kasir)/queue' as any);
    } catch (e: any) {
      console.error('Error calling queue:', e);
      setErrorMessage(e.message || 'Gagal memanggil antrian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Panggil Antrian" />

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.secondary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat detail...</Text>
          </View>
        ) : !queueDetail ? (
          <View style={[styles.card, brutalistCard(theme as any)]}>
            <Text style={[styles.errorText, { color: theme.danger }]}>
              Antrian tidak ditemukan atau ID tidak valid.
            </Text>
            <TouchableOpacity
              style={[brutalistButton(theme as any, 'secondary'), { marginTop: 12 }]}
              onPress={() => router.replace('/(kasir)/queue' as any)}
            >
              <Text style={{ fontWeight: '700' }}>KEMBALI KE DASHBOARD</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Ticket Info */}
            <View style={[styles.card, brutalistCard(theme as any)]}>
              <View style={styles.headerRow}>
                <Text style={[styles.numText, Typography.monoLg, { color: theme.ink }]}>
                  No. {queueDetail.nomor_antrian}
                </Text>
                <View style={[styles.badge, { backgroundColor: theme.info }]}>
                  <Text style={styles.badgeText}>MENUNGGU DIPANGGIL</Text>
                </View>
              </View>

              <Text style={[styles.custName, { color: theme.ink }]}>
                👤 {queueDetail.customer?.nama || 'Pelanggan'}
              </Text>
              <Text style={[styles.treatmentText, { color: theme.inkMuted }]}>
                ✂️ {queueDetail.treatments?.nama} ({queueDetail.treatments?.durasi_menit} mnt) - Rp{' '}
                {queueDetail.treatments?.harga.toLocaleString('id-ID')}
              </Text>
            </View>

            {/* Select Barber */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.ink }]}>
                Tugaskan Ke Barber Mana?
              </Text>

              {barbers.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.danger }]}>
                  Tidak ada barber aktif di database. Harap buat akun barber di menu Admin.
                </Text>
              ) : (
                barbers.map((b) => {
                  const isSelected = selectedBarberId === b.id;
                  const isRest = b.status_kerja === 'istirahat';
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.barberItem,
                        brutalistCard(theme as any),
                        isSelected && { borderColor: theme.secondary, borderWidth: 3 },
                        isRest && { opacity: 0.5 },
                      ]}
                      onPress={() => setSelectedBarberId(b.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.barberRow}>
                        <Text style={[styles.barberName, { color: theme.ink }]}>💈 {b.nama}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: isRest ? theme.neutral : theme.success },
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {isRest ? 'Istirahat' : 'Tersedia'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Error message */}
            {errorMessage ? (
              <View style={[styles.errorContainer, { borderColor: theme.danger }]}>
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Confirm Call Button */}
            <TouchableOpacity
              style={[
                brutalistButton(theme as any, 'primary'),
                styles.confirmBtn,
                { backgroundColor: theme.secondary, opacity: selectedBarberId && !submitting ? 1 : 0.6 },
              ]}
              onPress={handleConfirmCall}
              disabled={!selectedBarberId || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>📢 KONFIRMASI PANGGIL SEKARANG</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  card: { padding: 16, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  numText: { fontSize: 28, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  custName: { fontSize: 18, fontWeight: '800' },
  treatmentText: { fontSize: 14, marginTop: 4, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  barberItem: { padding: 14, marginBottom: 8 },
  barberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barberName: { fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  errorContainer: { borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 8, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '600' },
  confirmBtn: { paddingVertical: 14 },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
});

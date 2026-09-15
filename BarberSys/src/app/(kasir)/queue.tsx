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
import { QueueItem, Treatment, Profile } from '@/types/database';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

interface KasirQueueItem extends QueueItem {
  customer: Profile | null;
  treatments: Treatment | null;
  barber: Profile | null;
}

export default function KasirQueueDashboard() {
  const { theme } = useAppTheme();
  const router = useRouter();

  const [queueList, setQueueList] = useState<KasirQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('queue')
        .select('*, customer:profiles!queue_user_id_fkey(*), treatments(*), barber:profiles!queue_barber_id_fkey(*)')
        .eq('status', 'menunggu')
        .order('nomor_antrian', { ascending: true });

      if (error) {
        console.error('Error fetching kasir queue:', error.message);
      } else {
        setQueueList((data as unknown as KasirQueueItem[]) || []);
      }
    } catch (e) {
      console.error('Exception fetching queue:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Subscribe to realtime changes in queue table
    const channel = supabase
      .channel('kasir-queue-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  const handlePanggil = (queueId: string) => {
    router.push({
      pathname: '/(kasir)/call' as any,
      params: { queueId },
    });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kasir — Antrian Masuk" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.introBox}>
          <Text style={[styles.heading, { color: theme.ink }]}>Daftar Antrian Menunggu</Text>
          <Text style={[styles.subheading, { color: theme.inkMuted }]}>
            Tekan tombol "Panggil" untuk menugaskan barber dan memanggil antrian.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.secondary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat antrian...</Text>
          </View>
        ) : queueList.length === 0 ? (
          <View style={[styles.emptyCard, brutalistCard(theme as any)]}>
            <Text style={[styles.emptyIcon]}>☕</Text>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Tidak Ada Antrian Menunggu</Text>
            <Text style={[styles.emptySub, { color: theme.inkMuted }]}>
              Saat ini belum ada pelanggan yang mengambil nomor antrian baru.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {queueList.map((item) => (
              <View key={item.id} style={[styles.card, brutalistCard(theme as any)]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.numBadge, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.numText, Typography.monoSm, { color: theme.ink }]}>
                      No. {item.nomor_antrian}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: theme.neutral }]}>
                    <Text style={styles.statusBadgeText}>MENUNGGU</Text>
                  </View>
                </View>

                <Text style={[styles.custName, { color: theme.ink }]}>
                  👤 {item.customer?.nama || 'Pelanggan Walk-in'}
                </Text>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Layanan:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {item.treatments?.nama || 'Treatment'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Request Barber:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {item.barber?.nama || 'Siapa saja (Bebas)'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'primary'), styles.callBtn, { backgroundColor: theme.secondary }]}
                  onPress={() => handlePanggil(item.id)}
                >
                  <Text style={styles.callBtnText}>PANGGIL ANTRIAN ➔</Text>
                </TouchableOpacity>
              </View>
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
  heading: { fontSize: 20, fontWeight: '800' },
  subheading: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  emptyCard: { padding: 28, alignItems: 'center' },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  list: { gap: 14 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  numBadge: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  numText: { fontSize: 16, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  custName: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 13 },
  infoVal: { fontSize: 13, fontWeight: '700' },
  callBtn: { marginTop: 14, paddingVertical: 12 },
  callBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

interface HistoryItem extends QueueItem {
  treatments: Treatment | null;
  barber: Profile | null;
}

export default function CustomerHistoryScreen() {
  const { theme } = useAppTheme();
  const { user } = useAuth();

  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('queue')
        .select('*, treatments(*), barber:profiles!queue_barber_id_fkey(*)')
        .eq('user_id', user.id)
        .eq('status', 'lunas')
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error.message);
      } else {
        setHistoryList((data as unknown as HistoryItem[]) || []);
      }
    } catch (e) {
      console.error('Exception fetching history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Riwayat Transaksi" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat riwayat...</Text>
          </View>
        ) : historyList.length === 0 ? (
          <View style={[styles.emptyCard, brutalistCard(theme as any)]}>
            <Text style={[styles.emptyIcon]}>📜</Text>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Belum Ada Riwayat Transaksi</Text>
            <Text style={[styles.emptySub, { color: theme.inkMuted }]}>
              Transaksi yang telah selesai dan dilunasi akan tercatat di halaman ini.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {historyList.map((item) => (
              <View key={item.id} style={[styles.card, brutalistCard(theme as any)]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.dateText, { color: theme.inkMuted }]}>
                    {formatDate(item.completed_at || item.created_at)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: theme.success }]}>
                    <Text style={styles.statusBadgeText}>LUNAS</Text>
                  </View>
                </View>

                <Text style={[styles.treatmentTitle, { color: theme.ink }]}>
                  {item.treatments?.nama || 'Layanan Barbershop'}
                </Text>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Barber:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {item.barber?.nama || 'Barber Toko'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Metode Bayar:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {(item.metode_bayar || 'tunai').toUpperCase()}
                  </Text>
                </View>

                <View style={[styles.totalRow, { borderTopColor: theme.cardBorder }]}>
                  <Text style={[styles.totalLabel, { color: theme.ink }]}>Total Pembayaran</Text>
                  <Text style={[styles.totalVal, { color: theme.primary }]}>
                    {formatRupiah(item.treatments?.harga || 0)}
                  </Text>
                </View>
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
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  emptyCard: { padding: 28, alignItems: 'center' },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center', lineHeight: 20 },
  list: { gap: 14 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  treatmentTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 13 },
  infoVal: { fontSize: 13, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  totalLabel: { fontSize: 14, fontWeight: '800' },
  totalVal: { fontSize: 16, fontWeight: '800' },
});

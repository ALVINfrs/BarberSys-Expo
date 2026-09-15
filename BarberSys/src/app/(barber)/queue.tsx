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
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

interface BarberQueueItem extends QueueItem {
  customer: Profile | null;
  treatments: Treatment | null;
}

export default function BarberQueueScreen() {
  const { theme } = useAppTheme();
  const { user } = useAuth();

  const [queueList, setQueueList] = useState<BarberQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAssignedQueue = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('queue')
        .select('*, customer:profiles!queue_user_id_fkey(*), treatments(*)')
        .eq('barber_id', user.id)
        .in('status', ['dipanggil', 'dilayani'])
        .order('called_at', { ascending: true });

      if (error) {
        console.error('Error fetching barber queue:', error.message);
      } else {
        setQueueList((data as unknown as BarberQueueItem[]) || []);
      }
    } catch (e) {
      console.error('Exception fetching barber queue:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignedQueue();

    if (!user) return;

    // Realtime listener for barber's queue
    const channel = supabase
      .channel('barber-queue-assigned')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          fetchAssignedQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignedQueue();
  };

  const handleMulaiLayanan = async (queueId: string) => {
    setUpdatingId(queueId);
    try {
      const { error } = await supabase
        .from('queue')
        .update({ status: 'dilayani' })
        .eq('id', queueId);

      if (error) throw error;
      fetchAssignedQueue();
    } catch (e: any) {
      console.error('Error starting service:', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSelesaiLayanan = async (queueId: string) => {
    setUpdatingId(queueId);
    try {
      const { error } = await supabase
        .from('queue')
        .update({ status: 'selesai' })
        .eq('id', queueId);

      if (error) throw error;
      fetchAssignedQueue();
    } catch (e: any) {
      console.error('Error completing service:', e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Tugas Barber" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.introBox}>
          <Text style={[styles.heading, { color: theme.ink }]}>Antrian Ditugaskan</Text>
          <Text style={[styles.subheading, { color: theme.inkMuted }]}>
            Kelola antrian pelanggan yang ditugaskan ke Anda.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.amber} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat tugas...</Text>
          </View>
        ) : queueList.length === 0 ? (
          <View style={[styles.emptyCard, brutalistCard(theme as any)]}>
            <Text style={[styles.emptyIcon]}>✂️</Text>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Tidak Ada Tugas Aktif</Text>
            <Text style={[styles.emptySub, { color: theme.inkMuted }]}>
              Saat ini tidak ada antrian pelanggan yang dipanggil untuk Anda.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {queueList.map((item) => {
              const isDipanggil = item.status === 'dipanggil';
              const isDilayani = item.status === 'dilayani';
              const isUpdating = updatingId === item.id;

              return (
                <View key={item.id} style={[styles.card, brutalistCard(theme as any)]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.numText, Typography.monoSm, { color: theme.ink }]}>
                      No. {item.nomor_antrian}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isDipanggil ? theme.info : theme.amber },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {isDipanggil ? 'DIPANGGIL' : 'SEDANG DILAYANI'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.custName, { color: theme.ink }]}>
                    👤 {item.customer?.nama || 'Pelanggan'}
                  </Text>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Layanan:</Text>
                    <Text style={[styles.infoVal, { color: theme.ink }]}>
                      {item.treatments?.nama} ({item.treatments?.durasi_menit} mnt)
                    </Text>
                  </View>

                  {/* Dynamic Action Buttons */}
                  {isDipanggil ? (
                    <TouchableOpacity
                      style={[brutalistButton(theme as any, 'primary'), styles.actionBtn, { backgroundColor: theme.amber }]}
                      onPress={() => handleMulaiLayanan(item.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.actionBtnText}>▶️ MULAI LAYANAN</Text>
                      )}
                    </TouchableOpacity>
                  ) : isDilayani ? (
                    <TouchableOpacity
                      style={[
                        brutalistButton(theme as any, 'secondary'),
                        styles.actionBtn,
                        { backgroundColor: theme.success },
                      ]}
                      onPress={() => handleSelesaiLayanan(item.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                          ✅ SELESAI LAYANAN
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
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
  numText: { fontSize: 16, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  custName: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 13 },
  infoVal: { fontSize: 13, fontWeight: '700' },
  actionBtn: { marginTop: 14, paddingVertical: 12 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

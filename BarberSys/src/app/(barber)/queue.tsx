import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
  const { user, profile, refreshProfile } = useAuth();

  const [queueList, setQueueList] = useState<BarberQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // F2.2: rating rata-rata barber ini
  const [myRating, setMyRating] = useState<{ avg: number; count: number } | null>(null);
  // F3.1: mode operasional (istirahat manual + tersedia/sibuk on-the-fly)
  const [togglingRest, setTogglingRest] = useState(false);
  // F2.10: ringkasan kerja hari ini
  const [todayCount, setTodayCount] = useState(0);
  const [workTimeLabel, setWorkTimeLabel] = useState('0j 0m');

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

      // F2.2: rating rata-rata diri sendiri
      const { data: rateData } = await supabase.rpc('barber_rating_stats');
      const mine = ((rateData as any[]) || []).find((r) => r.barber_id === user.id);
      setMyRating(mine ? { avg: Number(mine.avg_rating), count: Number(mine.rating_count) } : null);

      // F2.10: ringkasan kerja hari ini (batas hari Asia/Jakarta, PRD 13.2)
      const nowMs = Date.now();
      const jakartaNow = new Date(nowMs + (7 * 60 + new Date().getTimezoneOffset()) * 60000);
      jakartaNow.setHours(0, 0, 0, 0);
      const dayStartIso = new Date(jakartaNow.getTime() - 7 * 60 * 60000).toISOString();

      const { data: todayLunas } = await supabase
        .from('queue')
        .select('id')
        .eq('barber_id', user.id)
        .eq('status', 'lunas')
        .gte('completed_at', dayStartIso);
      setTodayCount((todayLunas as any[])?.length || 0);

      const { data: todayCalled } = await supabase
        .from('queue')
        .select('called_at')
        .eq('barber_id', user.id)
        .not('called_at', 'is', null)
        .gte('called_at', dayStartIso)
        .order('called_at', { ascending: true })
        .limit(1);

      if (todayCalled && (todayCalled as any[]).length > 0) {
        const diffMin = Math.max(
          0,
          Math.floor((nowMs - new Date((todayCalled as any[])[0].called_at).getTime()) / 60000)
        );
        setWorkTimeLabel(`${Math.floor(diffMin / 60)}j ${diffMin % 60}m`);
      } else {
        setWorkTimeLabel('0j 0m');
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

  // F3.1: toggle Istirahat manual (PRD 11.2) — satu-satunya nilai yang disimpan
  const handleToggleIstirahat = async () => {
    if (!user || !profile || togglingRest) return;
    const goingRest = profile.status_kerja !== 'istirahat';
    setTogglingRest(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status_kerja: goingRest ? 'istirahat' : 'aktif' })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile(user.id);
    } catch (e: any) {
      console.error('Error toggling istirahat:', e);
      Alert.alert('Gagal', 'Tidak bisa mengubah mode operasional. Coba lagi.');
    } finally {
      setTogglingRest(false);
    }
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
          <Text style={[styles.ratingLine, { color: theme.amber }]}>
            {myRating ? `⭐ ${myRating.avg.toFixed(1)} · ${myRating.count} ulasan` : '⭐ — · Belum ada ulasan'}
          </Text>
        </View>

        {/* F3.1: Mode operasional — Tersedia/Sibuk dihitung dari antrian (PRD 11.2), Istirahat manual */}
        <TouchableOpacity
          style={[styles.modeRow, brutalistCard(theme as any)]}
          onPress={handleToggleIstirahat}
          disabled={togglingRest}
          activeOpacity={0.7}
        >
          <View style={styles.modeLeft}>
            <Text style={[styles.modeLabel, { color: theme.inkMuted }]}>Mode Operasional</Text>
            <Text style={[styles.modeVal, { color: theme.ink }]}>
              {profile?.status_kerja === 'istirahat'
                ? '⚫ ISTIRAHAT'
                : queueList.some((q) => q.status === 'dilayani')
                  ? '🟡 SIBUK'
                  : '🟢 TERSEDIA / SIAP'}
            </Text>
          </View>
          {togglingRest ? (
            <ActivityIndicator size="small" color={theme.amber} />
          ) : (
            <Text style={[styles.modeToggle, { color: profile?.status_kerja === 'istirahat' ? theme.success : theme.danger }]}>
              {profile?.status_kerja === 'istirahat' ? '▶ AKTIFKAN' : '⏸ ISTIRAHAT'}
            </Text>
          )}
        </TouchableOpacity>

        {/* F2.10: header statistik harian */}
        <View style={styles.statRow}>
          <View style={[styles.statCard, brutalistCard(theme as any)]}>
            <Text style={[styles.statLabel, { color: theme.inkMuted }]}>Hari Ini</Text>
            <Text style={[styles.statVal, { color: theme.ink }]}>{todayCount} Pelanggan</Text>
          </View>
          <View style={[styles.statCard, brutalistCard(theme as any)]}>
            <Text style={[styles.statLabel, { color: theme.inkMuted }]}>Waktu Kerja</Text>
            <Text style={[styles.statVal, { color: theme.ink }]}>{workTimeLabel}</Text>
          </View>
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
                    👤 {item.customer?.nama || (item as any).nama_customer || 'Pelanggan'}
                  </Text>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Layanan:</Text>
                    <Text style={[styles.infoVal, { color: theme.ink }]}>
                      {item.treatments?.nama} ({item.treatments?.durasi_menit} mnt)
                    </Text>
                  </View>

                  {(item as any).kursi_nomor != null ? (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Kursi:</Text>
                      <Text style={[styles.infoVal, { color: theme.primary }]}>Kursi {(item as any).kursi_nomor}</Text>
                    </View>
                  ) : null}

                  {item.instruksi_potongan ? (
                    <View style={[styles.instruksiBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder, borderLeftColor: theme.amber }]}>
                      <Text style={[styles.instruksiLabel, { color: theme.inkMuted }]}>
                        Instruksi Potongan:
                      </Text>
                      <Text style={[styles.instruksiText, { color: theme.ink }]}>
                        {item.instruksi_potongan}
                      </Text>
                    </View>
                  ) : null}

                  {/* Dynamic Action Buttons (Stitch: MULAI = cobalt) */}
                  {isDipanggil ? (
                    <TouchableOpacity
                      style={[brutalistButton(theme as any, 'primary'), styles.actionBtn, { backgroundColor: theme.secondary }]}
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
  ratingLine: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginBottom: 12 },
  modeLeft: { gap: 1 },
  modeLabel: { fontSize: 12, fontWeight: '600' },
  modeVal: { fontSize: 13, fontWeight: '800' },
  modeToggle: { fontSize: 13, fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, padding: 12 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statVal: { fontSize: 16, fontWeight: '800', marginTop: 2 },
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
  instruksiBox: { borderWidth: 1.5, borderLeftWidth: 4, borderRadius: 6, padding: 10, marginTop: 8 },
  instruksiLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  instruksiText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  actionBtn: { marginTop: 14, paddingVertical: 12 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

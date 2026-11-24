import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { startOfDayWIBISO } from '@/lib/waktu';
import { formatQueueNumber } from '@/lib/ticker';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PoleStrip } from '@/components/ui/pole-strip';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';

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
      const dayStartIso = startOfDayWIBISO();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isResting = profile?.status_kerja === 'istirahat';
  const isBusy = queueList.some((q) => q.status === 'dilayani');
  const mode = isResting
    ? { label: 'Istirahat', tone: 'neutral' as const, text: 'Tidak menerima antrian baru' }
    : isBusy
      ? { label: 'Sibuk', tone: 'warning' as const, text: 'Sedang melayani pelanggan' }
      : { label: 'Tersedia', tone: 'success' as const, text: 'Siap menerima antrian' };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Tugas Barber" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Reveal>
          <Card tone="paper" accent="amber" style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Papan Tugas
                </AppText>
                <AppText variant="h1">Antrian ditugaskan</AppText>
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                  Kelola pelanggan yang dipanggil untuk kursi Anda.
                </AppText>
              </View>
              <Badge
                label={myRating ? `★ ${myRating.avg.toFixed(1)}` : '★ —'}
                tone="accent"
              />
            </View>
            <PoleStrip height={6} animated style={{ borderRadius: 3 }} />
            <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.3 }}>
              {myRating ? `${myRating.count} ulasan pelanggan` : 'Belum ada ulasan'}
            </AppText>
          </Card>
        </Reveal>

        {/* F3.1: Mode operasional — Tersedia/Sibuk dihitung dari antrian (PRD 11.2), Istirahat manual */}
        <Reveal delay={50}>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Mode Operasional
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Badge label={mode.label} tone={mode.tone} />
                  <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 12 }}>
                    {mode.text}
                  </AppText>
                </View>
              </View>
              <MaterialIcons
                name={isResting ? 'pause-circle-outline' : isBusy ? 'content-cut' : 'check-circle-outline'}
                size={26}
                color={isResting ? theme.inkMuted : isBusy ? theme.amber : theme.success}
              />
            </View>
            <Button
              label={isResting ? 'Aktifkan Kembali' : 'Mulai Istirahat'}
              icon={isResting ? 'play-arrow' : 'pause'}
              variant={isResting ? 'primary' : 'secondary'}
              onPress={handleToggleIstirahat}
              loading={togglingRest}
              fullWidth
            />
          </Card>
        </Reveal>

        {/* F2.10: header statistik harian */}
        <View style={styles.statRow}>
          <Card style={{ flex: 1, padding: 12, gap: 2 }}>
            <AppText variant="caption" color={theme.inkMuted}>
              Hari Ini
            </AppText>
            <AppText variant="mono" style={{ fontSize: 24 }}>
              {todayCount}
            </AppText>
            <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.2 }}>
              pelanggan lunas
            </AppText>
          </Card>
          <Card style={{ flex: 1, padding: 12, gap: 2 }}>
            <AppText variant="caption" color={theme.inkMuted}>
              Waktu Kerja
            </AppText>
            <AppText variant="mono" style={{ fontSize: 24 }}>
              {workTimeLabel}
            </AppText>
            <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.2 }}>
              sejak panggilan pertama
            </AppText>
          </Card>
        </View>

        {loading ? (
          <View style={{ gap: 14 }}>
            {[0, 1].map((index) => (
              <Card key={String(index)} style={{ gap: 10 }}>
                <Skeleton width="35%" height={14} />
                <Skeleton width="65%" height={20} />
                <Skeleton width="100%" height={14} />
                <Skeleton width="100%" height={44} radius={8} />
              </Card>
            ))}
          </View>
        ) : queueList.length === 0 ? (
          <EmptyState
            icon="event-available"
            title="Tidak Ada Tugas Aktif"
            message="Saat ini tidak ada antrian pelanggan yang dipanggil untuk Anda."
          />
        ) : (
          <View style={styles.list}>
            {queueList.map((item, index) => {
              const isDipanggil = item.status === 'dipanggil';
              const isUpdating = updatingId === item.id;

              return (
                <Reveal key={item.id} delay={Math.min(index * 50, 200)}>
                  <Card accent={isDipanggil ? 'cobalt' : 'amber'} style={{ gap: 10 }}>
                    <View style={styles.cardHeader}>
                      <AppText variant="mono" style={{ fontSize: 18 }}>
                        {formatQueueNumber(item.nomor_antrian)}
                      </AppText>
                      <Badge
                        label={isDipanggil ? 'Dipanggil' : 'Sedang Dilayani'}
                        tone={isDipanggil ? 'info' : 'warning'}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="person-outline" size={17} color={theme.inkMuted} />
                      <AppText variant="h2" style={{ fontSize: 17 }}>
                        {item.customer?.nama || (item as any).nama_customer || 'Pelanggan'}
                      </AppText>
                    </View>

                    <View style={{ gap: 4 }}>
                      <View style={styles.infoRow}>
                        <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                          Layanan
                        </AppText>
                        <AppText variant="body" style={{ fontSize: 13, flex: 1, textAlign: 'right' }}>
                          {item.treatments?.nama} · {item.treatments?.durasi_menit} mnt
                        </AppText>
                      </View>

                      {(item as any).kursi_nomor != null ? (
                        <View style={styles.infoRow}>
                          <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                            Kursi
                          </AppText>
                          <AppText variant="body" color={theme.primary} style={{ fontSize: 13, fontWeight: '700' }}>
                            Kursi {(item as any).kursi_nomor}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    {item.instruksi_potongan ? (
                      <View
                        style={[
                          styles.instruksiBox,
                          {
                            backgroundColor: theme.surfaceContainerLow,
                            borderColor: theme.ink,
                            borderLeftColor: theme.amber,
                          },
                        ]}
                      >
                        <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.3 }}>
                          Instruksi Potongan
                        </AppText>
                        <AppText variant="body" style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>
                          {item.instruksi_potongan}
                        </AppText>
                      </View>
                    ) : null}

                    <Button
                      label={isDipanggil ? 'Mulai Layanan' : 'Selesai Layanan'}
                      icon={isDipanggil ? 'play-arrow' : 'check'}
                      variant={isDipanggil ? 'dark' : 'primary'}
                      onPress={() =>
                        isDipanggil ? handleMulaiLayanan(item.id) : handleSelesaiLayanan(item.id)
                      }
                      loading={isUpdating}
                      fullWidth
                    />
                  </Card>
                </Reveal>
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
  container: { padding: 16, paddingBottom: 32, gap: 16 },
  statRow: { flexDirection: 'row', gap: 12 },
  list: { gap: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  instruksiBox: {
    borderWidth: 1.5,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
});

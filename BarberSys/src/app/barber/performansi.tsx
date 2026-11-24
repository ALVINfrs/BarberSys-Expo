import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { RoleHeader } from '@/components/RoleHeader';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ratingComments,
  summarizePerformansi,
  type PerformansiEntry,
} from '@/lib/barber-performance';
import { dailyRevenue, type DashboardTransaction } from '@/lib/dashboard';
import { addWIBDays, formatWIBDate, formatWIBTime, startOfDayWIBISO } from '@/lib/waktu';

interface PerformansiRow {
  id: string;
  nama_customer: string | null;
  tip_amount: number;
  rating: number | null;
  komentar: string | null;
  completed_at: string | null;
  created_at: string;
  treatments: { harga: number | null; nama: string | null } | null;
  customer: { nama: string | null } | null;
}

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

function StatBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
        {label}
      </AppText>
      <AppText variant="mono" color={color ?? theme.ink} style={{ fontSize: 15 }}>
        {value}
      </AppText>
    </View>
  );
}

export default function BarberPerformansiScreen() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<PerformansiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const startIso = startOfDayWIBISO(addWIBDays(new Date(), -29));
      const { data, error } = await supabase
        .from('queue')
        .select(
          'id, nama_customer, tip_amount, rating, komentar, completed_at, created_at, ' +
            'treatments(harga, nama), customer:profiles!queue_user_id_fkey(nama)'
        )
        .eq('barber_id', user.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', startIso)
        .order('completed_at', { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);

      const rows = (data as unknown as PerformansiRow[]) || [];
      setItems(
        rows.map((row) => ({
          tanggalIso: row.completed_at || row.created_at,
          total: (row.treatments?.harga || 0) + (row.tip_amount || 0),
          tip: row.tip_amount || 0,
          rating: row.rating,
          komentar: row.komentar || null,
          customerNama: row.customer?.nama || row.nama_customer || 'Pelanggan',
        }))
      );
    } catch (e) {
      console.error('Error fetching performansi:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(`barber-performansi-${user?.id || 'anon'}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => fetchData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  const summary = summarizePerformansi(items);
  const comments = ratingComments(items, 5);
  const chartInput: DashboardTransaction[] = items.map((item) => ({
    tanggalIso: item.tanggalIso,
    total: item.total,
    barberId: user?.id || null,
    barberNama: 'Saya',
    tip: item.tip,
    rating: item.rating,
    komentar: item.komentar,
    customerNama: item.customerNama,
  }));
  const revenue = dailyRevenue(chartInput);
  const maxRevenue = Math.max(1, ...revenue.map((d) => d.total));

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Performa Saya" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((index) => (
              <Card key={String(index)} style={{ gap: 8 }}>
                <Skeleton width="40%" height={16} />
                <Skeleton width="80%" height={14} />
              </Card>
            ))}
          </View>
        ) : (
          <>
            <Reveal>
              <Card accent="amber" style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ gap: 2 }}>
                    <AppText variant="caption" color={theme.inkMuted}>
                      Rating Rata-rata
                    </AppText>
                    <AppText variant="display" style={{ fontSize: 30 }}>
                      {summary.avgRating ? `${summary.avgRating.toFixed(1)} / 5` : '—'}
                    </AppText>
                  </View>
                  <Badge label={`${summary.count} LAYANAN`} tone="ink" />
                </View>
                <View style={[styles.statsRow, { borderTopColor: theme.cardBorder }]}>
                  <StatBlock label="Hari Ini" value={String(summary.todayCount)} />
                  <StatBlock label="7 Hari" value={String(summary.weekCount)} color={theme.info} />
                  <StatBlock label="Tip" value={rupiah(summary.tip)} color={theme.success} />
                </View>
                <AppText variant="mono" color={theme.primary} style={{ fontSize: 20 }}>
                  {rupiah(summary.omset)}
                </AppText>
              </Card>
            </Reveal>

            <Reveal>
              <View style={{ gap: 8 }}>
                <AppText variant="h2">Omset 7 Hari</AppText>
                <Card style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110 }}>
                    {revenue.map((day) => (
                      <View key={day.iso} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                        <View
                          style={{
                            width: '80%',
                            height: Math.max(4, (day.total / maxRevenue) * 80),
                            backgroundColor: day.total > 0 ? theme.amber : theme.surfaceContainerHigh,
                            borderWidth: 1.5,
                            borderColor: theme.ink,
                            borderRadius: 3,
                          }}
                        />
                        <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 8 }}>
                          {day.iso.slice(5)}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </Card>
              </View>
            </Reveal>

            <Reveal>
              <View style={{ gap: 8 }}>
                <AppText variant="h2">Komentar Pelanggan</AppText>
                {comments.length === 0 ? (
                  <EmptyState
                    icon="star-border"
                    title="Belum Ada Komentar"
                    message="Ulasan pelanggan akan tampil di sini setelah mereka memberi rating."
                  />
                ) : (
                  comments.map((comment, index) => (
                    <Card key={`${comment.tanggalIso}-${index}`} accent={index % 2 === 0 ? 'amber' : 'cobalt'} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <AppText variant="body" style={{ fontSize: 13 }}>
                          {comment.customerNama}
                        </AppText>
                        <Badge label={`${comment.rating} ★`} tone={comment.rating >= 4 ? 'success' : 'warning'} />
                      </View>
                      <AppText variant="body" style={{ fontSize: 13 }}>
                        “{comment.komentar}”
                      </AppText>
                      <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
                        {formatWIBDate(comment.tanggalIso)} {formatWIBTime(comment.tanggalIso)}
                      </AppText>
                    </Card>
                  ))
                )}
              </View>
            </Reveal>

            <Reveal>
              <View style={{ gap: 8 }}>
                <AppText variant="h2">Aktivitas Terbaru</AppText>
                <Card style={{ gap: 6 }}>
                  {items.length === 0 ? (
                    <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                      Belum ada layanan yang diselesaikan bulan ini.
                    </AppText>
                  ) : (
                    items.slice(0, 5).map((item, index) => (
                      <View key={`${item.tanggalIso}-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <View style={{ flex: 1, gap: 1 }}>
                          <AppText variant="body" style={{ fontSize: 12 }}>
                            {item.customerNama}
                          </AppText>
                          <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
                            {formatWIBDate(item.tanggalIso)} {formatWIBTime(item.tanggalIso)}
                          </AppText>
                        </View>
                        <AppText variant="mono" style={{ fontSize: 13 }}>
                          {rupiah(item.total)}
                        </AppText>
                      </View>
                    ))
                  )}
                </Card>
              </View>
            </Reveal>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="info-outline" size={14} color={theme.inkMuted} />
              <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9, textTransform: 'none' }}>
                Data 30 hari terakhir, hanya layanan yang kamu tangani.
              </AppText>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1.5, paddingTop: 8 },
});

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { useAppTheme } from '@/context/ThemeContext';
import { RoleHeader } from '@/components/RoleHeader';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { formatWIBDate } from '@/lib/waktu';
import { filterRatings, summarizeRatings, type RatingEntry, type RatingSummary } from '@/lib/rating';

type Periode = 'semua' | 'hari' | 'minggu' | 'bulan';

interface RatingRow {
  id: string;
  rating: number | null;
  komentar: string | null;
  nama_customer: string | null;
  tip_amount: number;
  completed_at: string | null;
  created_at: string;
  customer: { nama: string | null } | null;
  barber: { nama: string | null } | null;
  treatments: { nama: string | null } | null;
}

const EMPTY_SUMMARY: RatingSummary = {
  avg: 0,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  denganKomentar: 0,
};

function StarRow({ rating }: { rating: number }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <MaterialIcons
          key={n}
          name={n <= Math.round(rating) ? 'star' : 'star-border'}
          size={15}
          color={n <= Math.round(rating) ? theme.amber : theme.inkMuted}
        />
      ))}
    </View>
  );
}

export default function AdminRatingScreen() {
  const allowed = useRoleGuard('admin');
  const { theme } = useAppTheme();
  const [rows, setRows] = useState<RatingEntry[]>([]);
  const [barbers, setBarbers] = useState<string[]>([]);
  const [periode, setPeriode] = useState<Periode>('semua');
  const [barber, setBarber] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ratings }, { data: barberProfiles }] = await Promise.all([
        supabase
          .from('queue')
          .select(
            'id, rating, komentar, nama_customer, tip_amount, completed_at, created_at, ' +
              'customer:profiles!queue_user_id_fkey(nama), barber:profiles!queue_barber_id_fkey(nama), treatments(nama)'
          )
          .not('rating', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(300),
        supabase.from('profiles').select('nama').eq('role', 'barber').eq('status_akun', 'aktif'),
      ]);

      const list = ((ratings as unknown as RatingRow[]) || []).map((row) => ({
        rating: row.rating || 0,
        komentar: row.komentar || null,
        customerNama: row.customer?.nama || row.nama_customer || 'Pelanggan',
        barberNama: row.barber?.nama || 'Barber Toko',
        treatmentNama: row.treatments?.nama || 'Treatment',
        tanggalIso: row.completed_at || row.created_at,
      }));
      setRows(list);
      setBarbers(
        ((barberProfiles as { nama: string }[] | null) || [])
          .map((b) => b.nama)
          .filter(Boolean)
      );
    } catch (e) {
      console.error('Error fetching rating:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(`admin-rating-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => fetchData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const visible = React.useMemo(() => {
    let filtered = filterRatings(rows, { barber, minRating });
    if (periode !== 'semua') {
      const now = new Date();
      const start = (() => {
        if (periode === 'hari') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (periode === 'minggu') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      })();
      filtered = filtered.filter((item) => new Date(item.tanggalIso) >= start);
    }
    return filtered;
  }, [rows, periode, barber, minRating]);

  const summary = React.useMemo(() => summarizeRatings(visible), [visible]);

  if (!allowed) return null;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Rating & Komentar" />
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
        <Card accent="amber" style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 2 }}>
              <AppText variant="caption" color={theme.inkMuted}>
                Rata-rata Rating
              </AppText>
              <AppText variant="display" style={{ fontSize: 30 }}>
                {summary.avg ? `${summary.avg.toFixed(1)} / 5` : '—'}
              </AppText>
            </View>
            <Badge label={`${summary.count} ULASAN`} tone="ink" />
          </View>
          <View style={{ gap: 4 }}>
            {([5, 4, 3, 2, 1] as const).map((bintang) => (
              <View key={bintang} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppText variant="caption" style={{ width: 26 }}>
                  {bintang}★
                </AppText>
                <View
                  style={{
                    flex: 1,
                    height: 8,
                    backgroundColor: theme.surfaceContainerHigh,
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${summary.count ? (summary.distribution[bintang] / summary.count) * 100 : 0}%`,
                      height: 8,
                      backgroundColor: theme.amber,
                    }}
                  />
                </View>
                <AppText variant="caption" style={{ width: 24, textAlign: 'right' }}>
                  {summary.distribution[bintang]}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={theme.inkMuted}>
            Periode
          </AppText>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {(['semua', 'hari', 'minggu', 'bulan'] as Periode[]).map((p) => (
              <PressableScale
                key={p}
                onPress={() => setPeriode(p)}
                style={[
                  styles.chip,
                  {
                    borderColor: theme.ink,
                    backgroundColor: periode === p ? theme.ink : theme.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  style={{ fontSize: 10, color: periode === p ? theme.bg : theme.ink }}
                >
                  {p === 'semua' ? 'Semua' : p === 'hari' ? '24 Jam' : p === 'minggu' ? '7 Hari' : '30 Hari'}
                </AppText>
              </PressableScale>
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={theme.inkMuted}>
            Barber
          </AppText>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {[null, ...barbers].map((nama) => (
              <PressableScale
                key={nama || 'semua'}
                onPress={() => setBarber(nama)}
                style={[
                  styles.chip,
                  {
                    borderColor: theme.ink,
                    backgroundColor: barber === nama ? theme.ink : theme.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  style={{ fontSize: 10, color: barber === nama ? theme.bg : theme.ink }}
                >
                  {nama || 'Semua'}
                </AppText>
              </PressableScale>
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={theme.inkMuted}>
            Nilai Rating Minimal
          </AppText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[null, 5, 4, 3, 2, 1].map((nilai) => (
              <PressableScale
                key={nilai || 'all'}
                onPress={() => setMinRating(nilai)}
                style={[
                  styles.chip,
                  {
                    borderColor: theme.ink,
                    backgroundColor: minRating === nilai ? theme.ink : theme.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  style={{ fontSize: 10, color: minRating === nilai ? theme.bg : theme.ink }}
                >
                  {nilai ? `${nilai}★+` : 'Semua'}
                </AppText>
              </PressableScale>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((index) => (
              <Card key={String(index)} style={{ gap: 8 }}>
                <Skeleton width="40%" height={16} />
                <Skeleton width="80%" height={14} />
              </Card>
            ))}
          </View>
        ) : visible.length === 0 ? (
          <EmptyState
            icon="star-border"
            title="Belum Ada Rating"
            message="Coba ubah filter atau tunggu pelanggan memberikan ulasan."
            actionLabel="Muat Ulang"
            onAction={() => fetchData()}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {visible.map((item, index) => (
              <Reveal key={`${item.tanggalIso}-${index}`} delay={Math.min(index * 40, 200)}>
                <Card accent={index % 2 === 0 ? 'amber' : 'cobalt'} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <StarRow rating={item.rating} />
                    <Badge label={formatWIBDate(item.tanggalIso)} tone="neutral" />
                  </View>
                  <AppText variant="h2" style={{ fontSize: 16 }}>
                    {item.customerNama}
                  </AppText>
                  <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 12 }}>
                    {item.treatmentNama} · Barber {item.barberNama}
                  </AppText>
                  {item.komentar ? (
                    <View
                      style={{
                        padding: 8,
                        backgroundColor: theme.surfaceContainerLow,
                        borderRadius: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: theme.amber,
                      }}
                    >
                      <AppText variant="body" style={{ fontSize: 13 }}>
                        “{item.komentar}”
                      </AppText>
                    </View>
                  ) : (
                    <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 10 }}>
                      Tanpa komentar
                    </AppText>
                  )}
                </Card>
              </Reveal>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  chip: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
});

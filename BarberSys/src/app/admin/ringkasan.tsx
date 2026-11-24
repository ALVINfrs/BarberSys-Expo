import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { startOfDayWIBISO } from '@/lib/waktu';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PoleStrip } from '@/components/ui/pole-strip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminRingkasanScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toko, setToko] = useState<{ nama_toko: string | null; alamat: string | null } | null>(null);
  const [omset, setOmset] = useState(0);
  const [tiket, setTiket] = useState(0);
  const [kepuasan, setKepuasan] = useState<{ avg: number; count: number } | null>(null);
  const [barberAktif, setBarberAktif] = useState<{ aktif: number; total: number } | null>(null);

  const fetchData = async () => {
    try {
      const dayStartIso = startOfDayWIBISO();
      const { data: shop } = await supabase.from('barbershop_settings').select('nama_toko, alamat').limit(1).single();
      if (shop) setToko(shop as any);

      const { data: lunasQ } = await supabase.from('queue').select('id, tip_amount, treatments(harga)').eq('status', 'lunas').gte('completed_at', dayStartIso);
      const list = (lunasQ as any[]) || [];
      setTiket(list.length);
      let sum = 0;
      if (list.length > 0) {
        const ids = list.map((q) => q.id);
        const { data: qp } = await supabase.from('queue_products').select('queue_id, subtotal').in('queue_id', ids);
        const map: Record<string, number> = {};
        ((qp as any[]) || []).forEach((r) => {
          map[r.queue_id] = (map[r.queue_id] || 0) + (r.subtotal || 0);
        });
        list.forEach((q) => {
          sum += (q.treatments?.harga || 0) + (map[q.id] || 0) + (q.tip_amount || 0);
        });
      }
      setOmset(sum);

      const { data: rateData } = await supabase.rpc('barber_rating_stats');
      if (rateData && (rateData as any[]).length > 0) {
        const all = (rateData as any[]) || [];
        let tot = 0, cnt = 0;
        all.forEach((r) => {
          tot += Number(r.avg_rating) * Number(r.rating_count);
          cnt += Number(r.rating_count);
        });
        setKepuasan(cnt ? { avg: tot / cnt, count: cnt } : null);
      } else {
        const { data: avgData } = await supabase.from('queue').select('rating').not('rating', 'is', null);
        const arr = ((avgData as any[]) || []).map((r) => r.rating);
        if (arr.length) setKepuasan({ avg: arr.reduce((a, b) => a + b, 0) / arr.length, count: arr.length });
        else setKepuasan(null);
      }

      const { data: barbers } = await supabase.from('profiles').select('id, status_kerja, status_akun').eq('role', 'barber').eq('status_akun', 'aktif');
      const total = (barbers as any[])?.length || 0;
      const aktif = (barbers as any[])?.filter((b) => b.status_kerja !== 'istirahat').length || 0;
      setBarberAktif({ aktif, total });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('admin-ringkasan').on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => fetchData()).on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };
  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const stats = [
    {
      label: 'Omset Hari Ini',
      value: fmt(omset),
      sub: `${tiket} tiket lunas`,
      icon: 'trending-up' as const,
      accent: 'crimson' as const,
      color: theme.primary,
    },
    {
      label: 'Tiket Selesai',
      value: String(tiket),
      sub: 'Hari ini',
      icon: 'confirmation-number' as const,
      accent: 'cobalt' as const,
      color: theme.secondary,
    },
    {
      label: 'Kepuasan',
      value: kepuasan ? `${kepuasan.avg.toFixed(1)} / 5.0` : '—',
      sub: kepuasan ? `${kepuasan.count} rating` : 'Belum ada rating',
      icon: 'star' as const,
      accent: 'amber' as const,
      color: theme.amber,
    },
    {
      label: 'Barber Aktif',
      value: barberAktif ? `${barberAktif.aktif} / ${barberAktif.total}` : '—',
      sub: 'Tidak sedang istirahat',
      icon: 'content-cut' as const,
      accent: undefined,
      color: theme.success,
    },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Ringkasan" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Reveal>
          <Card tone="paper" accent="amber" style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Dashboard Hari Ini
                </AppText>
                <AppText variant="h1" style={{ fontSize: 24 }}>
                  {toko?.nama_toko || 'BarberSys'}
                </AppText>
                {toko?.alamat ? (
                  <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 12.5 }}>
                    {toko.alamat}
                  </AppText>
                ) : null}
              </View>
              <Badge label="Live" tone="success" />
            </View>
            <PoleStrip height={6} animated style={{ borderRadius: 3 }} />
          </Card>
        </Reveal>

        {loading ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((index) => (
              <Card key={String(index)} style={{ width: '48%', padding: 14, gap: 8 }}>
                <Skeleton width="55%" height={10} />
                <Skeleton width="80%" height={24} />
                <Skeleton width="60%" height={10} />
              </Card>
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {stats.map((stat, index) => (
              <Reveal key={stat.label} delay={index * 60} style={{ width: '48%' }}>
                <Card accent={stat.accent} style={{ padding: 14, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 10 }}>
                      {stat.label}
                    </AppText>
                    <MaterialIcons name={stat.icon} size={16} color={stat.color} />
                  </View>
                  <AppText variant="mono" color={stat.color} style={{ fontSize: 20 }} numberOfLines={1}>
                    {stat.value}
                  </AppText>
                  <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9.5, letterSpacing: 0.2 }}>
                    {stat.sub}
                  </AppText>
                </Card>
              </Reveal>
            ))}
          </View>
        )}

        <PressableScale
          onPress={() => router.push('/admin/rating' as any)}
          accessibilityRole="button"
          style={[
            styles.linkCard,
            { backgroundColor: theme.surface, borderColor: theme.ink, shadowColor: theme.shadow },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialIcons name="star" size={20} color={theme.amber} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="h2" style={{ fontSize: 15 }}>
                Lihat Rating & Komentar
              </AppText>
              <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
                Ulasan pelanggan per barber
              </AppText>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={theme.ink} />
          </View>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  linkCard: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
});

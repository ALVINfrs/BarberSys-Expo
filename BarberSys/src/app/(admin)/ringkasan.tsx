import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { startOfDayWIBISO } from '@/lib/waktu';

export default function AdminRingkasanScreen() {
  const { theme } = useAppTheme();
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
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };
  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  if (loading) return <View style={[styles.flex, { backgroundColor: theme.bg }]}><RoleHeader title="Ringkasan" /><View style={styles.center}><ActivityIndicator color={theme.primary} /><Text style={{ color: theme.inkMuted, marginTop: 8 }}>Memuat ringkasan...</Text></View></View>;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Ringkasan" />
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {toko ? <View style={[styles.header, brutalistCard(theme as any)]}><Text style={[styles.headerTitle, { color: theme.ink }]}>{toko.nama_toko || 'BarberSys'}</Text><Text style={[styles.headerSub, { color: theme.inkMuted }]}>{toko.alamat || ''}</Text></View> : null}
        <View style={styles.grid}>
          <View style={[styles.card, brutalistCard(theme as any)]}><Text style={[styles.cardLabel, { color: theme.inkMuted }]}>Omset Hari Ini</Text><Text style={[styles.cardVal, { color: theme.ink }]}>{fmt(omset)}</Text><Text style={[styles.cardSub, { color: theme.inkMuted }]}>{tiket} tiket</Text></View>
          <View style={[styles.card, brutalistCard(theme as any)]}><Text style={[styles.cardLabel, { color: theme.inkMuted }]}>Tiket Selesai</Text><Text style={[styles.cardVal, { color: theme.ink }]}>{tiket}</Text><Text style={[styles.cardSub, { color: theme.inkMuted }]}>Hari ini</Text></View>
          <View style={[styles.card, brutalistCard(theme as any)]}><Text style={[styles.cardLabel, { color: theme.inkMuted }]}>Kepuasan</Text><Text style={[styles.cardVal, { color: theme.amber }]}>{kepuasan ? `${kepuasan.avg.toFixed(1)} / 5.0` : '—'}</Text><Text style={[styles.cardSub, { color: theme.inkMuted }]}>{kepuasan ? `${kepuasan.count} rating` : 'Belum ada rating'}</Text></View>
          <View style={[styles.card, brutalistCard(theme as any)]}><Text style={[styles.cardLabel, { color: theme.inkMuted }]}>Barber Aktif</Text><Text style={[styles.cardVal, { color: theme.success }]}>{barberAktif ? `${barberAktif.aktif} / ${barberAktif.total}` : '—'}</Text><Text style={[styles.cardSub, { color: theme.inkMuted }]}>Barber aktif</Text></View>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  header: { padding: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', padding: 14 },
  cardLabel: { fontSize: 11, fontWeight: '700' },
  cardVal: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  cardSub: { fontSize: 11, marginTop: 2 },
});

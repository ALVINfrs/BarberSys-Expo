import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { addWIBDays, formatWIBDate, formatWIBTime, startOfDayWIBISO } from '@/lib/waktu';
import {
  barberPerformance,
  dailyRevenue,
  latestRatings,
  type DashboardTransaction,
} from '@/lib/dashboard';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PoleStrip } from '@/components/ui/pole-strip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';

interface QueueRow {
  id: string;
  nomor_antrian: number;
  status: string;
  tip_amount: number;
  rating: number | null;
  komentar: string | null;
  completed_at: string | null;
  created_at: string;
  barber_id: string | null;
  kursi_nomor: number | null;
  nama_customer: string | null;
  treatments: { harga: number | null; nama: string | null } | null;
  customer: { nama: string | null } | null;
  barber: { nama: string | null } | null;
}

interface LiveQueue {
  id: string;
  nomor_antrian: number;
  status: string;
  kursi_nomor: number | null;
  treatments: { nama: string | null } | null;
  barber: { nama: string | null } | null;
}

const SHORTCUTS = [
  { label: 'Laporan', icon: 'analytics' as const, route: '/admin/laporan' },
  { label: 'Rating', icon: 'star' as const, route: '/admin/rating' },
  { label: 'Pegawai', icon: 'people-outline' as const, route: '/admin/staff' },
  { label: 'Display', icon: 'tv' as const, route: '/display' },
];

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 18,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.accentAmber,
            borderWidth: 1,
            borderColor: theme.ink,
          }}
        />
        <AppText variant="h2">{title}</AppText>
      </View>
      {subtitle ? (
        <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 12 }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

export default function AdminRingkasanScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toko, setToko] = useState<{ nama_toko: string | null; alamat: string | null; jumlah_kursi: number } | null>(null);
  const [omset, setOmset] = useState(0);
  const [tiket, setTiket] = useState(0);
  const [kepuasan, setKepuasan] = useState<{ avg: number; count: number } | null>(null);
  const [barberAktif, setBarberAktif] = useState<{ aktif: number; total: number } | null>(null);
  const [weekly, setWeekly] = useState<DashboardTransaction[]>([]);
  const [liveQueues, setLiveQueues] = useState<LiveQueue[]>([]);

  const fetchData = async () => {
    try {
      const dayStartIso = startOfDayWIBISO();
      const weekStartIso = startOfDayWIBISO(addWIBDays(new Date(), -6));

      const [
        shopRes,
        lunasRes,
        rateRes,
        barbersRes,
        weekRes,
        liveRes,
      ] = await Promise.all([
        supabase.from('barbershop_settings').select('nama_toko, alamat, jumlah_kursi').limit(1).single(),
        supabase.from('queue').select('id, tip_amount, treatments(harga)').eq('status', 'lunas').gte('completed_at', dayStartIso),
        supabase.rpc('barber_rating_stats'),
        supabase.from('profiles').select('id, status_kerja, status_akun').eq('role', 'barber').eq('status_akun', 'aktif'),
        supabase
          .from('queue')
          .select(
            'id, nomor_antrian, status, tip_amount, rating, komentar, completed_at, created_at, ' +
              'barber_id, kursi_nomor, nama_customer, treatments(harga, nama), ' +
              'customer:profiles!queue_user_id_fkey(nama), barber:profiles!queue_barber_id_fkey(nama)'
          )
          .eq('status', 'lunas')
          .gte('completed_at', weekStartIso)
          .order('completed_at', { ascending: false })
          .limit(200),
        supabase
          .from('queue')
          .select('id, nomor_antrian, status, kursi_nomor, treatments(nama), barber:profiles!queue_barber_id_fkey(nama)')
          .in('status', ['menunggu', 'dipanggil', 'dilayani'])
          .order('created_at', { ascending: true }),
      ]);

      if (shopRes.data) setToko(shopRes.data as any);

      const todayList = (lunasRes.data as any[]) || [];
      setTiket(todayList.length);
      let sum = 0;
      if (todayList.length > 0) {
        const { data: qp } = await supabase
          .from('queue_products')
          .select('queue_id, subtotal')
          .in('queue_id', todayList.map((q) => q.id));
        const map: Record<string, number> = {};
        ((qp as any[]) || []).forEach((r) => {
          map[r.queue_id] = (map[r.queue_id] || 0) + (r.subtotal || 0);
        });
        todayList.forEach((q) => {
          sum += (q.treatments?.harga || 0) + (map[q.id] || 0) + (q.tip_amount || 0);
        });
      }
      setOmset(sum);

      const rateData = rateRes.data as any[];
      if (rateData && rateData.length > 0) {
        let tot = 0;
        let cnt = 0;
        rateData.forEach((r) => {
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

      const barbers = (barbersRes.data as any[]) || [];
      setBarberAktif({
        aktif: barbers.filter((b) => b.status_kerja !== 'istirahat').length,
        total: barbers.length,
      });

      const weekRows = (weekRes.data as unknown as QueueRow[]) || [];
      let productMap: Record<string, number> = {};
      if (weekRows.length > 0) {
        const { data: qpWeek } = await supabase
          .from('queue_products')
          .select('queue_id, subtotal')
          .in('queue_id', weekRows.map((q) => q.id));
        productMap = {};
        ((qpWeek as any[]) || []).forEach((r) => {
          productMap[r.queue_id] = (productMap[r.queue_id] || 0) + (r.subtotal || 0);
        });
      }
      setWeekly(
        weekRows.map((q) => ({
          tanggalIso: q.completed_at || q.created_at,
          total: (q.treatments?.harga || 0) + (productMap[q.id] || 0) + (q.tip_amount || 0),
          barberId: q.barber_id,
          barberNama: q.barber?.nama || 'Barber Toko',
          tip: q.tip_amount || 0,
          rating: q.rating,
          komentar: q.komentar || null,
          customerNama: q.customer?.nama || q.nama_customer || 'Pelanggan',
        }))
      );
      setLiveQueues((liveRes.data as unknown as LiveQueue[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const ch = supabase
      .channel(`admin-dashboard-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const stats = [
    { label: 'Omset Hari Ini', value: fmt(omset), sub: `${tiket} tiket lunas`, icon: 'trending-up' as const, accent: 'crimson' as const, color: theme.primary },
    { label: 'Tiket Selesai', value: String(tiket), sub: 'Hari ini', icon: 'confirmation-number' as const, accent: 'cobalt' as const, color: theme.secondary },
    { label: 'Kepuasan', value: kepuasan ? `${kepuasan.avg.toFixed(1)} / 5.0` : '—', sub: kepuasan ? `${kepuasan.count} rating` : 'Belum ada rating', icon: 'star' as const, accent: 'amber' as const, color: theme.amber },
    { label: 'Barber Aktif', value: barberAktif ? `${barberAktif.aktif} / ${barberAktif.total}` : '—', sub: 'Tidak sedang istirahat', icon: 'content-cut' as const, accent: undefined, color: theme.success },
  ];

  const revenue = dailyRevenue(weekly);
  const maxRevenue = Math.max(1, ...revenue.map((d) => d.total));
  const performance = barberPerformance(weekly);
  const latest = latestRatings(weekly, 4);
  const kursiDipakai = liveQueues.filter((q) => q.status === 'dilayani' && q.kursi_nomor != null).length;
  const kursiTotal = toko?.jumlah_kursi || 7;

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

        <Reveal>
          <View style={{ gap: 8 }}>
            <SectionTitle title="Omset 7 Hari Terakhir" subtitle="Total transaksi lunas per hari (WIB)." />
            <Card style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130 }}>
                {revenue.map((day) => {
                  const height = Math.max(4, (day.total / maxRevenue) * 100);
                  return (
                    <View key={day.iso} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 8 }}>
                        {day.total > 0 ? `${Math.round(day.total / 1000)}k` : ''}
                      </AppText>
                      <View
                        style={{
                          width: '80%',
                          height,
                          backgroundColor: day.total > 0 ? theme.primary : theme.surfaceContainerHigh,
                          borderWidth: 1.5,
                          borderColor: theme.ink,
                          borderRadius: 3,
                        }}
                      />
                      <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 8 }}>
                        {day.iso.slice(5)}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </Card>
          </View>
        </Reveal>

        <Reveal>
          <View style={{ gap: 8 }}>
            <SectionTitle title="Performa Barber" subtitle="Omset, tip, dan rating 7 hari terakhir." />
            {performance.length === 0 ? (
              <Card style={{ gap: 4 }}>
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                  Belum ada transaksi lunas minggu ini.
                </AppText>
              </Card>
            ) : (
              performance.map((barber) => (
                <Card key={barber.barberId || barber.nama} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="h2" style={{ fontSize: 16 }}>
                      {barber.nama}
                    </AppText>
                    <Badge label={`${barber.avgRating.toFixed(1)} ★`} tone="accent" />
                  </View>
                  <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 12 }}>
                    {barber.transaksi} pelanggan · Tip {fmt(barber.tip)}
                  </AppText>
                  <AppText variant="mono" color={theme.primary} style={{ fontSize: 16 }}>
                    {fmt(barber.omset)}
                  </AppText>
                </Card>
              ))
            )}
          </View>
        </Reveal>

        <Reveal>
          <View style={{ gap: 8 }}>
            <SectionTitle title="Rating Terbaru" subtitle="Ulasan pelanggan minggu ini." />
            {latest.length === 0 ? (
              <Card style={{ gap: 4 }}>
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                  Belum ada rating minggu ini.
                </AppText>
              </Card>
            ) : (
              latest.map((item, index) => (
                <Card key={`${item.tanggalIso}-${index}`} accent={index % 2 === 0 ? 'amber' : 'cobalt'} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="h2" style={{ fontSize: 15 }}>
                      {item.customerNama}
                    </AppText>
                    <Badge label={`${item.rating ?? 0} / 5`} tone={(item.rating ?? 0) >= 4 ? 'success' : 'warning'} />
                  </View>
                  <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 11 }}>
                    {item.barberNama} · {formatWIBDate(item.tanggalIso)} {formatWIBTime(item.tanggalIso)}
                  </AppText>
                  {item.komentar ? (
                    <AppText variant="body" style={{ fontSize: 13 }}>
                      “{item.komentar}”
                    </AppText>
                  ) : null}
                </Card>
              ))
            )}
          </View>
        </Reveal>

        <Reveal>
          <View style={{ gap: 8 }}>
            <SectionTitle title="Antrian Live & Kursi" subtitle={`${kursiDipakai} dari ${kursiTotal} kursi sedang dipakai.`} />
            <Card style={{ gap: 6 }}>
              {liveQueues.length === 0 ? (
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                  Tidak ada antrian aktif saat ini.
                </AppText>
              ) : (
                liveQueues.slice(0, 6).map((q) => (
                  <View key={q.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText variant="mono" style={{ fontSize: 14 }}>
                      A{String(q.nomor_antrian).padStart(2, '0')}
                    </AppText>
                    <AppText variant="body" style={{ fontSize: 12, flex: 1 }} numberOfLines={1}>
                      {q.treatments?.nama || 'Layanan'} · {q.barber?.nama || 'Barber'}
                    </AppText>
                    <Badge
                      label={q.status.toUpperCase()}
                      tone={q.status === 'dilayani' ? 'success' : q.status === 'dipanggil' ? 'accent' : 'neutral'}
                    />
                  </View>
                ))
              )}
            </Card>
          </View>
        </Reveal>

        <Reveal>
          <View style={{ gap: 8 }}>
            <SectionTitle title="Transaksi Terbaru" subtitle="Lunas minggu ini." />
            <Card style={{ gap: 6 }}>
              {weekly.length === 0 ? (
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                  Belum ada transaksi lunas.
                </AppText>
              ) : (
                weekly.slice(0, 5).map((item, index) => (
                  <View key={`${item.tanggalIso}-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, gap: 1 }}>
                      <AppText variant="body" style={{ fontSize: 12 }}>
                        {item.customerNama} · {item.barberNama}
                      </AppText>
                      <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
                        {formatWIBDate(item.tanggalIso)} {formatWIBTime(item.tanggalIso)}
                      </AppText>
                    </View>
                    <AppText variant="mono" style={{ fontSize: 13 }}>
                      {fmt(item.total)}
                    </AppText>
                  </View>
                ))
              )}
            </Card>
          </View>
        </Reveal>

        <View style={{ gap: 8 }}>
          <SectionTitle title="Pintasan" />
          <View style={styles.grid}>
            {SHORTCUTS.map((item) => (
              <PressableScale
                key={item.label}
                onPress={() => router.push(item.route as any)}
                accessibilityRole="button"
                style={[
                  styles.shortcut,
                  { width: '48%', backgroundColor: theme.surface, borderColor: theme.ink },
                ]}
              >
                <MaterialIcons name={item.icon} size={20} color={theme.primary} />
                <AppText variant="body" style={{ fontSize: 13 }}>
                  {item.label}
                </AppText>
              </PressableScale>
            ))}
          </View>
        </View>

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
  container: { padding: 16, paddingBottom: 32, gap: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  shortcut: { borderWidth: 2, borderRadius: 10, padding: 12, gap: 6 },
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

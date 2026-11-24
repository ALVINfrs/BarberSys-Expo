import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { AppText } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { TipSummaryCard } from '@/components/tip-summary-card';
import { type TipEntry, type TipPeriode } from '@/lib/tip-history';

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
  // F2.5: add-on produk per queue_id + total gabungan
  const [notaItems, setNotaItems] = useState<Record<string, { nama: string; qty: number; subtotal: number }[]>>({});
  const [notaTotals, setNotaTotals] = useState<Record<string, number>>({});
  const [tipPeriode, setTipPeriode] = useState<TipPeriode>('30');

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('queue')
        .select('*, treatments(*), barber:profiles!queue_barber_id_fkey(*)')
        .eq('user_id', user.id)
        .in('status', ['lunas', 'dibatalkan'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error.message);
      } else {
        const list = (data as unknown as HistoryItem[]) || [];
        setHistoryList(list);

        if (list.length > 0) {
          const { data: qpData } = await supabase
            .from('queue_products')
            .select('queue_id, qty, subtotal, products(nama)')
            .in('queue_id', list.map((h) => h.id));

          const itemsMap: Record<string, { nama: string; qty: number; subtotal: number }[]> = {};
          const totalsMap: Record<string, number> = {};
          ((qpData as any[]) || []).forEach((row) => {
            const arr = itemsMap[row.queue_id] || [];
            arr.push({ nama: row.products?.nama || 'Produk', qty: row.qty, subtotal: row.subtotal });
            itemsMap[row.queue_id] = arr;
          });
          list.forEach((h) => {
            const prodSum = (itemsMap[h.id] || []).reduce((s, it) => s + it.subtotal, 0);
            totalsMap[h.id] = (h.treatments?.harga || 0) + prodSum + (h.tip_amount || 0);
          });
          setNotaItems(itemsMap);
          setNotaTotals(totalsMap);
        } else {
          setNotaItems({});
          setNotaTotals({});
        }
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

  const tipEntries = useMemo<TipEntry[]>(
    () =>
      historyList
        .filter((item) => item.status === 'lunas' && (item.tip_amount || 0) > 0)
        .map((item) => ({
          tanggalIso: item.completed_at || item.created_at,
          customerNama: 'Saya',
          barberNama: item.barber?.nama || 'Barber Toko',
          treatmentNama: item.treatments?.nama || 'Layanan',
          jumlah: item.tip_amount || 0,
          nomorAntrian: item.nomor_antrian,
        })),
    [historyList]
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Riwayat Transaksi" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={{ gap: 14 }}>
            {[0, 1, 2].map((index) => (
              <Card key={String(index)} style={{ gap: 10 }}>
                <Skeleton width="45%" height={12} />
                <Skeleton width="70%" height={18} />
                <Skeleton width="100%" height={12} />
                <Skeleton width="60%" height={12} />
              </Card>
            ))}
          </View>
        ) : (
          <>
            <TipSummaryCard
              items={tipEntries}
              periode={tipPeriode}
              onPeriodeChange={setTipPeriode}
              mode="customer"
            />
            {historyList.length === 0 ? (
              <EmptyState
                icon="receipt-long"
                title="Belum ada riwayat"
                message="Transaksi yang telah selesai dan dilunasi akan tercatat di halaman ini."
              />
            ) : (
              <View style={styles.list}>
            {historyList.map((item, index) => (
              <Reveal key={item.id} delay={Math.min(index * 40, 240)}>
                <Card accent={item.status === 'dibatalkan' ? undefined : 'amber'}>
                  <View style={styles.cardHeader}>
                    <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 10 }}>
                      {formatDate(item.completed_at || item.created_at)}
                    </AppText>
                    <Badge
                      label={item.status === 'dibatalkan' ? 'DIBATALKAN' : 'LUNAS'}
                      tone={item.status === 'dibatalkan' ? 'neutral' : 'success'}
                    />
                  </View>

                  <AppText variant="h2" style={{ marginBottom: 10 }}>
                    {item.treatments?.nama || 'Layanan Barbershop'}
                  </AppText>

                  <View style={styles.infoRow}>
                    <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                      Barber
                    </AppText>
                    <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                      {item.barber?.nama || 'Barber Toko'}
                    </AppText>
                  </View>

                  {item.kursi_nomor != null ? (
                    <View style={styles.infoRow}>
                      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                        Kursi
                      </AppText>
                      <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                        Kursi {item.kursi_nomor}
                      </AppText>
                    </View>
                  ) : null}

                  <View style={styles.infoRow}>
                    <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                      Metode Bayar
                    </AppText>
                    <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                      {(item.metode_bayar || 'tunai').toUpperCase()}
                    </AppText>
                  </View>

                  {(notaItems[item.id] || []).map((it, idx) => (
                    <View key={idx} style={styles.infoRow}>
                      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                        {it.nama} × {it.qty}
                      </AppText>
                      <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                        {formatRupiah(it.subtotal)}
                      </AppText>
                    </View>
                  ))}

                  {(item.tip_amount || 0) > 0 ? (
                    <View style={styles.infoRow}>
                      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                        Tip
                      </AppText>
                      <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                        {formatRupiah(item.tip_amount)}
                      </AppText>
                    </View>
                  ) : null}

                  <View style={[styles.totalRow, { borderTopColor: theme.cardBorder }]}>
                    <AppText variant="body" style={{ fontWeight: '700', fontSize: 14 }}>
                      Total Pembayaran
                    </AppText>
                    <AppText variant="mono" color={theme.primary} style={{ fontSize: 16 }}>
                      {formatRupiah(notaTotals[item.id] ?? item.treatments?.harga ?? 0)}
                    </AppText>
                  </View>
                </Card>
              </Reveal>
            ))}
          </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  list: { gap: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});

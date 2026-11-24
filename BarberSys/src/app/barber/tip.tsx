import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { RoleHeader } from '@/components/RoleHeader';
import { TipSummaryCard } from '@/components/tip-summary-card';
import { Skeleton } from '@/components/ui/skeleton';
import { type TipEntry, type TipPeriode } from '@/lib/tip-history';

interface TipRow {
  id: string;
  nomor_antrian: number;
  nama_customer: string | null;
  tip_amount: number;
  completed_at: string | null;
  created_at: string;
  treatments: { nama: string | null } | null;
  customer: { nama: string | null } | null;
}

export default function BarberTipScreen() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<TipEntry[]>([]);
  const [periode, setPeriode] = useState<TipPeriode>('30');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTips = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('queue')
        .select(
          'id, nomor_antrian, nama_customer, tip_amount, completed_at, created_at, ' +
            'treatments(nama), customer:profiles!queue_user_id_fkey(nama)'
        )
        .eq('barber_id', user.id)
        .eq('status', 'lunas')
        .gt('tip_amount', 0)
        .order('completed_at', { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);

      const rows = (data as unknown as TipRow[]) || [];
      setItems(
        rows.map((row) => ({
          tanggalIso: row.completed_at || row.created_at,
          customerNama: row.customer?.nama || row.nama_customer || 'Pelanggan',
          barberNama: 'Saya',
          treatmentNama: row.treatments?.nama || 'Layanan',
          jumlah: row.tip_amount || 0,
          nomorAntrian: row.nomor_antrian,
        }))
      );
    } catch (e) {
      console.error('Error fetching tips:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Tip Saya" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTips();
            }}
          />
        }
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((index) => (
              <Skeleton key={String(index)} width="100%" height={70} radius={10} />
            ))}
          </View>
        ) : (
          <TipSummaryCard
            items={items}
            periode={periode}
            onPeriodeChange={setPeriode}
            mode="barber"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
});

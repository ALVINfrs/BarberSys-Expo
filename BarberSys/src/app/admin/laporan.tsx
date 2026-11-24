import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as XLSX from 'xlsx';
import { writeAsStringAsync, cacheDirectory, EncodingType } from 'expo-file-system/legacy';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { startOfDayWIBISO, startOfMonthWIBISO, startOfWeekWIBISO } from '@/lib/waktu';
import { shareLocalFile, sharePdfFromHtml } from '@/lib/share-pdf';
import { RATING_HREF } from '@/lib/navigation';
import { formatQueueNumber } from '@/lib/ticker';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';

type Filter = 'hari' | 'minggu' | 'bulan';

const FILTER_LABEL: Record<Filter, string> = {
  hari: 'Hari Ini',
  minggu: 'Minggu Ini',
  bulan: 'Bulan Ini',
};

export default function AdminLaporanScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('hari');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const getStartIso = (f: Filter) => {
    if (f === 'minggu') return startOfWeekWIBISO();
    if (f === 'bulan') return startOfMonthWIBISO();
    return startOfDayWIBISO();
  };

  const fetchData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const startIso = getStartIso(filter);
      const { data } = await supabase.from('queue').select('id, nomor_antrian, tip_amount, completed_at, treatments(harga, nama), barber:profiles!queue_barber_id_fkey(nama), customer:profiles!queue_user_id_fkey(nama)').eq('status','lunas').gte('completed_at', startIso).order('completed_at', { ascending: false });
      const list = (data as any[]) || [];
      let sum = 0;
      if (list.length) {
        const ids = list.map((r) => r.id);
        const { data: qp } = await supabase.from('queue_products').select('queue_id, subtotal').in('queue_id', ids);
        const map: Record<string, number> = {};
        ((qp as any[]) || []).forEach((r)=>{ map[r.queue_id]=(map[r.queue_id]||0)+(r.subtotal||0); });
        list.forEach((r)=>{ const t=r.treatments?.harga||0; const p=map[r.id]||0; const tip=r.tip_amount||0; r._total=t+p+tip; sum+=r._total; });
      }
      setRows(list);
      setTotal(sum);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };
  useEffect(()=>{ fetchData(true); const ch=supabase.channel('laporan').on('postgres_changes',{event:'*',schema:'public',table:'queue'},()=>fetchData(false)).subscribe(); return()=>{supabase.removeChannel(ch)}},[filter]);

  const handlePdf = async () => {
    if (rows.length === 0) return;
    try {
      const html = `<html><head><meta charset="utf-8"><style>body{font-family:Helvetica;padding:16px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:6px;font-size:12px} th{background:#111;color:#fff}</style></head><body><h2>Laporan ${filter}</h2><p>Total: Rp ${total.toLocaleString('id-ID')}</p><table><tr><th>No</th><th>Treatment</th><th>Total</th></tr>${rows.map((r)=>`<tr><td>A-${String(r.nomor_antrian).padStart(2,'0')}</td><td>${r.treatments?.nama||'-'}</td><td>Rp ${(r._total||0).toLocaleString('id-ID')}</td></tr>`).join('')}</table></body></html>`;
      await sharePdfFromHtml({
        html,
        fileName: `laporan-${filter}`,
        dialogTitle: 'Bagikan Laporan',
      });
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Tidak bisa membuat PDF.');
    }
  };
  const handleExcel = async () => {
    if (rows.length === 0) return;
    try {
      if (!cacheDirectory) throw new Error('Folder cache tidak tersedia.');
      const wsData = [['No','Treatment','Barber','Total'], ...rows.map((r)=>[ `A-${String(r.nomor_antrian).padStart(2,'0')}`, r.treatments?.nama||'-', r.barber?.nama||'-', r._total||0]), ['','Total', '', total]];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
      const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = `${cacheDirectory}laporan-${filter}-${Date.now()}.xlsx`;
      await writeAsStringAsync(uri, b64, { encoding: EncodingType.Base64 });
      await shareLocalFile(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Bagikan Laporan Excel',
      });
    } catch(e:any){ Alert.alert('Gagal', e.message); }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Laporan" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['hari', 'minggu', 'bulan'] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <PressableScale
                key={f}
                onPress={() => setFilter(f)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    borderColor: theme.ink,
                    backgroundColor: active ? theme.ink : theme.surface,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={active ? theme.bg : theme.ink}
                  style={{ letterSpacing: 0.3 }}
                >
                  {FILTER_LABEL[f]}
                </AppText>
              </PressableScale>
            );
          })}
        </View>

        <Reveal>
          <Card tone="paper" accent="amber" style={{ alignItems: 'center', gap: 2 }}>
            <AppText variant="caption" color={theme.inkMuted}>
              Total {FILTER_LABEL[filter]}
            </AppText>
            <AppText variant="mono" color={theme.primary} style={{ fontSize: 30, lineHeight: 34 }}>
              Rp {total.toLocaleString('id-ID')}
            </AppText>
            <Badge label={`${rows.length} transaksi`} tone="neutral" />
          </Card>
        </Reveal>

        {loading ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2].map((index) => (
              <Card key={String(index)} style={{ gap: 8 }}>
                <Skeleton width="45%" height={14} />
                <Skeleton width="70%" height={12} />
              </Card>
            ))}
          </View>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="receipt-long"
            title="Belum Ada Transaksi"
            message="Laporan akan terisi otomatis setelah ada pembayaran lunas pada periode ini."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {rows.map((r, index) => (
              <Reveal key={r.id} delay={Math.min(index * 35, 210)}>
                <Card style={{ padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <MaterialIcons name="confirmation-number" size={15} color={theme.inkMuted} />
                      <AppText variant="mono" style={{ fontSize: 14 }}>
                        {formatQueueNumber(r.nomor_antrian)}
                      </AppText>
                      <AppText variant="body" style={{ fontSize: 12.5, flexShrink: 1 }} numberOfLines={1}>
                        {r.treatments?.nama || '-'}
                      </AppText>
                    </View>
                    <AppText variant="mono" color={theme.primary} style={{ fontSize: 14 }}>
                      Rp {(r._total || 0).toLocaleString('id-ID')}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.2 }}>
                    {r.barber?.nama || 'Barber Toko'}
                    {r.customer?.nama ? ` · ${r.customer.nama}` : ''}
                  </AppText>
                </Card>
              </Reveal>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <Button
            label="Unduh PDF"
            icon="picture-as-pdf"
            variant="dark"
            onPress={handlePdf}
            disabled={rows.length === 0 || loading}
            style={{ flex: 1 }}
          />
          <Button
            label="Ekspor XLSX"
            icon="table-chart"
            variant="secondary"
            onPress={handleExcel}
            disabled={rows.length === 0 || loading}
            style={{ flex: 1 }}
          />
        </View>

        <PressableScale
          onPress={() => router.push(RATING_HREF as any)}
          accessibilityRole="button"
          style={[styles.ratingLink, { borderColor: theme.ink, backgroundColor: theme.surface }]}
        >
          <MaterialIcons name="star" size={18} color={theme.amber} />
          <AppText variant="body" style={{ fontSize: 13, flex: 1 }}>
            Lihat Rating & Komentar Pelanggan
          </AppText>
          <MaterialIcons name="chevron-right" size={18} color={theme.ink} />
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32, gap: 14 },
  ratingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
  },
  filterChip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
});

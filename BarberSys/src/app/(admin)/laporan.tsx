import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { writeAsStringAsync, cacheDirectory, EncodingType } from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { startOfDayWIBISO, startOfMonthWIBISO, startOfWeekWIBISO } from '@/lib/waktu';

type Filter = 'hari' | 'minggu' | 'bulan';
export default function AdminLaporanScreen() {
  const { theme } = useAppTheme();
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
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri); else Alert.alert('PDF', uri);
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Tidak bisa membuat PDF.');
    }
  };
  const handleExcel = async () => {
    if (rows.length === 0) return;
    try {
      const XLSX = await import('xlsx');
      const wsData = [['No','Treatment','Barber','Total'], ...rows.map((r)=>[ `A-${String(r.nomor_antrian).padStart(2,'0')}`, r.treatments?.nama||'-', r.barber?.nama||'-', r._total||0]), ['','Total', '', total]];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
      const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = cacheDirectory + `laporan-${filter}.xlsx`;
      await writeAsStringAsync(uri, b64, { encoding: EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); else Alert.alert('Excel', uri);
    } catch(e:any){ Alert.alert('Gagal', e.message); }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Laporan" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
          {(['hari','minggu','bulan'] as Filter[]).map((f)=>(
            <TouchableOpacity key={f} style={[{ paddingHorizontal:12, paddingVertical:8, borderWidth:1.5, borderRadius:6, borderColor: filter===f?theme.primary:theme.cardBorder, backgroundColor: filter===f?theme.primary:theme.surface }]} onPress={()=>setFilter(f)}>
              <Text style={{ color: filter===f?'#fff':theme.ink, fontWeight:'700', fontSize:12 }}>{f==='hari'?'Hari Ini':f==='minggu'?'Minggu Ini':'Bulan Ini'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.header, brutalistCard(theme as any)]}><Text style={[styles.headerVal, { color: theme.ink }]}>Rp {total.toLocaleString('id-ID')}</Text><Text style={[styles.headerSub, { color: theme.inkMuted }]}>{rows.length} transaksi • {filter}</Text></View>
        {loading ? <ActivityIndicator color={theme.primary} /> : rows.length===0 ? <Text style={{ color: theme.inkMuted, textAlign:'center', marginTop:12 }}>Belum ada transaksi</Text> : rows.map((r)=>(
          <View key={r.id} style={[styles.row, brutalistCard(theme as any)]}><Text style={{ color: theme.ink, fontWeight:'700' }}>A-{String(r.nomor_antrian).padStart(2,'0')} • {r.treatments?.nama||'-'}</Text><Text style={{ color: theme.primary, fontWeight:'800' }}>Rp {(r._total||0).toLocaleString('id-ID')}</Text></View>
        ))}
        <View style={{ flexDirection:'row', gap:10, marginTop:16 }}>
          <TouchableOpacity
            style={[brutalistButton(theme as any,'primary'), { flex:1, backgroundColor: theme.ink, opacity: rows.length===0||loading?0.5:1 }]}
            onPress={handlePdf}
            disabled={rows.length===0||loading}
          >
            <Text style={{ color:'#fff', fontWeight:'800', fontSize:13 }}>📄 Unduh PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[brutalistButton(theme as any,'secondary'), { flex:1, opacity: rows.length===0||loading?0.5:1 }]}
            onPress={handleExcel}
            disabled={rows.length===0||loading}
          >
            <Text style={{ fontWeight:'800', fontSize:13 }}>📊 Ekspor XLSX</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  flex:{ flex:1 },
  container:{ padding:16, gap:12 },
  header:{ padding:14, alignItems:'center' },
  headerVal:{ fontSize:22, fontWeight:'800' },
  headerSub:{ fontSize:12, marginTop:2 },
  row:{ padding:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
});

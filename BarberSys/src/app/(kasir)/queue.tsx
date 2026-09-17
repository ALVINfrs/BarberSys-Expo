import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { filterAvailableBarbers } from '@/lib/barber-availability';

interface KasirQueueItem extends QueueItem {
  customer: Profile | null;
  treatments: Treatment | null;
  barber: Profile | null;
}

export default function KasirQueueDashboard() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [queueList, setQueueList] = useState<KasirQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walkinVisible, setWalkinVisible] = useState(false);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [walkinNama, setWalkinNama] = useState('');
  const [walkinTreatmentId, setWalkinTreatmentId] = useState<string | null>(null);
  const [walkinBarberId, setWalkinBarberId] = useState<string | null>(null);
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [walkinError, setWalkinError] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('queue')
        .select('*, customer:profiles!queue_user_id_fkey(*), treatments(*), barber:profiles!queue_barber_id_fkey(*)')
        .eq('status', 'menunggu')
        .order('nomor_antrian', { ascending: true });

      if (error) {
        console.error('Error fetching kasir queue:', error.message);
      } else {
        setQueueList((data as unknown as KasirQueueItem[]) || []);
      }
    } catch (e) {
      console.error('Exception fetching queue:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWalkinMeta = async () => {
    const { data: tData } = await supabase.from('treatments').select('*').eq('aktif', true).order('nama', { ascending: true });
    if (tData) setTreatments(tData as Treatment[]);
    const { data: bData } = await supabase.from('profiles').select('*').eq('role', 'barber').eq('status_akun', 'aktif');
    if (bData) setBarbers(bData as Profile[]);
  };

  const openWalkin = async () => {
    setWalkinNama('');
    setWalkinTreatmentId(treatments[0]?.id || null);
    setWalkinBarberId(null);
    setWalkinError(null);
    if (treatments.length === 0) await fetchWalkinMeta();
    else {
      setWalkinTreatmentId(treatments[0].id);
    }
    setWalkinVisible(true);
  };

  const handleWalkinSubmit = async () => {
    if (!walkinNama.trim()) {
      setWalkinError('Nama pelanggan wajib diisi.');
      return;
    }
    if (!walkinTreatmentId) {
      setWalkinError('Pilih treatment.');
      return;
    }
    if (walkinBarberId) {
      const fresh = barbers.find((b) => b.id === walkinBarberId);
      if (fresh?.status_kerja === 'istirahat') {
        setWalkinError('Barber istirahat, pilih lain.');
        await fetchWalkinMeta();
        return;
      }
    }
    setWalkinSubmitting(true);
    setWalkinError(null);
    try {
      const { data, error } = await supabase
        .from('queue')
        .insert({
          user_id: null,
          nama_customer: walkinNama.trim(),
          treatment_id: walkinTreatmentId,
          barber_id: walkinBarberId,
          status: 'menunggu',
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Gagal membuat antrian walk-in');
      setWalkinVisible(false);
      fetchQueue();
    } catch (e: any) {
      setWalkinError(e.message || 'Gagal membuat antrian walk-in');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchWalkinMeta();

    const channel = supabase
      .channel('kasir-queue-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    const ch2 = supabase
      .channel('kasir-walkin-barbers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchWalkinMeta())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ch2);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
    fetchWalkinMeta();
  };

  const handlePanggil = (queueId: string) => {
    router.push({
      pathname: '/(kasir)/call' as any,
      params: { queueId },
    });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kasir — Antrian Masuk" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.introBox}>
          <Text style={[styles.heading, { color: theme.ink }]}>Daftar Antrian Menunggu</Text>
          <Text style={[styles.subheading, { color: theme.inkMuted }]}>
            Tekan tombol "Panggil" untuk menugaskan barber dan memanggil antrian.
          </Text>
          <TouchableOpacity
            style={[brutalistButton(theme as any, 'secondary'), { marginTop: 10, alignSelf: 'flex-start' }]}
            onPress={openWalkin}
            activeOpacity={0.7}
          >
            <Text style={{ fontWeight: '800', fontSize: 13 }}>+ WALK-IN</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.secondary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat antrian...</Text>
          </View>
        ) : queueList.length === 0 ? (
          <View style={[styles.emptyCard, brutalistCard(theme as any)]}>
            <Text style={[styles.emptyIcon]}>☕</Text>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Tidak Ada Antrian Menunggu</Text>
            <Text style={[styles.emptySub, { color: theme.inkMuted }]}>
              Saat ini belum ada pelanggan yang mengambil nomor antrian baru.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {queueList.map((item) => (
              <View key={item.id} style={[styles.card, brutalistCard(theme as any)]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.numBadge, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.numText, Typography.monoSm, { color: theme.ink }]}>
                      No. {item.nomor_antrian}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: theme.neutral }]}>
                    <Text style={styles.statusBadgeText}>MENUNGGU</Text>
                  </View>
                </View>

                <Text style={[styles.custName, { color: theme.ink }]}>
                  👤 {item.customer?.nama || (item as any).nama_customer || 'Pelanggan Walk-in'}
                </Text>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Layanan:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {item.treatments?.nama || 'Treatment'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Request Barber:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {item.barber?.nama || 'Siapa saja (Bebas)'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'primary'), styles.callBtn, { backgroundColor: theme.secondary }]}
                  onPress={() => handlePanggil(item.id)}
                >
                  <Text style={styles.callBtnText}>PANGGIL ANTRIAN ➔</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {walkinVisible ? (
        <Modal transparent animationType="slide" visible={walkinVisible}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, brutalistCard(theme as any)]}>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>Walk-in Manual</Text>
              <Text style={[styles.modalLabel, { color: theme.inkMuted }]}>
                Nama pelanggan tanpa aplikasi, pilih treatment & barber opsional.
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.cardBorder, color: theme.ink }]}
                placeholder="Nama pelanggan"
                placeholderTextColor={theme.inkMuted}
                value={walkinNama}
                onChangeText={setWalkinNama}
              />
              <Text style={[styles.sectionLabel, { color: theme.ink }]}>Treatment</Text>
              <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                {treatments.map((t) => {
                  const sel = walkinTreatmentId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.pickRow, { borderColor: sel ? theme.primary : theme.cardBorder, backgroundColor: sel ? theme.surfaceContainerLow : theme.surface }]}
                      onPress={() => setWalkinTreatmentId(t.id)}
                    >
                      <Text style={[styles.pickText, { color: theme.ink }]}>{t.nama} — Rp {t.harga.toLocaleString('id-ID')}</Text>
                      {sel ? <Text style={{ color: theme.primary, fontWeight: '800' }}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={[styles.sectionLabel, { color: theme.ink }]}>Barber (opsional)</Text>
              <TouchableOpacity
                style={[styles.pickRow, { borderColor: walkinBarberId === null ? theme.primary : theme.cardBorder }]}
                onPress={() => setWalkinBarberId(null)}
              >
                <Text style={[styles.pickText, { color: theme.ink }]}>Siapa saja (Bebas)</Text>
                {walkinBarberId === null ? <Text style={{ color: theme.primary, fontWeight: '800' }}>✓</Text> : null}
              </TouchableOpacity>
              {filterAvailableBarbers(barbers).map((b) => {
                const sel = walkinBarberId === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.pickRow, { borderColor: sel ? theme.primary : theme.cardBorder }]}
                    onPress={() => setWalkinBarberId(b.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {b.foto_url ? <Image source={{ uri: b.foto_url }} style={styles.barberThumb} /> : null}
                      <Text style={[styles.pickText, { color: theme.ink }]}>{b.nama}</Text>
                    </View>
                    {sel ? <Text style={{ color: theme.primary, fontWeight: '800' }}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
              {walkinError ? <Text style={[styles.errorText, { color: theme.danger }]}>{walkinError}</Text> : null}
              <View style={styles.modalActions}>
                <TouchableOpacity style={[brutalistButton(theme as any, 'ghost'), { flex: 1 }]} onPress={() => setWalkinVisible(false)} disabled={walkinSubmitting}>
                  <Text style={{ fontWeight: '700' }}>BATAL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'primary'), { flex: 1, backgroundColor: theme.secondary, opacity: walkinSubmitting ? 0.6 : 1 }]}
                  onPress={handleWalkinSubmit}
                  disabled={walkinSubmitting}
                >
                  {walkinSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.callBtnText}>SIMPAN</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  introBox: { marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: '800' },
  subheading: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  emptyCard: { padding: 28, alignItems: 'center' },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  list: { gap: 14 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  numBadge: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  numText: { fontSize: 16, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  custName: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 13 },
  infoVal: { fontSize: 13, fontWeight: '700' },
  callBtn: { marginTop: 14, paddingVertical: 12 },
  callBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 380, padding: 16, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  modalLabel: { fontSize: 12, marginBottom: 10, fontWeight: '600' },
  input: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  pickRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderRadius: 6, padding: 10, marginBottom: 6 },
  pickText: { fontSize: 13, fontWeight: '700' },
  barberThumb: { width: 24, height: 24, borderRadius: 4 },
  errorText: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});

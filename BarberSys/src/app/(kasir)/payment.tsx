import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

interface SelesaiQueueItem extends QueueItem {
  customer: Profile | null;
  treatments: Treatment | null;
  barber: Profile | null;
}

export default function KasirPaymentScreen() {
  const { theme } = useAppTheme();
  const { user } = useAuth();

  const [queueList, setQueueList] = useState<SelesaiQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelesaiQueueItem | null>(null);
  const [metodeBayar, setMetodeBayar] = useState<'tunai' | 'qris'>('tunai');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSelesaiQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('queue')
        .select('*, customer:profiles!queue_user_id_fkey(*), treatments(*), barber:profiles!queue_barber_id_fkey(*)')
        .eq('status', 'selesai')
        .order('completed_at', { ascending: true });

      if (error) {
        console.error('Error fetching payment queue:', error.message);
      } else {
        setQueueList((data as unknown as SelesaiQueueItem[]) || []);
      }
    } catch (e) {
      console.error('Exception fetching payment queue:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSelesaiQueue();

    // Subscribe to realtime queue changes
    const channel = supabase
      .channel('kasir-payment-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          fetchSelesaiQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSelesaiQueue();
  };

  const handleOpenPaymentModal = (item: SelesaiQueueItem) => {
    setSelectedItem(item);
    setMetodeBayar('tunai');
    setErrorMessage(null);
  };

  const handleKonfirmasiBayar = async () => {
    if (!selectedItem || !user) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error: updateErr } = await supabase
        .from('queue')
        .update({
          status: 'lunas',
          metode_bayar: metodeBayar,
          kasir_id: user.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id);

      if (updateErr) throw updateErr;

      setSelectedItem(null);
      fetchSelesaiQueue();
    } catch (e: any) {
      console.error('Error confirming payment:', e);
      setErrorMessage(e.message || 'Gagal memproses pembayaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kasir — Pembayaran" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.introBox}>
          <Text style={[styles.heading, { color: theme.ink }]}>Antrian Selesai (Menunggu Bayar)</Text>
          <Text style={[styles.subheading, { color: theme.inkMuted }]}>
            Pilih transaksi pelanggan yang telah selesai dikerjakan untuk melunasi pembayaran.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.secondary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat data pembayaran...</Text>
          </View>
        ) : queueList.length === 0 ? (
          <View style={[styles.emptyCard, brutalistCard(theme as any)]}>
            <Text style={[styles.emptyIcon]}>💰</Text>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Tidak Ada Tagihan Aktif</Text>
            <Text style={[styles.emptySub, { color: theme.inkMuted }]}>
              Saat ini belum ada antrian yang selesai dikerjakan barber.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {queueList.map((item) => (
              <View key={item.id} style={[styles.card, brutalistCard(theme as any)]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.numText, Typography.monoSm, { color: theme.ink }]}>
                    No. {item.nomor_antrian}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: theme.amber }]}>
                    <Text style={styles.statusBadgeText}>SELESAI DILAYANI</Text>
                  </View>
                </View>

                <Text style={[styles.custName, { color: theme.ink }]}>
                  👤 {item.customer?.nama || 'Pelanggan'}
                </Text>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Barber:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {item.barber?.nama || 'Barber Toko'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Layanan:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {item.treatments?.nama}
                  </Text>
                </View>

                <View style={[styles.totalRow, { borderTopColor: theme.cardBorder }]}>
                  <Text style={[styles.totalLabel, { color: theme.ink }]}>Total Tagihan:</Text>
                  <Text style={[styles.totalVal, { color: theme.primary }]}>
                    {formatRupiah(item.treatments?.harga || 0)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'primary'), styles.payBtn, { backgroundColor: theme.secondary }]}
                  onPress={() => handleOpenPaymentModal(item)}
                >
                  <Text style={styles.payBtnText}>PROSES PEMBAYARAN ➔</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Payment Confirmation Modal */}
      {selectedItem ? (
        <Modal transparent animationType="fade" visible={!!selectedItem}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, brutalistCard(theme as any)]}>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>Konfirmasi Pembayaran</Text>

              <View style={styles.modalDetailBox}>
                <Text style={[styles.modalLabel, { color: theme.inkMuted }]}>
                  No. Antrian: <Text style={{ color: theme.ink, fontWeight: '800' }}>No. {selectedItem.nomor_antrian}</Text>
                </Text>
                <Text style={[styles.modalLabel, { color: theme.inkMuted }]}>
                  Pelanggan: <Text style={{ color: theme.ink, fontWeight: '800' }}>{selectedItem.customer?.nama || 'Pelanggan'}</Text>
                </Text>
                <Text style={[styles.modalLabel, { color: theme.inkMuted }]}>
                  Layanan: <Text style={{ color: theme.ink, fontWeight: '800' }}>{selectedItem.treatments?.nama}</Text>
                </Text>
                <Text style={[styles.modalPrice, { color: theme.primary }]}>
                  Total: {formatRupiah(selectedItem.treatments?.harga || 0)}
                </Text>
              </View>

              <Text style={[styles.metodeTitle, { color: theme.ink }]}>Metode Pembayaran:</Text>

              {/* Fase 1: hanya TUNAI. Opsi QRIS dibuka di Fase 6 (B5). */}
              <View style={styles.metodeRow}>
                <View
                  style={[
                    styles.metodeBtn,
                    brutalistCard(theme as any),
                    { borderColor: theme.secondary, borderWidth: 3 },
                  ]}
                >
                  <Text style={[styles.metodeText, { color: theme.ink }]}>💵 TUNAI</Text>
                </View>
              </View>

              {errorMessage ? (
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'ghost'), { flex: 1 }]}
                  onPress={() => setSelectedItem(null)}
                  disabled={submitting}
                >
                  <Text style={{ fontWeight: '700' }}>BATAL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'primary'), { flex: 1, backgroundColor: theme.secondary, opacity: submitting ? 0.6 : 1 }]}
                  onPress={handleKonfirmasiBayar}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.payBtnText}>LUNAS</Text>
                  )}
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
  numText: { fontSize: 16, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  custName: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 13 },
  infoVal: { fontSize: 13, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  totalLabel: { fontSize: 15, fontWeight: '800' },
  totalVal: { fontSize: 18, fontWeight: '800' },
  payBtn: { marginTop: 14, paddingVertical: 12 },
  payBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 380, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  modalDetailBox: { marginBottom: 16, gap: 4 },
  modalLabel: { fontSize: 14 },
  modalPrice: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  metodeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  metodeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metodeBtn: { flex: 1, padding: 12, alignItems: 'center' },
  metodeText: { fontSize: 14, fontWeight: '800' },
  errorText: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});

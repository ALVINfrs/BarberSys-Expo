import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile, Product } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { buildReceiptHtml, ReceiptData } from '@/lib/receipt';
import { DEFAULT_LOGO_BASE64 } from '@/lib/receipt-logo';

interface SelesaiQueueItem extends QueueItem {
  customer: Profile | null;
  treatments: Treatment | null;
  barber: Profile | null;
}

interface NotaItem {
  nama: string;
  qty: number;
  subtotal: number;
}

export default function KasirPaymentScreen() {
  const { theme } = useAppTheme();
  const { user } = useAuth();

  const [queueList, setQueueList] = useState<SelesaiQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelesaiQueueItem | null>(null);
  const [metodeBayar, setMetodeBayar] = useState<'tunai' | 'qris'>('tunai');
  const [notaItems, setNotaItems] = useState<Record<string, NotaItem[]>>({});
  const [notaTotals, setNotaTotals] = useState<Record<string, number>>({});
  const [walkinVisible, setWalkinVisible] = useState(false);
  const [walkinProducts, setWalkinProducts] = useState<Product[]>([]);
  const [walkinQty, setWalkinQty] = useState<Record<string, number>>({});
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [walkinError, setWalkinError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState('');
  // null = input custom, angka = chip preset yang aktif
  const [tipPreset, setTipPreset] = useState<number | null>(0);

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
        const list = (data as unknown as SelesaiQueueItem[]) || [];
        setQueueList(list);

        // F2.5: ambil add-on produk untuk nota gabungan
        if (list.length > 0) {
          const ids = list.map((q) => q.id);
          const { data: qpData } = await supabase
            .from('queue_products')
            .select('queue_id, qty, subtotal, products(nama)')
            .in('queue_id', ids);

          const itemsMap: Record<string, NotaItem[]> = {};
          const totalsMap: Record<string, number> = {};
          (qpData as any[] || []).forEach((row) => {
            const arr = itemsMap[row.queue_id] || [];
            arr.push({
              nama: row.products?.nama || 'Produk',
              qty: row.qty,
              subtotal: row.subtotal,
            });
            itemsMap[row.queue_id] = arr;
          });
          list.forEach((q) => {
            const prodSum = (itemsMap[q.id] || []).reduce((s, it) => s + it.subtotal, 0);
            totalsMap[q.id] = (q.treatments?.harga || 0) + prodSum;
          });
          setNotaItems(itemsMap);
          setNotaTotals(totalsMap);
        } else {
          setNotaItems({});
          setNotaTotals({});
        }
      }
    } catch (e) {
      console.error('Exception fetching payment queue:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // F2.6: katalog produk untuk penjualan walk-in
  const fetchWalkinProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('aktif', true)
      .order('nama', { ascending: true });
    setWalkinProducts((data as Product[]) || []);
  };

  const changeWalkinQty = (id: string, delta: number) => {
    setWalkinQty((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  };

  // F2.6: buat transaksi produk-saja (tanpa treatment/antrian customer)
  const handleWalkinSale = async () => {
    if (!user) return;
    setWalkinError(null);

    const items = walkinProducts.filter((p) => (walkinQty[p.id] || 0) > 0);
    if (items.length === 0) {
      setWalkinError('Pilih minimal 1 produk.');
      return;
    }

    setWalkinSubmitting(true);
    try {
      const { data: newQueue, error: qErr } = await supabase
        .from('queue')
        .insert({
          user_id: null,
          treatment_id: null,
          barber_id: null,
          kasir_id: user.id,
          status: 'selesai',
        })
        .select()
        .single();
      if (qErr) throw qErr;

      const rows = items.map((p) => ({
        queue_id: (newQueue as any).id,
        product_id: p.id,
        qty: walkinQty[p.id],
        subtotal: walkinQty[p.id] * p.harga,
      }));
      const { error: qpErr } = await supabase.from('queue_products').insert(rows);
      if (qpErr) throw qpErr;

      setWalkinVisible(false);
      setWalkinQty({});
      fetchSelesaiQueue();
    } catch (e: any) {
      setWalkinError(e.message || 'Gagal menyimpan penjualan walk-in.');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  useEffect(() => {
    fetchSelesaiQueue();
    fetchWalkinProducts();

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
    const existingTip = item.tip_amount || 0;
    const isPreset = [0, 5000, 10000, 15000].includes(existingTip);
    setTipAmount(existingTip);
    setTipPreset(isPreset ? existingTip : null);
    setCustomTip(isPreset ? '' : String(existingTip));
    setErrorMessage(null);
  };

  const handleKonfirmasiBayar = async () => {
    if (!selectedItem || !user) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('queue')
        .update({
          status: 'lunas',
          metode_bayar: metodeBayar,
          tip_amount: tipAmount,
          kasir_id: user.id,
          completed_at: nowIso,
        })
        .eq('id', selectedItem.id);

      if (updateErr) throw updateErr;

      // F3.4 polish: struk branded A — logo lokal + kasir+barber + alamat + jam + kode + instruksi + tip
      const items = notaItems[selectedItem.id] || [];
      const baseTotal = notaTotals[selectedItem.id] ?? selectedItem.treatments?.harga ?? 0;
      const total = baseTotal + tipAmount;
      let tokoNama: string | null = null;
      let tokoAlamat: string | null = null;
      let jamBuka: string | null = null;
      let jamTutup: string | null = null;
      let kasirNama: string | null = null;
      try {
        const { data: shop } = await supabase
          .from('barbershop_settings')
          .select('nama_toko, alamat, jam_buka, jam_tutup')
          .limit(1)
          .single();
        if (shop) {
          tokoNama = (shop as any).nama_toko || null;
          tokoAlamat = (shop as any).alamat || null;
          jamBuka = (shop as any).jam_buka || null;
          jamTutup = (shop as any).jam_tutup || null;
        }
      } catch {}
      try {
        const { data: kasirProf } = await supabase.from('profiles').select('nama').eq('id', user.id).single();
        if (kasirProf) kasirNama = (kasirProf as any).nama || null;
      } catch {}
      if (!kasirNama) kasirNama = user.email || 'Kasir';
      const receipt: ReceiptData = {
        nomor_antrian: selectedItem.nomor_antrian,
        customerNama: (selectedItem.customer?.nama || (selectedItem as any).nama_customer || 'Pelanggan') as string,
        barberNama: selectedItem.barber?.nama || 'Barber Toko',
        kasirNama,
        kursiNomor: (selectedItem as any).kursi_nomor ?? null,
        treatmentNama: selectedItem.treatments?.nama || null,
        treatmentHarga: selectedItem.treatments?.harga ?? null,
        items: items.map((it) => ({ nama: it.nama, qty: it.qty, subtotal: it.subtotal })),
        total,
        tipAmount: tipAmount || null,
        metode: metodeBayar,
        tanggal: new Date(nowIso).toLocaleString('id-ID'),
        tokoNama,
        tokoAlamat,
        jamBuka,
        jamTutup,
        kodeTransaksi: selectedItem.id.slice(0, 8).toUpperCase(),
        instruksi: (selectedItem as any).instruksi_potongan || null,
        logoBase64: DEFAULT_LOGO_BASE64,
      };
      setLastReceipt(receipt);

      setSelectedItem(null);
      fetchSelesaiQueue();
    } catch (e: any) {
      console.error('Error confirming payment:', e);
      setErrorMessage(e.message || 'Gagal memproses pembayaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!lastReceipt || receiptBusy) return;
    setReceiptBusy(true);
    try {
      const html = buildReceiptHtml(lastReceipt);
      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Info', `File struk disimpan: ${uri}`);
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Bagikan Struk' });
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Tidak bisa membuat struk PDF.');
    } finally {
      setReceiptBusy(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!lastReceipt || receiptBusy) return;
    setReceiptBusy(true);
    try {
      const html = buildReceiptHtml(lastReceipt);
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Tidak bisa mencetak struk.');
    } finally {
      setReceiptBusy(false);
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
          <TouchableOpacity
            style={[brutalistButton(theme as any, 'secondary'), { marginTop: 10, alignSelf: 'flex-start' }]}
            onPress={() => {
              setWalkinQty({});
              setWalkinError(null);
              setWalkinVisible(true);
            }}
          >
            <Text style={{ fontWeight: '800', fontSize: 13 }}>+ JUAL PRODUK WALK-IN</Text>
          </TouchableOpacity>
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
                  👤 {item.customer?.nama || (item as any).nama_customer || 'Pelanggan Walk-in'}
                </Text>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Barber:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {item.barber?.nama || 'Barber Toko'}
                  </Text>
                </View>

                {(item as any).kursi_nomor != null ? (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Kursi:</Text>
                    <Text style={[styles.infoVal, { color: theme.primary }]}>Kursi {(item as any).kursi_nomor}</Text>
                  </View>
                ) : null}

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Layanan:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {item.treatments?.nama}
                  </Text>
                </View>

                <View style={[styles.totalRow, { borderTopColor: theme.cardBorder }]}>
                  <Text style={[styles.totalLabel, { color: theme.ink }]}>Total Tagihan:</Text>
                  <Text style={[styles.totalVal, { color: theme.primary }]}>
                    {formatRupiah((notaTotals[item.id] ?? item.treatments?.harga ?? 0) + (item.tip_amount || 0))}
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

        {lastReceipt ? (
          <View style={[styles.receiptBox, brutalistCard(theme as any)]}>
            <Text style={[styles.receiptTitle, { color: theme.ink }]}>Struk Terakhir — No. A-{String(lastReceipt.nomor_antrian).padStart(2, '0')} • {lastReceipt.kodeTransaksi}</Text>
            <Text style={[styles.receiptSub, { color: theme.inkMuted }]}>
              {lastReceipt.customerNama} • {lastReceipt.kursiNomor != null ? `Kursi ${lastReceipt.kursiNomor} • ` : ''}Kasir {lastReceipt.kasirNama || '-'} • {lastReceipt.treatmentNama || 'Produk walk-in'} • {formatRupiah(lastReceipt.total)}
            </Text>
            <View style={styles.receiptActions}>
              <TouchableOpacity
                style={[brutalistButton(theme as any, 'secondary'), { flex: 1, opacity: receiptBusy ? 0.6 : 1 }]}
                onPress={handleShareReceipt}
                disabled={receiptBusy}
              >
                <Text style={{ fontWeight: '800', fontSize: 13 }}>{receiptBusy ? '...' : '📤 BAGIKAN PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[brutalistButton(theme as any, 'primary'), { flex: 1, backgroundColor: theme.ink, opacity: receiptBusy ? 0.6 : 1 }]}
                onPress={handlePrintReceipt}
                disabled={receiptBusy}
              >
                <Text style={[styles.payBtnText, { fontSize: 13 }]}>{receiptBusy ? '...' : '🖨️ CETAK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* F2.6: Modal jual produk walk-in */}
      {walkinVisible ? (
        <Modal transparent animationType="slide" visible={walkinVisible}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, brutalistCard(theme as any)]}>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>Jual Produk Walk-in</Text>
              <Text style={[styles.modalLabel, { color: theme.inkMuted }]}>
                Produk saja, tanpa treatment/antrian.
              </Text>

              {walkinProducts.length === 0 ? (
                <Text style={[styles.errorText, { color: theme.inkMuted }]}>
                  Belum ada produk aktif. Tambahkan dulu di menu Admin → Produk.
                </Text>
              ) : (
                walkinProducts.map((p) => {
                  const qty = walkinQty[p.id] || 0;
                  return (
                    <View key={p.id} style={styles.walkinRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.walkinName, { color: theme.ink }]}>{p.nama}</Text>
                        <Text style={[styles.walkinPrice, { color: theme.primary }]}>
                          {formatRupiah(p.harga)}
                        </Text>
                      </View>
                      <View style={[styles.stepper, { backgroundColor: theme.surfaceContainerHigh }]}>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: theme.surfaceContainerLowest }]}
                          onPress={() => changeWalkinQty(p.id, -1)}
                        >
                          <Text style={[styles.stepBtnText, { color: theme.ink }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, { color: theme.ink }]}>{qty}</Text>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: theme.surfaceContainerLowest }]}
                          onPress={() => changeWalkinQty(p.id, 1)}
                        >
                          <Text style={[styles.stepBtnText, { color: theme.ink }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}

              {walkinError ? (
                <Text style={[styles.errorText, { color: theme.danger }]}>{walkinError}</Text>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'ghost'), { flex: 1 }]}
                  onPress={() => setWalkinVisible(false)}
                  disabled={walkinSubmitting}
                >
                  <Text style={{ fontWeight: '700' }}>BATAL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'primary'), { flex: 1, backgroundColor: theme.secondary, opacity: walkinSubmitting ? 0.6 : 1 }]}
                  onPress={handleWalkinSale}
                  disabled={walkinSubmitting}
                >
                  {walkinSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.payBtnText}>SIMPAN</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

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
                  Pelanggan: <Text style={{ color: theme.ink, fontWeight: '800' }}>{selectedItem.customer?.nama || (selectedItem as any).nama_customer || 'Pelanggan'}</Text>
                </Text>
                {(selectedItem as any).kursi_nomor != null ? (
                  <Text style={[styles.modalLabel, { color: theme.inkMuted }]}>
                    Kursi: <Text style={{ color: theme.primary, fontWeight: '800' }}>Kursi {(selectedItem as any).kursi_nomor}</Text> • Barber: <Text style={{ color: theme.ink, fontWeight: '800' }}>{selectedItem.barber?.nama || '-'}</Text>
                  </Text>
                ) : null}
                {selectedItem.treatments ? (
                  <View style={styles.notaLine}>
                    <Text style={[styles.modalLabel, { color: theme.inkMuted }]}>
                      {selectedItem.treatments.nama}
                    </Text>
                    <Text style={[styles.notaLineVal, { color: theme.ink }]}>
                      {formatRupiah(selectedItem.treatments.harga)}
                    </Text>
                  </View>
                ) : null}
                {(notaItems[selectedItem.id] || []).map((it, idx) => (
                  <View key={idx} style={styles.notaLine}>
                    <Text style={[styles.modalLabel, { color: theme.inkMuted }]}>
                      {it.nama} × {it.qty}
                    </Text>
                    <Text style={[styles.notaLineVal, { color: theme.ink }]}>
                      {formatRupiah(it.subtotal)}
                    </Text>
                  </View>
                ))}
                {tipAmount > 0 ? (
                  <View style={styles.notaLine}>
                    <Text style={[styles.modalLabel, { color: theme.inkMuted }]}>Tip</Text>
                    <Text style={[styles.notaLineVal, { color: theme.ink }]}>{formatRupiah(tipAmount)}</Text>
                  </View>
                ) : null}
                <Text style={[styles.modalPrice, { color: theme.primary }]}>
                  Total: {formatRupiah((notaTotals[selectedItem.id] ?? selectedItem.treatments?.harga ?? 0) + tipAmount)}
                </Text>
              </View>

              <Text style={[styles.modalLabel, { color: theme.ink, fontWeight: '700', marginBottom: 6 }]}>Tip untuk Barber (tunai, opsional)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {[0, 5000, 10000, 15000].map((v) => {
                  const sel = tipPreset === v;
                  return (
                    <TouchableOpacity
                      key={String(v)}
                      style={[{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderRadius: 6, borderColor: sel ? theme.secondary : theme.cardBorder, backgroundColor: sel ? theme.surfaceContainerLow : theme.surface }]}
                      onPress={() => {
                        setTipAmount(v);
                        setTipPreset(v);
                        setCustomTip('');
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.ink }}>{v === 0 ? 'Tanpa Tip' : `Rp ${v.toLocaleString('id-ID')}`}</Text>
                    </TouchableOpacity>
                  );
                })}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: tipPreset === null ? theme.secondary : theme.cardBorder, borderRadius: 6, paddingHorizontal: 8, backgroundColor: theme.surface }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.inkMuted }}>Custom</Text>
                  <TextInput
                    style={{ minWidth: 70, fontSize: 12, fontWeight: '700', color: theme.ink, paddingVertical: 4 }}
                    placeholder="0"
                    placeholderTextColor={theme.inkMuted}
                    keyboardType="numeric"
                    value={customTip}
                    onChangeText={(t) => {
                      const n = t.replace(/[^0-9]/g, '');
                      setCustomTip(n);
                      setTipPreset(null);
                      setTipAmount(n ? parseInt(n, 10) : 0);
                    }}
                  />
                </View>
              </View>
              <Text style={[styles.metodeTitle, { color: theme.ink }]}>Metode Pembayaran:</Text>

              {/* Fase 1–2: hanya TUNAI. QRIS terkunci sampai Fase 6. */}
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

                <TouchableOpacity
                  style={[styles.metodeBtn, brutalistCard(theme as any), { opacity: 0.55 }]}
                  onPress={() => Alert.alert('🔒 Segera Hadir', 'Pembayaran QRIS dibuka di Fase 6.')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.metodeText, { color: theme.ink }]}>🔒 QRIS</Text>
                </TouchableOpacity>
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
  notaLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notaLineVal: { fontSize: 14, fontWeight: '700' },
  modalPrice: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  metodeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  metodeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metodeBtn: { flex: 1, padding: 12, alignItems: 'center' },
  metodeText: { fontSize: 14, fontWeight: '800' },
  errorText: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  receiptBox: { padding: 14, marginTop: 16 },
  receiptTitle: { fontSize: 14, fontWeight: '800' },
  receiptSub: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  receiptActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  walkinRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  walkinName: { fontSize: 14, fontWeight: '800' },
  walkinPrice: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 4, borderRadius: 6 },
  stepBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  stepBtnText: { fontSize: 16, fontWeight: '800' },
  qtyText: { fontSize: 14, fontWeight: '800', minWidth: 20, textAlign: 'center' },
});

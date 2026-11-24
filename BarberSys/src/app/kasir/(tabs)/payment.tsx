import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import * as Print from 'expo-print';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile, Product } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { buildReceiptHtml, ReceiptData } from '@/lib/receipt';
import { sharePdfFromHtml } from '@/lib/share-pdf';
import { buildPaymentReceipt } from '@/lib/payment-receipt';
import { DEFAULT_LOGO_BASE64 } from '@/lib/receipt-logo';
import { formatQueueNumber } from '@/lib/ticker';
import {
  QRIS_QR_MAX_AGE_MS,
  QrisPayload,
  buildQrisPayload,
  computeQueueTotal,
  encodeQrisPayload,
  kodeTransaksiFromId,
} from '@/lib/qris';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Confetti } from '@/components/ui/confetti';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Stamp } from '@/components/ui/stamp';

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

interface QrisState {
  item: SelesaiQueueItem;
  items: NotaItem[];
  total: number;
  tipAmount: number;
  payload: QrisPayload;
  status: 'waiting' | 'paid' | 'expired';
  receipt: ReceiptData | null;
}

/** Titik pulse status menunggu; berhenti total saat reduced motion. */
function PulseDot({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(withTiming(0.2, { duration: 700 }), -1, true);
    return () => {
      cancelAnimation(opacity);
      opacity.value = 1;
    };
  }, [opacity, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: 9, height: 9, borderRadius: 5, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.infoRow}>
      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
        {label}
      </AppText>
      <AppText
        variant="body"
        color={valueColor ?? theme.ink}
        style={{ fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' }}
      >
        {value}
      </AppText>
    </View>
  );
}

function ModalInfo({ label, value, color }: { label: string; value: string; color?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.notaLine}>
      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13.5 }}>
        {label}
      </AppText>
      <AppText variant="body" color={color ?? theme.ink} style={{ fontSize: 13.5, fontWeight: '700' }}>
        {value}
      </AppText>
    </View>
  );
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
  const [qrisState, setQrisState] = useState<QrisState | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const composeReceipt = async (
    item: SelesaiQueueItem,
    items: NotaItem[],
    tip: number,
    metode: 'tunai' | 'qris',
    nowIso: string
  ): Promise<ReceiptData> => {
    if (!user) throw new Error('Sesi kasir tidak ditemukan.');
    // F3.4 polish: struk branded A — logo lokal + kasir+barber + alamat + jam + kode + instruksi + tip
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
    return buildPaymentReceipt({
      queueId: item.id,
      nomorAntrian: item.nomor_antrian,
      customerNama: item.customer?.nama || item.nama_customer || 'Pelanggan',
      barberNama: item.barber?.nama || 'Barber Toko',
      kasirNama,
      kursiNomor: item.kursi_nomor ?? null,
      treatmentNama: item.treatments?.nama || null,
      treatmentHarga: item.treatments?.harga ?? null,
      items,
      tipAmount: tip,
      metode,
      nowIso,
      instruksi: item.instruksi_potongan || null,
      toko: { nama: tokoNama, alamat: tokoAlamat, jamBuka, jamTutup },
      logoBase64: DEFAULT_LOGO_BASE64,
    });
  };

  /**
   * QRIS: simpan tip + kasir lebih dulu (status tetap `selesai`) supaya total
   * pada QR bisa diverifikasi customer dari database dan tidak berubah bila
   * tip diubah setelah QR tampil. Status `lunas` hanya diubah oleh customer.
   */
  const handleStartQris = async (item: SelesaiQueueItem) => {
    if (!user) return;
    if (!item.user_id) {
      setErrorMessage('Penjualan walk-in tidak bisa memakai QRIS. Pilih Tunai.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase
        .from('queue')
        .update({ tip_amount: tipAmount, kasir_id: user.id })
        .eq('id', item.id)
        .eq('status', 'selesai');
      if (error) throw error;

      const items = notaItems[item.id] || [];
      const total = computeQueueTotal(item.treatments?.harga ?? null, items, tipAmount);
      const payload = buildQrisPayload({
        queueId: item.id,
        total,
        kodeTransaksi: kodeTransaksiFromId(item.id),
      });
      setQrisState({
        item: { ...item, tip_amount: tipAmount, kasir_id: user.id },
        items,
        total,
        tipAmount,
        payload,
        status: 'waiting',
        receipt: null,
      });
      setSelectedItem(null);
    } catch (e: any) {
      console.error('Error starting QRIS payment:', e);
      setErrorMessage(e.message || 'Gagal membuat QRIS.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseQris = () => setQrisState(null);

  const handleRegenerateQris = () => {
    setQrisState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        payload: buildQrisPayload({
          queueId: prev.item.id,
          total: prev.total,
          kodeTransaksi: kodeTransaksiFromId(prev.item.id),
        }),
        status: 'waiting',
        receipt: null,
      };
    });
  };

  const handleKonfirmasiBayar = async () => {
    if (!selectedItem || !user) return;
    if (metodeBayar === 'qris') {
      await handleStartQris(selectedItem);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('queue')
        .update({
          status: 'lunas',
          metode_bayar: 'tunai',
          tip_amount: tipAmount,
          kasir_id: user.id,
          completed_at: nowIso,
        })
        .eq('id', selectedItem.id);

      if (updateErr) throw updateErr;

      const receipt = await composeReceipt(
        selectedItem,
        notaItems[selectedItem.id] || [],
        tipAmount,
        'tunai',
        nowIso
      );
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

  /**
   * F6.5 — deteksi pembayaran customer lewat Realtime + fallback polling 5 detik.
   * Kedaluwarsa 30 menit; sebelum menandai expired, cek sekali lagi ke DB agar
   * pembayaran yang masuk di detik terakhir tidak salah ditampilkan.
   */
  useEffect(() => {
    const current = qrisState;
    if (!current || current.status !== 'waiting') return;
    let finished = false;

    const finishPaid = async () => {
      if (finished) return;
      finished = true;
      try {
        const receipt = await composeReceipt(
          current.item,
          current.items,
          current.tipAmount,
          'qris',
          new Date().toISOString()
        );
        setLastReceipt(receipt);
        setQrisState((prev) =>
          prev && prev.item.id === current.item.id ? { ...prev, status: 'paid', receipt } : prev
        );
      } catch (e) {
        console.error('Error building QRIS receipt:', e);
        setQrisState((prev) =>
          prev && prev.item.id === current.item.id ? { ...prev, status: 'paid', receipt: null } : prev
        );
      }
      fetchSelesaiQueue();
    };

    const finishExpired = async () => {
      if (finished) return;
      const { data } = await supabase
        .from('queue')
        .select('status')
        .eq('id', current.item.id)
        .maybeSingle();
      if (finished) return;
      if ((data as { status?: string } | null)?.status === 'lunas') {
        finished = false;
        await finishPaid();
        return;
      }
      finished = true;
      setQrisState((prev) =>
        prev && prev.item.id === current.item.id ? { ...prev, status: 'expired' } : prev
      );
    };

    const channel = supabase
      .channel(`qris-${current.item.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'queue', filter: `id=eq.${current.item.id}` },
        (payload) => {
          if ((payload.new as { status?: string }).status === 'lunas') finishPaid();
        }
      )
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('queue')
        .select('status')
        .eq('id', current.item.id)
        .maybeSingle();
      if ((data as { status?: string } | null)?.status === 'lunas') finishPaid();
    }, 5000);

    const expiry = setTimeout(
      finishExpired,
      Math.max(0, current.payload.timestamp + QRIS_QR_MAX_AGE_MS - Date.now())
    );

    return () => {
      finished = true;
      clearInterval(poll);
      clearTimeout(expiry);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrisState?.status, qrisState?.item.id, qrisState?.payload.timestamp]);

  const handleShareReceipt = async () => {
    if (!lastReceipt || receiptBusy) return;
    setReceiptBusy(true);
    try {
      const html = buildReceiptHtml(lastReceipt);
      await sharePdfFromHtml({
        html,
        fileName: `struk-${lastReceipt.kodeTransaksi || lastReceipt.nomor_antrian}`,
        dialogTitle: 'Bagikan Struk',
      });
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

  const selectedTotal =
    (notaTotals[selectedItem?.id ?? ''] ?? selectedItem?.treatments?.harga ?? 0) + tipAmount;

  const qrisExpiryLabel = qrisState
    ? new Date(qrisState.payload.timestamp + QRIS_QR_MAX_AGE_MS).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kasir — Pembayaran" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Reveal>
          <View style={{ gap: 8 }}>
            <SectionHeader
              title="Menunggu Pembayaran"
              subtitle="Transaksi selesai dikerjakan, belum dilunasi."
            />
            <Button
              label="Jual Produk Walk-in"
              icon="point-of-sale"
              variant="secondary"
              onPress={() => {
                setWalkinQty({});
                setWalkinError(null);
                setWalkinVisible(true);
              }}
              style={{ alignSelf: 'flex-start' }}
            />
          </View>
        </Reveal>

        {loading ? (
          <View style={{ gap: 14 }}>
            {[0, 1].map((index) => (
              <Card key={String(index)} style={{ gap: 10 }}>
                <Skeleton width="30%" height={18} />
                <Skeleton width="60%" height={20} />
                <Skeleton width="100%" height={14} />
                <Skeleton width="100%" height={46} radius={8} />
              </Card>
            ))}
          </View>
        ) : queueList.length === 0 ? (
          <EmptyState
            icon="payments"
            title="Tidak Ada Tagihan Aktif"
            message="Saat ini belum ada antrian yang selesai dikerjakan barber."
            actionLabel="Muat Ulang"
            onAction={() => {
              setRefreshing(true);
              fetchSelesaiQueue();
            }}
          />
        ) : (
          <View style={styles.list}>
            {queueList.map((item, index) => (
              <Reveal key={item.id} delay={Math.min(index * 45, 225)}>
                <Card accent={index % 2 === 0 ? 'amber' : 'cobalt'} style={{ gap: 8 }}>
                  <View style={styles.cardHeader}>
                    <AppText variant="mono" style={{ fontSize: 18 }}>
                      {formatQueueNumber(item.nomor_antrian)}
                    </AppText>
                    <Badge label="Selesai Dilayani" tone="warning" />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="person-outline" size={17} color={theme.inkMuted} />
                    <AppText variant="h2" style={{ fontSize: 17 }}>
                      {item.customer?.nama || (item as any).nama_customer || 'Pelanggan Walk-in'}
                    </AppText>
                  </View>

                  <View style={{ gap: 4 }}>
                    <InfoRow label="Barber" value={item.barber?.nama || 'Barber Toko'} />
                    {(item as any).kursi_nomor != null ? (
                      <InfoRow
                        label="Kursi"
                        value={`Kursi ${(item as any).kursi_nomor}`}
                        valueColor={theme.primary}
                      />
                    ) : null}
                    <InfoRow label="Layanan" value={item.treatments?.nama || '-'} />
                  </View>

                  <View style={[styles.totalRow, { borderTopColor: theme.cardBorder }]}>
                    <AppText variant="body" style={{ fontSize: 14, fontWeight: '700' }}>
                      Total Tagihan
                    </AppText>
                    <AppText variant="mono" color={theme.primary} style={{ fontSize: 20 }}>
                      {formatRupiah(
                        (notaTotals[item.id] ?? item.treatments?.harga ?? 0) + (item.tip_amount || 0)
                      )}
                    </AppText>
                  </View>

                  <Button
                    label="Proses Pembayaran"
                    icon="arrow-forward"
                    variant="dark"
                    onPress={() => handleOpenPaymentModal(item)}
                    fullWidth
                  />
                </Card>
              </Reveal>
            ))}
          </View>
        )}

        {lastReceipt ? (
          <Reveal>
            <Card tone="paper" accent="cobalt" style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="receipt-long" size={18} color={theme.primary} />
                <AppText variant="caption" color={theme.inkMuted}>
                  Struk Terakhir
                </AppText>
              </View>
              <AppText variant="h2" style={{ fontSize: 16 }}>
                {formatQueueNumber(lastReceipt.nomor_antrian)} · {lastReceipt.kodeTransaksi}
              </AppText>
              <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 12.5, lineHeight: 18 }}>
                {lastReceipt.customerNama}
                {lastReceipt.kursiNomor != null ? ` · Kursi ${lastReceipt.kursiNomor}` : ''} · Kasir{' '}
                {lastReceipt.kasirNama || '-'} · {lastReceipt.treatmentNama || 'Produk walk-in'} ·{' '}
                {formatRupiah(lastReceipt.total)}
              </AppText>
              <View style={styles.receiptActions}>
                <Button
                  label={receiptBusy ? 'Menyiapkan…' : 'Bagikan PDF'}
                  icon="share"
                  variant="secondary"
                  onPress={handleShareReceipt}
                  loading={receiptBusy}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Cetak"
                  icon="print"
                  variant="dark"
                  onPress={handlePrintReceipt}
                  disabled={receiptBusy}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </Reveal>
        ) : null}
      </ScrollView>

      {/* F2.6: Modal jual produk walk-in */}
      <Modal
        transparent
        animationType="slide"
        visible={walkinVisible}
        onRequestClose={() => setWalkinVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card tone="paper" accent="cobalt" style={styles.modalCard}>
            <View style={{ gap: 3 }}>
              <AppText variant="caption" color={theme.inkMuted}>
                Penjualan Langsung
              </AppText>
              <AppText variant="h1" style={{ fontSize: 22 }}>
                Jual Produk Walk-in
              </AppText>
              <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 12.5 }}>
                Produk saja, tanpa treatment/antrian.
              </AppText>
            </View>

            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }} nestedScrollEnabled>
              {walkinProducts.length === 0 ? (
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                  Belum ada produk aktif. Tambahkan dulu di menu Admin → Produk.
                </AppText>
              ) : (
                walkinProducts.map((p) => {
                  const qty = walkinQty[p.id] || 0;
                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.walkinRow,
                        { borderBottomColor: theme.cardBorder },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 1 }}>
                        <AppText variant="body" style={{ fontSize: 14, fontWeight: '700' }}>
                          {p.nama}
                        </AppText>
                        <AppText variant="mono" color={theme.primary} style={{ fontSize: 12.5 }}>
                          {formatRupiah(p.harga)}
                        </AppText>
                      </View>
                      <View style={styles.stepper}>
                        <PressableScale
                          onPress={() => changeWalkinQty(p.id, -1)}
                          accessibilityRole="button"
                          accessibilityLabel={`Kurangi ${p.nama}`}
                          style={[styles.stepBtn, { borderColor: theme.ink, backgroundColor: theme.surface }]}
                        >
                          <MaterialIcons name="remove" size={15} color={theme.ink} />
                        </PressableScale>
                        <AppText variant="mono" style={{ fontSize: 16 }}>
                          {qty}
                        </AppText>
                        <PressableScale
                          onPress={() => changeWalkinQty(p.id, 1)}
                          accessibilityRole="button"
                          accessibilityLabel={`Tambah ${p.nama}`}
                          style={[styles.stepBtn, { borderColor: theme.ink, backgroundColor: theme.amber }]}
                        >
                          <MaterialIcons name="add" size={15} color="#111111" />
                        </PressableScale>
                      </View>
                    </View>
                  );
                })
              )}

              {walkinError ? (
                <View
                  style={[
                    styles.errorBox,
                    { borderColor: theme.danger, backgroundColor: theme.surfaceContainerLow },
                  ]}
                >
                  <MaterialIcons name="error-outline" size={15} color={theme.danger} />
                  <AppText variant="body" color={theme.danger} style={{ fontSize: 12, flex: 1 }}>
                    {walkinError}
                  </AppText>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                label="Batal"
                variant="ghost"
                onPress={() => setWalkinVisible(false)}
                disabled={walkinSubmitting}
                style={{ flex: 1 }}
              />
              <Button
                label="Simpan"
                icon="save"
                variant="primary"
                onPress={handleWalkinSale}
                loading={walkinSubmitting}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Payment Confirmation Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={!!selectedItem}
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <Card tone="paper" accent="amber" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ gap: 2 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Konfirmasi Pembayaran
                </AppText>
                <AppText variant="h1" style={{ fontSize: 22 }}>
                  {selectedItem ? formatQueueNumber(selectedItem.nomor_antrian) : '-'}
                </AppText>
              </View>
              <Badge label={metodeBayar === 'qris' ? 'QRIS' : 'Tunai'} tone="accent" />
            </View>

            <ScrollView style={{ maxHeight: 430 }} contentContainerStyle={{ gap: 10 }} nestedScrollEnabled>
              <View
                style={[
                  styles.detailBox,
                  { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder },
                ]}
              >
                <ModalInfo
                  label="Pelanggan"
                  value={
                    selectedItem?.customer?.nama ||
                    (selectedItem as any)?.nama_customer ||
                    'Pelanggan'
                  }
                />
                {(selectedItem as any)?.kursi_nomor != null ? (
                  <ModalInfo
                    label="Kursi"
                    value={`Kursi ${(selectedItem as any).kursi_nomor}`}
                    color={theme.primary}
                  />
                ) : null}
                <ModalInfo label="Barber" value={selectedItem?.barber?.nama || '-'} />

                <View style={[styles.notaDivider, { backgroundColor: theme.cardBorder }]} />

                {selectedItem?.treatments ? (
                  <ModalInfo
                    label={selectedItem.treatments.nama}
                    value={formatRupiah(selectedItem.treatments.harga)}
                  />
                ) : null}
                {(notaItems[selectedItem?.id ?? ''] || []).map((it, idx) => (
                  <ModalInfo key={idx} label={`${it.nama} × ${it.qty}`} value={formatRupiah(it.subtotal)} />
                ))}
                {tipAmount > 0 ? <ModalInfo label="Tip" value={formatRupiah(tipAmount)} /> : null}
              </View>

              <View style={{ gap: 6 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Tip untuk Barber (tunai, opsional)
                </AppText>
                <View style={styles.tipRow}>
                  {[0, 5000, 10000, 15000].map((v) => {
                    const sel = tipPreset === v;
                    return (
                      <PressableScale
                        key={String(v)}
                        onPress={() => {
                          setTipAmount(v);
                          setTipPreset(v);
                          setCustomTip('');
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: sel }}
                        style={[
                          styles.tipChip,
                          {
                            borderColor: theme.ink,
                            backgroundColor: sel ? theme.amber : theme.surface,
                          },
                        ]}
                      >
                        <AppText variant="caption" color="#111111" style={{ fontSize: 10, letterSpacing: 0.2 }}>
                          {v === 0 ? 'Tanpa Tip' : `Rp ${v.toLocaleString('id-ID')}`}
                        </AppText>
                      </PressableScale>
                    );
                  })}
                  <View
                    style={[
                      styles.tipChip,
                      {
                        borderColor: tipPreset === null ? theme.ink : theme.cardBorder,
                        backgroundColor: theme.surface,
                        gap: 4,
                      },
                    ]}
                  >
                    <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 10, letterSpacing: 0.2 }}>
                      Custom
                    </AppText>
                    <TextInput
                      style={{
                        width: 52,
                        paddingVertical: 2,
                        fontSize: 12,
                        fontWeight: '700',
                        color: theme.ink,
                      }}
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
              </View>

              <View style={{ gap: 6 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Metode Pembayaran
                </AppText>
                <View style={styles.metodeRow}>
                  <PressableScale
                    onPress={() => setMetodeBayar('tunai')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: metodeBayar === 'tunai' }}
                    style={[
                      styles.metodeBtn,
                      metodeBayar === 'tunai'
                        ? {
                            borderColor: theme.ink,
                            backgroundColor: theme.surface,
                            borderWidth: 2.5,
                            shadowColor: theme.shadow,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                            elevation: 3,
                          }
                        : {
                            borderColor: theme.cardBorder,
                            backgroundColor: theme.surfaceContainerLow,
                          },
                    ]}
                  >
                    <MaterialIcons
                      name="payments"
                      size={18}
                      color={metodeBayar === 'tunai' ? theme.success : theme.inkMuted}
                    />
                    <AppText
                      variant="body"
                      color={metodeBayar === 'tunai' ? theme.ink : theme.inkMuted}
                      style={{ fontSize: 13, fontWeight: '700' }}
                    >
                      Tunai
                    </AppText>
                    {metodeBayar === 'tunai' ? (
                      <MaterialIcons name="check-circle" size={16} color={theme.success} />
                    ) : null}
                  </PressableScale>

                  <PressableScale
                    onPress={() => {
                      if (!selectedItem?.user_id) {
                        Alert.alert(
                          'Khusus Tunai',
                          'Penjualan walk-in tanpa akun customer tidak bisa memakai QRIS. Gunakan pembayaran tunai.'
                        );
                        return;
                      }
                      setMetodeBayar('qris');
                    }}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: metodeBayar === 'qris',
                      disabled: !selectedItem?.user_id,
                    }}
                    accessibilityLabel="Pilih pembayaran QRIS"
                    style={[
                      styles.metodeBtn,
                      metodeBayar === 'qris'
                        ? {
                            borderColor: theme.ink,
                            backgroundColor: theme.surface,
                            borderWidth: 2.5,
                            shadowColor: theme.shadow,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                            elevation: 3,
                          }
                        : {
                            borderColor: theme.cardBorder,
                            backgroundColor: theme.surfaceContainerLow,
                          },
                      !selectedItem?.user_id && { opacity: 0.55 },
                    ]}
                  >
                    <MaterialIcons
                      name="qr-code"
                      size={18}
                      color={metodeBayar === 'qris' ? theme.primary : theme.inkMuted}
                    />
                    <AppText
                      variant="body"
                      color={metodeBayar === 'qris' ? theme.ink : theme.inkMuted}
                      style={{ fontSize: 13, fontWeight: '700' }}
                    >
                      QRIS
                    </AppText>
                    {metodeBayar === 'qris' ? (
                      <MaterialIcons name="check-circle" size={16} color={theme.success} />
                    ) : null}
                  </PressableScale>
                </View>
                {selectedItem && !selectedItem.user_id ? (
                  <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 11 }}>
                    Walk-in tanpa akun customer hanya bisa dibayar tunai.
                  </AppText>
                ) : null}
              </View>

              {errorMessage ? (
                <View
                  style={[
                    styles.errorBox,
                    { borderColor: theme.danger, backgroundColor: theme.surfaceContainerLow },
                  ]}
                >
                  <MaterialIcons name="error-outline" size={15} color={theme.danger} />
                  <AppText variant="body" color={theme.danger} style={{ fontSize: 12, flex: 1 }}>
                    {errorMessage}
                  </AppText>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.totalRow, { borderTopColor: theme.cardBorder }]}>
              <AppText variant="body" style={{ fontSize: 14, fontWeight: '700' }}>
                Total
              </AppText>
              <AppText variant="mono" color={theme.primary} style={{ fontSize: 24 }}>
                {formatRupiah(selectedTotal)}
              </AppText>
            </View>

            <View style={styles.modalActions}>
              <Button
                label="Batal"
                variant="ghost"
                onPress={() => setSelectedItem(null)}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <Button
                label={metodeBayar === 'qris' ? 'Tampilkan QR' : 'Lunas'}
                icon={metodeBayar === 'qris' ? 'qr-code' : 'check'}
                variant="primary"
                onPress={handleKonfirmasiBayar}
                loading={submitting}
                style={{ flex: 1.3 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* F6.1–F6.5: Modal QRIS — QR dummy, Realtime + polling, expiry & struk */}
      <Modal
        transparent
        animationType="fade"
        visible={!!qrisState}
        onRequestClose={handleCloseQris}
      >
        <View style={styles.modalOverlay}>
          <Card
            tone="paper"
            accent={qrisState?.status === 'paid' ? 'cobalt' : 'amber'}
            style={styles.modalCard}
          >
            {qrisState ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ gap: 2 }}>
                    <AppText variant="caption" color={theme.inkMuted}>
                      Pembayaran QRIS
                    </AppText>
                    <AppText variant="h1" style={{ fontSize: 22 }}>
                      {formatQueueNumber(qrisState.item.nomor_antrian)}
                    </AppText>
                  </View>
                  <Badge
                    label={
                      qrisState.status === 'paid'
                        ? 'Lunas'
                        : qrisState.status === 'expired'
                          ? 'Kedaluwarsa'
                          : 'Menunggu'
                    }
                    tone={
                      qrisState.status === 'paid'
                        ? 'success'
                        : qrisState.status === 'expired'
                          ? 'warning'
                          : 'accent'
                    }
                  />
                </View>

                <ScrollView
                  style={{ maxHeight: 470 }}
                  contentContainerStyle={{ gap: 12 }}
                  nestedScrollEnabled
                >
                  {qrisState.status === 'waiting' ? (
                    <View style={{ alignItems: 'center', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AppText variant="caption" color={theme.inkMuted}>
                          Kode Transaksi
                        </AppText>
                        <AppText variant="mono" style={{ fontSize: 14 }}>
                          {qrisState.payload.kodeTransaksi}
                        </AppText>
                      </View>

                      <View
                        style={{
                          padding: 14,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 2,
                          borderColor: theme.ink,
                          borderRadius: 8,
                        }}
                      >
                        <QRCode
                          value={encodeQrisPayload(qrisState.payload)}
                          size={220}
                          backgroundColor="#FFFFFF"
                          color="#111111"
                        />
                      </View>

                      <AppText variant="mono" style={{ fontSize: 30 }}>
                        {formatRupiah(qrisState.total)}
                      </AppText>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <PulseDot color={theme.success} />
                        <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                          Menunggu pembayaran dari customer…
                        </AppText>
                      </View>

                      <AppText
                        variant="caption"
                        color={theme.inkMuted}
                        style={{ textAlign: 'center', fontSize: 11.5 }}
                      >
                        QR berlaku 30 menit · kedaluwarsa pukul {qrisExpiryLabel} WIB
                      </AppText>
                      <AppText
                        variant="caption"
                        color={theme.inkMuted}
                        style={{ textAlign: 'center', fontSize: 11 }}
                      >
                        Simulasi QRIS — tidak ada transaksi finansial nyata.
                      </AppText>
                    </View>
                  ) : qrisState.status === 'paid' ? (
                    <View style={{ alignItems: 'center', gap: 12 }}>
                      <Confetti active />
                      <Stamp active label="Lunas" />
                      <AppText variant="mono" style={{ fontSize: 30 }}>
                        {formatRupiah(qrisState.total)}
                      </AppText>
                      <AppText
                        variant="body"
                        color={theme.inkMuted}
                        style={{ textAlign: 'center', fontSize: 13 }}
                      >
                        Pembayaran diterima. Status antrian sudah berubah menjadi lunas.
                      </AppText>
                      <Badge label="Metode: QRIS" tone="success" />
                      {qrisState.receipt ? (
                        <View style={styles.receiptActions}>
                          <Button
                            label={receiptBusy ? 'Menyiapkan…' : 'Bagikan PDF'}
                            icon="share"
                            variant="secondary"
                            onPress={handleShareReceipt}
                            loading={receiptBusy}
                            style={{ flex: 1 }}
                          />
                          <Button
                            label="Cetak"
                            icon="print"
                            variant="dark"
                            onPress={handlePrintReceipt}
                            disabled={receiptBusy}
                            style={{ flex: 1 }}
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                      <MaterialIcons name="timer-off" size={48} color={theme.danger} />
                      <AppText variant="h2" style={{ fontSize: 20 }}>
                        QR Kedaluwarsa
                      </AppText>
                      <AppText
                        variant="body"
                        color={theme.inkMuted}
                        style={{ textAlign: 'center', fontSize: 13 }}
                      >
                        QR hanya berlaku 30 menit. Tampilkan ulang agar customer bisa memindai QR
                        baru dengan total yang sama.
                      </AppText>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  {qrisState.status === 'waiting' ? (
                    <Button
                      label="Tutup"
                      variant="ghost"
                      onPress={handleCloseQris}
                      style={{ flex: 1 }}
                    />
                  ) : qrisState.status === 'paid' ? (
                    <Button
                      label="Selesai"
                      icon="check"
                      variant="primary"
                      onPress={handleCloseQris}
                      fullWidth
                    />
                  ) : (
                    <>
                      <Button
                        label="Tutup"
                        variant="ghost"
                        onPress={handleCloseQris}
                        style={{ flex: 1 }}
                      />
                      <Button
                        label="Tampilkan Ulang"
                        icon="refresh"
                        variant="primary"
                        onPress={handleRegenerateQris}
                        style={{ flex: 1.3 }}
                      />
                    </>
                  )}
                </View>
              </>
            ) : null}
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32, gap: 16 },
  list: { gap: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1.5,
    gap: 10,
  },
  receiptActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: { width: '100%', maxWidth: 400, maxHeight: '92%', gap: 12 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailBox: { borderWidth: 1.5, borderRadius: 8, padding: 10, gap: 4 },
  notaLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  notaDivider: { height: 1.5, width: '100%', marginVertical: 4 },
  tipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tipChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metodeRow: { flexDirection: 'row', gap: 8 },
  metodeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 3,
    padding: 8,
    borderRadius: 6,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  walkinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    shadowColor: '#111111',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1.5,
  },
});

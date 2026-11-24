import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/context/ThemeContext';
import { RoleHeader } from '@/components/RoleHeader';
import { ReceiptActions } from '@/components/receipt-actions';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  historyItemTotal,
  summarizeReceiptHistory,
  type ReceiptHistorySummary,
} from '@/lib/receipt-history';
import {
  addWIBDays,
  formatWIBDate,
  formatWIBTime,
  isSameWIBDate,
  startOfDayWIBISO,
  startOfNextDayWIBISO,
} from '@/lib/waktu';
import { formatQueueNumber } from '@/lib/ticker';

interface HistoryQueueItem {
  id: string;
  nomor_antrian: number;
  nama_customer: string | null;
  kasir_id: string | null;
  barber_id: string | null;
  kursi_nomor: number | null;
  instruksi_potongan: string | null;
  tip_amount: number;
  metode_bayar: 'tunai' | 'qris' | null;
  completed_at: string | null;
  created_at: string;
  treatments: { nama: string | null; harga: number | null } | null;
  customer: { nama: string | null } | null;
  barber: { nama: string | null } | null;
}

interface HistoryProduct {
  nama: string;
  qty: number;
  subtotal: number;
}

interface ReceiptHistoryScreenProps {
  title: string;
  /** Bila diisi, query dikunci ke barber ini (layar barber). */
  barberId?: string;
  /** Tampilkan navigasi hari (layar kasir). */
  datePicker?: boolean;
}

const EMPTY_SUMMARY: ReceiptHistorySummary = {
  count: 0,
  total: 0,
  tunai: 0,
  qris: 0,
  tip: 0,
};

function rupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function SummaryStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex: 1, gap: 1 }}>
      <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
        {label}
      </AppText>
      <AppText variant="mono" color={color ?? theme.ink} style={{ fontSize: 14 }}>
        {value}
      </AppText>
    </View>
  );
}

/**
 * Riwayat transaksi lunas + struk cetak ulang.
 * Kasir memakai navigasi hari; barber hanya melihat antrian miliknya.
 */
export function ReceiptHistoryScreen({
  title,
  barberId,
  datePicker = false,
}: ReceiptHistoryScreenProps) {
  const { theme } = useAppTheme();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [rows, setRows] = useState<HistoryQueueItem[]>([]);
  const [productsByQueue, setProductsByQueue] = useState<Record<string, HistoryProduct[]>>({});
  const [summary, setSummary] = useState<ReceiptHistorySummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<HistoryQueueItem | null>(null);
  const requestRef = useRef(0);

  const fetchHistory = useCallback(
    async (mode: 'load' | 'refresh' = 'load') => {
      const requestId = ++requestRef.current;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setErrorMessage(null);

      try {
        let query = supabase
          .from('queue')
          .select(
            'id, nomor_antrian, nama_customer, kasir_id, barber_id, kursi_nomor, ' +
              'instruksi_potongan, tip_amount, metode_bayar, completed_at, created_at, ' +
              'treatments(nama, harga), customer:profiles!queue_user_id_fkey(nama), ' +
              'barber:profiles!queue_barber_id_fkey(nama)'
          )
          .eq('status', 'lunas');

        if (barberId) query = query.eq('barber_id', barberId);

        if (datePicker) {
          query = query
            .gte('completed_at', startOfDayWIBISO(selectedDate))
            .lt('completed_at', startOfNextDayWIBISO(selectedDate));
        }

        const { data, error } = await query.order('completed_at', { ascending: false });
        if (error) throw new Error(error.message);

        const list = (data as unknown as HistoryQueueItem[]) || [];
        let productMap: Record<string, HistoryProduct[]> = {};

        if (list.length > 0) {
          const { data: productRows } = await supabase
            .from('queue_products')
            .select('queue_id, qty, subtotal, products(nama)')
            .in(
              'queue_id',
              list.map((row) => row.id)
            );

          productMap = {};
          ((productRows as any[]) || []).forEach((row) => {
            const items = productMap[row.queue_id] || [];
            items.push({
              nama: row.products?.nama || 'Produk',
              qty: row.qty || 0,
              subtotal: row.subtotal || 0,
            });
            productMap[row.queue_id] = items;
          });
        }

        if (requestRef.current !== requestId) return;

        setRows(list);
        setProductsByQueue(productMap);
        setSummary(
          summarizeReceiptHistory(
            list.map((row) => ({
              treatmentHarga: row.treatments?.harga ?? null,
              productTotal: (productMap[row.id] || []).reduce(
                (sum, item) => sum + item.subtotal,
                0
              ),
              tipAmount: row.tip_amount,
              metode: row.metode_bayar,
            }))
          )
        );
      } catch (e: any) {
        if (requestRef.current !== requestId) return;
        setErrorMessage(e?.message || 'Riwayat tidak bisa dimuat.');
        setRows([]);
        setSummary(EMPTY_SUMMARY);
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [barberId, datePicker, selectedDate]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const suffix = barberId ? `barber-${barberId}` : 'kasir';
    const channel = supabase
      .channel(`riwayat-${suffix}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
        fetchHistory('refresh');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId, fetchHistory]);

  const productTotal = useCallback(
    (queueId: string) =>
      (productsByQueue[queueId] || []).reduce((sum, item) => sum + item.subtotal, 0),
    [productsByQueue]
  );

  const totalOf = useCallback(
    (row: HistoryQueueItem) =>
      historyItemTotal({
        treatmentHarga: row.treatments?.harga ?? null,
        productTotal: productTotal(row.id),
        tipAmount: row.tip_amount,
        metode: row.metode_bayar,
      }),
    [productTotal]
  );

  const today = isSameWIBDate(selectedDate, new Date());
  const selectedProducts = selected ? productsByQueue[selected.id] || [] : [];

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title={title} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchHistory('refresh')}
            tintColor={theme.ink}
          />
        }
      >
        {datePicker ? (
          <Card style={{ gap: 10 }}>
            <View style={styles.dateRow}>
              <PressableScale
                onPress={() => setSelectedDate((value) => addWIBDays(value, -1))}
                accessibilityRole="button"
                accessibilityLabel="Hari sebelumnya"
                style={[
                  styles.arrowButton,
                  { borderColor: theme.ink, backgroundColor: theme.surfaceContainerLow },
                ]}
              >
                <MaterialIcons name="chevron-left" size={22} color={theme.ink} />
              </PressableScale>

              <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <AppText variant="h2">{formatWIBDate(selectedDate.toISOString())}</AppText>
                <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
                  {today ? 'Hari Ini' : 'Arsip Transaksi'}
                </AppText>
              </View>

              <PressableScale
                onPress={() => setSelectedDate((value) => addWIBDays(value, 1))}
                disabled={today}
                accessibilityRole="button"
                accessibilityLabel="Hari berikutnya"
                style={[
                  styles.arrowButton,
                  {
                    borderColor: theme.ink,
                    backgroundColor: today ? theme.surfaceContainerHigh : theme.surfaceContainerLow,
                    opacity: today ? 0.4 : 1,
                  },
                ]}
              >
                <MaterialIcons name="chevron-right" size={22} color={theme.ink} />
              </PressableScale>
            </View>

            <Button
              label="Kembali ke Hari Ini"
              icon="today"
              variant="secondary"
              disabled={today}
              onPress={() => setSelectedDate(new Date())}
            />
          </Card>
        ) : null}

        <Card accent="cobalt" style={{ gap: 10 }}>
          <View style={{ gap: 2 }}>
            <AppText variant="caption" color={theme.inkMuted}>
              Total Omset
            </AppText>
            <AppText variant="display" style={{ fontSize: 30 }}>
              {rupiah(summary.total)}
            </AppText>
          </View>
          <Badge label={`${summary.count} TRANSAKSI`} tone="ink" />
          <View style={[styles.summaryRow, { borderTopColor: theme.cardBorder }]}>
            <SummaryStat label="Tunai" value={rupiah(summary.tunai)} />
            <SummaryStat label="QRIS" value={rupiah(summary.qris)} color={theme.info} />
            <SummaryStat label="Tip" value={rupiah(summary.tip)} color={theme.success} />
          </View>
        </Card>

        <SectionHeader
          title="Transaksi Lunas"
          subtitle={
            barberId
              ? 'Hanya layanan yang kamu tangani.'
              : 'Ketuk transaksi untuk melihat rincian dan mencetak struk.'
          }
        />

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((index) => (
              <Card key={String(index)} style={{ gap: 8 }}>
                <Skeleton width="30%" height={16} />
                <Skeleton width="70%" height={20} />
                <Skeleton width="100%" height={14} />
              </Card>
            ))}
          </View>
        ) : errorMessage ? (
          <EmptyState
            icon="cloud-off"
            title="Gagal Memuat Riwayat"
            message={errorMessage}
            actionLabel="Coba Lagi"
            onAction={() => fetchHistory()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="receipt-long"
            title="Belum Ada Transaksi"
            message={
              datePicker
                ? 'Tidak ada pembayaran lunas pada tanggal ini. Coba pilih hari lain.'
                : 'Transaksi yang sudah kamu tangani akan muncul di sini.'
            }
            actionLabel="Muat Ulang"
            onAction={() => fetchHistory('refresh')}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {rows.map((row, index) => {
              const metode = row.metode_bayar === 'qris' ? 'QRIS' : 'TUNAI';
              const customer = row.customer?.nama || row.nama_customer || 'Pelanggan';
              return (
                <Reveal key={row.id} delay={Math.min(index * 40, 200)}>
                  <Card
                    onPress={() => setSelected(row)}
                    accent={index % 2 === 0 ? 'amber' : 'cobalt'}
                    style={{ gap: 6 }}
                  >
                    <View style={styles.cardTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AppText variant="mono" style={{ fontSize: 16 }}>
                          {formatWIBTime(row.completed_at || row.created_at)}
                        </AppText>
                        <Badge label={metode} tone={row.metode_bayar === 'qris' ? 'info' : 'success'} />
                      </View>
                      <AppText variant="mono" color={theme.primary} style={{ fontSize: 15 }}>
                        {rupiah(totalOf(row))}
                      </AppText>
                    </View>

                    <AppText variant="h2" style={{ fontSize: 16 }} numberOfLines={1}>
                      {formatQueueNumber(row.nomor_antrian)} · {customer}
                    </AppText>
                    <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                      {row.treatments?.nama || 'Treatment'} · Barber {row.barber?.nama || 'Toko'}
                      {row.kursi_nomor != null ? ` · Kursi ${row.kursi_nomor}` : ''}
                    </AppText>
                  </Card>
                </Reveal>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.paper, borderColor: theme.ink, shadowColor: theme.shadow },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="h2">Detail Transaksi</AppText>
                {selected ? (
                  <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
                    {formatQueueNumber(selected.nomor_antrian)} ·{' '}
                    {formatWIBDate(selected.completed_at || selected.created_at)}
                  </AppText>
                ) : null}
              </View>
              <PressableScale
                onPress={() => setSelected(null)}
                accessibilityRole="button"
                accessibilityLabel="Tutup detail"
                style={[styles.closeButton, { borderColor: theme.ink }]}
              >
                <MaterialIcons name="close" size={18} color={theme.ink} />
              </PressableScale>
            </View>

            {selected ? (
              <ScrollView contentContainerStyle={{ gap: 12 }}>
                <Card style={{ gap: 6 }}>
                  <DetailRow label="Pelanggan" value={selected.customer?.nama || selected.nama_customer || 'Pelanggan'} />
                  <DetailRow label="Barber" value={selected.barber?.nama || 'Barber Toko'} />
                  <DetailRow
                    label="Metode"
                    value={selected.metode_bayar === 'qris' ? 'QRIS' : 'Tunai'}
                  />
                  {selected.kursi_nomor != null ? (
                    <DetailRow label="Kursi" value={String(selected.kursi_nomor)} />
                  ) : null}
                </Card>

                <Card style={{ gap: 8 }}>
                  <AppText variant="caption" color={theme.inkMuted}>
                    Rincian
                  </AppText>
                  <DetailRow
                    label={selected.treatments?.nama || 'Treatment'}
                    value={rupiah(selected.treatments?.harga || 0)}
                  />
                  {selectedProducts.map((item, index) => (
                    <DetailRow
                      key={`${item.nama}-${index}`}
                      label={`${item.nama}${item.qty ? ` × ${item.qty}` : ''}`}
                      value={rupiah(item.subtotal)}
                    />
                  ))}
                  {selected.tip_amount > 0 ? (
                    <DetailRow label="Tip" value={rupiah(selected.tip_amount)} />
                  ) : null}
                  <View style={[styles.totalRow, { borderTopColor: theme.cardBorder }]}>
                    <AppText variant="h2">Total</AppText>
                    <AppText variant="mono" color={theme.primary}>
                      {rupiah(totalOf(selected))}
                    </AppText>
                  </View>
                </Card>

                {selected.instruksi_potongan ? (
                  <Card accent="amber" style={{ gap: 4 }}>
                    <AppText variant="caption" color={theme.inkMuted}>
                      Instruksi Potongan
                    </AppText>
                    <AppText variant="body" style={{ fontSize: 13 }}>
                      {selected.instruksi_potongan}
                    </AppText>
                  </Card>
                ) : null}

                <ReceiptActions queueId={selected.id} />
                <AppText
                  variant="caption"
                  color={theme.inkMuted}
                  style={{ fontSize: 9, textAlign: 'center', textTransform: 'none' }}
                >
                  Cetak ulang memakai tanggal transaksi asli dan nama kasir yang melayani.
                </AppText>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.detailRow}>
      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13, flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="body" style={{ fontSize: 13, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1.5,
    paddingTop: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderWidth: 2,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    paddingTop: 8,
    marginTop: 2,
  },
});

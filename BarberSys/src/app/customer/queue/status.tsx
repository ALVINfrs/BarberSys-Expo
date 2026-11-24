import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile, QueueStatus } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { formatQueueNumber } from '@/lib/ticker';
import { Badge, BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PoleStrip } from '@/components/ui/pole-strip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Ticker } from '@/components/ui/ticker';
import {
  describeHoldUntil,
  formatWIBDate,
  getHoldRefreshDelayMs,
  isSameWIBDate,
} from '@/lib/waktu';

interface ExtendedQueueItem extends QueueItem {
  treatments: Treatment | null;
  barber: Profile | null;
}

function statusBadge(status: QueueStatus): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'menunggu':
      return { label: 'Menunggu Giliran', tone: 'neutral' };
    case 'dipanggil':
      return { label: 'Dipanggil Kasir', tone: 'info' };
    case 'dilayani':
      return { label: 'Sedang Dilayani', tone: 'warning' };
    case 'selesai':
      return { label: 'Selesai · Menunggu Bayar', tone: 'success' };
    default:
      return { label: status.toUpperCase(), tone: 'neutral' };
  }
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.infoRow}>
      <AppText variant="body" color={theme.inkMuted} style={styles.infoLabel}>
        {label}
      </AppText>
      <AppText
        variant="body"
        color={valueColor ?? theme.ink}
        style={styles.infoValue}
        numberOfLines={2}
      >
        {value}
      </AppText>
    </View>
  );
}

export default function StatusAntrianScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [activeQueue, setActiveQueue] = useState<ExtendedQueueItem | null>(null);
  const [currentServingNo, setCurrentServingNo] = useState<number | null>(null);
  const [totalWaitingCount, setTotalWaitingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  // F2.1: rating untuk tiket lunas yang belum dirating
  const [unratedQueue, setUnratedQueue] = useState<ExtendedQueueItem | null>(null);
  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMsg, setRatingMsg] = useState<string | null>(null);

  const fetchActiveQueue = async () => {
    if (!user) return;
    try {
      // 1. Fetch user's active queue
      const { data, error } = await supabase
        .from('queue')
        .select('*, treatments(*), barber:profiles!queue_barber_id_fkey(*)')
        .eq('user_id', user.id)
        .in('status', ['menunggu', 'dipanggil', 'dilayani', 'selesai'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching active queue:', error.message);
      } else if (data && data.length > 0) {
        setActiveQueue(data[0] as unknown as ExtendedQueueItem);
      } else {
        setActiveQueue(null);
      }

      // 2. Fetch current serving number
      const { data: servingData } = await supabase
        .from('queue')
        .select('nomor_antrian')
        .in('status', ['dipanggil', 'dilayani'])
        .order('called_at', { ascending: false })
        .limit(1);

      if (servingData && servingData.length > 0) {
        setCurrentServingNo(servingData[0].nomor_antrian);
      } else {
        setCurrentServingNo(null);
      }

      // 3. Fetch total waiting queue count (exclude hold sampai besok)
      const { data: waitData } = await supabase
        .from('queue')
        .select('id, hold_until')
        .in('status', ['menunggu', 'dipanggil', 'dilayani']);
      const nowMs = Date.now();
      const filtered =
        (waitData as any[] | null)?.filter(
          (r) => !r.hold_until || new Date(r.hold_until).getTime() <= nowMs
        ) || [];
      setTotalWaitingCount(filtered.length);

      // 4. F2.1: tiket lunas terbaru yang belum dirating — hanya jika TIDAK ada
      // antrian aktif dan lunasnya max 24 jam terakhir (abaikan data testing lama)
      const hasActive = !!(data && data.length > 0);
      if (!hasActive) {
        const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data: unratedData } = await supabase
          .from('queue')
          .select('*, treatments(*), barber:profiles!queue_barber_id_fkey(*)')
          .eq('user_id', user.id)
          .eq('status', 'lunas')
          .is('rating', null)
          .gte('completed_at', dayAgo)
          .order('completed_at', { ascending: false })
          .limit(1);

        if (unratedData && unratedData.length > 0) {
          setUnratedQueue(unratedData[0] as unknown as ExtendedQueueItem);
        } else {
          setUnratedQueue(null);
        }
      } else {
        setUnratedQueue(null);
      }
    } catch (e) {
      console.error('Exception fetching status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveQueue();

    if (!user) return;

    const channel = supabase
      .channel('customer-queue-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          fetchActiveQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // F4.2/I3: re-evaluasi saat batas hold tiba (maks. polling 60 detik).
  const activeHoldUntil = (activeQueue as any)?.hold_until as string | null | undefined;
  useEffect(() => {
    if (!activeHoldUntil) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const delay = getHoldRefreshDelayMs([activeHoldUntil]);
      if (delay == null) return;
      timer = setTimeout(() => {
        fetchActiveQueue();
        tick();
      }, delay);
    };
    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHoldUntil]);

  const handleCancelQueue = async () => {
    if (!activeQueue || !user || cancelling) return;
    if (activeQueue.status !== 'menunggu') {
      Alert.alert('Tidak bisa dibatalkan', 'Antrian hanya bisa dibatalkan saat status Menunggu.');
      return;
    }
    Alert.alert('Batalkan Antrian?', `Yakin batalkan tiket No. ${formatQueueNumber(activeQueue.nomor_antrian)}?`, [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Ya, Batalkan',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const { data, error } = await supabase
              .from('queue')
              .update({ status: 'dibatalkan' })
              .eq('id', activeQueue.id)
              .eq('user_id', user.id)
              .eq('status', 'menunggu')
              .select()
              .single();
            if (error) throw error;
            if (!data) {
              Alert.alert('Gagal', 'Antrian sudah berubah status, tidak bisa dibatalkan.');
              await fetchActiveQueue();
              return;
            }
            setActiveQueue(null);
            Alert.alert('Berhasil', 'Antrian dibatalkan.');
            await fetchActiveQueue();
          } catch (e: any) {
            console.error('Cancel failed:', e);
            Alert.alert('Gagal', e.message || 'Tidak bisa membatalkan antrian.');
            await fetchActiveQueue();
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  // F2.11: bagikan tiket via share sheet perangkat
  const [sharing, setSharing] = useState(false);
  const handleShareTicket = async () => {
    if (!activeQueue || sharing) return;
    setSharing(true);
    try {
      const no = formatQueueNumber(activeQueue.nomor_antrian);
      const kursiTxt =
        (activeQueue as any).kursi_nomor != null
          ? `Kursi ${(activeQueue as any).kursi_nomor}`
          : 'Menunggu penempatan kursi';
      const text =
        `Tiket Antrian BarberSys\n` +
        `Nomor: ${no}\n` +
        `Layanan: ${activeQueue.treatments?.nama || '-'}\n` +
        `Barber: ${activeQueue.barber?.nama || 'Siapa saja yang tersedia'}\n` +
        `Kursi: ${kursiTxt}\n` +
        `Status: ${activeQueue.status}\n` +
        `Estimasi: ±${activeQueue.treatments?.durasi_menit || 30} menit lagi`;
      const fileUri = `${cacheDirectory}tiket-${activeQueue.id}.txt`;
      await writeAsStringAsync(fileUri, text, { encoding: EncodingType.UTF8 });
      if (!(await Sharing.isAvailableAsync())) {
        setRatingMsg('Berbagi tidak tersedia di perangkat ini.');
        return;
      }
      await Sharing.shareAsync(fileUri);
    } catch (e: any) {
      console.error('Share ticket failed:', e);
    } finally {
      setSharing(false);
    }
  };

  // F2.1: kirim rating + komentar opsional
  const handleSubmitRating = async () => {
    if (!unratedQueue || rating < 1) {
      setRatingMsg('Pilih minimal 1 bintang.');
      return;
    }
    setSubmittingRating(true);
    setRatingMsg(null);
    try {
      const { error } = await supabase
        .from('queue')
        .update({ rating, komentar: komentar.trim() || null })
        .eq('id', unratedQueue.id);
      if (error) throw error;
      setUnratedQueue(null);
      setRating(0);
      setKomentar('');
    } catch (e: any) {
      setRatingMsg(e.message || 'Gagal mengirim rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const isHeld =
    (activeQueue as any)?.hold_until &&
    new Date((activeQueue as any).hold_until).getTime() > Date.now();
  const badge = isHeld
    ? { label: 'Ditahan', tone: 'warning' as BadgeTone }
    : activeQueue
      ? statusBadge(activeQueue.status)
      : { label: '-', tone: 'neutral' as BadgeTone };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Status Antrian" />

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={{ gap: 16 }}>
            <Card style={{ gap: 12 }}>
              <Skeleton width="55%" height={12} />
              <Skeleton width="35%" height={36} />
              <Skeleton width="100%" height={14} />
            </Card>
            <Card style={{ gap: 14 }}>
              <Skeleton width="40%" height={12} />
              <Skeleton width="100%" height={96} radius={8} />
              <Skeleton width="80%" height={14} />
              <Skeleton width="65%" height={14} />
            </Card>
          </View>
        ) : !activeQueue ? (
          <Reveal>
            <EmptyState
              icon="confirmation-number"
              title="Belum Ada Antrian Aktif"
              message="Anda tidak memiliki tiket antrian yang sedang berjalan saat ini."
              actionLabel="Ambil Antrian Baru"
              onAction={() => router.push('/customer/queue/new' as any)}
            />
          </Reveal>
        ) : (
          <View style={styles.content}>
            <Reveal>
              <Card tone="paper" style={{ gap: 10, padding: 0, overflow: 'hidden' }}>
                <PoleStrip height={7} animated />
                <View style={styles.liveRow}>
                  <View style={styles.liveLeft}>
                    <View
                      style={[
                        styles.pulseDot,
                        { backgroundColor: theme.success, borderColor: theme.ink },
                      ]}
                    />
                    <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.4 }}>
                      Antrian toko aktif
                    </AppText>
                    <Badge label={`${totalWaitingCount} orang`} tone="ink" />
                  </View>
                  <View style={styles.branchRow}>
                    <MaterialIcons name="store" size={15} color={theme.primary} />
                    <AppText variant="caption" color={theme.inkMuted}>
                      Senopati
                    </AppText>
                  </View>
                </View>
              </Card>
            </Reveal>

            <Reveal delay={60}>
              <Card accent="amber" style={{ gap: 14, padding: 18 }}>
                <View style={styles.ticketHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="confirmation-number" size={18} color={theme.primary} />
                    <AppText variant="caption" color={theme.inkMuted}>
                      Tiket Anda
                    </AppText>
                  </View>
                  <Badge label={badge.label} tone={badge.tone} />
                </View>

                <View
                  style={[
                    styles.numberBox,
                    {
                      backgroundColor: theme.surfaceContainerLow,
                      borderColor: theme.ink,
                    },
                  ]}
                >
                  <AppText variant="caption" color={theme.inkMuted}>
                    Nomor Antrian
                  </AppText>
                  <Ticker
                    value={formatQueueNumber(activeQueue.nomor_antrian)}
                    fontSize={56}
                    style={{ marginVertical: 2 }}
                  />
                  {!isSameWIBDate(activeQueue.created_at, new Date()) ? (
                    <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.4 }}>
                      Dibuat {formatWIBDate(activeQueue.created_at).toUpperCase()}
                    </AppText>
                  ) : null}
                  <View
                    style={[
                      styles.estPill,
                      { backgroundColor: theme.surface, borderColor: theme.ink },
                    ]}
                  >
                    <MaterialIcons name="hourglass-top" size={13} color={theme.secondary} />
                    <AppText variant="caption" color={theme.ink} style={{ letterSpacing: 0.2 }}>
                      Estimasi ±{activeQueue.treatments?.durasi_menit || 30} menit
                    </AppText>
                  </View>
                </View>

                <View
                  style={[
                    styles.servingRow,
                    { backgroundColor: theme.surface, borderColor: theme.cardBorder },
                  ]}
                >
                  <MaterialIcons name="campaign" size={18} color={theme.primary} />
                  <AppText variant="body" style={{ fontSize: 13, flex: 1 }}>
                    Sedang dilayani:{' '}
                    <AppText variant="mono" color={theme.primary} style={{ fontSize: 15 }}>
                      {currentServingNo ? formatQueueNumber(currentServingNo) : '—'}
                    </AppText>
                  </AppText>
                </View>

                {isHeld ? (
                  <View
                    style={[
                      styles.holdBox,
                      { backgroundColor: theme.amber, borderColor: theme.ink },
                    ]}
                  >
                    <MaterialIcons name="pause-circle-outline" size={18} color="#111111" />
                    <AppText
                      variant="body"
                      color="#111111"
                      style={{ fontSize: 12, lineHeight: 17, flex: 1, fontWeight: '600' }}
                    >
                      Antrian ditahan karena di luar jam operasional, dan baru diproses{' '}
                      {describeHoldUntil((activeQueue as any).hold_until)}.
                    </AppText>
                  </View>
                ) : null}

                <View style={{ gap: 7 }}>
                  <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
                  <InfoRow
                    label="Layanan"
                    value={activeQueue.treatments?.nama || 'Treatment'}
                  />
                  <InfoRow
                    label="Barber"
                    value={activeQueue.barber?.nama || 'Siapa saja yang tersedia'}
                  />
                  {(activeQueue as any).kursi_nomor != null ? (
                    <InfoRow
                      label="Kursi"
                      value={`Kursi ${(activeQueue as any).kursi_nomor}`}
                      valueColor={theme.primary}
                    />
                  ) : activeQueue.status === 'menunggu' ? (
                    <InfoRow label="Kursi" value="Menunggu penempatan kursi" />
                  ) : null}
                </View>

                {activeQueue.status === 'selesai' ? (
                  <View style={{ gap: 6 }}>
                    <Button
                      label="BAYAR DENGAN QRIS"
                      icon="qr-code-scanner"
                      variant="primary"
                      fullWidth
                      onPress={() => router.push('/scan-qris' as any)}
                    />
                    <AppText
                      variant="caption"
                      color={theme.inkMuted}
                      style={{ textAlign: 'center', fontSize: 11 }}
                    >
                      atau bayar tunai di kasir
                    </AppText>
                  </View>
                ) : null}

                <View style={styles.ticketActions}>
                  <Button
                    label={sharing ? 'Menyiapkan…' : 'Kirim Tiket'}
                    icon="share"
                    variant="secondary"
                    onPress={handleShareTicket}
                    loading={sharing}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Batalkan"
                    icon={activeQueue.status === 'menunggu' ? 'cancel' : 'lock-outline'}
                    variant="danger"
                    onPress={handleCancelQueue}
                    loading={cancelling}
                    disabled={activeQueue.status !== 'menunggu'}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            </Reveal>
          </View>
        )}
      </ScrollView>

      {/* F2.1: Bottom sheet rating (modal neo-brutalist) */}
      <Modal transparent animationType="slide" visible={!!unratedQueue} onRequestClose={() => setUnratedQueue(null)}>
        <View style={styles.ratingOverlay}>
          <Card tone="paper" accent="cobalt" style={styles.ratingCard}>
            <View style={{ gap: 4 }}>
              <AppText variant="caption" color={theme.inkMuted}>
                Rating Layanan
              </AppText>
              <AppText variant="h1" style={{ fontSize: 22 }}>
                Bagaimana pelayanan {unratedQueue?.barber?.nama || 'barber'}?
              </AppText>
              <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                {unratedQueue?.treatments?.nama || 'Layanan'} — beri bintang 1 sampai 5
              </AppText>
            </View>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <PressableScale
                  key={s}
                  onPress={() => setRating(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Beri ${s} bintang`}
                  accessibilityState={{ selected: s <= rating }}
                >
                  <MaterialIcons
                    name={s <= rating ? 'star' : 'star-border'}
                    size={38}
                    color={s <= rating ? theme.amber : theme.neutral}
                  />
                </PressableScale>
              ))}
            </View>

            <TextField
              label="Komentar (opsional)"
              placeholder="Ceritakan pengalaman Anda…"
              value={komentar}
              onChangeText={setKomentar}
              multiline
              numberOfLines={3}
            />

            {ratingMsg ? (
              <AppText variant="caption" color={theme.danger} style={{ textTransform: 'none', letterSpacing: 0.2 }}>
                {ratingMsg}
              </AppText>
            ) : null}

            <Button
              label="Kirim Rating"
              variant="primary"
              fullWidth
              onPress={handleSubmitRating}
              loading={submittingRating}
            />

            <Button
              label="Nanti Saja"
              variant="ghost"
              fullWidth
              onPress={() => setUnratedQueue(null)}
              disabled={submittingRating}
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32, gap: 16 },
  content: { gap: 16 },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  liveLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  numberBox: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 2,
  },
  estPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
  },
  holdBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
  },
  divider: { height: 1.5, width: '100%', marginBottom: 3 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  ticketActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  ratingCard: { gap: 12, paddingVertical: 20 },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 2,
  },
});

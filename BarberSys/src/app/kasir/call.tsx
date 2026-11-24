import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { getOccupiedKursi, getAvailableKursi } from '@/lib/kursi-availability';
import { formatQueueNumber } from '@/lib/ticker';
import { buildRepeatCallUpdate } from '@/lib/repeat-call';
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
import { Ticker } from '@/components/ui/ticker';

interface QueueDetail extends QueueItem {
  customer: Profile | null;
  treatments: Treatment | null;
  barber: Profile | null;
}

export default function KasirCallScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ queueId?: string }>();
  const { user } = useAuth();

  const [queueDetail, setQueueDetail] = useState<QueueDetail | null>(null);
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [jumlahKursi, setJumlahKursi] = useState(7);
  const [occupiedKursi, setOccupiedKursi] = useState<Set<number>>(new Set());
  const [selectedKursi, setSelectedKursi] = useState<number | null>(null);
  const [barberLoad, setBarberLoad] = useState<Record<string, { count: number; totalMenit: number }>>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);
  const [repeatCount, setRepeatCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!params.queueId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch queue detail
      const { data: qData, error: qErr } = await supabase
        .from('queue')
        .select('*, customer:profiles!queue_user_id_fkey(*), treatments(*), barber:profiles!queue_barber_id_fkey(*)')
        .eq('id', params.queueId)
        .single();

      if (qErr) throw qErr;

      const detail = qData as unknown as QueueDetail;
      setQueueDetail(detail);

      if (detail.barber_id) {
        setSelectedBarberId(detail.barber_id);
      }

      // 2. Fetch active barbers
      const { data: barbData, error: barbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'barber')
        .eq('status_akun', 'aktif');

      if (barbErr) throw barbErr;

      const barbList = (barbData as Profile[]) || [];
      setBarbers(barbList);

      // Default to first available barber if non pre-selected
      if (!detail.barber_id && barbList.length > 0) {
        setSelectedBarberId(barbList[0].id);
      }

      // 3. Fetch jumlah kursi + occupied kursi — default 7 (B13 + kursi 7 polish)
      const { data: shop } = await supabase.from('barbershop_settings').select('jumlah_kursi').limit(1).single();
      const j = (shop as any)?.jumlah_kursi ?? 7;
      setJumlahKursi(j);
      const { data: occData } = await supabase
        .from('queue')
        .select('kursi_nomor, status')
        .in('status', ['dipanggil', 'dilayani']);
      const occ = getOccupiedKursi((occData as any) || []);
      setOccupiedKursi(occ);
      const avail = getAvailableKursi(j, occ);
      if (avail.length > 0) setSelectedKursi(avail[0]);
      else setSelectedKursi(null);

      // 4. Beban & estimasi per barber (exclude hold, samain customer)
      const nowIso2 = new Date().toISOString();
      const { data: loadQ } = await supabase
        .from('queue')
        .select('barber_id, treatments(durasi_menit), hold_until')
        .in('status', ['menunggu', 'dipanggil', 'dilayani'])
        .not('barber_id', 'is', null)
        .or(`hold_until.is.null,hold_until.lte.${nowIso2}`);
      if (loadQ) {
        const m: Record<string, { count: number; totalMenit: number }> = {};
        ((loadQ as any[]) || []).forEach((r) => {
          const bid = r.barber_id;
          if (!bid) return;
          const cur = m[bid] || { count: 0, totalMenit: 0 };
          cur.count += 1;
          cur.totalMenit += r.treatments?.durasi_menit ?? 30;
          m[bid] = cur;
        });
        setBarberLoad(m);
      }
    } catch (e: any) {
      console.error('Error loading call screen data:', e);
      setErrorMessage(e.message || 'Gagal memuat detail antrian.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.queueId]);

  // Kembali ke dashboard tanpa menumpuk ulang layar Tabs (menghindari remount
  // layar queue dan bentrok channel realtime).
  const kembaliKeDashboard = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/kasir/queue' as any);
    }
  };

  const handleConfirmCall = async () => {
    if (!queueDetail || !selectedBarberId || !user) {
      setErrorMessage('Pilih barber tujuan terlebih dahulu.');
      return;
    }
    if (selectedKursi == null) {
      setErrorMessage('Pilih kursi (semua kursi penuh).');
      return;
    }
    const selBarber = barbers.find((b) => b.id === selectedBarberId);
    if (selBarber?.status_kerja === 'istirahat') {
      setErrorMessage('Barber istirahat tidak bisa dipanggil.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error: updateErr } = await supabase
        .from('queue')
        .update({
          status: 'dipanggil',
          barber_id: selectedBarberId,
          kasir_id: user.id,
          kursi_nomor: selectedKursi,
          called_at: new Date().toISOString(),
        })
        .eq('id', queueDetail.id);

      if (updateErr) throw updateErr;

      setCallSuccess(true);
      setRepeatCount(0);
    } catch (e: any) {
      console.error('Error calling queue:', e);
      setErrorMessage(e.message || 'Gagal memanggil antrian.');
    } finally {
      setSubmitting(false);
    }
  };

  /** Panggil ulang: hanya perbarui called_at agar notif & TV bicara lagi. */
  const handleRepeatCall = async () => {
    if (!queueDetail || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase
        .from('queue')
        .update(
          buildRepeatCallUpdate({
            queueId: queueDetail.id,
            nowIso: new Date().toISOString(),
          })
        )
        .eq('id', queueDetail.id);
      if (error) throw error;
      setRepeatCount((count) => count + 1);
    } catch (e: any) {
      console.error('Error repeating call:', e);
      setErrorMessage(e.message || 'Gagal memanggil ulang antrian.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableKursi = getAvailableKursi(jumlahKursi, occupiedKursi);
  const selectedLoad = selectedBarberId ? barberLoad[selectedBarberId] : null;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Panggil Antrian" />

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={{ gap: 16 }}>
            <Card style={{ gap: 12 }}>
              <Skeleton width="40%" height={34} />
              <Skeleton width="70%" height={20} />
              <Skeleton width="90%" height={14} />
            </Card>
            <Card style={{ gap: 10 }}>
              <Skeleton width="35%" height={16} />
              <Skeleton width="100%" height={40} radius={8} />
              <Skeleton width="100%" height={56} radius={8} />
            </Card>
          </View>
        ) : !queueDetail ? (
          <EmptyState
            icon="search-off"
            title="Antrian tidak ditemukan"
            message="ID antrian tidak valid atau data sudah tidak tersedia."
            actionLabel="Kembali ke Dashboard"
            onAction={kembaliKeDashboard}
          />
        ) : (
          <>
            <Reveal>
              <Card tone="paper" accent="cobalt" style={{ gap: 10 }}>
                <View style={styles.headerRow}>
                  <Ticker value={formatQueueNumber(queueDetail.nomor_antrian)} fontSize={44} />
                  <Badge label="Menunggu Dipanggil" tone="info" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="person-outline" size={17} color={theme.inkMuted} />
                  <AppText variant="h2" style={{ fontSize: 18 }}>
                    {queueDetail.customer?.nama || 'Pelanggan'}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="content-cut" size={16} color={theme.inkMuted} />
                  <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13, flex: 1 }}>
                    {queueDetail.treatments?.nama} · {queueDetail.treatments?.durasi_menit} mnt · Rp{' '}
                    {queueDetail.treatments?.harga.toLocaleString('id-ID')}
                  </AppText>
                </View>
              </Card>
            </Reveal>

            {/* Select Kursi — Opsi A: amber brutalist + ikon event-seat + fallback penuh */}
            <Reveal delay={60}>
              <View style={{ gap: 8 }}>
                <SectionHeader title="Pilih Kursi" subtitle={`${availableKursi.length} dari ${jumlahKursi} tersedia`} />

                {availableKursi.length === 0 ? (
                  <View
                    style={[
                      styles.kursiFullBanner,
                      { backgroundColor: theme.surfaceContainerLow, borderColor: theme.danger },
                    ]}
                  >
                    <MaterialIcons name="event-seat" size={18} color={theme.danger} />
                    <AppText
                      variant="body"
                      color={theme.danger}
                      style={{ fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 17 }}
                    >
                      Kapasitas penuh — {jumlahKursi}/{jumlahKursi} kursi terisi (
                      {[...occupiedKursi]
                        .sort((a, b) => a - b)
                        .map((x) => `Kursi ${x}`)
                        .join(', ')}
                      ). Selesaikan satu layanan dulu.
                    </AppText>
                  </View>
                ) : null}

                <View style={styles.chipWrap}>
                  {availableKursi.map((n) => {
                    const sel = selectedKursi === n;
                    return (
                      <PressableScale
                        key={n}
                        onPress={() => setSelectedKursi(n)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: sel }}
                        style={[
                          styles.kursiChip,
                          sel
                            ? {
                                backgroundColor: theme.amber,
                                borderColor: theme.ink,
                                shadowColor: theme.shadow,
                                shadowOffset: { width: 3, height: 3 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                                elevation: 3,
                              }
                            : { backgroundColor: theme.surface, borderColor: theme.cardBorder },
                        ]}
                      >
                        <MaterialIcons
                          name="event-seat"
                          size={16}
                          color={sel ? '#111111' : theme.secondary}
                        />
                        <AppText
                          variant="body"
                          color={sel ? '#111111' : theme.ink}
                          style={{ fontSize: 13, fontWeight: '700' }}
                        >
                          Kursi {n}
                        </AppText>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            </Reveal>

            {/* Select Barber */}
            <Reveal delay={110}>
              <View style={{ gap: 8 }}>
                <SectionHeader title="Tugaskan ke Barber" subtitle="Pilih barber tujuan" />

                {barbers.length === 0 ? (
                  <Card accent="crimson">
                    <AppText variant="body" color={theme.danger} style={{ fontSize: 13 }}>
                      Tidak ada barber aktif di database. Harap buat akun barber di menu Admin.
                    </AppText>
                  </Card>
                ) : (
                  barbers.map((b) => {
                    const isSelected = selectedBarberId === b.id;
                    const isRest = b.status_kerja === 'istirahat';
                    const load = barberLoad[b.id] || { count: 0, totalMenit: 0 };
                    const loadBadge = isRest
                      ? { tone: 'neutral' as const, label: 'Istirahat' }
                      : load.count === 0
                        ? { tone: 'success' as const, label: 'Tersedia' }
                        : load.count >= 5
                          ? { tone: 'danger' as const, label: `Padat · ${load.count}` }
                          : { tone: 'warning' as const, label: `Sibuk · ${load.count}` };
                    return (
                      <Card
                        key={b.id}
                        onPress={() => setSelectedBarberId(b.id)}
                        accent={isSelected ? 'amber' : undefined}
                        style={{ padding: 12, opacity: isRest ? 0.55 : 1 }}
                      >
                        <View style={styles.barberRow}>
                          <View style={{ flex: 1, gap: 3 }}>
                            <AppText variant="h2" style={{ fontSize: 15 }}>
                              {b.nama}
                            </AppText>
                            {load.count > 0 && !isRest ? (
                              <AppText
                                variant="caption"
                                color={load.count >= 5 ? theme.danger : theme.inkMuted}
                                style={{ letterSpacing: 0.2 }}
                              >
                                Estimasi ±{load.totalMenit} menit
                                {load.count >= 5 ? ' — lebih lama' : ''}
                              </AppText>
                            ) : null}
                          </View>
                          <Badge label={loadBadge.label} tone={loadBadge.tone} />
                          <MaterialIcons
                            name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                            size={20}
                            color={isSelected ? theme.primary : theme.inkMuted}
                          />
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>
            </Reveal>

            {/* Warning padat */}
            {selectedLoad && selectedLoad.count >= 3 ? (
              <View
                style={[
                  styles.warningBox,
                  {
                    backgroundColor:
                      selectedLoad.count >= 5 ? theme.surfaceContainerLow : theme.amber,
                    borderColor: selectedLoad.count >= 5 ? theme.danger : theme.ink,
                  },
                ]}
              >
                <MaterialIcons
                  name={selectedLoad.count >= 5 ? 'warning' : 'info-outline'}
                  size={18}
                  color={selectedLoad.count >= 5 ? theme.danger : '#111111'}
                />
                <AppText
                  variant="body"
                  color={selectedLoad.count >= 5 ? theme.danger : '#111111'}
                  style={{ fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 17 }}
                >
                  {selectedLoad.count >= 5
                    ? `Barber padat (${selectedLoad.count} antrian) — estimasi ±${selectedLoad.totalMenit} menit, akan lebih lama. Tetap tugaskan?`
                    : `Barber sibuk (${selectedLoad.count} antrian) — estimasi ±${selectedLoad.totalMenit} menit.`}
                </AppText>
              </View>
            ) : null}

            {/* Error message */}
            {errorMessage ? (
              <View
                style={[
                  styles.errorBox,
                  { borderColor: theme.danger, backgroundColor: theme.surfaceContainerLow },
                ]}
              >
                <MaterialIcons name="error-outline" size={16} color={theme.danger} />
                <AppText variant="body" color={theme.danger} style={{ fontSize: 12.5, flex: 1 }}>
                  {errorMessage}
                </AppText>
              </View>
            ) : null}

            <Button
              label={submitting ? 'Memanggil…' : 'Konfirmasi Panggil Sekarang'}
              icon="campaign"
              variant="dark"
              onPress={handleConfirmCall}
              loading={submitting}
              disabled={!selectedBarberId || selectedKursi == null}
              fullWidth
            />
          </>
        )}
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={callSuccess}
        onRequestClose={kembaliKeDashboard}
      >
        <View style={styles.successOverlay}>
          <Confetti active={callSuccess} count={16} />
          <Card tone="paper" accent="amber" style={styles.successCard}>
            <Stamp active label="Dipanggil" />
            <AppText variant="caption" color={theme.inkMuted} style={{ textAlign: 'center' }}>
              Nomor Antrian
            </AppText>
            <Ticker
              value={formatQueueNumber(queueDetail?.nomor_antrian ?? 0)}
              fontSize={58}
            />
            <AppText
              variant="body"
              color={theme.inkMuted}
              style={{ textAlign: 'center', fontSize: 13 }}
            >
              {repeatCount > 0
                ? `Panggilan diulang ${repeatCount}× — HP customer & TV akan berbunyi lagi.`
                : 'Panggilan terkirim ke HP customer & Display TV.'}
            </AppText>
            {errorMessage ? (
              <AppText variant="body" color={theme.danger} style={{ textAlign: 'center', fontSize: 12 }}>
                {errorMessage}
              </AppText>
            ) : null}
            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Panggil Ulang"
                  icon="campaign"
                  variant="secondary"
                  onPress={handleRepeatCall}
                  loading={submitting}
                  disabled={submitting}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Selesai"
                  icon="check"
                  variant="dark"
                  onPress={kembaliKeDashboard}
                  disabled={submitting}
                  fullWidth
                />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32, gap: 18 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kursiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 2,
    borderRadius: 8,
    minWidth: 92,
    justifyContent: 'center',
  },
  kursiFullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
  },
  barberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 3,
    padding: 9,
    borderRadius: 6,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'stretch',
    gap: 8,
    paddingVertical: 26,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});

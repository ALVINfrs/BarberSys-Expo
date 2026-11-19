import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { getOccupiedKursi, getAvailableKursi } from '@/lib/kursi-availability';

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
  }, [params.queueId]);

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

      // Navigate back to Kasir Dashboard
      router.replace('/(kasir)/queue' as any);
    } catch (e: any) {
      console.error('Error calling queue:', e);
      setErrorMessage(e.message || 'Gagal memanggil antrian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Panggil Antrian" />

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.secondary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat detail...</Text>
          </View>
        ) : !queueDetail ? (
          <View style={[styles.card, brutalistCard(theme as any)]}>
            <Text style={[styles.errorText, { color: theme.danger }]}>
              Antrian tidak ditemukan atau ID tidak valid.
            </Text>
            <TouchableOpacity
              style={[brutalistButton(theme as any, 'secondary'), { marginTop: 12 }]}
              onPress={() => router.replace('/(kasir)/queue' as any)}
            >
              <Text style={{ fontWeight: '700' }}>KEMBALI KE DASHBOARD</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Ticket Info */}
            <View style={[styles.card, brutalistCard(theme as any)]}>
              <View style={styles.headerRow}>
                <Text style={[styles.numText, Typography.monoLg, { color: theme.ink }]}>
                  No. {queueDetail.nomor_antrian}
                </Text>
                <View style={[styles.badge, { backgroundColor: theme.info }]}>
                  <Text style={styles.badgeText}>MENUNGGU DIPANGGIL</Text>
                </View>
              </View>

              <Text style={[styles.custName, { color: theme.ink }]}>
                👤 {queueDetail.customer?.nama || 'Pelanggan'}
              </Text>
              <Text style={[styles.treatmentText, { color: theme.inkMuted }]}>
                ✂️ {queueDetail.treatments?.nama} ({queueDetail.treatments?.durasi_menit} mnt) - Rp{' '}
                {queueDetail.treatments?.harga.toLocaleString('id-ID')}
              </Text>
            </View>

            {/* Select Kursi — Opsi A: amber brutalist + ikon event-seat + fallback penuh */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.ink }]}>Pilih Kursi</Text>
              {getAvailableKursi(jumlahKursi, occupiedKursi).length === 0 ? (
                <View style={[styles.kursiFullBanner, { backgroundColor: '#FFF3CD', borderColor: theme.danger }]}>
                  <MaterialIcons name="event-seat" size={18} color={theme.danger} />
                  <Text style={[styles.kursiFullText, { color: theme.danger }]}>
                    🚫 Kapasitas penuh — 7/7 kursi terisi ({[...occupiedKursi].sort((a, b) => a - b).map((x) => `Kursi ${x}`).join(', ')}) • Selesaikan 1 layanan dulu
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {getAvailableKursi(jumlahKursi, occupiedKursi).map((n) => {
                  const sel = selectedKursi === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.kursiChip,
                        sel
                          ? { backgroundColor: theme.amber, borderColor: theme.ink, shadowColor: theme.cardShadow, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 }
                          : { backgroundColor: theme.surface, borderColor: theme.cardBorder },
                      ]}
                      onPress={() => setSelectedKursi(n)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="event-seat" size={16} color={sel ? theme.ink : theme.secondary} />
                      <Text style={[styles.kursiText, { color: sel ? theme.ink : theme.ink }]}>Kursi {n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {getAvailableKursi(jumlahKursi, occupiedKursi).length === 0 ? null : (
                <Text style={[styles.kursiHint, { color: theme.inkMuted }]}>Tersedia {getAvailableKursi(jumlahKursi, occupiedKursi).length} dari {jumlahKursi} kursi</Text>
              )}
            </View>

            {/* Select Barber */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.ink }]}>
                Tugaskan Ke Barber Mana?
              </Text>

              {barbers.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.danger }]}>
                  Tidak ada barber aktif di database. Harap buat akun barber di menu Admin.
                </Text>
              ) : (
                barbers.map((b) => {
                  const isSelected = selectedBarberId === b.id;
                  const isRest = b.status_kerja === 'istirahat';
                  const load = barberLoad[b.id] || { count: 0, totalMenit: 0 };
                  const badge = isRest
                    ? { bg: theme.neutral, label: 'Istirahat', textColor: '#FFFFFF' }
                    : load.count === 0
                      ? { bg: theme.success, label: '🟢 Tersedia', textColor: '#FFFFFF' }
                      : load.count >= 5
                        ? { bg: theme.danger, label: `🔴 Padat (${load.count})`, textColor: '#FFFFFF' }
                        : { bg: theme.amber, label: `🟡 Sibuk (${load.count})`, textColor: theme.ink };
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.barberItem,
                        brutalistCard(theme as any),
                        isSelected && { borderColor: theme.secondary, borderWidth: 3 },
                        isRest && { opacity: 0.5 },
                      ]}
                      onPress={() => setSelectedBarberId(b.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.barberRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.barberName, { color: theme.ink }]}>💈 {b.nama}</Text>
                          {load.count > 0 && !isRest ? (
                            <Text style={[styles.estText, { color: load.count >= 5 ? theme.danger : theme.inkMuted }]}>
                              Estimasi ±{load.totalMenit} menit{load.count >= 5 ? ' — lebih lama karena padat' : ''}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: badge.textColor }]}>{badge.label}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Warning padat */}
            {(() => {
              const selLoad = selectedBarberId ? barberLoad[selectedBarberId] : null;
              if (!selLoad || selLoad.count < 3) return null;
              const isPadat = selLoad.count >= 5;
              return (
                <View
                  style={[
                    styles.warningBox,
                    { backgroundColor: isPadat ? '#FFE0E0' : theme.amber, borderColor: isPadat ? theme.danger : theme.ink },
                  ]}
                >
                  <MaterialIcons name={isPadat ? 'warning' : 'info-outline'} size={18} color={isPadat ? theme.danger : theme.ink} />
                  <Text style={[styles.warningText, { color: isPadat ? theme.danger : theme.ink }]}>
                    {isPadat
                      ? `Barber padat (${selLoad.count} antrian) — estimasi ±${selLoad.totalMenit} menit, akan lebih lama. Tetap tugaskan?`
                      : `Barber sibuk (${selLoad.count} antrian) — estimasi ±${selLoad.totalMenit} menit.`}
                  </Text>
                </View>
              );
            })()}

            {/* Error message */}
            {errorMessage ? (
              <View style={[styles.errorContainer, { borderColor: theme.danger }]}>
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Confirm Call Button */}
            <TouchableOpacity
              style={[
                brutalistButton(theme as any, 'primary'),
                styles.confirmBtn,
                { backgroundColor: theme.secondary, opacity: selectedBarberId && !submitting ? 1 : 0.6 },
              ]}
              onPress={handleConfirmCall}
              disabled={!selectedBarberId || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>📢 KONFIRMASI PANGGIL SEKARANG</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  card: { padding: 16, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  numText: { fontSize: 28, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  custName: { fontSize: 18, fontWeight: '800' },
  treatmentText: { fontSize: 14, marginTop: 4, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  barberItem: { padding: 14, marginBottom: 8 },
  barberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barberName: { fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  kursiChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2, borderRadius: 6, minWidth: 88, justifyContent: 'center' },
  kursiText: { fontSize: 14, fontWeight: '800' },
  kursiFullBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 6, padding: 10, marginBottom: 4 },
  kursiFullText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 },
  kursiHint: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  estText: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 6, padding: 10, marginBottom: 12 },
  warningText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 },
  errorContainer: { borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 8, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '600' },
  confirmBtn: { paddingVertical: 14 },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
});

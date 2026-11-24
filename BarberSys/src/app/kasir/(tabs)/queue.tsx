import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { filterAvailableBarbers } from '@/lib/barber-availability';
import {
  formatWIBDate,
  getHoldRefreshDelayMs,
  isSameWIBDate,
  startOfDayWIBISO,
} from '@/lib/waktu';
import { formatQueueNumber } from '@/lib/ticker';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';

interface KasirQueueItem extends QueueItem {
  customer: Profile | null;
  treatments: Treatment | null;
  barber: Profile | null;
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { theme } = useAppTheme();
  return (
    <Card style={{ flex: 1, padding: 12, gap: 2 }}>
      <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 10 }}>
        {label}
      </AppText>
      <AppText variant="mono" color={accent ?? theme.ink} style={{ fontSize: 22 }}>
        {value}
      </AppText>
    </Card>
  );
}

export default function KasirQueueDashboard() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [queueList, setQueueList] = useState<KasirQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ menunggu: 0, dilayani: 0, siapBayar: 0, omzet: 0 });
  const [walkinVisible, setWalkinVisible] = useState(false);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [walkinNama, setWalkinNama] = useState('');
  const [walkinTreatmentId, setWalkinTreatmentId] = useState<string | null>(null);
  const [walkinBarberId, setWalkinBarberId] = useState<string | null>(null);
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [walkinError, setWalkinError] = useState<string | null>(null);
  const [nextHoldUntil, setNextHoldUntil] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const dayStartIso = startOfDayWIBISO();
      const nowIso = new Date().toISOString();
      const { count: cMenunggu } = await supabase.from('queue').select('id', { count: 'exact', head: true }).eq('status', 'menunggu').or(`hold_until.is.null,hold_until.lte.${nowIso}`);
      const { count: cDilayani } = await supabase.from('queue').select('id', { count: 'exact', head: true }).eq('status', 'dilayani');
      const { count: cSiap } = await supabase.from('queue').select('id', { count: 'exact', head: true }).eq('status', 'selesai');
      const { data: lunas } = await supabase.from('queue').select('id, tip_amount, treatments(harga)').eq('status', 'lunas').gte('completed_at', dayStartIso);
      let omzet = 0;
      if (lunas && (lunas as any[]).length) {
        const ids = (lunas as any[]).map((q) => q.id);
        const { data: qp } = await supabase.from('queue_products').select('queue_id, subtotal').in('queue_id', ids);
        const map: Record<string, number> = {};
        ((qp as any[]) || []).forEach((r) => { map[r.queue_id] = (map[r.queue_id] || 0) + (r.subtotal || 0); });
        (lunas as any[]).forEach((q) => { omzet += (q.treatments?.harga || 0) + (map[q.id] || 0) + (q.tip_amount || 0); });
      }
      setStats({ menunggu: cMenunggu || 0, dilayani: cDilayani || 0, siapBayar: cSiap || 0, omzet });
    } catch {}
  };
  const fetchQueue = async () => {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('queue')
        .select('*, customer:profiles!queue_user_id_fkey(*), treatments(*), barber:profiles!queue_barber_id_fkey(*)')
        .eq('status', 'menunggu')
        .or(`hold_until.is.null,hold_until.lte.${nowIso}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching kasir queue:', error.message);
      } else {
        setQueueList((data as unknown as KasirQueueItem[]) || []);
      }

      // I3: jadwalkan refresh saat antrian hold berikutnya jatuh tempo.
      const { data: nextHold } = await supabase
        .from('queue')
        .select('hold_until')
        .eq('status', 'menunggu')
        .gt('hold_until', nowIso)
        .order('hold_until', { ascending: true })
        .limit(1)
        .maybeSingle();
      setNextHoldUntil(((nextHold as any)?.hold_until as string) || null);
      fetchStats();
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

    // Nama unik per mount: remount cepat (mis. kembali dari layar Panggil) bisa
    // menemukan channel lama yang masih ter-subscribe sehingga `.on()` melempar
    // error dan seluruh layar jadi blank.
    const channelSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const channel = supabase
      .channel(`kasir-queue-dashboard-${channelSuffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    const ch2 = supabase
      .channel(`kasir-walkin-barbers-${channelSuffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchWalkinMeta())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ch2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // F4.2/I3: antrian hold muncul otomatis saat jam buka tiba.
  useEffect(() => {
    if (!nextHoldUntil) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const delay = getHoldRefreshDelayMs([nextHoldUntil]);
      if (delay == null) {
        fetchQueue();
        return;
      }
      timer = setTimeout(() => {
        fetchQueue();
        tick();
      }, delay);
    };
    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextHoldUntil]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
    fetchWalkinMeta();
  };

  const handlePanggil = (queueId: string) => {
    router.push({
      pathname: '/kasir/call' as any,
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
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard label="Menunggu" value={String(stats.menunggu)} />
            <StatCard label="Dilayani" value={String(stats.dilayani)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard label="Siap Bayar" value={String(stats.siapBayar)} />
            <StatCard
              label="Omzet Hari Ini"
              value={`Rp ${stats.omzet.toLocaleString('id-ID')}`}
              accent={theme.primary}
            />
          </View>
        </View>

        <Reveal>
          <View style={{ gap: 8 }}>
            <SectionHeader
              title="Antrian Menunggu"
              subtitle='Tekan "Panggil" untuk menugaskan barber.'
            />
            <Button
              label="Walk-in Manual"
              icon="person-add"
              variant="secondary"
              onPress={openWalkin}
              style={{ alignSelf: 'flex-start' }}
            />
          </View>
        </Reveal>

        {loading ? (
          <View style={{ gap: 14 }}>
            {[0, 1, 2].map((index) => (
              <Card key={String(index)} style={{ gap: 10 }}>
                <Skeleton width="35%" height={16} />
                <Skeleton width="60%" height={20} />
                <Skeleton width="100%" height={14} />
                <Skeleton width="100%" height={44} radius={8} />
              </Card>
            ))}
          </View>
        ) : queueList.length === 0 ? (
          <EmptyState
            icon="coffee"
            title="Tidak Ada Antrian Menunggu"
            message="Saat ini belum ada pelanggan yang mengambil nomor antrian baru."
            actionLabel="Muat Ulang"
            onAction={() => {
              setRefreshing(true);
              fetchQueue();
            }}
          />
        ) : (
          <View style={styles.list}>
            {queueList.map((item, index) => (
              <Reveal key={item.id} delay={Math.min(index * 45, 225)}>
                <Card accent={index % 2 === 0 ? 'cobalt' : 'amber'} style={{ gap: 8 }}>
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.numBadge,
                        { backgroundColor: theme.surfaceContainerLow, borderColor: theme.ink },
                      ]}
                    >
                      <AppText variant="mono" style={{ fontSize: 18 }}>
                        {formatQueueNumber(item.nomor_antrian)}
                      </AppText>
                    </View>
                    <Badge label="Menunggu" tone="neutral" />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="person-outline" size={17} color={theme.inkMuted} />
                    <AppText variant="h2" style={{ fontSize: 17 }}>
                      {item.customer?.nama || (item as any).nama_customer || 'Pelanggan Walk-in'}
                    </AppText>
                  </View>

                  {!isSameWIBDate(item.created_at, new Date()) ? (
                    <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.3 }}>
                      Dibuat {formatWIBDate(item.created_at).toUpperCase()} · nomor dari hari itu
                    </AppText>
                  ) : null}

                  <View style={{ gap: 4 }}>
                    <View style={styles.infoRow}>
                      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                        Layanan
                      </AppText>
                      <AppText variant="body" style={{ fontSize: 13, flex: 1, textAlign: 'right' }}>
                        {item.treatments?.nama || 'Treatment'}
                      </AppText>
                    </View>
                    <View style={styles.infoRow}>
                      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                        Request Barber
                      </AppText>
                      <AppText variant="body" style={{ fontSize: 13, flex: 1, textAlign: 'right' }}>
                        {item.barber?.nama || 'Siapa saja (Bebas)'}
                      </AppText>
                    </View>
                  </View>

                  <Button
                    label="Panggil Antrian"
                    icon="campaign"
                    variant="dark"
                    onPress={() => handlePanggil(item.id)}
                    fullWidth
                  />
                </Card>
              </Reveal>
            ))}
          </View>
        )}
      </ScrollView>

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
                Tanpa Aplikasi
              </AppText>
              <AppText variant="h1" style={{ fontSize: 22 }}>
                Walk-in Manual
              </AppText>
              <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 12.5 }}>
                Daftarkan pelanggan langsung di kasir.
              </AppText>
            </View>

            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ gap: 10 }} nestedScrollEnabled>
              <TextField
                label="Nama Pelanggan"
                placeholder="Nama pelanggan"
                value={walkinNama}
                onChangeText={setWalkinNama}
                icon="person-outline"
              />

              <View style={{ gap: 5 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Treatment
                </AppText>
                {treatments.map((t) => {
                  const sel = walkinTreatmentId === t.id;
                  return (
                    <PressableScale
                      key={t.id}
                      onPress={() => setWalkinTreatmentId(t.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: sel }}
                      style={[
                        styles.pickRow,
                        {
                          borderColor: sel ? theme.ink : theme.cardBorder,
                          backgroundColor: sel ? theme.surfaceContainerLow : theme.surface,
                          borderLeftWidth: sel ? 5 : 1.5,
                          borderLeftColor: sel ? theme.primary : theme.cardBorder,
                        },
                      ]}
                    >
                      <AppText variant="body" style={{ fontSize: 13, flex: 1 }}>
                        {t.nama} — Rp {t.harga.toLocaleString('id-ID')}
                      </AppText>
                      {sel ? <MaterialIcons name="check" size={17} color={theme.primary} /> : null}
                    </PressableScale>
                  );
                })}
              </View>

              <View style={{ gap: 5 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Barber (opsional)
                </AppText>
                <PressableScale
                  onPress={() => setWalkinBarberId(null)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: walkinBarberId === null }}
                  style={[
                    styles.pickRow,
                    {
                      borderColor: walkinBarberId === null ? theme.ink : theme.cardBorder,
                      backgroundColor:
                        walkinBarberId === null ? theme.surfaceContainerLow : theme.surface,
                    },
                  ]}
                >
                  <AppText variant="body" style={{ fontSize: 13 }}>
                    Siapa saja (Bebas)
                  </AppText>
                  {walkinBarberId === null ? (
                    <MaterialIcons name="check" size={17} color={theme.primary} />
                  ) : null}
                </PressableScale>
                {filterAvailableBarbers(barbers).map((b) => {
                  const sel = walkinBarberId === b.id;
                  return (
                    <PressableScale
                      key={b.id}
                      onPress={() => setWalkinBarberId(b.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: sel }}
                      style={[
                        styles.pickRow,
                        {
                          borderColor: sel ? theme.ink : theme.cardBorder,
                          backgroundColor: sel ? theme.surfaceContainerLow : theme.surface,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {b.foto_url ? (
                          <Image
                            source={{ uri: b.foto_url }}
                            style={[styles.barberThumb, { borderColor: theme.ink }]}
                          />
                        ) : null}
                        <AppText variant="body" style={{ fontSize: 13 }}>
                          {b.nama}
                        </AppText>
                      </View>
                      {sel ? <MaterialIcons name="check" size={17} color={theme.primary} /> : null}
                    </PressableScale>
                  );
                })}
              </View>

              {walkinError ? (
                <View
                  style={[
                    styles.errorBox,
                    { borderColor: theme.danger, backgroundColor: theme.surfaceContainerLow },
                  ]}
                >
                  <MaterialIcons name="error-outline" size={15} color={theme.danger} />
                  <AppText
                    variant="body"
                    color={theme.danger}
                    style={{ fontSize: 12, flex: 1 }}
                  >
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
                onPress={handleWalkinSubmit}
                loading={walkinSubmitting}
                style={{ flex: 1 }}
              />
            </View>
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
  numBadge: {
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: { width: '100%', maxWidth: 400, maxHeight: '90%', gap: 12 },
  pickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
  },
  barberThumb: { width: 24, height: 24, borderRadius: 4, borderWidth: 1.5 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 3,
    padding: 8,
    borderRadius: 6,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
});

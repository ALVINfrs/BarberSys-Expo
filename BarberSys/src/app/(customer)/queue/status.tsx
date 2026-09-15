import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { QueueItem, Treatment, Profile, QueueStatus } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

interface ExtendedQueueItem extends QueueItem {
  treatments: Treatment | null;
  barber: Profile | null;
}

export default function StatusAntrianScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [activeQueue, setActiveQueue] = useState<ExtendedQueueItem | null>(null);
  const [currentServingNo, setCurrentServingNo] = useState<number | null>(null);
  const [totalWaitingCount, setTotalWaitingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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

      // 3. Fetch total waiting queue count
      const { count } = await supabase
        .from('queue')
        .select('id', { count: 'exact', head: true })
        .in('status', ['menunggu', 'dipanggil', 'dilayani']);

      setTotalWaitingCount(count || 0);
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
  }, [user]);

  const getStatusBadgeStyle = (status: QueueStatus) => {
    switch (status) {
      case 'menunggu':
        return { bg: theme.neutral, label: 'MENUNGGU GILIRAN' };
      case 'dipanggil':
        return { bg: theme.info, label: 'DIPANGGIL KASIR' };
      case 'dilayani':
        return { bg: theme.amber, label: 'SEDANG DILAYANI' };
      case 'selesai':
        return { bg: theme.success, label: 'SELESAI (MENUNGGU BAYAR)' };
      default:
        return { bg: theme.neutral, label: status.toUpperCase() };
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Status Antrian" />

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat status antrian...</Text>
          </View>
        ) : !activeQueue ? (
          <View style={[styles.emptyCard, brutalistCard(theme as any)]}>
            <MaterialIcons name="confirmation-number" size={48} color={theme.inkMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Belum Ada Antrian Aktif</Text>
            <Text style={[styles.emptySub, { color: theme.inkMuted }]}>
              Anda tidak memiliki tiket antrian yang sedang berjalan saat ini.
            </Text>
            <TouchableOpacity
              style={[
                brutalistButton(theme as any, 'primary'),
                { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
              ]}
              onPress={() => router.push('/(customer)/queue/new' as any)}
            >
              <MaterialIcons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnText}>AMBIL ANTRIAN BARU</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Live Barbershop Pulse Banner (Stitch Screen 4) */}
            <View style={[styles.servingBanner, brutalistCard(theme as any)]}>
              <View style={styles.bannerRow}>
                <View style={[styles.pulseDot, { backgroundColor: theme.success }]} />
                <Text style={[styles.servingLabel, { color: theme.ink }]}>
                  ANTRIAN TOKO AKTIF: {totalWaitingCount} ORANG
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="store" size={16} color={theme.primary} />
                <Text style={[styles.branchText, { color: theme.inkMuted }]}>Cabang Senopati</Text>
              </View>
            </View>

            {/* Ticket Card (Stitch Screen 4) */}
            <View style={[styles.ticketCard, brutalistCard(theme as any)]}>
              {/* Classic Neo-Brutalist Barber Pole Strip (Stitch Signature) */}
              <View style={styles.barberPoleStrip}>
                <View style={[styles.stripe, { backgroundColor: theme.primary }]} />
                <View style={[styles.stripe, { backgroundColor: '#FFFFFF' }]} />
                <View style={[styles.stripe, { backgroundColor: theme.secondary }]} />
                <View style={[styles.stripe, { backgroundColor: '#FFFFFF' }]} />
                <View style={[styles.stripe, { backgroundColor: theme.primary }]} />
                <View style={[styles.stripe, { backgroundColor: '#FFFFFF' }]} />
                <View style={[styles.stripe, { backgroundColor: theme.secondary }]} />
              </View>

              {/* Card Header Status */}
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="confirmation-number" size={20} color={theme.primary} />
                  <Text style={[styles.ticketHeaderTitle, { color: theme.ink }]}>TIKET ANDA</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusBadgeStyle(activeQueue.status).bg },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {getStatusBadgeStyle(activeQueue.status).label}
                  </Text>
                </View>
              </View>

              {/* Big Queue Number */}
              <View style={[styles.numberBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder }]}>
                <Text style={[styles.numberLabel, { color: theme.inkMuted }]}>NOMOR ANTRIAN</Text>
                <Text style={[styles.bigNumber, Typography.monoLg, { color: theme.ink }]}>
                  {activeQueue.nomor_antrian < 10 ? `A-0${activeQueue.nomor_antrian}` : `A-${activeQueue.nomor_antrian}`}
                </Text>
                <View style={[styles.estPill, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.cardBorder }]}>
                  <MaterialIcons name="hourglass-top" size={14} color={theme.secondary} />
                  <Text style={[styles.estText, { color: theme.ink }]}>
                    Estimasi: ±{activeQueue.treatments?.durasi_menit || 30} menit lagi
                  </Text>
                </View>
              </View>

              {/* Live Counter Info */}
              <View style={[styles.servingStatusRow, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder }]}>
                <MaterialIcons name="notification-important" size={18} color={theme.amber} style={{ marginTop: 1 }} />
                <Text style={[styles.servingInfoText, { color: theme.ink }]}>
                  Status Layanan: Sedang dilayani No.{' '}
                  <Text style={{ color: theme.primary, fontWeight: '800' }}>
                    {currentServingNo ? `A-0${currentServingNo}` : 'Belum Ada'}
                  </Text>
                </Text>
              </View>

              {/* Treatment Info */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Layanan:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {activeQueue.treatments?.nama || 'Treatment'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>Barber Bertugas:</Text>
                  <Text style={[styles.infoVal, { color: theme.ink }]}>
                    {activeQueue.barber?.nama || 'Siapa saja yang tersedia'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
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
  emptyCard: { padding: 28, alignItems: 'center', borderRadius: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center', lineHeight: 20 },
  content: { gap: 16 },
  servingBanner: { padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseDot: { width: 10, height: 10, borderRadius: 5 },
  servingLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  branchText: { fontSize: 12, fontWeight: '600' },
  ticketCard: { padding: 20, alignItems: 'center', overflow: 'hidden', borderRadius: 12 },
  barberPoleStrip: { flexDirection: 'row', height: 8, width: '120%', marginTop: -20, marginBottom: 16 },
  stripe: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 },
  ticketHeaderTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  numberBox: { borderWidth: 2, padding: 16, width: '100%', alignItems: 'center', marginVertical: 8, borderRadius: 8 },
  numberLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  bigNumber: { fontSize: 48, fontWeight: '800', marginVertical: 4 },
  estPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  estText: { fontSize: 12, fontWeight: '700' },
  servingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    padding: 10,
    width: '100%',
    marginVertical: 8,
    borderRadius: 8,
  },
  servingInfoText: { fontSize: 13, fontWeight: '600' },
  infoSection: { width: '100%', marginTop: 8, gap: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, fontWeight: '500' },
  infoVal: { fontSize: 13, fontWeight: '700' },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});

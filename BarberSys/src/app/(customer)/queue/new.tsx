import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Treatment, Profile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

export default function AmbilAntrianScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedTreatmentId?: string }>();
  const { user } = useAuth();

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      // 1. Fetch active treatments
      const { data: treatData, error: treatErr } = await supabase
        .from('treatments')
        .select('*')
        .eq('aktif', true)
        .order('harga', { ascending: true });

      if (treatErr) throw treatErr;
      const listTreatments = (treatData as Treatment[]) || [];
      setTreatments(listTreatments);

      // Pre-select treatment if passed from C1 params
      if (params.selectedTreatmentId) {
        const found = listTreatments.find((t) => t.id === params.selectedTreatmentId);
        if (found) setSelectedTreatment(found);
        else if (listTreatments.length > 0) setSelectedTreatment(listTreatments[0]);
      } else if (listTreatments.length > 0) {
        setSelectedTreatment(listTreatments[0]);
      }

      // 2. Fetch active barbers
      const { data: barbData, error: barbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'barber')
        .eq('status_akun', 'aktif');

      if (barbErr) throw barbErr;
      setBarbers((barbData as Profile[]) || []);
    } catch (e: any) {
      console.error('Error loading queue form data:', e);
      setErrorMessage('Gagal memuat data treatment atau barber.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.selectedTreatmentId]);

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const handleAmbilAntrian = async () => {
    if (!selectedTreatment || !user) {
      setErrorMessage('Silakan pilih treatment terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // Check if user already has an active queue
      const { data: activeQueue, error: checkErr } = await supabase
        .from('queue')
        .select('id, nomor_antrian, status')
        .eq('user_id', user.id)
        .in('status', ['menunggu', 'dipanggil', 'dilayani'])
        .limit(1);

      if (checkErr) throw checkErr;

      if (activeQueue && activeQueue.length > 0) {
        setErrorMessage(
          `Anda masih memiliki antrian aktif (No. ${activeQueue[0].nomor_antrian} - Status: ${activeQueue[0].status.toUpperCase()}). Harap selesaikan antrian sebelumnya.`
        );
        setSubmitting(false);
        return;
      }

      // Insert new queue row
      const { data: newQueue, error: insertErr } = await supabase
        .from('queue')
        .insert({
          user_id: user.id,
          treatment_id: selectedTreatment.id,
          barber_id: selectedBarberId, // null means "Siapa saja"
          status: 'menunggu',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Navigate to C3 Status Antrian
      router.replace('/(customer)/queue/status' as any);
    } catch (e: any) {
      console.error('Error inserting queue:', e);
      setErrorMessage(e.message || 'Gagal mengambil nomor antrian. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Ambil Antrian" />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loadingData ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat formulir...</Text>
          </View>
        ) : (
          <>
            {/* Section 1: Pilih Treatment (Stitch Screen 2) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionBadgeTitle}>
                  <View style={[styles.sectionNumBadge, { backgroundColor: theme.ink }]}>
                    <Text style={[styles.sectionNumText, { color: theme.surface }]}>1</Text>
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.ink }]}>Pilih Treatment</Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: theme.inkMuted }]}>Wajib (Pilih 1)</Text>
              </View>

              {treatments.map((t) => {
                const isSelected = selectedTreatment?.id === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.itemCard,
                      brutalistCard(theme as any),
                      isSelected && { borderColor: theme.primary, borderWidth: 3 },
                    ]}
                    onPress={() => setSelectedTreatment(t)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.itemTitle, { color: theme.ink }]}>{t.nama}</Text>
                          {isSelected && (
                            <MaterialIcons name="check-circle" size={18} color={theme.primary} />
                          )}
                        </View>
                        {t.deskripsi ? (
                          <Text style={[styles.itemDesc, { color: theme.inkMuted }]} numberOfLines={2}>
                            {t.deskripsi}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.itemPrice, { color: theme.primary }]}>
                          {formatRupiah(t.harga)}
                        </Text>
                        <View style={[styles.durationBadge, { backgroundColor: theme.surfaceContainerHigh }]}>
                          <Text style={[styles.durationText, { color: theme.inkMuted }]}>
                            {t.durasi_menit} Mnt
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Section 2: Pilih Barber (Stitch Screen 2) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionBadgeTitle}>
                  <View style={[styles.sectionNumBadge, { backgroundColor: theme.ink }]}>
                    <Text style={[styles.sectionNumText, { color: theme.surface }]}>2</Text>
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.ink }]}>Pilih Barber</Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: theme.inkMuted }]}>Pilihan Staf</Text>
              </View>

              {/* Option: Siapa saja (Antrian Tercepat) */}
              <TouchableOpacity
                style={[
                  styles.barberCard,
                  brutalistCard(theme as any),
                  selectedBarberId === null && { borderColor: theme.primary, borderWidth: 3 },
                ]}
                onPress={() => setSelectedBarberId(null)}
                activeOpacity={0.8}
              >
                <View style={styles.barberLeftRow}>
                  <View style={[styles.quickBarberIconBox, { backgroundColor: theme.secondary }]}>
                    <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={[styles.barberName, { color: theme.ink }]}>Siapa Saja</Text>
                    <Text style={[styles.barberSub, { color: theme.primary, fontWeight: '700' }]}>
                      Rekomendasi: Giliran Paling Cepat
                    </Text>
                  </View>
                </View>

                <MaterialIcons
                  name={selectedBarberId === null ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={22}
                  color={selectedBarberId === null ? theme.primary : theme.inkMuted}
                />
              </TouchableOpacity>

              {/* List of active barbers */}
              {barbers.map((b) => {
                const isSelected = selectedBarberId === b.id;
                const isRest = b.status_kerja === 'istirahat';
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.barberCard,
                      brutalistCard(theme as any),
                      isSelected && { borderColor: theme.primary, borderWidth: 3 },
                      isRest && { opacity: 0.5 },
                    ]}
                    onPress={() => {
                      if (isRest) {
                        Alert.alert('Barber Istirahat', `${b.nama} saat ini sedang istirahat.`);
                        return;
                      }
                      setSelectedBarberId(b.id);
                    }}
                    disabled={isRest}
                    activeOpacity={0.8}
                  >
                    <View style={styles.barberLeftRow}>
                      <Image
                        source={require('@/assets/images/barber_portrait.png')}
                        style={[styles.barberImage, { borderColor: theme.cardBorder }]}
                      />
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.barberName, { color: theme.ink }]}>{b.nama}</Text>
                          {/* Rating rata-rata dihitung di F2.2 (B5) */}
                          <Text style={[styles.barberRating, { color: theme.amber }]}>★ —</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: isRest ? theme.neutral : theme.success }]}>
                          <Text style={styles.statusBadgeText}>
                            {isRest ? 'Istirahat' : '🟢 Tersedia'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <MaterialIcons
                      name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={isSelected ? theme.primary : theme.inkMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sticky Summary & Booking Action (Stitch Screen 2) */}
            {selectedTreatment ? (
              <View style={[styles.summaryBox, brutalistCard(theme as any)]}>
                <View style={styles.summaryTopRow}>
                  <View>
                    <Text style={[styles.summaryLabel, { color: theme.inkMuted }]}>Ringkasan Total</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={[styles.totalVal, { color: theme.primary }]}>
                        {formatRupiah(selectedTreatment.harga)}
                      </Text>
                      <Text style={[styles.durationSummaryText, { color: theme.inkMuted }]}>
                        · {selectedTreatment.durasi_menit} mnt
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.summaryLabel, { color: theme.inkMuted }]}>Estimasi Dipanggil</Text>
                    <Text style={[styles.summaryEst, { color: theme.ink }]}>± 15 Menit</Text>
                  </View>
                </View>

                {errorMessage ? (
                  <View style={[styles.errorContainer, { borderColor: theme.danger }]}>
                    <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: theme.primary,
                      borderColor: theme.cardBorder,
                      opacity: submitting ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleAmbilAntrian}
                  disabled={submitting}
                  activeOpacity={0.9}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialIcons name="bookmark-add" size={22} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>AMBIL ANTRIAN SEKARANG</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 22 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionBadgeTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionNumBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sectionNumText: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { fontSize: 12, fontWeight: '600' },
  itemCard: { padding: 14, marginBottom: 10, borderRadius: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle: { fontSize: 16, fontWeight: '800' },
  itemDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  itemPrice: { fontSize: 16, fontWeight: '800' },
  durationBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  durationText: { fontSize: 11, fontWeight: '700' },
  barberCard: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barberLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickBarberIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#111111',
  },
  barberImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  barberName: { fontSize: 15, fontWeight: '800' },
  barberRating: { fontSize: 12, fontWeight: '800' },
  barberSub: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 3 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  summaryBox: { padding: 16, borderRadius: 10, marginBottom: 16, marginTop: 8 },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  totalVal: { fontSize: 22, fontWeight: '800' },
  durationSummaryText: { fontSize: 13, fontWeight: '700' },
  summaryEst: { fontSize: 13, fontWeight: '800' },
  errorContainer: { borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 6, marginBottom: 12 },
  errorText: { fontSize: 12, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#111111',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
});

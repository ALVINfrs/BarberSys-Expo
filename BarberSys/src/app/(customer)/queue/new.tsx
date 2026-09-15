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
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Treatment, Profile, Product } from '@/types/database';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  // F2.7: instruksi potongan opsional
  const [instruksi, setInstruksi] = useState('');
  const [instruksiFocused, setInstruksiFocused] = useState(false);
  // F2.2: rating rata-rata per barber { avg, count }
  const [barberRatings, setBarberRatings] = useState<Record<string, { avg: number; count: number }>>({});

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
      const barbList = (barbData as Profile[]) || [];
      setBarbers(barbList);

      // F2.2: rating rata-rata on-the-fly per barber (via RPC agregat, aman RLS)
      const { data: rateData } = await supabase.rpc('barber_rating_stats');
      if (rateData) {
        const avgMap: Record<string, { avg: number; count: number }> = {};
        ((rateData as any[]) || []).forEach((r) => {
          if (!r.barber_id) return;
          avgMap[r.barber_id] = { avg: Number(r.avg_rating), count: Number(r.rating_count) };
        });
        setBarberRatings(avgMap);
      }

      // 3. Fetch active products (F2.4 add-on)
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('aktif', true)
        .order('harga', { ascending: true });

      if (prodErr) throw prodErr;
      setProducts((prodData as Product[]) || []);
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

  const changeQty = (productId: string, delta: number) => {
    setQtyMap((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
  };

  const productsTotal = products.reduce(
    (sum, p) => sum + (qtyMap[p.id] || 0) * p.harga,
    0
  );

  const grandTotal = (selectedTreatment?.harga || 0) + productsTotal;

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
          instruksi_potongan: instruksi.trim() || null, // F2.7
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // F2.4: simpan add-on produk (qty > 0) ke queue_products
      const items = products
        .filter((p) => (qtyMap[p.id] || 0) > 0)
        .map((p) => ({
          queue_id: (newQueue as any).id,
          product_id: p.id,
          qty: qtyMap[p.id],
          subtotal: qtyMap[p.id] * p.harga,
        }));

      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from('queue_products').insert(items);
        if (itemsErr) throw itemsErr;
      }

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
                      {t.foto_url ? (
                        <Image
                          source={{ uri: t.foto_url }}
                          style={[styles.treatmentThumb, { borderColor: theme.cardBorder }]}
                        />
                      ) : null}
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
                      {b.foto_url ? (
                        <Image
                          source={{ uri: b.foto_url }}
                          style={[styles.barberImage, { borderColor: theme.cardBorder }]}
                        />
                      ) : (
                        <Image
                          source={require('@/assets/images/barber_portrait.png')}
                          style={[styles.barberImage, { borderColor: theme.cardBorder }]}
                        />
                      )}
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.barberName, { color: theme.ink }]}>{b.nama}</Text>
                          <Text style={[styles.barberRating, { color: theme.amber }]}>
                            {barberRatings[b.id]
                              ? `★ ${barberRatings[b.id].avg.toFixed(1)}`
                              : '★ —'}
                          </Text>
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

            {/* Instruksi Potongan (F2.7, PRD 13.2) */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.ink }]}>
                Instruksi Potongan <Text style={[styles.sectionSubtitle, { color: theme.inkMuted }]}>(opsional)</Text>
              </Text>
              <TextInput
                style={[
                  styles.instruksiInput,
                  {
                    backgroundColor: theme.surface,
                    borderColor: instruksiFocused ? theme.secondary : theme.cardBorder,
                    color: theme.ink,
                  },
                ]}
                placeholder="Contoh: taper fade tipis samping, atas rapikan sedikit saja"
                placeholderTextColor={theme.inkMuted}
                value={instruksi}
                onChangeText={setInstruksi}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                onFocus={() => setInstruksiFocused(true)}
                onBlur={() => setInstruksiFocused(false)}
              />
            </View>

            {/* Section 3: Add-on Grooming (F2.4, Stitch) */}
            {products.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionBadgeTitle}>
                    <View style={[styles.sectionNumBadge, { backgroundColor: theme.ink }]}>
                      <Text style={[styles.sectionNumText, { color: theme.surface }]}>3</Text>
                    </View>
                    <Text style={[styles.sectionTitle, { color: theme.ink }]}>Add-on Grooming</Text>
                  </View>
                  <Text style={[styles.sectionSubtitle, { color: theme.inkMuted }]}>Opsional</Text>
                </View>

                <View style={styles.productGrid}>
                  {products.map((p) => {
                    const qty = qtyMap[p.id] || 0;
                    return (
                      <View key={p.id} style={[styles.productCard, brutalistCard(theme as any)]}>
                        {p.foto_url ? (
                          <Image
                            source={{ uri: p.foto_url }}
                            style={[styles.productImage, { borderColor: theme.cardBorder }]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.productImagePh, { backgroundColor: theme.surfaceContainerHigh }]}>
                            <MaterialCommunityIcons name="spray-bottle" size={32} color={theme.primary} />
                          </View>
                        )}
                        <Text style={[styles.productName, { color: theme.ink }]} numberOfLines={1}>
                          {p.nama}
                        </Text>
                        <Text style={[styles.productPrice, { color: theme.primary }]}>
                          {formatRupiah(p.harga)}
                        </Text>
                        <View style={[styles.stepper, { backgroundColor: theme.surfaceContainerHigh }]}>
                          <TouchableOpacity
                            style={[styles.stepBtn, { backgroundColor: theme.surfaceContainerLowest }]}
                            onPress={() => changeQty(p.id, -1)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.stepBtnText, { color: theme.ink }]}>-</Text>
                          </TouchableOpacity>
                          <Text style={[styles.qtyText, { color: theme.ink }]}>{qty}</Text>
                          <TouchableOpacity
                            style={[styles.stepBtn, { backgroundColor: theme.surfaceContainerLowest }]}
                            onPress={() => changeQty(p.id, 1)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.stepBtnText, { color: theme.ink }]}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Sticky Summary & Booking Action (Stitch Screen 2) */}
            {selectedTreatment ? (
              <View style={[styles.summaryBox, brutalistCard(theme as any)]}>
                <View style={styles.summaryTopRow}>
                  <View>
                    <Text style={[styles.summaryLabel, { color: theme.inkMuted }]}>Ringkasan Total</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={[styles.totalVal, { color: theme.primary }]}>
                        {formatRupiah(grandTotal)}
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
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  treatmentThumb: { width: 52, height: 52, borderWidth: 2 },
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
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productCard: { width: '48%', padding: 10, borderRadius: 8 },
  productImage: { width: '100%', height: 80, borderWidth: 1.5, marginBottom: 8 },
  productImagePh: { width: '100%', height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1.5, borderColor: '#111111' },
  productName: { fontSize: 13, fontWeight: '800' },
  productPrice: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: 4, borderRadius: 6 },
  stepBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  stepBtnText: { fontSize: 16, fontWeight: '800' },
  qtyText: { fontSize: 14, fontWeight: '800' },
  instruksiInput: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 76,
    marginTop: 8,
  },
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

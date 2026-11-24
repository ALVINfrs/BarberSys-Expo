import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Modal, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Treatment, Profile, Product } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { filterAvailableBarbers, isSelectedBarberStillAvailable } from '@/lib/barber-availability';
import { isOutsideJam, getNextJamBukaISO } from '@/lib/jam-operasional';
import { computeGlobalEstimate } from '@/lib/estimasi';
import { mapQueueLoadStats, QueueLoadRow } from '@/lib/queue-load';
import { describeHoldUntil, formatJamHHMM } from '@/lib/waktu';
import { formatQueueNumber } from '@/lib/ticker';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Confetti } from '@/components/ui/confetti';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Stamp } from '@/components/ui/stamp';
import { TextField } from '@/components/ui/text-field';
import { Ticker } from '@/components/ui/ticker';

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
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState('');
  // F2.7: instruksi potongan opsional
  const [instruksi, setInstruksi] = useState('');
  // F2.2: rating rata-rata per barber { avg, count }
  const [barberRatings, setBarberRatings] = useState<Record<string, { avg: number; count: number }>>({});
  // Kursi 7 polish: beban & estimasi per barber {count, totalMenit}
  const [barberLoad, setBarberLoad] = useState<Record<string, { count: number; totalMenit: number }>>({});
  const [jamBuka, setJamBuka] = useState<string | null>(null);
  const [jamTutup, setJamTutup] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNo, setSuccessNo] = useState<number | null>(null);

  const fetchBarbersOnly = async () => {
    try {
      const { data: barbData, error: barbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'barber')
        .eq('status_akun', 'aktif');
      if (barbErr) throw barbErr;
      const barbList = (barbData as Profile[]) || [];
      setBarbers((prev) => {
        // F3.2: if selected barber became unavailable, clear and notify
        if (!isSelectedBarberStillAvailable(barbList, selectedBarberId)) {
          const stale = prev.find((b) => b.id === selectedBarberId);
          if (stale) {
            setErrorMessage(`Barber ${stale.nama} sekarang istirahat. Pilihan direset ke Siapa saja.`);
            setSelectedBarberId(null);
          }
        }
        return barbList;
      });
      const { data: rateData } = await supabase.rpc('barber_rating_stats');
      if (rateData) {
        const avgMap: Record<string, { avg: number; count: number }> = {};
        ((rateData as any[]) || []).forEach((r) => {
          if (!r.barber_id) return;
          avgMap[r.barber_id] = { avg: Number(r.avg_rating), count: Number(r.rating_count) };
        });
        setBarberRatings(avgMap);
      }
      // F4.3: beban agregat via RPC — customer tidak bisa membaca queue orang lain (RLS)
      const { data: loadData2 } = await supabase.rpc('queue_load_stats');
      setBarberLoad(mapQueueLoadStats(loadData2 as QueueLoadRow[] | null));
    } catch (e: any) {
      console.error('Error refreshing barbers:', e);
    }
  };

  const loadData = async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const { data: treatData, error: treatErr } = await supabase
        .from('treatments')
        .select('*')
        .eq('aktif', true)
        .order('harga', { ascending: true });

      if (treatErr) throw treatErr;
      const listTreatments = (treatData as Treatment[]) || [];
      setTreatments(listTreatments);

      if (params.selectedTreatmentId) {
        const found = listTreatments.find((t) => t.id === params.selectedTreatmentId);
        if (found) setSelectedTreatment(found);
        else if (listTreatments.length > 0) setSelectedTreatment(listTreatments[0]);
      } else if (listTreatments.length > 0) {
        setSelectedTreatment(listTreatments[0]);
      }

      const { data: barbData, error: barbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'barber')
        .eq('status_akun', 'aktif');

      if (barbErr) throw barbErr;
      const barbList = (barbData as Profile[]) || [];
      setBarbers(barbList);
      const { data: jamData } = await supabase.from('barbershop_settings').select('jam_buka,jam_tutup').limit(1).single();
      if (jamData) {
        setJamBuka(formatJamHHMM((jamData as any).jam_buka));
        setJamTutup(formatJamHHMM((jamData as any).jam_tutup));
      }

      const { data: rateData } = await supabase.rpc('barber_rating_stats');
      if (rateData) {
        const avgMap: Record<string, { avg: number; count: number }> = {};
        ((rateData as any[]) || []).forEach((r) => {
          if (!r.barber_id) return;
          avgMap[r.barber_id] = { avg: Number(r.avg_rating), count: Number(r.rating_count) };
        });
        setBarberRatings(avgMap);
      }
      // F4.3: beban agregat via RPC — customer tidak bisa membaca queue orang lain (RLS)
      const { data: loadQ } = await supabase.rpc('queue_load_stats');
      setBarberLoad(mapQueueLoadStats(loadQ as QueueLoadRow[] | null));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.selectedTreatmentId]);

  useFocusEffect(
    useCallback(() => {
      fetchBarbersOnly();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBarberId])
  );

  useEffect(() => {
    const channel = supabase
      .channel('ambil-antrian-barbers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchBarbersOnly();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
        fetchBarbersOnly();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarberId]);

  // Tampilkan stempel sukses sebentar, lalu pindah ke status antrian.
  useEffect(() => {
    if (successNo == null) return;
    const timer = setTimeout(() => {
      router.replace('/customer/queue/status' as any);
    }, 1200);
    return () => clearTimeout(timer);
  }, [successNo, router]);

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

  const grandTotal = (selectedTreatment?.harga || 0) + productsTotal + tipAmount;

  // F4.3: estimasi global untuk opsi "Siapa Saja" (rata-rata beban barber tersedia)
  const availableBarbers = filterAvailableBarbers(barbers);
  const globalEstimate = computeGlobalEstimate(
    availableBarbers.map((b) => b.id),
    barberLoad
  );

  const handleAmbilAntrian = async () => {
    if (!selectedTreatment || !user) {
      setErrorMessage('Silakan pilih treatment terlebih dahulu.');
      return;
    }

    // F3.2: revalidate selected barber before submit (race guard)
    if (selectedBarberId) {
      const { data: freshBarber } = await supabase
        .from('profiles')
        .select('id, status_kerja, nama')
        .eq('id', selectedBarberId)
        .single();
      if (!freshBarber || (freshBarber as any).status_kerja === 'istirahat') {
        setErrorMessage('Barber yang dipilih baru saja istirahat. Silakan pilih barber lain atau Siapa saja.');
        setSelectedBarberId(null);
        await fetchBarbersOnly();
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
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

      // F4.2 Hold: cek jam operasional WIB
      let holdUntil: string | null = null;
      try {
        let jb = jamBuka;
        let jt = jamTutup;
        if (!jb || !jt) {
          const { data: jd } = await supabase.from('barbershop_settings').select('jam_buka,jam_tutup').limit(1).single();
          jb = (jd as any)?.jam_buka || jb;
          jt = (jd as any)?.jam_tutup || jt;
        }
        if (jb && jt) {
          if (isOutsideJam(new Date(), jb, jt)) {
            holdUntil = getNextJamBukaISO(jb);
          }
        }
      } catch {}

      // Insert new queue row
      const { data: newQueue, error: insertErr } = await supabase
        .from('queue')
        .insert({
          user_id: user.id,
          treatment_id: selectedTreatment.id,
          barber_id: selectedBarberId, // null means "Siapa saja"
          status: 'menunggu',
          instruksi_potongan: instruksi.trim() || null, // F2.7
          hold_until: holdUntil,
          tip_amount: tipAmount,
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

      setSuccessNo((newQueue as any).nomor_antrian);
    } catch (e: any) {
      console.error('Error inserting queue:', e);
      setErrorMessage(e.message || 'Gagal mengambil nomor antrian. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOutsideOperatingHours = (() => {
    if (!jamBuka || !jamTutup) return false;
    return isOutsideJam(new Date(), jamBuka, jamTutup);
  })();

  const selectedLoad = selectedBarberId ? barberLoad[selectedBarberId] : null;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Ambil Antrian" />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loadingData ? (
          <View style={{ gap: 16 }}>
            {[0, 1, 2].map((section) => (
              <Card key={String(section)} style={{ gap: 12 }}>
                <Skeleton width="50%" height={18} />
                <Skeleton width="100%" height={64} radius={8} />
                <Skeleton width="100%" height={64} radius={8} />
              </Card>
            ))}
          </View>
        ) : (
          <>
            <Reveal>
              <View style={styles.introRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="caption" color={theme.inkMuted}>
                    Formulir Antrian
                  </AppText>
                  <AppText variant="h1" style={{ fontSize: 22 }}>
                    Siapkan kursi Anda
                  </AppText>
                </View>
                <Badge label={`${availableBarbers.length} barber siap`} tone="success" />
              </View>
            </Reveal>

            {errorMessage ? (
              <View
                style={[
                  styles.errorBanner,
                  { borderColor: theme.danger, backgroundColor: theme.surfaceContainerLow },
                ]}
              >
                <MaterialIcons name="error-outline" size={17} color={theme.danger} />
                <AppText
                  variant="body"
                  color={theme.danger}
                  style={{ fontSize: 12.5, flex: 1, lineHeight: 18 }}
                >
                  {errorMessage}
                </AppText>
              </View>
            ) : null}

            {/* Section 1: Pilih Treatment */}
            <Reveal delay={40}>
              <View style={{ gap: 10 }}>
                <SectionHeader title="1. Layanan" subtitle="Wajib pilih satu treatment" />

                {treatments.map((t) => {
                  const isSelected = selectedTreatment?.id === t.id;
                  return (
                    <Card
                      key={t.id}
                      onPress={() => setSelectedTreatment(t)}
                      accent={isSelected ? 'amber' : undefined}
                      style={{ padding: 14 }}
                    >
                      <View style={styles.itemRow}>
                        {t.foto_url ? (
                          <Image
                            source={{ uri: t.foto_url }}
                            style={[styles.treatmentThumb, { borderColor: theme.ink }]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.treatmentThumb,
                              styles.thumbPlaceholder,
                              { borderColor: theme.ink, backgroundColor: theme.surfaceContainerHigh },
                            ]}
                          >
                            <MaterialIcons name="content-cut" size={22} color={theme.inkMuted} />
                          </View>
                        )}
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText variant="h2" style={{ flexShrink: 1 }}>
                              {t.nama}
                            </AppText>
                            {isSelected ? (
                              <MaterialIcons name="check-circle" size={17} color={theme.primary} />
                            ) : null}
                          </View>
                          {t.deskripsi ? (
                            <AppText
                              variant="body"
                              color={theme.inkMuted}
                              style={{ fontSize: 12, lineHeight: 17 }}
                              numberOfLines={2}
                            >
                              {t.deskripsi}
                            </AppText>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <AppText variant="mono" color={theme.primary} style={{ fontSize: 15 }}>
                            {formatRupiah(t.harga)}
                          </AppText>
                          <Badge label={`${t.durasi_menit} mnt`} tone="neutral" />
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            </Reveal>

            {/* Section 2: Pilih Barber */}
            <Reveal delay={80}>
              <View style={{ gap: 10 }}>
                <SectionHeader title="2. Barber" subtitle="Pilihan staf" />

                <Card
                  onPress={() => setSelectedBarberId(null)}
                  accent={selectedBarberId === null ? 'cobalt' : undefined}
                  style={{ padding: 12 }}
                >
                  <View style={styles.optionRow}>
                    <View
                      style={[
                        styles.quickIcon,
                        { backgroundColor: theme.secondary, borderColor: theme.ink },
                      ]}
                    >
                      <MaterialCommunityIcons name="lightning-bolt" size={22} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="h2" style={{ fontSize: 16 }}>
                        Siapa Saja
                      </AppText>
                      <AppText variant="body" color={theme.primary} style={{ fontSize: 12, fontWeight: '700' }}>
                        Giliran tercepat
                        {globalEstimate > 0 ? ` · ±${globalEstimate} menit` : ''}
                      </AppText>
                    </View>
                    <MaterialIcons
                      name={selectedBarberId === null ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={selectedBarberId === null ? theme.primary : theme.inkMuted}
                    />
                  </View>
                </Card>

                {/* F3.2: hanya barber tersedia — istirahat disembunyikan (PRD F3.2) */}
                {availableBarbers.map((b) => {
                  const isSelected = selectedBarberId === b.id;
                  const load = barberLoad[b.id] || { count: 0, totalMenit: 0 };
                  const loadBadge =
                    load.count === 0
                      ? { tone: 'success' as const, label: 'Tersedia' }
                      : load.count >= 5
                        ? { tone: 'danger' as const, label: `Padat · ${load.count} antrian` }
                        : { tone: 'warning' as const, label: `Sibuk · ${load.count} antrian` };
                  return (
                    <Card
                      key={b.id}
                      onPress={() => setSelectedBarberId(b.id)}
                      accent={isSelected ? 'amber' : undefined}
                      style={{ padding: 12 }}
                    >
                      <View style={styles.optionRow}>
                        <Image
                          source={
                            b.foto_url
                              ? { uri: b.foto_url }
                              : require('@/assets/images/barber_portrait.png')
                          }
                          style={[styles.barberImage, { borderColor: theme.ink }]}
                        />
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText variant="h2" style={{ fontSize: 15 }}>
                              {b.nama}
                            </AppText>
                            <AppText variant="caption" color={theme.amber} style={{ letterSpacing: 0.2 }}>
                              {barberRatings[b.id] ? `★ ${barberRatings[b.id].avg.toFixed(1)}` : '★ —'}
                            </AppText>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Badge label={loadBadge.label} tone={loadBadge.tone} />
                            {load.count > 0 ? (
                              <AppText
                                variant="caption"
                                color={load.count >= 5 ? theme.danger : theme.inkMuted}
                                style={{ letterSpacing: 0.2 }}
                              >
                                ±{load.totalMenit} mnt
                              </AppText>
                            ) : null}
                          </View>
                        </View>
                        <MaterialIcons
                          name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={22}
                          color={isSelected ? theme.primary : theme.inkMuted}
                        />
                      </View>
                    </Card>
                  );
                })}
              </View>
            </Reveal>

            {/* Instruksi Potongan (F2.7, PRD 13.2) */}
            <Reveal delay={110}>
              <Card style={{ gap: 8 }}>
                <SectionHeader title="Instruksi Potongan" subtitle="Opsional" />
                <TextField
                  placeholder="Contoh: taper fade tipis samping, atas rapikan sedikit saja"
                  value={instruksi}
                  onChangeText={setInstruksi}
                  multiline
                  numberOfLines={3}
                />
              </Card>
            </Reveal>

            {/* Section 3: Add-on Grooming (F2.4) */}
            {products.length > 0 ? (
              <Reveal delay={140}>
                <View style={{ gap: 10 }}>
                  <SectionHeader title="3. Produk Tambahan" subtitle="Opsional" />
                  <View style={styles.productGrid}>
                    {products.map((p) => {
                      const qty = qtyMap[p.id] || 0;
                      const isActive = qty > 0;
                      return (
                        <Card
                          key={p.id}
                          accent={isActive ? 'cobalt' : undefined}
                          style={{ width: '48%', padding: 10, gap: 6 }}
                        >
                          {p.foto_url ? (
                            <Image
                              source={{ uri: p.foto_url }}
                              style={[styles.productImage, { borderColor: theme.ink }]}
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={[
                                styles.productImage,
                                styles.thumbPlaceholder,
                                { backgroundColor: theme.surfaceContainerHigh, borderColor: theme.ink },
                              ]}
                            >
                              <MaterialCommunityIcons name="spray-bottle" size={30} color={theme.primary} />
                            </View>
                          )}
                          <AppText variant="h2" style={{ fontSize: 14 }} numberOfLines={1}>
                            {p.nama}
                          </AppText>
                          <AppText variant="mono" color={theme.primary} style={{ fontSize: 13 }}>
                            {formatRupiah(p.harga)}
                          </AppText>
                          <View style={styles.stepper}>
                            <PressableScale
                              onPress={() => changeQty(p.id, -1)}
                              accessibilityRole="button"
                              accessibilityLabel={`Kurangi ${p.nama}`}
                              style={[
                                styles.stepBtn,
                                { backgroundColor: theme.surface, borderColor: theme.ink },
                              ]}
                            >
                              <MaterialIcons name="remove" size={16} color={theme.ink} />
                            </PressableScale>
                            <AppText variant="mono" style={{ fontSize: 16 }}>
                              {qty}
                            </AppText>
                            <PressableScale
                              onPress={() => changeQty(p.id, 1)}
                              accessibilityRole="button"
                              accessibilityLabel={`Tambah ${p.nama}`}
                              style={[
                                styles.stepBtn,
                                { backgroundColor: theme.amber, borderColor: theme.ink },
                              ]}
                            >
                              <MaterialIcons name="add" size={16} color="#111111" />
                            </PressableScale>
                          </View>
                        </Card>
                      );
                    })}
                  </View>
                </View>
              </Reveal>
            ) : null}

            {/* Ringkasan & aksi */}
            {selectedTreatment ? (
              <Reveal delay={170}>
                <Card tone="paper" accent="cobalt" style={{ gap: 12 }}>
                  <SectionHeader title="Ringkasan" subtitle="Periksa sebelum ambil nomor" />

                  <View style={styles.summaryTopRow}>
                    <View>
                      <AppText variant="caption" color={theme.inkMuted}>
                        Total
                      </AppText>
                      <AppText variant="mono" color={theme.primary} style={{ fontSize: 26, lineHeight: 30 }}>
                        {formatRupiah(grandTotal)}
                      </AppText>
                      <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.2 }}>
                        {selectedTreatment.durasi_menit} menit layanan
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <AppText variant="caption" color={theme.inkMuted}>
                        Estimasi Dipanggil
                      </AppText>
                      <AppText variant="h2" style={{ fontSize: 16 }}>
                        {(() => {
                          const menit = selectedBarberId
                            ? barberLoad[selectedBarberId]?.totalMenit || 0
                            : globalEstimate;
                          return menit > 0 ? `± ${menit} Menit` : 'Tersedia';
                        })()}
                      </AppText>
                    </View>
                  </View>

                  <View style={{ gap: 6 }}>
                    <AppText variant="caption" color={theme.inkMuted}>
                      Tip untuk Barber (opsional)
                    </AppText>
                    <View style={styles.tipRow}>
                      {[0, 5000, 10000, 15000].map((v) => {
                        const sel = tipAmount === v && customTip === '';
                        return (
                          <PressableScale
                            key={String(v)}
                            onPress={() => {
                              setTipAmount(v);
                              setCustomTip('');
                            }}
                            accessibilityRole="button"
                            style={[
                              styles.tipChip,
                              {
                                borderColor: theme.ink,
                                backgroundColor: sel ? theme.amber : theme.surface,
                              },
                            ]}
                          >
                            <AppText
                              variant="caption"
                              color="#111111"
                              style={{ letterSpacing: 0.2, fontSize: 10 }}
                            >
                              {v === 0 ? 'Tanpa Tip' : `Rp ${v.toLocaleString('id-ID')}`}
                            </AppText>
                          </PressableScale>
                        );
                      })}
                      <View
                        style={[
                          styles.tipChip,
                          {
                            borderColor: customTip !== '' ? theme.ink : theme.cardBorder,
                            backgroundColor: theme.surface,
                            gap: 4,
                          },
                        ]}
                      >
                        <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.2, fontSize: 10 }}>
                          Custom
                        </AppText>
                        <TextInput
                          placeholder="0"
                          keyboardType="numeric"
                          value={customTip}
                          onChangeText={(t) => {
                            const n = t.replace(/[^0-9]/g, '');
                            setCustomTip(n);
                            setTipAmount(n ? parseInt(n, 10) : 0);
                          }}
                          placeholderTextColor={theme.inkMuted}
                          style={{
                            width: 52,
                            paddingVertical: 2,
                            fontSize: 12,
                            fontWeight: '700',
                            color: theme.ink,
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {isOutsideOperatingHours ? (
                    <View
                      style={[
                        styles.warningBox,
                        { backgroundColor: theme.amber, borderColor: theme.ink },
                      ]}
                    >
                      <MaterialIcons name="pause-circle-outline" size={18} color="#111111" />
                      <AppText
                        variant="body"
                        color="#111111"
                        style={{ fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 17 }}
                      >
                        Di luar jam operasional {jamBuka}–{jamTutup} WIB. Antrian ditahan dan baru diproses{' '}
                        {describeHoldUntil(getNextJamBukaISO(jamBuka as string))}. Tetap ambil?
                      </AppText>
                    </View>
                  ) : null}

                  {selectedLoad && selectedLoad.count >= 3 ? (
                    <View
                      style={[
                        styles.warningBox,
                        {
                          backgroundColor: selectedLoad.count >= 5 ? theme.surfaceContainerLow : theme.amber,
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
                          ? `Barber padat (${selectedLoad.count} antrian) — estimasi ±${selectedLoad.totalMenit} menit, akan lebih lama. Tetap pilih?`
                          : `Barber sibuk (${selectedLoad.count} antrian) — estimasi ±${selectedLoad.totalMenit} menit.`}
                      </AppText>
                    </View>
                  ) : null}

                  <Button
                    label={submitting ? 'Memproses…' : 'Ambil Antrian Sekarang'}
                    icon="bookmark-add"
                    onPress={handleAmbilAntrian}
                    loading={submitting}
                    fullWidth
                  />

                  <AppText
                    variant="caption"
                    color={theme.inkMuted}
                    style={{ textAlign: 'center', letterSpacing: 0.2 }}
                  >
                    Nomor aktif sampai layanan selesai dibayar.
                  </AppText>
                </Card>
              </Reveal>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal transparent animationType="fade" visible={successNo != null}>
        <View style={styles.successOverlay}>
          <Confetti active={successNo != null} count={18} />
          <Card tone="paper" accent="amber" style={styles.successCard}>
            <Stamp active label="Tiket Dibuat" />
            <AppText variant="caption" color={theme.inkMuted} style={{ textAlign: 'center' }}>
              Nomor Antrian Anda
            </AppText>
            <Ticker value={formatQueueNumber(successNo ?? 0)} fontSize={62} />
            <AppText
              variant="body"
              color={theme.inkMuted}
              style={{ textAlign: 'center', fontSize: 13 }}
            >
              Mengalihkan ke status antrian…
            </AppText>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 40, gap: 18 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderLeftWidth: 3,
    padding: 10,
    borderRadius: 6,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  treatmentThumb: { width: 52, height: 52, borderWidth: 2, borderRadius: 6 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barberImage: { width: 44, height: 44, borderRadius: 8, borderWidth: 2 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productImage: { width: '100%', height: 76, borderWidth: 2, borderRadius: 6 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    padding: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
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
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tipChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
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
    maxWidth: 340,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 26,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Treatment } from '@/types/database';
import { RoleHeader } from '@/components/RoleHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Reveal } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { PoleStrip } from '@/components/ui/pole-strip';

export default function CustomerHomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTreatments = async () => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('treatments')
        .select('*')
        .eq('aktif', true)
        .order('harga', { ascending: true });

      if (err) throw err;
      setTreatments((data as Treatment[]) || []);
    } catch (e: any) {
      console.error('Error fetching treatments:', e);
      setError('Gagal memuat daftar treatment. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTreatments();
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const handleSelectTreatment = (treatment: Treatment) => {
    router.push({
      pathname: '/customer/queue/new' as any,
      params: { selectedTreatmentId: treatment.id },
    });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Daftar Layanan" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Reveal>
          <View
            style={[
              styles.hero,
              {
                backgroundColor: theme.paper,
                borderColor: theme.ink,
                shadowColor: theme.shadowAccent,
              },
            ]}
          >
            <AppText variant="caption" color={theme.inkMuted}>
              BARBERSYS
            </AppText>
            <AppText variant="display" style={{ fontSize: 30, lineHeight: 33 }}>
              Pilih gaya, kami siapkan kursinya
            </AppText>
            <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
              Pilih layanan yang Anda inginkan untuk langsung mengambil nomor antrian.
            </AppText>
            <PoleStrip height={7} animated style={{ borderRadius: 3, marginTop: 6 }} />
          </View>
        </Reveal>

        {loading ? (
          <View style={{ gap: 14 }}>
            {[0, 1, 2].map((index) => (
              <Card key={String(index)} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Skeleton width={56} height={56} radius={6} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={12} />
                  </View>
                </View>
                <Skeleton width="100%" height={12} />
                <Skeleton width="85%" height={12} />
              </Card>
            ))}
          </View>
        ) : error ? (
          <Card accent="crimson" style={{ alignItems: 'center', gap: 10 }}>
            <AppText variant="h2" color={theme.danger} style={{ textAlign: 'center' }}>
              Gagal memuat
            </AppText>
            <AppText variant="body" color={theme.inkMuted} style={{ textAlign: 'center', fontSize: 13 }}>
              {error}
            </AppText>
            <Button label="Coba Lagi" onPress={fetchTreatments} fullWidth />
          </Card>
        ) : treatments.length === 0 ? (
          <EmptyState
            icon="content-cut"
            title="Belum ada treatment"
            message="Saat ini belum ada layanan aktif dari barbershop. Coba muat ulang sebentar lagi."
            actionLabel="Muat Ulang"
            onAction={fetchTreatments}
          />
        ) : (
          <View style={styles.treatmentList}>
            {treatments.map((t, index) => (
              <Reveal key={t.id} delay={Math.min(index * 45, 240)}>
                <Card
                  accent={index % 2 === 0 ? 'amber' : 'cobalt'}
                  onPress={() => handleSelectTreatment(t)}
                >
                  <View style={styles.cardTopRow}>
                    {t.foto_url ? (
                      <Image
                        source={{ uri: t.foto_url }}
                        style={[styles.thumb, { borderColor: theme.ink }]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.thumb,
                          styles.thumbPlaceholder,
                          { borderColor: theme.ink, backgroundColor: theme.surfaceContainerHigh },
                        ]}
                      >
                        <MaterialIcons name="content-cut" size={24} color={theme.inkMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="h2">{t.nama}</AppText>
                      <AppText
                        variant="mono"
                        color={theme.primary}
                        style={{ fontSize: 16 }}
                      >
                        {formatRupiah(t.harga)}
                      </AppText>
                    </View>
                  </View>

                  {t.deskripsi ? (
                    <AppText
                      variant="body"
                      color={theme.inkMuted}
                      style={{ fontSize: 13, marginTop: 10, lineHeight: 19 }}
                    >
                      {t.deskripsi}
                    </AppText>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Badge label={`${t.durasi_menit} menit`} tone="neutral" />
                    <AppText
                      variant="caption"
                      color={theme.secondary}
                      style={{ letterSpacing: 0.6 }}
                    >
                      Pilih layanan ini →
                    </AppText>
                  </View>
                </Card>
              </Reveal>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32, gap: 16 },
  hero: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    gap: 4,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  treatmentList: { gap: 14 },
  cardTopRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderWidth: 2, borderRadius: 6 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
});

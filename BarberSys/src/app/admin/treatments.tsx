import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, Switch, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Treatment } from '@/types/database';
import { RoleHeader } from '@/components/RoleHeader';
import { pickAndUploadPhoto, isPickerCancelled } from '@/lib/upload-photo';
import { useAppTheme } from '@/context/ThemeContext';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PoleStrip } from '@/components/ui/pole-strip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';

export default function AdminTreatmentsScreen() {
  const { theme } = useAppTheme();

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [harga, setHarga] = useState('');
  const [durasi, setDurasi] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [aktif, setAktif] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTreatments = async () => {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .order('nama', { ascending: true });

      if (error) {
        console.error('Error fetching treatments:', error.message);
      } else {
        setTreatments((data as Treatment[]) || []);
      }
    } catch (e) {
      console.error('Exception fetching treatments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setNama('');
    setHarga('');
    setDurasi('');
    setDeskripsi('');
    setFotoUrl(null);
    setAktif(true);
    setErrorMsg(null);
    setModalVisible(true);
  };

  const openEditModal = (t: Treatment) => {
    setEditingId(t.id);
    setNama(t.nama);
    setHarga(t.harga.toString());
    setDurasi(t.durasi_menit.toString());
    setDeskripsi(t.deskripsi || '');
    setFotoUrl(t.foto_url);
    setAktif(t.aktif);
    setErrorMsg(null);
    setModalVisible(true);
  };

  // F2.9: unggah foto treatment ke bucket `treatments`
  const handlePickPhoto = async () => {
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadPhoto('treatments', 'treatment');
      setFotoUrl(url);
    } catch (e) {
      if (!isPickerCancelled(e)) {
        setErrorMsg(e instanceof Error ? e.message : 'Gagal mengunggah foto.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveTreatment = async () => {
    setErrorMsg(null);

    if (!nama.trim() || !harga.trim() || !durasi.trim()) {
      setErrorMsg('Nama, Harga, dan Durasi wajib diisi.');
      return;
    }

    const hargaNum = parseInt(harga.trim(), 10);
    const durasiNum = parseInt(durasi.trim(), 10);

    if (isNaN(hargaNum) || hargaNum < 0) {
      setErrorMsg('Harga harus berupa angka positif.');
      return;
    }

    if (isNaN(durasiNum) || durasiNum <= 0) {
      setErrorMsg('Durasi harus berupa angka positif.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        nama: nama.trim(),
        harga: hargaNum,
        durasi_menit: durasiNum,
        deskripsi: deskripsi.trim() || null,
        foto_url: fotoUrl,
        aktif,
      };

      if (editingId) {
        // UPDATE
        const { error } = await supabase.from('treatments').update(payload).eq('id', editingId);

        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase.from('treatments').insert(payload);

        if (error) throw error;
      }

      setModalVisible(false);
      fetchTreatments();
    } catch (e: any) {
      console.error('Error saving treatment:', e);
      setErrorMsg(e.message || 'Gagal menyimpan data treatment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');
  const aktifCount = treatments.filter((t) => t.aktif).length;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kelola Treatment" />

      <ScrollView contentContainerStyle={styles.container}>
        <Reveal>
          <Card tone="paper" accent="amber" style={{ gap: 10 }}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Katalog Layanan
                </AppText>
                <AppText variant="h1">Treatment</AppText>
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                  Atur layanan, harga, dan durasi pengerjaan.
                </AppText>
              </View>
              <Badge label={`${aktifCount} aktif`} tone="success" />
            </View>
            <PoleStrip height={6} animated style={{ borderRadius: 3 }} />
            <Button
              label="Tambah Treatment"
              icon="add"
              variant="primary"
              onPress={openAddModal}
              fullWidth
            />
          </Card>
        </Reveal>

        <SectionHeader
          title="Daftar Treatment"
          subtitle={`${treatments.length} layanan terdaftar`}
        />

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((index) => (
              <Card key={String(index)} style={{ gap: 10 }}>
                <Skeleton width="55%" height={20} />
                <Skeleton width="35%" height={12} />
                <Skeleton width="100%" height={14} />
              </Card>
            ))}
          </View>
        ) : treatments.length === 0 ? (
          <EmptyState
            icon="content-cut"
            title="Belum Ada Treatment"
            message="Tambahkan layanan pertama agar pelanggan bisa memilih saat mengambil antrian."
            actionLabel="Tambah Treatment"
            onAction={openAddModal}
          />
        ) : (
          <View style={styles.list}>
            {treatments.map((t, index) => (
              <Reveal key={t.id} delay={Math.min(index * 40, 200)}>
                <Card
                  onPress={() => openEditModal(t)}
                  accent={t.aktif ? undefined : 'crimson'}
                  style={{ gap: 8, opacity: t.aktif ? 1 : 0.7 }}
                >
                  <View style={styles.cardRow}>
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
                        <MaterialIcons name="content-cut" size={22} color={theme.inkMuted} />
                      </View>
                    )}

                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={styles.cardHeader}>
                        <AppText variant="h2" style={{ flex: 1 }}>
                          {t.nama}
                        </AppText>
                        <Badge
                          label={t.aktif ? 'Aktif' : 'Nonaktif'}
                          tone={t.aktif ? 'success' : 'neutral'}
                        />
                      </View>
                      <View style={styles.metaRow}>
                        <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.2 }}>
                          {t.durasi_menit} menit
                        </AppText>
                        <AppText variant="mono" color={theme.primary} style={{ fontSize: 14 }}>
                          {formatRupiah(t.harga)}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {t.deskripsi ? (
                    <AppText
                      variant="body"
                      color={theme.inkMuted}
                      style={{ fontSize: 12.5, lineHeight: 18 }}
                      numberOfLines={2}
                    >
                      {t.deskripsi}
                    </AppText>
                  ) : null}
                </Card>
              </Reveal>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Form Tambah / Edit */}
      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Card tone="paper" accent="amber" style={styles.modalCard}>
              <View style={{ gap: 2 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  {editingId ? 'Ubah Layanan' : 'Layanan Baru'}
                </AppText>
                <AppText variant="h1" style={{ fontSize: 22 }}>
                  {editingId ? 'Edit Treatment' : 'Tambah Treatment'}
                </AppText>
              </View>

              <PressableScale
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
                accessibilityRole="button"
                accessibilityLabel="Tambah atau ganti foto treatment"
                style={[
                  styles.photoBox,
                  { borderColor: theme.ink, backgroundColor: theme.surfaceContainerLow },
                ]}
              >
                {fotoUrl ? (
                  <Image source={{ uri: fotoUrl }} style={styles.photoPreview} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="add-a-photo" size={24} color={theme.primary} />
                    <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.2 }}>
                      {uploadingPhoto ? 'Mengunggah…' : 'Tap untuk tambah foto'}
                    </AppText>
                  </View>
                )}
              </PressableScale>

              <TextField
                label="Nama Treatment"
                placeholder="Contoh: Premium Haircut"
                value={nama}
                onChangeText={setNama}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Harga (Rupiah)"
                    placeholder="50000"
                    keyboardType="number-pad"
                    value={harga}
                    onChangeText={setHarga}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Durasi (Menit)"
                    placeholder="30"
                    keyboardType="number-pad"
                    value={durasi}
                    onChangeText={setDurasi}
                  />
                </View>
              </View>

              <TextField
                label="Deskripsi (Opsional)"
                placeholder="Penjelasan singkat layanan…"
                multiline
                numberOfLines={3}
                value={deskripsi}
                onChangeText={setDeskripsi}
              />

              <View
                style={[
                  styles.switchRow,
                  { borderColor: theme.cardBorder, backgroundColor: theme.surfaceContainerLow },
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="caption" color={theme.inkMuted}>
                    Status
                  </AppText>
                  <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                    {aktif ? 'Aktif — tampil di katalog' : 'Nonaktif — disembunyikan'}
                  </AppText>
                </View>
                <Switch
                  value={aktif}
                  onValueChange={setAktif}
                  trackColor={{ true: theme.success, false: theme.neutral }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {errorMsg ? (
                <View
                  style={[
                    styles.errorBox,
                    { borderColor: theme.danger, backgroundColor: theme.surfaceContainerLow },
                  ]}
                >
                  <MaterialIcons name="error-outline" size={15} color={theme.danger} />
                  <AppText variant="body" color={theme.danger} style={{ fontSize: 12, flex: 1 }}>
                    {errorMsg}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Button
                  label="Batal"
                  variant="ghost"
                  onPress={() => setModalVisible(false)}
                  disabled={submitting}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Simpan"
                  icon="save"
                  variant="primary"
                  onPress={handleSaveTreatment}
                  loading={submitting}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32, gap: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  list: { gap: 12 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderWidth: 2, borderRadius: 6 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalScroll: { flexGrow: 1, justifyContent: 'center', width: '100%' },
  modalCard: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 12 },
  photoBox: {
    height: 120,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
  },
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

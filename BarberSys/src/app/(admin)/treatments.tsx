import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Treatment } from '@/types/database';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, brutalistInput } from '@/constants/theme';
import { pickAndUploadPhoto, isPickerCancelled } from '@/lib/upload-photo';
import { useAppTheme } from '@/context/ThemeContext';

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

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kelola Treatment" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heading, { color: theme.ink }]}>Katalog Treatment</Text>
            <Text style={[styles.subheading, { color: theme.inkMuted }]}>
              Kelola daftar layanan, harga, dan durasi pengerjaan.
            </Text>
          </View>
          <TouchableOpacity
            style={[brutalistButton(theme as any, 'primary'), styles.addBtn]}
            onPress={openAddModal}
          >
            <Text style={styles.addBtnText}>+ TAMBAH</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat data...</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {treatments.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.card, brutalistCard(theme as any), !t.aktif && { opacity: 0.6 }]}
                onPress={() => openEditModal(t)}
                activeOpacity={0.8}
              >
                <View style={styles.cardRow}>
                  {t.foto_url ? (
                    <Image
                      source={{ uri: t.foto_url }}
                      style={[styles.thumb, { borderColor: theme.cardBorder }]}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.treatmentTitle, { color: theme.ink }]}>{t.nama}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: t.aktif ? theme.success : theme.neutral },
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>{t.aktif ? 'AKTIF' : 'NONAKTIF'}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {t.deskripsi ? (
                  <Text style={[styles.descText, { color: theme.inkMuted }]}>{t.deskripsi}</Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={[styles.durasiText, { color: theme.inkMuted }]}>
                    ⏱ {t.durasi_menit} menit
                  </Text>
                  <Text style={[styles.priceText, { color: theme.primary }]}>
                    {formatRupiah(t.harga)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Form Tambah / Edit */}
      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            <View style={[styles.modalCard, brutalistCard(theme as any)]}>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>
                {editingId ? 'Edit Treatment' : 'Tambah Treatment Baru'}
              </Text>

              <TouchableOpacity
                style={[styles.photoBox, { borderColor: theme.cardBorder, backgroundColor: theme.surfaceContainerLow }]}
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.8}
              >
                {fotoUrl ? (
                  <Image source={{ uri: fotoUrl }} style={styles.photoPreview} resizeMode="cover" />
                ) : (
                  <Text style={[styles.photoHint, { color: theme.inkMuted }]}>
                    {uploadingPhoto ? 'Mengunggah...' : '📷 Tap untuk tambah foto treatment'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Nama Treatment</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="Contoh: Premium Haircut"
                  placeholderTextColor={theme.inkMuted}
                  value={nama}
                  onChangeText={setNama}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Harga (Rupiah)</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="50000"
                  placeholderTextColor={theme.inkMuted}
                  keyboardType="number-pad"
                  value={harga}
                  onChangeText={setHarga}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Durasi (Menit)</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="30"
                  placeholderTextColor={theme.inkMuted}
                  keyboardType="number-pad"
                  value={durasi}
                  onChangeText={setDurasi}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Deskripsi (Opsional)</Text>
                <TextInput
                  style={[brutalistInput(theme as any), { height: 70 }]}
                  placeholder="Penjelasan singkat layanan..."
                  placeholderTextColor={theme.inkMuted}
                  multiline
                  value={deskripsi}
                  onChangeText={setDeskripsi}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.ink }]}>Status Aktif:</Text>
                <Switch value={aktif} onValueChange={setAktif} trackColor={{ true: theme.success }} />
              </View>

              {errorMsg ? (
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMsg}</Text>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'ghost'), { flex: 1 }]}
                  onPress={() => setModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={{ fontWeight: '700' }}>BATAL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[brutalistButton(theme as any, 'primary'), { flex: 1, opacity: submitting ? 0.6 : 1 }]}
                  onPress={handleSaveTreatment}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>SIMPAN</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: '800' },
  subheading: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  addBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  list: { gap: 12 },
  card: { padding: 16 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 6 },
  thumb: { width: 56, height: 56, borderWidth: 2 },
  photoBox: { height: 120, borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoHint: { fontSize: 13, fontWeight: '600' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  treatmentTitle: { fontSize: 17, fontWeight: '800', flex: 1 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 10 },
  descText: { fontSize: 13, marginBottom: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  durasiText: { fontSize: 13, fontWeight: '600' },
  priceText: { fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 400, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  errorText: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

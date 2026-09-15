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
import { Product } from '@/types/database';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, brutalistInput } from '@/constants/theme';
import { pickAndUploadPhoto, isPickerCancelled } from '@/lib/upload-photo';
import { useAppTheme } from '@/context/ThemeContext';

export default function AdminProductsScreen() {
  const { theme } = useAppTheme();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [harga, setHarga] = useState('');
  const [kategori, setKategori] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [aktif, setAktif] = useState(true);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('nama', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error.message);
      } else {
        setProducts((data as Product[]) || []);
      }
    } catch (e) {
      console.error('Exception fetching products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setNama('');
    setHarga('');
    setKategori('');
    setFotoUrl(null);
    setAktif(true);
    setErrorMsg(null);
    setModalVisible(true);
  };

  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    setNama(p.nama);
    setHarga(p.harga.toString());
    setKategori(p.kategori || '');
    setFotoUrl(p.foto_url);
    setAktif(p.aktif);
    setErrorMsg(null);
    setModalVisible(true);
  };

  const handlePickPhoto = async () => {
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadPhoto('products', 'product');
      setFotoUrl(url);
    } catch (e) {
      if (!isPickerCancelled(e)) {
        setErrorMsg(e instanceof Error ? e.message : 'Gagal mengunggah foto.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProduct = async () => {
    setErrorMsg(null);

    if (!nama.trim() || !harga.trim()) {
      setErrorMsg('Nama dan Harga wajib diisi.');
      return;
    }

    const hargaNum = parseInt(harga.trim(), 10);
    if (isNaN(hargaNum) || hargaNum < 0) {
      setErrorMsg('Harga harus berupa angka positif.');
      return;
    }

    setSubmitting(true);

    const payload = {
      nama: nama.trim(),
      harga: hargaNum,
      kategori: kategori.trim() || null,
      foto_url: fotoUrl,
      aktif,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }

      setModalVisible(false);
      fetchProducts();
    } catch (e: any) {
      console.error('Error saving product:', e);
      setErrorMsg(e.message || 'Gagal menyimpan data produk.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kelola Produk" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heading, { color: theme.ink }]}>Katalog Produk Retail</Text>
            <Text style={[styles.subheading, { color: theme.inkMuted }]}>
              Kelola produk add-on (pomade, powder, dll).
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
        ) : products.length === 0 ? (
          <View style={[styles.emptyCard, brutalistCard(theme as any)]}>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Belum Ada Produk</Text>
            <Text style={[styles.emptySub, { color: theme.inkMuted }]}>
              Klik tombol "+ TAMBAH" untuk menambah produk retail pertama.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {products.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.card, brutalistCard(theme as any), !p.aktif && { opacity: 0.6 }]}
                onPress={() => openEditModal(p)}
                activeOpacity={0.8}
              >
                <View style={styles.cardRow}>
                  {p.foto_url ? (
                    <Image
                      source={{ uri: p.foto_url }}
                      style={[styles.thumb, { borderColor: theme.cardBorder }]}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.productTitle, { color: theme.ink }]}>{p.nama}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: p.aktif ? theme.success : theme.neutral },
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>{p.aktif ? 'AKTIF' : 'NONAKTIF'}</Text>
                      </View>
                    </View>
                    {p.kategori ? (
                      <View style={[styles.catBadge, { backgroundColor: theme.accentAmber }]}>
                        <Text style={styles.catBadgeText}>{p.kategori}</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.priceText, { color: theme.primary }]}>
                      {formatRupiah(p.harga)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            <View style={[styles.modalCard, brutalistCard(theme as any)]}>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>
                {editingId ? 'Edit Produk' : 'Tambah Produk Baru'}
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
                    {uploadingPhoto ? 'Mengunggah...' : '📷 Tap untuk tambah foto produk'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Nama Produk</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="Contoh: Matte Pomade"
                  placeholderTextColor={theme.inkMuted}
                  value={nama}
                  onChangeText={setNama}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Harga (Rupiah)</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="45000"
                  placeholderTextColor={theme.inkMuted}
                  keyboardType="number-pad"
                  value={harga}
                  onChangeText={setHarga}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Kategori (Opsional)</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="pomade / powder / haircare"
                  placeholderTextColor={theme.inkMuted}
                  value={kategori}
                  onChangeText={setKategori}
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
                  onPress={handleSaveProduct}
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
  emptyCard: { padding: 28, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  list: { gap: 12 },
  card: { padding: 14 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  productTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 10 },
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  catBadgeText: { color: '#111111', fontWeight: '800', fontSize: 11 },
  priceText: { fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 400, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  photoBox: { height: 120, borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoHint: { fontSize: 13, fontWeight: '600' },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  errorText: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, Switch, Image } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';
import { RoleHeader } from '@/components/RoleHeader';
import { pickAndUploadPhoto, isPickerCancelled } from '@/lib/upload-photo';
import { useAppTheme } from '@/context/ThemeContext';
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
  const aktifCount = products.filter((p) => p.aktif).length;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kelola Produk" />

      <ScrollView contentContainerStyle={styles.container}>
        <Reveal>
          <Card tone="paper" accent="cobalt" style={{ gap: 10 }}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Katalog Retail
                </AppText>
                <AppText variant="h1">Produk Add-on</AppText>
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                  Pomade, powder, dan haircare untuk pelanggan.
                </AppText>
              </View>
              <Badge label={`${aktifCount} aktif`} tone="success" />
            </View>
            <Button
              label="Tambah Produk"
              icon="add"
              variant="dark"
              onPress={openAddModal}
              fullWidth
            />
          </Card>
        </Reveal>

        <SectionHeader
          title="Daftar Produk"
          subtitle={`${products.length} produk terdaftar`}
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
        ) : products.length === 0 ? (
          <EmptyState
            icon="spa"
            title="Belum Ada Produk"
            message="Tambahkan produk retail pertama agar bisa dijual sebagai add-on atau walk-in."
            actionLabel="Tambah Produk"
            onAction={openAddModal}
          />
        ) : (
          <View style={styles.list}>
            {products.map((p, index) => (
              <Reveal key={p.id} delay={Math.min(index * 40, 200)}>
                <Card
                  onPress={() => openEditModal(p)}
                  accent={p.aktif ? undefined : 'crimson'}
                  style={{ gap: 8, opacity: p.aktif ? 1 : 0.7 }}
                >
                  <View style={styles.cardRow}>
                    {p.foto_url ? (
                      <Image
                        source={{ uri: p.foto_url }}
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
                        <MaterialCommunityIcons
                          name="spray-bottle"
                          size={24}
                          color={theme.inkMuted}
                        />
                      </View>
                    )}

                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.cardHeader}>
                        <AppText variant="h2" style={{ flex: 1 }}>
                          {p.nama}
                        </AppText>
                        <Badge
                          label={p.aktif ? 'Aktif' : 'Nonaktif'}
                          tone={p.aktif ? 'success' : 'neutral'}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {p.kategori ? <Badge label={p.kategori} tone="accent" /> : null}
                        <AppText variant="mono" color={theme.primary} style={{ fontSize: 14 }}>
                          {formatRupiah(p.harga)}
                        </AppText>
                      </View>
                    </View>
                  </View>
                </Card>
              </Reveal>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Card tone="paper" accent="cobalt" style={styles.modalCard}>
              <View style={{ gap: 2 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  {editingId ? 'Ubah Produk' : 'Produk Baru'}
                </AppText>
                <AppText variant="h1" style={{ fontSize: 22 }}>
                  {editingId ? 'Edit Produk' : 'Tambah Produk'}
                </AppText>
              </View>

              <PressableScale
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
                accessibilityRole="button"
                accessibilityLabel="Tambah atau ganti foto produk"
                style={[
                  styles.photoBox,
                  { borderColor: theme.ink, backgroundColor: theme.surfaceContainerLow },
                ]}
              >
                {fotoUrl ? (
                  <Image source={{ uri: fotoUrl }} style={styles.photoPreview} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="add-a-photo" size={24} color={theme.secondary} />
                    <AppText variant="caption" color={theme.inkMuted} style={{ letterSpacing: 0.2 }}>
                      {uploadingPhoto ? 'Mengunggah…' : 'Tap untuk tambah foto'}
                    </AppText>
                  </View>
                )}
              </PressableScale>

              <TextField
                label="Nama Produk"
                placeholder="Contoh: Matte Pomade"
                value={nama}
                onChangeText={setNama}
              />

              <TextField
                label="Harga (Rupiah)"
                placeholder="45000"
                keyboardType="number-pad"
                value={harga}
                onChangeText={setHarga}
              />

              <TextField
                label="Kategori (Opsional)"
                placeholder="pomade / powder / haircare"
                value={kategori}
                onChangeText={setKategori}
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
                    {aktif ? 'Aktif — bisa dijual' : 'Nonaktif — disembunyikan'}
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
                  onPress={handleSaveProduct}
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

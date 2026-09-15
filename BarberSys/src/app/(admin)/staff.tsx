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
  Alert,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, AccountStatus } from '@/types/database';
import { RoleHeader } from '@/components/RoleHeader';
import { brutalistCard, brutalistButton, brutalistInput } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

export default function AdminStaffScreen() {
  const { theme } = useAppTheme();

  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [role, setRole] = useState<'barber' | 'kasir'>('barber');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['barber', 'kasir'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching staff profiles:', error.message);
      } else {
        setStaffList((data as Profile[]) || []);
      }
    } catch (e) {
      console.error('Exception fetching staff:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openAddModal = () => {
    setNama('');
    setEmail('');
    setNoHp('');
    setRole('barber');
    setPassword('');
    setErrorMsg(null);
    setModalVisible(true);
  };

  const handleCreateStaff = async () => {
    setErrorMsg(null);

    if (!nama.trim() || !email.trim() || !noHp.trim() || !password) {
      setErrorMsg('Seluruh field wajib diisi.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password minimal 8 karakter.');
      return;
    }

    setSubmitting(true);

    try {
      // Use secondary client without session persistence so Admin session is not replaced
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      const tempSupabase = createClient(url, key, { auth: { persistSession: false } });

      const { data: authData, error: authErr } = await tempSupabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nama: nama.trim(),
            no_hp: noHp.trim(),
            role,
          },
        },
      });

      if (authErr) throw authErr;

      const newUserId = authData.user?.id;
      if (newUserId) {
        // Ensure profile role is explicitly updated to barber/kasir
        await supabase
          .from('profiles')
          .update({
            role,
            nama: nama.trim(),
            no_hp: noHp.trim(),
            status_akun: 'aktif',
          })
          .eq('id', newUserId);
      }

      setModalVisible(false);
      fetchStaff();
      Alert.alert('Sukses', `Akun pegawai ${nama} (${role.toUpperCase()}) berhasil dibuat!`);
    } catch (e: any) {
      console.error('Error creating staff account:', e);
      setErrorMsg(e.message || 'Gagal membuat akun pegawai.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staffId: string, currentStatus: AccountStatus) => {
    const newStatus: AccountStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status_akun: newStatus })
        .eq('id', staffId);

      if (error) throw error;
      fetchStaff();
    } catch (e: any) {
      console.error('Error toggling staff status:', e);
      Alert.alert('Gagal', 'Tidak dapat mengubah status akun.');
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kelola Pegawai" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heading, { color: theme.ink }]}>Akun Pegawai (Barber & Kasir)</Text>
            <Text style={[styles.subheading, { color: theme.inkMuted }]}>
              Buat dan kelola status akun staf toko.
            </Text>
          </View>
          <TouchableOpacity
            style={[brutalistButton(theme as any, 'primary'), styles.addBtn]}
            onPress={openAddModal}
          >
            <Text style={styles.addBtnText}>+ TAMBAH PEGAWAI</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.inkMuted }]}>Memuat staf...</Text>
          </View>
        ) : staffList.length === 0 ? (
          <View style={[styles.emptyCard, brutalistCard(theme as any)]}>
            <Text style={[styles.emptyIcon]}>👥</Text>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Belum Ada Akun Pegawai</Text>
            <Text style={[styles.emptySub, { color: theme.inkMuted }]}>
              Klik tombol "+ Tambah Pegawai" untuk membuatkan akun Kasir atau Barber baru.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {staffList.map((staf) => {
              const isBarber = staf.role === 'barber';
              const isActive = staf.status_akun === 'aktif';
              return (
                <View
                  key={staf.id}
                  style={[styles.card, brutalistCard(theme as any), !isActive && { opacity: 0.6 }]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.stafName, { color: theme.ink }]}>👤 {staf.nama}</Text>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: isBarber ? theme.amber : theme.secondary },
                      ]}
                    >
                      <Text style={styles.roleBadgeText}>{staf.role.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={[styles.infoText, { color: theme.inkMuted }]}>Email: {staf.email}</Text>
                  <Text style={[styles.infoText, { color: theme.inkMuted }]}>
                    No HP: {staf.no_hp || '-'}
                  </Text>

                  <View style={[styles.cardFooter, { borderTopColor: theme.cardBorder }]}>
                    <Text
                      style={[
                        styles.statusText,
                        { color: isActive ? theme.success : theme.danger },
                      ]}
                    >
                      Status Akun: {isActive ? 'AKTIF' : 'NONAKTIF'}
                    </Text>

                    <Switch
                      value={isActive}
                      onValueChange={() => handleToggleStatus(staf.id, staf.status_akun)}
                      trackColor={{ true: theme.success, false: theme.neutral }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Form Tambah Pegawai */}
      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            <View style={[styles.modalCard, brutalistCard(theme as any)]}>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>Tambah Akun Pegawai Baru</Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Nama Lengkap Pegawai</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="Contoh: Andi Barberman"
                  placeholderTextColor={theme.inkMuted}
                  value={nama}
                  onChangeText={setNama}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Email Login</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="andi@barbersys.com"
                  placeholderTextColor={theme.inkMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Nomor HP</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="081234567890"
                  placeholderTextColor={theme.inkMuted}
                  keyboardType="number-pad"
                  value={noHp}
                  onChangeText={setNoHp}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Role Pegawai</Text>
                <View style={styles.rolePickerRow}>
                  <TouchableOpacity
                    style={[
                      styles.rolePickerBtn,
                      brutalistCard(theme as any),
                      role === 'barber' && { borderColor: theme.amber, borderWidth: 3 },
                    ]}
                    onPress={() => setRole('barber')}
                  >
                    <Text style={[styles.rolePickerText, { color: theme.ink }]}>💈 BARBER</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rolePickerBtn,
                      brutalistCard(theme as any),
                      role === 'kasir' && { borderColor: theme.secondary, borderWidth: 3 },
                    ]}
                    onPress={() => setRole('kasir')}
                  >
                    <Text style={[styles.rolePickerText, { color: theme.ink }]}>💳 KASIR</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.ink }]}>Password Sementara (Min. 8 Karakter)</Text>
                <TextInput
                  style={[brutalistInput(theme as any)]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.inkMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
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
                  onPress={handleCreateStaff}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>BUAT AKUN</Text>
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
  heading: { fontSize: 18, fontWeight: '800' },
  subheading: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  addBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  emptyCard: { padding: 28, alignItems: 'center' },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  list: { gap: 12 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  stafName: { fontSize: 17, fontWeight: '800', flex: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  roleBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  infoText: { fontSize: 13, marginBottom: 2, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  statusText: { fontSize: 13, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 400, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  rolePickerRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  rolePickerBtn: { flex: 1, padding: 10, alignItems: 'center' },
  rolePickerText: { fontSize: 13, fontWeight: '800' },
  errorText: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

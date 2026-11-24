import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, Switch, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Profile, AccountStatus } from '@/types/database';
import { RoleHeader } from '@/components/RoleHeader';
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
      // Wajib via Edge Function agar sesi Admin tidak ter-replace (UC-04/AD2)
      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: {
          nama: nama.trim(),
          email: email.trim(),
          no_hp: noHp.trim(),
          role,
          password,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

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

  const barberCount = staffList.filter((s) => s.role === 'barber').length;
  const kasirCount = staffList.filter((s) => s.role === 'kasir').length;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title="Kelola Pegawai" />

      <ScrollView contentContainerStyle={styles.container}>
        <Reveal>
          <Card tone="paper" accent="crimson" style={{ gap: 10 }}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Tim Toko
                </AppText>
                <AppText variant="h1">Pegawai</AppText>
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                  Buat dan kelola akun barber serta kasir.
                </AppText>
              </View>
              <Badge label={`${staffList.length} akun`} tone="ink" />
            </View>

            <View style={styles.countRow}>
              <View style={styles.countPill}>
                <AppText variant="mono" style={{ fontSize: 15 }}>
                  {barberCount}
                </AppText>
                <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 10 }}>
                  BARBER
                </AppText>
              </View>
              <View style={styles.countPill}>
                <AppText variant="mono" style={{ fontSize: 15 }}>
                  {kasirCount}
                </AppText>
                <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 10 }}>
                  KASIR
                </AppText>
              </View>
            </View>

            <Button
              label="Tambah Pegawai"
              icon="person-add"
              variant="primary"
              onPress={openAddModal}
              fullWidth
            />
          </Card>
        </Reveal>

        <SectionHeader title="Daftar Pegawai" subtitle="Barber & kasir terdaftar" />

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((index) => (
              <Card key={String(index)} style={{ gap: 10 }}>
                <Skeleton width="50%" height={20} />
                <Skeleton width="70%" height={12} />
                <Skeleton width="100%" height={40} radius={8} />
              </Card>
            ))}
          </View>
        ) : staffList.length === 0 ? (
          <EmptyState
            icon="group"
            title="Belum Ada Akun Pegawai"
            message="Tambahkan akun kasir atau barber baru untuk mulai mengoperasikan toko."
            actionLabel="Tambah Pegawai"
            onAction={openAddModal}
          />
        ) : (
          <View style={styles.list}>
            {staffList.map((staf, index) => {
              const isBarber = staf.role === 'barber';
              const isActive = staf.status_akun === 'aktif';
              return (
                <Reveal key={staf.id} delay={Math.min(index * 45, 225)}>
                  <Card
                    accent={isBarber ? 'amber' : 'cobalt'}
                    style={{ gap: 8, opacity: isActive ? 1 : 0.65 }}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="h2" style={{ fontSize: 17 }}>
                          {staf.nama}
                        </AppText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Badge label={isBarber ? 'Barber' : 'Kasir'} tone={isBarber ? 'accent' : 'info'} />
                          <Badge
                            label={isActive ? 'Aktif' : 'Nonaktif'}
                            tone={isActive ? 'success' : 'neutral'}
                          />
                        </View>
                      </View>
                      <MaterialIcons
                        name={isBarber ? 'content-cut' : 'point-of-sale'}
                        size={24}
                        color={isBarber ? theme.amber : theme.secondary}
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <View style={styles.infoRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <MaterialIcons name="mail-outline" size={14} color={theme.inkMuted} />
                          <AppText variant="caption" color={theme.inkMuted}>
                            Email
                          </AppText>
                        </View>
                        <AppText variant="body" style={{ fontSize: 12.5, flex: 1, textAlign: 'right' }} numberOfLines={1}>
                          {staf.email}
                        </AppText>
                      </View>
                      <View style={styles.infoRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <MaterialIcons name="phone" size={14} color={theme.inkMuted} />
                          <AppText variant="caption" color={theme.inkMuted}>
                            No HP
                          </AppText>
                        </View>
                        <AppText variant="body" style={{ fontSize: 12.5, flex: 1, textAlign: 'right' }}>
                          {staf.no_hp || '-'}
                        </AppText>
                      </View>
                    </View>

                    <View style={[styles.cardFooter, { borderTopColor: theme.cardBorder }]}>
                      <View style={{ flex: 1, gap: 1 }}>
                        <AppText variant="caption" color={theme.inkMuted}>
                          Status Akun
                        </AppText>
                        <AppText
                          variant="body"
                          color={isActive ? theme.success : theme.danger}
                          style={{ fontSize: 13, fontWeight: '700' }}
                        >
                          {isActive ? 'Dapat login' : 'Diblokir sementara'}
                        </AppText>
                      </View>
                      <Switch
                        value={isActive}
                        onValueChange={() => handleToggleStatus(staf.id, staf.status_akun)}
                        trackColor={{ true: theme.success, false: theme.neutral }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </Card>
                </Reveal>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Form Tambah Pegawai */}
      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Card tone="paper" accent="crimson" style={styles.modalCard}>
              <View style={{ gap: 2 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Akun Baru
                </AppText>
                <AppText variant="h1" style={{ fontSize: 22 }}>
                  Tambah Pegawai
                </AppText>
                <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 12.5 }}>
                  Akun dibuat via Edge Function agar sesi admin tetap aktif.
                </AppText>
              </View>

              <TextField
                label="Nama Lengkap Pegawai"
                placeholder="Contoh: Andi Barberman"
                icon="person-outline"
                value={nama}
                onChangeText={setNama}
              />

              <TextField
                label="Email Login"
                placeholder="andi@barbersys.com"
                icon="mail-outline"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <TextField
                label="Nomor HP"
                placeholder="081234567890"
                icon="phone"
                keyboardType="number-pad"
                value={noHp}
                onChangeText={setNoHp}
              />

              <View style={{ gap: 6 }}>
                <AppText variant="caption" color={theme.inkMuted}>
                  Role Pegawai
                </AppText>
                <View style={styles.rolePickerRow}>
                  <PressableScale
                    onPress={() => setRole('barber')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: role === 'barber' }}
                    style={[
                      styles.rolePickerBtn,
                      {
                        borderColor: role === 'barber' ? theme.ink : theme.cardBorder,
                        backgroundColor:
                          role === 'barber' ? theme.surfaceContainerLow : theme.surface,
                        borderWidth: role === 'barber' ? 2.5 : 1.5,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="content-cut"
                      size={20}
                      color={role === 'barber' ? theme.primary : theme.inkMuted}
                    />
                    <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                      Barber
                    </AppText>
                    {role === 'barber' ? (
                      <MaterialIcons name="check-circle" size={16} color={theme.primary} />
                    ) : null}
                  </PressableScale>

                  <PressableScale
                    onPress={() => setRole('kasir')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: role === 'kasir' }}
                    style={[
                      styles.rolePickerBtn,
                      {
                        borderColor: role === 'kasir' ? theme.ink : theme.cardBorder,
                        backgroundColor:
                          role === 'kasir' ? theme.surfaceContainerLow : theme.surface,
                        borderWidth: role === 'kasir' ? 2.5 : 1.5,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="point-of-sale"
                      size={20}
                      color={role === 'kasir' ? theme.secondary : theme.inkMuted}
                    />
                    <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                      Kasir
                    </AppText>
                    {role === 'kasir' ? (
                      <MaterialIcons name="check-circle" size={16} color={theme.secondary} />
                    ) : null}
                  </PressableScale>
                </View>
              </View>

              <TextField
                label="Password Sementara (Min. 8 Karakter)"
                placeholder="••••••••"
                icon="lock-outline"
                secureTextEntry
                secureToggle
                value={password}
                onChangeText={setPassword}
              />

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
                  label="Buat Akun"
                  icon="person-add"
                  variant="primary"
                  onPress={handleCreateStaff}
                  loading={submitting}
                  style={{ flex: 1.2 }}
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
  countRow: { flexDirection: 'row', gap: 8 },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  list: { gap: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1.5,
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
  rolePickerRow: { flexDirection: 'row', gap: 10 },
  rolePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
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

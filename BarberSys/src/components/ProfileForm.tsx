import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { RoleHeader } from '@/components/RoleHeader';
import { PressableScale } from '@/components/ui/pressable-scale';
import { brutalistCard, brutalistButton, brutalistInput } from '@/constants/theme';
import { pickAndUploadPhoto, isPickerCancelled } from '@/lib/upload-photo';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';

interface ProfileFormProps {
  title: string;
  fallbackName: string;
  footer?: React.ReactNode;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ title, fallbackName, footer }) => {
  const { theme, mode } = useAppTheme();
  const { profile, user, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setNama(profile?.nama || '');
    setNoHp(profile?.no_hp || '');
  }, [profile?.id]);

  const handlePickPhoto = async () => {
    if (!user) return;
    setUploadingPhoto(true);
    setMessage(null);
    try {
      const url = await pickAndUploadPhoto('avatars', user.id);
      const { error } = await supabase.from('profiles').update({ foto_url: url }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setMessage({ type: 'ok', text: 'Foto profil berhasil diperbarui.' });
    } catch (e) {
      if (!isPickerCancelled(e)) {
        setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Gagal mengunggah foto.' });
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setMessage(null);

    if (!nama.trim()) {
      setMessage({ type: 'err', text: 'Nama wajib diisi.' });
      return;
    }
    if (noHp.trim() && !/^[0-9]+$/.test(noHp.trim())) {
      setMessage({ type: 'err', text: 'Nomor HP hanya boleh berisi angka.' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nama: nama.trim(), no_hp: noHp.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setMessage({ type: 'ok', text: 'Perubahan berhasil disimpan.' });
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message || 'Gagal menyimpan perubahan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      router.replace('/(auth)/login' as any);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <RoleHeader title={title} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, brutalistCard(theme as any)]}>
          <TouchableOpacity
            style={styles.photoWrap}
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
            activeOpacity={0.8}
          >
            {profile?.foto_url ? (
              <Image
                source={{ uri: profile.foto_url }}
                style={[styles.photo, { borderColor: theme.cardBorder }]}
              />
            ) : (
              <View style={[styles.photoPh, { borderColor: theme.cardBorder, backgroundColor: theme.surfaceContainerLow }]}>
                <Text style={[styles.photoPhText, { color: theme.inkMuted }]}>
                  {(profile?.nama || fallbackName).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.camBadge, { backgroundColor: theme.primary, borderColor: theme.cardBorder }]}>
              <Text style={styles.camBadgeText}>{uploadingPhoto ? '...' : '📷'}</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.namePreview, { color: theme.ink }]}>
            {profile?.nama || fallbackName}
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink }]}>Nama Lengkap</Text>
            <TextInput
              style={[brutalistInput(theme as any)]}
              value={nama}
              onChangeText={setNama}
              placeholder="Nama lengkap"
              placeholderTextColor={theme.inkMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink }]}>Email (tidak dapat diubah)</Text>
            <TextInput
              style={[brutalistInput(theme as any), { opacity: 0.6 }]}
              value={profile?.email || ''}
              editable={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink }]}>Nomor HP</Text>
            <TextInput
              style={[brutalistInput(theme as any)]}
              value={noHp}
              onChangeText={setNoHp}
              placeholder="081234567890"
              placeholderTextColor={theme.inkMuted}
              keyboardType="number-pad"
            />
          </View>

          {message ? (
            <Text
              style={[
                styles.message,
                { color: message.type === 'ok' ? theme.success : theme.danger },
              ]}
            >
              {message.text}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[brutalistButton(theme as any, 'primary'), { marginTop: 8, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>SIMPAN PERUBAHAN</Text>
            )}
          </TouchableOpacity>

          <View
            style={[
              styles.settingsBlock,
              { borderColor: theme.cardBorder, backgroundColor: theme.surfaceContainerLow },
            ]}
          >
            <Text style={[styles.settingsLabel, { color: theme.inkMuted }]}>PENGATURAN</Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Buka pengaturan tampilan"
              onPress={() => router.push('/pengaturan/tampilan' as any)}
              style={styles.settingsRow}
            >
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: theme.accentAmber, borderColor: theme.ink },
                ]}
              >
                <MaterialIcons name="palette" size={16} color="#111111" />
              </View>
              <Text style={[styles.settingsText, { color: theme.ink }]}>Tampilan</Text>
              <Text style={[styles.settingsValue, { color: theme.inkMuted }]}>
                {mode === 'dark' ? 'Gelap' : 'Terang'}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.inkMuted} />
            </PressableScale>
          </View>

          <TouchableOpacity
            style={[brutalistButton(theme as any, 'danger'), { marginTop: 12 }]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>KELUAR DARI AKUN</Text>
          </TouchableOpacity>
        </View>
        {footer}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  card: { padding: 20, alignItems: 'stretch' },
  photoWrap: { alignSelf: 'center', position: 'relative', marginBottom: 8 },
  photo: { width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  photoPh: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  photoPhText: { fontSize: 36, fontWeight: '800' },
  camBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  camBadgeText: { fontSize: 14 },
  namePreview: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  message: { fontSize: 13, fontWeight: '600', marginVertical: 8 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  logoutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  settingsBlock: {
    marginTop: 14,
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  settingsLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsText: { flex: 1, fontSize: 14, fontWeight: '700' },
  settingsValue: { fontSize: 13, fontWeight: '600' },
});

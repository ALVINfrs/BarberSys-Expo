import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { brutalistCard, brutalistButton, brutalistInput } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { isValidTimeHHMM } from '@/lib/jam-operasional';

/**
 * F4.2 — Admin mengatur jam operasional toko (WIB).
 * Di luar jam ini customer tetap boleh ambil antrian, tetapi `hold_until`
 * diisi jam buka berikutnya dan Kasir baru melihatnya saat sudah waktunya.
 */
export const JamOperasionalCard: React.FC = () => {
  const { theme } = useAppTheme();
  const { profile } = useAuth();

  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [jamBuka, setJamBuka] = useState('');
  const [jamTutup, setJamTutup] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('barbershop_settings')
          .select('id,jam_buka,jam_tutup')
          .limit(1)
          .single();
        if (error) throw error;
        if (!alive) return;
        const row = data as any;
        setSettingsId(row?.id ?? null);
        setJamBuka(String(row?.jam_buka ?? '').slice(0, 5));
        setJamTutup(String(row?.jam_tutup ?? '').slice(0, 5));
      } catch (e: any) {
        if (alive) {
          setMessage({ type: 'err', text: e?.message || 'Gagal memuat pengaturan toko.' });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleSave = async () => {
    setMessage(null);

    if (!settingsId) {
      setMessage({ type: 'err', text: 'Pengaturan toko tidak ditemukan.' });
      return;
    }
    if (!isValidTimeHHMM(jamBuka)) {
      setMessage({ type: 'err', text: 'Jam buka harus format HH:MM, contoh 09:00.' });
      return;
    }
    if (!isValidTimeHHMM(jamTutup)) {
      setMessage({ type: 'err', text: 'Jam tutup harus format HH:MM, contoh 21:00.' });
      return;
    }
    if (jamBuka === jamTutup) {
      setMessage({ type: 'err', text: 'Jam buka dan jam tutup tidak boleh sama.' });
      return;
    }

    setSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from('barbershop_settings')
        .update({ jam_buka: `${jamBuka}:00`, jam_tutup: `${jamTutup}:00` })
        .eq('id', settingsId)
        .select('id')
        .single();
      if (error) throw error;
      if (!updated) throw new Error('Pengaturan tidak tersimpan (akses ditolak?).');
      setMessage({ type: 'ok', text: 'Jam operasional berhasil disimpan.' });
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || 'Gagal menyimpan jam operasional.' });
    } finally {
      setSaving(false);
    }
  };

  // Rute admin bisa di-deep-link; jangan tampilkan editor yang akan gagal RLS.
  if (profile && profile.role !== 'admin') {
    return (
      <View style={[styles.card, brutalistCard(theme as any)]}>
        <View style={styles.titleRow}>
          <MaterialIcons name="lock" size={20} color={theme.danger} />
          <Text style={[styles.title, { color: theme.ink }]}>Jam Operasional Toko</Text>
        </View>
        <Text style={[styles.message, { color: theme.danger }]}>
          Hanya Admin yang dapat mengubah jam operasional.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, brutalistCard(theme as any)]}>
      <View style={styles.titleRow}>
        <MaterialIcons name="schedule" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.ink }]}>Jam Operasional Toko</Text>
      </View>
      <Text style={[styles.sub, { color: theme.inkMuted }]}>Berlaku WIB (Asia/Jakarta).</Text>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} />
      ) : (
        <>
          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Text style={[styles.label, { color: theme.ink }]}>Jam Buka</Text>
              <TextInput
                style={brutalistInput(theme as any)}
                value={jamBuka}
                onChangeText={setJamBuka}
                placeholder="09:00"
                placeholderTextColor={theme.inkMuted}
                maxLength={5}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.label, { color: theme.ink }]}>Jam Tutup</Text>
              <TextInput
                style={brutalistInput(theme as any)}
                value={jamTutup}
                onChangeText={setJamTutup}
                placeholder="21:00"
                placeholderTextColor={theme.inkMuted}
                maxLength={5}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View style={[styles.warning, { backgroundColor: theme.amber, borderColor: theme.ink }]}>
            <MaterialIcons name="pause-circle-outline" size={18} color={theme.ink} />
            <Text style={[styles.warningText, { color: theme.ink }]}>
              Di luar jam ini customer tetap bisa ambil antrian, tetapi antrian DITAHAN dan baru
              diproses saat jam buka berikutnya (WIB).
            </Text>
          </View>
        </>
      )}

      {message ? (
        <Text
          style={[styles.message, { color: message.type === 'ok' ? theme.success : theme.danger }]}
        >
          {message.text}
        </Text>
      ) : null}

      {!loading ? (
        <TouchableOpacity
          style={[
            brutalistButton(theme as any, 'primary'),
            { marginTop: 10, opacity: saving || !settingsId ? 0.6 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving || !settingsId}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>SIMPAN JAM OPERASIONAL</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 20, marginTop: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  inputCol: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
  },
  warningText: { fontSize: 12, fontWeight: '700', lineHeight: 16, flex: 1 },
  message: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

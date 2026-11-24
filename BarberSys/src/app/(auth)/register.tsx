import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/context/ThemeContext';
import { AuthBrandPanel } from '@/components/AuthBrandPanel';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Reveal } from '@/components/ui/reveal';
import { PoleStrip } from '@/components/ui/pole-strip';
import { PressableScale } from '@/components/ui/pressable-scale';

type StrengthLevel = 'lemah' | 'sedang' | 'kuat';

function getPasswordStrength(password: string): {
  level: StrengthLevel;
  score: number;
} {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 3) return { level: 'kuat', score: 3 };
  if (score === 2) return { level: 'sedang', score: 2 };
  return { level: 'lemah', score };
}

export default function RegisterScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const strength = getPasswordStrength(password);
  const strengthColor =
    strength.level === 'kuat'
      ? theme.success
      : strength.level === 'sedang'
        ? theme.amber
        : theme.danger;
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password
      ? 'Konfirmasi password tidak cocok.'
      : null;

  const handleRegister = async () => {
    setErrorMessage(null);

    if (!nama.trim() || !email.trim() || !noHp.trim() || !password || !confirmPassword) {
      setErrorMessage('Seluruh field wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Format email tidak valid.');
      return;
    }

    if (!/^[0-9]+$/.test(noHp.trim())) {
      setErrorMessage('Nomor HP hanya boleh berisi angka.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password minimal 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nama: nama.trim(),
            no_hp: noHp.trim(),
            role: 'customer',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      router.replace('/(auth)/login' as any);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mendaftar.');
      setLoading(false);
    }
  };

  const isFormValid =
    nama.trim().length > 0 &&
    email.trim().length > 0 &&
    noHp.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    confirmPassword === password;

  const formColumn = (
    <Reveal delay={wide ? 120 : 0} style={wide ? styles.formColumnWide : undefined}>
      {!wide ? <AuthBrandPanel compact /> : null}

      <Card tone="surface" accent="cobalt" style={{ padding: 0, overflow: 'hidden' }}>
        <View
          style={[
            styles.cardHeader,
            { backgroundColor: theme.paper, borderBottomColor: theme.ink },
          ]}
        >
          <AppText variant="caption" color={theme.inkMuted}>
            DAFTAR AKUN
          </AppText>
          <AppText variant="h1">Buat akun pelanggan</AppText>
          <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
            Mulai ambil antrian online dalam hitungan menit.
          </AppText>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          <Reveal delay={100}>
            <TextField
              label="Nama Lengkap"
              icon="person-outline"
              placeholder="Contoh: Budi Santoso"
              value={nama}
              onChangeText={setNama}
              autoComplete="name"
              testID="register-nama"
            />
          </Reveal>

          <Reveal delay={130}>
            <TextField
              label="Email"
              icon="alternate-email"
              placeholder="budi@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              testID="register-email"
            />
          </Reveal>

          <Reveal delay={160}>
            <TextField
              label="Nomor HP"
              icon="phone"
              placeholder="081234567890"
              value={noHp}
              onChangeText={setNoHp}
              keyboardType="number-pad"
              autoComplete="tel"
              testID="register-hp"
            />
          </Reveal>

          <Reveal delay={190}>
            <View style={{ gap: 6 }}>
              <TextField
                label="Password (Min. 8 Karakter)"
                icon="lock"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                secureToggle
                autoComplete="new-password"
                testID="register-password"
              />
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[0, 1, 2].map((index) => (
                  <View
                    key={String(index)}
                    style={{
                      flex: 1,
                      height: 5,
                      borderRadius: 3,
                      borderWidth: 1,
                      borderColor: theme.inkMuted,
                      backgroundColor:
                        index < strength.score ? strengthColor : theme.surfaceContainerHigh,
                    }}
                  />
                ))}
              </View>
              <AppText variant="caption" color={strengthColor} style={{ letterSpacing: 0.4 }}>
                Kekuatan: {strength.level}
              </AppText>
            </View>
          </Reveal>

          <Reveal delay={220}>
            <TextField
              label="Konfirmasi Password"
              icon="lock-outline"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              error={confirmError}
              testID="register-confirm"
            />
          </Reveal>

          {errorMessage ? (
            <View
              style={[
                styles.errorBox,
                { borderColor: theme.danger, backgroundColor: theme.surfaceContainerLow },
              ]}
            >
              <MaterialIcons name="error-outline" size={16} color={theme.danger} />
              <AppText
                variant="caption"
                color={theme.danger}
                style={{ textTransform: 'none', letterSpacing: 0.2, flex: 1 }}
              >
                {errorMessage}
              </AppText>
            </View>
          ) : null}

          <Button
            label="Daftar Sekarang"
            onPress={handleRegister}
            loading={loading}
            disabled={!isFormValid}
            fullWidth
            testID="register-submit"
          />

          <View style={styles.footerRow}>
            <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
              Sudah punya akun?
            </AppText>
            <PressableScale
              onPress={() => router.replace('/(auth)/login' as any)}
              accessibilityRole="link"
            >
              <AppText
                variant="body"
                color={theme.secondary}
                style={{ fontSize: 13, textDecorationLine: 'underline' }}
              >
                Masuk di sini
              </AppText>
            </PressableScale>
          </View>
        </View>
      </Card>

      {!wide ? <PoleStrip height={6} animated style={{ borderRadius: 3 }} /> : null}
    </Reveal>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.shell, wide && styles.shellWide]}>
          {wide ? (
            <Reveal style={styles.brandColumn}>
              <AuthBrandPanel />
            </Reveal>
          ) : null}
          {formColumn}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 18,
    paddingTop: 44,
    paddingBottom: 40,
  },
  shell: {
    width: '100%',
    gap: 18,
  },
  shellWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 28,
    maxWidth: 1180,
    alignSelf: 'center',
    paddingVertical: 16,
  },
  brandColumn: {
    flex: 1.05,
  },
  formColumnWide: {
    flex: 1,
    maxWidth: 480,
    justifyContent: 'center',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    gap: 3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
});

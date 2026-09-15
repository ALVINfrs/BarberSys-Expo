import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { brutalistButton, brutalistInput, brutalistCard } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

export default function RegisterScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [namaFocused, setNamaFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [noHpFocused, setNoHpFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);

    // Validation checks
    if (!nama.trim() || !email.trim() || !noHp.trim() || !password || !confirmPassword) {
      setErrorMessage('Seluruh field wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Format email tidak valid.');
      return;
    }

    const phoneRegex = /^[0-9]+$/;
    if (!phoneRegex.test(noHp.trim())) {
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
      const { data, error } = await supabase.auth.signUp({
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
      // Success -> navigate to login or home
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
    confirmPassword.length >= 8;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.ink }]}>Daftar Akun Pelanggan</Text>
          <Text style={[styles.subtitle, { color: theme.inkMuted }]}>
            Buat akun untuk mulai mengambil antrian secara online.
          </Text>
        </View>

        {/* Card Form */}
        <View style={[styles.card, brutalistCard(theme as any)]}>
          {/* Nama Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink }]}>Nama Lengkap</Text>
            <TextInput
              style={[brutalistInput(theme as any, namaFocused)]}
              placeholder="Contoh: Budi Santoso"
              placeholderTextColor={theme.inkMuted}
              value={nama}
              onChangeText={setNama}
              onFocus={() => setNamaFocused(true)}
              onBlur={() => setNamaFocused(false)}
            />
          </View>

          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink }]}>Email</Text>
            <TextInput
              style={[brutalistInput(theme as any, emailFocused)]}
              placeholder="budi@email.com"
              placeholderTextColor={theme.inkMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* No HP Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink }]}>Nomor HP</Text>
            <TextInput
              style={[brutalistInput(theme as any, noHpFocused)]}
              placeholder="081234567890"
              placeholderTextColor={theme.inkMuted}
              value={noHp}
              onChangeText={setNoHp}
              keyboardType="number-pad"
              onFocus={() => setNoHpFocused(true)}
              onBlur={() => setNoHpFocused(false)}
            />
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink }]}>Password (Min. 8 Karakter)</Text>
            <TextInput
              style={[brutalistInput(theme as any, passwordFocused)]}
              placeholder="••••••••"
              placeholderTextColor={theme.inkMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
          </View>

          {/* Confirm Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.ink }]}>Konfirmasi Password</Text>
            <TextInput
              style={[brutalistInput(theme as any, confirmPasswordFocused)]}
              placeholder="••••••••"
              placeholderTextColor={theme.inkMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              onFocus={() => setConfirmPasswordFocused(true)}
              onBlur={() => setConfirmPasswordFocused(false)}
            />
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={[styles.errorContainer, { borderColor: theme.danger }]}>
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              brutalistButton(theme as any, 'primary'),
              { marginTop: 10, opacity: isFormValid && !loading ? 1 : 0.6 },
            ]}
            onPress={handleRegister}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>DAFTAR SEKARANG</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.inkMuted }]}>Sudah punya akun? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={[styles.footerLink, { color: theme.secondary }]}>Masuk di sini</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  card: {
    padding: 20,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorContainer: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 6,
    marginVertical: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justify: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

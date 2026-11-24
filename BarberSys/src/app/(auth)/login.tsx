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
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { AuthBrandPanel } from '@/components/AuthBrandPanel';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Reveal } from '@/components/ui/reveal';
import { PoleStrip } from '@/components/ui/pole-strip';
import { PressableScale } from '@/components/ui/pressable-scale';

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage('Email atau password salah.');
        setLoading(false);
        return;
      }

      if (data.session?.user) {
        // Profil dibaca langsung agar tidak butuh dua kali tap.
        const prof = await refreshProfile(data.session.user.id);
        setLoading(false);

        const targetRole =
          prof?.role || data.session.user.user_metadata?.role || 'customer';
        if (targetRole === 'customer') router.replace('/customer/home' as any);
        else if (targetRole === 'kasir') router.replace('/kasir/queue' as any);
        else if (targetRole === 'barber') router.replace('/barber/queue' as any);
        else if (targetRole === 'admin') router.replace('/admin/treatments' as any);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat masuk.');
      setLoading(false);
    }
  };

  const isFormValid = email.trim().length > 0 && password.length > 0;

  const formColumn = (
    <Reveal delay={wide ? 120 : 0} style={wide ? styles.formColumnWide : undefined}>
      <View
        style={[
          styles.statusBanner,
          { backgroundColor: theme.surfaceContainerLow, borderColor: theme.ink },
        ]}
      >
        <View
          style={[
            styles.pulse,
            { backgroundColor: theme.success, borderColor: theme.ink },
          ]}
        />
        <AppText variant="caption" style={{ letterSpacing: 0.4 }}>
          Buka Hari Ini: 09:00 - 21:00 WIB
        </AppText>
      </View>

      {!wide ? <AuthBrandPanel compact /> : null}

      <Card tone="surface" accent="amber" style={{ padding: 0, overflow: 'hidden' }}>
        <View
          style={[
            styles.cardHeader,
            { backgroundColor: theme.paper, borderBottomColor: theme.ink },
          ]}
        >
          <AppText variant="caption" color={theme.inkMuted}>
            MASUK KE AKUN
          </AppText>
          <AppText variant="h1">Selamat datang kembali</AppText>
          <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
            Kelola antrian dan layanan dalam satu tempat.
          </AppText>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          <Reveal delay={140}>
            <TextField
              label="Email"
              icon="alternate-email"
              placeholder="nama@email.com"
              placeholderTextColor={theme.inkMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              testID="login-email"
            />
          </Reveal>

          <Reveal delay={180}>
            <TextField
              label="Kata Sandi"
              icon="lock"
              placeholder="Masukkan kata sandi"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              secureToggle
              autoComplete="password"
              testID="login-password"
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
            label="Masuk"
            onPress={handleLogin}
            loading={loading}
            disabled={!isFormValid}
            fullWidth
            testID="login-submit"
          />

          <View style={styles.registerRow}>
            <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
              Belum punya akun?
            </AppText>
            <PressableScale
              onPress={() => router.push('/(auth)/register' as any)}
              accessibilityRole="link"
            >
              <AppText
                variant="body"
                color={theme.secondary}
                style={{ fontSize: 13, textDecorationLine: 'underline' }}
              >
                Daftar sekarang
              </AppText>
            </PressableScale>
          </View>

          <View
            style={[
              styles.noticeCard,
              { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder },
            ]}
          >
            <MaterialIcons name="info-outline" size={16} color={theme.inkMuted} />
            <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 11.5, flex: 1 }}>
              Akun Barber, Kasir, dan Admin dikelola terpusat oleh Admin Toko.
            </AppText>
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
    gap: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  pulse: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
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
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});

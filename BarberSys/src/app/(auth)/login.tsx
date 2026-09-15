import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { MaterialIcons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeSwitch } from '@/components/ThemeSwitch';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { theme, isDark } = useAppTheme();
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState('customer@barbersys.com');
  const [password, setPassword] = useState('Password123!');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'barber' | 'kasir' | 'admin'>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick fill demo role helper
  const handleQuickFill = (role: 'customer' | 'barber' | 'kasir' | 'admin') => {
    setSelectedRole(role);
    setEmail(`${role}@barbersys.com`);
    setPassword('Password123!');
    setErrorMessage(null);
  };

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
        // Immediate profile fetch with user ID to prevent 2-tap requirement!
        const prof = await refreshProfile(data.session.user.id);
        setLoading(false);

        const targetRole = prof?.role || data.session.user.user_metadata?.role || selectedRole;
        if (targetRole === 'customer') router.replace('/(customer)/home' as any);
        else if (targetRole === 'kasir') router.replace('/(kasir)/queue' as any);
        else if (targetRole === 'barber') router.replace('/(barber)/queue' as any);
        else if (targetRole === 'admin') router.replace('/(admin)/treatments' as any);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat masuk.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const redirectUrl = Linking.createURL('/(auth)/login');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setGoogleLoading(false);
        return;
      }

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (res.type === 'success' && res.url) {
          const { queryParams } = Linking.parse(res.url);
          if (queryParams?.code) {
            const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(
              queryParams.code as string
            );
            if (exchangeErr) throw exchangeErr;
          }
          // Profil dibuat otomatis oleh trigger on_auth_user_created (role customer);
          // client hanya membaca ulang, tanpa insert manual ganda (B4).
          let prof = await refreshProfile();
          if (!prof) {
            await new Promise((r) => setTimeout(r, 1500));
            prof = await refreshProfile();
          }
          if (!prof) {
            setErrorMessage('Login Google berhasil, tetapi profil belum terbentuk. Coba masuk lagi.');
            setGoogleLoading(false);
            return;
          }
          router.replace('/(customer)/home' as any);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk dengan Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const isFormValid = email.trim().length > 0 && password.length > 0;

  const roleConfig = {
    customer: { label: 'Customer', color: theme.secondary, icon: 'person' as const },
    barber: { label: 'Barber', color: theme.amber, icon: 'content-cut' as const },
    kasir: { label: 'Kasir', color: theme.success, icon: 'point-of-sale' as const },
    admin: { label: 'Admin', color: theme.primary, icon: 'admin-panel-settings' as const },
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Operational Status Alert Banner (Stitch Screen 2) */}
        <View style={[styles.statusBanner, { backgroundColor: theme.surfaceContainer, borderColor: theme.cardBorder }]}>
          <View style={styles.statusLeft}>
            <View style={styles.pulseWrapper}>
              <View style={[styles.pulseInner, { backgroundColor: theme.success }]} />
            </View>
            <Text style={[styles.statusBannerText, { color: theme.ink }]}>
              Buka Hari Ini: 09:00 - 21:00 WIB
            </Text>
          </View>

          {/* Smooth Animated Theme Switch */}
          <ThemeSwitch size="sm" />
        </View>

        {/* Brand Identity Header (Stitch Spec) */}
        <View style={styles.brandHeader}>
          <View style={styles.logoWrapper}>
            <View style={[styles.logoContainer, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.cardBorder }]}>
              <Image
                source={require('@/assets/images/barbersys_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.cutBadge, { backgroundColor: theme.primary, borderColor: theme.cardBorder }]}>
              <MaterialIcons name="content-cut" size={13} color="#FFFFFF" />
            </View>
          </View>
          <Text style={[styles.brandTitle, { color: theme.ink }]}>BarberSys</Text>
          <Text style={[styles.brandSubtitle, { color: theme.inkMuted }]}>
            Antre tanpa nunggu, layanan tanpa ribet.
          </Text>
        </View>

        {/* Role Selector Panel (Simulasi Multi-Role Quick-Fill) */}
        <View style={[styles.rolePanel, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder }]}>
          <View style={styles.rolePanelHeader}>
            <Text style={[styles.rolePanelLabel, { color: theme.inkMuted }]}>PILIH ROLE AKSES (DEMO)</Text>
            <View style={styles.quickFillBadge}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color={theme.secondary} />
              <Text style={[styles.quickFillText, { color: theme.secondary }]}>Quick-Fill</Text>
            </View>
          </View>

          <View style={styles.roleGrid}>
            {(['customer', 'barber', 'kasir', 'admin'] as const).map((role) => {
              const isSelected = selectedRole === role;
              const cfg = roleConfig[role];
              return (
                <TouchableOpacity
                  key={role}
                  activeOpacity={0.8}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: isSelected ? theme.surfaceContainerLowest : theme.surfaceContainerHigh,
                      borderColor: isSelected ? theme.cardBorder : 'transparent',
                      borderWidth: isSelected ? 2 : 0,
                    },
                  ]}
                  onPress={() => handleQuickFill(role)}
                >
                  <MaterialIcons
                    name={cfg.icon}
                    size={20}
                    color={isSelected ? cfg.color : theme.inkMuted}
                  />
                  <Text
                    style={[
                      styles.roleChipText,
                      {
                        color: isSelected ? theme.ink : theme.inkMuted,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Authentication Form Container */}
        <View style={[styles.formContainer, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.cardBorder }]}>
          {/* Card Top Title Banner */}
          <View style={[styles.formHeader, { backgroundColor: theme.surfaceContainerLow, borderBottomColor: theme.cardBorder }]}>
            <View style={styles.formHeaderLeft}>
              <MaterialIcons name="badge" size={20} color={theme.ink} />
              <Text style={[styles.formTitle, { color: theme.ink }]}>Akses Akun</Text>
            </View>
            <View style={[styles.activeRoleBadge, { backgroundColor: roleConfig[selectedRole].color }]}>
              <Text style={styles.activeRoleBadgeText}>{roleConfig[selectedRole].label.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.formBody}>
            {/* Input Email / WhatsApp */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.ink }]}>
                Email atau Nomor WhatsApp <Text style={{ color: theme.primary }}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.surfaceContainerLow,
                    borderColor: emailFocused ? theme.secondary : theme.cardBorder,
                  },
                ]}
              >
                <MaterialIcons name="alternate-email" size={20} color={theme.inkMuted} style={styles.inputLeftIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.ink }]}
                  placeholder="nama@email.com / 0812..."
                  placeholderTextColor={theme.inkMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {/* Input Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={[styles.inputLabel, { color: theme.ink }]}>
                  Kata Sandi <Text style={{ color: theme.primary }}>*</Text>
                </Text>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={[styles.forgotPasswordText, { color: theme.secondary }]}>
                    {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.surfaceContainerLow,
                    borderColor: passwordFocused ? theme.secondary : theme.cardBorder,
                  },
                ]}
              >
                <MaterialIcons name="lock" size={20} color={theme.inkMuted} style={styles.inputLeftIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.ink }]}
                  placeholder="Masukkan kata sandi"
                  placeholderTextColor={theme.inkMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  style={styles.inputRightIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={theme.inkMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Inline Error */}
            {errorMessage ? (
              <View style={[styles.errorBox, { borderColor: theme.danger, backgroundColor: theme.surfaceContainerLow }]}>
                <MaterialIcons name="error-outline" size={16} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Primary Action Button (1-Tap guaranteed login!) */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.cardBorder,
                  opacity: isFormValid && !loading ? 1 : 0.65,
                },
              ]}
              onPress={handleLogin}
              disabled={!isFormValid || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Masuk Sekarang</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Staff Credentials Notice Card */}
            <View style={[styles.noticeCard, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder }]}>
              <MaterialIcons name="info-outline" size={18} color={theme.inkMuted} style={{ marginTop: 1 }} />
              <Text style={[styles.noticeText, { color: theme.inkMuted }]}>
                Akun Barber, Kasir, dan Resepsionis dikelola terpusat oleh Admin Toko.
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
              <Text style={[styles.dividerText, { color: theme.inkMuted }]}>atau</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
            </View>

            {/* Google Auth Button with Official Google Icon */}
            <TouchableOpacity
              style={[
                styles.googleBtn,
                {
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.cardBorder,
                  opacity: googleLoading ? 0.6 : 1,
                },
              ]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color={theme.ink} />
              ) : (
                <>
                  <AntDesign name="google" size={18} color="#EA4335" style={{ marginRight: 8 }} />
                  <Text style={[styles.googleBtnText, { color: theme.ink }]}>
                    Masuk dengan Google (Pelanggan)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Registration Prompt */}
        <View style={styles.registerPrompt}>
          <Text style={[styles.registerSub, { color: theme.inkMuted }]}>
            Belum memiliki antrean digital?
          </Text>
          <TouchableOpacity
            style={styles.registerLinkRow}
            onPress={() => router.push('/(auth)/register' as any)}
          >
            <MaterialIcons name="how-to-reg" size={18} color={theme.primary} />
            <Text style={[styles.registerLinkText, { color: theme.primary }]}>
              Daftar Akun Baru (Pelanggan)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Visual Ambience Element: Classic Barber Pole Striping Bar */}
        <View style={styles.barberPoleBar}>
          <View style={[styles.polePill, { backgroundColor: theme.primary, width: 32 }]} />
          <View style={[styles.polePill, { backgroundColor: theme.surfaceContainerHigh, width: 16 }]} />
          <View style={[styles.polePill, { backgroundColor: theme.secondary, width: 32 }]} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingTop: 48,
    paddingBottom: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 20,
    shadowColor: '#111111',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 0,
    elevation: 2,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseWrapper: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2BA84A40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#111111',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.9,
    shadowRadius: 0,
    elevation: 3,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  cutBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    borderWidth: 1.5,
    borderRadius: 999,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  rolePanel: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 10,
    marginBottom: 20,
    shadowColor: '#111111',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.9,
    shadowRadius: 0,
    elevation: 3,
  },
  rolePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  rolePanelLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  quickFillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  quickFillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    shadowColor: '#111111',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 0,
    elevation: 2,
  },
  roleChipText: {
    fontSize: 11,
    marginTop: 3,
  },
  formContainer: {
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#111111',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
  },
  formHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  activeRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  activeRoleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  formBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  inputRightIcon: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#111111',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.2,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    shadowColor: '#111111',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 0,
    elevation: 2,
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  registerPrompt: {
    alignItems: 'center',
    marginTop: 6,
  },
  registerSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  registerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '800',
  },
  barberPoleBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  polePill: {
    height: 6,
    borderRadius: 3,
  },
});

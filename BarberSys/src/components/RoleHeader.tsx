import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Reveal } from '@/components/ui/reveal';

interface RoleHeaderProps {
  title: string;
}

export const RoleHeader: React.FC<RoleHeaderProps> = ({ title }) => {
  const { theme } = useAppTheme();
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      router.replace('/(auth)/login' as any);
    }
  };

  const badgeTone = (() => {
    switch (profile?.role) {
      case 'admin':
        return 'danger' as const;
      case 'kasir':
        return 'info' as const;
      case 'barber':
        return 'accent' as const;
      default:
        return 'success' as const;
    }
  })();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.paper, borderColor: theme.ink },
      ]}
    >
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/images/barbersys_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={{ flexShrink: 1 }}>
            <AppText
              style={{
                fontFamily: Fonts.display,
                fontSize: 18,
                lineHeight: 20,
                letterSpacing: -0.6,
              }}
            >
              BarberSys
            </AppText>
            <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 10 }}>
              {title}
            </AppText>
          </View>
        </View>

        {profile ? (
          <Reveal delay={70} style={styles.badgeRow}>
            <Badge label={profile.role.toUpperCase()} tone={badgeTone} />
            <AppText
              variant="body"
              color={theme.inkMuted}
              numberOfLines={1}
              style={{ fontSize: 12, flexShrink: 1 }}
            >
              {profile.nama || profile.email}
            </AppText>
          </Reveal>
        ) : null}
      </View>

      <View style={styles.rightActions}>
        {profile?.foto_url ? (
          <Image
            source={{ uri: profile.foto_url }}
            style={[styles.avatar, { borderColor: theme.ink }]}
          />
        ) : (
          <Image
            source={
              profile?.role === 'barber'
                ? require('@/assets/images/barber_portrait.png')
                : require('@/assets/images/user_avatar.png')
            }
            style={[styles.avatar, { borderColor: theme.ink }]}
          />
        )}

        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              backgroundColor: theme.surface,
              borderColor: theme.ink,
              shadowColor: theme.shadow,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Keluar"
        >
          <MaterialIcons name="logout" size={16} color={theme.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: {
    flex: 1,
    paddingRight: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeSwitch } from '@/components/ThemeSwitch';

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

  const getRoleBadgeColor = () => {
    switch (profile?.role) {
      case 'admin':
        return theme.primary;
      case 'kasir':
        return theme.secondary;
      case 'barber':
        return theme.amber;
      default:
        return theme.success;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      {/* Brand & Title Info */}
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/images/barbersys_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.brandText, { color: theme.ink }]}>BarberSys</Text>
            <Text style={[styles.title, { color: theme.inkMuted }]}>{title}</Text>
          </View>
        </View>

        {profile ? (
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(), borderColor: theme.cardBorder }]}>
              <Text style={styles.roleBadgeText}>{profile.role.toUpperCase()}</Text>
            </View>
            <Text style={[styles.userName, { color: theme.inkMuted }]} numberOfLines={1}>
              {profile.nama || profile.email}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Right Controls: ThemeSwitch + Avatar/Logout */}
      <View style={styles.rightActions}>
        {/* Animated Smooth Switch */}
        <ThemeSwitch size="sm" />

        {/* User Avatar Image from Stitch */}
        <Image
          source={
            profile?.role === 'barber'
              ? require('@/assets/images/barber_portrait.png')
              : require('@/assets/images/user_avatar.png')
          }
          style={[styles.avatar, { borderColor: theme.cardBorder }]}
        />

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder }]}
          onPress={handleLogout}
          activeOpacity={0.8}
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
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 2,
  },
});

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Profile } from '@/types/database';

type Role = Profile['role'];

const HOME_BY_ROLE: Record<Role, string> = {
  customer: '/customer/home',
  kasir: '/kasir/queue',
  barber: '/barber/queue',
  admin: '/admin/treatments',
};

/**
 * Guard layout role: cegah akses lintas-role lewat URL/direct link.
 * Mengembalikan `false` selama auth masih dimuat atau role tidak cocok,
 * sehingga layout tidak sempat merender layar milik role lain.
 */
export function useRoleGuard(expectedRole: Role): boolean {
  const { profile, loading } = useAuth();
  const router = useRouter();

  const allowed =
    !loading && !!profile && profile.status_akun !== 'nonaktif' && profile.role === expectedRole;

  useEffect(() => {
    if (loading) return;

    if (!profile || profile.status_akun === 'nonaktif') {
      router.replace('/login');
      return;
    }

    if (profile.role !== expectedRole) {
      router.replace((HOME_BY_ROLE[profile.role] ?? '/login') as any);
    }
  }, [loading, profile, expectedRole, router]);

  return allowed;
}

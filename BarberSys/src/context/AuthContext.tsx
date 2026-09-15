import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: (targetUserId?: string) => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async (targetUserId?: string) => null,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchErr) {
        console.error('Error fetching profile:', fetchErr.message);
        setError('Gagal memuat data profil');
        return null;
      }

      if (data) {
        if (data.status_akun === 'nonaktif') {
          setError('Akun Anda telah dinonaktifkan oleh Manajer/Admin.');
          await supabase.auth.signOut();
          setProfile(null);
          setSession(null);
          setUser(null);
          return null;
        }
        setProfile(data as Profile);
        return data as Profile;
      }
      return null;
    } catch (err: any) {
      console.error('Profile fetch exception:', err);
      return null;
    }
  };

  const refreshProfile = async (targetUserId?: string): Promise<Profile | null> => {
    const uid = targetUserId || user?.id;
    if (uid) {
      return await fetchProfile(uid);
    }
    return null;
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setError(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session: initSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initSession);
          setUser(initSession?.user ?? null);
          if (initSession?.user) {
            await fetchProfile(initSession.user.id);
          }
          setLoading(false);
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        error,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

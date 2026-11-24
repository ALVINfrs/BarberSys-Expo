import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { formatJamHHMM } from '@/lib/waktu';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppText } from '@/components/ui/text';

interface Settings {
  nama_toko: string | null;
  jam_buka: string;
  jam_tutup: string;
}

/** Ringkasan pengaturan toko & status kerja barber (info-only). */
export function BarberSettingsCard() {
  const { theme } = useAppTheme();
  const { profile } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('barbershop_settings')
          .select('nama_toko, jam_buka, jam_tutup')
          .limit(1)
          .maybeSingle();
        if (data) setSettings(data as Settings);
      } catch {}
    };
    load();
  }, []);

  const istirahat = profile?.status_kerja === 'istirahat';

  return (
    <Card accent="cobalt" style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="h2" style={{ fontSize: 16 }}>
          Pengaturan Toko
        </AppText>
        <Badge label={istirahat ? 'ISTIRAHAT' : 'AKTIF'} tone={istirahat ? 'warning' : 'success'} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialIcons name="schedule" size={17} color={theme.inkMuted} />
        <AppText variant="body" style={{ fontSize: 13 }}>
          Jam operasional: {formatJamHHMM(settings?.jam_buka || null)} –{' '}
          {formatJamHHMM(settings?.jam_tutup || null)} WIB
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialIcons name="storefront" size={17} color={theme.inkMuted} />
        <AppText variant="body" style={{ fontSize: 13 }}>
          {settings?.nama_toko || 'BarberSys'}
        </AppText>
      </View>
      <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9, textTransform: 'none' }}>
        Status istirahat diubah dari tab Tugas. Jam toko diatur admin.
      </AppText>
    </Card>
  );
}

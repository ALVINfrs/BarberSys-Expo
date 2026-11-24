import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { WallSwitch } from '@/components/ui/wall-switch';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Reveal } from '@/components/ui/reveal';
import { PoleStrip } from '@/components/ui/pole-strip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ThemeMode } from '@/lib/theme-preference';

export default function TampilanScreen() {
  const { theme, mode, setMode } = useAppTheme();
  const router = useRouter();

  const previews: Array<{ key: ThemeMode; title: string; bg: string; fg: string; accent: string }> = [
    { key: 'light', title: 'Terang', bg: '#FCF9F8', fg: '#111111', accent: '#F5B700' },
    { key: 'dark', title: 'Gelap', bg: '#121214', fg: '#F5F3EE', accent: '#FFCB3C' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 2,
          borderBottomColor: theme.ink,
          backgroundColor: theme.paper,
        }}
      >
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={{
            width: 38,
            height: 38,
            borderRadius: theme.radius.md,
            borderWidth: 2,
            borderColor: theme.ink,
            backgroundColor: theme.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="arrow-back" size={20} color={theme.ink} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={theme.inkMuted}>
            Pengaturan
          </AppText>
          <AppText variant="h1">Tampilan</AppText>
        </View>
        <Badge label={mode === 'dark' ? 'Gelap' : 'Terang'} tone="accent" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 20 }}>
        <PoleStrip height={8} animated />

        <Reveal>
          <View style={{ alignItems: 'center', gap: 14 }}>
            <WallSwitch mode={mode} onChange={setMode} />
            <AppText variant="h2" style={{ textAlign: 'center' }}>
              {mode === 'dark' ? 'Lampu dimatikan' : 'Lampu dinyalakan'}
            </AppText>
            <AppText
              variant="body"
              color={theme.inkMuted}
              style={{ textAlign: 'center', fontSize: 13 }}
            >
              Geser sakelar untuk berpindah antara mode terang dan gelap. Tampilan langsung berubah.
            </AppText>
          </View>
        </Reveal>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {previews.map((preview) => {
            const active = mode === preview.key;
            return (
              <Card
                key={preview.key}
                onPress={() => setMode(preview.key)}
                accent={active ? 'amber' : undefined}
                style={{
                  flex: 1,
                  padding: 12,
                  gap: 8,
                  borderColor: active ? theme.ink : theme.cardBorder,
                }}
              >
                <View
                  style={{
                    height: 64,
                    borderRadius: theme.radius.sm,
                    borderWidth: 2,
                    borderColor: '#111111',
                    backgroundColor: preview.bg,
                    padding: 8,
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ width: 34, height: 5, backgroundColor: preview.fg, borderRadius: 2 }} />
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <View
                      style={{
                        width: 18,
                        height: 12,
                        backgroundColor: preview.accent,
                        borderWidth: 1,
                        borderColor: '#111111',
                        borderRadius: 2,
                      }}
                    />
                    <View
                      style={{
                        flex: 1,
                        height: 12,
                        backgroundColor: preview.fg,
                        opacity: 0.25,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText variant="h2">{preview.title}</AppText>
                  {active ? <Badge label="Aktif" tone="warning" /> : null}
                </View>
              </Card>
            );
          })}
        </View>

        <AppText
          variant="body"
          color={theme.inkMuted}
          style={{ fontSize: 12, textAlign: 'center' }}
        >
          Pilihan disimpan di perangkat ini.
        </AppText>

        <Button label="Kembali" variant="secondary" fullWidth onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

import React from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import {
  filterTipsByPeriode,
  summarizeTips,
  tipByBarber,
  type TipEntry,
  type TipPeriode,
} from '@/lib/tip-history';
import { formatQueueNumber } from '@/lib/ticker';
import { formatWIBDate, formatWIBTime } from '@/lib/waktu';

interface TipSummaryCardProps {
  items: TipEntry[];
  periode: TipPeriode;
  onPeriodeChange: (periode: TipPeriode) => void;
  mode: 'barber' | 'customer';
}

const PERIODE_LABEL: Record<TipPeriode, string> = {
  '7': '7 Hari',
  '30': '30 Hari',
  semua: 'Semua',
};

const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

/** Rekap tip + daftar pemberi; dipakai barber dan customer. */
export function TipSummaryCard({ items, periode, onPeriodeChange, mode }: TipSummaryCardProps) {
  const { theme } = useAppTheme();
  const visible = React.useMemo(
    () => filterTipsByPeriode(items, periode),
    [items, periode]
  );
  const summary = React.useMemo(() => summarizeTips(visible), [visible]);
  const byBarber = React.useMemo(() => tipByBarber(visible), [visible]);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 8 }}>
        <AppText variant="h2">Tip yang Dikumpulkan</AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['7', '30', 'semua'] as TipPeriode[]).map((p) => (
            <PressableScale
              key={p}
              onPress={() => onPeriodeChange(p)}
              accessibilityRole="button"
              style={[
                {
                  borderWidth: 1.5,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                },
                {
                  borderColor: theme.ink,
                  backgroundColor: periode === p ? theme.ink : theme.surface,
                },
              ]}
            >
              <AppText
                variant="caption"
                style={{ fontSize: 10, color: periode === p ? theme.bg : theme.ink }}
              >
                {PERIODE_LABEL[p]}
              </AppText>
            </PressableScale>
          ))}
        </View>
      </View>

      <Card accent="amber" style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            <AppText variant="caption" color={theme.inkMuted}>
              Total Tip
            </AppText>
            <AppText variant="display" style={{ fontSize: 28 }}>
              {rupiah(summary.total)}
            </AppText>
          </View>
          <Badge label={`${summary.count} TIP`} tone="ink" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, borderTopWidth: 1.5, borderTopColor: theme.cardBorder, paddingTop: 8 }}>
          <View style={{ flex: 1, gap: 1 }}>
            <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
              Rata-rata
            </AppText>
            <AppText variant="mono" style={{ fontSize: 14 }}>
              {rupiah(summary.rataRata)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
              Tip Terbesar
            </AppText>
            <AppText variant="mono" color={theme.success} style={{ fontSize: 14 }}>
              {rupiah(summary.terbesar)}
            </AppText>
          </View>
        </View>
      </Card>

      {mode === 'customer' && byBarber.length > 0 ? (
        <View style={{ gap: 8 }}>
          <AppText variant="h2" style={{ fontSize: 16 }}>
            Tip per Barber
          </AppText>
          {byBarber.map((barber) => (
            <Card key={barber.barberNama} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="content-cut" size={17} color={theme.inkMuted} />
                  <AppText variant="body" style={{ fontSize: 13 }}>
                    {barber.barberNama}
                  </AppText>
                </View>
                <AppText variant="mono" color={theme.primary} style={{ fontSize: 14 }}>
                  {rupiah(barber.total)}
                </AppText>
              </View>
              <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
                {barber.count} kali memberi tip
              </AppText>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <AppText variant="h2" style={{ fontSize: 16 }}>
          {mode === 'barber' ? 'Siapa yang Memberi Tip' : 'Riwayat Tip Kamu'}
        </AppText>
        {visible.length === 0 ? (
          <EmptyState
            icon="savings"
            title="Belum Ada Tip"
            message="Tip akan muncul di sini setelah transaksi lunas dengan tip tercatat."
          />
        ) : (
          visible.map((item, index) => (
            <Card key={`${item.tanggalIso}-${index}`} accent={index % 2 === 0 ? 'amber' : 'cobalt'} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="body" style={{ fontSize: 13, flex: 1 }}>
                  {mode === 'barber' ? item.customerNama : item.barberNama}
                </AppText>
                <AppText variant="mono" color={theme.success} style={{ fontSize: 15 }}>
                  {rupiah(item.jumlah)}
                </AppText>
              </View>
              <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 9 }}>
                {formatQueueNumber(item.nomorAntrian)} · {item.treatmentNama} ·{' '}
                {formatWIBDate(item.tanggalIso)} {formatWIBTime(item.tanggalIso)}
              </AppText>
            </Card>
          ))
        )}
      </View>
    </View>
  );
}

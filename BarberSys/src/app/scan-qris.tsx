import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { QueueItem, Treatment, Profile } from '@/types/database';
import {
  QrisPayload,
  computeQueueTotal,
  parseQrisPayload,
} from '@/lib/qris';
import { formatQueueNumber } from '@/lib/ticker';
import { canUseCamera, type CameraPlatform } from '@/lib/camera-gate';
import { AppText } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Confetti } from '@/components/ui/confetti';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Stamp } from '@/components/ui/stamp';

interface ScanQueueItem extends QueueItem {
  treatments: Treatment | null;
  barber: Profile | null;
}

interface ScanItem {
  nama: string;
  qty: number;
  subtotal: number;
}

interface ReviewState {
  payload: QrisPayload;
  item: ScanQueueItem;
  items: ScanItem[];
  total: number;
  tip: number;
}

const formatRupiah = (value: number) => 'Rp ' + value.toLocaleString('id-ID');

/** Kamera + alur izin. Dipisah agar hook kamera tidak berjalan saat SSR web. */
function QrisCamera({
  paused,
  onScanned,
}: {
  paused: boolean;
  onScanned: (raw: string) => void;
}) {
  const { theme } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();

  // Minta izin otomatis saat status masih bisa diminta; bila sudah ditolak
  // permanen, tombol "Buka Pengaturan" yang dipakai.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={[styles.permissionBox, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
          Memeriksa izin kamera…
        </AppText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionBox, { backgroundColor: theme.bg }]}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: theme.ink,
            backgroundColor: theme.amber,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="photo-camera" size={30} color="#111111" />
        </View>
        <AppText variant="h1" style={{ fontSize: 22, textAlign: 'center' }}>
          Izin Kamera Diperlukan
        </AppText>
        <AppText
          variant="body"
          color={theme.inkMuted}
          style={{ fontSize: 13, lineHeight: 20, textAlign: 'center' }}
        >
          BarberSys memakai kamera hanya untuk memindai QR pembayaran di layar kasir. Tidak ada
          foto atau video yang disimpan.
        </AppText>
        <Button
          label={permission.canAskAgain ? 'Izinkan Kamera' : 'Buka Pengaturan'}
          icon="camera-alt"
          variant="primary"
          fullWidth
          onPress={() => {
            if (permission.canAskAgain) {
              requestPermission();
            } else {
              Linking.openSettings().catch(() => {});
            }
          }}
          style={{ marginTop: 4 }}
        />
        <AppText
          variant="caption"
          color={theme.inkMuted}
          style={{ fontSize: 11, textAlign: 'center' }}
        >
          Tanpa kamera, pembayaran QRIS tidak bisa dipindai. Anda tetap bisa membayar tunai di
          kasir.
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          paused ? undefined : ({ data }: BarcodeScanningResult) => onScanned(data)
        }
      />
      <View pointerEvents="none" style={styles.cameraOverlay}>
        <View style={[styles.instructionPill, { backgroundColor: theme.paper }]}>
          <MaterialIcons name="qr-code-scanner" size={16} color={theme.ink} />
          <AppText variant="caption" color={theme.ink} style={{ fontSize: 11.5 }}>
            Arahkan kamera ke QR code di layar kasir
          </AppText>
        </View>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>
        <View style={[styles.instructionPill, { backgroundColor: theme.paper, marginTop: 'auto' }]}>
          <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 11 }}>
            QRIS simulasi · tidak ada transaksi finansial nyata
          </AppText>
        </View>
      </View>
    </View>
  );
}

export default function ScanQrisScreen() {
  const { theme } = useAppTheme();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const lockedRef = useRef(false);
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    CameraView.isAvailableAsync()
      .then((available) => {
        if (active) setCameraAvailable(available);
      })
      .catch(() => {
        if (active) setCameraAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (redirectRef.current) clearTimeout(redirectRef.current);
    },
    []
  );

  const resetScan = () => {
    lockedRef.current = false;
    setScanError(null);
    setReview(null);
    setPayError(null);
    setPaid(false);
  };

  const handleScanned = async (raw: string) => {
    if (lockedRef.current || review || paying) return;
    lockedRef.current = true;
    setScanError(null);

    const parsed = parseQrisPayload(raw);
    if (!parsed.ok) {
      setScanError(parsed.message);
      return;
    }
    if (!user) {
      setScanError('Sesi login tidak ditemukan. Silakan masuk ulang.');
      return;
    }

    try {
      const { data: queue, error } = await supabase
        .from('queue')
        .select(
          '*, treatments(*), barber:profiles!queue_barber_id_fkey(*)'
        )
        .eq('id', parsed.payload.queueId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;

      const item = queue as ScanQueueItem | null;
      if (!item) {
        throw new Error(
          'QR ini bukan milik antrian Anda, atau antrian sudah dibayar. Minta kasir memperbarui QR.'
        );
      }
      if (item.status !== 'selesai') {
        throw new Error(
          'Antrian belum siap dibayar atau sudah berubah. Minta kasir menampilkan QR baru.'
        );
      }

      const { data: queueProducts, error: productsError } = await supabase
        .from('queue_products')
        .select('qty, subtotal, products(nama)')
        .eq('queue_id', item.id);
      if (productsError) throw productsError;

      const items: ScanItem[] = ((queueProducts as any[]) || []).map((row) => ({
        nama: row.products?.nama || 'Produk',
        qty: row.qty,
        subtotal: row.subtotal,
      }));
      const tip = item.tip_amount || 0;
      const total = computeQueueTotal(item.treatments?.harga ?? null, items, tip);

      if (total !== parsed.payload.total) {
        throw new Error(
          `Total tagihan berubah menjadi ${formatRupiah(total)}. Minta kasir menampilkan QR baru.`
        );
      }

      setReview({ payload: parsed.payload, item, items, total, tip });
    } catch (e: any) {
      console.error('QRIS scan failed:', e);
      setScanError(e.message || 'QR tidak bisa diproses. Coba scan ulang.');
    }
  };

  const handleCancelReview = () => {
    if (paying) return;
    resetScan();
  };

  const handlePay = async () => {
    if (!review || !user || paying || paid) return;
    setPaying(true);
    setPayError(null);
    try {
      const { data, error } = await supabase
        .from('queue')
        .update({
          status: 'lunas',
          metode_bayar: 'qris',
          completed_at: new Date().toISOString(),
        })
        .eq('id', review.item.id)
        .eq('user_id', user.id)
        .eq('status', 'selesai')
        .select('id')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Antrian sudah berubah. Minta kasir memperbarui QR.');
        }
        throw error;
      }
      if (!data) {
        throw new Error('Antrian sudah berubah. Minta kasir memperbarui QR.');
      }

      setPaid(true);
      redirectRef.current = setTimeout(() => {
        router.replace('/customer/history' as any);
      }, 1800);
    } catch (e: any) {
      console.error('QRIS payment failed:', e);
      setPayError(e.message || 'Pembayaran gagal. Coba lagi atau minta QR baru.');
    } finally {
      setPaying(false);
    }
  };

  const isCustomer = !profile || profile.role === 'customer';
  const isWeb = Platform.OS === 'web';
  const cameraReady = canUseCamera(Platform.OS as CameraPlatform, cameraAvailable);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.paper, borderBottomColor: theme.ink },
        ]}
      >
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={[styles.backButton, { borderColor: theme.ink, backgroundColor: theme.surface }]}
        >
          <MaterialIcons name="arrow-back" size={20} color={theme.ink} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 11 }}>
            Pembayaran
          </AppText>
          <AppText variant="h1" style={{ fontSize: 22 }}>
            Scan QRIS
          </AppText>
        </View>
        <Badge label="Simulasi" tone="accent" />
      </View>

      <View style={[styles.cameraArea, { backgroundColor: '#111111' }]}>
        {!isCustomer ? (
          <View style={[styles.permissionBox, { backgroundColor: theme.bg }]}>
            <MaterialIcons name="person-outline" size={44} color={theme.inkMuted} />
            <AppText variant="h1" style={{ fontSize: 21, textAlign: 'center' }}>
              Khusus Customer
            </AppText>
            <AppText
              variant="body"
              color={theme.inkMuted}
              style={{ fontSize: 13, textAlign: 'center' }}
            >
              Layar ini dipakai customer untuk membayar antriannya sendiri.
            </AppText>
            <Button label="Kembali" variant="secondary" fullWidth onPress={() => router.back()} />
          </View>
        ) : isWeb && cameraAvailable === null ? (
          <View style={[styles.permissionBox, { backgroundColor: theme.bg }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
              Memeriksa kamera…
            </AppText>
          </View>
        ) : !cameraReady ? (
          <View style={[styles.permissionBox, { backgroundColor: theme.bg }]}>
            <MaterialIcons name="no-photography" size={44} color={theme.danger} />
            <AppText variant="h1" style={{ fontSize: 21, textAlign: 'center' }}>
              Kamera Tidak Tersedia
            </AppText>
            <AppText
              variant="body"
              color={theme.inkMuted}
              style={{ fontSize: 13, lineHeight: 20, textAlign: 'center' }}
            >
              Browser ini tidak menyediakan kamera untuk memindai QR. Gunakan aplikasi Expo Go di
              HP, atau bayar tunai di kasir.
            </AppText>
            <Button label="Kembali" variant="secondary" fullWidth onPress={() => router.back()} />
          </View>
        ) : (
          <QrisCamera paused={!!scanError || !!review} onScanned={handleScanned} />
        )}

        {scanError ? (
          <View style={styles.errorOverlay}>
            <Card tone="paper" accent="cobalt" style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="error-outline" size={20} color={theme.danger} />
                <AppText variant="h2" style={{ fontSize: 16, flex: 1 }}>
                  QR Tidak Bisa Dipakai
                </AppText>
              </View>
              <AppText
                variant="body"
                color={theme.inkMuted}
                style={{ fontSize: 12.5, lineHeight: 19 }}
              >
                {scanError}
              </AppText>
              <Button label="Scan Ulang" icon="refresh" variant="primary" fullWidth onPress={resetScan} />
            </Card>
          </View>
        ) : null}
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={!!review}
        onRequestClose={handleCancelReview}
      >
        <View style={styles.sheetOverlay}>
          <Card tone="paper" accent={paid ? 'cobalt' : 'amber'} style={styles.sheetCard}>
            {paid && review ? (
              <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                <Confetti active />
                <Stamp active label="Pembayaran Berhasil" />
                <AppText variant="mono" style={{ fontSize: 30 }}>
                  {formatRupiah(review.total)}
                </AppText>
                <AppText
                  variant="body"
                  color={theme.inkMuted}
                  style={{ textAlign: 'center', fontSize: 13 }}
                >
                  Antrian {formatQueueNumber(review.item.nomor_antrian)} sudah lunas. Mengalihkan
                  ke Riwayat…
                </AppText>
              </View>
            ) : review ? (
              <>
                <View style={{ gap: 3 }}>
                  <AppText variant="caption" color={theme.inkMuted}>
                    Ringkasan Tagihan
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText variant="h1" style={{ fontSize: 24 }}>
                      {formatQueueNumber(review.item.nomor_antrian)}
                    </AppText>
                    <Badge label="QRIS" tone="success" />
                  </View>
                </View>

                <View
                  style={[
                    styles.summaryBox,
                    { backgroundColor: theme.surfaceContainerLow, borderColor: theme.cardBorder },
                  ]}
                >
                  <View style={styles.summaryRow}>
                    <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                      {review.item.treatments?.nama || 'Treatment'}
                    </AppText>
                    <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                      {formatRupiah(review.item.treatments?.harga || 0)}
                    </AppText>
                  </View>
                  {review.items.map((item, index) => (
                    <View key={`${item.nama}-${index}`} style={styles.summaryRow}>
                      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                        {item.nama} × {item.qty}
                      </AppText>
                      <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                        {formatRupiah(item.subtotal)}
                      </AppText>
                    </View>
                  ))}
                  {review.tip > 0 ? (
                    <View style={styles.summaryRow}>
                      <AppText variant="body" color={theme.inkMuted} style={{ fontSize: 13 }}>
                        Tip
                      </AppText>
                      <AppText variant="body" style={{ fontSize: 13, fontWeight: '700' }}>
                        {formatRupiah(review.tip)}
                      </AppText>
                    </View>
                  ) : null}
                  <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
                  <View style={styles.summaryRow}>
                    <AppText variant="h2" style={{ fontSize: 15 }}>
                      Total
                    </AppText>
                    <AppText variant="mono" color={theme.primary} style={{ fontSize: 24 }}>
                      {formatRupiah(review.total)}
                    </AppText>
                  </View>
                </View>

                <View style={{ gap: 3 }}>
                  <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 11 }}>
                    Barber · {review.item.barber?.nama || 'Barber Toko'}
                    {review.item.kursi_nomor != null ? ` · Kursi ${review.item.kursi_nomor}` : ''}
                  </AppText>
                  <AppText variant="caption" color={theme.inkMuted} style={{ fontSize: 11 }}>
                    Simulasi QRIS — tidak ada transaksi finansial nyata.
                  </AppText>
                </View>

                {payError ? (
                  <View
                    style={[
                      styles.errorBox,
                      { borderColor: theme.danger, backgroundColor: theme.surfaceContainerLow },
                    ]}
                  >
                    <MaterialIcons name="error-outline" size={15} color={theme.danger} />
                    <AppText variant="body" color={theme.danger} style={{ fontSize: 12, flex: 1 }}>
                      {payError}
                    </AppText>
                  </View>
                ) : null}

                <View style={styles.sheetActions}>
                  <Button
                    label="Batal"
                    variant="ghost"
                    onPress={handleCancelReview}
                    disabled={paying}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Bayar Sekarang"
                    icon="check"
                    variant="primary"
                    onPress={handlePay}
                    loading={paying}
                    style={{ flex: 1.5 }}
                  />
                </View>
              </>
            ) : null}
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraArea: { flex: 1 },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 28,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 18,
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewfinder: {
    width: 250,
    height: 250,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#FFFFFF',
    opacity: 0.75,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  sheetCard: { gap: 12, paddingVertical: 20 },
  summaryBox: { borderWidth: 1.5, borderRadius: 8, padding: 12, gap: 7 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  divider: { height: 1.5, width: '100%', marginVertical: 2 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 3,
    padding: 8,
    borderRadius: 6,
  },
  sheetActions: { flexDirection: 'row', gap: 10 },
});

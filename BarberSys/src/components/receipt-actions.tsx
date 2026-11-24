import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as Print from 'expo-print';
import { Button } from '@/components/ui/button';
import { buildReceiptHtml, type ReceiptData } from '@/lib/receipt';
import { loadReceiptForQueue } from '@/lib/receipt-service';
import { sharePdfFromHtml } from '@/lib/share-pdf';

interface ReceiptActionsProps {
  /** Struk yang sudah disusun layar pemanggil. */
  receipt?: ReceiptData | null;
  /** Dipakai bila `receipt` belum ada; data diambil saat tombol ditekan. */
  queueId?: string;
  compact?: boolean;
}

/**
 * Tombol cetak & bagikan struk yang dipakai layar Pembayaran dan Riwayat.
 * Satu aksi satu proses; tap ganda dicegah lewat state `busy`.
 */
export function ReceiptActions({ receipt, queueId, compact = false }: ReceiptActionsProps) {
  const [busy, setBusy] = useState<'print' | 'share' | null>(null);

  const resolveReceipt = async (): Promise<ReceiptData> => {
    if (receipt) return receipt;
    if (!queueId) throw new Error('Transaksi tidak ditemukan.');
    return loadReceiptForQueue(queueId);
  };

  const handlePrint = async () => {
    if (busy) return;
    setBusy('print');
    try {
      const data = await resolveReceipt();
      await Print.printAsync({ html: buildReceiptHtml(data) });
    } catch (e: any) {
      Alert.alert('Gagal Mencetak', e?.message || 'Struk tidak bisa dicetak.');
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy('share');
    try {
      const data = await resolveReceipt();
      await sharePdfFromHtml({
        html: buildReceiptHtml(data),
        fileName: `struk-${data.kodeTransaksi || data.nomor_antrian}`,
        dialogTitle: 'Bagikan Struk',
      });
    } catch (e: any) {
      Alert.alert('Gagal Membagikan', e?.message || 'Struk tidak bisa dibagikan.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Button
          label="Cetak"
          icon="print"
          variant="dark"
          loading={busy === 'print'}
          disabled={busy !== null}
          onPress={handlePrint}
        />
      </View>
      <View style={styles.flex}>
        <Button
          label={compact ? 'Bagikan' : 'Bagikan PDF'}
          icon="share"
          variant="secondary"
          loading={busy === 'share'}
          disabled={busy !== null}
          onPress={handleShare}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
});

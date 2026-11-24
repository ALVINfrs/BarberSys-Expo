import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { buildShareUri } from './share-path';

export { buildShareUri };

/**
 * PDF dibuat oleh expo-print di cache aplikasi. Di Expo Go, cache expo-print
 * berada di luar cache experience yang diizinkan expo-sharing, jadi PDF
 * ditulis ulang ke `FileSystem.cacheDirectory` (scoped) sebelum dibagikan.
 */
async function ensureSharingAvailable(): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Berbagi file tidak tersedia di perangkat ini.');
  }
}

export async function shareLocalFile(
  uri: string,
  options?: { mimeType?: string; dialogTitle?: string }
): Promise<void> {
  await ensureSharingAvailable();
  await Sharing.shareAsync(uri, options);
}

export async function sharePdfFromHtml(input: {
  html: string;
  fileName: string;
  dialogTitle?: string;
}): Promise<void> {
  await ensureSharingAvailable();

  const { base64 } = await Print.printToFileAsync({ html: input.html, base64: true });
  if (!base64) throw new Error('Gagal menyiapkan PDF.');

  const uri = buildShareUri(cacheDirectory, input.fileName);
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: input.dialogTitle || 'Bagikan PDF',
  });
}

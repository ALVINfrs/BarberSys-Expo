/**
 * Nama file share yang aman. Modul murni supaya bisa diuji Node tanpa
 * memuat modul native expo-print/expo-sharing.
 */
export function buildShareUri(
  cacheDirectory: string | null,
  fileName: string,
  nowMs = Date.now()
): string {
  if (!cacheDirectory) throw new Error('Folder cache tidak tersedia.');
  const safe =
    fileName
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'file';
  return `${cacheDirectory}${safe}-${nowMs}.pdf`;
}

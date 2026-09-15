import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

export type PhotoBucket = 'avatars' | 'treatments' | 'products';

/**
 * Alur unggah foto baku (PRD 7.4): tap foto -> expo-image-picker ->
 * upload ke bucket -> kembalikan public URL untuk disimpan ke `foto_url`.
 *
 * Untuk bucket `avatars`, path wajib diawali UID pengguna
 * (`<uid>/<timestamp>.jpg`) sesuai kebijakan Storage self-write.
 */
export async function pickAndUploadPhoto(
  bucket: PhotoBucket,
  pathPrefix: string
): Promise<string> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Izin akses galeri ditolak. Aktifkan di pengaturan perangkat.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) {
    throw new Error('__CANCELLED__');
  }

  const uri = result.assets[0].uri;
  // Jangan pakai fetch().blob(): di runtime RN ia terkirim sebagai string
  // "[object Blob]" (14 byte). Baca base64 native lalu kirim bytes mentah.
  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const path = `${pathPrefix}/${Date.now()}.jpg`;
  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });

  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function isPickerCancelled(e: unknown): boolean {
  return e instanceof Error && e.message === '__CANCELLED__';
}

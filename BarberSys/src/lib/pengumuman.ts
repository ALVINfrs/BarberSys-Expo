import type { DisplayRow } from './display';

/**
 * F5.2 — teks & dedupe pengumuman TTS Display TV.
 * Modul murni: tidak menyentuh `window`, DOM, atau storage.
 */

/** "Nomor antrian A 12. Silakan menuju kursi 3. Barber Budi." */
export function buildAnnouncementText(row: DisplayRow): string {
  const nomor = Math.max(0, Math.trunc(Number(row.nomor_antrian) || 0));
  const parts = [`Nomor antrian A ${nomor}.`];

  if (row.kursi_nomor != null) {
    parts.push(`Silakan menuju kursi ${row.kursi_nomor}.`);
    if (row.barber_nama) parts.push(`Barber ${row.barber_nama}.`);
  } else if (row.barber_nama) {
    parts.push(`Silakan menuju barber ${row.barber_nama}.`);
  } else {
    parts.push('Silakan menuju kasir.');
  }

  return parts.join(' ');
}

/**
 * Kunci dedupe: satu pengumuman per panggilan.
 * `called_at` baru (panggil ulang) menghasilkan kunci baru.
 */
export function announcementKey(row: DisplayRow): string | null {
  if (row.status !== 'dipanggil' || !row.called_at) return null;
  return `${row.queue_id}:${row.called_at}`;
}

/** Tandai semua panggilan yang sudah ada saat halaman pertama dibuka. */
export function seedAnnouncementKeys(rows: DisplayRow[]): Set<string> {
  const seen = new Set<string>();
  for (const row of rows || []) {
    const key = announcementKey(row);
    if (key) seen.add(key);
  }
  return seen;
}

/**
 * Ambil panggilan baru yang belum pernah diumumkan, lalu tandai sebagai
 * sudah diumumkan di `seen` (mutasi disengaja agar render berikutnya diam).
 */
export function collectNewAnnouncements(
  rows: DisplayRow[],
  seen: Set<string>
): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = [];
  for (const row of rows || []) {
    const key = announcementKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, text: buildAnnouncementText(row) });
  }
  return out;
}

/** Voice `id-ID` diutamakan, lalu voice berawalan `id`, lalu nama voice Indonesia. */
export function pickIndonesianVoice<T extends { lang: string; name?: string }>(
  voices: T[]
): T | null {
  const list = Array.isArray(voices) ? voices : [];
  const exact = list.find((v) => String(v.lang).toLowerCase() === 'id-id');
  if (exact) return exact;
  const generic = list.find((v) =>
    String(v.lang).toLowerCase().replace('_', '-').startsWith('id')
  );
  if (generic) return generic;

  // Sebagian browser/OS tidak mengisi `lang` dengan benar. Nama voice
  // Indonesia yang umum: "Indonesian", "Bahasa", "Gadis", "Andika".
  const byName = list.find((v) => {
    const name = String(v.name || '').toLowerCase();
    return (
      name.includes('indonesia') ||
      name.includes('bahasa') ||
      name.includes('gadis') ||
      name.includes('andika')
    );
  });
  return byName || null;
}

/** Teks & kunci dedupe pengumuman Display TV — modul murni, tanpa browser API. */

export interface AnnouncementInput {
  nomor: number;
  barberNama: string | null;
  kursi: number | null;
}

export function formatNomorAntrian(nomor: number): string {
  return `A-${String(nomor).padStart(2, '0')}`;
}

export function buildAnnouncementText(input: AnnouncementInput): string {
  const nomor = formatNomorAntrian(input.nomor);
  const parts = [`Nomor antrian ${nomor}`];

  if (input.kursi != null) parts.push(`silakan ke Kursi ${input.kursi}`);
  if (input.barberNama?.trim()) parts.push(`bersama ${input.barberNama.trim()}`);
  if (parts.length === 1) parts.push('silakan menuju meja layanan');

  return `${parts.join(', ')}.`;
}

export function announcementKey(input: { queueId: string; calledAt: string }): string {
  return `${input.queueId}|${input.calledAt}`;
}

const WIB_MS = 7 * 60 * 60 * 1000;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Jam dinding WIB (UTC+7) dari instant ISO, tanpa bergantung timezone device. */
export function formatWIBClock(iso: string): string {
  const d = new Date(new Date(iso).getTime() + WIB_MS);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

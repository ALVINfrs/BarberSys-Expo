/**
 * Payload panggil ulang. Hanya `called_at` yang diubah supaya dedupe
 * notifikasi customer & TTS Display TV terpicu ulang tanpa mengubah status,
 * barber, atau kursi.
 */
export interface RepeatCallInput {
  queueId: string;
  nowIso: string;
}

export interface RepeatCallUpdate {
  called_at: string;
}

export function buildRepeatCallUpdate(input: RepeatCallInput): RepeatCallUpdate {
  if (!input.queueId.trim()) throw new Error('Antrian tidak ditemukan.');
  return { called_at: input.nowIso };
}

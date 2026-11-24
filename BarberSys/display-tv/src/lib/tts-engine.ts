/** Pemilih mesin TTS Display TV — murni, tanpa API browser. */

export type TtsMode = 'piper' | 'browser' | 'none';
export type PreferredTts = 'piper' | 'browser';

/**
 * Piper Indonesia diprioritaskan. Browser dipakai bila Piper belum siap dan
 * punya voice id-ID; bila browser tidak punya, Piper tetap dipakai walau
 * pengguna memilih browser.
 */
export function resolveTtsMode(
  preferred: PreferredTts,
  piperReady: boolean,
  browserIdVoice: boolean
): TtsMode {
  if (preferred === 'piper' && piperReady) return 'piper';
  if (browserIdVoice) return 'browser';
  if (piperReady) return 'piper';
  return 'none';
}

export function shouldShowVoiceWarning(mode: TtsMode, browserIdVoice: boolean): boolean {
  return mode === 'none' || (mode === 'browser' && !browserIdVoice);
}

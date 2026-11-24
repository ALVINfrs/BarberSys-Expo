import { useCallback, useEffect, useRef, useState } from 'react';
import { announcementKey, buildAnnouncementText } from './announcement';
import type { DisplayRow } from './use-display';

const VOICE_STORAGE_KEY = 'barbersys:display:voiceUri';

/** TTS Bahasa Indonesia dengan voice picker, dedupe, dan izin pengguna. */
export function useSpeech(rows: DisplayRow[]) {
  const [enabled, setEnabled] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState<string | null>(() =>
    localStorage.getItem(VOICE_STORAGE_KEY)
  );
  const [noIndonesianVoice, setNoIndonesianVoice] = useState(false);
  const spoken = useRef<Set<string>>(new Set());

  useEffect(() => {
    const load = () => {
      const list = window.speechSynthesis?.getVoices() || [];
      setVoices(list);
      setNoIndonesianVoice(!list.some((v) => v.lang.toLowerCase().startsWith('id')));
    };
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  useEffect(() => {
    if (voiceUri) localStorage.setItem(VOICE_STORAGE_KEY, voiceUri);
  }, [voiceUri]);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !('speechSynthesis' in window)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.95;
      const chosen =
        voices.find((v) => v.voiceURI === voiceUri) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('id'));
      if (chosen) {
        utterance.voice = chosen;
        utterance.lang = chosen.lang;
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [enabled, voices, voiceUri]
  );

  useEffect(() => {
    if (!enabled) return;
    rows.forEach((row) => {
      if (row.status !== 'dipanggil' || !row.called_at) return;
      const key = announcementKey({ queueId: row.queue_id, calledAt: row.called_at });
      if (spoken.current.has(key)) return;
      spoken.current.add(key);
      speak(
        buildAnnouncementText({
          nomor: row.nomor_antrian,
          barberNama: row.barber_nama,
          kursi: row.kursi_nomor,
        })
      );
    });
  }, [rows, speak, enabled]);

  const testVoice = useCallback(() => {
    speak('Tes suara BarberSys. Nomor antrian A-01, silakan ke Kursi satu.');
  }, [speak]);

  return {
    enabled,
    setEnabled,
    voices,
    voiceUri,
    setVoiceUri,
    noIndonesianVoice,
    testVoice,
  };
}

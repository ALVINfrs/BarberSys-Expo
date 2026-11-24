import { useCallback, useEffect, useRef, useState } from 'react';
import { announcementKey, buildAnnouncementText } from './announcement';
import {
  resolveTtsMode,
  shouldShowVoiceWarning,
  type PreferredTts,
  type TtsMode,
} from './tts-engine';
import type { DisplayRow } from './use-display';

const VOICE_STORAGE_KEY = 'barbersys:display:voiceUri';
const MODE_STORAGE_KEY = 'barbersys:display:ttsMode';
const PIPER_VOICE = 'id_ID-news_tts-medium';

/**
 * Piper mempublikasikan voice Indonesia di repo rhasspy, sedangkan library
 * memakai repo diffusionstudio sebagai base. Path relatif ini menuju file yang
 * sama di repo rhasspy dan tetap dianggap https://huggingface.co oleh OPFS.
 */
const PIPER_MODEL_PATH =
  '../../../../rhasspy/piper-voices/resolve/main/id/id_ID/news_tts/medium/' +
  'id_ID-news_tts-medium.onnx';

const PIPER_WASM_PATHS = {
  onnxWasm: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/',
  piperData:
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
  piperWasm:
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
};

/**
 * Voice id_ID dari rhasspy tidak punya `speaker_id_map`, tapi library memanggil
 * Object.keys() padanya. Tambahkan field kosong di OPFS sebelum inference.
 */
async function patchPiperConfig(): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle('piper', { create: true });
  const file: any = await dir.getFileHandle(`${PIPER_VOICE}.onnx.json`, { create: true });
  const existing = await file.getFile();
  const config = JSON.parse(await existing.text());
  if (!config.speaker_id_map) config.speaker_id_map = {};
  if (!config.inference) config.inference = {};
  if (config.inference.noise_w == null) config.inference.noise_w = 0.8;
  const writable = await file.createWritable();
  await writable.write(new Blob([JSON.stringify(config)], { type: 'application/json' }));
  await writable.close();
}

type PiperModule = typeof import('@mintplex-labs/piper-tts-web');
type PiperSession = InstanceType<PiperModule['TtsSession']>;

let piperSession: PiperSession | null = null;

async function loadPiper(): Promise<PiperModule> {
  const tts = await import('@mintplex-labs/piper-tts-web');
  (tts.PATH_MAP as Record<string, string>)[PIPER_VOICE] = PIPER_MODEL_PATH;
  return tts;
}

/**
 * `tts.predict()` membuat sesi tanpa wasmPaths sehingga selalu memakai
 * konstanta CDN 1.18 yang sudah 404. Buat sesi sendiri dengan path eksplisit.
 */
async function getPiperSession(tts: PiperModule): Promise<PiperSession> {
  if (!piperSession) {
    piperSession = await tts.TtsSession.create({
      voiceId: PIPER_VOICE,
      wasmPaths: PIPER_WASM_PATHS,
    });
  }
  piperSession.voiceId = PIPER_VOICE;
  return piperSession;
}

/** TTS Bahasa Indonesia lokal (Piper), dengan fallback speechSynthesis browser. */
export function useSpeech(rows: DisplayRow[]) {
  const [enabled, setEnabled] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState<string | null>(() =>
    localStorage.getItem(VOICE_STORAGE_KEY)
  );
  const [preferred, setPreferredState] = useState<PreferredTts>(() =>
    localStorage.getItem(MODE_STORAGE_KEY) === 'browser' ? 'browser' : 'piper'
  );
  const [browserIdVoice, setBrowserIdVoice] = useState(false);
  const [piperReady, setPiperReady] = useState(false);
  const [piperLoading, setPiperLoading] = useState(false);
  const [piperProgress, setPiperProgress] = useState(0);
  const [piperError, setPiperError] = useState<string | null>(null);
  const spoken = useRef<Set<string>>(new Set());

  const mode: TtsMode = resolveTtsMode(preferred, piperReady, browserIdVoice);
  const warning = shouldShowVoiceWarning(mode, browserIdVoice);

  useEffect(() => {
    const load = () => {
      const list = window.speechSynthesis?.getVoices() || [];
      setVoices(list);
      setBrowserIdVoice(list.some((v) => v.lang.toLowerCase().startsWith('id')));
    };
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  useEffect(() => {
    if (voiceUri) localStorage.setItem(VOICE_STORAGE_KEY, voiceUri);
  }, [voiceUri]);

  const setPreferred = useCallback((next: PreferredTts) => {
    localStorage.setItem(MODE_STORAGE_KEY, next);
    setPreferredState(next);
  }, []);

  const initPiper = useCallback(async () => {
    if (piperReady || piperLoading) return;
    setPiperLoading(true);
    setPiperError(null);
    try {
      const tts = await loadPiper();
      const stored = await tts.stored();
      if (!stored.includes(PIPER_VOICE)) {
        await tts.download(PIPER_VOICE, (progress) => {
          const total = progress.total || 1;
          setPiperProgress(Math.min(100, Math.round((progress.loaded * 100) / total)));
        });
      }
      await patchPiperConfig();
      await getPiperSession(tts);
      setPiperReady(true);
    } catch (e: any) {
      setPiperError(e?.message || 'Model Piper gagal dimuat.');
    } finally {
      setPiperLoading(false);
    }
  }, [piperReady, piperLoading]);

  const speakBrowser = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window)) return;
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
    [voices, voiceUri]
  );

  const speak = useCallback(
    async (text: string) => {
      if (!enabled) return;
      if (mode === 'piper') {
        try {
          console.log('[display] Piper mulai:', text);
          const tts = await loadPiper();
          const session = await getPiperSession(tts);
          const wav = await session.predict(text);
          console.log('[display] Piper WAV:', wav.size, 'bytes');
          const url = URL.createObjectURL(wav);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          await audio.play();
          return;
        } catch (e: any) {
          console.error('[display] Piper gagal:', e);
          setPiperError(e?.message || 'Piper gagal membacakan pengumuman.');
        }
      }
      speakBrowser(text);
    },
    [enabled, mode, speakBrowser]
  );

  const activate = useCallback(() => {
    window.speechSynthesis?.resume();
    setEnabled(true);
    if (preferred === 'piper') void initPiper();
  }, [preferred, initPiper]);

  useEffect(() => {
    if (!enabled) return;
    rows.forEach((row) => {
      if (row.status !== 'dipanggil' || !row.called_at) return;
      const key = announcementKey({ queueId: row.queue_id, calledAt: row.called_at });
      if (spoken.current.has(key)) return;
      spoken.current.add(key);
      void speak(
        buildAnnouncementText({
          nomor: row.nomor_antrian,
          barberNama: row.barber_nama,
          kursi: row.kursi_nomor,
        })
      );
    });
  }, [rows, speak, enabled]);

  const testVoice = useCallback(() => {
    void speak('Tes suara BarberSys. Nomor antrian A-01, silakan ke Kursi satu.');
  }, [speak]);

  return {
    enabled,
    activate,
    voices,
    voiceUri,
    setVoiceUri,
    preferred,
    setPreferred,
    mode,
    warning,
    browserIdVoice,
    piperLoading,
    piperProgress,
    piperError,
    testVoice,
  };
}

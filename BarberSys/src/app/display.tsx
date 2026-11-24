import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { darkStitchTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import {
  buildDisplaySnapshot,
  formatClockWIB,
  type DisplayRow,
} from '@/lib/display';
import { formatQueueNumber } from '@/lib/ticker';
import { Reveal } from '@/components/ui/reveal';
import { Ticker } from '@/components/ui/ticker';
import {
  collectNewAnnouncements,
  pickIndonesianVoice,
  seedAnnouncementKeys,
} from '@/lib/pengumuman';
import { getHoldRefreshDelayMs } from '@/lib/waktu';
import { Fonts } from '@/constants/fonts';

/**
 * F5.1/F5.2 — Display TV publik (web, tanpa login).
 * Selalu dark mode sesuai design.md §8.
 */

const CACHE_KEY = 'barbersys:display:snapshot:v1';
const MONO = Platform.select({ web: "'JetBrains Mono', 'Space Mono', monospace", default: 'monospace' });

interface DisplayCache {
  rows: DisplayRow[];
  savedAt: number;
}

function readCache(): DisplayCache | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return {
      rows: parsed.rows as DisplayRow[],
      savedAt: Number(parsed.savedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

function writeCache(rows: DisplayRow[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const payload: DisplayCache = { rows, savedAt: Date.now() };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Cache hanya optimasi; abaikan kegagalan quota/privacy mode.
  }
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis || null;
}

/**
 * Chrome/Edge kadang mengembalikan daftar voice kosong sampai event
 * `voiceschanged` menyala. Tunggu sebentar sebelum memutuskan voice tidak ada.
 */
function getVoicesWhenReady(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  const synth = getSynth();
  if (!synth) return Promise.resolve([]);

  const immediate = synth.getVoices();
  if (immediate.length > 0) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', finish);
    setTimeout(finish, timeoutMs);
  });
}

export default function DisplayScreen() {
  const theme = darkStitchTheme;
  const [initialCache] = useState(() => readCache());
  const [rows, setRows] = useState<DisplayRow[]>(initialCache?.rows ?? []);
  const [now, setNow] = useState(() => Date.now());
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [lastSync, setLastSync] = useState<number | null>(initialCache?.savedAt ?? null);
  const [storeName, setStoreName] = useState('BARBERSYS');
  const [soundReady, setSoundReady] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

  const seenRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);
  const soundReadyRef = useRef(false);
  const repeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceRef = useRef<(text: string) => void>(() => {});

  const announce = useCallback((text: string) => {
    if (!soundReadyRef.current) return;
    const synth = getSynth();
    if (!synth) return;

    if (repeatTimerRef.current) {
      clearTimeout(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
    synth.cancel();

    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickIndonesianVoice(synth.getVoices());
      utterance.lang = voice?.lang || 'id-ID';
      utterance.rate = 0.95;
      if (voice) {
        utterance.voice = voice;
        setVoiceNote((note) => (note ? null : note));
      }
      synth.speak(utterance);
    };

    speak();
    repeatTimerRef.current = setTimeout(speak, 1600);
  }, []);

  announceRef.current = announce;

  const applyRows = useCallback((next: DisplayRow[]) => {
    setRows(next);
    if (!seededRef.current) {
      seenRef.current = seedAnnouncementKeys(next);
      seededRef.current = true;
      return;
    }
    const fresh = collectNewAnnouncements(next, seenRef.current);
    if (fresh.length > 0) announceRef.current(fresh[fresh.length - 1].text);
  }, []);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('queue_display').select('*');
      if (error) throw error;
      const next = (data || []) as DisplayRow[];
      applyRows(next);
      writeCache(next);
      setConnection('online');
      setLastSync(Date.now());
    } catch {
      setConnection('offline');
    }
  }, [applyRows]);

  // Sengaja tidak seed dari cache: seed dilakukan saat fetch pertama sukses
  // (`applyRows`) agar reload tidak mengumumkan panggilan yang sudah ada
  // sebelum halaman dibuka.

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'BarberSys — Display Antrian';
    }
  }, []);

  useEffect(() => {
    let alive = true;
    supabase
      .from('barbershop_settings')
      .select('nama_toko')
      .limit(1)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (alive && data?.nama_toko) setStoreName(String(data.nama_toko));
        },
        () => {}
      );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    load();

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('display-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_display' },
        () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(load, 250);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnection('online');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnection('offline');
      });

    const poll = setInterval(load, 20000);

    return () => {
      if (debounce) clearTimeout(debounce);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  // Refresh tepat saat hold terdekat berakhir (plus polling 20 dtk).
  useEffect(() => {
    const delay = getHoldRefreshDelayMs(
      rows.map((row) => row.hold_until),
      Date.now(),
      30000
    );
    if (delay == null) return;
    const timer = setTimeout(() => {
      setNow(Date.now());
      load();
    }, delay);
    return () => clearTimeout(timer);
  }, [rows, load]);

  useEffect(() => {
    return () => {
      if (repeatTimerRef.current) clearTimeout(repeatTimerRef.current);
    };
  }, []);

  const activateSound = useCallback(() => {
    setSoundReady(true);
    soundReadyRef.current = true;

    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (nav?.wakeLock?.request) {
      nav.wakeLock.request('screen').catch(() => {});
    }

    void (async () => {
      const synth = getSynth();
      if (!synth) {
        setVoiceNote('Browser ini tidak mendukung suara.');
        return;
      }

      const voices = await getVoicesWhenReady();
      if (pickIndonesianVoice(voices)) {
        setVoiceNote(null);
        return;
      }

      setVoiceNote(
        voices.length === 0
          ? 'Browser belum menyediakan voice. Pasang paket suara Bahasa Indonesia di Windows: Settings → Time & Language → Speech → Add voices.'
          : 'Voice Bahasa Indonesia belum terpasang — suara memakai voice default. Windows: Settings → Time & Language → Speech → Add voices → Bahasa Indonesia.'
      );
    })();
  }, []);

  const snapshot = buildDisplaySnapshot(rows, now);
  const connectionColor =
    connection === 'online' ? theme.success : connection === 'offline' ? theme.danger : theme.warning;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, { color: theme.ink }]}>BARBERSYS</Text>
          <Text style={[styles.store, { color: theme.amber }]}>{storeName}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.clockRow}>
            <View style={[styles.connectionDot, { backgroundColor: connectionColor }]} />
            <Text style={[styles.clock, { color: theme.ink }]}>{formatClockWIB(new Date(now))}</Text>
          </View>
          <Text style={[styles.syncText, { color: theme.inkMuted }]}>
            {connection === 'offline'
              ? 'Koneksi terputus — menampilkan data terakhir'
              : lastSync
                ? `Terakhir sync ${formatClockWIB(new Date(lastSync))} WIB`
                : 'Menghubungkan…'}
          </Text>
        </View>
      </View>

      <View style={styles.main}>
        <Text style={[styles.sectionLabel, { color: theme.amber }]}>SEDANG DIPANGGIL</Text>

        {snapshot.called.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: theme.cardBorder }]}>
            <Text style={[styles.emptyText, { color: theme.inkMuted }]}>
              Menunggu panggilan berikutnya
            </Text>
          </View>
        ) : (
          <View style={styles.calledGrid}>
            {snapshot.called.map((item, index) => (
              <Reveal key={item.queue_id} delay={index * 60} style={styles.callCardWrap}>
                <View
                  style={[
                    styles.callCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.ink,
                      shadowColor: theme.cardShadow,
                    },
                  ]}
                >
                  <Ticker
                    value={formatQueueNumber(item.nomor_antrian)}
                    fontSize={96}
                    color={theme.amber}
                  />
                  <Text
                    style={[
                      styles.callBadge,
                      { color: item.status === 'dipanggil' ? theme.info : theme.warning },
                    ]}
                  >
                    {item.status === 'dipanggil' ? 'SILAKAN MENUJU KURSI' : 'SEDANG DILAYANI'}
                  </Text>
                  <Text style={[styles.callMeta, { color: theme.ink }]}>
                    {item.barber_nama || 'Barber'}
                    {item.kursi_nomor != null ? ` • Kursi ${item.kursi_nomor}` : ''}
                  </Text>
                </View>
              </Reveal>
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.nextBlock}>
          <Text style={[styles.sectionLabel, { color: theme.inkMuted }]}>ANTRIAN BERIKUTNYA</Text>
          <View style={styles.nextRow}>
            {snapshot.next.length === 0 ? (
              <Text style={[styles.nextEmpty, { color: theme.inkMuted }]}>—</Text>
            ) : (
              snapshot.next.map((item, index) => (
                <Reveal key={item.queue_id} delay={index * 50}>
                  <View
                    style={[styles.nextChip, { borderColor: theme.ink, backgroundColor: theme.surface }]}
                  >
                    <Text style={[styles.nextNumber, { color: theme.ink }]}>
                      {formatQueueNumber(item.nomor_antrian)}
                    </Text>
                  </View>
                </Reveal>
              ))
            )}
          </View>
        </View>

        <View style={[styles.waitingBox, { borderColor: theme.amber, backgroundColor: theme.surface }]}>
          <Text style={[styles.waitingLabel, { color: theme.inkMuted }]}>MENUNGGU</Text>
          <Text style={[styles.waitingCount, { color: theme.amber }]}>{snapshot.waitingCount}</Text>
        </View>
      </View>

      {Platform.OS !== 'web' ? (
        <Text style={[styles.voiceNote, { color: theme.inkMuted }]}>
          Display dirancang untuk browser TV/desktop.
        </Text>
      ) : null}
      {soundReady && voiceNote ? (
        <Text style={[styles.voiceNote, { color: theme.inkMuted }]}>{voiceNote}</Text>
      ) : null}

      {!soundReady ? (
        <View style={styles.overlay}>
          <Text style={[styles.overlayTitle, { color: theme.ink }]}>DISPLAY ANTRIAN</Text>
          <Text style={[styles.overlayText, { color: theme.inkMuted }]}>
            Aktifkan suara agar pengumuman antrian terdengar.
          </Text>
          <Pressable
            onPress={activateSound}
            style={({ pressed }) => [
              styles.overlayButton,
              {
                backgroundColor: theme.amber,
                borderColor: theme.ink,
                shadowColor: theme.cardShadow,
              },
              pressed && styles.overlayButtonPressed,
            ]}
          >
            <Text style={styles.overlayButtonText}>Aktifkan Suara</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 48,
    paddingVertical: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#333338',
    paddingBottom: 20,
    marginBottom: 24,
  },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 32,
    letterSpacing: 3,
  },
  store: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  clock: {
    fontFamily: MONO,
    fontSize: 34,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  syncText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    marginTop: 4,
  },
  main: {
    flex: 1,
  },
  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    letterSpacing: 3.5,
    marginBottom: 14,
  },
  calledGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  callCardWrap: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 280,
    maxWidth: 560,
  },
  callCard: {
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  callBadge: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    letterSpacing: 2,
    marginTop: 4,
  },
  callMeta: {
    fontFamily: Fonts.bodySemi,
    fontSize: 24,
    marginTop: 8,
  },
  emptyCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 24,
    borderTopWidth: 2,
    borderTopColor: '#333338',
    paddingTop: 20,
    marginTop: 24,
  },
  nextBlock: {
    flex: 1,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  nextChip: {
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 84,
    alignItems: 'center',
  },
  nextNumber: {
    fontFamily: MONO,
    fontSize: 32,
    fontWeight: '700',
  },
  nextEmpty: {
    fontFamily: Fonts.mono,
    fontSize: 24,
  },
  waitingBox: {
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 120,
  },
  waitingLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 2,
  },
  waitingCount: {
    fontFamily: MONO,
    fontSize: 42,
    lineHeight: 48,
  },
  voiceNote: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    marginTop: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  overlayTitle: {
    fontFamily: Fonts.display,
    fontSize: 44,
    letterSpacing: 4,
    marginBottom: 12,
  },
  overlayText: {
    fontFamily: Fonts.body,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 28,
  },
  overlayButton: {
    borderWidth: 2,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  overlayButtonPressed: {
    transform: [{ translateX: 3 }, { translateY: 3 }],
    shadowOffset: { width: 1, height: 1 },
  },
  overlayButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    letterSpacing: 1,
    color: '#111111',
  },
});

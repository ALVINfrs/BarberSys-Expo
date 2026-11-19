import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { decideNotification, notificationKey } from '@/lib/notifikasi-antrian';
import type { QueueMyStatus } from '@/types/database';
import {
  ensureNotificationPermission,
  setupAndroidChannel,
  setupNotificationHandler,
  showLocalQueueNotification,
} from '@/lib/notifikasi-device';

/**
 * F5.3 — pantau antrian customer yang sedang login lewat RPC
 * `queue_my_status()` (SECURITY DEFINER), lalu kirim notifikasi lokal saat:
 * - sisa 1 antrian lagi (`hampir`)
 * - status berubah menjadi `dipanggil` (`dipanggil`)
 *
 * Sumber data memakai RPC karena RLS `queue` menutup baris customer lain,
 * sehingga posisi antrian tidak bisa dihitung langsung dari client.
 * Dedupe disimpan di AsyncStorage agar refresh/reconnect tidak mengulang notif.
 */

const DEDUPE_PREFIX = 'barbersys:notif:v1:';
const REFRESH_MS = 20000;

export function useQueueNotifications(): void {
  const previousRef = useRef<QueueMyStatus | null>(null);
  const permissionRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function refresh(): Promise<void> {
      if (!alive || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const { data, error } = await supabase.rpc('queue_my_status');
        if (!alive || error) return;

        const rows = (data as QueueMyStatus[] | null) ?? [];
        const current = rows.length > 0 ? rows[0] : null;
        const previous = previousRef.current;
        previousRef.current = current;

        if (!permissionRef.current) return;

        const kind = decideNotification(current, previous);
        if (!kind || !current) return;

        const dedupeKey = DEDUPE_PREFIX + notificationKey(kind, current);
        try {
          const alreadySent = await AsyncStorage.getItem(dedupeKey);
          if (alreadySent) return;
        } catch {
          // Storage gagal dibaca → tetap coba kirim; dedupe best-effort.
        }

        const shown = await showLocalQueueNotification(kind, current);
        if (!shown) return;

        try {
          await AsyncStorage.setItem(dedupeKey, String(Date.now()));
        } catch {
          // Gagal menyimpan dedupe hanya berarti notif bisa terulang.
        }
      } catch {
        // Jaringan/RPC gagal sesaat → biarkan interval berikutnya mencoba.
      } finally {
        inFlightRef.current = false;
      }
    }

    async function start(): Promise<void> {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!alive || !user) return;

        previousRef.current = null;

        await setupNotificationHandler();
        await setupAndroidChannel();
        permissionRef.current = await ensureNotificationPermission();
        if (!alive) return;

        await refresh();

        channel = supabase
          .channel(`customer-queue-notif-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'queue',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              void refresh();
            }
          )
          .subscribe();

        interval = setInterval(() => {
          void refresh();
        }, REFRESH_MS);
      } catch {
        // Layout tetap harus tampil walau notifikasi tidak bisa disiapkan.
      }
    }

    void start();

    return () => {
      alive = false;
      inFlightRef.current = false;
      if (interval) clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
}

import { Platform } from 'react-native';
import type { QueueMyStatus } from '@/types/database';
import { notificationCopy, type NotificationKind } from '@/lib/notifikasi-antrian';

/**
 * F5.3 — pembungkus `expo-notifications` untuk notifikasi lokal.
 *
 * Semua fungsi aman dipanggil di web/SSR: `expo-notifications` baru diimpor
 * secara dinamis saat benar-benar berjalan di native, sehingga render server
 * (`expo export`/router SSR) tidak menyentuh modul native.
 */

const CHANNEL_ID = 'antrian';
let handlerReady = false;

function isNative(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

/**
 * Atur bagaimana notifikasi tampil saat app sedang di depan (foreground).
 * Di SDK 57 notifikasi foreground tidak tampil tanpa handler ini.
 */
export async function setupNotificationHandler(): Promise<void> {
  if (!isNative() || handlerReady) return;
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerReady = true;
  } catch {
    // Notifikasi hanya fitur tambahan; jangan sampai layout customer crash.
  }
}

/** Minta izin notifikasi sekali; mengembalikan apakah izin diberikan. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Channel Android dengan importance HIGH agar notifikasi muncul sebagai banner. */
export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Antrian',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  } catch {
    // Channel gagal dibuat → notifikasi tetap dicoba lewat schedule di bawah.
  }
}

/**
 * Tampilkan notifikasi lokal segera.
 * Mengembalikan `true` hanya bila notifikasi benar-benar dijadwalkan, supaya
 * pemanggil tahu kapan boleh menyimpan kunci dedupe.
 */
export async function showLocalQueueNotification(
  kind: NotificationKind,
  row: QueueMyStatus
): Promise<boolean> {
  if (!isNative()) return false;
  const copy = notificationCopy(kind, row);
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        sound: 'default',
        data: { queueId: row.id, kind },
      },
      // Android: trigger ber-channel langsung tampil; platform lain: null = segera.
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
    return true;
  } catch {
    return false;
  }
}

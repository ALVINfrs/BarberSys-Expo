/**
 * `CameraView.isAvailableAsync()` hanya tersedia di web. Di native,
 * UnavailabilityError jangan sampai ditafsirkan sebagai "kamera tidak ada".
 */
export type CameraPlatform = 'web' | 'ios' | 'android';

export function canUseCamera(
  platform: CameraPlatform,
  availability: boolean | null | undefined
): boolean {
  if (platform !== 'web') return true;
  return availability === true;
}

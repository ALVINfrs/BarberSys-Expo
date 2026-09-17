import { Profile } from '@/types/database';

export function filterAvailableBarbers(barbers: Profile[]): Profile[] {
  return barbers.filter((b) => b.status_kerja !== 'istirahat');
}

export function isSelectedBarberStillAvailable(
  barbers: Profile[],
  selectedId: string | null
): boolean {
  if (selectedId === null) return true;
  const found = barbers.find((b) => b.id === selectedId);
  if (!found) return false;
  return found.status_kerja !== 'istirahat';
}

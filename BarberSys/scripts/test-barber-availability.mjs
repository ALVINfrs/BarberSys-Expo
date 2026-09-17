import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Inline logic mirrors src/lib/barber-availability.ts to keep test runner plain JS
function filterAvailableBarbers(barbers) {
  return barbers.filter((b) => b.status_kerja !== 'istirahat');
}
function isSelectedBarberStillAvailable(barbers, selectedId) {
  if (selectedId === null) return true;
  const found = barbers.find((b) => b.id === selectedId);
  if (!found) return false;
  return found.status_kerja !== 'istirahat';
}

describe('barber-availability', () => {
  it('filterAvailableBarbers hides istirahat', () => {
    const barbers = [
      { id: '1', status_kerja: 'aktif', nama: 'A' },
      { id: '2', status_kerja: 'istirahat', nama: 'B' },
      { id: '3', status_kerja: 'aktif', nama: 'C' },
    ];
    const visible = filterAvailableBarbers(barbers);
    assert.equal(visible.length, 2);
    assert.equal(visible.some((b) => b.id === '2'), false);
  });

  it('isSelectedBarberStillAvailable false when selected goes istirahat', () => {
    const barbers = [
      { id: '1', status_kerja: 'aktif' },
      { id: '2', status_kerja: 'istirahat' },
    ];
    assert.equal(isSelectedBarberStillAvailable(barbers, '2'), false);
    assert.equal(isSelectedBarberStillAvailable(barbers, '1'), true);
    assert.equal(isSelectedBarberStillAvailable(barbers, null), true);
  });

  it('isSelectedBarberStillAvailable false when barber removed', () => {
    const barbers = [{ id: '1', status_kerja: 'aktif' }];
    assert.equal(isSelectedBarberStillAvailable(barbers, '2'), false);
  });
});

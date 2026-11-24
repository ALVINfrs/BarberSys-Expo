import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeTips, filterTipsByPeriode, tipByBarber } from '../src/lib/tip-history.ts';

function tip(overrides = {}) {
  return {
    tanggalIso: '2026-11-22T09:30:00.000Z',
    customerNama: 'Budi',
    barberNama: 'Rudi',
    treatmentNama: 'Potong Rambut',
    jumlah: 10000,
    nomorAntrian: 7,
    ...overrides,
  };
}

describe('tip-history', () => {
  it('summarizeTips menghitung total, jumlah, rata-rata, dan tip terbesar', () => {
    const s = summarizeTips([
      tip({ jumlah: 10000 }),
      tip({ jumlah: 5000 }),
      tip({ jumlah: 15000 }),
    ]);
    assert.deepEqual(s, { count: 3, total: 30000, rataRata: 10000, terbesar: 15000 });
  });

  it('summarizeTips array kosong aman', () => {
    assert.deepEqual(summarizeTips([]), { count: 0, total: 0, rataRata: 0, terbesar: 0 });
  });

  it('filterTipsByPeriode memakai batas WIB 7/30 hari', () => {
    const now = new Date('2026-11-22T06:00:00.000Z'); // 22 Nov 13:00 WIB
    const items = [
      tip({ tanggalIso: '2026-11-22T09:00:00.000Z' }),
      tip({ tanggalIso: '2026-11-16T09:00:00.000Z' }),
      tip({ tanggalIso: '2026-11-01T09:00:00.000Z' }),
      tip({ tanggalIso: '2025-12-01T09:00:00.000Z' }),
    ];
    assert.equal(filterTipsByPeriode(items, '7', now).length, 2);
    assert.equal(filterTipsByPeriode(items, '30', now).length, 3);
    assert.equal(filterTipsByPeriode(items, 'semua', now).length, 4);
  });

  it('tipByBarber mengelompokkan per barber dan mengurut total terbesar', () => {
    const result = tipByBarber([
      tip({ barberNama: 'Rudi', jumlah: 10000 }),
      tip({ barberNama: 'Dedi', jumlah: 20000 }),
      tip({ barberNama: 'Rudi', jumlah: 5000 }),
    ]);
    assert.deepEqual(result, [
      { barberNama: 'Dedi', total: 20000, count: 1 },
      { barberNama: 'Rudi', total: 15000, count: 2 },
    ]);
  });
});

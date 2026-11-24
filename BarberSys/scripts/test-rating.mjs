import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeRatings, filterRatings } from '../src/lib/rating.ts';

function entry(overrides = {}) {
  return {
    rating: 5,
    komentar: 'Bagus',
    customerNama: 'Budi',
    barberNama: 'Rudi',
    treatmentNama: 'Potong Rambut',
    tanggalIso: '2026-11-22T09:30:00.000Z',
    ...overrides,
  };
}

describe('rating', () => {
  it('summarizeRatings menghitung rata-rata, jumlah, dan distribusi bintang', () => {
    const s = summarizeRatings([
      entry({ rating: 5, komentar: 'Bagus' }),
      entry({ rating: 4, komentar: null }),
      entry({ rating: 3, komentar: 'Biasa' }),
    ]);
    assert.equal(s.avg, 4);
    assert.equal(s.count, 3);
    assert.deepEqual(s.distribution, { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 });
    assert.equal(s.denganKomentar, 2);
  });

  it('summarizeRatings array kosong aman', () => {
    assert.deepEqual(summarizeRatings([]), {
      avg: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      denganKomentar: 0,
    });
  });

  it('filterRatings menggabungkan barber dan minRating (AND)', () => {
    const items = [
      entry({ barberNama: 'Rudi', rating: 5 }),
      entry({ barberNama: 'Rudi', rating: 3 }),
      entry({ barberNama: 'Dedi', rating: 5 }),
    ];
    const result = filterRatings(items, { barber: 'Rudi', minRating: 4 });
    assert.equal(result.length, 1);
    assert.equal(result[0].rating, 5);
  });

  it('filterRatings tanpa kriteria mengembalikan semua', () => {
    const items = [entry(), entry({ rating: 1 })];
    assert.equal(filterRatings(items, {}).length, 2);
  });
});

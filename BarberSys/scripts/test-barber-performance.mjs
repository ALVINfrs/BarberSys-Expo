import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizePerformansi, ratingComments } from '../src/lib/barber-performance.ts';

function entry(overrides = {}) {
  return {
    tanggalIso: '2026-11-22T09:30:00.000Z',
    total: 55000,
    tip: 5000,
    rating: 5,
    komentar: 'Bagus',
    customerNama: 'Budi',
    ...overrides,
  };
}

describe('barber-performance', () => {
  it('summarizePerformansi mengagregasi omset, tip, dan rating (null diabaikan)', () => {
    const s = summarizePerformansi([
      entry({ total: 50000, tip: 5000, rating: 5 }),
      entry({ total: 40000, tip: 0, rating: 3 }),
      entry({ total: 30000, tip: 2000, rating: null }),
    ]);
    assert.equal(s.count, 3);
    assert.equal(s.omset, 120000);
    assert.equal(s.tip, 7000);
    assert.equal(s.avgRating, 4);
  });

  it('summarizePerformansi menghitung today/week count menurut WIB', () => {
    const now = new Date('2026-11-22T06:00:00.000Z'); // 22 Nov 13:00 WIB
    const s = summarizePerformansi(
      [
        entry({ tanggalIso: '2026-11-22T09:00:00.000Z' }), // hari ini WIB
        entry({ tanggalIso: '2026-11-20T09:00:00.000Z' }), // minggu ini
        entry({ tanggalIso: '2026-11-10T09:00:00.000Z' }), // lama
      ],
      now
    );
    assert.equal(s.todayCount, 1);
    assert.equal(s.weekCount, 2);
  });

  it('ratingComments hanya komentar terisi, urut terbaru, dibatasi', () => {
    const result = ratingComments(
      [
        entry({ tanggalIso: '2026-11-20T09:00:00.000Z', komentar: 'Lama', rating: 4 }),
        entry({ tanggalIso: '2026-11-22T09:00:00.000Z', komentar: 'Baru', rating: 5 }),
        entry({ tanggalIso: '2026-11-21T09:00:00.000Z', komentar: '', rating: 3 }),
        entry({ tanggalIso: '2026-11-21T10:00:00.000Z', komentar: null, rating: 2 }),
      ],
      2
    );
    assert.equal(result.length, 2);
    assert.equal(result[0].komentar, 'Baru');
    assert.equal(result[1].komentar, 'Lama');
  });
});

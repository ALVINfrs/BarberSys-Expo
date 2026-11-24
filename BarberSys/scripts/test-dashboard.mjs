import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  dailyRevenue,
  barberPerformance,
  latestRatings,
} from '../src/lib/dashboard.ts';

function tx(overrides = {}) {
  return {
    tanggalIso: '2026-11-22T09:30:00.000Z',
    total: 55000,
    barberId: 'b1',
    barberNama: 'Rudi',
    tip: 5000,
    rating: 5,
    komentar: 'Bagus',
    customerNama: 'Budi',
    ...overrides,
  };
}

describe('dashboard', () => {
  it('dailyRevenue mengembalikan tepat 7 hari WIB dengan nol untuk hari kosong', () => {
    const days = dailyRevenue(
      [
        tx({ tanggalIso: '2026-11-22T09:30:00.000Z', total: 50000 }),
        tx({ tanggalIso: '2026-11-22T17:30:00.000Z', total: 10000 }), // 23 Nov WIB
      ],
      new Date('2026-11-22T06:00:00.000Z') // 22 Nov 13:00 WIB
    );
    assert.equal(days.length, 7);
    assert.equal(days[6].iso, '2026-11-22');
    assert.equal(days[6].total, 50000);
    assert.equal(days[5].total, 0);
    assert.ok(days.every((d) => typeof d.total === 'number'));
  });

  it('dailyRevenue mengelompokkan menurut tanggal WIB, bukan UTC', () => {
    const days = dailyRevenue(
      [tx({ tanggalIso: '2026-11-21T19:30:00.000Z', total: 70000 })],
      new Date('2026-11-22T06:00:00.000Z')
    );
    const bucket = days.find((d) => d.iso === '2026-11-22');
    assert.equal(bucket?.total, 70000);
  });

  it('barberPerformance menggabungkan transaksi, omset, tip, dan rata-rata rating', () => {
    const perf = barberPerformance([
      tx({ barberId: 'b1', barberNama: 'Rudi', total: 50000, tip: 5000, rating: 5 }),
      tx({ barberId: 'b1', barberNama: 'Rudi', total: 40000, tip: 0, rating: 3 }),
      tx({ barberId: 'b2', barberNama: 'Dedi', total: 30000, tip: 2000, rating: null }),
    ]);
    assert.equal(perf.length, 2);
    assert.equal(perf[0].barberId, 'b1');
    assert.equal(perf[0].transaksi, 2);
    assert.equal(perf[0].omset, 90000);
    assert.equal(perf[0].tip, 5000);
    assert.equal(perf[0].avgRating, 4);
    assert.equal(perf[1].avgRating, 0);
  });

  it('latestRatings hanya rating, urut terbaru, dibatasi limit', () => {
    const rated = [
      tx({ tanggalIso: '2026-11-20T09:00:00.000Z', rating: 4, komentar: 'Lama' }),
      tx({ tanggalIso: '2026-11-22T09:00:00.000Z', rating: 5, komentar: 'Baru' }),
      tx({ tanggalIso: '2026-11-21T09:00:00.000Z', rating: null }),
    ];
    const result = latestRatings(rated, 2);
    assert.equal(result.length, 2);
    assert.equal(result[0].komentar, 'Baru');
    assert.equal(result[1].komentar, 'Lama');
  });
});

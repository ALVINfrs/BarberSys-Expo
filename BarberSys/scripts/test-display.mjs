import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDisplaySnapshot,
  formatClockWIB,
  formatNomorAntrian,
  isHeld,
} from '../src/lib/display.ts';

const NOW = new Date('2026-11-19T03:00:00.000Z'); // 10:00 WIB
const NOW_MS = NOW.getTime();

function row(overrides = {}) {
  return {
    queue_id: 'q-' + Math.random().toString(36).slice(2),
    nomor_antrian: 1,
    status: 'menunggu',
    hold_until: null,
    barber_nama: null,
    kursi_nomor: null,
    created_at: '2026-11-19T02:00:00.000Z',
    called_at: null,
    ...overrides,
  };
}

describe('formatNomorAntrian', () => {
  it('memakai A-02 untuk nomor satu digit dan A-12 untuk dua digit', () => {
    assert.equal(formatNomorAntrian(2), 'A-02');
    assert.equal(formatNomorAntrian(9), 'A-09');
    assert.equal(formatNomorAntrian(10), 'A-10');
    assert.equal(formatNomorAntrian(12), 'A-12');
  });
});

describe('isHeld', () => {
  it('menahan hanya bila hold_until masih di masa depan', () => {
    assert.equal(isHeld({ hold_until: '2026-11-19T04:00:00.000Z' }, NOW_MS), true);
    assert.equal(isHeld({ hold_until: '2026-11-19T02:00:00.000Z' }, NOW_MS), false);
    assert.equal(isHeld({ hold_until: null }, NOW_MS), false);
    assert.equal(isHeld({ hold_until: 'bukan-tanggal' }, NOW_MS), false);
  });
});

describe('buildDisplaySnapshot', () => {
  it('memisahkan panggilan aktif, antrian berikutnya, dan menghitung menunggu', () => {
    const r1 = row({ nomor_antrian: 1, created_at: '2026-11-19T02:00:00.000Z' });
    const r2 = row({ nomor_antrian: 2, created_at: '2026-11-19T02:05:00.000Z' });
    const held = row({
      nomor_antrian: 3,
      created_at: '2026-11-19T02:06:00.000Z',
      hold_until: '2026-11-19T04:00:00.000Z',
    });
    const holdPassed = row({
      nomor_antrian: 4,
      created_at: '2026-11-19T02:07:00.000Z',
      hold_until: '2026-11-19T02:30:00.000Z',
    });
    const called = row({
      nomor_antrian: 5,
      status: 'dipanggil',
      called_at: '2026-11-19T02:10:00.000Z',
      barber_nama: 'Budi',
      kursi_nomor: 2,
    });
    const served = row({
      nomor_antrian: 6,
      status: 'dilayani',
      called_at: '2026-11-19T02:00:00.000Z',
      barber_nama: 'Andi',
      kursi_nomor: 1,
    });
    const r7 = row({ nomor_antrian: 7, created_at: '2026-11-19T02:01:00.000Z' });

    const snap = buildDisplaySnapshot([r1, r2, held, holdPassed, called, served, r7], NOW_MS);

    assert.deepEqual(snap.called.map((r) => r.nomor_antrian), [5, 6]);
    assert.deepEqual(snap.next.map((r) => r.nomor_antrian), [1, 7, 2, 4]);
    assert.equal(snap.waitingCount, 4);
  });

  it('membatasi daftar berikutnya tanpa memotong jumlah menunggu', () => {
    const rows = Array.from({ length: 7 }, (_, i) =>
      row({
        nomor_antrian: i + 1,
        created_at: new Date(Date.UTC(2026, 10, 19, 2, i, 0)).toISOString(),
      })
    );

    const snap = buildDisplaySnapshot(rows, NOW_MS);
    assert.equal(snap.next.length, 5);
    assert.equal(snap.waitingCount, 7);
  });

  it('tahan terhadap input kosong', () => {
    const snap = buildDisplaySnapshot([], NOW_MS);
    assert.deepEqual(snap, { called: [], next: [], waitingCount: 0 });
  });
});

describe('formatClockWIB', () => {
  it('menampilkan HH:MM:SS jam dinding Asia/Jakarta', () => {
    assert.equal(formatClockWIB(new Date('2026-11-19T02:03:04.000Z')), '09:03:04');
    assert.equal(formatClockWIB(new Date('2026-11-19T17:59:58.000Z')), '00:59:58');
  });
});

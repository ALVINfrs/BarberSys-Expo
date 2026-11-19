import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseTimeToMinutes,
  isOutsideJam,
  getNextJamBukaISO,
  isValidTimeHHMM,
} from '../src/lib/jam-operasional.ts';

describe('jam-operasional', () => {
  it('parse HH:MM dan HH:MM:SS', () => {
    assert.equal(parseTimeToMinutes('09:00'), 540);
    assert.equal(parseTimeToMinutes('09:00:00'), 540);
    assert.equal(parseTimeToMinutes('21:30'), 1290);
  });

  it('batas buka tepat 09:00 dan tutup tepat 21:00 (instant UTC, bukan jam device)', () => {
    // 01:00Z = 08:00 WIB, 02:00Z = 09:00 WIB, 13:59Z = 20:59 WIB, 14:00Z = 21:00 WIB
    assert.equal(isOutsideJam(new Date('2026-11-18T01:00:00Z'), '09:00', '21:00'), true);
    assert.equal(isOutsideJam(new Date('2026-11-18T02:00:00Z'), '09:00', '21:00'), false);
    assert.equal(isOutsideJam(new Date('2026-11-18T13:59:00Z'), '09:00', '21:00'), false);
    assert.equal(isOutsideJam(new Date('2026-11-18T14:00:00Z'), '09:00', '21:00'), true);
  });

  it('jadwal lewat tengah malam', () => {
    // 15:00, 23:00, 00:00, 02:00 WIB
    assert.equal(isOutsideJam(new Date('2026-11-18T08:00:00Z'), '21:00', '02:00'), true);
    assert.equal(isOutsideJam(new Date('2026-11-18T16:00:00Z'), '21:00', '02:00'), false);
    assert.equal(isOutsideJam(new Date('2026-11-18T17:00:00Z'), '21:00', '02:00'), false);
    assert.equal(isOutsideJam(new Date('2026-11-18T19:00:00Z'), '21:00', '02:00'), true);
  });

  it('getNextJamBukaISO: sebelum buka = hari ini, setelah buka = besok', () => {
    assert.equal(
      getNextJamBukaISO('09:00', new Date('2026-11-18T01:00:00Z')),
      '2026-11-18T02:00:00.000Z'
    );
    assert.equal(
      getNextJamBukaISO('09:00', new Date('2026-11-18T03:00:00Z')),
      '2026-11-19T02:00:00.000Z'
    );
  });

  it('validasi input HH:MM untuk editor Admin', () => {
    assert.equal(isValidTimeHHMM('00:00'), true);
    assert.equal(isValidTimeHHMM('09:00'), true);
    assert.equal(isValidTimeHHMM('23:59'), true);
    assert.equal(isValidTimeHHMM('24:00'), false);
    assert.equal(isValidTimeHHMM('9:00'), false);
    assert.equal(isValidTimeHHMM('09:60'), false);
    assert.equal(isValidTimeHHMM('0900'), false);
    assert.equal(isValidTimeHHMM(''), false);
  });
});

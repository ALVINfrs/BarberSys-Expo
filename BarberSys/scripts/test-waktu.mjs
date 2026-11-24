import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  wibParts,
  formatWIBTime,
  formatWIBDate,
  formatJamHHMM,
  isSameWIBDate,
  startOfDayWIBISO,
  startOfNextDayWIBISO,
  addWIBDays,
  startOfWeekWIBISO,
  startOfMonthWIBISO,
  describeHoldUntil,
  getHoldRefreshDelayMs,
} from '../src/lib/waktu.ts';

describe('waktu WIB', () => {
  it('wibParts membaca jam dinding Asia/Jakarta dari instant UTC', () => {
    const p = wibParts('2026-11-18T02:00:00.000Z');
    assert.equal(p.year, 2026);
    assert.equal(p.month, 11);
    assert.equal(p.day, 18);
    assert.equal(p.hour, 9);
    assert.equal(p.minute, 0);
  });

  it('formatWIBTime dan formatWIBDate', () => {
    assert.equal(formatWIBTime('2026-11-18T02:00:00.000Z'), '09:00');
    assert.equal(formatWIBDate('2026-11-17T19:30:00.000Z'), '18 Nov 2026');
  });

  it('formatJamHHMM membuang detik dari kolom time', () => {
    assert.equal(formatJamHHMM('09:00:00'), '09:00');
    assert.equal(formatJamHHMM('21:30'), '21:30');
    assert.equal(formatJamHHMM(null), '');
  });

  it('isSameWIBDate membandingkan tanggal WIB, bukan UTC', () => {
    assert.equal(
      isSameWIBDate('2026-11-17T17:00:00.000Z', '2026-11-18T02:00:00.000Z'),
      true
    );
    assert.equal(
      isSameWIBDate('2026-11-18T01:00:00.000Z', '2026-11-18T02:00:00.000Z'),
      true
    );
    assert.equal(
      isSameWIBDate('2026-11-18T02:00:00.000Z', '2026-11-19T02:00:00.000Z'),
      false
    );
  });

  it('startOfDayWIBISO = 00:00 WIB dalam UTC', () => {
    assert.equal(
      startOfDayWIBISO(new Date('2026-11-18T02:00:00.000Z')),
      '2026-11-17T17:00:00.000Z'
    );
  });

  it('startOfNextDayWIBISO = 00:00 WIB hari berikutnya', () => {
    assert.equal(
      startOfNextDayWIBISO(new Date('2026-11-18T02:00:00.000Z')),
      '2026-11-18T17:00:00.000Z'
    );
  });

  it('addWIBDays menggeser tanggal WIB tanpa kehilangan hari', () => {
    assert.equal(
      addWIBDays(new Date('2026-11-18T02:00:00.000Z'), 1).toISOString(),
      '2026-11-19T05:00:00.000Z'
    );
    assert.equal(
      addWIBDays(new Date('2026-11-18T20:00:00.000Z'), -1).toISOString(),
      '2026-11-18T05:00:00.000Z'
    );
  });

  it('startOfWeekWIBISO mulai Senin', () => {
    // Rabu 18 Nov 2026 -> Senin 16 Nov 2026 00:00 WIB
    assert.equal(
      startOfWeekWIBISO(new Date('2026-11-18T02:00:00.000Z')),
      '2026-11-15T17:00:00.000Z'
    );
  });

  it('startOfMonthWIBISO = tanggal 1 00:00 WIB', () => {
    assert.equal(
      startOfMonthWIBISO(new Date('2026-11-18T02:00:00.000Z')),
      '2026-10-31T17:00:00.000Z'
    );
  });

  it('describeHoldUntil membedakan hari ini / besok / tanggal lain', () => {
    const now = new Date('2026-11-18T01:00:00Z'); // 08:00 WIB
    assert.equal(
      describeHoldUntil('2026-11-18T02:00:00Z', now),
      'hari ini pukul 09:00 WIB'
    );
    assert.equal(
      describeHoldUntil('2026-11-19T02:00:00Z', now),
      'besok pukul 09:00 WIB'
    );
    assert.equal(
      describeHoldUntil('2026-11-21T02:00:00Z', now),
      '21 Nov pukul 09:00 WIB'
    );
  });

  it('getHoldRefreshDelayMs menjadwalkan timer ke batas hold, maksimal 60 detik', () => {
    const now = Date.parse('2026-11-18T01:00:00Z');
    assert.equal(getHoldRefreshDelayMs([], now), null);
    assert.equal(getHoldRefreshDelayMs(['2026-11-18T00:59:00Z'], now), null);
    assert.equal(getHoldRefreshDelayMs(['2026-11-18T01:00:30Z'], now), 31000);
    assert.equal(getHoldRefreshDelayMs(['2026-11-18T02:00:00Z'], now), 60000);
    assert.equal(
      getHoldRefreshDelayMs(['2026-11-18T02:00:00Z', '2026-11-18T01:00:20Z'], now),
      21000
    );
  });
});

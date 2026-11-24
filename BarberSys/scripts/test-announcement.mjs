import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAnnouncementText,
  announcementKey,
  formatWIBClock,
} from '../display-tv/src/lib/announcement.ts';

describe('announcement', () => {
  it('buildAnnouncementText menyusun pengumuman lengkap dengan kursi & barber', () => {
    assert.equal(
      buildAnnouncementText({ nomor: 7, barberNama: 'Rudi', kursi: 2 }),
      'Nomor antrian A-07, silakan ke Kursi 2, bersama Rudi.'
    );
  });

  it('buildAnnouncementText menangani tanpa barber dan tanpa kursi', () => {
    assert.equal(
      buildAnnouncementText({ nomor: 12, barberNama: null, kursi: null }),
      'Nomor antrian A-12, silakan menuju meja layanan.'
    );
    assert.equal(
      buildAnnouncementText({ nomor: 3, barberNama: 'Dedi', kursi: null }),
      'Nomor antrian A-03, bersama Dedi.'
    );
  });

  it('announcementKey unik per queue + called_at', () => {
    assert.equal(
      announcementKey({ queueId: 'q1', calledAt: '2026-11-22T02:00:00.000Z' }),
      'q1|2026-11-22T02:00:00.000Z'
    );
  });

  it('formatWIBClock memakai jam dinding WIB', () => {
    assert.equal(formatWIBClock('2026-11-22T02:00:00.000Z'), '09:00:00');
    assert.equal(formatWIBClock('2026-11-22T17:30:45.000Z'), '00:30:45');
  });
});

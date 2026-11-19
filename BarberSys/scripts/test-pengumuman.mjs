import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  announcementKey,
  buildAnnouncementText,
  collectNewAnnouncements,
  pickIndonesianVoice,
  seedAnnouncementKeys,
} from '../src/lib/pengumuman.ts';

function row(overrides = {}) {
  return {
    queue_id: 'q-1',
    nomor_antrian: 12,
    status: 'dipanggil',
    hold_until: null,
    barber_nama: null,
    kursi_nomor: null,
    created_at: '2026-11-19T02:00:00.000Z',
    called_at: '2026-11-19T02:10:00.000Z',
    ...overrides,
  };
}

describe('buildAnnouncementText', () => {
  it('menyebut nomor, kursi, dan barber', () => {
    assert.equal(
      buildAnnouncementText(row({ kursi_nomor: 3, barber_nama: 'Budi' })),
      'Nomor antrian A 12. Silakan menuju kursi 3. Barber Budi.'
    );
  });

  it('tanpa kursi memakai barber sebagai tujuan', () => {
    assert.equal(
      buildAnnouncementText(row({ barber_nama: 'Budi' })),
      'Nomor antrian A 12. Silakan menuju barber Budi.'
    );
  });

  it('tanpa kursi dan barber memakai kasir', () => {
    assert.equal(
      buildAnnouncementText(row({ nomor_antrian: 7 })),
      'Nomor antrian A 7. Silakan menuju kasir.'
    );
  });

  it('tidak membaca tanda minus: nomor satu digit diucapkan apa adanya', () => {
    assert.equal(buildAnnouncementText(row({ nomor_antrian: 2 })), 'Nomor antrian A 2. Silakan menuju kasir.');
  });
});

describe('announcementKey', () => {
  it('hanya untuk status dipanggil yang punya called_at', () => {
    assert.equal(announcementKey(row()), 'q-1:2026-11-19T02:10:00.000Z');
    assert.equal(announcementKey(row({ status: 'dilayani' })), null);
    assert.equal(announcementKey(row({ status: 'menunggu' })), null);
    assert.equal(announcementKey(row({ called_at: null })), null);
  });

  it('panggilan ulang dengan called_at baru menghasilkan key baru', () => {
    const first = announcementKey(row());
    const second = announcementKey(row({ called_at: '2026-11-19T02:20:00.000Z' }));
    assert.notEqual(first, second);
  });
});

describe('seedAnnouncementKeys + collectNewAnnouncements', () => {
  it('render pertama tidak mengumumkan panggilan yang sudah ada', () => {
    const rows = [row(), row({ queue_id: 'q-2', status: 'dilayani' })];
    const seen = seedAnnouncementKeys(rows);
    assert.equal(seen.size, 1);
    assert.deepEqual(collectNewAnnouncements(rows, seen), []);
  });

  it('baris baru diumumkan sekali saja', () => {
    const existing = row();
    const seen = seedAnnouncementKeys([existing]);
    const fresh = row({ queue_id: 'q-2', nomor_antrian: 13, kursi_nomor: 4 });

    const first = collectNewAnnouncements([existing, fresh], seen);
    assert.equal(first.length, 1);
    assert.equal(first[0].key, 'q-2:2026-11-19T02:10:00.000Z');
    assert.match(first[0].text, /A 13/);

    assert.deepEqual(collectNewAnnouncements([existing, fresh], seen), []);
  });
});

describe('pickIndonesianVoice', () => {
  it('mengutamakan id-ID, lalu id, lalu null', () => {
    const voices = [
      { lang: 'en-US', name: 'English' },
      { lang: 'id-ID', name: 'Bahasa Indonesia' },
      { lang: 'id', name: 'Indonesia generik' },
    ];
    assert.equal(pickIndonesianVoice(voices)?.name, 'Bahasa Indonesia');
    assert.equal(pickIndonesianVoice([{ lang: 'id', name: 'Generik' }])?.name, 'Generik');
    assert.equal(pickIndonesianVoice([{ lang: 'en-US', name: 'English' }]), null);
    assert.equal(pickIndonesianVoice([]), null);
  });

  it('mengenali voice Indonesia dari nama walau lang kosong atau salah', () => {
    assert.equal(
      pickIndonesianVoice([{ lang: '', name: 'Microsoft Gadis - Indonesian (Indonesia)' }])?.name,
      'Microsoft Gadis - Indonesian (Indonesia)'
    );
    assert.equal(
      pickIndonesianVoice([{ lang: 'en-US', name: 'Microsoft Andika - Indonesian (Indonesia)' }])?.name,
      'Microsoft Andika - Indonesian (Indonesia)'
    );
    assert.equal(
      pickIndonesianVoice([{ lang: 'id_ID', name: 'Microsoft Gadis' }])?.name,
      'Microsoft Gadis'
    );
    assert.equal(pickIndonesianVoice([{ lang: 'en-US', name: 'Google US English' }]), null);
  });
});

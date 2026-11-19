import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decideNotification,
  isQueueHeld,
  notificationCopy,
  notificationKey,
} from '../src/lib/notifikasi-antrian.ts';

const NOW = new Date('2026-11-19T03:00:00.000Z').getTime();

function queue(overrides = {}) {
  return {
    id: 'queue-1',
    nomor_antrian: 12,
    status: 'menunggu',
    barber_id: 'barber-1',
    barber_nama: 'Budi',
    called_at: null,
    hold_until: null,
    kursi_nomor: null,
    position_ahead: 3,
    ...overrides,
  };
}

describe('isQueueHeld', () => {
  it('hanya menahan bila hold_until masih di masa depan', () => {
    assert.equal(isQueueHeld({ hold_until: '2026-11-19T04:00:00.000Z' }, NOW), true);
    assert.equal(isQueueHeld({ hold_until: '2026-11-19T02:00:00.000Z' }, NOW), false);
    assert.equal(isQueueHeld({ hold_until: null }, NOW), false);
  });
});

describe('decideNotification', () => {
  it('tidak mengirim apa pun saat antrian ditahan', () => {
    assert.equal(
      decideNotification(queue({ hold_until: '2026-11-19T04:00:00.000Z' }), null, NOW),
      null
    );
  });

  it('tidak mengirim saat masih jauh dari giliran', () => {
    assert.equal(decideNotification(queue({ position_ahead: 3 }), queue({ position_ahead: 4 }), NOW), null);
  });

  it('mengirim "hampir" saat sisa 1 atau sudah berikutnya', () => {
    assert.equal(decideNotification(queue({ position_ahead: 1 }), queue({ position_ahead: 2 }), NOW), 'hampir');
    assert.equal(decideNotification(queue({ position_ahead: 0 }), queue({ position_ahead: 1 }), NOW), 'hampir');
  });

  it('mengirim "dipanggil" saat status berubah menjadi dipanggil', () => {
    assert.equal(
      decideNotification(
        queue({ status: 'dipanggil', called_at: '2026-11-19T02:50:00.000Z', kursi_nomor: 3 }),
        queue({ status: 'menunggu' }),
        NOW
      ),
      'dipanggil'
    );
  });

  it('tidak mengulang "dipanggil" untuk called_at yang sama', () => {
    assert.equal(
      decideNotification(
        queue({ status: 'dipanggil', called_at: '2026-11-19T02:50:00.000Z' }),
        queue({ status: 'dipanggil', called_at: '2026-11-19T02:50:00.000Z' }),
        NOW
      ),
      null
    );
  });

  it('mengirim lagi bila dipanggil ulang dengan called_at baru', () => {
    assert.equal(
      decideNotification(
        queue({ status: 'dipanggil', called_at: '2026-11-19T03:00:00.000Z' }),
        queue({ status: 'dipanggil', called_at: '2026-11-19T02:50:00.000Z' }),
        NOW
      ),
      'dipanggil'
    );
  });

  it('tidak mengirim saat status sudah dilayani/selesai', () => {
    assert.equal(decideNotification(queue({ status: 'dilayani' }), queue(), NOW), null);
    assert.equal(decideNotification(null, queue(), NOW), null);
  });
});

describe('notificationKey', () => {
  it('hampir unik per antrian, dipanggil unik per panggilan', () => {
    const row = queue();
    assert.equal(notificationKey('hampir', row), 'hampir:queue-1');
    assert.equal(
      notificationKey('dipanggil', queue({ called_at: '2026-11-19T02:50:00.000Z' })),
      'dipanggil:queue-1:2026-11-19T02:50:00.000Z'
    );
  });
});

describe('notificationCopy', () => {
  it('copy dipanggil menyebut nomor, kursi, dan barber', () => {
    const copy = notificationCopy(
      'dipanggil',
      queue({ status: 'dipanggil', called_at: '2026-11-19T02:50:00.000Z', kursi_nomor: 3 })
    );
    assert.equal(copy.title, 'Giliranmu tiba!');
    assert.match(copy.body, /A-12/);
    assert.match(copy.body, /kursi 3/);
    assert.match(copy.body, /Budi/);
  });

  it('copy hampir membedakan posisi berikutnya vs sisa satu', () => {
    const next = notificationCopy('hampir', queue({ position_ahead: 0 }));
    assert.match(next.body, /antrian berikutnya/i);

    const oneLeft = notificationCopy('hampir', queue({ position_ahead: 1 }));
    assert.match(oneLeft.body, /tinggal 1 antrian/i);
  });
});

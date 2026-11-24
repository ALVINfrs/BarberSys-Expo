import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  QRIS_QR_MAX_AGE_MS,
  buildQrisPayload,
  computeQueueTotal,
  encodeQrisPayload,
  kodeTransaksiFromId,
  parseQrisPayload,
} from '../src/lib/qris.ts';

const validInput = {
  queueId: '123e4567-e89b-12d3-a456-426614174000',
  total: 50000,
  kodeTransaksi: 'ABC12345',
  timestamp: 1000,
};

describe('QRIS payload', () => {
  it('roundtrip payload valid', () => {
    const payload = buildQrisPayload(validInput);
    const parsed = parseQrisPayload(encodeQrisPayload(payload), 2000);
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.payload, payload);
  });

  it('build memakai Date.now() bila timestamp tidak diisi', () => {
    const before = Date.now();
    const payload = buildQrisPayload({ ...validInput, timestamp: undefined });
    const after = Date.now();
    assert.ok(payload.timestamp >= before && payload.timestamp <= after);
  });

  it('encode memakai urutan field stabil', () => {
    const payload = buildQrisPayload(validInput);
    assert.equal(
      encodeQrisPayload(payload),
      JSON.stringify({
        queueId: validInput.queueId,
        total: validInput.total,
        kodeTransaksi: validInput.kodeTransaksi,
        timestamp: validInput.timestamp,
      })
    );
  });

  it('membuang field tambahan saat parsing', () => {
    const raw = JSON.stringify({ ...validInput, jahat: '<script>' });
    const parsed = parseQrisPayload(raw, 2000);
    assert.equal(parsed.ok, true);
    assert.deepEqual(Object.keys(parsed.payload).sort(), [
      'kodeTransaksi',
      'queueId',
      'timestamp',
      'total',
    ]);
  });

  it('menolak JSON rusak sebagai format', () => {
    const parsed = parseQrisPayload('bukan json');
    assert.equal(parsed.ok, false);
    assert.equal(parsed.code, 'format');
  });

  it('menolak JSON yang bukan object', () => {
    for (const raw of ['null', '[]', '"teks"', '42']) {
      const parsed = parseQrisPayload(raw);
      assert.equal(parsed.ok, false, raw);
      assert.equal(parsed.code, 'fields', raw);
    }
  });

  it('menolak field tidak valid', () => {
    const invalidPayloads = [
      { queueId: 'a' },
      { queueId: '', total: 1, kodeTransaksi: 'X', timestamp: 1 },
      { queueId: 'a', total: -1, kodeTransaksi: 'X', timestamp: 1 },
      { queueId: 'a', total: 1.5, kodeTransaksi: 'X', timestamp: 1 },
      { queueId: 'a', total: 1, kodeTransaksi: '', timestamp: 1 },
      { queueId: 'a', total: 1, kodeTransaksi: 'X', timestamp: 0 },
      { queueId: 'a', total: 1, kodeTransaksi: 'X', timestamp: '1' },
      { queueId: 1, total: 1, kodeTransaksi: 'X', timestamp: 1 },
    ];
    for (const payload of invalidPayloads) {
      const parsed = parseQrisPayload(JSON.stringify(payload), 2000);
      assert.equal(parsed.ok, false, JSON.stringify(payload));
      assert.equal(parsed.code, 'fields', JSON.stringify(payload));
    }
  });

  it('menolak QR kedaluwarsa', () => {
    const payload = buildQrisPayload(validInput);
    const parsed = parseQrisPayload(
      encodeQrisPayload(payload),
      1000 + QRIS_QR_MAX_AGE_MS + 1
    );
    assert.equal(parsed.ok, false);
    assert.equal(parsed.code, 'expired');
  });

  it('menerima QR tepat di batas kedaluwarsa', () => {
    const payload = buildQrisPayload(validInput);
    const parsed = parseQrisPayload(
      encodeQrisPayload(payload),
      1000 + QRIS_QR_MAX_AGE_MS
    );
    assert.equal(parsed.ok, true);
  });

  it('menolak timestamp masa depan lebih dari 5 menit', () => {
    const payload = buildQrisPayload({ ...validInput, timestamp: 1000 + 5 * 60 * 1000 + 1 });
    const parsed = parseQrisPayload(encodeQrisPayload(payload), 1000);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.code, 'fields');
  });

  it('masih menerima selisih jam kecil (toleransi 5 menit)', () => {
    const payload = buildQrisPayload({ ...validInput, timestamp: 1000 + 60 * 1000 });
    const parsed = parseQrisPayload(encodeQrisPayload(payload), 1000);
    assert.equal(parsed.ok, true);
  });
});

describe('QRIS total & kode transaksi', () => {
  it('total = treatment + produk + tip', () => {
    assert.equal(
      computeQueueTotal(50000, [{ subtotal: 10000 }, { subtotal: 5000 }], 3000),
      68000
    );
  });

  it('treatment null dan produk kosong tetap dihitung', () => {
    assert.equal(computeQueueTotal(null, [], 0), 0);
    assert.equal(computeQueueTotal(undefined, [], 5000), 5000);
  });

  it('komponen negatif dianggap 0', () => {
    assert.equal(computeQueueTotal(-100, [{ subtotal: -50 }], -10), 0);
    assert.equal(computeQueueTotal(20000, [{ subtotal: -5000 }], -1000), 20000);
  });

  it('kode transaksi = 8 karakter pertama uppercase', () => {
    assert.equal(
      kodeTransaksiFromId('123e4567-e89b-12d3-a456-426614174000'),
      '123E4567'
    );
    assert.equal(kodeTransaksiFromId('abc'), 'ABC');
  });
});

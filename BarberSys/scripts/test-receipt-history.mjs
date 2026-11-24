import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { historyItemTotal, summarizeReceiptHistory } from '../src/lib/receipt-history.ts';

describe('receipt-history', () => {
  it('menghitung total treatment + produk + tip', () => {
    assert.equal(
      historyItemTotal({ treatmentHarga: 50000, productTotal: 10000, tipAmount: 5000, metode: 'tunai' }),
      65000
    );
  });

  it('meringkas tunai, qris, tip, dan jumlah transaksi', () => {
    const summary = summarizeReceiptHistory([
      { treatmentHarga: 50000, productTotal: 10000, tipAmount: 5000, metode: 'tunai' },
      { treatmentHarga: 40000, productTotal: 0, tipAmount: 0, metode: 'qris' },
    ]);
    assert.deepEqual(summary, { count: 2, total: 105000, tunai: 65000, qris: 40000, tip: 5000 });
  });

  it('mengabaikan nilai null/negatif', () => {
    assert.equal(
      historyItemTotal({ treatmentHarga: null, productTotal: -100, tipAmount: undefined, metode: null }),
      0
    );
  });

  it('ringkasan data kosong bernilai nol', () => {
    assert.deepEqual(summarizeReceiptHistory([]), {
      count: 0,
      total: 0,
      tunai: 0,
      qris: 0,
      tip: 0,
    });
  });
});

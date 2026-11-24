import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPaymentReceipt } from '../src/lib/payment-receipt.ts';

function input(overrides = {}) {
  return {
    queueId: '123e4567-e89b-12d3-a456-426614174000',
    nomorAntrian: 7,
    customerNama: 'Budi Pelanggan',
    barberNama: 'Rudi Barber',
    kasirNama: 'Sari Kasir',
    kursiNomor: 2,
    treatmentNama: 'Potong Rambut',
    treatmentHarga: 50000,
    items: [
      { nama: 'Pomade', qty: 1, subtotal: 10000 },
      { nama: 'Shampoo', qty: 2, subtotal: 5000 },
    ],
    tipAmount: 3000,
    metode: 'qris',
    nowIso: '2026-11-22T09:30:00.000Z',
    instruksi: 'Rapi samping, panjang atas',
    toko: {
      nama: 'BarberSys',
      alamat: 'Jl. Contoh 1',
      jamBuka: '09:00:00',
      jamTutup: '21:00:00',
    },
    logoBase64: 'logo-test',
    ...overrides,
  };
}

describe('payment-receipt', () => {
  it('menghitung total treatment + produk + tip', () => {
    const receipt = buildPaymentReceipt(input());
    assert.equal(receipt.total, 68000);
  });

  it('memakai kode transaksi 8 karakter pertama uppercase', () => {
    const receipt = buildPaymentReceipt(input());
    assert.equal(receipt.kodeTransaksi, '123E4567');
  });

  it('meneruskan metode pembayaran', () => {
    assert.equal(buildPaymentReceipt(input()).metode, 'qris');
    assert.equal(buildPaymentReceipt(input({ metode: 'tunai' })).metode, 'tunai');
  });

  it('memetakan item, tip, dan instruksi ke ReceiptData', () => {
    const receipt = buildPaymentReceipt(input());
    assert.deepEqual(receipt.items, [
      { nama: 'Pomade', qty: 1, subtotal: 10000 },
      { nama: 'Shampoo', qty: 2, subtotal: 5000 },
    ]);
    assert.equal(receipt.tipAmount, 3000);
    assert.equal(receipt.instruksi, 'Rapi samping, panjang atas');
  });

  it('tip 0 disimpan null agar struk tidak menampilkan baris tip', () => {
    assert.equal(buildPaymentReceipt(input({ tipAmount: 0 })).tipAmount, null);
  });

  it('memetakan identitas, kursi, treatment, dan toko', () => {
    const receipt = buildPaymentReceipt(input());
    assert.equal(receipt.nomor_antrian, 7);
    assert.equal(receipt.customerNama, 'Budi Pelanggan');
    assert.equal(receipt.barberNama, 'Rudi Barber');
    assert.equal(receipt.kasirNama, 'Sari Kasir');
    assert.equal(receipt.kursiNomor, 2);
    assert.equal(receipt.treatmentNama, 'Potong Rambut');
    assert.equal(receipt.treatmentHarga, 50000);
    assert.equal(receipt.tokoNama, 'BarberSys');
    assert.equal(receipt.tokoAlamat, 'Jl. Contoh 1');
    assert.equal(receipt.jamBuka, '09:00:00');
    assert.equal(receipt.jamTutup, '21:00:00');
    assert.equal(receipt.logoBase64, 'logo-test');
  });

  it('memformat tanggal dari nowIso', () => {
    const receipt = buildPaymentReceipt(input());
    assert.ok(receipt.tanggal.length > 0);
    assert.ok(receipt.tanggal.includes('2026'));
    assert.equal(receipt.tanggal, new Date('2026-11-22T09:30:00.000Z').toLocaleString('id-ID'));
  });

  it('walk-in tanpa treatment/kursi tetap valid', () => {
    const receipt = buildPaymentReceipt(
      input({
        treatmentNama: null,
        treatmentHarga: null,
        kursiNomor: null,
        tipAmount: 0,
        items: [{ nama: 'Pomade', qty: 1, subtotal: 10000 }],
      })
    );
    assert.equal(receipt.total, 10000);
    assert.equal(receipt.kursiNomor, null);
    assert.equal(receipt.treatmentNama, null);
    assert.equal(receipt.treatmentHarga, null);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildReceiptInputFromQueueRows } from '../src/lib/receipt-row.ts';
import { buildPaymentReceipt } from '../src/lib/payment-receipt.ts';

function queue(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nomor_antrian: 7,
    nama_customer: null,
    kasir_id: 'kasir-1',
    kursi_nomor: 2,
    instruksi_potongan: 'Rapi samping',
    tip_amount: 5000,
    metode_bayar: 'qris',
    completed_at: '2026-11-22T09:30:00.000Z',
    created_at: '2026-11-22T08:00:00.000Z',
    treatments: { nama: 'Potong Rambut', harga: 50000 },
    customer: { nama: 'Budi Pelanggan' },
    barber: { nama: 'Rudi Barber' },
    ...overrides,
  };
}

function build(input) {
  return buildPaymentReceipt(
    buildReceiptInputFromQueueRows({ logoBase64: 'logo-test', ...input })
  );
}

describe('receipt-row', () => {
  it('memakai completed_at dan nama kasir dari kasir_id', () => {
    const receipt = build({
      queue: queue(),
      products: [],
      shop: null,
      kasirNama: 'Sari Kasir',
    });

    assert.equal(receipt.tanggal, new Date('2026-11-22T09:30:00.000Z').toLocaleString('id-ID'));
    assert.equal(receipt.kasirNama, 'Sari Kasir');
    assert.equal(receipt.kodeTransaksi, '123E4567');
  });

  it('memakai created_at bila completed_at null (data lama)', () => {
    const receipt = build({
      queue: queue({ completed_at: null }),
      products: [],
      shop: null,
      kasirNama: null,
    });

    assert.equal(receipt.tanggal, new Date('2026-11-22T08:00:00.000Z').toLocaleString('id-ID'));
    assert.equal(receipt.kasirNama, 'Kasir');
  });

  it('fallback nama walk-in dan barber toko', () => {
    const receipt = build({
      queue: queue({
        customer: null,
        nama_customer: 'Walk In',
        barber: null,
        treatments: null,
      }),
      products: [],
      shop: null,
      kasirNama: 'Kasir',
    });

    assert.equal(receipt.customerNama, 'Walk In');
    assert.equal(receipt.barberNama, 'Barber Toko');
    assert.equal(receipt.treatmentNama, null);
  });

  it('menjumlahkan treatment, produk, dan tip', () => {
    const receipt = build({
      queue: queue({ tip_amount: 3000 }),
      products: [
        { qty: 1, subtotal: 10000, products: { nama: 'Pomade' } },
        { qty: 2, subtotal: 5000, products: null },
      ],
      shop: null,
      kasirNama: 'Sari',
    });

    assert.equal(receipt.total, 68000);
    assert.equal(receipt.items.length, 2);
    assert.equal(receipt.items[1].nama, 'Produk');
  });

  it('metode null dianggap tunai dan data toko diteruskan', () => {
    const receipt = build({
      queue: queue({ metode_bayar: null }),
      products: [],
      shop: {
        nama_toko: 'BarberSys',
        alamat: 'Jl. Contoh 1',
        jam_buka: '09:00:00',
        jam_tutup: '21:00:00',
      },
      kasirNama: 'Sari',
    });

    assert.equal(receipt.metode, 'tunai');
    assert.equal(receipt.tokoNama, 'BarberSys');
    assert.equal(receipt.jamTutup, '21:00:00');
  });
});

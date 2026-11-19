import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  escapeHtml,
  formatRupiahReceipt,
  formatJamStruk,
  buildReceiptHtml,
} from '../src/lib/receipt.ts';

const base = {
  nomor_antrian: 1,
  customerNama: 'Bob',
  barberNama: 'Andi',
  items: [],
  total: 50000,
  metode: 'tunai',
  tanggal: '2026-09-18',
  tokoNama: 'Toko',
};

describe('receipt', () => {
  it('escapeHtml prevents injection + kasir/kursi/kode/instruksi escaped', () => {
    const data = {
      ...base,
      customerNama: '<b>Bob</b>',
      barberNama: 'Andi & Co',
      kasirNama: 'Kasir <x>',
      kursiNomor: 2,
      treatmentNama: '<script>',
      treatmentHarga: 50000,
      items: [{ nama: 'Pomade <x>', qty: 1, subtotal: 45000 }],
      total: 95000,
      tokoNama: 'Toko & Co',
      tokoAlamat: 'Jl <A>',
      kodeTransaksi: 'AB12',
      instruksi: 'fade <tipis>',
      logoBase64: 'abc',
    };
    const html = buildReceiptHtml(data);
    assert.equal(html.includes('<script>'), false);
    assert.equal(html.includes('&lt;script&gt;'), true);
    assert.equal(html.includes('&amp; Co'), true);
    assert.equal(html.includes('Kasir: Kasir &lt;x&gt;'), true);
    assert.equal(html.includes('Kursi: <b>Kursi 2</b>'), true);
    assert.equal(html.includes('fade &lt;tipis&gt;'), true);
    assert.equal(html.includes('data:image/png;base64,abc'), true);
  });

  it('total formatted', () => {
    assert.equal(formatRupiahReceipt(150000), 'Rp 150.000');
  });

  it('tip row tampil hanya saat tipAmount > 0', () => {
    const withTip = buildReceiptHtml({ ...base, tipAmount: 10000, total: 60000 });
    assert.equal(withTip.includes('<td>Tip</td>'), true);
    assert.equal(withTip.includes('Rp 10.000'), true);

    const zero = buildReceiptHtml({ ...base, tipAmount: 0 });
    assert.equal(zero.includes('<td>Tip</td>'), false);

    const nullTip = buildReceiptHtml({ ...base, tipAmount: null });
    assert.equal(nullTip.includes('<td>Tip</td>'), false);

    const absent = buildReceiptHtml(base);
    assert.equal(absent.includes('<td>Tip</td>'), false);
  });

  it('M1: jam "HH:MM:SS" dari Postgres dinormalisasi jadi HH:MM WIB', () => {
    const html = buildReceiptHtml({
      ...base,
      jamBuka: '09:00:00',
      jamTutup: '21:00:00',
    });
    assert.equal(html.includes('Jam: 09:00–21:00 WIB'), true);
    assert.equal(html.includes('09:00:00'), false);

    const noJam = buildReceiptHtml(base);
    assert.equal(noJam.includes('Jam:'), false);
  });

  it('formatJamStruk aman untuk null/kosong', () => {
    assert.equal(formatJamStruk('09:00:00'), '09:00');
    assert.equal(formatJamStruk('21:30'), '21:30');
    assert.equal(formatJamStruk(null), '');
    assert.equal(formatJamStruk(undefined), '');
  });

  it('logo default tidak lagi di-hardcode: tanpa logoBase64 tidak ada <img>', () => {
    const html = buildReceiptHtml({ ...base, logoBase64: null });
    assert.equal(html.includes('data:image/png;base64,'), false);
  });

  it('instruksi box hidden when empty', () => {
    const html = buildReceiptHtml({ ...base, instruksi: '' });
    assert.equal(html.includes('fade'), false);
    assert.equal(html.includes('Instruksi:'), false);
  });

  it('escapeHtml adalah helper murni', () => {
    assert.equal(escapeHtml(`a'b"c<d>e&f`), 'a&#039;b&quot;c&lt;d&gt;e&amp;f');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function formatRupiahReceipt(v){return 'Rp '+v.toLocaleString('id-ID')}
function buildReceiptHtml(d){
  const logoB64 = d.logoBase64 ?? 'DEFAULT';
  const logoImg = logoB64 ? `<img src="data:image/png;base64,${logoB64}" />` : '';
  const tr = d.treatmentNama && d.treatmentHarga!=null ? `<tr><td>${escapeHtml(d.treatmentNama)}</td><td>${escapeHtml(formatRupiahReceipt(d.treatmentHarga))}</td></tr>` : '';
  const rows = d.items.map(it=> `<tr><td>${escapeHtml(it.nama)}${it.qty?` × ${it.qty}`:''}</td><td>${escapeHtml(formatRupiahReceipt(it.subtotal))}</td></tr>`).join('');
  const kasirLine = d.kasirNama ? `<div>Kasir: ${escapeHtml(d.kasirNama)}</div>` : '';
  const kursiLine = d.kursiNomor != null ? `<div>Kursi: Kursi ${escapeHtml(String(d.kursiNomor))}</div>` : '';
  const kodeLine = d.kodeTransaksi ? `<div>Kode: ${escapeHtml(d.kodeTransaksi)}</div>` : '';
  const instruksiBox = d.instruksi && d.instruksi.trim() ? `<div>${escapeHtml(d.instruksi)}</div>` : '';
  return `<html>${logoImg}${escapeHtml(d.tokoNama||'BarberSys')}${tr}${rows}Total: ${escapeHtml(formatRupiahReceipt(d.total))}${kasirLine}${kursiLine}${kodeLine}${instruksiBox}</html>`;
}

describe('receipt', ()=>{
  it('escapeHtml prevents injection + kasir/kursi/kode/instruksi escaped', ()=>{
    const data={ nomor_antrian:1,customerNama:'<b>Bob</b>',barberNama:'Andi & Co',kasirNama:'Kasir <x>',kursiNomor:2,treatmentNama:'<script>',treatmentHarga:50000,items:[{nama:'Pomade <x>',qty:1,subtotal:45000}],total:95000,metode:'tunai',tanggal:'2026-09-18',tokoNama:'Toko & Co',tokoAlamat:'Jl <A>',kodeTransaksi:'AB12',instruksi:'fade <tipis>',logoBase64:'abc'};
    const html=buildReceiptHtml(data);
    assert.equal(html.includes('<script>'),false);
    assert.equal(html.includes('&lt;script&gt;'),true);
    assert.equal(html.includes('&amp; Co'),true);
    assert.equal(html.includes('Kasir: Kasir &lt;x&gt;'),true);
    assert.equal(html.includes('Kursi: Kursi 2'),true);
    assert.equal(html.includes('fade &lt;tipis&gt;'),true);
    assert.equal(html.includes('data:image/png;base64,'),true);
  });
  it('total formatted', ()=>{
    assert.equal(formatRupiahReceipt(150000),'Rp 150.000');
  });
  it('instruksi box hidden when empty', ()=>{
    const data={ nomor_antrian:2,customerNama:'A',barberNama:'B',treatmentNama:'Cut',treatmentHarga:50000,items:[],total:50000,metode:'tunai',tanggal:'2026-09-18',tokoNama:'T',instruksi:'',logoBase64:null};
    const html=buildReceiptHtml(data);
    assert.equal(html.includes('fade'),false);
  });
});

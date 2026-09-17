import { DEFAULT_LOGO_BASE64 } from './receipt-logo';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ReceiptLine {
  nama: string;
  qty?: number;
  subtotal: number;
}

export interface ReceiptData {
  nomor_antrian: number;
  customerNama: string;
  barberNama: string;
  kasirNama?: string | null;
  kursiNomor?: number | null;
  treatmentNama?: string | null;
  treatmentHarga?: number | null;
  items: ReceiptLine[];
  total: number;
  metode: string;
  tanggal: string;
  tokoNama?: string | null;
  tokoAlamat?: string | null;
  jamBuka?: string | null;
  jamTutup?: string | null;
  kodeTransaksi?: string | null;
  instruksi?: string | null;
  logoBase64?: string | null;
}

export function formatRupiahReceipt(val: number): string {
  return 'Rp ' + val.toLocaleString('id-ID');
}

export function buildReceiptHtml(data: ReceiptData): string {
  const logoB64 = data.logoBase64 ?? DEFAULT_LOGO_BASE64;
  const logoImg = logoB64
    ? `<div style="text-align:center;margin-bottom:12px"><img src="data:image/png;base64,${logoB64}" style="width:96px;height:96px;object-fit:contain" /></div>`
    : '';
  const treatmentRow =
    data.treatmentNama && data.treatmentHarga != null
      ? `<tr><td>${escapeHtml(data.treatmentNama)}</td><td style="text-align:right">${escapeHtml(formatRupiahReceipt(data.treatmentHarga))}</td></tr>`
      : '';
  const itemsRows = data.items
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.nama)}${it.qty ? ` × ${it.qty}` : ''}</td><td style="text-align:right">${escapeHtml(formatRupiahReceipt(it.subtotal))}</td></tr>`
    )
    .join('');
  const jamLine =
    data.jamBuka && data.jamTutup
      ? `<div class="small">Jam: ${escapeHtml(data.jamBuka)}–${escapeHtml(data.jamTutup)}</div>`
      : '';
  const kasirLine = data.kasirNama ? `<div>Kasir: ${escapeHtml(data.kasirNama)}</div>` : '';
  const kursiLine = data.kursiNomor != null ? `<div>Kursi: <b>Kursi ${escapeHtml(String(data.kursiNomor))}</b></div>` : '';
  const kodeLine = data.kodeTransaksi ? `<div>Kode: <b>${escapeHtml(data.kodeTransaksi)}</b></div>` : '';
  const instruksiBox =
    data.instruksi && data.instruksi.trim()
      ? `<div style="margin-top:10px;padding:8px 10px;border-left:4px solid #F5B700;background:#FFFBEB;font-size:13px"><b>Instruksi:</b> ${escapeHtml(data.instruksi)}</div>`
      : '';

  return `
<html>
<head><meta charset="utf-8" /><style>
body{font-family:Helvetica,Arial,sans-serif;padding:24px;color:#111}
h1{font-size:22px;margin:0 0 4px 0;text-align:center}
.small{font-size:12px;color:#555;text-align:center}
.meta{font-size:13px;margin-top:8px;line-height:1.5}
table{width:100%;border-collapse:collapse;margin-top:12px}
td{padding:6px 0;border-bottom:1px solid #eee;font-size:14px}
.total{font-weight:800;font-size:17px;margin-top:12px;text-align:right;border-top:2px solid #111;padding-top:8px}
.footer{margin-top:16px;font-size:11px;color:#777;text-align:center}
hr{border:none;border-top:1px dashed #bbb;margin:12px 0}
</style></head>
<body>
${logoImg}
<h1>${escapeHtml(data.tokoNama || 'BarberSys')}</h1>
<div class="small">${escapeHtml(data.tokoAlamat || '')}</div>
${jamLine}
<div class="small">Tanggal: ${escapeHtml(data.tanggal)} | Metode: ${escapeHtml(data.metode.toUpperCase())}</div>
<hr/>
<div class="meta">
<div>No. Antrian: <b>A-${String(data.nomor_antrian).padStart(2, '0')}</b></div>
<div>Pelanggan: ${escapeHtml(data.customerNama)}</div>
<div>Barber: ${escapeHtml(data.barberNama)}</div>
${kursiLine}
${kasirLine}
${kodeLine}
</div>
<table>${treatmentRow}${itemsRows}</table>
${instruksiBox}
<div class="total">Total: ${escapeHtml(formatRupiahReceipt(data.total))}</div>
<div class="footer">Terima kasih — ${escapeHtml(data.tokoNama || 'BarberSys')} • Sampai jumpa lagi!</div>
</body>
</html>`;
}

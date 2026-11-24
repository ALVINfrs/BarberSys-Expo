/**
 * Ringkasan riwayat transaksi lunas. Modul murni tanpa import runtime supaya
 * bisa diuji langsung oleh Node (`--experimental-strip-types`).
 */

export type MetodeBayar = 'tunai' | 'qris' | null;

export interface HistoryAmountInput {
  treatmentHarga: number | null | undefined;
  productTotal: number | null | undefined;
  tipAmount: number | null | undefined;
  metode: MetodeBayar;
}

export interface ReceiptHistorySummary {
  count: number;
  total: number;
  tunai: number;
  qris: number;
  tip: number;
}

function nonNegative(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/** Total satu transaksi: treatment + produk + tip. */
export function historyItemTotal(input: HistoryAmountInput): number {
  return (
    nonNegative(input.treatmentHarga) +
    nonNegative(input.productTotal) +
    nonNegative(input.tipAmount)
  );
}

/** Ringkasan jumlah transaksi, omset, tunai, QRIS, dan tip. */
export function summarizeReceiptHistory(items: HistoryAmountInput[]): ReceiptHistorySummary {
  return items.reduce<ReceiptHistorySummary>(
    (acc, item) => {
      const total = historyItemTotal(item);
      acc.count += 1;
      acc.total += total;
      acc.tip += nonNegative(item.tipAmount);
      if (item.metode === 'tunai') acc.tunai += total;
      if (item.metode === 'qris') acc.qris += total;
      return acc;
    },
    { count: 0, total: 0, tunai: 0, qris: 0, tip: 0 }
  );
}

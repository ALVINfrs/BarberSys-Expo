import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type DisplayStatus = 'menunggu' | 'dipanggil' | 'dilayani';

export interface DisplayRow {
  queue_id: string;
  nomor_antrian: number;
  status: DisplayStatus;
  hold_until: string | null;
  barber_nama: string | null;
  kursi_nomor: number | null;
  created_at: string;
  called_at: string | null;
  updated_at: string;
}

const STATUS_ORDER: Record<DisplayStatus, number> = {
  dipanggil: 0,
  dilayani: 1,
  menunggu: 2,
};

function sortRows(rows: DisplayRow[]): DisplayRow[] {
  const unique = new Map<string, DisplayRow>();
  rows.forEach((row) => unique.set(row.queue_id, row));
  return [...unique.values()]
    .sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      if (a.status === 'dipanggil') {
        return Date.parse(b.called_at || b.updated_at) - Date.parse(a.called_at || a.updated_at);
      }
      return Date.parse(a.created_at) - Date.parse(b.created_at);
    })
    .slice(0, 8);
}

const POLL_INTERVAL_MS = 30_000;

/** Data publik `queue_display`: Realtime + polling fallback. */
export function useDisplay() {
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('queue_display')
      .select('*')
      .in('status', ['menunggu', 'dipanggil', 'dilayani'])
      .order('created_at', { ascending: true })
      .limit(50);
    if (!error && data) setRows(sortRows(data as DisplayRow[]));
  }, []);

  useEffect(() => {
    load();
    const poll = window.setInterval(load, POLL_INTERVAL_MS);
    const channel = supabase
      .channel(`display-tv-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_display' }, () => load())
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { rows, connected };
}

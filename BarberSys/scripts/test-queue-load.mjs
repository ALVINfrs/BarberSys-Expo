import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapQueueLoadStats } from '../src/lib/queue-load.ts';

describe('queue-load', () => {
  it('memetakan RPC queue_load_stats ke map per barber', () => {
    const map = mapQueueLoadStats([
      { barber_id: 'a', queue_count: 2, total_menit: 75 },
      { barber_id: 'b', queue_count: 0, total_menit: 0 },
      { barber_id: null, queue_count: 9, total_menit: 999 },
    ]);
    assert.deepEqual(map, { a: { count: 2, totalMenit: 75 } });
  });

  it('mengubah string bigint dari PostgREST menjadi number', () => {
    const map = mapQueueLoadStats([{ barber_id: 'a', queue_count: '3', total_menit: '90' }]);
    assert.deepEqual(map, { a: { count: 3, totalMenit: 90 } });
  });

  it('null / array kosong aman', () => {
    assert.deepEqual(mapQueueLoadStats(null), {});
    assert.deepEqual(mapQueueLoadStats(undefined), {});
    assert.deepEqual(mapQueueLoadStats([]), {});
  });
});

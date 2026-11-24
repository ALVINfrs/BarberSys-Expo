import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRepeatCallUpdate } from '../src/lib/repeat-call.ts';

describe('repeat-call', () => {
  it('hanya mengubah called_at, bukan status/barber/kursi', () => {
    const update = buildRepeatCallUpdate({
      queueId: 'q1',
      nowIso: '2026-11-24T10:00:00.000Z',
    });
    assert.deepEqual(update, { called_at: '2026-11-24T10:00:00.000Z' });
    assert.deepEqual(Object.keys(update), ['called_at']);
  });

  it('menolak queueId kosong', () => {
    assert.throws(
      () => buildRepeatCallUpdate({ queueId: '', nowIso: '2026-11-24T10:00:00.000Z' }),
      /antrian/i
    );
  });
});

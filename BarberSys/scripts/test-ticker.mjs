import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatQueueNumber, splitQueueNumber } from '../src/lib/ticker.ts';

test('formatQueueNumber memakai prefix A dan dua digit', () => {
  assert.equal(formatQueueNumber(7), 'A-07');
  assert.equal(formatQueueNumber(12), 'A-12');
  assert.equal(formatQueueNumber(100), 'A-100');
});

test('splitQueueNumber memecah karakter', () => {
  assert.deepEqual(splitQueueNumber('A-07'), ['A', '-', '0', '7']);
  assert.deepEqual(splitQueueNumber(''), []);
});

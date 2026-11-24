import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ratingHref } from '../src/lib/navigation.ts';

describe('navigation', () => {
  it('ratingHref menunjuk ke Stack root, bukan tab admin', () => {
    assert.equal(ratingHref(), '/admin-rating');
  });
});

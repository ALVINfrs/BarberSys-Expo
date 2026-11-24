import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildShareUri } from '../src/lib/share-path.ts';

describe('share-pdf', () => {
  it('membuat URI file di cache dengan nama aman', () => {
    assert.equal(
      buildShareUri('file:///cache/', 'Struk A-01', 123),
      'file:///cache/struk-a-01-123.pdf'
    );
  });

  it('menolak cacheDirectory null', () => {
    assert.throws(() => buildShareUri(null, 'struk', 123), /cache/i);
  });
});

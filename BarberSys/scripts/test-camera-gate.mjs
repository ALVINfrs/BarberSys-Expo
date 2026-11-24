import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canUseCamera } from '../src/lib/camera-gate.ts';

describe('camera-gate', () => {
  it('native tidak dibatasi oleh isAvailableAsync (API khusus web)', () => {
    assert.equal(canUseCamera('android', false), true);
    assert.equal(canUseCamera('ios', null), true);
    assert.equal(canUseCamera('android', undefined), true);
  });

  it('web hanya memakai kamera bila isAvailableAsync bernilai true', () => {
    assert.equal(canUseCamera('web', true), true);
    assert.equal(canUseCamera('web', false), false);
    assert.equal(canUseCamera('web', null), false);
  });
});

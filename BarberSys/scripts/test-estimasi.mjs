import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeGlobalEstimate } from '../src/lib/estimasi.ts';

describe('estimasi-global', () => {
  it('tanpa barber = 0', () => {
    assert.equal(computeGlobalEstimate([], {}), 0);
  });

  it('memakai beban paling ringan (giliran paling cepat), bukan rata-rata', () => {
    assert.equal(
      computeGlobalEstimate(
        ['a', 'b'],
        { a: { count: 1, totalMenit: 30 }, b: { count: 2, totalMenit: 60 } }
      ),
      30
    );
  });

  it('barber idle = 0 menit walaupun barber lain padat', () => {
    assert.equal(
      computeGlobalEstimate(
        ['a', 'b', 'c'],
        { a: { count: 2, totalMenit: 90 }, c: { count: 1, totalMenit: 10 } }
      ),
      0
    );
  });

  it('barber tanpa beban dihitung 0', () => {
    assert.equal(
      computeGlobalEstimate(['a', 'b', 'c'], { c: { count: 1, totalMenit: 10 } }),
      0
    );
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTabBarMetrics, pressTab } from '../src/lib/tab-bar.ts';

describe('tab-bar metrics', () => {
  it('tanpa inset (gesture nav / iOS) = ukuran desain awal', () => {
    assert.deepEqual(getTabBarMetrics(0), { height: 64, paddingTop: 6, paddingBottom: 8 });
  });

  it('3-button nav Android (inset 48) menambah tinggi & padding bawah', () => {
    const m = getTabBarMetrics(48);
    assert.equal(m.height, 112);
    assert.equal(m.paddingTop, 6);
    assert.equal(m.paddingBottom, 56);
  });

  it('gesture nav Android (inset 24) tetap aman', () => {
    const m = getTabBarMetrics(24);
    assert.equal(m.height, 88);
    assert.equal(m.paddingBottom, 32);
  });

  it('area ikon/label tidak berubah: height - paddingTop - paddingBottom = 50', () => {
    for (const inset of [0, 16, 24, 48]) {
      const m = getTabBarMetrics(inset);
      assert.equal(m.height - m.paddingTop - m.paddingBottom, 50);
    }
  });

  it('inset tidak valid dianggap 0', () => {
    assert.deepEqual(getTabBarMetrics(undefined), { height: 64, paddingTop: 6, paddingBottom: 8 });
    assert.deepEqual(getTabBarMetrics(null), { height: 64, paddingTop: 6, paddingBottom: 8 });
    assert.deepEqual(getTabBarMetrics(-10), { height: 64, paddingTop: 6, paddingBottom: 8 });
    assert.deepEqual(getTabBarMetrics(Number.NaN), { height: 64, paddingTop: 6, paddingBottom: 8 });
  });
});

describe('tab bar press (Expo Router 58: emitter + navigateToTab)', () => {
  it('emits tabPress dengan target route dan canPreventDefault', () => {
    const emitted = [];
    pressTab({
      focused: false,
      routeKey: 'queue-key',
      emit: (event) => {
        emitted.push(event);
        return { defaultPrevented: false };
      },
      navigateToTab: () => {},
    });
    assert.deepEqual(emitted, [
      { type: 'tabPress', target: 'queue-key', canPreventDefault: true },
    ]);
  });

  it('navigasi saat tab tidak fokus dan event tidak dicegah', () => {
    const navigated = [];
    pressTab({
      focused: false,
      routeKey: 'profile-key',
      emit: () => ({ defaultPrevented: false }),
      navigateToTab: (key) => navigated.push(key),
    });
    assert.deepEqual(navigated, ['profile-key']);
  });

  it('tidak navigasi saat tab sudah fokus', () => {
    const navigated = [];
    pressTab({
      focused: true,
      routeKey: 'queue-key',
      emit: () => ({ defaultPrevented: false }),
      navigateToTab: (key) => navigated.push(key),
    });
    assert.deepEqual(navigated, []);
  });

  it('tidak navigasi saat event dicegah', () => {
    const navigated = [];
    pressTab({
      focused: false,
      routeKey: 'queue-key',
      emit: () => ({ defaultPrevented: true }),
      navigateToTab: (key) => navigated.push(key),
    });
    assert.deepEqual(navigated, []);
  });
});

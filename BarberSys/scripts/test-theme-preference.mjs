import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseThemeMode, THEME_STORAGE_KEY } from '../src/lib/theme-preference.ts';

test('parseThemeMode hanya menerima light/dark', () => {
  assert.equal(parseThemeMode('dark'), 'dark');
  assert.equal(parseThemeMode('light'), 'light');
  assert.equal(parseThemeMode('system'), 'light');
  assert.equal(parseThemeMode(null), 'light');
  assert.equal(parseThemeMode(undefined), 'light');
  assert.equal(THEME_STORAGE_KEY, 'barbersys.theme');
});

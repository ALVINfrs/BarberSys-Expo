import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveTtsMode, shouldShowVoiceWarning } from '../display-tv/src/lib/tts-engine.ts';

describe('tts-engine', () => {
  it('memakai Piper bila dipilih dan model siap', () => {
    assert.equal(resolveTtsMode('piper', true, false), 'piper');
    assert.equal(resolveTtsMode('piper', true, true), 'piper');
  });

  it('jatuh ke browser bila Piper belum siap tapi ada voice id-ID', () => {
    assert.equal(resolveTtsMode('piper', false, true), 'browser');
    assert.equal(resolveTtsMode('browser', false, true), 'browser');
  });

  it('jatuh ke Piper walau dipilih browser bila browser tak ada voice id-ID', () => {
    assert.equal(resolveTtsMode('browser', true, false), 'piper');
  });

  it('none bila dua-duanya tidak tersedia', () => {
    assert.equal(resolveTtsMode('piper', false, false), 'none');
  });

  it('warning hanya saat tidak ada mesin yang bisa dipakai', () => {
    assert.equal(shouldShowVoiceWarning('piper', false), false);
    assert.equal(shouldShowVoiceWarning('browser', true), false);
    assert.equal(shouldShowVoiceWarning('browser', false), true);
    assert.equal(shouldShowVoiceWarning('none', false), true);
  });
});

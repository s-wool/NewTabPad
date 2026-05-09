import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { initEditor, openNote, applyExternalUpdate } from '../src/editor.js';

describe('editor IME', () => {
  let textarea, gutterContent, onSave, onDelete;

  beforeEach(async () => {
    textarea = document.createElement('textarea');
    gutterContent = document.createElement('div');
    document.body.appendChild(textarea);
    document.body.appendChild(gutterContent);

    onSave = vi.fn();
    onDelete = vi.fn();
    initEditor({ textarea, gutterContent, onSave, onDelete });
  });

  afterEach(() => {
    // isComposing をリセットして次のテストに状態が漏れないようにする
    textarea.dispatchEvent(new Event('compositionend'));
    textarea.remove();
    gutterContent.remove();
  });

  test('IME中はapplyExternalUpdateをtextareaに即時反映しない', async () => {
    await openNote({ id: '1', content: 'original', createdAt: 0, updatedAt: 0 });
    expect(textarea.value).toBe('original');

    textarea.dispatchEvent(new Event('compositionstart'));
    applyExternalUpdate({ id: '1', content: 'updated', createdAt: 0, updatedAt: 1 });

    expect(textarea.value).toBe('original');
  });

  test('compositionend後に保留していた値を適用する', async () => {
    await openNote({ id: '1', content: 'original', createdAt: 0, updatedAt: 0 });

    textarea.dispatchEvent(new Event('compositionstart'));
    applyExternalUpdate({ id: '1', content: 'updated', createdAt: 0, updatedAt: 1 });

    textarea.dispatchEvent(new Event('compositionend'));
    expect(textarea.value).toBe('updated');
  });

  test('IME外ではapplyExternalUpdateを即時適用する', async () => {
    await openNote({ id: '1', content: 'original', createdAt: 0, updatedAt: 0 });
    applyExternalUpdate({ id: '1', content: 'updated', createdAt: 0, updatedAt: 1 });
    expect(textarea.value).toBe('updated');
  });

  test('別のメモのapplyExternalUpdateは無視する', async () => {
    await openNote({ id: '1', content: 'original', createdAt: 0, updatedAt: 0 });
    applyExternalUpdate({ id: '2', content: 'from-other-note', createdAt: 0, updatedAt: 1 });
    expect(textarea.value).toBe('original');
  });

  test('IME中に複数回更新が来た場合は最後の値のみ適用する', async () => {
    await openNote({ id: '1', content: 'original', createdAt: 0, updatedAt: 0 });

    textarea.dispatchEvent(new Event('compositionstart'));
    applyExternalUpdate({ id: '1', content: 'first', createdAt: 0, updatedAt: 1 });
    applyExternalUpdate({ id: '1', content: 'second', createdAt: 0, updatedAt: 2 });

    textarea.dispatchEvent(new Event('compositionend'));
    expect(textarea.value).toBe('second');
  });
});

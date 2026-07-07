import { describe, test, expect } from 'vitest';
import { myTabId, makeSyncMeta, computeSyncAction } from '../src/sync.js';

describe('makeSyncMeta', () => {
  test('sourceTabId と noteId を含む', () => {
    const meta = makeSyncMeta('note-1');
    expect(meta.sourceTabId).toBe(myTabId);
    expect(meta.noteId).toBe('note-1');
  });

  // chrome.storage.onChanged は値が変化しなかったキーを changes に含めないため、
  // 同じメモを連続保存しても __sync の値は毎回変わらなければならない。
  // これが同一だと自タブ判定がすり抜け、自分の保存で自分のエディタが
  // 上書きされてカーソルが末尾に飛ぶ（回帰: カーソル移動バグ）。
  test('同じ noteId で連続して呼んでも毎回異なる値を返す', () => {
    const first = makeSyncMeta('note-1');
    const second = makeSyncMeta('note-1');
    expect(second).not.toEqual(first);
    expect(second.seq).toBeGreaterThan(first.seq);
  });
});

describe('computeSyncAction', () => {
  test('自タブ発の変更は ignore を返す', () => {
    const result = computeSyncAction(
      { __sync: { newValue: { sourceTabId: 'my-tab' } } },
      'note-1',
      'my-tab',
    );
    expect(result.type).toBe('ignore');
  });

  test('notes の変化がなければ ignore を返す', () => {
    const result = computeSyncAction(
      { __sync: { newValue: { sourceTabId: 'other-tab' } } },
      'note-1',
      'my-tab',
    );
    expect(result.type).toBe('ignore');
  });

  test('現在開いているメモが削除されたとき deleted を返す', () => {
    const result = computeSyncAction(
      {
        __sync: { newValue: { sourceTabId: 'other-tab' } },
        notes: {
          oldValue: { 'note-1': { content: 'hello' } },
          newValue: {},
        },
      },
      'note-1',
      'my-tab',
    );
    expect(result.type).toBe('deleted');
  });

  test('現在開いているメモが更新されたとき updated を返し note を含む', () => {
    const updated = { id: 'note-1', content: 'updated', updatedAt: 2 };
    const result = computeSyncAction(
      {
        __sync: { newValue: { sourceTabId: 'other-tab' } },
        notes: {
          oldValue: { 'note-1': { id: 'note-1', content: 'original', updatedAt: 1 } },
          newValue: { 'note-1': updated },
        },
      },
      'note-1',
      'my-tab',
    );
    expect(result.type).toBe('updated');
    expect(result.note).toEqual(updated);
  });

  test('別のメモが変化しても現在のメモに無関係なら noop を返す', () => {
    const result = computeSyncAction(
      {
        __sync: { newValue: { sourceTabId: 'other-tab' } },
        notes: {
          oldValue: { 'note-2': { content: 'original' } },
          newValue: { 'note-2': { content: 'changed' } },
        },
      },
      'note-1',
      'my-tab',
    );
    expect(result.type).toBe('noop');
  });

  test('currentId が null のとき noop を返す', () => {
    const result = computeSyncAction(
      {
        __sync: { newValue: { sourceTabId: 'other-tab' } },
        notes: {
          oldValue: {},
          newValue: { 'note-1': { content: 'new' } },
        },
      },
      null,
      'my-tab',
    );
    expect(result.type).toBe('noop');
  });
});

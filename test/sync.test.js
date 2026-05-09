import { describe, test, expect } from 'vitest';
import { computeSyncAction } from '../src/sync.js';

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

import { describe, test, expect } from 'vitest';
import { isEmpty, getPreview, formatDate } from '../src/utils.js';

describe('isEmpty', () => {
  test('空文字は空', () => expect(isEmpty('')).toBe(true));
  test('半角スペースのみは空', () => expect(isEmpty('   ')).toBe(true));
  test('全角スペースのみは空', () => expect(isEmpty('　')).toBe(true));
  test('改行のみは空', () => expect(isEmpty('\n')).toBe(true));
  test('文字があれば空でない', () => expect(isEmpty('a')).toBe(false));
  test('前後スペース付きの文字は空でない', () => expect(isEmpty('  a  ')).toBe(false));
});

describe('getPreview', () => {
  test('先頭行を返す', () => expect(getPreview('hello\nworld')).toBe('hello'));
  test('先頭の空行をスキップする', () => expect(getPreview('\n\nhello')).toBe('hello'));
  test('30文字以内はそのまま返す', () => expect(getPreview('a'.repeat(30))).toBe('a'.repeat(30)));
  test('31文字以上は30文字で切り詰め末尾に…を付ける', () => {
    expect(getPreview('a'.repeat(31))).toBe('a'.repeat(30) + '…');
  });
  test('全行空のとき空文字を返す', () => expect(getPreview('\n\n')).toBe(''));
  test('空文字のとき空文字を返す', () => expect(getPreview('')).toBe(''));
});

describe('formatDate', () => {
  test('一桁の月・日・時・分をゼロパディングする', () => {
    const d = new Date(2024, 0, 5, 3, 7); // 2024-01-05 03:07 ローカル時刻
    expect(formatDate(d.getTime())).toBe('2024-01-05 03:07');
  });
  test('二桁の月・日・時・分はそのまま出力する', () => {
    const d = new Date(2024, 11, 31, 23, 59); // 2024-12-31 23:59
    expect(formatDate(d.getTime())).toBe('2024-12-31 23:59');
  });
});

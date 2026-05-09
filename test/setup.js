import { vi } from 'vitest';

global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
};

// jsdom は canvas を実装しないため、editor.js の初期化が通るようにスタブ化する
HTMLCanvasElement.prototype.getContext = () => ({
  measureText: () => ({ width: 0 }),
  font: '',
});

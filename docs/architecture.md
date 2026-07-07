# NewTabPad アーキテクチャ

技術判断と実装方針をまとめる。ユーザから見た振る舞いは `spec.md` を参照。

## Manifest V3 構成

- `manifest_version: 3`
- `chrome_url_overrides.newtab` で新しいタブを置き換え
- ビルドプロセスは導入しない（素の HTML / CSS / JS）
- ES モジュール（`<script type="module">`）でファイル分割
- 必要な permission:
  - `storage`
  - `unlimitedStorage`

## ファイル構成

```
manifest.json
newtab.html
package.json        # Vitest 依存とパッケージスクリプト
vitest.config.js
src/
  main.js          # 起動時のエントリポイント、画面遷移の調整
  editor.js        # textarea + 行番号ガター + IME 保留
  list.js          # 一覧画面の描画
  storage.js       # chrome.storage.local の薄いラッパ
  sync.js          # myTabId・computeSyncAction
  shortcuts.js     # キーボードショートカット
  utils.js         # 日付フォーマット、プレビュー生成、空判定
styles/
  newtab.css
icons/
  16.png 32.png 48.png 128.png
scripts/
  package.sh       # Chrome Web Store 提出用 ZIP 生成
test/
  setup.js         # Vitest グローバルセットアップ（chrome モック）
  utils.test.js
  sync.test.js
  editor.test.js
```

## エディタ実装

### 採用: `<textarea>` + 別 div の行番号ガター

- 本文は `<textarea wrap="off">`、左側に `<div class="gutter">` を置く
- 行番号は textarea の値に応じて再生成。`input` イベントのたびに更新する
  - 行数が変わらなくても行の長さが変わる可能性があるため、毎回チェックする
- gutter は textarea の `scroll` イベントで `scrollTop` を同期する
  - 横スクロールは無視（行番号列は固定のまま）

### 長行マーカー（`›`）

画面幅を超えている行の行番号右側に `›` を表示する。

**文字幅の計測:**

モノスペースフォントは全文字が同じ幅を持つため、初期化時に1文字分の幅を一度だけ計測する。

```js
function measureCharWidth() {
  const span = document.createElement('span');
  span.style.cssText = 'visibility:hidden; position:absolute; white-space:pre;';
  // textarea と同じフォント設定を適用
  span.textContent = 'x'.repeat(20);
  document.body.appendChild(span);
  const w = span.getBoundingClientRect().width / 20;
  span.remove();
  return w;
}
```

**判定:**

```js
const padding = 32; // textarea の左右 padding 合計 (px)
const visibleCols = Math.floor((textareaEl.clientWidth - padding) / charWidth);
const isLong = line.length > visibleCols;
```

- `textarea.clientWidth` はウィンドウリサイズで変わるため、`resize` イベントで `visibleCols` を再計算する
- タブ文字（`\t`）は1文字としてカウントする（簡略化）

### 折り返しは行わない

- 「論理行 = 表示行」を保証することで、行番号の整合性を素直に保つ
- 長い行は横スクロールで対応

### 不採用案

- **`contenteditable`**: 折り返し時の表示行番号も計算可能だが、IME 中の DOM 書き換えで日本語入力が壊れやすい。コピペ時の書式混入も負担。シンプル要件と合わない
- **CodeMirror 等のライブラリ vendored**: 機能は十分だが「ビルドなし、シンプル」の方針に合わない。CodeMirror 6 は ESM のため vendor 配置だけで使うには手間がかかる

### IME 保留

`textarea` 上で:

```js
let isComposing = false;
let pendingValue = null;

textarea.addEventListener('compositionstart', () => { isComposing = true; });
textarea.addEventListener('compositionend',   () => {
  isComposing = false;
  if (pendingValue !== null) {
    textarea.value = pendingValue;
    pendingValue = null;
  }
});
```

ストレージ更新の取り込み時:

```js
function applyRemoteUpdate(newValue) {
  if (isComposing) {
    pendingValue = newValue;   // 最新の保留値だけ保持（キューにしない）
  } else {
    textarea.value = newValue;
  }
}
```

## ストレージスキーマ

`chrome.storage.local` に以下のキーを置く。

### `notes`

```ts
type Notes = {
  [id: string]: {
    id: string;          // crypto.randomUUID()
    content: string;
    createdAt: number;   // Date.now()、最初の文字入力時
    updatedAt: number;   // Date.now()、各保存時
  }
};
```

### `__sync`

```ts
type Sync = {
  sourceTabId: string;   // 書き込み元タブの一時 ID（メモリのみ）
  noteId: string;        // 編集対象のメモ ID
  seq: number;           // タブ内で書き込みごとに増加するカウンタ
};
```

- 同期目的のメタデータのみ。データ本体（`notes`）を汚さないため別キーに分離
- 1 回の `chrome.storage.local.set({ notes, __sync })` で書き込むため、`onChanged` も両キーまとめて 1 回で届く
- `seq` は `__sync` の値が書き込みごとに必ず変化することを保証するためのもの。`chrome.storage.onChanged` は**値が実際に変化したキーしか `changes` に含めない**ため、`seq` がないと同一タブで同じメモを保存し続けたとき（2 回目以降は `sourceTabId` も `noteId` も同じ）`__sync` が `changes` から落ち、自タブ判定がすり抜けて自分の保存が自分のエディタを上書きする（カーソルが末尾に飛ぶ）

### 持たないもの

- 「現在編集中のメモ ID」: ストレージには持たない。タブごとに独立したメモを開ける
- ユーザ設定（フォント、テーマ、debounce 時間など）: v1 では持たない

## 同期メカニズム

### sourceTabId

- 各タブは起動時に `crypto.randomUUID()` で `myTabId` を生成
- メモリのみで保持（ストレージには永続化しない）
- 自タブが書き込みを行う際、`__sync.sourceTabId = myTabId` をセット

### `onChanged` ハンドラ

```js
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const sync = changes.__sync?.newValue;
  if (sync && sync.sourceTabId === myTabId) return;  // 自分発の変更は無視
  // notes の差分から、現在開いているメモの更新／削除を反映
  // 一覧表示中なら一覧を再描画
});
```

### 競合ポリシー

- last-write-wins（検出なし）
- 個人利用かつ複数タブの同時編集は想定が薄いため、シンプルさを優先
- 「敗者」タブは `onChanged` 経由で勝者の内容に上書きされる

### 削除時の挙動（受信側）

- 自分が開いているメモが他タブで削除された場合:
  - `notes` のうち最新 `updatedAt` のものに切り替える
  - メモが残っていなければ空のエディタを表示
- 新規タブを開いた時のフォールバックルールと同一の処理

## 保存パイプライン

```
keystroke
  → updatedAt 候補を更新
  → debounce 500ms
  → 発火時に content.trim() === "" を判定
      ├─ 空: ストレージから削除（既存なら）／書かない（未作成なら）
      └─ 非空: chrome.storage.local.set({ notes, __sync })
```

- 既存メモ更新時の `createdAt` は変更しない
- 新規メモの初回保存時のみ `createdAt` を設定（最初の文字入力時点のタイムスタンプ）

## ID と時刻

- ID: `crypto.randomUUID()`（衝突なし、複数タブ同時生成も安全）
- 時刻: `Date.now()`（ms epoch）
- 表示時にローカル TZ で `YYYY-MM-DD HH:MM` にフォーマット

## キーボードショートカット実装

- `window.addEventListener('keydown', ...)` で集約
- 修飾キー判定:
  - macOS: `event.metaKey && event.shiftKey`
  - Windows/Linux: `event.ctrlKey && event.shiftKey`
- 簡易的に `event.metaKey || event.ctrlKey` でまとめても可（Mac で Ctrl 同時押しも許容）
- ショートカット発火時は `event.preventDefault()` でブラウザ既定動作を奪う

## 一覧表示の更新トリガ

以下のイベントで一覧を再描画:

1. ユーザが一覧画面を開いた時（初回描画）
2. 一覧画面表示中に `chrome.storage.onChanged` で `notes` が変化した時（自タブ発含む）
3. 削除操作の直後

## エラー処理方針（v1）

- ストレージ書き込み失敗等は `console.error` のみ
- ユーザ向けの UI エラー表示はしない
- 例外を握り潰さない（開発時に気付けるようにする）

## テスト方針

### フレームワーク

Vitest + jsdom。ビルドプロセスなしの方針と整合するため、ES modules をそのまま扱える最小構成を選択。

### テスト対象

手動確認が困難なロジックに限定して自動テストを追加する。

| 対象 | 理由 |
|---|---|
| `utils.js`（`isEmpty`、`formatDate`、`getPreview`） | 純粋関数。エッジケースが多く、変更時の回帰を検知しやすい |
| クロスタブ同期の判定ロジック（`sync.js` に抽出） | `sourceTabId` フィルタ・削除・更新の判定。バグがデータ損失に直結する |
| `editor.js` の IME 保留挙動 | `compositionstart`〜`compositionend` 中の外部更新保留は手動確認が難しい |

### テストしないもの

- `chrome.storage` の実際の読み書き（Chrome API 統合）
- タブ間の実際の同期（ブラウザ上の E2E 動作）
- UI の描画・レイアウト

これらは CLAUDE.md の手動確認観点で引き続き対応する。

## v1 で意図的にやらないこと

- ビルドツール／TypeScript／フレームワーク導入
- リッチテキスト編集
- 検索／タグ／カテゴリ
- リモート同期
- 競合検出と差分マージ UI
- `beforeunload` での強制保存（debounce のみで十分とする）
- カスタム削除確認 UI（ネイティブ `confirm()` を使用）
- 新規タブを開いた瞬間の textarea 自動フォーカス（アドレスバー検索を妨げないため）

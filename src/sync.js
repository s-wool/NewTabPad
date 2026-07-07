export const myTabId = crypto.randomUUID();

let writeSeq = 0;

// chrome.storage.onChanged は値が実際に変化したキーしか changes に含めないため、
// seq で __sync が書き込みごとに必ず変化することを保証する。これがないと
// 同一タブで同じメモを保存し続けたとき自タブ判定がすり抜ける。
export function makeSyncMeta(noteId) {
  writeSeq += 1;
  return { sourceTabId: myTabId, noteId, seq: writeSeq };
}

export function computeSyncAction(changes, currentId, sourceTabId) {
  const sync = changes.__sync?.newValue;
  if (sync?.sourceTabId === sourceTabId) return { type: 'ignore' };
  if (!changes.notes) return { type: 'ignore' };

  const newNotes = changes.notes.newValue ?? {};
  const oldNotes = changes.notes.oldValue ?? {};

  if (currentId && oldNotes[currentId] && !newNotes[currentId]) {
    return { type: 'deleted' };
  }
  if (currentId && newNotes[currentId] && newNotes[currentId].content !== oldNotes[currentId]?.content) {
    return { type: 'updated', note: newNotes[currentId] };
  }
  return { type: 'noop' };
}

export const myTabId = crypto.randomUUID();

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

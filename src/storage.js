const NOTES_KEY = 'notes';
const SYNC_KEY = '__sync';

export async function loadNotes() {
  const result = await chrome.storage.local.get(NOTES_KEY);
  return result[NOTES_KEY] ?? {};
}

export async function writeNotes(notes, syncMeta) {
  await chrome.storage.local.set({
    [NOTES_KEY]: notes,
    [SYNC_KEY]: syncMeta,
  });
}

export function subscribeChanges(handler) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') handler(changes);
  });
}

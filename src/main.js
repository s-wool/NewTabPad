import {
  initEditor, openNote, applyExternalUpdate, applyExternalDelete,
  getCurrentNoteId, focusEditor,
} from './editor.js';
import { initList, showList, hideList, refreshList, isListVisible } from './list.js';
import { initShortcuts } from './shortcuts.js';
import { loadNotes, writeNotes, subscribeChanges } from './storage.js';
import { myTabId, makeSyncMeta, computeSyncAction } from './sync.js';
import { isEmpty } from './utils.js';

let notesCache = {};

async function init() {
  notesCache = await loadNotes();

  // Defensive cleanup: remove empty notes left by crashes or bugs.
  let cleanedAny = false;
  for (const id of Object.keys(notesCache)) {
    if (isEmpty(notesCache[id].content)) {
      delete notesCache[id];
      cleanedAny = true;
    }
  }
  if (cleanedAny) await persistAll('');

  initEditor({
    textarea: document.getElementById('editor'),
    gutterContent: document.getElementById('gutterContent'),
    onSave: handleEditorSave,
    onDelete: handleEditorDelete,
  });

  initList({
    view: document.getElementById('listView'),
    list: document.getElementById('noteList'),
    empty: document.getElementById('emptyState'),
    onOpen: handleListOpen,
    onDelete: handleListDelete,
  });

  initShortcuts({
    onNewNote: handleNewNote,
    onToggleList: handleToggleList,
    onEscape: handleEscape,
  });

  document.getElementById('newBtn').addEventListener('click', handleNewNote);
  document.getElementById('listBtn').addEventListener('click', handleToggleList);

  await openNote(findLatest(), { focus: false });

  subscribeChanges(handleStorageChange);
}

function findLatest() {
  const all = Object.values(notesCache);
  if (all.length === 0) return null;
  return all.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)[0];
}

async function handleEditorSave(note) {
  notesCache[note.id] = note;
  await persistAll(note.id);
  refreshList(notesCache);
}

async function handleEditorDelete(noteId) {
  delete notesCache[noteId];
  await persistAll(noteId);
  refreshList(notesCache);
}

async function persistAll(noteId) {
  try {
    await writeNotes(notesCache, makeSyncMeta(noteId));
  } catch (err) {
    console.error('NewTabPad: storage write failed', err);
  }
}

async function handleNewNote() {
  if (isListVisible()) hideList();
  await openNote(null);
}

async function handleListOpen(noteId) {
  hideList();
  await openNote(notesCache[noteId]);
}

async function handleListDelete(noteId) {
  if (!confirm('Delete this note?')) return;

  const wasCurrent = getCurrentNoteId() === noteId;
  delete notesCache[noteId];

  if (wasCurrent) {
    applyExternalDelete(noteId);
    await openNote(findLatest(), { focus: false });
  }

  await persistAll(noteId);
  refreshList(notesCache);
}

function handleToggleList() {
  if (isListVisible()) {
    hideList();
    focusEditor();
  } else {
    showList(notesCache);
  }
}

function handleEscape() {
  if (isListVisible()) {
    hideList();
    focusEditor();
  }
}

async function handleStorageChange(changes) {
  const currentId = getCurrentNoteId();
  const action = computeSyncAction(changes, currentId, myTabId);

  if (action.type === 'ignore') return;

  notesCache = changes.notes.newValue ?? {};

  if (action.type === 'deleted') {
    applyExternalDelete(currentId);
    await openNote(findLatest(), { focus: false });
  } else if (action.type === 'updated') {
    applyExternalUpdate(action.note);
  }

  refreshList(notesCache);
}

init().catch((err) => console.error('NewTabPad: init failed', err));

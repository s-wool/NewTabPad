import { isEmpty } from './utils.js';

const DEBOUNCE_MS = 500;
const TEXTAREA_H_PADDING = 32; // left (16px) + right (16px) from CSS

let textareaEl;
let gutterContentEl;
let onSaveCb;
let onDeleteCb;
let charWidth = 0;
let lastGutterHtml = '';

let currentNote = null;
let currentPersisted = false;
let isComposing = false;
let pendingValue = null;
let debounceTimer = null;

function measureCharWidth() {
  const style = getComputedStyle(textareaEl);
  const span = document.createElement('span');
  span.style.cssText = `visibility:hidden;position:absolute;white-space:pre;font-family:${style.fontFamily};font-size:${style.fontSize};`;
  span.textContent = 'x'.repeat(20);
  document.body.appendChild(span);
  charWidth = span.getBoundingClientRect().width / 20;
  span.remove();
}

export function initEditor({ textarea, gutterContent, onSave, onDelete }) {
  textareaEl = textarea;
  gutterContentEl = gutterContent;
  onSaveCb = onSave;
  onDeleteCb = onDelete;

  textareaEl.addEventListener('input', handleInput);
  textareaEl.addEventListener('compositionstart', () => { isComposing = true; });
  textareaEl.addEventListener('compositionend', () => {
    isComposing = false;
    if (pendingValue !== null) {
      const v = pendingValue;
      pendingValue = null;
      applyValue(v);
    }
  });
  textareaEl.addEventListener('scroll', () => {
    gutterContentEl.style.transform = `translateY(${-textareaEl.scrollTop}px)`;
  });
  window.addEventListener('resize', refreshGutter);

  measureCharWidth();
  refreshGutter();
}

export async function openNote(note, { focus = true } = {}) {
  await flushNow();
  currentNote = note ? { ...note } : null;
  currentPersisted = note !== null;
  applyValue(note?.content ?? '');
  textareaEl.scrollTop = 0;
  if (focus) textareaEl.focus();
}

// Apply an update that arrived from another tab.
export function applyExternalUpdate(note) {
  if (!currentNote || currentNote.id !== note.id) return;
  clearTimeout(debounceTimer);
  debounceTimer = null;
  currentNote.content = note.content;
  currentNote.updatedAt = note.updatedAt;
  currentPersisted = true;
  applyValue(note.content);
}

export function applyExternalDelete(noteId) {
  if (currentNote?.id !== noteId) return;
  clearTimeout(debounceTimer);
  debounceTimer = null;
  currentNote = null;
  currentPersisted = false;
}

export function getCurrentNoteId() {
  return currentNote?.id ?? null;
}

export function focusEditor() {
  textareaEl.focus();
}

function applyValue(value) {
  if (isComposing) {
    pendingValue = value;
    return;
  }
  textareaEl.value = value;
  refreshGutter();
}

function handleInput() {
  const value = textareaEl.value;
  const now = Date.now();

  if (!currentNote) {
    if (isEmpty(value)) {
      refreshGutter();
      return;
    }
    currentNote = {
      id: crypto.randomUUID(),
      content: value,
      createdAt: now,
      updatedAt: now,
    };
    currentPersisted = false;
  } else {
    currentNote.content = value;
    currentNote.updatedAt = now;
  }

  refreshGutter();
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushNow();
  }, DEBOUNCE_MS);
}

async function flushNow() {
  clearTimeout(debounceTimer);
  debounceTimer = null;

  if (!currentNote) return;

  if (isEmpty(currentNote.content)) {
    if (currentPersisted) {
      const idToDelete = currentNote.id;
      currentNote = null;
      currentPersisted = false;
      await onDeleteCb(idToDelete);
    } else {
      currentNote = null;
    }
    return;
  }

  await onSaveCb({ ...currentNote });
  currentPersisted = true;
}

function refreshGutter() {
  const lines = textareaEl.value.split('\n');
  const visibleCols = charWidth > 0
    ? Math.floor((textareaEl.clientWidth - TEXTAREA_H_PADDING) / charWidth)
    : Infinity;

  let html = '';
  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].length > visibleCols ? '›' : '';
    html += `<div data-long="${marker}"><span class="num">${i + 1}</span></div>`;
  }

  if (html === lastGutterHtml) return;
  lastGutterHtml = html;
  gutterContentEl.innerHTML = html;
}

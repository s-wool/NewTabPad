import { formatDate, getPreview } from './utils.js';

let viewEl;
let listEl;
let emptyEl;
let onOpenCb;
let onDeleteCb;
let visible = false;

export function initList({ view, list, empty, onOpen, onDelete }) {
  viewEl = view;
  listEl = list;
  emptyEl = empty;
  onOpenCb = onOpen;
  onDeleteCb = onDelete;
}

export function showList(notes) {
  viewEl.hidden = false;
  visible = true;
  render(notes);
}

export function hideList() {
  viewEl.hidden = true;
  visible = false;
}

export function refreshList(notes) {
  if (visible) render(notes);
}

export function isListVisible() {
  return visible;
}

function render(notes) {
  const sorted = Object.values(notes).sort(
    (a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt
  );

  listEl.innerHTML = '';

  if (sorted.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  for (const note of sorted) {
    const li = document.createElement('li');
    li.className = 'noteItem';

    const noteMain = document.createElement('div');
    noteMain.className = 'noteMain';
    noteMain.addEventListener('click', () => onOpenCb(note.id));

    const meta = document.createElement('div');
    meta.className = 'noteMeta';
    meta.textContent = formatDate(note.createdAt);

    const preview = document.createElement('div');
    preview.className = 'notePreview';
    preview.textContent = getPreview(note.content);

    noteMain.appendChild(meta);
    noteMain.appendChild(preview);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'noteDelete';
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDeleteCb(note.id);
    });

    li.appendChild(noteMain);
    li.appendChild(delBtn);
    listEl.appendChild(li);
  }
}

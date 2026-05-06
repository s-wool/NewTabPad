const isMac = navigator.platform.toLowerCase().startsWith('mac');

export function initShortcuts({ onNewNote, onToggleList, onEscape }) {
  window.addEventListener('keydown', (e) => {
    const primaryMod = isMac ? e.metaKey : e.ctrlKey;

    if (primaryMod && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      onNewNote();
      return;
    }

    if (primaryMod && e.shiftKey && e.code === 'KeyK') {
      e.preventDefault();
      onToggleList();
      return;
    }

    if (e.key === 'Escape') {
      onEscape();
    }
  });
}

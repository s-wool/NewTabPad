export function isEmpty(content) {
  return content.trim() === '';
}

export function formatDate(timestampMs) {
  const d = new Date(timestampMs);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getPreview(content) {
  const firstLine = content.split('\n').find((line) => line.trim() !== '') ?? '';
  return firstLine.length <= 30 ? firstLine : firstLine.slice(0, 30) + '…';
}

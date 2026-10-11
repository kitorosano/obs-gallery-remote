export function createMessagePresenter(element) {
  return function setMessage(text = '', type = '') {
    element.textContent = text;
    element.className = `message ${type}`.trim();
  };
}

export function renderEmptyState(container, text) {
  container.replaceChildren();
  const empty = document.createElement('p');
  empty.className = 'muted';
  empty.textContent = text;
  container.append(empty);
}

export function formatDuration(durationMs) {
  if (!Number.isFinite(Number(durationMs))) return '00:00:00';
  const totalSeconds = Math.max(0, Math.floor(Number(durationMs) / 1000));
  const parts = [
    Math.floor(totalSeconds / 3600),
    Math.floor((totalSeconds % 3600) / 60),
    totalSeconds % 60,
  ];
  return parts.map((value) => String(value).padStart(2, '0')).join(':');
}

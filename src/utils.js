export function avatarColor(name) {
  const colors = ['#6a5cff', '#ff6b9d', '#ff9f43', '#1fb6b6', '#4d9de0', '#9b5de5', '#00b894'];
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return colors[h % colors.length];
}

export function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function formatDay(ts) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

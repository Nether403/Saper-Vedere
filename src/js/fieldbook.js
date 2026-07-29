const STORAGE_KEY = 'saper-vedere-fieldbook';
let memoryItems = null;

function read() {
  if (memoryItems) return [...memoryItems];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    memoryItems = null;
  } catch {
    memoryItems = [...items];
  }
  window.dispatchEvent(new CustomEvent('fieldbookchange', { detail: items }));
}

export function fieldbookItems() {
  return read();
}

export function fieldbookHas(id) {
  return read().includes(id);
}

export function fieldbookToggle(id) {
  const items = read();
  const next = items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
  write(next);
  return next.includes(id);
}

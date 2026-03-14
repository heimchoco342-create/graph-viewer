import '@testing-library/jest-dom/vitest'

// Polyfill ResizeObserver for tests (not available in jsdom)
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof window.ResizeObserver;
}

// Node 22 provides a built-in localStorage that shadows jsdom's.
// Ensure window.localStorage has full Storage API.
if (typeof window !== 'undefined' && typeof window.localStorage.clear !== 'function') {
  const store: Record<string, string> = {};
  const storage: Storage = {
    getItem(key: string) { return store[key] ?? null; },
    setItem(key: string, value: string) { store[key] = String(value); },
    removeItem(key: string) { delete store[key]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key(index: number) { return Object.keys(store)[index] ?? null; },
  };
  Object.defineProperty(window, 'localStorage', { value: storage, writable: true });
}

import '@testing-library/jest-dom/vitest';

const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key];
    },
    clear: () => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      Object.keys(store).forEach((k) => delete store[k]);
    },
  },
  writable: true,
});

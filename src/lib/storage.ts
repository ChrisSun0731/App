// Synchronous key-value storage backed by SQLite.
//
// expo-sqlite installs a `localStorage` global with the browser API, so state
// persists across launches. This native SQLite database is separate from the
// previous app's WebView storage; it does not migrate existing data by itself.
// Synchronous reads hydrate stores before the first render.
import 'expo-sqlite/localStorage/install';

import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // A full disk shouldn't take down whatever triggered the write.
    console.warn(`[storage] could not write ${key}:`, error);
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to remove.
  }
}

const stateStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

/** Storage adapter for zustand's `persist` middleware. */
export const persistStorage = createJSONStorage(() => stateStorage);

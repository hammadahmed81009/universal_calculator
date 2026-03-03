import { useSyncExternalStore } from 'react';

export type Store<T> = {
  getState: () => T;
  setState: (updater: (prev: T) => T) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStore<T>(initial: T, persistKey?: string): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  if (persistKey) {
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) state = { ...state, ...JSON.parse(raw) };
    } catch {}
  }
  const getState = () => state;
  const setState = (updater: (prev: T) => T) => {
    state = updater(state);
    if (persistKey) try { localStorage.setItem(persistKey, JSON.stringify(state)); } catch {}
    listeners.forEach((l) => l());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };
  return { getState, setState, subscribe };
}

export function createHook<T>(store: Store<T>) {
  return function useStore(): T {
    return useSyncExternalStore(store.subscribe, store.getState, store.getState);
  };
}

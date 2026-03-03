import { useEffect, useMemo } from 'react';
import useLocalStorage from './useLocalStorage';
import { fetchQuickSqftPresets, saveQuickSqftPresets } from '../services/presets';

export type QuickPreset = { id: number; value: number; label: string };
const STORAGE_KEY = 'quick-presets:v1';
const formatSqft = (v: number) => `${new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(v)))} sq ft`;
const DEFAULT_PRESETS: QuickPreset[] = [
  { id: 1, value: 500, label: formatSqft(500) }, { id: 2, value: 1000, label: formatSqft(1000) },
  { id: 3, value: 1500, label: formatSqft(1500) }, { id: 4, value: 2000, label: formatSqft(2000) },
  { id: 5, value: 3000, label: formatSqft(3000) }, { id: 6, value: 5000, label: formatSqft(5000) },
];

export function useQuickPresets() {
  const [presets, setPresetsLS] = useLocalStorage<QuickPreset[]>(STORAGE_KEY, DEFAULT_PRESETS);
  const broadcast = (next: QuickPreset[]) => { try { window.dispatchEvent(new CustomEvent('quick-presets:changed', { detail: next })); } catch {} };
  const setPresets = (next: QuickPreset[] | ((prev: QuickPreset[]) => QuickPreset[])) => {
    const resolved = typeof next === 'function' ? (next as (p: QuickPreset[]) => QuickPreset[])(presets) : next;
    setPresetsLS(resolved);
    broadcast(resolved);
    saveQuickSqftPresets(resolved.map(p => p.value)).catch(() => {});
  };
  const updatePreset = (id: number, value: number) => {
    const v = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    setPresets(prev => prev.map(p => (p.id === id ? { ...p, value: v, label: formatSqft(v) } : p)));
  };
  const resetPresets = () => setPresets(DEFAULT_PRESETS);
  useEffect(() => {
    const handler = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed: QuickPreset[] = raw ? JSON.parse(raw) : DEFAULT_PRESETS;
        if (JSON.stringify(parsed) !== JSON.stringify(presets)) setPresetsLS(parsed);
      } catch {}
    };
    window.addEventListener('storage', handler);
    window.addEventListener('quick-presets:changed', handler as EventListener);
    return () => { window.removeEventListener('storage', handler); window.removeEventListener('quick-presets:changed', handler as EventListener); };
  }, [presets, setPresetsLS]);
  useEffect(() => {
    fetchQuickSqftPresets().then(fromApi => {
      if (fromApi && fromApi.length === 6) {
        const mapped = fromApi.map((v, i) => ({ id: i + 1, value: Math.max(0, Math.round(v)), label: formatSqft(v) }));
        if (JSON.stringify(mapped) !== JSON.stringify(presets)) { setPresetsLS(mapped); broadcast(mapped); }
      }
    });
  }, []);
  return useMemo(() => ({ presets, setPresets, updatePreset, resetPresets }), [presets]);
}

export default useQuickPresets;

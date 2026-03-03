/** Stub: calculator-only handoff — client preselection removed. No-op so UniversalCalculator.tsx builds without edits. */
export interface PreselectedClientResult {
  clientId: number;
  clientName: string;
}

export function getPreselectedClient(
  _storageKey: string,
  _timestampKey: string,
  _maxAgeMs?: number
): PreselectedClientResult | null {
  return null;
}

export function clearPreselectedClient(_storageKey: string, _timestampKey: string): void {}

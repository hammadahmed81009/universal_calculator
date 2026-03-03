/** Stub: calculator-only handoff — client service removed. Kept so UniversalCalculator.tsx builds without edits. */
export default {
  searchClients: async (_q: string) => [] as { id: number; first_name?: string; last_name?: string; company_name?: string }[],
  getClient: async (_id: number) => null as { id: number; first_name?: string; last_name?: string; company_name?: string } | null,
};

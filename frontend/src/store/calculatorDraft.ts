import { v4 as uuidv4 } from 'uuid';
import { createStore, createHook } from './simpleStore';
import type { CalculatorDraft, ClientRef, CompanyRef } from '../types/shared';

const persistKey = 'calculatorDraft.v1';
const initialDraft: CalculatorDraft = {
  draftId: uuidv4(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  client: null,
  company: null,
  manufacturerId: null,
  systemGroup: '',
  systemType: '',
  coverageAreaSqFt: 0,
  surfaceHardness: null,
  pricingMethod: 'margin',
  marginPct: 0.5,
  laborRatePerHour: 55,
  laborHours: 0,
  targetPricePerSqFt: 0,
  tierOverrides: {},
  items: [],
  totals: undefined,
  dirty: false,
  version: 1,
  uiState: undefined,
};

const store = createStore<CalculatorDraft>(initialDraft, persistKey);
export const useCalculatorDraft = createHook(store);
export const calculatorDraftActions = {
  setClient(client: ClientRef | null) { store.setState((s) => ({ ...s, client, updatedAt: Date.now(), dirty: true })); },
  setCompany(company: CompanyRef | null) { store.setState((s) => ({ ...s, company, updatedAt: Date.now(), dirty: true })); },
  patch(patch: Partial<CalculatorDraft>) { store.setState((s) => ({ ...s, ...patch, updatedAt: Date.now(), dirty: true })); },
  setUiState(ui: any) { store.setState((s) => ({ ...s, uiState: ui, updatedAt: Date.now(), dirty: true })); },
  setTotals(totals: CalculatorDraft['totals']) { store.setState((s) => ({ ...s, totals, updatedAt: Date.now(), dirty: true })); },
  reset(reason: 'userReset' | 'clientChanged' | 'manufacturerChanged') {
    store.setState((s) => {
      const base: CalculatorDraft = { ...initialDraft, draftId: uuidv4(), createdAt: Date.now(), updatedAt: Date.now() };
      if (reason === 'clientChanged') return { ...base, client: s.client, company: s.company };
      if (reason === 'manufacturerChanged') return { ...base, client: s.client, company: s.company, manufacturerId: null };
      return base;
    });
  },
};

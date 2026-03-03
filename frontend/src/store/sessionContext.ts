import { createStore, createHook } from './simpleStore';
import type { SessionContext, ClientRef } from '../types/shared';

const store = createStore<SessionContext>({ client: null, returnTo: null, lastSavedBidId: null, version: 1 }, 'sessionContext.v1');
export const useSessionContext = createHook(store);
export const sessionActions = {
  setClient(client: ClientRef | null) { store.setState((s) => ({ ...s, client })); },
  setReturnTo(path: string | null) { store.setState((s) => ({ ...s, returnTo: path })); },
  setLastSavedBidId(id: string | null) { store.setState((s) => ({ ...s, lastSavedBidId: id })); },
  patch(patch: Partial<SessionContext>) { store.setState((s) => ({ ...s, ...patch })); },
};

/**
 * Static API layer — no network. All data from src/data/dummyData.
 */

import {
  getDummyProductsByManufacturerAndCategories,
  getDummySavedBid,
} from '../data/dummyData';

type Params = Record<string, string | number | boolean | undefined>;

export async function apiGet<T = unknown>(url: string, config?: { params?: Params }): Promise<T> {
  const path = url.replace(/\?.*$/, '');
  const params = config?.params ?? {};

  // Products by manufacturer and categories
  if (path === '/api/user-products/my-products') {
    const manufacturerId = params.manufacturer_id as number | undefined;
    const productCategories = (params.product_categories as string) || '';
    const categoryList = productCategories ? productCategories.split(',').map((s) => s.trim()) : [];
    if (!manufacturerId) return [] as unknown as T;
    const list = getDummyProductsByManufacturerAndCategories(manufacturerId, categoryList);
    return list as unknown as T;
  }

  // Saved bid by id (always null — no persisted bids)
  const savedBidMatch = path.match(/^\/api\/saved-bids\/(.+)$/);
  if (savedBidMatch) {
    const bid = getDummySavedBid(savedBidMatch[1]);
    return bid as unknown as T;
  }

  return [] as unknown as T;
}

export async function apiPost<T = unknown>(_url: string, _data?: unknown): Promise<T> {
  // No-op save; return a fake id so UI can continue
  return { id: 'dummy-saved-bid-1' } as unknown as T;
}

export async function apiPut<T = unknown>(_url: string, _data?: unknown): Promise<T> {
  return undefined as unknown as T;
}

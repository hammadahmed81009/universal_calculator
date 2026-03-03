export type ClientRef = { id: string; name: string; email?: string; phone?: string; address?: string };
export type CompanyRef = { id: string; legalName: string; email: string; phone: string; address: string; logoUrl?: string };
export type CalculatorItem = { sku: string; name: string; manufacturer?: string; manufacturerId?: string | null; imageUrl?: string; tdsUrl?: string; unit: string; qty: number; unitPrice?: number; componentKey?: string };
export type CalculatorTotals = { materialCost: number; laborCost: number; totalCost: number; customerPrice: number; ppsf: number; byTier?: any };
export type CalculatorDraft = {
  draftId: string; createdAt: number; updatedAt: number; client?: ClientRef | null; company?: CompanyRef | null; manufacturerId?: string | null;
  systemGroup: string; systemType: string; coverageAreaSqFt: number; surfaceHardness: string | null;
  pricingMethod: 'margin' | 'cost_plus' | 'target_ppsf'; marginPct?: number; laborRatePerHour?: number; laborHours?: number; targetPricePerSqFt?: number;
  tierOverrides?: any; items: CalculatorItem[]; totals?: CalculatorTotals; dirty: boolean; version: number; uiState?: any;
};
export type SessionContext = { client?: ClientRef | null; returnTo?: string | null; lastSavedBidId?: string | null; version: number };

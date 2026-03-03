import type { CalculatorDraft, CalculatorItem } from '../types/shared';
import type { BidSnapshot } from './pnl';
import { toBackendPricingMethod } from '../constants/pricingMethods';

export function snapshotToItems(snapshot: BidSnapshot): CalculatorItem[] {
  const items = (snapshot.lineItems || []).map((li) => ({
    sku: li.sku || li.id,
    name: li.name,
    manufacturer: li.manufacturer,
    manufacturerId: undefined,
    imageUrl: li.imageUrl || undefined,
    tdsUrl: li.tdsUrl || undefined,
    unit: li.unit || 'ea',
    qty: li.qty || 0,
    unitPrice: li.unitPrice || 0,
    componentKey: undefined,
  }));
  return items;
}

export function buildSavedBidPayload(
  draft: CalculatorDraft,
  additionalData?: {
    bidName?: string;
    bidDescription?: string;
    manufacturerName?: string | null;
    systemComponents?: Record<string, any>;
    spreadRateOverrides?: Record<string, number>;
    resultQtyOverrides?: Record<string, number>;
    customMaterialPrices?: Record<string, number>;
    laborRates?: Record<string, number>;
    addOnQuantities?: Record<string, number>;
    uiState?: Record<string, any>;
    dimensions?: { length: number; width: number };
    selectedTier?: 'good' | 'better' | 'best';
    tierOverrides?: Record<string, any>;
    totalsByTier?: Record<string, any>;
    customPieces?: any;
    countertopPieces?: any[];
    countertopMode?: 'pieces' | 'totals';
    countertopDirectSurface?: number;
    countertopDirectEdge?: number;
    countertopDirectBacksplash?: number;
    addons?: any;
    sundriesEnabled?: boolean;
    suggestionCycle?: Record<string, number>;
    customChargeLabel?: string;
  }
) {
  const items = (draft.items || []).map((item) => {
    const productId = item.sku ? parseInt(item.sku, 10) : null;
    return {
      product_id: productId || null,
      item_type: 'product' as const,
      item_name: item.name || '',
      item_sku: item.sku || null,
      quantity: item.qty || 0,
      unit: item.unit || 'ea',
      unit_price: item.unitPrice || 0,
      total_price: (item.qty || 0) * (item.unitPrice || 0),
      product_name: item.name || null,
      product_category: null,
      product_manufacturer: (item as any).manufacturer || null,
      product_image_url: item.imageUrl || null,
      product_tds_url: item.tdsUrl || null,
      component_key: item.componentKey || null,
      is_system_material: !!item.componentKey,
      is_add_on: false,
      is_labor: false,
      notes: null,
    };
  });
  const pricingMethod = toBackendPricingMethod(draft.pricingMethod || 'margin');
  const materialCost = draft.totals?.materialCost || 0;
  const laborCost = draft.totals?.laborCost || 0;
  const totalCost = draft.totals?.totalCost || 0;
  const customerPrice = draft.totals?.customerPrice || draft.totals?.totalCost || 0;
  const pricePerSqft = draft.totals?.ppsf || (draft.coverageAreaSqFt > 0 ? customerPrice / draft.coverageAreaSqFt : 0);
  const defaultAddons = {
    stemWalls: { enabled: false, included: false, mode: 'flat', flatUnitCost: 0, extraLaborHours: 0 },
    controlJoints: { enabled: false, included: false, linearFeet: 0, unitCost: 0, extraLaborHours: 0 },
    perimeterJoints: { enabled: false, included: false, linearFeet: 0, unitCost: 0, extraLaborHours: 0 },
    sundries: { enabled: false, included: false, mode: 'percent', percent: 5, flatAmount: 0 },
    fuel: { enabled: false, included: false, mode: 'flat', flatAmount: 0, percent: 0 },
    custom: { enabled: false, included: false, label: '', flatAmount: 0 },
  };
  return {
    source: 'universal-calculator' as const,
    name: additionalData?.bidName || 'Untitled Bid',
    description: additionalData?.bidDescription || null,
    client_id: draft.client?.id || null,
    manufacturer_id: draft.manufacturerId ? parseInt(draft.manufacturerId, 10) : null,
    manufacturer_name: additionalData?.manufacturerName || null,
    system_group: draft.systemGroup || null,
    system_type: draft.systemType || null,
    coverage_area_sqft: draft.coverageAreaSqFt || null,
    dimensions: additionalData?.dimensions || null,
    surface_hardness: draft.surfaceHardness || null,
    pricing_method: pricingMethod,
    margin_pct: draft.marginPct ? draft.marginPct * 100 : null,
    labor_rate_per_hour: draft.laborRatePerHour || 0,
    labor_hours: draft.laborHours || 0,
    target_price_per_sqft: draft.targetPricePerSqFt || null,
    material_cost: materialCost,
    labor_cost: laborCost,
    total_cost: totalCost,
    customer_price: customerPrice,
    price_per_sqft: pricePerSqft,
    profit_amount: customerPrice - totalCost,
    selected_tier: additionalData?.selectedTier || null,
    tier_overrides: additionalData?.tierOverrides || draft.tierOverrides || null,
    totals_by_tier: additionalData?.totalsByTier || draft.totals?.byTier || null,
    addons: additionalData?.addons || defaultAddons,
    custom_pieces: additionalData?.customPieces || null,
    system_components: additionalData?.systemComponents || null,
    spread_rate_overrides: additionalData?.spreadRateOverrides || null,
    add_on_quantities: additionalData?.addOnQuantities || null,
    result_qty_overrides: additionalData?.resultQtyOverrides || null,
    custom_material_prices: additionalData?.customMaterialPrices || null,
    labor_rates: additionalData?.laborRates || null,
    custom_charge_label: additionalData?.customChargeLabel || null,
    sundries_enabled: additionalData?.sundriesEnabled || false,
    sundries_percent: additionalData?.addOnQuantities?.['sundries'] || null,
    ui_state: additionalData?.uiState || draft.uiState || null,
    draft_id: draft.draftId || null,
    company_id: draft.company?.id || 'company-1',
    items,
  };
}

export function buildQuickQuoteSavedBidPayload(
  snapshot: any,
  bidName: string,
  bidDescription: string | null,
  clientId: number,
  addOns: any,
  manufacturerName?: string | null
) {
  const items = (snapshot.lineItems || []).map((li: any) => ({
    product_id: li.id ? parseInt(li.id, 10) : null,
    item_type: 'product' as const,
    item_name: li.name || '',
    item_sku: li.sku || li.id || null,
    quantity: li.qty || 0,
    unit: li.unit || 'kit',
    unit_price: li.unitPrice || 0,
    total_price: li.total || (li.qty || 0) * (li.unitPrice || 0),
    product_name: li.name || null,
    product_category: null,
    product_manufacturer: li.manufacturer || null,
    product_image_url: li.imageUrl || null,
    product_tds_url: li.tdsUrl || null,
    component_key: li.componentKey || null,
    is_system_material: !!li.componentKey,
    is_add_on: false,
    is_labor: false,
    notes: null,
  }));
  const meta = snapshot.meta || {};
  const pricing = snapshot.pricing || {};
  const pricingMethod = toBackendPricingMethod(meta.pricingMethod || 'margin');
  const materialCost = pricing.materialCost?.amount || 0;
  const laborCost = pricing.laborCost?.amount || 0;
  const totalCost = pricing.totalCost?.amount || 0;
  const customerPrice = pricing.totalCost?.amount || 0;
  const pricePerSqft = pricing.ppsf?.amount || (pricing.coverageAreaSqFt > 0 ? customerPrice / pricing.coverageAreaSqFt : 0);
  const defaultAddons = {
    stemWalls: { enabled: false, included: false, mode: 'flat', flatUnitCost: 0, extraLaborHours: 0 },
    controlJoints: { enabled: false, included: false, linearFeet: 0, unitCost: 0, extraLaborHours: 0 },
    perimeterJoints: { enabled: false, included: false, linearFeet: 0, unitCost: 0, extraLaborHours: 0 },
    sundries: { enabled: false, included: false, mode: 'percent', percent: 5, flatAmount: 0 },
    fuel: { enabled: false, included: false, mode: 'flat', flatAmount: 0, percent: 0 },
    custom: { enabled: false, included: false, label: '', flatAmount: 0 },
  };
  return {
    source: 'quick-pricer' as const,
    name: bidName,
    description: bidDescription,
    client_id: clientId,
    manufacturer_id: meta.manufacturerId ? parseInt(meta.manufacturerId, 10) : null,
    manufacturer_name: manufacturerName || null,
    system_group: null,
    system_type: snapshot.systemType || null,
    coverage_area_sqft: pricing.coverageAreaSqFt || null,
    dimensions: null,
    surface_hardness: null,
    pricing_method: pricingMethod,
    margin_pct: meta.marginPct || null,
    labor_rate_per_hour: meta.laborRatePerHour || 0,
    labor_hours: pricing.laborHours || 0,
    target_price_per_sqft: meta.targetPricePerSqFt || null,
    material_cost: materialCost,
    labor_cost: laborCost,
    total_cost: totalCost,
    customer_price: customerPrice,
    price_per_sqft: pricePerSqft,
    profit_amount: customerPrice - totalCost,
    selected_tier: null,
    tier_overrides: null,
    totals_by_tier: null,
    addons: addOns || defaultAddons,
    custom_pieces: null,
    system_components: null,
    spread_rate_overrides: null,
    add_on_quantities: null,
    result_qty_overrides: null,
    custom_material_prices: null,
    labor_rates: null,
    custom_charge_label: null,
    sundries_enabled: false,
    sundries_percent: null,
    ui_state: null,
    draft_id: null,
    company_id: 'company-1',
    items,
  };
}

export function buildEstimatePayloadFromDraft(draft: CalculatorDraft, templateId: string) {
  return {
    templateId,
    clientId: draft.client?.id || null,
    companyId: draft.company?.id || 'company-1',
    meta: { manufacturerId: draft.manufacturerId, systemGroup: draft.systemGroup, systemType: draft.systemType, coverageAreaSqFt: draft.coverageAreaSqFt, surfaceHardness: draft.surfaceHardness },
    pricing: { method: draft.pricingMethod, marginPct: draft.marginPct, laborRate: draft.laborRatePerHour, laborHours: draft.laborHours, targetPpsf: draft.targetPricePerSqFt },
    items: draft.items,
    tiers: draft.totals?.byTier,
    sourceSavedBidId: undefined,
  };
}

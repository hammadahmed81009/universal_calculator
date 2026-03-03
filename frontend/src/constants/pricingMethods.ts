export type UIPricingMethod = 'MARGIN_BASED' | 'COST_PLUS_LABOR' | 'TARGET_PPSF';
export type BackendPricingMethod = 'margin_based' | 'material_cost_labor' | 'target_price_per_sqft';
export type DraftPricingMethod = 'margin' | 'cost_plus' | 'target_ppsf';
export const PricingMethodMap: Record<UIPricingMethod, BackendPricingMethod> = {
  'MARGIN_BASED': 'margin_based',
  'COST_PLUS_LABOR': 'material_cost_labor',
  'TARGET_PPSF': 'target_price_per_sqft',
};
export const ReversePricingMethodMap: Record<string, UIPricingMethod> = {
  'margin_based': 'MARGIN_BASED', 'material_cost_labor': 'COST_PLUS_LABOR', 'target_price_per_sqft': 'TARGET_PPSF',
  'margin': 'MARGIN_BASED', 'cost_plus': 'COST_PLUS_LABOR', 'target_ppsf': 'TARGET_PPSF',
  'MARGIN_BASED': 'MARGIN_BASED', 'COST_PLUS_LABOR': 'COST_PLUS_LABOR', 'TARGET_PPSF': 'TARGET_PPSF',
};
export const UIToDraftMap: Record<UIPricingMethod, DraftPricingMethod> = {
  'MARGIN_BASED': 'margin', 'COST_PLUS_LABOR': 'cost_plus', 'TARGET_PPSF': 'target_ppsf',
};
export function toBackendPricingMethod(uiMethod: UIPricingMethod | string): BackendPricingMethod {
  return (uiMethod in PricingMethodMap ? PricingMethodMap[uiMethod as UIPricingMethod] : 'margin_based');
}
export function toUIPricingMethod(backendMethod: string): UIPricingMethod {
  return ReversePricingMethodMap[backendMethod] || 'MARGIN_BASED';
}
export function toDraftPricingMethod(uiMethod: UIPricingMethod | string): DraftPricingMethod {
  return (uiMethod in UIToDraftMap ? UIToDraftMap[uiMethod as UIPricingMethod] : 'margin');
}

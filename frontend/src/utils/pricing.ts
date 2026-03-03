export type PricingMethod = 'MARGIN_BASED' | 'COST_PLUS_LABOR' | 'TARGET_PPSF';
export interface PricingInput { areaSqFt: number; materialCost: number; laborRatePerHour: number; laborHours: number; desiredMarginPct?: number; targetPricePerSqFt?: number; }
export interface PricingOutput { method: PricingMethod; materialCost: number; laborCost: number; totalCost: number; customerPrice: number; pricePerSqFt: number; achievedMarginPct: number; }
const toMoney = (v: number) => Math.round(v * 100) / 100;
export function calculatePricing(method: PricingMethod, input: PricingInput): PricingOutput {
  const laborCost = toMoney(input.laborRatePerHour * input.laborHours);
  const totalCost = toMoney(input.materialCost + laborCost);
  let customerPrice = 0;
  if (method === 'MARGIN_BASED') customerPrice = toMoney(totalCost / (1 - (input.desiredMarginPct ?? 0)));
  if (method === 'COST_PLUS_LABOR') customerPrice = totalCost;
  if (method === 'TARGET_PPSF') customerPrice = toMoney((input.targetPricePerSqFt ?? 0) * input.areaSqFt);
  const pricePerSqFt = input.areaSqFt > 0 ? toMoney(customerPrice / input.areaSqFt) : 0;
  const achievedMarginPct = customerPrice > 0 ? (customerPrice - totalCost) / customerPrice : 0;
  return { method, materialCost: toMoney(input.materialCost), laborCost, totalCost, customerPrice, pricePerSqFt, achievedMarginPct };
}
export const formatMoney = (n: number) => (Number(n) || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPpsf = (n: number) => `${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/sq ft`;

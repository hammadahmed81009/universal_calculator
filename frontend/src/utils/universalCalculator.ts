// Shared calculation helpers for the Universal Calculator.
// These are pure functions with no React or browser dependencies.

export type ManufacturerDiscountRule = {
  pct: number;
  active: boolean;
};

/**
 * Apply a manufacturer discount rule (if any) to a raw unit price.
 */
export function applyManufacturerDiscount(
  rawPrice: number,
  manufacturerName: string,
  discounts: Record<string, ManufacturerDiscountRule>,
): number {
  const key = String(manufacturerName || '').toLowerCase().trim();
  const rule = discounts[key];
  if (rule && rule.active && rule.pct > 0) {
    return Math.max(0, rawPrice * (1 - rule.pct / 100));
  }
  return rawPrice;
}

/**
 * Helper function to determine if a manufacturer uses 2 pigments per kit
 * (e.g. "US Resin Supply"). Returns a multiplier for base pigment count.
 */
export function getBasePigmentRatio(manufacturerName: string): number {
  return manufacturerName.toLowerCase().includes('us resin supply') ? 2 : 1;
}

/**
 * Allocate an integer `total` across `count` slots according to `weights`,
 * ensuring no slot is zero and the sum equals total.
 */
export function allocateByWeights(total: number, weights: number[], count: number): number[] {
  if (count <= 0) return [] as number[];
  const ws = weights.slice(0, count);
  const sumW = ws.reduce((a, b) => a + (b || 0), 0) || count;
  // Ensure at least 1 per slot
  const base = new Array(count).fill(1);
  let remaining = Math.max(0, Math.floor(total) - count);
  if (remaining === 0) return base;
  // Largest remainder method
  const provisional = ws.map((w) => (remaining * (w || 1)) / sumW);
  const floors = provisional.map((x) => Math.floor(x));
  let used = floors.reduce((a, b) => a + b, 0);
  const fracs = provisional.map((x, i) => ({ i, frac: x - Math.floor(x) }));
  // Apply floors
  for (let i = 0; i < count; i++) base[i] += floors[i];
  // Distribute leftovers by largest fractional parts
  let leftover = remaining - used;
  fracs.sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < count && leftover > 0; k++) {
    base[fracs[k].i] += 1;
    leftover--;
  }
  return base;
}


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
  for (let i = 0; i < count; i++) {
    const inc = floors[i] ?? 0;
    base[i] += inc;
  }
  // Distribute leftovers by largest fractional parts
  let leftover = remaining - used;
  fracs.sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < fracs.length && leftover > 0; k++) {
    base[fracs[k].i] += 1;
    leftover--;
  }
  return base;
}

// -------------------------------
// Shared calculator data helpers
// -------------------------------

import type { LineItem } from './pnl';
import {
  ADD_ON_ID_SUNDRIES,
  ADD_ON_ID_CUSTOM_CHARGE,
  ADD_ON_ID_CUSTOM_CHARGE_AMOUNT,
  ADD_ON_ID_STEM_WALLS_HOURS,
} from '../constants/addOnIds';

type PricedProduct = {
  id: number | string;
  name: string;
  price?: number;
  unit?: string | null;
} & Record<string, unknown>;

export function buildMaterialAddOnItems(args: {
  crackJointFillers: any[];
  nonSkidAdditives: any[];
  commonlyUsedMaterials: any[];
  micaFusionSprayColors: any[];
  countertopIncidentals: any[];
  countertopMaterialsResolved: any[];
  addOnQuantities: Record<string, number>;
  customMaterialPrices: Record<string, number>;
  products: PricedProduct[];
  getUnitPrice: (p: PricedProduct) => number;
}): LineItem[] {
  const {
    crackJointFillers,
    nonSkidAdditives,
    commonlyUsedMaterials,
    micaFusionSprayColors,
    countertopIncidentals,
    countertopMaterialsResolved,
    addOnQuantities,
    customMaterialPrices,
    products,
    getUnitPrice,
  } = args;

  const lists = [
    crackJointFillers,
    nonSkidAdditives,
    commonlyUsedMaterials,
    micaFusionSprayColors,
    countertopIncidentals,
    countertopMaterialsResolved,
  ];

  const items: LineItem[] = [];
  const includedIds = new Set<string>();

  lists.forEach((list) => {
    list.forEach((p: any) => {
      const id = String(p.id);
      const qty = addOnQuantities[id] || 0;
      if (qty > 0) {
        const unitPrice =
          "editable" in p && (p as any).editable
            ? customMaterialPrices[id] ?? p.price
            : p.price;
        const nameLC = String(p.name || "").toLowerCase();
        let unit: string | undefined;
        if (nameLC.includes("sheet")) unit = "sheets";
        else if (nameLC.includes("board")) unit = "boards";
        else if (nameLC.includes("box")) unit = "boxes";
        else if (nameLC.includes("piece")) unit = "pieces";
        items.push({
          id,
          name: p.name,
          qty,
          unit,
          unitPrice,
          total: unitPrice * qty,
        });
        includedIds.add(id);
      }
    });
  });

  // Include catalog-selected products that are not in the above lists
  products.forEach((prod) => {
    const id = String(prod.id);
    const qty = addOnQuantities[id] || 0;
    if (qty > 0 && !includedIds.has(id)) {
      const unitPrice = getUnitPrice(prod);
      items.push({
        id,
        name: prod.name,
        qty,
        unit: (prod.unit as string | undefined) || undefined,
        unitPrice,
        total: unitPrice * qty,
      });
    }
  });

  return items;
}

export function buildLaborAddOnItems(args: {
  effectiveLaborAddOns: { id: string; label: string; rate: number }[];
  addOnQuantities: Record<string, number>;
  customChargeLabel: string;
  laborRate: number;
  laborRates: Record<string, number>;
}): LineItem[] {
  const { effectiveLaborAddOns, addOnQuantities, customChargeLabel, laborRate, laborRates } = args;
  const items: LineItem[] = [];

  effectiveLaborAddOns.forEach((def) => {
    if (def.id === ADD_ON_ID_SUNDRIES) return;
    if (def.id === ADD_ON_ID_CUSTOM_CHARGE) {
      const amount = addOnQuantities[ADD_ON_ID_CUSTOM_CHARGE_AMOUNT] || 0;
      if (amount > 0) {
        items.push({
          id: def.id,
          name: customChargeLabel,
          qty: 1,
          unitPrice: amount,
          total: amount,
        });
      }
    } else {
      const qty = addOnQuantities[def.id] || 0;
      if (qty > 0) {
        const unitPrice = laborRates[def.id] ?? def.rate;
        items.push({
          id: def.id,
          name: def.label,
          qty,
          unitPrice,
          total: unitPrice * qty,
        });
      }
    }
  });

  const extraStemHours = addOnQuantities[ADD_ON_ID_STEM_WALLS_HOURS] || 0;
  if (extraStemHours > 0) {
    items.push({
      id: "stem-walls-hours",
      name: "Stem Walls - Extra Labor Hours",
      qty: extraStemHours,
      unitPrice: laborRate,
      total: extraStemHours * laborRate,
    });
  }

  return items;
}

export function buildDisplayLineItems(args: {
  systemMaterialItems: LineItem[];
  materialAddOnItems: LineItem[];
  addOnQuantities: Record<string, number>;
  sundriesEnabled: boolean;
  resultQtyOverrides: Record<string, number>;
}): LineItem[] {
  const { systemMaterialItems, materialAddOnItems, addOnQuantities, sundriesEnabled, resultQtyOverrides } = args;

  const items: LineItem[] = [];
  items.push(...systemMaterialItems);
  items.push(...materialAddOnItems);

  const sundriesPercent = addOnQuantities[ADD_ON_ID_SUNDRIES] ?? 5;
  const baseMaterialsSubtotal = [...systemMaterialItems, ...materialAddOnItems].reduce(
    (acc, it) => acc + it.total,
    0,
  );

  const manualDelta = (() => {
    const baseMap: Record<string, { qty: number; unitPrice: number }> = {};
    [...systemMaterialItems, ...materialAddOnItems].forEach((it) => {
      baseMap[it.id] = { qty: it.qty, unitPrice: it.unitPrice };
    });
    let delta = 0;
    Object.entries(resultQtyOverrides).forEach(([id, overrideQty]) => {
      const base = baseMap[id];
      if (!base || !Number.isFinite(overrideQty)) return;
      delta += (overrideQty - base.qty) * base.unitPrice;
    });
    return delta;
  })();

  const adjustedMaterialsSubtotal = baseMaterialsSubtotal + manualDelta;

  if (sundriesEnabled && sundriesPercent > 0 && adjustedMaterialsSubtotal > 0) {
    const sundriesAmount = (sundriesPercent / 100) * adjustedMaterialsSubtotal;
    items.push({
      id: ADD_ON_ID_SUNDRIES,
      name: `Sundries (${sundriesPercent}% of materials)`,
      qty: 1,
      unitPrice: sundriesAmount,
      total: sundriesAmount,
    });
  }

  return items;
}

export function computeSystemComponentsSummary(systemMaterialItems: LineItem[]) {
  const count = systemMaterialItems.length;
  const subtotal = systemMaterialItems.reduce((acc, it) => acc + it.total, 0);
  return { count, subtotal };
}


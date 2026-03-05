import { describe, it, expect } from 'vitest';
import {
  applyManufacturerDiscount,
  getBasePigmentRatio,
  allocateByWeights,
  buildMaterialAddOnItems,
  buildLaborAddOnItems,
  buildDisplayLineItems,
  computeSystemComponentsSummary,
} from '../universalCalculator';
import type { LineItem } from '../pnl';
import {
  ADD_ON_ID_SUNDRIES,
  ADD_ON_ID_CUSTOM_CHARGE,
  ADD_ON_ID_CUSTOM_CHARGE_AMOUNT,
  ADD_ON_ID_STEM_WALLS_HOURS,
} from '../../constants/addOnIds';

describe('applyManufacturerDiscount', () => {
  it('returns raw price when no rule is present', () => {
    const out = applyManufacturerDiscount(100, 'Acme', {});
    expect(out).toBe(100);
  });

  it('applies active percentage discount and never goes below zero', () => {
    const discounts = { acme: { pct: 10, active: true } };
    const out = applyManufacturerDiscount(200, 'Acme', discounts);
    expect(out).toBeCloseTo(180);

    const huge = applyManufacturerDiscount(100, 'Acme', { acme: { pct: 200, active: true } });
    expect(huge).toBe(0);
  });

  it('ignores inactive rules', () => {
    const discounts = { acme: { pct: 25, active: false } };
    const out = applyManufacturerDiscount(100, 'Acme', discounts);
    expect(out).toBe(100);
  });
});

describe('getBasePigmentRatio', () => {
  it('returns 2 for US Resin Supply manufacturers', () => {
    expect(getBasePigmentRatio('US Resin Supply')).toBe(2);
    expect(getBasePigmentRatio('  us resin supply  ')).toBe(2);
  });

  it('returns 1 for all other manufacturers', () => {
    expect(getBasePigmentRatio('Westcoat')).toBe(1);
    expect(getBasePigmentRatio('')).toBe(1);
  });
});

describe('allocateByWeights', () => {
  it('respects total and never returns zeros', () => {
    const result = allocateByWeights(10, [4, 2, 1], 3);
    expect(result.length).toBe(3);
    result.forEach((n) => expect(n).toBeGreaterThanOrEqual(1));
    expect(result.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('handles count greater than weights length', () => {
    const result = allocateByWeights(5, [1], 3);
    expect(result.length).toBe(3);
    expect(result.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('returns empty array for non-positive count', () => {
    expect(allocateByWeights(10, [1, 1], 0)).toEqual([]);
  });

  it('distributes all remaining units even with uneven weights', () => {
    const result = allocateByWeights(7, [10, 1, 1], 3);
    expect(result.length).toBe(3);
    expect(result.reduce((a, b) => a + b, 0)).toBe(7);
  });
});

describe('buildMaterialAddOnItems', () => {
  const baseLists = {
    crackJointFillers: [],
    nonSkidAdditives: [],
    commonlyUsedMaterials: [],
    micaFusionSprayColors: [],
    countertopIncidentals: [],
    countertopMaterialsResolved: [],
  };

  it('builds items from category lists with editable pricing overrides', () => {
    const editable = { id: 'e1', name: 'Editable Board', price: 10, editable: true };
    const normal = { id: 'n1', name: 'Normal Sheet', price: 5 };

    const items = buildMaterialAddOnItems({
      ...baseLists,
      commonlyUsedMaterials: [editable, normal],
      addOnQuantities: { e1: 2, n1: 3 },
      customMaterialPrices: { e1: 12 },
      products: [],
      getUnitPrice: () => 0,
    });

    expect(items).toHaveLength(2);
    const [i1, i2] = items;
    expect(i1.unit).toBe('boards');
    expect(i1.total).toBeCloseTo(2 * 12);
    expect(i2.unit).toBe('sheets');
    expect(i2.total).toBeCloseTo(3 * 5);
  });

  it('includes catalog products not present in category lists', () => {
    const items = buildMaterialAddOnItems({
      ...baseLists,
      addOnQuantities: { '100': 4 },
      customMaterialPrices: {},
      products: [{ id: 100, name: 'Catalog Box', unit: 'box' }],
      getUnitPrice: () => 7.5,
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: '100',
      name: 'Catalog Box',
      qty: 4,
      unitPrice: 7.5,
      total: 30,
    });
  });

  it('returns empty list when no quantities are set', () => {
    const items = buildMaterialAddOnItems({
      ...baseLists,
      addOnQuantities: {},
      customMaterialPrices: {},
      products: [],
      getUnitPrice: () => 0,
    });
    expect(items).toHaveLength(0);
  });
});

describe('buildLaborAddOnItems', () => {
  it('creates items for labor add-ons, respecting custom charge and extras', () => {
    const effectiveLaborAddOns = [
      { id: ADD_ON_ID_SUNDRIES, label: 'Sundries', rate: 0 },
      { id: ADD_ON_ID_CUSTOM_CHARGE, label: 'Custom', rate: 0 },
      { id: 'travel', label: 'Travel', rate: 50 },
    ];

    const items = buildLaborAddOnItems({
      effectiveLaborAddOns,
      addOnQuantities: {
        'custom-charge-amount': 200,
        travel: 3,
        'stem-walls-hours': 2,
      },
      customChargeLabel: 'Custom Surcharge',
      laborRate: 60,
      laborRates: { travel: 55 },
    });

    expect(items).toHaveLength(3);
    const custom = items.find((i) => i.id === 'custom-charge')!;
    const travel = items.find((i) => i.id === 'travel')!;
    const stem = items.find((i) => i.id === 'stem-walls-hours')!;

    expect(custom.total).toBe(200);
    expect(travel.total).toBe(3 * 55);
    expect(stem.total).toBe(2 * 60);
  });

  it('returns empty list when all quantities are zero', () => {
    const effectiveLaborAddOns = [
      { id: ADD_ON_ID_CUSTOM_CHARGE, label: 'Custom', rate: 0 },
      { id: 'travel', label: 'Travel', rate: 50 },
    ];

    const items = buildLaborAddOnItems({
      effectiveLaborAddOns,
      addOnQuantities: {
        [ADD_ON_ID_CUSTOM_CHARGE_AMOUNT]: 0,
        travel: 0,
        [ADD_ON_ID_STEM_WALLS_HOURS]: 0,
      },
      customChargeLabel: 'Custom Surcharge',
      laborRate: 60,
      laborRates: { travel: 55 },
    });

    expect(items).toHaveLength(0);
  });
});

describe('buildDisplayLineItems', () => {
  const baseSystem: LineItem[] = [{ id: 's1', name: 'Base', qty: 1, unitPrice: 100, total: 100 }];
  const baseAddOns: LineItem[] = [{ id: 'a1', name: 'Addon', qty: 1, unitPrice: 50, total: 50 }];

  it('returns combined items without sundries when disabled', () => {
    const items = buildDisplayLineItems({
      systemMaterialItems: baseSystem,
      materialAddOnItems: baseAddOns,
      addOnQuantities: {},
      sundriesEnabled: false,
      resultQtyOverrides: {},
    });
    expect(items).toHaveLength(2);
  });

  it('adds sundries row when enabled and base subtotal > 0', () => {
    const items = buildDisplayLineItems({
      systemMaterialItems: baseSystem,
      materialAddOnItems: baseAddOns,
      addOnQuantities: { sundries: 10 },
      sundriesEnabled: true,
      resultQtyOverrides: {},
    });
    const sundries = items.find((i) => i.id === 'sundries');
    expect(sundries).toBeDefined();
    expect(sundries!.total).toBeCloseTo(0.1 * (100 + 50));
  });

  it('respects result quantity overrides when computing sundries', () => {
    const items = buildDisplayLineItems({
      systemMaterialItems: baseSystem,
      materialAddOnItems: baseAddOns,
      addOnQuantities: { sundries: 10 },
      sundriesEnabled: true,
      resultQtyOverrides: { s1: 2 },
    });
    const sundries = items.find((i) => i.id === 'sundries')!;
    expect(sundries.total).toBeGreaterThan(0.1 * (100 + 50));
  });
});

describe('computeSystemComponentsSummary', () => {
  it('returns count and subtotal of system material items', () => {
    const items: LineItem[] = [
      { id: '1', name: 'A', qty: 1, unitPrice: 10, total: 10 },
      { id: '2', name: 'B', qty: 2, unitPrice: 5, total: 10 },
    ];
    const summary = computeSystemComponentsSummary(items);
    expect(summary.count).toBe(2);
    expect(summary.subtotal).toBe(20);
  });
});


import { describe, it, expect } from 'vitest';
import { calculatePricing, formatMoney, formatPpsf, type PricingMethod } from '../pricing';

const makeInput = (overrides: Partial<Parameters<typeof calculatePricing>[1]> = {}) => ({
  areaSqFt: 100,
  materialCost: 500,
  laborRatePerHour: 50,
  laborHours: 10,
  desiredMarginPct: 0.5,
  targetPricePerSqFt: 12.5,
  ...overrides,
});

describe('calculatePricing', () => {
  const methods: PricingMethod[] = ['MARGIN_BASED', 'COST_PLUS_LABOR', 'TARGET_PPSF'];

  it('computes labor and total costs consistently for all methods', () => {
    const input = makeInput();
    methods.forEach((method) => {
      const out = calculatePricing(method, input);
      expect(out.laborCost).toBe(50 * 10);
      expect(out.materialCost).toBe(500);
      expect(out.totalCost).toBe(500 + 500);
    });
  });

  it('MARGIN_BASED honors desired margin percentage', () => {
    const input = makeInput({ desiredMarginPct: 0.5 });
    const out = calculatePricing('MARGIN_BASED', input);
    expect(out.customerPrice).toBeCloseTo(out.totalCost / (1 - 0.5), 2);
    expect(out.achievedMarginPct).toBeCloseTo(0.5, 4);
  });

  it('COST_PLUS_LABOR uses raw total cost as customer price', () => {
    const input = makeInput({ desiredMarginPct: 0.5 });
    const out = calculatePricing('COST_PLUS_LABOR', input);
    expect(out.customerPrice).toBe(out.totalCost);
    expect(out.achievedMarginPct).toBe(0);
  });

  it('TARGET_PPSF uses target price per square foot and area', () => {
    const input = makeInput({ areaSqFt: 80, targetPricePerSqFt: 15 });
    const out = calculatePricing('TARGET_PPSF', input);
    expect(out.customerPrice).toBeCloseTo(80 * 15, 2);
    expect(out.pricePerSqFt).toBeCloseTo(15, 2);
  });

  it('handles zero area without NaNs', () => {
    const input = makeInput({ areaSqFt: 0, targetPricePerSqFt: 20 });
    const out = calculatePricing('TARGET_PPSF', input);
    expect(out.pricePerSqFt).toBe(0);
    expect(out.customerPrice).toBe(0);
    expect(out.achievedMarginPct).toBe(0);
  });

  it('treats negative desired margin safely', () => {
    const input = makeInput({ desiredMarginPct: -0.2 });
    const out = calculatePricing('MARGIN_BASED', input);
    // Negative margin should not explode; just ensure numbers are finite
    expect(Number.isFinite(out.customerPrice)).toBe(true);
    expect(Number.isFinite(out.achievedMarginPct)).toBe(true);
  });

  it('handles zero material and labor cost', () => {
    const input = makeInput({
      materialCost: 0,
      laborRatePerHour: 0,
      laborHours: 0,
      desiredMarginPct: 0.5,
    });
    const out = calculatePricing('MARGIN_BASED', input);
    expect(out.totalCost).toBe(0);
    expect(out.customerPrice).toBe(0);
    expect(out.achievedMarginPct).toBe(0);
  });
});

describe('formatMoney', () => {
  it('formats positive amounts as USD currency', () => {
    const result = formatMoney(1234.567);
    // Locale-aware check: should contain a rounded cents part ".57"
    expect(result).toMatch(/1,234(.|,)57/);
  });

  it('treats NaN and undefined as zero', () => {
    expect(formatMoney(NaN)).toContain('0.00');
    expect((formatMoney as any)(undefined)).toContain('0.00');
  });
});

describe('formatPpsf', () => {
  it('formats price per square foot with /sq ft suffix', () => {
    const result = formatPpsf(12.345);
    expect(result).toMatch(/12\.35.*sq ft$/);
  });

  it('handles falsy input as zero', () => {
    expect(formatPpsf(0)).toBe('0.00/sq ft');
    expect((formatPpsf as any)(undefined)).toBe('0.00/sq ft');
  });
});


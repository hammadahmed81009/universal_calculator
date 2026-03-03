export const COUNTERTOP_CONSTANTS = { METALLIC_COAT_RATE: 4, CLEAR_COAT_RATE: 3, EDGE_HEIGHT_INCHES: 1.5, BACKSPLASH_HEIGHT_INCHES: 4, OUNCES_PER_GALLON: 128, COUNTERTOP_CATEGORIES: ['Metallic Art Coat', 'Metallic Money Coat', 'Clear Coat', 'Flood Coat', 'Metallic Top Coat'] } as const;
export interface CountertopAreaBreakdown { surfaceArea: number; edgeArea: number; backsplashArea: number; totalMaterialArea: number; }
export interface CountertopMaterialResult { quantity: number; ouncesPerSqFt: number; totalOunces: number; actualCoverage: number; unit: string; displayRate: string; }
export function calculateCountertopArea(surfaceArea: number, edgeLf: number, backsplashLf: number): CountertopAreaBreakdown {
  const edgeArea = (edgeLf * 1.5) / 12;
  const backsplashArea = (backsplashLf * 4) / 12;
  return { surfaceArea, edgeArea, backsplashArea, totalMaterialArea: surfaceArea + edgeArea + backsplashArea };
}
export function calculateCountertopMaterial(category: string, areaBreakdown: CountertopAreaBreakdown): CountertopMaterialResult | null {
  if (!COUNTERTOP_CONSTANTS.COUNTERTOP_CATEGORIES.some(c => category.toLowerCase().includes(c.toLowerCase()))) return null;
  const ouncesPerSqFt = category.toLowerCase().includes('metallic') ? 4 : 3;
  const applicableArea = category.toLowerCase().includes('clear') || category.toLowerCase().includes('flood') ? areaBreakdown.surfaceArea : areaBreakdown.totalMaterialArea;
  const totalOunces = applicableArea * ouncesPerSqFt;
  const wholeGallons = Math.ceil(totalOunces / 128);
  return { quantity: wholeGallons, ouncesPerSqFt, totalOunces, actualCoverage: (wholeGallons * 128) / ouncesPerSqFt, unit: 'gallons', displayRate: `${ouncesPerSqFt} oz/sq ft` };
}
export function isCountertopCategory(category: string): boolean {
  return COUNTERTOP_CONSTANTS.COUNTERTOP_CATEGORIES.some(c => category.toLowerCase().includes(c.toLowerCase()));
}

/**
 * Static dummy data for the Universal Calculator (no backend).
 * All data is in-memory; save/update bid APIs are no-ops.
 */

export interface DummyManufacturer {
  id: number;
  name: string;
  logo_url?: string;
}

export interface DummyProduct {
  id: number;
  name: string;
  description?: string;
  unit_price: string;
  final_price?: string;
  category: string;
  manufacturer?: string;
  manufacturer_name?: string;
  manufacturer_id?: number;
  image_url?: string;
  kit_size?: string;
  spread_rate?: string;
  unit?: string;
  sku?: string;
  technical_data_sheet_url?: string;
}

export const dummyManufacturers: DummyManufacturer[] = [
  { id: 1, name: 'Westcoat' },
  { id: 2, name: 'Stonecoat' },
  { id: 3, name: 'Rust-Oleum' },
  { id: 4, name: 'Legacy Industrial' },
  { id: 5, name: 'Epoxy.com' },
];

const categories = [
  'Epoxy', 'Polyurea', 'Polyaspartic', 'Primers', 'Primer',
  'Flake Colors', 'Flake Color',
  'Polyaspartic Top Coats', 'Metallic Top Coats', 'Top Coat', 'Topcoat',
  'Base Pigments', 'Pigments', 'Pigment',
  'Metallic Money Coat', 'Metallic Pigments', 'Metallic',
  'Cleaners', 'Neutralizers',
  'Crack & Joint Filler', 'Sealers', 'Guards', 'Sealer', 'Guard',
  'Densifiers', 'Densifier',
  'Metallic Art Coats', 'Flood Coats',
  'Incidentals', 'Countertop Incidentals',
];

function buildDummyProducts(): DummyProduct[] {
  const products: DummyProduct[] = [];
  let id = 1;
  dummyManufacturers.forEach((mfg) => {
    categories.forEach((cat, i) => {
      products.push({
        id: id++,
        name: `${mfg.name} ${cat} Product ${i + 1}`,
        description: `Dummy ${cat} for ${mfg.name}`,
        unit_price: (25 + Math.floor(Math.random() * 150)).toFixed(2),
        final_price: (25 + Math.floor(Math.random() * 150)).toFixed(2),
        category: cat,
        manufacturer: mfg.name,
        manufacturer_name: mfg.name,
        manufacturer_id: mfg.id,
        unit: 'gal',
        sku: `DMY-${mfg.id}-${id}`,
      });
    });
  });
  return products;
}

export const dummyProducts: DummyProduct[] = buildDummyProducts();

export function getDummyProductsByManufacturerAndCategories(
  manufacturerId: number,
  categoryList: string[]
): DummyProduct[] {
  return dummyProducts.filter(
    (p) =>
      p.manufacturer_id === manufacturerId &&
      categoryList.some((c) =>
        p.category.toLowerCase().includes(c.toLowerCase().split('/')[0])
      )
  );
}

export function getDummySavedBid(_id: string): null {
  return null;
}

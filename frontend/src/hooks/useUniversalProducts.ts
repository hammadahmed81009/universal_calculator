import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

type ManufacturerLike = {
  id: number;
  name: string;
};

export type UniversalProduct = {
  id: number;
  name: string;
  description?: string;
  unit_price: string;
  category: string;
  manufacturer: string;
  manufacturer_id?: number;
  image_url?: string;
  kit_size?: string;
  spread_rate?: string;
  manufacturer_website_url?: string;
  system_categories?: string[] | null;
  product_type?: string;
  application_type?: string | null;
  unit?: string | null;
  sku?: string | null;
  technical_data_sheet_url?: string;
  colour_variant?: string | null;
  brand_name?: string | null;
  variants?: string | null;
  has_variants?: boolean;
  // Allow additional backend fields without breaking type-checking
  [key: string]: any;
};

export function useUniversalProducts(
  selectedManufacturerIdNum: number | undefined,
  apiManufacturers: ManufacturerLike[],
) {
  const categoryGroups = useMemo(
    () => [
      ['Epoxy', 'Polyurea', 'Polyaspartic', 'Primers', 'Primer'],
      ['Flake Colors', 'Flake Color'],
      [
        'Polyaspartic Top Coats',
        'Metallic Top Coats',
        'Polyaspartic Topcoats',
        'Polyaspartic Top Coat',
        'Metallic Top Coat',
        'Top Coat',
        'Topcoat',
      ],
      ['Base Pigments', 'Pigments', 'Pigment'],
      ['MVB'],
      ['Metallic Money Coat'],
      ['Metallic Pigments', 'Metallic Pigment', 'Metallic Colors', 'Metallic', 'Colors'],
      ['Cleaners/Neutralizers', 'Cleaners', 'Neutralizers'],
      ['Crack & Joint Filler', 'Crack & Joint Fillers'],
      ['Sealers & Guards', 'Guards/Finishes', 'Sealers', 'Guards', 'Sealer', 'Guard'],
      ['Diamond-impregnated Burnishing Pads', 'Burnishing Pads', 'Burnishing'],
      ['Slurry/Grout', 'Grout', 'Slurry'],
      ['Densifiers', 'Densifier'],
      ['Concrete Dyes', 'Dyes', 'Dye'],
      ['Guards/Finishes (Premium)', 'Premium Guards', 'Premium Micro-Guard', 'Premium Microguard'],
      ['Metallic Art Coats'],
      ['Flood Coats'],
      ['Non-Skid Additives', 'Non-Skid Additive', 'Nonskid Additives'],
      ['Commonly Used Materials', 'Common Materials'],
      ['Incidentals', 'Countertop Incidentals', 'Countertops Incidentals', 'Incidentals (Countertops)'],
      ['RCM Fuzion Max Spray', 'RCM Fuzion Max', 'Mica Fusion Spray Colors', 'Fuzion Max Spray'],
    ],
    [],
  );

  const categoryQueries = useQueries({
    queries: categoryGroups.map((categories) => ({
      queryKey: ['products', 'category-group', categories, selectedManufacturerIdNum],
      queryFn: async () => {
        const response = await apiGet<any>('/api/user-products/my-products', {
          params: {
            product_categories: categories.join(','),
            manufacturer_id: selectedManufacturerIdNum,
            cart: false,
            limit: 500,
          },
        });

        let productsArray: any[] = [];
        if (Array.isArray(response)) {
          productsArray = response;
        } else if (response?.products && Array.isArray(response.products)) {
          productsArray = response.products;
        } else if (response?.data?.products && Array.isArray(response.data.products)) {
          productsArray = response.data.products;
        } else if (response?.data && Array.isArray(response.data)) {
          productsArray = response.data;
        }

        const manufacturerName =
          selectedManufacturerIdNum != null
            ? apiManufacturers.find((m) => m.id === selectedManufacturerIdNum)?.name || ''
            : '';

        return productsArray.map((p: any): UniversalProduct => ({
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          manufacturer: p.manufacturer || p.manufacturer_name || manufacturerName || '',
          manufacturer_id: p.manufacturer_id,
          image_url: p.image_url,
          kit_size: p.kit_size,
          spread_rate: p.spread_rate,
          manufacturer_website_url: p.manufacturer_website_url,
          system_categories: p.system_categories,
          product_type: p.product_type,
          application_type: p.application_type,
          unit: p.unit,
          sku: p.sku,
          technical_data_sheet_url: p.technical_data_sheet_url,
          colour_variant: p.colour_variant,
          brand_name: p.brand_name,
          variants: p.variants,
          has_variants: p.has_variants,
          unit_price: String(p.final_price ?? p.unit_price ?? '0'),
        }));
      },
      enabled: !!selectedManufacturerIdNum,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const productsLoading = categoryQueries.some((q) => q.isLoading);
  const productsError = categoryQueries.some((q) => q.error);

  const products: UniversalProduct[] = useMemo(() => {
    const allProducts: UniversalProduct[] = [];
    const seenIds = new Set<number>();

    categoryQueries.forEach((query) => {
      if (query.data && Array.isArray(query.data)) {
        query.data.forEach((p: UniversalProduct) => {
          if (!seenIds.has(p.id)) {
            seenIds.add(p.id);
            allProducts.push(p);
          }
        });
      }
    });

    if (import.meta.env.DEV) {
      console.log('[Products] Consolidated', allProducts.length, 'products from category queries');
    }

    return allProducts;
  }, [categoryQueries]);

  return {
    products,
    productsLoading,
    productsError,
  };
}


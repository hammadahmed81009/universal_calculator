import { useEffect } from 'react';
import { notifications } from '@mantine/notifications';

import { apiGet } from '../lib/api';
import { toUIPricingMethod } from '../constants/pricingMethods';
import { calculatorDraftActions } from '../store/calculatorDraft';

type SavedBidLoaderArgs = {
  productsLength: number;
  productsLoading: boolean;
  availableManufacturers: Array<{ id: string; name: string }>;
  apiManufacturers: Array<{ id: number; name: string }>;

  selectedManufacturer: string;
  setSelectedManufacturer: (slug: string) => void;
  setSelectedSystemGroup: (v: string) => void;
  setSelectedSystem: (v: string) => void;

  setTotalSqft: (v: number) => void;
  setDimensions: (v: { length: number; width: number }) => void;
  setSelectedSurfaceHardness: (v: string) => void;

  setPricingMethod: (v: any) => void;
  setProfitMargin: (v: number) => void;
  setLaborRate: (v: number) => void;
  setTotalLaborHours: (v: number) => void;
  setTargetPpsf: (v: number) => void;
  setSelectedTier: (v: 'good' | 'better' | 'best') => void;
  setResultQtyOverrides: (v: Record<string, number>) => void;
  setHasCalculated: (v: boolean) => void;

  setBidName: (v: string) => void;
  setBidDescription: (v: string) => void;
  setSelectedClientId: (v: number | null) => void;
  setSelectedClientName: (v: string) => void;

  setSelectedBasePigment: (v: string) => void;
  setSelectedBaseCoat: (v: string) => void;
  setSelectedFlakeColor: (v: string) => void;
  setSelectedTopCoat: (v: string) => void;
  setSelectedMVBBasePigment: (v: string) => void;
  setSelectedMVBBaseCoat: (v: string) => void;
  setSelectedMVBFlakeColor: (v: string) => void;
  setSelectedMVBTopCoat: (v: string) => void;
  setSelectedSolidBasePigment: (v: string) => void;
  setSelectedSolidGroutCoat: (v: string) => void;
  setSelectedSolidBaseCoat: (v: string) => void;
  setSelectedSolidExtraBaseCoat: (v: string) => void;
  setSelectedSolidTopCoat: (v: string) => void;
  setSelectedMetallicBasePigment: (v: string) => void;
  setSelectedMetallicGroutCoat: (v: string) => void;
  setSelectedMetallicBaseCoat: (v: string) => void;
  setSelectedMetallicMoneyCoat: (v: string) => void;
  setSelectedMetallicPigments: (v: Array<{ id: string; name: string; quantity: number }>) => void;
  setSelectedMetallicTopCoat: (v: string) => void;
  setSelectedGrindSealPrimer: (v: string) => void;
  setSelectedGrindSealGroutCoat: (v: string) => void;
  setSelectedGrindSealBaseCoat: (v: string) => void;
  setSelectedGrindSealIntermediateCoat: (v: string) => void;
  setSelectedGrindSealTopCoat: (v: string) => void;
  setSelectedGrindSealAdditionalTopCoat: (v: string) => void;
  setSelectedCountertopPrimer: (v: string) => void;
  setSelectedCountertopBasePigment: (v: string) => void;
  setSelectedCountertopMetallicArtCoat: (v: string) => void;
  setSelectedCountertopMetallicPigments: (v: Array<{ id: string; name: string; quantity: number }>) => void;
  setSelectedCountertopFloodCoat: (v: string) => void;
  setSelectedCountertopTopCoat: (v: string) => void;

  setNoMVBBasePigmentSpreadRate: (v: number) => void;
  setNoMVBBaseCoatSpreadRate: (v: number) => void;
  setNoMVBFlakeColorSpreadRate: (v: number) => void;
  setNoMVBTopCoatSpreadRate: (v: number) => void;
  setMVBBasePigmentSpreadRate: (v: number) => void;
  setMVBBaseCoatSpreadRate: (v: number) => void;
  setMVBFlakeColorSpreadRate: (v: number) => void;
  setMVBTopCoatSpreadRate: (v: number) => void;
  setSolidBasePigmentSpreadRate: (v: number) => void;
  setSolidGroutCoatSpreadRate: (v: number) => void;
  setSolidBaseCoatSpreadRate: (v: number) => void;
  setSolidExtraBaseCoatSpreadRate: (v: number) => void;
  setSolidTopCoatSpreadRate: (v: number) => void;
  setMetallicBasePigmentSpreadRate: (v: number) => void;
  setMetallicGroutCoatSpreadRate: (v: number) => void;
  setMetallicBaseCoatSpreadRate: (v: number) => void;
  setMetallicMoneyCoatSpreadRate: (v: number) => void;
  setMetallicTopCoatSpreadRate: (v: number) => void;
  setGrindSealGroutSpreadRate: (v: number) => void;
  setGrindSealBaseSpreadRate: (v: number) => void;
  setGrindSealIntermediateCoatSpreadRate: (v: number) => void;
  setCountertopBaseCoatSpreadRate: (v: number) => void;
  setCountertopMetallicArtCoatSpreadRate: (v: number) => void;
  setCountertopClearCoatSpreadRate: (v: number) => void;
  setCountertopMetallicPigmentSpreadRate: (v: number) => void;

  setAddOnQuantities: (v: Record<string, number>) => void;
  setCustomMaterialPrices: (v: Record<string, number>) => void;
  setLaborRates: (v: Record<string, number>) => void;
  setSundriesEnabled: (v: boolean) => void;
  setCustomChargeLabel: (v: string) => void;

  setCountertopPieces: (v: any[]) => void;
  setCountertopMode: (v: 'pieces' | 'totals') => void;
  setCountertopDirectSurface: (v: number) => void;
  setCountertopDirectEdge: (v: number) => void;
  setCountertopDirectBacksplash: (v: number) => void;

  setSuggestionCycle: (v: Record<string, number>) => void;

  setIsLoadingSavedBid: (v: boolean) => void;
  setEditingBidId: (v: string | null) => void;
  setAutoTriggerCalc: (v: boolean) => void;
};

export function useSavedBidLoader(args: SavedBidLoaderArgs) {
  const {
    productsLength,
    productsLoading,
    availableManufacturers,
    apiManufacturers,
    selectedManufacturer,
    setSelectedManufacturer,
    setSelectedSystemGroup,
    setSelectedSystem,
    setTotalSqft,
    setDimensions,
    setSelectedSurfaceHardness,
    setPricingMethod,
    setProfitMargin,
    setLaborRate,
    setTotalLaborHours,
    setTargetPpsf,
    setSelectedTier,
    setResultQtyOverrides,
    setHasCalculated,
    setBidName,
    setBidDescription,
    setSelectedClientId,
    setSelectedClientName,
    setSelectedBasePigment,
    setSelectedBaseCoat,
    setSelectedFlakeColor,
    setSelectedTopCoat,
    setSelectedMVBBasePigment,
    setSelectedMVBBaseCoat,
    setSelectedMVBFlakeColor,
    setSelectedMVBTopCoat,
    setSelectedSolidBasePigment,
    setSelectedSolidGroutCoat,
    setSelectedSolidBaseCoat,
    setSelectedSolidExtraBaseCoat,
    setSelectedSolidTopCoat,
    setSelectedMetallicBasePigment,
    setSelectedMetallicGroutCoat,
    setSelectedMetallicBaseCoat,
    setSelectedMetallicMoneyCoat,
    setSelectedMetallicPigments,
    setSelectedMetallicTopCoat,
    setSelectedGrindSealPrimer,
    setSelectedGrindSealGroutCoat,
    setSelectedGrindSealBaseCoat,
    setSelectedGrindSealIntermediateCoat,
    setSelectedGrindSealTopCoat,
    setSelectedGrindSealAdditionalTopCoat,
    setSelectedCountertopPrimer,
    setSelectedCountertopBasePigment,
    setSelectedCountertopMetallicArtCoat,
    setSelectedCountertopMetallicPigments,
    setSelectedCountertopFloodCoat,
    setSelectedCountertopTopCoat,
    setNoMVBBasePigmentSpreadRate,
    setNoMVBBaseCoatSpreadRate,
    setNoMVBFlakeColorSpreadRate,
    setNoMVBTopCoatSpreadRate,
    setMVBBasePigmentSpreadRate,
    setMVBBaseCoatSpreadRate,
    setMVBFlakeColorSpreadRate,
    setMVBTopCoatSpreadRate,
    setSolidBasePigmentSpreadRate,
    setSolidGroutCoatSpreadRate,
    setSolidBaseCoatSpreadRate,
    setSolidExtraBaseCoatSpreadRate,
    setSolidTopCoatSpreadRate,
    setMetallicBasePigmentSpreadRate,
    setMetallicGroutCoatSpreadRate,
    setMetallicBaseCoatSpreadRate,
    setMetallicMoneyCoatSpreadRate,
    setMetallicTopCoatSpreadRate,
    setGrindSealGroutSpreadRate,
    setGrindSealBaseSpreadRate,
    setGrindSealIntermediateCoatSpreadRate,
    setCountertopBaseCoatSpreadRate,
    setCountertopMetallicArtCoatSpreadRate,
    setCountertopClearCoatSpreadRate,
    setCountertopMetallicPigmentSpreadRate,
    setAddOnQuantities,
    setCustomMaterialPrices,
    setLaborRates,
    setSundriesEnabled,
    setCustomChargeLabel,
    setCountertopPieces,
    setCountertopMode,
    setCountertopDirectSurface,
    setCountertopDirectEdge,
    setCountertopDirectBacksplash,
    setSuggestionCycle,
    setIsLoadingSavedBid,
    setEditingBidId,
    setAutoTriggerCalc,
  } = args;

  useEffect(() => {
    let cancelled = false;

    async function loadSavedBid() {
      try {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('editBid');
        if (!editId) {
          return;
        }

        setIsLoadingSavedBid(true);
        setEditingBidId(editId);

        let retries = 0;
        if (selectedManufacturer) {
          while (productsLoading && retries < 20) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            retries++;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 500));

        const savedBid = await apiGet<any>(`/api/saved-bids/${editId}`);
        if (cancelled || !savedBid) return;

        if (savedBid.name) setBidName(savedBid.name);
        if (savedBid.description) setBidDescription(savedBid.description);
        if (savedBid.client_id) setSelectedClientId(savedBid.client_id);
        if (savedBid.client) {
          const clientName = `${savedBid.client.first_name || ''} ${savedBid.client.last_name || ''}`.trim();
          if (clientName) setSelectedClientName(clientName);
        }

        if (savedBid.manufacturer_id || savedBid.manufacturer_name) {
          let manufacturerSlug = '';
          if (savedBid.manufacturer_name) {
            const found = availableManufacturers.find(
              (m) => m.name.toLowerCase() === savedBid.manufacturer_name.toLowerCase(),
            );
            if (found) {
              manufacturerSlug = found.id;
            }
          }
          if (!manufacturerSlug && savedBid.manufacturer_id) {
            const foundMfg = apiManufacturers.find((m) => m.id === savedBid.manufacturer_id);
            if (foundMfg) {
              const found = availableManufacturers.find(
                (m) => m.name.toLowerCase() === foundMfg.name.toLowerCase(),
              );
              if (found) {
                manufacturerSlug = found.id;
              }
            }
          }
          if (manufacturerSlug) {
            if (import.meta.env.DEV) {
              console.log('[UniversalCalculator] Setting manufacturer:', manufacturerSlug);
            }
            setSelectedManufacturer(manufacturerSlug);
          } else {
            console.warn(
              '[UniversalCalculator] Could not map manufacturer:',
              savedBid.manufacturer_id,
              savedBid.manufacturer_name,
            );
          }
        }
        if (savedBid.system_group) {
          setSelectedSystemGroup(savedBid.system_group);
        }
        if (savedBid.system_type) {
          setSelectedSystem(savedBid.system_type);
        }

        if (savedBid.coverage_area_sqft) {
          setTotalSqft(savedBid.coverage_area_sqft);
        }
        if (savedBid.dimensions) {
          setDimensions(savedBid.dimensions);
        }
        if (savedBid.surface_hardness) {
          setSelectedSurfaceHardness(savedBid.surface_hardness);
        }

        if (savedBid.pricing_method) {
          setPricingMethod(toUIPricingMethod(savedBid.pricing_method));
        }
        if (savedBid.margin_pct !== null && savedBid.margin_pct !== undefined) {
          setProfitMargin(savedBid.margin_pct);
        }
        if (savedBid.labor_rate_per_hour) {
          setLaborRate(Number(savedBid.labor_rate_per_hour));
        }
        if (savedBid.labor_hours) {
          setTotalLaborHours(Number(savedBid.labor_hours));
        }
        if (savedBid.target_price_per_sqft) {
          setTargetPpsf(Number(savedBid.target_price_per_sqft));
        }

        if (savedBid.selected_tier) {
          setSelectedTier(savedBid.selected_tier as 'good' | 'better' | 'best');
        }
        if (savedBid.result_qty_overrides) {
          setResultQtyOverrides(savedBid.result_qty_overrides);
        }

        if (savedBid.system_components) {
          if (import.meta.env.DEV) {
            console.log('[UniversalCalculator] Restoring system components:', savedBid.system_components);
          }
          setTimeout(() => {
            if (cancelled) return;
            const comps = savedBid.system_components;
            if (comps && typeof comps === 'object') {
              if (import.meta.env.DEV) {
                console.log('[UniversalCalculator] Setting system component values...');
              }
              if (comps.basePigment) setSelectedBasePigment(String(comps.basePigment || ''));
              if (comps.baseCoat) setSelectedBaseCoat(String(comps.baseCoat || ''));
              if (comps.flakeColor) setSelectedFlakeColor(String(comps.flakeColor || ''));
              if (comps.topCoat) setSelectedTopCoat(String(comps.topCoat || ''));
              if (comps.mvbBasePigment) setSelectedMVBBasePigment(String(comps.mvbBasePigment || ''));
              if (comps.mvbBaseCoat) setSelectedMVBBaseCoat(String(comps.mvbBaseCoat || ''));
              if (comps.mvbFlakeColor) setSelectedMVBFlakeColor(String(comps.mvbFlakeColor || ''));
              if (comps.mvbTopCoat) setSelectedMVBTopCoat(String(comps.mvbTopCoat || ''));
              if (comps.solidBasePigment) setSelectedSolidBasePigment(String(comps.solidBasePigment || ''));
              if (comps.solidGroutCoat) setSelectedSolidGroutCoat(String(comps.solidGroutCoat || ''));
              if (comps.solidBaseCoat) setSelectedSolidBaseCoat(String(comps.solidBaseCoat || ''));
              if (comps.solidExtraBaseCoat) setSelectedSolidExtraBaseCoat(String(comps.solidExtraBaseCoat || ''));
              if (comps.solidTopCoat) setSelectedSolidTopCoat(String(comps.solidTopCoat || ''));
              if (comps.metallicBasePigment)
                setSelectedMetallicBasePigment(String(comps.metallicBasePigment || ''));
              if (comps.metallicGroutCoat)
                setSelectedMetallicGroutCoat(String(comps.metallicGroutCoat || ''));
              if (comps.metallicBaseCoat) setSelectedMetallicBaseCoat(String(comps.metallicBaseCoat || ''));
              if (comps.metallicMoneyCoat)
                setSelectedMetallicMoneyCoat(String(comps.metallicMoneyCoat || ''));
              if (comps.metallicPigments && Array.isArray(comps.metallicPigments)) {
                setSelectedMetallicPigments(comps.metallicPigments);
              }
              if (comps.metallicTopCoat) setSelectedMetallicTopCoat(String(comps.metallicTopCoat || ''));
              if (comps.grindSealPrimer) setSelectedGrindSealPrimer(String(comps.grindSealPrimer || ''));
              if (comps.grindSealGroutCoat)
                setSelectedGrindSealGroutCoat(String(comps.grindSealGroutCoat || ''));
              if (comps.grindSealBaseCoat) setSelectedGrindSealBaseCoat(String(comps.grindSealBaseCoat || ''));
              if (comps.grindSealIntermediateCoat)
                setSelectedGrindSealIntermediateCoat(String(comps.grindSealIntermediateCoat || ''));
              if (comps.grindSealTopCoat) setSelectedGrindSealTopCoat(String(comps.grindSealTopCoat || ''));
              if (comps.grindSealAdditionalTopCoat)
                setSelectedGrindSealAdditionalTopCoat(String(comps.grindSealAdditionalTopCoat || ''));
              if (comps.countertopPrimer) setSelectedCountertopPrimer(String(comps.countertopPrimer || ''));
              if (comps.countertopBasePigment)
                setSelectedCountertopBasePigment(String(comps.countertopBasePigment || ''));
              if (comps.countertopMetallicArtCoat)
                setSelectedCountertopMetallicArtCoat(String(comps.countertopMetallicArtCoat || ''));
              if (comps.countertopMetallicPigments && Array.isArray(comps.countertopMetallicPigments)) {
                setSelectedCountertopMetallicPigments(comps.countertopMetallicPigments);
              }
              if (comps.countertopFloodCoat)
                setSelectedCountertopFloodCoat(String(comps.countertopFloodCoat || ''));
              if (comps.countertopTopCoat) setSelectedCountertopTopCoat(String(comps.countertopTopCoat || ''));
            }
          }, 300);
        }

        if (savedBid.spread_rate_overrides) {
          const overrides = savedBid.spread_rate_overrides;
          if (overrides.noMVBBasePigment)
            setNoMVBBasePigmentSpreadRate(Number(overrides.noMVBBasePigment));
          if (overrides.noMVBBaseCoat) setNoMVBBaseCoatSpreadRate(Number(overrides.noMVBBaseCoat));
          if (overrides.noMVBFlakeColor) setNoMVBFlakeColorSpreadRate(Number(overrides.noMVBFlakeColor));
          if (overrides.noMVBTopCoat) setNoMVBTopCoatSpreadRate(Number(overrides.noMVBTopCoat));
          if (overrides.mvbBasePigment) setMVBBasePigmentSpreadRate(Number(overrides.mvbBasePigment));
          if (overrides.mvbBaseCoat) setMVBBaseCoatSpreadRate(Number(overrides.mvbBaseCoat));
          if (overrides.mvbFlakeColor) setMVBFlakeColorSpreadRate(Number(overrides.mvbFlakeColor));
          if (overrides.mvbTopCoat) setMVBTopCoatSpreadRate(Number(overrides.mvbTopCoat));
          if (overrides.solidBasePigment)
            setSolidBasePigmentSpreadRate(Number(overrides.solidBasePigment));
          if (overrides.solidGroutCoat) setSolidGroutCoatSpreadRate(Number(overrides.solidGroutCoat));
          if (overrides.solidBaseCoat) setSolidBaseCoatSpreadRate(Number(overrides.solidBaseCoat));
          if (overrides.solidExtraBaseCoat)
            setSolidExtraBaseCoatSpreadRate(Number(overrides.solidExtraBaseCoat));
          if (overrides.solidTopCoat) setSolidTopCoatSpreadRate(Number(overrides.solidTopCoat));
          if (overrides.metallicBasePigment)
            setMetallicBasePigmentSpreadRate(Number(overrides.metallicBasePigment));
          if (overrides.metallicGroutCoat)
            setMetallicGroutCoatSpreadRate(Number(overrides.metallicGroutCoat));
          if (overrides.metallicBaseCoat)
            setMetallicBaseCoatSpreadRate(Number(overrides.metallicBaseCoat));
          if (overrides.metallicMoneyCoat)
            setMetallicMoneyCoatSpreadRate(Number(overrides.metallicMoneyCoat));
          if (overrides.metallicTopCoat) setMetallicTopCoatSpreadRate(Number(overrides.metallicTopCoat));
          if (overrides.grindSealGrout) setGrindSealGroutSpreadRate(Number(overrides.grindSealGrout));
          if (overrides.grindSealBase) setGrindSealBaseSpreadRate(Number(overrides.grindSealBase));
          if (overrides.grindSealIntermediateCoat)
            setGrindSealIntermediateCoatSpreadRate(Number(overrides.grindSealIntermediateCoat));
          if (overrides.countertopBaseCoat)
            setCountertopBaseCoatSpreadRate(Number(overrides.countertopBaseCoat));
          if (overrides.countertopMetallicArtCoat)
            setCountertopMetallicArtCoatSpreadRate(Number(overrides.countertopMetallicArtCoat));
          if (overrides.countertopClearCoat)
            setCountertopClearCoatSpreadRate(Number(overrides.countertopClearCoat));
          if (overrides.countertopMetallicPigment)
            setCountertopMetallicPigmentSpreadRate(Number(overrides.countertopMetallicPigment));
        }

        if (savedBid.add_on_quantities) {
          setAddOnQuantities(savedBid.add_on_quantities);
        }
        if (savedBid.custom_material_prices) {
          setCustomMaterialPrices(savedBid.custom_material_prices);
        }
        if (savedBid.labor_rates) {
          setLaborRates(savedBid.labor_rates);
        }

        if (savedBid.sundries_enabled !== null && savedBid.sundries_enabled !== undefined) {
          setSundriesEnabled(savedBid.sundries_enabled);
        }

        if (savedBid.custom_charge_label) {
          setCustomChargeLabel(savedBid.custom_charge_label);
        }

        if (savedBid.countertop_pieces && Array.isArray(savedBid.countertop_pieces)) {
          setCountertopPieces(savedBid.countertop_pieces);
        }
        if (savedBid.countertop_mode) {
          setCountertopMode(savedBid.countertop_mode);
        }
        if (savedBid.countertop_direct_surface) {
          setCountertopDirectSurface(Number(savedBid.countertop_direct_surface));
        }
        if (savedBid.countertop_direct_edge) {
          setCountertopDirectEdge(Number(savedBid.countertop_direct_edge));
        }
        if (savedBid.countertop_direct_backsplash) {
          setCountertopDirectBacksplash(Number(savedBid.countertop_direct_backsplash));
        }

        if (savedBid.suggestion_cycle) {
          setSuggestionCycle(savedBid.suggestion_cycle);
        }

        if (savedBid.ui_state) {
          try {
            calculatorDraftActions.setUiState(savedBid.ui_state);
          } catch (e) {
            console.warn('[UniversalCalculator] Failed to restore UI state:', e);
          }
        }

        if (savedBid.items && Array.isArray(savedBid.items) && savedBid.items.length > 0) {
          const restoredItems = savedBid.items.map((item: any) => ({
            id: item.product_id?.toString() || item.id?.toString() || '',
            name: item.item_name || item.product_name || item.name || 'Product',
            sku: item.item_sku || item.product_id?.toString() || '',
            qty: Number(item.quantity) || 0,
            unit: item.unit || 'ea',
            unitPrice: Number(item.unit_price) || 0,
            imageUrl: item.product_image_url || null,
            tdsUrl: item.product_tds_url || null,
            componentKey: item.component_key || null,
          }));

          calculatorDraftActions.patch({
            items: restoredItems,
            totals:
              savedBid.customer_price > 0 || savedBid.total_cost > 0
                ? {
                    materialCost: Number(savedBid.material_cost || 0),
                    laborCost: Number(savedBid.labor_cost || 0),
                    totalCost: Number(savedBid.total_cost || 0),
                    customerPrice: Number(savedBid.customer_price || 0),
                    ppsf: Number(savedBid.price_per_sqft || 0),
                    byTier: savedBid.totals_by_tier || {},
                  }
                : undefined,
          });
        }

        if (savedBid.customer_price > 0 || savedBid.total_cost > 0) {
          setHasCalculated(true);
          setTimeout(() => {
            if (cancelled) return;
            if (import.meta.env.DEV) {
              console.log('[UniversalCalculator] Auto-triggering calculation after load');
            }
            setAutoTriggerCalc(true);
          }, 1000);
        }

        notifications.show({
          title: 'Bid Loaded',
          message: `Loaded "${savedBid.name}" successfully. All values have been restored.`,
          color: 'green',
        });
      } catch (error: any) {
        console.error('[UniversalCalculator] Failed to load saved bid:', error);
        notifications.show({
          title: 'Load Failed',
          message: error?.message || 'Failed to load saved bid.',
          color: 'red',
        });
      } finally {
        setIsLoadingSavedBid(false);
      }
    }

    loadSavedBid();
    return () => {
      cancelled = true;
    };
  }, [productsLength, availableManufacturers, apiManufacturers, productsLoading, selectedManufacturer]);
}


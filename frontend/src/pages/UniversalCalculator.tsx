import { useState, useMemo, useEffect, useCallback } from 'react';
import { Container, Button, Grid } from '@mantine/core';
import { useQuickPresets } from '../hooks/useQuickPresets';
import { notifications } from '@mantine/notifications';
import { apiPost, apiPut } from '../lib/api';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/PageHeader';
import { PostCalculationDetails } from './universal-calculator/PostCalculationDetails';
import { CalculationResultsSection } from './universal-calculator/CalculationResultsSection';
import { ManufacturerStepCol } from './universal-calculator/steps/ManufacturerStepCol';
import { AreaAndSurfaceStep } from './universal-calculator/steps/AreaAndSurfaceStep';
import { PricingControlsSection } from './universal-calculator/steps/PricingControlsSection';
import { ResetCalculatorModal } from '../components/universal-calculator/ResetCalculatorModal';
import { ProductCatalogModal } from '../components/universal-calculator/ProductCatalogModal';
import { SummaryBar } from '../components/universal-calculator/SummaryBar';
import { SystemComponentsSection } from '../components/universal-calculator/SystemComponentsSection';
import { AddOnOptionsSection } from './universal-calculator/AddOnOptionsSection';
import './UniversalCalculator.compact.css';
import useLocalStorage from '../hooks/useLocalStorage';
import { getCurrentUserData, saveCurrentUserData } from '../utils/userScopedStorage';
import { calculatePricing, formatMoney as fmtMoney, formatPpsf as fmtPpsf } from '../utils/pricing';
import { BidSnapshot as DocBidSnapshot, LineItem as DocLineItem } from '../utils/pnl';
import { useLocation } from 'wouter';
import { useCalculatorDraft, calculatorDraftActions } from '../store/calculatorDraft';
import { buildSavedBidPayload, snapshotToItems } from '../utils/mapper';
import { toDraftPricingMethod } from '../constants/pricingMethods';
import { flooringLaborAddOns as laborAddOns, countertopLaborAddOns } from '../lib/laborCatalog';
import type { LaborAddOn } from '../lib/laborCatalog';
import NewEstimateModal, { type EstimateService } from '../components/NewEstimateModal';
import { useMyManufacturers } from '../hooks/useManufacturers';
import { useUniversalProducts } from '../hooks/useUniversalProducts';
import { useSavedBidLoader } from '../hooks/useSavedBidLoader';
import { useAddOnSuggestions } from '../hooks/useAddOnSuggestions';
import { useMetallicMixAssistants } from '../hooks/useMetallicMixAssistants';
import { getImageUrl } from '../utils/imageUrl';
import { getPreselectedClient, clearPreselectedClient } from '../utils/clientPreselection';
import { localManufacturerLogos } from '../constants/localManufacturerLogos';
import {
  applyManufacturerDiscount,
  getBasePigmentRatio,
  buildMaterialAddOnItems,
  buildLaborAddOnItems,
  buildDisplayLineItems,
  computeSystemComponentsSummary,
} from '../utils/universalCalculator';
import type { LineItem } from '../utils/pnl';
import { useUniversalCalculatorState } from '../hooks/useUniversalCalculatorState';
import { SystemStepCol } from './universal-calculator/steps/SystemStepCol';
import { ThumbImg } from '../components/universal-calculator/ThumbImg';
import { LaborThumb } from '../components/universal-calculator/LaborThumb';

interface Product {
  id: number;
  name: string;
  description?: string;
  unit_price: string; // API returns as string
  category: string;
  manufacturer: string;
  manufacturer_id?: number; // May be present in API response
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
}

interface Manufacturer {
  id: string;
  name: string;
  logo: string;
}

export default function UniversalCalculator() {
  const [, setLocation] = useLocation();
  const draft = useCalculatorDraft();

  // Core calculator state (selection, dimensions, pricing)
  const {
    selectedManufacturer,
    setSelectedManufacturer,
    selectedSystemGroup,
    setSelectedSystemGroup,
    selectedSystem,
    setSelectedSystem,
    selectedSurfaceHardness,
    setSelectedSurfaceHardness,
    totalSqft,
    setTotalSqft,
    dimensions,
    setDimensions,
    pricingMethod,
    setPricingMethod,
    profitMargin,
    setProfitMargin,
    laborRate,
    setLaborRate,
    totalLaborHours,
    setTotalLaborHours,
    hasCalculated,
    setHasCalculated,
    resultQtyOverrides,
    setResultQtyOverrides,
    targetPpsf,
    setTargetPpsf,
  } = useUniversalCalculatorState();
  // Catalog modal state
  const [catalogOpen, setCatalogOpen] = useState<boolean>(false);
  const [catalogQuery, setCatalogQuery] = useState<string>("");
  const [catalogCategory, setCatalogCategory] = useState<string | null>(null);
  const [catalogManu, setCatalogManu] = useState<string | null>(null);
  const [catalogLimit, setCatalogLimit] = useState<number>(24);
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);

  // Estimate modal state
  const [estimateModalOpen, setEstimateModalOpen] = useState<boolean>(false);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  // Save Bid (client capture & editing)
  const [saveBidModalOpen, setSaveBidModalOpen] = useState(false);
  const [isSavingBid, setIsSavingBid] = useState(false);
  const [pendingOrderSheet, setPendingOrderSheet] = useState(false);
  const [bidName, setBidName] = useState<string>('');
  const [bidDescription, setBidDescription] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>('');

  // Apply pre-selected client from Contacts tab (if available)
  useEffect(() => {
    // Only apply if no client is already selected
    if (selectedClientId || selectedClientName) {
      return;
    }

    const preselectedClient = getPreselectedClient(
      'selectedContact',
      'selectedContactTimestamp'
    );

    if (preselectedClient) {
      if (import.meta.env.DEV) {
        console.log('[UniversalCalculator] Applying pre-selected client from Contacts:', preselectedClient);
      }

      setSelectedClientId(preselectedClient.clientId);
      setSelectedClientName(preselectedClient.clientName);

      // Clear from localStorage to prevent re-application
      clearPreselectedClient('selectedContact', 'selectedContactTimestamp');

      // Show confirmation notification
      notifications.show({
        title: 'Client Pre-Selected',
        message: `${preselectedClient.clientName} has been selected for this calculator.`,
        color: 'green',
        autoClose: 3000,
      });
    }
  }, []); // Run only once on mount, before selectedClientId/Name are set
  const [editingBidId, setEditingBidId] = useState<string | null>(null);
  const [isLoadingSavedBid, setIsLoadingSavedBid] = useState<boolean>(false);
  const [autoTriggerCalc, setAutoTriggerCalc] = useState<boolean>(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Load saved bid when editBid parameter is present (moved after products/manufacturers declarations)

  // Reset catalog paging when filters change or modal re-opens
  useEffect(() => {
    if (catalogOpen) setCatalogLimit(24);
  }, [catalogQuery, catalogCategory, catalogManu, catalogOpen]);

  // Countertop pieces management
  const [countertopPieces, setCountertopPieces] = useState([
    {
      id: 1,
      name: 'Piece 1',
      length: 0,
      width: 0,
      edgeHeight: 0,
      edgeWidth: 0,
      backsplashHeight: 0,
      backsplashWidth: 0
    }
  ]);
  const [countertopMode, setCountertopMode] = useState<'pieces' | 'totals'>('pieces');
  const [countertopDirectSurface, setCountertopDirectSurface] = useState<number>(0);
  const [countertopDirectEdge, setCountertopDirectEdge] = useState<number>(0);
  const [countertopDirectBacksplash, setCountertopDirectBacksplash] = useState<number>(0);

  // Quick presets (shared across app via localStorage)
  const { presets: quickPresets, updatePreset } = useQuickPresets();
  const [editingPresetId, setEditingPresetId] = useState<number | null>(null);
  const [editingPresetValue, setEditingPresetValue] = useState<number>(0);

  // System-specific component state
  const [selectedBasePigment, setSelectedBasePigment] = useState<string>('');
  const [selectedBaseCoat, setSelectedBaseCoat] = useState<string>('');
  const [selectedFlakeColor, setSelectedFlakeColor] = useState<string>('');
  const [selectedTopCoat, setSelectedTopCoat] = useState<string>('');

  // MVB Flake System component state
  const [selectedMVBBasePigment, setSelectedMVBBasePigment] = useState<string>('');
  const [selectedMVBBaseCoat, setSelectedMVBBaseCoat] = useState<string>('');
  const [selectedMVBFlakeColor, setSelectedMVBFlakeColor] = useState<string>('');
  const [selectedMVBTopCoat, setSelectedMVBTopCoat] = useState<string>('');

  // Solid Color System component state
  const [selectedSolidBasePigment, setSelectedSolidBasePigment] = useState<string>('');
  const [selectedSolidGroutCoat, setSelectedSolidGroutCoat] = useState<string>('');
  const [selectedSolidBaseCoat, setSelectedSolidBaseCoat] = useState<string>('');
  const [selectedSolidExtraBaseCoat, setSelectedSolidExtraBaseCoat] = useState<string>('');
  const [selectedSolidTopCoat, setSelectedSolidTopCoat] = useState<string>('');
  const [solidTopCoatSpreadRate, setSolidTopCoatSpreadRate] = useState<number>(200); // default 200 sq ft per gal

  // Metallic System component state
  const [selectedMetallicBasePigment, setSelectedMetallicBasePigment] = useState<string>('');
  const [selectedMetallicGroutCoat, setSelectedMetallicGroutCoat] = useState<string>('');
  const [selectedMetallicBaseCoat, setSelectedMetallicBaseCoat] = useState<string>('');
  const [selectedMetallicMoneyCoat, setSelectedMetallicMoneyCoat] = useState<string>('');
  const [selectedMetallicPigments, setSelectedMetallicPigments] = useState<Array<{ id: string, name: string, quantity: number }>>([]);
  const [selectedMetallicTopCoat, setSelectedMetallicTopCoat] = useState<string>('');

  // Grind & Seal System state variables
  const [selectedGrindSealPrimer, setSelectedGrindSealPrimer] = useState<string>('');
  const [selectedGrindSealGroutCoat, setSelectedGrindSealGroutCoat] = useState<string>('');
  const [selectedGrindSealBaseCoat, setSelectedGrindSealBaseCoat] = useState<string>('');
  const [selectedGrindSealIntermediateCoat, setSelectedGrindSealIntermediateCoat] = useState<string>('');
  const [selectedGrindSealTopCoat, setSelectedGrindSealTopCoat] = useState<string>('');
  const [selectedGrindSealAdditionalTopCoat, setSelectedGrindSealAdditionalTopCoat] = useState<string>('');

  // Countertop System component state
  const [selectedCountertopPrimer, setSelectedCountertopPrimer] = useState<string>('');
  const [selectedCountertopBasePigment, setSelectedCountertopBasePigment] = useState<string>('');
  const [selectedCountertopMetallicArtCoat, setSelectedCountertopMetallicArtCoat] = useState<string>('');
  const [selectedCountertopMetallicPigments, setSelectedCountertopMetallicPigments] = useState<Array<{ id: string, name: string, quantity: number }>>([]);
  const [selectedCountertopFloodCoat, setSelectedCountertopFloodCoat] = useState<string>('');
  const [selectedCountertopTopCoat, setSelectedCountertopTopCoat] = useState<string>('');

  // Spread Rate Adjuster States - No MVB System
  const [noMVBBasePigmentSpreadRate, setNoMVBBasePigmentSpreadRate] = useState<number>(1); // 1 per 3-gal kit
  const [noMVBBaseCoatSpreadRate, setNoMVBBaseCoatSpreadRate] = useState<number>(100); // 100 sq ft per gal
  const [noMVBFlakeColorSpreadRate, setNoMVBFlakeColorSpreadRate] = useState<number>(350); // 350 sq ft per box
  const [noMVBTopCoatSpreadRate, setNoMVBTopCoatSpreadRate] = useState<number>(200); // 200 sq ft per gal

  // Spread Rate Adjuster States - MVB System
  const [mvbBasePigmentSpreadRate, setMVBBasePigmentSpreadRate] = useState<number>(1); // 1 per 3-gal kit
  const [mvbBaseCoatSpreadRate, setMVBBaseCoatSpreadRate] = useState<number>(100); // 100 sq ft per gal
  const [mvbFlakeColorSpreadRate, setMVBFlakeColorSpreadRate] = useState<number>(350); // 350 sq ft per box
  const [mvbTopCoatSpreadRate, setMVBTopCoatSpreadRate] = useState<number>(200); // 200 sq ft per gal

  // Spread Rate Adjuster States - Solid Color System
  const [solidBasePigmentSpreadRate, setSolidBasePigmentSpreadRate] = useState<number>(1); // 1 per 3-gal kit
  const [solidGroutCoatSpreadRate, setSolidGroutCoatSpreadRate] = useState<number>(600); // 600 sq ft per gal
  const [solidBaseCoatSpreadRate, setSolidBaseCoatSpreadRate] = useState<number>(75); // 75 sq ft per gal
  const [solidExtraBaseCoatSpreadRate, setSolidExtraBaseCoatSpreadRate] = useState<number>(80); // 80 sq ft per gal

  // Spread Rate Adjuster States - Metallic System
  const [metallicBasePigmentSpreadRate, setMetallicBasePigmentSpreadRate] = useState<number>(1); // 1 per 3-gal kit
  const [metallicGroutCoatSpreadRate, setMetallicGroutCoatSpreadRate] = useState<number>(600); // 600 sq ft per gal
  const [metallicBaseCoatSpreadRate, setMetallicBaseCoatSpreadRate] = useState<number>(80); // 80 sq ft per gal
  const [metallicMoneyCoatSpreadRate, setMetallicMoneyCoatSpreadRate] = useState<number>(30); // 30 sq ft per gal
  const [metallicTopCoatSpreadRate, setMetallicTopCoatSpreadRate] = useState<number>(200); // default 200 sq ft per gal
  // const [metallicPigmentSpreadRate, setMetallicPigmentSpreadRate] = useState<number>(1); // 1 per 3-gal kit (currently unused)

  // Spread Rate Adjuster States - Countertop System
  const [countertopBaseCoatSpreadRate, setCountertopBaseCoatSpreadRate] = useState<number>(400); // 1 qt per 100 sq ft = 400 sq ft per gal
  const [countertopMetallicArtCoatSpreadRate, setCountertopMetallicArtCoatSpreadRate] = useState<number>(4.57); // Display only - 4 oz per sq ft used for calculations
  const [countertopClearCoatSpreadRate, setCountertopClearCoatSpreadRate] = useState<number>(4.57); // Display only - 3 oz per sq ft used for calculations
  const [countertopMetallicPigmentSpreadRate, setCountertopMetallicPigmentSpreadRate] = useState<number>(1); // 1 per 3-gal kit

  // Spread Rate Adjuster States - Grind and Seal System
  const [grindSealGroutSpreadRate, setGrindSealGroutSpreadRate] = useState<number>(600); // 600 sq ft per gal
  const [grindSealBaseSpreadRate, setGrindSealBaseSpreadRate] = useState<number>(125); // 125 sq ft per gal
  const [grindSealIntermediateCoatSpreadRate, setGrindSealIntermediateCoatSpreadRate] = useState<number>(150); // 150 sq ft per gal

  // Load manufacturers with numeric IDs from backend
  const { data: apiManufacturers = [] } = useMyManufacturers();

  // Helper function to generate slug from manufacturer name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Build availableManufacturers from backend data (source of truth)
  // This ensures manufacturer names match between products and the manufacturer list
  const availableManufacturers: Manufacturer[] = useMemo(() => {
    if (!apiManufacturers || apiManufacturers.length === 0) {
      return [];
    }
    return apiManufacturers.map(mfg => {
      const slug = generateSlug(mfg.name);
      
      // Priority 1: Use logo_url from API (convert to full S3/CloudFront URL)
      if (mfg.logo_url) {
        return {
          id: slug,
          name: mfg.name,
          logo: getImageUrl(mfg.logo_url)
        };
      }
      
      // Priority 2: Fall back to local assets
      return {
        id: slug,
        name: mfg.name,
        logo: localManufacturerLogos[slug] || '/manufacturer_logos/default.png'
      };
    });
  }, [apiManufacturers]);

  // Debug: Log when availableManufacturers is built
  useEffect(() => {
    if (availableManufacturers.length > 0) {
      console.log('[Manufacturers] Built availableManufacturers:', availableManufacturers.length);
      console.log('[Manufacturers] Sample:', availableManufacturers.slice(0, 3));
      console.log('[Manufacturers] All slugs:', availableManufacturers.map(m => m.id));
    }
  }, [availableManufacturers.length]);

  // Map currently selected manufacturer slug to numeric ID for API calls
  const selectedManufacturerIdNum = useMemo(() => {
    if (!selectedManufacturer) return undefined;
    const mfg = apiManufacturers.find(m => generateSlug(m.name) === selectedManufacturer);
    return mfg?.id;
  }, [apiManufacturers, selectedManufacturer]);

  const {
    products: rawProducts,
    productsLoading,
    productsError,
  } = useUniversalProducts(selectedManufacturerIdNum, apiManufacturers);

  const products = rawProducts as Product[];

  // Debug: Log when products array changes
  useEffect(() => {
    console.log('[Products Effect] Products array updated:', {
      count: products.length,
      loading: productsLoading,
      error: productsError,
      hasManufacturer: products.filter(p => p.manufacturer).length,
      sampleProduct: products[0]
    });
  }, [products.length, productsLoading, productsError]);

  // Auto-trigger calculation after loading saved bid
  useEffect(() => {
    if (autoTriggerCalc && !isLoadingSavedBid) {
      if (import.meta.env.DEV) {
        console.log('[UniversalCalculator] Auto-triggering calculation...');
      }
      setAutoTriggerCalc(false);
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTriggerCalc, isLoadingSavedBid]);

  // When opening the Catalog, default scope to the currently selected manufacturer
  const selectedManufacturerName = useMemo(() => {
    try {
      return availableManufacturers.find(m => m.id === selectedManufacturer)?.name || null;
    } catch {
      return null;
    }
  }, [availableManufacturers, selectedManufacturer]);

  useEffect(() => {
    if (catalogOpen) {
      setCatalogManu(prev => prev ?? (selectedManufacturerName || null));
    }
  }, [catalogOpen, selectedManufacturerName]);

  // Manufacturer discount map (from Pricing Management localStorage)
  // Structure: [{ manufacturerName, discount, isActive }]
  const manufacturerDiscountsMap = useMemo(() => {
    try {
      const raw = localStorage.getItem('manufacturerDiscounts');
      const list = raw ? JSON.parse(raw) : [];
      const map: Record<string, { pct: number; active: boolean }> = {};
      if (Array.isArray(list)) {
        list.forEach((d: any) => {
          const key = String(d?.manufacturerName || d?.name || '').toLowerCase().trim();
          if (!key) return;
          const pct = Number(d?.discount) || 0;
          const active = !!d?.isActive;
          map[key] = { pct, active };
        });
      }
      return map;
    } catch {
      return {} as Record<string, { pct: number; active: boolean }>;
    }
  }, []);

  // Get unit price with manufacturer discount applied (if active)
  const getUnitPrice = useCallback((product: Product): number => {
    const raw = parseFloat(product.unit_price || '0') || 0;
    return applyManufacturerDiscount(raw, product.manufacturer || '', manufacturerDiscountsMap);
  }, [manufacturerDiscountsMap]);

  // Prefill Metallic Top Coat spread rate from selected product when available
  useEffect(() => {
    if (!selectedMetallicTopCoat) return;
    const p = products.find(prod => prod.id.toString() === selectedMetallicTopCoat);
    if (!p) return;
    const parsed = parseSpreadRate((p as any).spread_rate);
    if (parsed && parsed.value) {
      setMetallicTopCoatSpreadRate(parsed.value);
    }
  }, [selectedMetallicTopCoat, products]);

  // Prefill Solid Color Top Coat spread rate from selected product when available
  useEffect(() => {
    if (!selectedSolidTopCoat) return;
    const p = products.find(prod => prod.id.toString() === selectedSolidTopCoat);
    if (!p) return;
    const parsed = parseSpreadRate((p as any).spread_rate);
    if (parsed && parsed.value) {
      setSolidTopCoatSpreadRate(parsed.value);
    }
  }, [selectedSolidTopCoat, products]);

  // Debug: Log when manufacturer selection changes
  useEffect(() => {
    console.log('[Manufacturer Selection]', {
      selectedManufacturer,
      manufacturerName: availableManufacturers.find(m => m.id === selectedManufacturer)?.name,
      availableCount: availableManufacturers.length
    });
  }, [selectedManufacturer, availableManufacturers]);

  // Get available systems based on selected manufacturer and system group
  const availableSystems = useMemo(() => {
    if (!selectedManufacturer || !selectedSystemGroup) return [];

    // Always use predefined systems (not individual products)
    if (selectedSystemGroup === 'resin-flooring') {
      return [
        { value: 'no-mvb-flake-system', label: 'No MVB Flake System', disabled: false },
        { value: 'mvb-flake-system', label: 'MVB Flake System', disabled: false },
        { value: 'solid-color-system', label: 'Solid Color System', disabled: false },
        { value: 'metallic-system', label: 'Metallic System', disabled: false }
      ];
    }

    if (selectedSystemGroup === 'polishing') {
      return [
        { value: 'polish-clean-seal', label: 'Clean & Seal', disabled: false },
        { value: 'polish-grind-seal', label: 'Grind & Seal', disabled: false },
        { value: 'polish-medium', label: 'Medium Polish', disabled: false },
        { value: 'polish-true', label: 'True Polish', disabled: false },
        { value: 'polish-high-end', label: 'High End Polish', disabled: false },
      ];
    }

    if (selectedSystemGroup === 'countertops-custom') {
      return [
        { value: 'countertop-fabrication', label: 'Countertop Fabrication', disabled: false },
        { value: 'on-site-pour', label: 'On-Site Pour', disabled: false },
        { value: 'shower-bathroom-fabrication', label: 'Shower/Bathroom Fabrication', disabled: false },
        { value: 'custom-bar-top', label: 'Custom Bar Top', disabled: false },
        { value: 'custom-corn-hole', label: 'Custom Corn Hole', disabled: false },
        { value: 'custom-piece', label: 'Custom Piece', disabled: false }
      ];
    }

    return [];
  }, [selectedManufacturer, selectedSystemGroup]);

  // Calculate total square footage from dimensions
  const calculatedSqft = useMemo(() => {
    if (selectedSystemGroup === 'countertops-custom') {
      let surfaceArea = 0;

      if (countertopMode === 'totals') {
        surfaceArea = countertopDirectSurface;
      } else {
        surfaceArea = countertopPieces.reduce((total, piece) => total + (piece.length * piece.width), 0);
      }

      // For countertop systems, add edge and backsplash areas for material calculations
      let totalMaterialArea = surfaceArea;

      // Calculate edge linear feet and add area (linear feet * 1.5 inches height / 12 inches per foot = sq ft)
      let edgeLf = 0;
      if (countertopMode === 'totals') {
        edgeLf = countertopDirectEdge;
      } else {
        edgeLf = countertopPieces.reduce((t, p) => t + (Number(p.edgeWidth) || 0), 0);
      }
      if (edgeLf > 0) {
        const edgeArea = (edgeLf * 1.5) / 12;
        totalMaterialArea += edgeArea;
      }

      // Calculate backsplash linear feet and add area (linear feet * 4 inches height / 12 inches per foot = sq ft)
      let backsplashLf = 0;
      if (countertopMode === 'totals') {
        backsplashLf = countertopDirectBacksplash;
      } else {
        backsplashLf = countertopPieces.reduce((t, p) => t + (Number(p.backsplashWidth) || 0), 0);
      }
      if (backsplashLf > 0) {
        const backsplashArea = (backsplashLf * 4) / 12;
        totalMaterialArea += backsplashArea;
      }

      return totalMaterialArea;
    }
    return dimensions.length * dimensions.width;
  }, [dimensions, selectedSystemGroup, countertopPieces, countertopMode, countertopDirectSurface, countertopDirectEdge, countertopDirectBacksplash]);

  // Countertops: compute linear feet (LF) for edge and backsplash separately
  const countertopEdgeLf = useMemo(() => {
    if (selectedSystemGroup !== 'countertops-custom') return 0;
    if (countertopMode === 'totals') return countertopDirectEdge;
    return countertopPieces.reduce((t, p) => t + (Number(p.edgeWidth) || 0), 0);
  }, [selectedSystemGroup, countertopPieces, countertopMode, countertopDirectEdge]);

  const countertopBacksplashLf = useMemo(() => {
    if (selectedSystemGroup !== 'countertops-custom') return 0;
    if (countertopMode === 'totals') return countertopDirectBacksplash;
    return countertopPieces.reduce((t, p) => t + (Number(p.backsplashWidth) || 0), 0);
  }, [selectedSystemGroup, countertopPieces, countertopMode, countertopDirectBacksplash]);

  // Use manual input or calculated from dimensions
  const effectiveSqft = totalSqft > 0 ? totalSqft : calculatedSqft;

  // Helper function to extract product size from product name
  const extractProductSize = (productName: string): { size: number; unit: string } => {
    // Look for patterns like "3-gal", "1 qt", "1-qt", "5 gal", "2G KIT", "2G" etc.
    let sizeMatch = productName.match(/(\d+(?:\.\d+)?)\s*[-\s]*(gal|qt|quart|gallon)/i);
    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toLowerCase();
      // Convert quarts to gallons for consistency
      if (unit.startsWith('q')) {
        return { size: size / 4, unit: 'gal' };
      }
      return { size, unit: 'gal' };
    }
    // Handle patterns like "2G" or "3G KIT"
    sizeMatch = productName.match(/(\d+(?:\.\d+)?)\s*[-\s]*g(?![a-z])/i);
    if (sizeMatch) {
      return { size: parseFloat(sizeMatch[1]), unit: 'gal' };
    }
    // Default to 1 gallon if no size found
    return { size: 1, unit: 'gal' };
  };

  // Prefer structured kit size from API when available (e.g., "3-gal kit", "2G KIT")
  const parseKitSizeGallons = (kitSize?: string | null): number | undefined => {
    if (!kitSize) return undefined;
    const s = String(kitSize).toLowerCase();
    const m = s.match(/(\d+(?:\.\d+)?)\s*[-\s]*g(?:al|allon)?/);
    if (m) return parseFloat(m[1]);
    const n = s.match(/(\d+(?:\.\d+)?)/);
    if (n) return parseFloat(n[1]);
    return undefined;
  };

  // Parse spread rate string from product data.
  // Returns an object so callers can decide how to handle ranges vs single values.
  const parseSpreadRate = (raw?: string | null): { value: number; isRange: boolean } | undefined => {
    if (!raw) return undefined;
    const s = String(raw).toLowerCase();
    // Detect ranges like "200-300" or "200 to 300"
    const range = s.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/);
    if (range) {
      // Do not force a lower/upper bound here; let caller fall back to provided system defaults.
      // We still return the lower bound as value for completeness, flagged as a range.
      return { value: parseFloat(range[1]), isRange: true };
    }
    const single = s.match(/(\d+(?:\.\d+)?)/);
    if (single) return { value: parseFloat(single[1]), isRange: false };
    return undefined;
  };

  // Calculate quantity needed for each component based on spread rates
  type Tier = 'good' | 'better' | 'best';
  type ComponentRole = 'base' | 'grout' | 'extra' | 'money' | undefined;

  // Packaging helpers for aggregation
  const getPackagingInfo = (product: Product, isPerKit: boolean): { type: 'box' | 'kit' | 'gallon'; kitGallons?: number; containerGallons?: number } => {
    const nameLC = (product.name || '').toLowerCase();
    const categoryLC = (product.category || '').toLowerCase();
    const unitLC = (product.unit || '').toLowerCase();
    const productSize = extractProductSize(product.name);
    const apiKitMatch = /\bkit\b/.test(String(product.kit_size || '').toLowerCase());
    const looksLikeKit = apiKitMatch || /\bkit\b/.test(nameLC) || isPerKit;
    const looksLikeBox = /\bbox\b|\bflake\b/.test(nameLC) || /flake/.test(categoryLC) || unitLC === 'box' || unitLC === 'boxes';
    if (looksLikeBox) return { type: 'box' };
    if (looksLikeKit) {
      // derive kit gallons from api kit_size or parsed name
      const sizeFromApi = parseKitSizeGallons(product.kit_size);
      const kitGallons = (sizeFromApi && sizeFromApi >= 1) ? sizeFromApi : productSize.size;
      return { type: 'kit', kitGallons: Math.max(1, kitGallons) };
    }
    // gallon/container
    return { type: 'gallon', containerGallons: Math.max(1, productSize.size) };
  };

  const calculateComponentQuantity = (
    productId: string,
    spreadRate: number,
    isPerKit: boolean = false,
    isPigment: boolean = false,
    componentRole?: ComponentRole,
    tierOverride?: Tier,
    spreadMultiplier: number = 1
  ): { quantity: number; cost: number; unit: string } => {
    if (!productId || effectiveSqft === 0) return { quantity: 0, cost: 0, unit: '' };

    const product = products.find(p => p.id.toString() === productId);
    if (!product) return { quantity: 0, cost: 0, unit: '' };

    const productSize = extractProductSize(product.name);
    const unitPrice = getUnitPrice(product);

    if (isPigment) {
      // For pigments, calculate based on base coat kits needed
      const pigmentRatio = getBasePigmentRatio(product.manufacturer || '');
      const baseCoatKitsNeeded = Math.ceil(effectiveSqft / (spreadRate * 3)); // 3-gal kits
      const pigmentsNeeded = Math.ceil(baseCoatKitsNeeded * pigmentRatio);
      return { quantity: pigmentsNeeded, cost: pigmentsNeeded * unitPrice, unit: 'ea' };
    }

    const nameLC = (product.name || '').toLowerCase();
    const categoryLC = (product.category || '').toLowerCase();
    const unitLC = (product.unit || '').toLowerCase();
    // Prefer product-provided spread rate only when it's a single value; if a range, use provided system default
    const parsedSR = parseSpreadRate((product as any).spread_rate);
    let productSpread = (parsedSR && !parsedSR.isRange ? parsedSR.value : undefined) ?? spreadRate;

    // Apply tiering adjustments for specific coat roles (flooring only)
    const tierToUse: Tier = tierOverride ?? selectedTier;
    const applyTier = (role?: ComponentRole): boolean => {
      return role === 'base' || role === 'grout' || role === 'extra' || role === 'money';
    };
    if (applyTier(componentRole)) {
      const s0 = productSpread;
      // Good = 15% less material than Better (increase spread by 1/0.85)
      // Best = 15% more material than Better (decrease spread by 1/1.15)
      if (tierToUse === 'good') {
        productSpread = Math.max(1, Math.round(s0 * (1 / 0.85)));
      } else if (tierToUse === 'best') {
        productSpread = Math.max(1, Math.round(s0 * (1 / 1.15)));
      }
    }
    // optional extra multiplier (e.g., anti-tie nudge)
    productSpread = productSpread * spreadMultiplier;
    // Determine kit by explicit data first, avoid broad heuristics
    const hasKitFlag = /\bkit\b/.test(nameLC) || /\bkit\b/.test(String(product.kit_size || '').toLowerCase());
    const looksLikeKit = hasKitFlag || isPerKit;

    // Infer common kit sizes when not explicitly present
    const inferKitSize = (parsed: number): number => {
      if (parsed && parsed >= 1.5) return parsed; // already a multi-gal size
      // As a last resort when data doesn't specify, infer common sizes
      if (/epoxy/.test(nameLC) || /base coat/.test(nameLC) || /epoxy/.test(categoryLC)) return 3;
      if (/polyaspartic/.test(nameLC) || /polyaspartic/.test(categoryLC)) return 2;
      // If name references Part A/B, assume at least a 2G combined kit
      if (/part\s*a/.test(nameLC) && /part\s*b/.test(nameLC)) return 2;
      return parsed || 1;
    };
    const looksLikeBoxed = /\bbox\b|\bflake\b/.test(nameLC) || /flake/.test(categoryLC) || unitLC === 'box' || unitLC === 'boxes';

    // Boxed goods (e.g., flakes): spreadRate is sq ft per box
    if (looksLikeBoxed) {
      const boxes = Math.ceil(effectiveSqft / Math.max(1, productSpread));
      return { quantity: boxes, cost: boxes * unitPrice, unit: 'boxes' };
    }

    // Liquids sold in kits (use gallons per kit): kits = ceil(A / (S*K))
    if (looksLikeKit) {
      const apiKitSize = parseKitSizeGallons(product.kit_size);
      const effectiveKitSize = inferKitSize(apiKitSize ?? productSize.size);
      const kits = Math.ceil(effectiveSqft / (productSpread * Math.max(1, effectiveKitSize)));
      return { quantity: kits, cost: kits * unitPrice, unit: 'kits' };
    }

    // Liquids sold by the gallon (no explicit kit)
    // Single rounding at purchasable unit: compute containers directly when size > 1 gal
    const gallonsNeeded = effectiveSqft / Math.max(1, productSpread);
    if (productSize.size > 1) {
      const containers = Math.ceil(gallonsNeeded / productSize.size);
      // Unit label heuristic: if name mentions 'pail' use 'pails', else 'gallons'
      const unit = /\bpail\b/.test(nameLC) ? 'pails' : 'gallons';
      return { quantity: containers, cost: containers * unitPrice, unit };
    }
    const gallons = Math.ceil(gallonsNeeded);
    return { quantity: gallons, cost: gallons * unitPrice, unit: 'gallons' };
  };

  // (Removed legacy getSystemMaterialCost in favor of table-sourced material totals)

  // Updated main material cost function (table-sourced to match displayed items exactly)
  const getMaterialCost = (): number => {
    // Base equals sum of the currently displayed material line items (system + material add-ons)
    const baseFromItems = [...systemMaterialItems, ...materialAddOnItems].reduce((acc, it) => acc + it.total, 0);
    if (baseFromItems === 0) return 0;

    // Apply manual overrides deltas (Qty edits in the results table)
    const manualDelta = (() => {
      const baseMap: Record<string, { qty: number; unitPrice: number }> = {};
      [...systemMaterialItems, ...materialAddOnItems].forEach(it => { baseMap[it.id] = { qty: it.qty, unitPrice: it.unitPrice }; });
      let delta = 0;
      Object.entries(resultQtyOverrides).forEach(([id, overrideQty]) => {
        const base = baseMap[id];
        if (!base || !Number.isFinite(overrideQty)) return;
        delta += (Number(overrideQty) - base.qty) * base.unitPrice;
      });
      return delta;
    })();

    const preSundries = baseFromItems + manualDelta;
    const sundriesPercent = addOnQuantities['sundries'] ?? 5; // default 5%
    const sundriesAmount = sundriesEnabled && sundriesPercent > 0 && preSundries > 0
      ? (sundriesPercent / 100) * preSundries
      : 0;
    return preSundries + sundriesAmount;
  };

  // Tier comparison cards removed; per-tier material cost calculators no longer needed here



  const calculateLaborCost = (): number => {
    const addOns = laborAddOnItems.reduce((acc, it) => acc + it.total, 0);
    return laborRate * totalLaborHours + addOns;
  };

  const calculateTotalCost = (): number => {
    return getMaterialCost() + calculateLaborCost();
  };

  // Helper: build full image URL similar to Products page
  const getProductImageUrl = (relativePath: string | undefined): string => {
    if (!relativePath || relativePath.trim() === '') return '';
    if (relativePath.startsWith('http')) return relativePath;
    const API_BASE_URL = (import.meta.env.VITE_API_BASE as string) || 'https://floor-nexus-backend-latest.onrender.com';
    return `${API_BASE_URL}${relativePath}`;
  };

  // Add-on helpers: get products by category with optional manufacturer scoping
  const getAddOnProductsByCategory = useCallback((
    category: string,
    restrictToManufacturer: boolean = false,
    specificManufacturerSlug?: string
  ) => {
    const slugify = (s?: string | null) => (s || '').toString().toLowerCase().trim().replace(/\s+/g, '-');
    const targetSlug = specificManufacturerSlug ? slugify(specificManufacturerSlug) : '';
    return products
      .filter(p => {
        const matchesCategory = slugify(p.category) === slugify(category);
        if (!matchesCategory) return false;
        if (specificManufacturerSlug) {
          const manuSlug = slugify(p.manufacturer);
          const brandSlug = slugify((p as any).brand_name as string | undefined);
          // Accept exact or partial contains to be robust to brand variations like "rcm-fuzion-max"
          return (
            manuSlug === targetSlug || brandSlug === targetSlug ||
            manuSlug.includes(targetSlug) || brandSlug.includes(targetSlug)
          );
        }
        if (restrictToManufacturer && selectedManufacturer) {
          const slug = slugify(p.manufacturer);
          return slug === selectedManufacturer;
        }
        return true;
      })
      .map(p => {
        // Clean display name: remove manufacturer/brand prefix to avoid redundancy
        let displayName = p.name || '';
        const stripPrefix = (prefix?: string | null) => {
          if (!prefix) return;
          const pref = prefix.toString();
          if (displayName.toLowerCase().startsWith(pref.toLowerCase())) {
            displayName = displayName.substring(pref.length).trim().replace(/^[-–—:\s]+/, '');
          }
        };
        stripPrefix(p.manufacturer);
        // Some items may use brand_name (e.g., RCM)
        stripPrefix((p as any).brand_name as string | undefined);
        // Also strip common short manufacturer token like 'RCM ' if it still remains
        if (/^rcm\s+/i.test(displayName)) {
          displayName = displayName.replace(/^rcm\s+/i, '');
        }

        return {
          id: p.id.toString(),
          name: displayName,
          price: getUnitPrice(p) || 0,
          image: getProductImageUrl(p.image_url),
          tds: p.technical_data_sheet_url || '',
        };
      });
  }, [products, selectedManufacturer, getUnitPrice, getProductImageUrl]);

  const user = useMemo(() => ({ id: 'local' }), []); // Static frontend: no auth
  // UI-only quantities for add-ons
  const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>({});
  // Persist labor rates across sessions
  const [laborRates, setLaborRates] = useState<Record<string, number>>(() => getCurrentUserData(user?.id, 'calculator.laborRates', {}));
  useEffect(() => { saveCurrentUserData(user?.id, 'calculator.laborRates', laborRates); }, [laborRates, user?.id]);
  // Persist custom material prices (for editable material lines like countertop materials)
  const [customMaterialPrices, setCustomMaterialPrices] = useLocalStorage<Record<string, number>>('calculator.materialPrices', {});
  // Persisted toggle for Sundries enable/disable (default off per request: not auto-added)
  const [sundriesEnabled, setSundriesEnabled] = useLocalStorage<boolean>('calculator.sundriesEnabled', false);
  // Persist selected tier for flooring systems (good | better | best)
  const [selectedTier, setSelectedTier] = useLocalStorage<'good' | 'better' | 'best'>('calculator.tier', 'better');
  // Persist compact layout preference
  const [compactMode, setCompactMode] = useLocalStorage<boolean>('calculator.compactMode', true);
  // Persist UI mode (legacy; no longer used after split)
  const [uiMode] = useLocalStorage<'addons' | 'results'>('calculator.mode', 'addons');
  const [customChargeLabel, setCustomChargeLabel] = useState<string>('Custom Charge');
  // Guided mode: linear layout + next-step prompts
  const [guidedMode, setGuidedMode] = useLocalStorage<boolean>('calculator.guidedMode', true);
  // Per-system rotating suggestion index
  const [suggestionCycle, setSuggestionCycle] = useLocalStorage<Record<string, number>>('calculator.suggestionCycle', {});
  const suggestionKey = `${selectedSystemGroup || 'none'}:${selectedSystem || 'none'}`;

  useSavedBidLoader({
    productsLength: products.length,
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
  });

  // Hydrate from persisted draft UI state on mount (only if not loading saved bid)
  useEffect(() => {
    // Skip draft hydration if we're loading a saved bid
    if (isLoadingSavedBid || editingBidId) return;

    const ui = draft?.uiState;
    if (!ui) return;
    try {
      if (ui.selectedManufacturer) setSelectedManufacturer(ui.selectedManufacturer);
      if (ui.selectedSystemGroup) setSelectedSystemGroup(ui.selectedSystemGroup);
      if (ui.selectedSystem) setSelectedSystem(ui.selectedSystem);
      if (typeof ui.totalSqft === 'number') setTotalSqft(ui.totalSqft);
      if (ui.dimensions) setDimensions(ui.dimensions);
      if (ui.selectedSurfaceHardness) setSelectedSurfaceHardness(ui.selectedSurfaceHardness);
      if (ui.pricingMethod) setPricingMethod(ui.pricingMethod);
      if (typeof ui.profitMargin === 'number') setProfitMargin(ui.profitMargin);
      if (typeof ui.laborRate === 'number') setLaborRate(ui.laborRate);
      if (typeof ui.totalLaborHours === 'number') setTotalLaborHours(ui.totalLaborHours);
      if (typeof ui.targetPpsf === 'number') setTargetPpsf(ui.targetPpsf);
      if (ui.resultQtyOverrides) setResultQtyOverrides(ui.resultQtyOverrides);
      if (ui.selectedTier) setSelectedTier(ui.selectedTier);
      if (typeof ui.hasCalculated === 'boolean') setHasCalculated(ui.hasCalculated);
      if (Array.isArray(ui.countertopPieces)) setCountertopPieces(ui.countertopPieces);
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingSavedBid, editingBidId]);

  // Persist lightweight UI state frequently for sticky back/forward
  useEffect(() => {
    const ui = {
      selectedManufacturer,
      selectedSystemGroup,
      selectedSystem,
      totalSqft,
      dimensions,
      selectedSurfaceHardness,
      pricingMethod,
      profitMargin,
      laborRate,
      totalLaborHours,
      targetPpsf,
      resultQtyOverrides,
      selectedTier,
      hasCalculated,
      countertopPieces,
    };
    try { calculatorDraftActions.setUiState(ui); } catch { }
    // Also keep a couple of headline fields in sync
    calculatorDraftActions.patch({
      manufacturerId: selectedManufacturer || null,
      systemGroup: selectedSystemGroup || '',
      systemType: selectedSystem || '',
      coverageAreaSqFt: Number(effectiveSqft) || 0,
      surfaceHardness: (selectedSurfaceHardness || null) as any,
      pricingMethod: toDraftPricingMethod(pricingMethod),
      marginPct: (profitMargin || 0) / 100,
      laborRatePerHour: laborRate,
      laborHours: totalLaborHours,
      targetPricePerSqFt: targetPpsf,
    });
  }, [selectedManufacturer, selectedSystemGroup, selectedSystem, totalSqft, dimensions, selectedSurfaceHardness, pricingMethod, profitMargin, laborRate, totalLaborHours, targetPpsf, resultQtyOverrides, selectedTier, hasCalculated, effectiveSqft]);
  // Suggestions panel favorites (scoped to Universal Calculator)
  const [favSkus, setFavSkus] = useLocalStorage<string[]>('uc.favorites', []);
  const toggleFav = useCallback((sku: string) => {
    const exists = favSkus.includes(sku);
    if (exists) {
      setFavSkus(favSkus.filter((x: string) => x !== sku));
    } else if (favSkus.length < 5) {
      setFavSkus([...favSkus, sku]);
    }
  }, [favSkus, setFavSkus]);
  // Layout flags
  const showComponentsInStep2 = false; // moved below the steps into its own section
  const showCalculateInStep4 = false; // calculate button moved under System Components

  const resetSystemComponentSelections = useCallback(() => {
    setSelectedBasePigment('');
    setSelectedBaseCoat('');
    setSelectedFlakeColor('');
    setSelectedTopCoat('');
    setSelectedMVBBasePigment('');
    setSelectedMVBBaseCoat('');
    setSelectedMVBFlakeColor('');
    setSelectedMVBTopCoat('');
    setSelectedSolidBasePigment('');
    setSelectedSolidGroutCoat('');
    setSelectedSolidBaseCoat('');
    setSelectedSolidExtraBaseCoat('');
    setSelectedSolidTopCoat('');
    setSelectedMetallicBasePigment('');
    setSelectedMetallicGroutCoat('');
    setSelectedMetallicBaseCoat('');
    setSelectedMetallicMoneyCoat('');
    setSelectedMetallicPigments([]);
    setSelectedMetallicTopCoat('');
    setSelectedGrindSealPrimer('');
    setSelectedGrindSealGroutCoat('');
    setSelectedGrindSealBaseCoat('');
    setSelectedGrindSealIntermediateCoat('');
    setSelectedGrindSealTopCoat('');
    setSelectedGrindSealAdditionalTopCoat('');
    // Reset countertop system components
    setSelectedCountertopPrimer('');
    setSelectedCountertopBasePigment('');
    setSelectedCountertopMetallicArtCoat('');
    setSelectedCountertopMetallicPigments([]);
    setSelectedCountertopFloodCoat('');
    setSelectedCountertopTopCoat('');
  }, []);

  // Smooth scroll helper for guided prompts
  const scrollToStep = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch { }
  };

  const crackJointFillers = useMemo(
    () => getAddOnProductsByCategory('Crack & Joint Filler', true),
    [products, selectedManufacturer, getAddOnProductsByCategory]
  );
  const nonSkidAdditives = useMemo(
    () => getAddOnProductsByCategory('Non-Skid Additives', true),
    [products, selectedManufacturer, getAddOnProductsByCategory]
  );
  const commonlyUsedMaterials = useMemo(
    () => getAddOnProductsByCategory('Commonly Used Materials', false),
    [products, getAddOnProductsByCategory]
  );
  // Countertops: Incidentals-based commonly used materials
  const countertopIncidentals = useMemo(() => {
    const lists = [
      getAddOnProductsByCategory('Incidentals', false),
      getAddOnProductsByCategory('Countertop Incidentals', false),
      getAddOnProductsByCategory('Countertops Incidentals', false),
      getAddOnProductsByCategory('Incidentals (Countertops)', false),
    ];
    const map: Record<string, { id: string; name: string; price: number; image: string; tds: string }> = {};
    lists.flat().forEach(item => { map[item.id] = item; });
    return Object.values(map);
  }, [products, getAddOnProductsByCategory]);
  // Metallic system: Mica Fusion Spray Colors from RCM manufacturer, category: RCM Fuzion Max Spray
  const micaFusionSprayColors = useMemo(() => {
    const lists = [
      getAddOnProductsByCategory('RCM Fuzion Max Spray', false, 'rcm'),
      getAddOnProductsByCategory('RCM Fuzion Max', false, 'rcm'),
      getAddOnProductsByCategory('Mica Fusion Spray Colors', false, 'rcm'),
      getAddOnProductsByCategory('Fuzion Max Spray', false, 'rcm'),
    ];
    const map: Record<string, { id: string; name: string; price: number; image: string; tds: string }> = {};
    lists.flat().forEach(item => { map[item.id] = item; });
    return Object.values(map);
  }, [products, getAddOnProductsByCategory]);

  // Countertops-only material extras (base list; some may be resolved to real products if found)
  type SimpleItem = { id: string; name: string; price: number; image: string; tds: string };
  const countertopMaterialExtras: SimpleItem[] = useMemo(() => ([
    { id: 'ct-sample-board', name: 'Sample Board — Board', price: 25.0, image: '', tds: '' },
    { id: 'ct-metal-base', name: 'Edge Type (materials) — Metal Base — Base Set', price: 138.0, image: '', tds: '' },
    { id: 'ct-mdf-4x8', name: 'MDF 4×8 — Sheet', price: 55.0, image: '', tds: '' },
    { id: 'ct-foamular-4x8', name: 'Foamular 4×8 — Sheet', price: 35.0, image: '', tds: '' },
    { id: 'ct-live-oak-slab', name: 'Live Oak Slab — Piece', price: 125.0, image: '', tds: '' },
    { id: 'ct-custom-wood-slab', name: 'Custom Wood Slab — Piece', price: 0.0, image: '', tds: '' },
    { id: 'ct-custom-piece', name: 'Custom Piece (metal/wood/acrylic) — Piece', price: 0.0, image: '', tds: '' },
  ]), []);

  // Resolve certain countertop materials to actual /products if available (e.g., MDF 4x8, Foamular 4x8)
  type CTResolved = SimpleItem & { editable: boolean };
  const countertopMaterialsResolved: CTResolved[] = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, ' ').trim();
    const hasAll = (s: string, keys: string[]) => {
      const n = normalize(s);
      return keys.every(k => n.includes(k));
    };

    const findByKeywords = (keywords: string[]): any | undefined => {
      // Prefer items that look like sheets or substrates if multiple match
      const matches = products.filter(p => hasAll(p.name || '', keywords));
      if (matches.length === 0) return undefined;
      // Pick the one with an image if possible
      const withImg = matches.find(m => !!m.image_url);
      return withImg || matches[0];
    };

    return countertopMaterialExtras.map(base => {
      // Attempt resolutions for known items
      if (base.id === 'ct-mdf-4x8' || /\bmdf\b/i.test(base.name)) {
        const prod = findByKeywords(['mdf', '4x8']);
        if (prod) {
          return {
            id: prod.id.toString(),
            name: prod.name,
            price: parseFloat(prod.unit_price || '0') || 0,
            image: getProductImageUrl(prod.image_url),
            tds: prod.technical_data_sheet_url || '',
            editable: false,
          } as CTResolved;
        }
      }
      if (base.id === 'ct-foamular-4x8' || /foamular/i.test(base.name)) {
        const prod = findByKeywords(['foamular', '4x8']);
        if (prod) {
          return {
            id: prod.id.toString(),
            name: prod.name,
            price: parseFloat(prod.unit_price || '0') || 0,
            image: getProductImageUrl(prod.image_url),
            tds: prod.technical_data_sheet_url || '',
            editable: false,
          } as CTResolved;
        }
      }
      // Default to custom (editable) item with placeholder image
      return { ...base, editable: true } as CTResolved;
    });
  }, [products, countertopMaterialExtras]);

  // Labor add-ons catalog with default rates and units (shared)

  const effectiveLaborAddOns = useMemo(() => {
    if (selectedSystemGroup === 'countertops-custom') {
      // Merge countertops list with original hourly/time-based items
      const merged = [...countertopLaborAddOns, ...laborAddOns.filter(a => a.group === 'hourly')];
      const map: Record<string, LaborAddOn> = {};
      merged.forEach(it => { map[it.id] = it; });
      return Object.values(map);
    }
    return laborAddOns;
  }, [selectedSystemGroup]);

  // Reset helpers
  const resetLaborRatesToDefaults = () => {
    // Prefer per-user defaults if available
    let defaults: Record<string, number> | null = getCurrentUserData(user?.id, 'calculator.laborDefaultRates', null as any);
    if (!defaults) {
      defaults = {};
      effectiveLaborAddOns.forEach(a => { if (a.unit !== 'percent') defaults![a.id] = a.rate; });
    }
    setLaborRates(defaults || {});
  };

  const resetCountertopMaterialPrices = () => {
    // Remove overrides only for editable countertop materials
    const next = { ...customMaterialPrices } as Record<string, number>;
    countertopMaterialsResolved.filter(it => it.editable).forEach(item => { delete next[item.id]; });
    setCustomMaterialPrices(next);
  };

  // Compute add-on material and labor items and totals using shared helpers
  const materialAddOnItems = useMemo(
    () =>
      buildMaterialAddOnItems({
        crackJointFillers,
        nonSkidAdditives,
        commonlyUsedMaterials,
        micaFusionSprayColors,
        countertopIncidentals,
        countertopMaterialsResolved,
        addOnQuantities,
        customMaterialPrices,
        products: products as any,
        getUnitPrice: getUnitPrice as any,
      }),
    [
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
    ],
  );

  const laborAddOnItems = useMemo(
    () =>
      buildLaborAddOnItems({
        effectiveLaborAddOns,
        addOnQuantities,
        customChargeLabel,
        laborRate,
        laborRates,
      }),
    [effectiveLaborAddOns, addOnQuantities, customChargeLabel, laborRate, laborRates],
  );

  // Build line items list for system materials
  const getProduct = (id: string | null | undefined) =>
    id ? products.find(p => p.id.toString() === id) : undefined;

  // (Removed polishing helpers no longer used in pricing calculations)

  const systemMaterialItems: LineItem[] = useMemo(() => {
    const items: LineItem[] = [];
    const pushItem = (id: string | undefined, qty: number, unit?: string) => {
      if (!id || qty <= 0) return;
      const product = getProduct(id);
      if (!product) return;
      const unitPrice = getUnitPrice(product);
      items.push({
        id: product.id.toString(),
        name: product.name,
        qty,
        unit,
        unitPrice,
        total: unitPrice * qty,
      });
    };

    // Aggregator for affected coats
    const agg: Record<string, { totalGallons: number; packaging: { type: 'box' | 'kit' | 'gallon'; kitGallons?: number; containerGallons?: number } }>
      = {};

    const addAffectedGallons = (id: string | undefined, defaultSpread: number, _role: ComponentRole, isPerKit?: boolean) => {
      if (!id) return;
      const product = getProduct(id);
      if (!product) return;
      const parsedSR = parseSpreadRate((product as any).spread_rate);
      let s0 = (parsedSR && !parsedSR.isRange ? parsedSR.value : undefined) ?? defaultSpread;
      let sAdj = s0;
      if (selectedTier === 'good') sAdj = Math.max(1, Math.round(s0 * (1 / 0.85)));
      else if (selectedTier === 'best') sAdj = Math.max(1, Math.round(s0 * (1 / 1.15)));
      const gallonsNeeded = effectiveSqft / Math.max(1, sAdj);
      const pkg = getPackagingInfo(product, !!isPerKit);
      if (pkg.type === 'box') return; // not aggregated here
      const key = product.id.toString();
      if (!agg[key]) agg[key] = { totalGallons: 0, packaging: pkg };
      agg[key].totalGallons += gallonsNeeded;
    };

    // Use the same quantity engine as material cost for non-affected items
    const addQtyFromCalc = (
      id: string | undefined,
      spread: number,
      isPerKit?: boolean,
      isPigment?: boolean,
      role?: ComponentRole
    ) => {
      if (!id) return;
      const { quantity, unit } = calculateComponentQuantity(id, spread, !!isPerKit, !!isPigment, role);
      pushItem(id, quantity, unit);
    };

    switch (selectedSystem) {
      case 'no-mvb-flake-system':
        if (selectedBasePigment) addQtyFromCalc(selectedBasePigment, noMVBBaseCoatSpreadRate, true, true);
        if (selectedBaseCoat) addAffectedGallons(selectedBaseCoat, noMVBBaseCoatSpreadRate, 'base', true);
        if (selectedFlakeColor) addQtyFromCalc(selectedFlakeColor, noMVBFlakeColorSpreadRate);
        if (selectedTopCoat) addQtyFromCalc(selectedTopCoat, noMVBTopCoatSpreadRate);
        break;
      case 'mvb-flake-system':
        if (selectedMVBBasePigment) addQtyFromCalc(selectedMVBBasePigment, mvbBaseCoatSpreadRate, true, true);
        if (selectedMVBBaseCoat) addAffectedGallons(selectedMVBBaseCoat, mvbBaseCoatSpreadRate, 'base', true);
        if (selectedMVBFlakeColor) addQtyFromCalc(selectedMVBFlakeColor, mvbFlakeColorSpreadRate);
        if (selectedMVBTopCoat) addQtyFromCalc(selectedMVBTopCoat, mvbTopCoatSpreadRate);
        break;
      case 'solid-color-system':
        if (selectedSolidBasePigment) addQtyFromCalc(selectedSolidBasePigment, solidBaseCoatSpreadRate, true, true);
        if (selectedSolidGroutCoat) addAffectedGallons(selectedSolidGroutCoat, solidGroutCoatSpreadRate, 'grout', true);
        if (selectedSolidBaseCoat) addAffectedGallons(selectedSolidBaseCoat, solidBaseCoatSpreadRate, 'base', true);
        if (selectedSolidExtraBaseCoat) addAffectedGallons(selectedSolidExtraBaseCoat, solidExtraBaseCoatSpreadRate, 'extra');
        if (selectedSolidTopCoat) addQtyFromCalc(selectedSolidTopCoat, solidTopCoatSpreadRate);
        break;
      case 'metallic-system':
        if (selectedMetallicBasePigment) addQtyFromCalc(selectedMetallicBasePigment, metallicBaseCoatSpreadRate, true, true);
        if (selectedMetallicGroutCoat) addAffectedGallons(selectedMetallicGroutCoat, metallicGroutCoatSpreadRate, 'grout', true);
        if (selectedMetallicBaseCoat) addAffectedGallons(selectedMetallicBaseCoat, metallicBaseCoatSpreadRate, 'base', true);
        if (selectedMetallicMoneyCoat) addAffectedGallons(selectedMetallicMoneyCoat, metallicMoneyCoatSpreadRate, 'money', true);
        selectedMetallicPigments.forEach(p => pushItem(p.id, p.quantity));
        if (selectedMetallicTopCoat) addQtyFromCalc(selectedMetallicTopCoat, metallicTopCoatSpreadRate);
        break;
      case 'grind-seal-system':
        if (selectedGrindSealPrimer) addQtyFromCalc(selectedGrindSealPrimer, 200);
        if (selectedGrindSealGroutCoat) addQtyFromCalc(selectedGrindSealGroutCoat, grindSealGroutSpreadRate);
        if (selectedGrindSealBaseCoat) addQtyFromCalc(selectedGrindSealBaseCoat, grindSealBaseSpreadRate);
        if (selectedGrindSealIntermediateCoat) addQtyFromCalc(selectedGrindSealIntermediateCoat, grindSealIntermediateCoatSpreadRate);
        if (selectedGrindSealTopCoat) addQtyFromCalc(selectedGrindSealTopCoat, 200);
        if (selectedGrindSealAdditionalTopCoat) addQtyFromCalc(selectedGrindSealAdditionalTopCoat, 200);
        break;
      default:
        if (selectedSystemGroup === 'countertops-custom') {
          if (selectedCountertopPrimer) addQtyFromCalc(selectedCountertopPrimer, 200);
          if (selectedCountertopBasePigment) addQtyFromCalc(selectedCountertopBasePigment, countertopBaseCoatSpreadRate, true);
          if (selectedCountertopMetallicArtCoat) addQtyFromCalc(selectedCountertopMetallicArtCoat, 32); // 4 oz/sq ft = 32 sq ft per gal (for display only)
          selectedCountertopMetallicPigments.forEach(p => pushItem(p.id, p.quantity));
          if (selectedCountertopFloodCoat) addQtyFromCalc(selectedCountertopFloodCoat, 43); // 3 oz/sq ft = 42.67 sq ft per gal (for display only)
          if (selectedCountertopTopCoat) addQtyFromCalc(selectedCountertopTopCoat, 200);
        }
        break;
    }

    // Emit aggregated affected items as combined lines
    Object.entries(agg).forEach(([id, info]) => {
      const product = getProduct(id)!;
      const unitPrice = getUnitPrice(product);
      if (info.packaging.type === 'kit') {
        const kits = Math.ceil(info.totalGallons / Math.max(1, info.packaging.kitGallons || 1));
        items.push({ id, name: product.name, qty: kits, unit: 'kits', unitPrice, total: unitPrice * kits });
      } else if (info.packaging.type === 'gallon') {
        const size = Math.max(1, info.packaging.containerGallons || 1);
        if (size > 1) {
          const containers = Math.ceil(info.totalGallons / size);
          const unit = /pail/i.test(product.name) ? 'pails' : 'gallons';
          items.push({ id, name: product.name, qty: containers, unit, unitPrice, total: unitPrice * containers });
        } else {
          const gallons = Math.ceil(info.totalGallons);
          items.push({ id, name: product.name, qty: gallons, unit: 'gallons', unitPrice, total: unitPrice * gallons });
        }
      }
    });

    return items;
  }, [
    selectedSystem,
    selectedSystemGroup,
    effectiveSqft,
    products,
    selectedTier,
    selectedBasePigment,
    selectedBaseCoat,
    selectedFlakeColor,
    selectedTopCoat,
    selectedMVBBasePigment,
    selectedMVBBaseCoat,
    selectedMVBFlakeColor,
    selectedMVBTopCoat,
    selectedSolidBasePigment,
    selectedSolidGroutCoat,
    selectedSolidBaseCoat,
    selectedSolidExtraBaseCoat,
    selectedSolidTopCoat,
    solidTopCoatSpreadRate,
    selectedMetallicBasePigment,
    selectedMetallicGroutCoat,
    selectedMetallicBaseCoat,
    selectedMetallicMoneyCoat,
    selectedMetallicPigments,
    selectedMetallicTopCoat,
    selectedGrindSealPrimer,
    selectedGrindSealGroutCoat,
    selectedGrindSealBaseCoat,
    selectedGrindSealIntermediateCoat,
    selectedGrindSealTopCoat,
    selectedGrindSealAdditionalTopCoat,
    selectedCountertopPrimer,
    selectedCountertopBasePigment,
    selectedCountertopMetallicArtCoat,
    selectedCountertopMetallicPigments,
    selectedCountertopFloodCoat,
    selectedCountertopTopCoat,
    // Include all spread rate adjusters so price updates live when changed
    noMVBBaseCoatSpreadRate,
    noMVBFlakeColorSpreadRate,
    noMVBTopCoatSpreadRate,
    mvbBaseCoatSpreadRate,
    mvbFlakeColorSpreadRate,
    mvbTopCoatSpreadRate,
    solidGroutCoatSpreadRate,
    solidBaseCoatSpreadRate,
    solidExtraBaseCoatSpreadRate,
    metallicGroutCoatSpreadRate,
    metallicBaseCoatSpreadRate,
    metallicMoneyCoatSpreadRate,
    metallicTopCoatSpreadRate,
    grindSealGroutSpreadRate,
    grindSealBaseSpreadRate,
    grindSealIntermediateCoatSpreadRate,
    countertopBaseCoatSpreadRate,
    countertopMetallicArtCoatSpreadRate,
    countertopMetallicPigmentSpreadRate,
    countertopClearCoatSpreadRate,
  ]);

  // Combined display items (system materials + material add-ons + sundries row if applicable)
  const displayLineItems = useMemo(
    () =>
      buildDisplayLineItems({
        systemMaterialItems,
        materialAddOnItems,
        addOnQuantities,
        sundriesEnabled,
        resultQtyOverrides,
      }),
    [systemMaterialItems, materialAddOnItems, addOnQuantities, sundriesEnabled, resultQtyOverrides],
  );

  // System components summary (selected count and subtotal)
  const systemComponentsSummary = useMemo(
    () => computeSystemComponentsSummary(systemMaterialItems),
    [systemMaterialItems],
  );

  // (moved) buildAffectedAggregatedItemsForTier is defined above to avoid TDZ issues

  // Per-category add-on selections for header badges
  const addOnCategorySummaries = useMemo(() => {
    const sumForSet = (ids: Set<string>) => {
      const subset = materialAddOnItems.filter(it => ids.has(it.id));
      return {
        count: subset.length,
        subtotal: subset.reduce((acc, it) => acc + it.total, 0)
      };
    };
    const makeSet = (arr: { id: string }[]) => new Set(arr.map(i => i.id));
    return {
      crack: sumForSet(makeSet(crackJointFillers)),
      nonskid: sumForSet(makeSet(nonSkidAdditives)),
      common: sumForSet(makeSet(commonlyUsedMaterials)),
      mica: sumForSet(makeSet(micaFusionSprayColors)),
      ctMaterials: sumForSet(makeSet(countertopMaterialsResolved)),
      ctIncidentals: sumForSet(makeSet(countertopIncidentals)),
      labor: {
        count: laborAddOnItems.length,
        subtotal: laborAddOnItems.reduce((acc, it) => acc + it.total, 0)
      }
    };
  }, [materialAddOnItems, laborAddOnItems, crackJointFillers, nonSkidAdditives, commonlyUsedMaterials, micaFusionSprayColors, countertopMaterialsResolved, countertopIncidentals]);

  // Core pricing output (single source of truth for Step 4 pricing)
  const pricingOutput = useMemo(() => {
    return calculatePricing(pricingMethod, {
      areaSqFt: effectiveSqft,
      materialCost: getMaterialCost(),
      laborRatePerHour: laborRate,
      laborHours: totalLaborHours,
      desiredMarginPct: Math.max(0, Math.min(0.99, (profitMargin || 0) / 100)),
      targetPricePerSqFt: Math.max(0, targetPpsf || 0)
    });
  }, [pricingMethod, effectiveSqft, laborRate, totalLaborHours, profitMargin, targetPpsf, getMaterialCost]);

  const calculateRequiredRevenue = (): number => pricingOutput.customerPrice;
  const calculatePricePerSqft = (): number => pricingOutput.pricePerSqFt;
  const calculateAchievedMargin = (): number => pricingOutput.achievedMarginPct * 100;

  // Dev-only guardrail to detect PPSF/area drift
  useEffect(() => {
    if (import.meta.env.PROD) return;
    const area = Number(effectiveSqft) || 0;
    if (area <= 0) return;
    const backCalc = pricingOutput.customerPrice / area;
    const drift = Math.abs(backCalc - pricingOutput.pricePerSqFt);
    if (drift >= 0.005) {
      // eslint-disable-next-line no-console
      console.warn('PPSF and price/area mismatch', { area, price: pricingOutput.customerPrice, ppsf: pricingOutput.pricePerSqFt, backCalc, drift });
    }
  }, [pricingOutput.customerPrice, pricingOutput.pricePerSqFt, effectiveSqft]);

  // Load business logo on mount
  useEffect(() => {
    try {
      const logo = localStorage.getItem('business.logoUrl');
      if (logo) setBusinessLogoUrl(logo);
    } catch { }
  }, []);

  // Helper to get current tier selection
  const getCurrentTier = (): 'good' | 'better' | 'best' => {
    return selectedTier || 'better';
  };

  // Map system type to service name for estimates
  const getServiceNameForSystem = (systemType: string): string => {
    const systemToService: Record<string, string> = {
      'no-mvb-flake-system': 'Epoxy Flake System',
      'mvb-flake-system': 'MVB Flake System',
      'solid-color-system': 'Solid Color Epoxy',
      'metallic-system': 'Metallic Epoxy System',
      'grind-seal-system': 'Grind and Seal',
      'countertop-system': 'Countertop Installation',
    };
    return systemToService[systemType] || 'Epoxy System Installation';
  };

  // Create estimate services from calculator data
  const createEstimateServices = (): EstimateService[] => {
    if (!hasCalculated) return [];

    const pricePerSqFt = calculatePricePerSqft();
    const serviceName = getServiceNameForSystem(selectedSystem);
    const tier = getCurrentTier();
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

    return [
      {
        id: crypto.randomUUID(),
        name: serviceName,
        price: pricePerSqFt,
        qty: effectiveSqft,
        unit: selectedSystemGroup === 'countertop' ? 'sq ft' : 'sq ft',
        description: `${tierLabel} tier option\nSystem: ${selectedSystem}\n${selectedSystemGroup === 'countertop' ? 'Countertop' : 'Square footage'}: ${effectiveSqft.toFixed(1)} sq ft`,
        taxable: true,
      },
    ];
  };

  // Handle create estimate button click
  const handleCreateEstimate = async () => {
    if (!hasCalculated) {
      notifications.show({
        title: 'No calculation',
        message: 'Please complete a calculation first',
        color: 'red',
      });
      return;
    }

    // Store pre-populated services in sessionStorage for the modal to pick up
    const services = createEstimateServices();
    const notes = `System: ${selectedSystem}\nManufacturer: ${availableManufacturers.find(m => m.id === selectedManufacturer)?.name || selectedManufacturer}\n${selectedSystemGroup === 'countertop' ? 'Countertop' : 'Square footage'}: ${effectiveSqft.toFixed(1)} sq ft\nTier: ${getCurrentTier()}`;

    try {
      sessionStorage.setItem('newEstimate.prefillServices', JSON.stringify(services));
      sessionStorage.setItem('newEstimate.prefillNotes', notes);

      // Pass client data if available
      if (selectedClientId && selectedClientName) {
        const clientData = {
          id: selectedClientId,
          name: selectedClientName
        };
        sessionStorage.setItem('newEstimate.prefillClient', JSON.stringify(clientData));
      }
    } catch (error) {
      console.error('Failed to store prefill data:', error);
    }

    // Open estimate modal
    setEstimateModalOpen(true);
  };

  // Handle estimate saved
  const handleEstimateSaved = (estimateId: string) => {
    setEstimateModalOpen(false);
    notifications.show({
      title: 'Estimate Created',
      message: `Estimate has been created successfully`,
      color: 'green',
    });
    // Navigate to estimate details
    setLocation(`/estimates/${estimateId}`);
  };

  // Build a document-friendly snapshot for P&L and Order Request (materials only for lineItems)
  const buildBidSnapshot = useCallback((): DocBidSnapshot | null => {
    if (!hasCalculated) return null;
    const sundriesPercent = addOnQuantities['sundries'] ?? 5;
    const baseMaterialsSubtotal = [...systemMaterialItems, ...materialAddOnItems].reduce((acc, it) => acc + it.total, 0);
    const manualDelta = (() => {
      const baseMap: Record<string, { qty: number; unitPrice: number }> = {};
      [...systemMaterialItems, ...materialAddOnItems].forEach(it => {
        baseMap[it.id] = { qty: it.qty, unitPrice: it.unitPrice };
      });
      let delta = 0;
      Object.entries(resultQtyOverrides).forEach(([id, overrideQty]) => {
        const base = baseMap[id];
        if (!base || !Number.isFinite(overrideQty)) return;
        delta += (Number(overrideQty) - base.qty) * base.unitPrice;
      });
      return delta;
    })();
    const adjustedMaterialsSubtotal = baseMaterialsSubtotal + manualDelta;
    const includeSundries = sundriesEnabled && sundriesPercent > 0 && adjustedMaterialsSubtotal > 0;

    const toDocLine = (it: LineItem): DocLineItem => {
      const prod = products.find(p => p.id.toString() === it.id);
      return {
        id: it.id,
        name: it.name,
        qty: Number(it.qty) || 0,
        unit: it.unit,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.total) || 0,
        manufacturer: prod?.manufacturer || undefined,
        sku: prod?.sku || undefined,
        imageUrl: prod?.image_url || undefined,
        tdsUrl: (prod as any)?.technical_data_sheet_url || undefined,
      };
    };

    const materialItems: DocLineItem[] = [
      ...systemMaterialItems.map(toDocLine),
      ...materialAddOnItems.map(toDocLine),
      ...(includeSundries ? [{
        id: 'sundries', name: `Sundries (${sundriesPercent}% of materials)`, qty: 1, unit: undefined,
        unitPrice: (sundriesPercent / 100) * adjustedMaterialsSubtotal,
        total: (sundriesPercent / 100) * adjustedMaterialsSubtotal,
        manufacturer: undefined, sku: undefined, imageUrl: undefined, tdsUrl: undefined
      } as DocLineItem] : [])
    ];

    const materialCost = materialItems.reduce((a, b) => a + (b.total || 0), 0);
    const laborCost = calculateLaborCost();
    const revenue = calculateRequiredRevenue();

    const snapshot: DocBidSnapshot = {
      id: undefined,
      project: {
        name: undefined,
        surfaceHardness: selectedSurfaceHardness || undefined,
        squareFootage: effectiveSqft || 0,
        clientName: undefined,
      },
      systemType: selectedSystem || undefined,
      lineItems: materialItems,
      pricing: {
        totalCost: { amount: revenue },
        materialCost: { amount: materialCost },
        laborCost: { amount: laborCost },
        profit: { amount: revenue - (materialCost + laborCost) },
        ppsf: { amount: Number(pricingOutput.pricePerSqFt) || 0 },
        coverageAreaSqFt: Number(effectiveSqft) || 0,
        laborHours: Number(totalLaborHours) || 0,
      },
    };
    return snapshot;
  }, [hasCalculated, addOnQuantities, sundriesEnabled, systemMaterialItems, materialAddOnItems, resultQtyOverrides, products, calculateLaborCost, calculateRequiredRevenue, selectedSurfaceHardness, effectiveSqft, selectedSystem, pricingOutput.pricePerSqFt, totalLaborHours]);

  // Removed tierPricing cards in favor of compact radio chips; totals still computed on demand

  // Tier helpers for live explainer and per-tier pricing
  type TierKey = 'good' | 'better' | 'best';
  const tierSpread = useCallback((s0: number, tier: TierKey): number => {
    // Good = 15% less material (increase spread by 1/0.85)
    // Best = 15% more material (decrease spread by 1/1.15)
    if (tier === 'good') return Math.max(1, Math.round(s0 * (1 / 0.85)));
    if (tier === 'best') return Math.max(1, Math.round(s0 * (1 / 1.15)));
    return Math.max(1, Math.round(s0));
  }, []);

  // Affected coat default spreads (S0) for current system and selections
  const affectedDefaultSpreads = useMemo(() => {
    const s0s: number[] = [];
    switch (selectedSystem) {
      case 'no-mvb-flake-system':
        if (selectedBaseCoat) s0s.push(noMVBBaseCoatSpreadRate);
        break;
      case 'mvb-flake-system':
        if (selectedMVBBaseCoat) s0s.push(mvbBaseCoatSpreadRate);
        break;
      case 'solid-color-system':
        if (selectedSolidGroutCoat) s0s.push(solidGroutCoatSpreadRate);
        if (selectedSolidBaseCoat) s0s.push(solidBaseCoatSpreadRate);
        if (selectedSolidExtraBaseCoat) s0s.push(solidExtraBaseCoatSpreadRate);
        break;
      case 'metallic-system':
        if (selectedMetallicGroutCoat) s0s.push(metallicGroutCoatSpreadRate);
        if (selectedMetallicBaseCoat) s0s.push(metallicBaseCoatSpreadRate);
        if (selectedMetallicMoneyCoat) s0s.push(metallicMoneyCoatSpreadRate);
        break;
      default:
        break;
    }
    return s0s;
  }, [
    selectedSystem,
    selectedBaseCoat,
    selectedMVBBaseCoat,
    selectedSolidGroutCoat,
    selectedSolidBaseCoat,
    selectedSolidExtraBaseCoat,
    selectedMetallicGroutCoat,
    selectedMetallicBaseCoat,
    selectedMetallicMoneyCoat,
    noMVBBaseCoatSpreadRate,
    mvbBaseCoatSpreadRate,
    solidGroutCoatSpreadRate,
    solidBaseCoatSpreadRate,
    solidExtraBaseCoatSpreadRate,
    metallicGroutCoatSpreadRate,
    metallicBaseCoatSpreadRate,
    metallicMoneyCoatSpreadRate,
  ]);

  // Build affected system material items for a given tier (only coats impacted by tiering)
  const buildAffectedAggregatedItemsForTier = useCallback((tier: 'good' | 'better' | 'best'): LineItem[] => {
    const items: LineItem[] = [];

    const addAffectedGallonsTiered = (
      id: string | undefined,
      defaultSpread: number,
      isPerKit?: boolean
    ) => {
      if (!id) return null;
      const product = getProduct(id);
      if (!product) return null;
      const parsedSR = parseSpreadRate((product as any).spread_rate);
      const s0 = (parsedSR && !parsedSR.isRange ? parsedSR.value : undefined) ?? defaultSpread;
      let sAdj = s0;
      if (tier === 'good') sAdj = Math.max(1, Math.round(s0 * (1 / 0.85)));
      else if (tier === 'best') sAdj = Math.max(1, Math.round(s0 * (1 / 1.15)));
      const gallonsNeeded = effectiveSqft / Math.max(1, sAdj);
      const pkg = getPackagingInfo(product, !!isPerKit);
      if (pkg.type === 'box') return null; // boxes unaffected here
      return { product, gallonsNeeded, pkg } as const;
    };

    const agg: Record<string, { totalGallons: number; packaging: { type: 'box' | 'kit' | 'gallon'; kitGallons?: number; containerGallons?: number } }>
      = {};
    const consumeAffected = (id: string | undefined, spread: number, isPerKit?: boolean) => {
      const info = addAffectedGallonsTiered(id, spread, isPerKit);
      if (!info) return;
      const key = info.product.id.toString();
      if (!agg[key]) agg[key] = { totalGallons: 0, packaging: info.pkg };
      agg[key].totalGallons += info.gallonsNeeded;
    };

    switch (selectedSystem) {
      case 'no-mvb-flake-system':
        consumeAffected(selectedBaseCoat, noMVBBaseCoatSpreadRate, true);
        break;
      case 'mvb-flake-system':
        consumeAffected(selectedMVBBaseCoat, mvbBaseCoatSpreadRate, true);
        break;
      case 'solid-color-system':
        consumeAffected(selectedSolidGroutCoat, solidGroutCoatSpreadRate, true);
        consumeAffected(selectedSolidBaseCoat, solidBaseCoatSpreadRate, true);
        consumeAffected(selectedSolidExtraBaseCoat, solidExtraBaseCoatSpreadRate, false);
        break;
      case 'metallic-system':
        consumeAffected(selectedMetallicGroutCoat, metallicGroutCoatSpreadRate, true);
        consumeAffected(selectedMetallicBaseCoat, metallicBaseCoatSpreadRate, true);
        // Money coat must be kits
        consumeAffected(selectedMetallicMoneyCoat, metallicMoneyCoatSpreadRate, true);
        break;
      case 'grind-seal-system':
        consumeAffected(selectedGrindSealGroutCoat, grindSealGroutSpreadRate, false);
        consumeAffected(selectedGrindSealBaseCoat, grindSealBaseSpreadRate, false);
        consumeAffected(selectedGrindSealIntermediateCoat, grindSealIntermediateCoatSpreadRate, false);
        break;
      default:
        // Countertops not tiered
        break;
    }

    Object.entries(agg).forEach(([id, info]) => {
      const product = getProduct(id)!;
      const unitPrice = getUnitPrice(product);
      if (info.packaging.type === 'kit') {
        const kits = Math.ceil(info.totalGallons / Math.max(1, info.packaging.kitGallons || 1));
        items.push({ id, name: product.name, qty: kits, unit: 'kits', unitPrice, total: unitPrice * kits });
      } else if (info.packaging.type === 'gallon') {
        const size = Math.max(1, info.packaging.containerGallons || 1);
        if (size > 1) {
          const containers = Math.ceil(info.totalGallons / size);
          const unit = /pail/i.test(product.name) ? 'pails' : 'gallons';
          items.push({ id, name: product.name, qty: containers, unit, unitPrice, total: unitPrice * containers });
        } else {
          const gallons = Math.ceil(info.totalGallons);
          items.push({ id, name: product.name, qty: gallons, unit: 'gallons', unitPrice, total: unitPrice * gallons });
        }
      }
    });

    return items;
  }, [
    selectedSystem,
    effectiveSqft,
    selectedBaseCoat,
    noMVBBaseCoatSpreadRate,
    selectedMVBBaseCoat,
    mvbBaseCoatSpreadRate,
    selectedSolidGroutCoat,
    solidGroutCoatSpreadRate,
    selectedSolidBaseCoat,
    solidBaseCoatSpreadRate,
    selectedSolidExtraBaseCoat,
    solidExtraBaseCoatSpreadRate,
    selectedMetallicGroutCoat,
    metallicGroutCoatSpreadRate,
    selectedMetallicBaseCoat,
    metallicBaseCoatSpreadRate,
    selectedMetallicMoneyCoat,
    metallicMoneyCoatSpreadRate,
    selectedGrindSealGroutCoat,
    grindSealGroutSpreadRate,
    selectedGrindSealBaseCoat,
    grindSealBaseSpreadRate,
    selectedGrindSealIntermediateCoat,
    grindSealIntermediateCoatSpreadRate,
    products
  ]);

  const tierMaterialsCost = useCallback((tier: TierKey) => {
    // For the currently selected tier, use the same exact materials source as the table (includes overrides + sundries)
    if (tier === selectedTier) {
      return getMaterialCost();
    }

    // For other tiers, reuse the displayed non-affected items and swap in the affected coat quantities aggregated for that tier
    const affectedForSelected = buildAffectedAggregatedItemsForTier(selectedTier);
    const affectedIds = new Set(affectedForSelected.map(i => i.id));

    const nonAffectedSystemItems = systemMaterialItems.filter(it => !affectedIds.has(it.id));
    const affectedForTier = buildAffectedAggregatedItemsForTier(tier);

    // Base materials subtotal = (non-affected system items for current display) + (affected items recomputed for target tier) + (material add-ons)
    const baseMaterialsSubtotal = [
      ...nonAffectedSystemItems,
      ...affectedForTier,
      ...materialAddOnItems
    ].reduce((acc, it) => acc + it.total, 0);

    // Apply sundries percent to materials subtotal
    const sundriesPercent = addOnQuantities['sundries'] ?? 5;
    const sundriesAmount = sundriesEnabled && sundriesPercent > 0 && baseMaterialsSubtotal > 0
      ? (sundriesPercent / 100) * baseMaterialsSubtotal
      : 0;
    return baseMaterialsSubtotal + sundriesAmount;
  }, [
    selectedTier,
    getMaterialCost,
    systemMaterialItems,
    materialAddOnItems,
    addOnQuantities,
    sundriesEnabled,
  ]);

  const tierPricing = useMemo(() => {
    const make = (tier: TierKey) => calculatePricing(pricingMethod, {
      areaSqFt: effectiveSqft,
      materialCost: tierMaterialsCost(tier),
      laborRatePerHour: laborRate,
      laborHours: totalLaborHours,
      desiredMarginPct: Math.max(0, Math.min(0.99, (profitMargin || 0) / 100)),
      targetPricePerSqFt: Math.max(0, targetPpsf || 0)
    });
    return {
      good: make('good'),
      better: make('better'),
      best: make('best'),
    } as const;
  }, [pricingMethod, effectiveSqft, tierMaterialsCost, laborRate, totalLaborHours, profitMargin, targetPpsf, calculatePricing]);

  // Removed average spread display to simplify UI; keep build delta explainer only

  const buildDeltaPctSelectedTier = useMemo(() => {
    const s0s = affectedDefaultSpreads;
    if (s0s.length === 0) return 0;
    const deltas = s0s.map((s0) => (s0 / tierSpread(s0, selectedTier)) - 1);
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const clamped = Math.max(-0.4, Math.min(0.4, avg));
    return clamped * 100; // percent
  }, [affectedDefaultSpreads, selectedTier, tierSpread]);

  const canCalculate = selectedManufacturer &&
    selectedSystemGroup &&
    selectedSystem &&
    effectiveSqft > 0;

  // Stage gating: area -> hardness -> pricing
  const hasArea = effectiveSqft > 0;
  const pricingUnlocked = hasArea;
  // Steps 1–3 complete: require manufacturer, system group, system, and area (+ hardness if resin)
  const steps123Complete = !!selectedManufacturer && !!selectedSystemGroup && !!selectedSystem && hasArea;

  const handleCalculate = () => {
    if (!canCalculate) return;

    const calculation = {
      manufacturer: selectedManufacturer,
      systemGroup: selectedSystemGroup,
      system: selectedSystem,
      surfaceHardness: selectedSurfaceHardness,
      dimensions,
      totalSqft: effectiveSqft,
      pricingMethod,
      profitMargin,
      laborRate,
      totalLaborHours,
      materialCost: getMaterialCost(),
      laborCost: calculateLaborCost(),
      totalCost: calculateTotalCost(),
      requiredRevenue: calculateRequiredRevenue(),
      pricePerSqft: calculatePricePerSqft(),
      achievedMargin: calculateAchievedMargin()
    };

    // Set calculation as completed to show additional sections
    setHasCalculated(true);
    // Advance rotating suggestions per system key
    setSuggestionCycle({
      ...suggestionCycle,
      [suggestionKey]: ((suggestionCycle?.[suggestionKey] || 0) + 1)
    });

    notifications.show({
      title: 'Calculation Complete',
      message: `Total project cost: $${calculation.requiredRevenue.toFixed(2)} (${calculation.pricePerSqft.toFixed(2)}/sq ft)`,
      color: 'blue'
    });
  };

  const { applyMetallicMixAssistant, applyCountertopMixAssistant } = useMetallicMixAssistants({
    selectedSystem,
    selectedSystemGroup,
    effectiveSqft,
    products,
    selectedMetallicMoneyCoat,
    metallicMoneyCoatSpreadRate,
    selectedMetallicPigments,
    setSelectedMetallicPigments,
    selectedCountertopMetallicArtCoat,
    countertopMetallicPigmentSpreadRate,
    selectedCountertopMetallicPigments,
    setSelectedCountertopMetallicPigments,
  });

  // Removed enablePrimer quick action; soft slab now shows a suggestion only

  const {
    mergedSuggestions,
    suggestionQty,
    setSuggestionQty,
    findAddOnByName,
  } = useAddOnSuggestions({
    selectedSystem,
    selectedSystemGroup,
    effectiveSqft,
    commonlyUsedMaterials,
    countertopIncidentals,
    suggestionCycle,
    suggestionKey,
    hasCalculated,
  });

  // (removed duplicate buildAffectedAggregatedItemsForTier; single definition moved earlier)

  const affectedSelectedTierItems = useMemo(() => buildAffectedAggregatedItemsForTier(selectedTier), [buildAffectedAggregatedItemsForTier, selectedTier]);
  const affectedBetterTierItems = useMemo(() => buildAffectedAggregatedItemsForTier('better'), [buildAffectedAggregatedItemsForTier]);

  const affectedSelectedMap = useMemo(() => new Map(affectedSelectedTierItems.map(i => [i.id, i])), [affectedSelectedTierItems]);
  const affectedBetterMap = useMemo(() => new Map(affectedBetterTierItems.map(i => [i.id, i])), [affectedBetterTierItems]);

  const handleConfirmReset = () => {
    try {
      localStorage.removeItem('uc.lastSnapshot');
      localStorage.removeItem('calculatorDraft.v1');
    } catch { }
    setSelectedManufacturer('');
    setSelectedSystemGroup('');
    setSelectedSystem('');
    setSelectedSurfaceHardness('');
    setTotalSqft(0);
    setDimensions({ length: 0, width: 0 });
    setPricingMethod('MARGIN_BASED');
    setProfitMargin(50);
    setLaborRate(55);
    setTotalLaborHours(0);
    setHasCalculated(false);
    setResultQtyOverrides({});
    setTargetPpsf(0);
    setCatalogOpen(false);
    setCatalogQuery('');
    setCatalogCategory(null);
    setCatalogManu(null);
    setCatalogLimit(24);
    calculatorDraftActions.reset('userReset');
    notifications.show({ title: 'Reset Complete', message: 'Universal Calculator restored to defaults.', color: 'green' });
    window.history.replaceState({}, document.title, '/');
    setResetConfirmOpen(false);
  };

  return (
    <AppLayout>
      <ResetCalculatorModal
        opened={resetConfirmOpen}
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
      />
      <Container size="xl" py="md" px={"md"} fluid>
        {/* Header */}
        <PageHeader
          title="Universal Calculator"
          subtitle="Select products, adjust spreads and labor—real pricing, TDS, and product info included."
          rightSection={
            <Button
              size="xs"
              variant="white"
              color="red"
              onClick={() => setResetConfirmOpen(true)}
            >
              Reset
            </Button>
          }
        />

        {/* Sticky Mode Bar + Summary (mode indicated, toggled by header tabs below) */}
        <SummaryBar
          uiMode={uiMode}
          effectiveSqft={effectiveSqft}
          getMaterialCost={getMaterialCost}
          calculateLaborCost={calculateLaborCost}
          calculateTotalCost={calculateTotalCost}
          calculatePricePerSqft={calculatePricePerSqft}
          calculateAchievedMargin={calculateAchievedMargin}
        />

        {/* Removed dev-only products loaded banner for production UI */}

        {/* 4-Column Step Layout */}
        <Grid gutter="lg" mb="xl">
          {/* Step 1: Select Manufacturer */}
          <ManufacturerStepCol
            selectedManufacturer={selectedManufacturer}
            setSelectedManufacturer={setSelectedManufacturer}
            availableManufacturers={availableManufacturers}
            apiManufacturers={apiManufacturers}
            getImageUrl={getImageUrl}
            resetSystemComponentSelections={resetSystemComponentSelections}
          />

          {/* Step 2: Select System */}
          <SystemStepCol
            selectedManufacturer={selectedManufacturer}
            selectedSystemGroup={selectedSystemGroup}
            setSelectedSystemGroup={setSelectedSystemGroup}
            selectedSystem={selectedSystem}
            setSelectedSystem={setSelectedSystem}
            availableSystems={availableSystems}
            availableManufacturers={availableManufacturers}
            products={products}
            resetSystemComponentSelections={resetSystemComponentSelections}
          />

          {/* Step 3: Area & Surface Details */}
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <AreaAndSurfaceStep
              selectedSystemGroup={selectedSystemGroup}
              countertopMode={countertopMode}
              setCountertopMode={setCountertopMode}
              countertopPieces={countertopPieces}
              setCountertopPieces={setCountertopPieces}
              countertopDirectSurface={countertopDirectSurface}
              setCountertopDirectSurface={setCountertopDirectSurface}
              countertopDirectEdge={countertopDirectEdge}
              setCountertopDirectEdge={setCountertopDirectEdge}
              countertopDirectBacksplash={countertopDirectBacksplash}
              setCountertopDirectBacksplash={setCountertopDirectBacksplash}
              countertopEdgeLf={countertopEdgeLf}
              countertopBacksplashLf={countertopBacksplashLf}
              dimensions={dimensions}
              setDimensions={(next) => setDimensions(next)}
              calculatedSqft={calculatedSqft}
              totalSqft={totalSqft}
              setTotalSqft={setTotalSqft}
              quickPresets={quickPresets}
              editingPresetId={editingPresetId}
              setEditingPresetId={setEditingPresetId}
              editingPresetValue={editingPresetValue}
              setEditingPresetValue={setEditingPresetValue}
              updatePreset={updatePreset}
              selectedSurfaceHardness={selectedSurfaceHardness}
              setSelectedSurfaceHardness={setSelectedSurfaceHardness}
              hasArea={hasArea}
            />
          </Grid.Col>

          {/* Step 4: Pricing */}
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <PricingControlsSection
              pricingUnlocked={pricingUnlocked}
              hasArea={hasArea}
              pricingMethod={pricingMethod}
              setPricingMethod={setPricingMethod}
              profitMargin={profitMargin}
              setProfitMargin={setProfitMargin}
              laborRate={laborRate}
              setLaborRate={setLaborRate}
              totalLaborHours={totalLaborHours}
              setTotalLaborHours={setTotalLaborHours}
              targetPpsf={targetPpsf}
              setTargetPpsf={setTargetPpsf}
              effectiveSqft={effectiveSqft}
              getMaterialCost={getMaterialCost}
              calculateLaborCost={calculateLaborCost}
              calculateTotalCost={calculateTotalCost}
              calculateRequiredRevenue={calculateRequiredRevenue}
              calculatePricePerSqft={calculatePricePerSqft}
              calculateAchievedMargin={calculateAchievedMargin}
              showCalculateInStep4={showCalculateInStep4}
              canCalculate={canCalculate}
              handleCalculate={handleCalculate}
              selectedSystemGroup={selectedSystemGroup}
            />
          </Grid.Col>
        </Grid>

        {/* Split: System Components (left) + Add-On Options (right) */}
        <section className="uc-split" aria-label="System Components and Add-On Options">
          <div id="uc-components" className="space-y-4">
            <SystemComponentsSection
              systemMaterialItems={systemMaterialItems}
              summary={systemComponentsSummary}
              effectiveSqft={effectiveSqft}
            />
          </div>
          <aside id="uc-addons" className="space-y-4">
            <AddOnOptionsSection
              steps123Complete={steps123Complete}
              selectedSystemGroup={selectedSystemGroup}
              addOnCategorySummaries={addOnCategorySummaries}
              effectiveLaborAddOns={effectiveLaborAddOns}
              sundriesEnabled={sundriesEnabled}
              setSundriesEnabled={setSundriesEnabled}
              addOnQuantities={addOnQuantities}
              setAddOnQuantities={setAddOnQuantities}
              laborRates={laborRates}
              setLaborRates={setLaborRates}
              customChargeLabel={customChargeLabel}
              setCustomChargeLabel={setCustomChargeLabel}
              crackJointFillers={crackJointFillers}
              nonSkidAdditives={nonSkidAdditives}
              commonlyUsedMaterials={commonlyUsedMaterials}
              countertopIncidentals={countertopIncidentals}
              mergedSuggestions={mergedSuggestions}
              suggestionQty={suggestionQty}
              setSuggestionQty={setSuggestionQty}
              effectiveSqft={effectiveSqft}
              resetLaborRatesToDefaults={resetLaborRatesToDefaults}
              findAddOnByName={findAddOnByName}
              toggleFav={toggleFav}
              favSkus={favSkus}
              getProductImageUrl={getProductImageUrl}
              ThumbImg={ThumbImg}
              LaborThumb={LaborThumb}
              setCatalogOpen={setCatalogOpen}
              handleCalculate={handleCalculate}
              canCalculate={canCalculate}
            />
          </aside>
        </section>

        <ProductCatalogModal
          opened={catalogOpen}
          onClose={() => setCatalogOpen(false)}
          products={products as any}
          selectedManufacturerName={selectedManufacturerName}
          catalogQuery={catalogQuery}
          setCatalogQuery={setCatalogQuery}
          catalogCategory={catalogCategory}
          setCatalogCategory={setCatalogCategory}
          catalogManu={catalogManu}
          setCatalogManu={setCatalogManu}
          catalogLimit={catalogLimit}
          setCatalogLimit={setCatalogLimit}
          addOnQuantities={addOnQuantities}
          setAddOnQuantities={setAddOnQuantities}
          getUnitPrice={getUnitPrice as any}
          getProductImageUrl={getProductImageUrl}
          ThumbImg={ThumbImg}
        />

        <CalculationResultsSection
          hasCalculated={hasCalculated}
          selectedTier={selectedTier}
          setSelectedTier={setSelectedTier}
          affectedDefaultSpreads={affectedDefaultSpreads}
          buildDeltaPctSelectedTier={buildDeltaPctSelectedTier}
          tierPricing={tierPricing}
          fmtMoney={fmtMoney}
          fmtPpsf={fmtPpsf}
          displayLineItems={displayLineItems}
          products={products}
          getProductImageUrl={getProductImageUrl}
          resultQtyOverrides={resultQtyOverrides}
          setResultQtyOverrides={setResultQtyOverrides}
          affectedSelectedMap={affectedSelectedMap}
          affectedBetterMap={affectedBetterMap}
          ThumbImg={ThumbImg}
          LaborThumb={LaborThumb}
          effectiveSqft={effectiveSqft}
          laborRate={laborRate}
          totalLaborHours={totalLaborHours}
          getMaterialCost={getMaterialCost}
          calculateLaborCost={calculateLaborCost}
          calculateTotalCost={calculateTotalCost}
          calculateRequiredRevenue={calculateRequiredRevenue}
          calculatePricePerSqft={calculatePricePerSqft}
          calculateAchievedMargin={calculateAchievedMargin}
          handleCreateEstimate={handleCreateEstimate}
          editingBidId={editingBidId}
          setPendingOrderSheet={setPendingOrderSheet}
          setLocation={setLocation}
          saveBidModalOpen={saveBidModalOpen}
          setSaveBidModalOpen={setSaveBidModalOpen}
          submitAttempted={submitAttempted}
          setSubmitAttempted={setSubmitAttempted}
          bidName={bidName}
          setBidName={setBidName}
          bidDescription={bidDescription}
          setBidDescription={setBidDescription}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
          selectedClientName={selectedClientName}
          setSelectedClientName={setSelectedClientName}
          isSavingBid={isSavingBid}
          setIsSavingBid={setIsSavingBid}
          pendingOrderSheet={pendingOrderSheet}
          buildBidSnapshot={buildBidSnapshot}
          snapshotToItems={snapshotToItems}
          pricingOutput={pricingOutput}
          draft={draft}
          toDraftPricingMethod={toDraftPricingMethod}
          pricingMethod={pricingMethod}
          selectedSystemGroup={selectedSystemGroup}
          selectedSystem={selectedSystem}
          selectedManufacturer={selectedManufacturer}
          selectedManufacturerName={selectedManufacturerName}
          apiManufacturers={apiManufacturers}
          selectedSurfaceHardness={selectedSurfaceHardness}
          profitMargin={profitMargin}
          targetPpsf={targetPpsf}
          hasCalculatedState={hasCalculated}
          systemComponentSelections={{
            selectedBasePigment,
            selectedBaseCoat,
            selectedFlakeColor,
            selectedTopCoat,
            selectedMVBBasePigment,
            selectedMVBBaseCoat,
            selectedMVBFlakeColor,
            selectedMVBTopCoat,
            selectedSolidBasePigment,
            selectedSolidGroutCoat,
            selectedSolidBaseCoat,
            selectedSolidExtraBaseCoat,
            selectedSolidTopCoat,
            selectedMetallicBasePigment,
            selectedMetallicGroutCoat,
            selectedMetallicBaseCoat,
            selectedMetallicMoneyCoat,
            selectedMetallicPigments,
            selectedMetallicTopCoat,
            selectedGrindSealPrimer,
            selectedGrindSealGroutCoat,
            selectedGrindSealBaseCoat,
            selectedGrindSealIntermediateCoat,
            selectedGrindSealTopCoat,
            selectedGrindSealAdditionalTopCoat,
            selectedCountertopPrimer,
            selectedCountertopBasePigment,
            selectedCountertopMetallicArtCoat,
            selectedCountertopMetallicPigments,
            selectedCountertopFloodCoat,
            selectedCountertopTopCoat,
          }}
          spreadRates={{
            noMVBBasePigmentSpreadRate,
            noMVBBaseCoatSpreadRate,
            noMVBFlakeColorSpreadRate,
            noMVBTopCoatSpreadRate,
            mvbBasePigmentSpreadRate,
            mvbBaseCoatSpreadRate,
            mvbFlakeColorSpreadRate,
            mvbTopCoatSpreadRate,
            solidBasePigmentSpreadRate,
            solidGroutCoatSpreadRate,
            solidBaseCoatSpreadRate,
            solidExtraBaseCoatSpreadRate,
            solidTopCoatSpreadRate,
            metallicBasePigmentSpreadRate,
            metallicGroutCoatSpreadRate,
            metallicBaseCoatSpreadRate,
            metallicMoneyCoatSpreadRate,
            metallicTopCoatSpreadRate,
            grindSealGroutSpreadRate,
            grindSealBaseSpreadRate,
            grindSealIntermediateCoatSpreadRate,
            countertopBaseCoatSpreadRate,
            countertopMetallicArtCoatSpreadRate,
            countertopClearCoatSpreadRate,
            countertopMetallicPigmentSpreadRate,
          }}
          addOnQuantities={addOnQuantities}
          customMaterialPrices={customMaterialPrices}
          laborRates={laborRates}
          sundriesEnabled={sundriesEnabled}
          suggestionCycle={suggestionCycle}
          customChargeLabel={customChargeLabel}
          countertopConfig={{
            countertopMode,
            countertopPieces,
            countertopDirectSurface,
            countertopDirectEdge,
            countertopDirectBacksplash,
          }}
          dimensions={dimensions}
          totalSqft={totalSqft}
          apiPost={apiPost}
          apiPut={apiPut}
          buildSavedBidPayload={buildSavedBidPayload}
        />

        <PostCalculationDetails
          hasCalculated={hasCalculated}
          selectedSystemGroup={selectedSystemGroup}
          selectedSystem={selectedSystem}
          products={products}
          selectedMetallicBasePigment={selectedMetallicBasePigment}
          selectedMetallicBaseCoat={selectedMetallicBaseCoat}
          selectedMetallicPigments={selectedMetallicPigments}
          selectedMetallicTopCoat={selectedMetallicTopCoat}
          selectedCountertopPrimer={selectedCountertopPrimer}
          selectedCountertopMetallicArtCoat={selectedCountertopMetallicArtCoat}
          selectedCountertopMetallicPigments={selectedCountertopMetallicPigments}
          selectedCountertopTopCoat={selectedCountertopTopCoat}
          effectiveSqft={effectiveSqft}
          availableManufacturers={availableManufacturers}
          selectedManufacturer={selectedManufacturer}
          onApplyMetallicMix={applyMetallicMixAssistant}
          onApplyCountertopMix={applyCountertopMixAssistant}
        />

      </Container>

      {/* Estimate Modal */}
      {hasCalculated && (
        <NewEstimateModal
          opened={estimateModalOpen}
          onClose={() => setEstimateModalOpen(false)}
          onSaved={handleEstimateSaved}
          businessLogoUrl={businessLogoUrl}
        />
      )}
    </AppLayout>
  );
}
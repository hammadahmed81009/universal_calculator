import { useState, useMemo, useEffect, useCallback } from 'react';
import { calculateCountertopMaterial, isCountertopCategory } from '../utils/countertopCalculations';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  Stack,
  Text,
  Select,
  Box,
  Grid,
  NumberInput,
  Divider,
  Radio,
  Accordion,
  Badge,
  Table,
  TextInput,
  Switch,
  SimpleGrid,
  Modal,
  Image,
  Textarea
} from '@mantine/core';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  IconCalculator,
  IconInfoCircle,
  IconClockHour3,
  IconRoad,
  IconRulerMeasure,
  IconReceipt2,
  IconSparkles,
} from '@tabler/icons-react';
import { useQuickPresets } from '../hooks/useQuickPresets';
import { notifications } from '@mantine/notifications';
import { apiGet, apiPost, apiPut } from '../lib/api';
import AppLayout from '../components/AppLayout';
import PageHeader from '../components/PageHeader';
import './UniversalCalculator.compact.css';
import useLocalStorage from '../hooks/useLocalStorage';
import { getCurrentUserData, saveCurrentUserData } from '../utils/userScopedStorage';
import { calculatePricing, PricingMethod, formatMoney as fmtMoney, formatPpsf as fmtPpsf } from '../utils/pricing';
import { BidSnapshot as DocBidSnapshot, LineItem as DocLineItem } from '../utils/pnl';
import { useLocation } from 'wouter';
import { useCalculatorDraft, calculatorDraftActions } from '../store/calculatorDraft';
import { sessionActions } from '../store/sessionContext';
import { buildSavedBidPayload, snapshotToItems, buildQuickQuoteSavedBidPayload } from '../utils/mapper';
import { toUIPricingMethod, toDraftPricingMethod, toBackendPricingMethod } from '../constants/pricingMethods';
import clientService from '../services/clientService';
import SelectContactModal from '../components/SelectContactModal';
import { AddContactModal } from '../components/AddContactModal';
import { flooringLaborAddOns as laborAddOns, countertopLaborAddOns } from '../lib/laborCatalog';
import type { LaborAddOn } from '../lib/laborCatalog';
import NewEstimateModal, { type EstimateRecord, type EstimateService } from '../components/NewEstimateModal';
import { useMyManufacturers } from '../hooks/useManufacturers';
import { getImageUrl } from '../utils/imageUrl';
import { getPreselectedClient, clearPreselectedClient } from '../utils/clientPreselection';

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
  
  // Helper function to handle Select onChange without allowing deselection
  const handleSelectChange = useCallback((currentValue: string, newValue: string | null, setter: (value: string) => void) => {
    // Only update if we have a new value and it's different from current
    if (newValue && newValue !== currentValue) {
      setter(newValue);
    }
    // If newValue is null or empty, keep the current value (prevent deselection)
  }, []);
  
  // State variables
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('');
  const [selectedSystemGroup, setSelectedSystemGroup] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [selectedSurfaceHardness, setSelectedSurfaceHardness] = useState<string>('');
  const [totalSqft, setTotalSqft] = useState<number>(0);
  const [dimensions, setDimensions] = useState({ length: 0, width: 0 });
  // Pricing method for Step 4
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('MARGIN_BASED');
  const [profitMargin, setProfitMargin] = useState<number>(50);
  const [laborRate, setLaborRate] = useState<number>(55);
  const [totalLaborHours, setTotalLaborHours] = useState<number>(0);
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);
  // Manual quantity overrides for product-backed result rows
  const [resultQtyOverrides, setResultQtyOverrides] = useState<Record<string, number>>({});
  // Target PPSF pricing method
  const [targetPpsf, setTargetPpsf] = useState<number>(0);
  // Catalog modal state
  const [catalogOpen, setCatalogOpen] = useState<boolean>(false);
  const [catalogQuery, setCatalogQuery] = useState<string>("");
  const [catalogCategory, setCatalogCategory] = useState<string | null>(null);
  const [catalogManu, setCatalogManu] = useState<string | null>(null);
  const [catalogLimit, setCatalogLimit] = useState<number>(24);

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
  const [pickContactOpen, setPickContactOpen] = useState(false);
  const [createClientModalOpen, setCreateClientModalOpen] = useState(false);
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

  // Polishing Systems - Clean & Seal
  const [polishCleaner, setPolishCleaner] = useState<string>('');
  const [polishCleanerAdj, setPolishCleanerAdj] = useState<number>(1);
  const [polishCrackFiller, setPolishCrackFiller] = useState<string>('');
  const [polishCrackFillerQty, setPolishCrackFillerQty] = useState<number>(0); // LF or unit count
  const [polishSealerGuard, setPolishSealerGuard] = useState<string>('');
  const [polishSealerAdj, setPolishSealerAdj] = useState<number>(1);
  const [polishSealerCoats, setPolishSealerCoats] = useState<number>(1);
  const [polishBurnishPad, setPolishBurnishPad] = useState<string>('');
  const [polishBurnishCount, setPolishBurnishCount] = useState<number>(0);

  // Polishing Systems - Grind & Seal (polishing)
  const [pgsMetalSelected, setPgsMetalSelected] = useState<Record<string, boolean>>({ '30/40': true, '60/80': true, '120/150': true });
  const [pgsMetalAdj, setPgsMetalAdj] = useState<number>(1);
  const [pgsSlurry, setPgsSlurry] = useState<string>('');
  const [pgsSlurryAdj, setPgsSlurryAdj] = useState<number>(1);
  const [pgsSlurryCoats, setPgsSlurryCoats] = useState<number>(1);
  const [pgsSealer, setPgsSealer] = useState<string>('');
  const [pgsSealerAdj, setPgsSealerAdj] = useState<number>(1);
  const [pgsSealerCoats, setPgsSealerCoats] = useState<number>(1);
  const [pgsBurnishPad, setPgsBurnishPad] = useState<string>('');
  const [pgsBurnishCount, setPgsBurnishCount] = useState<number>(0);

  // Polishing Systems - Medium Polish
  const [pmNeedMetal, setPmNeedMetal] = useState<boolean>(false);
  const [pmMetalSelected, setPmMetalSelected] = useState<Record<string, boolean>>({ '30/40': true, '70/80': true, '120': true });
  const [pmMetalAdj, setPmMetalAdj] = useState<number>(1);
  const [pmSlurry, setPmSlurry] = useState<string>('');
  const [pmSlurryAdj, setPmSlurryAdj] = useState<number>(1);
  const [pmDensifier, setPmDensifier] = useState<string>('');
  const [pmDensifierAdj, setPmDensifierAdj] = useState<number>(1);
  const [pmDensifierPasses, setPmDensifierPasses] = useState<number>(1);
  const [pmResinSelected, setPmResinSelected] = useState<Record<string, boolean>>({ '50': true, '100': true, '200': true, '400': true });
  const [pmResinAdj, setPmResinAdj] = useState<number>(1);
  const [pmGuard, setPmGuard] = useState<string>('');
  const [pmGuardAdj, setPmGuardAdj] = useState<number>(1);
  const [pmGuardCoats, setPmGuardCoats] = useState<number>(1);
  const [pmBurnishPad, setPmBurnishPad] = useState<string>('');
  const [pmBurnishCount, setPmBurnishCount] = useState<number>(1);

  // Polishing Systems - True Polish
  const [ptMetalSelected, setPtMetalSelected] = useState<Record<string, boolean>>({ '30/40': true, '70/80': true, '120': true });
  const [ptMetalAdj, setPtMetalAdj] = useState<number>(1);
  const [ptSlurry, setPtSlurry] = useState<string>('');
  const [ptSlurryAdj, setPtSlurryAdj] = useState<number>(1);
  const [ptDensifier1, setPtDensifier1] = useState<string>('');
  const [ptDensifier1Adj, setPtDensifier1Adj] = useState<number>(1);
  const [ptResinSelected, setPtResinSelected] = useState<Record<string, boolean>>({ '50': true, '100': true, '200': true, '400': true, '800': true });
  const [ptResinAdj, setPtResinAdj] = useState<number>(1);
  const [ptDye, setPtDye] = useState<string>('');
  const [ptDyeAdj, setPtDyeAdj] = useState<number>(1);
  const [ptDensifier2, setPtDensifier2] = useState<string>('');
  const [ptDensifier2Adj, setPtDensifier2Adj] = useState<number>(1);
  const [ptGuard, setPtGuard] = useState<string>('');
  const [ptGuardAdj, setPtGuardAdj] = useState<number>(1);
  const [ptGuardCoats, setPtGuardCoats] = useState<number>(1);
  const [ptBurnishPad, setPtBurnishPad] = useState<string>('');
  const [ptBurnishCount, setPtBurnishCount] = useState<number>(1);

  // Polishing Systems - High End Polish
  const [phMetalSelected, setPhMetalSelected] = useState<Record<string, boolean>>({ '30/40': true, '70/80': true, '120': true });
  const [phMetalAdj, setPhMetalAdj] = useState<number>(1);
  const [phSlurry, setPhSlurry] = useState<string>('');
  const [phSlurryAdj, setPhSlurryAdj] = useState<number>(1);
  const [phDensifier1, setPhDensifier1] = useState<string>('');
  const [phDensifier1Adj, setPhDensifier1Adj] = useState<number>(1);
  const [phResinSelected, setPhResinSelected] = useState<Record<string, boolean>>({ '50': true, '100': true, '200': true, '400': true, '800': true, '1500': true, '3000': true });
  const [phResinAdj, setPhResinAdj] = useState<number>(1);
  const [phDye, setPhDye] = useState<string>('');
  const [phDyeAdj, setPhDyeAdj] = useState<number>(1);
  const [phDensifier2, setPhDensifier2] = useState<string>('');
  const [phDensifier2Adj, setPhDensifier2Adj] = useState<number>(1);
  const [phPremiumGuard, setPhPremiumGuard] = useState<string>('');
  const [phPremiumGuardAdj, setPhPremiumGuardAdj] = useState<number>(1);
  const [phPremiumGuardCoats, setPhPremiumGuardCoats] = useState<number>(2);
  const [phBurnishPad, setPhBurnishPad] = useState<string>('');
  const [phBurnishCount, setPhBurnishCount] = useState<number>(2);

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

  // Local logo assets (fallback if API logo_url not available)
  const localLogoMap: Record<string, string> = useMemo(() => ({
    'aras-flake': '/manufacturer_logos/035_ArasFlake_Primary-Black_1.avif',
    'astc-global': '/manufacturer_logos/ASTC.png',
    'chemtec-epoxy-coatings': '/manufacturer_logos/chemtec.jpg',
    'crown-polymers': '/manufacturer_logos/crown%20polymers.webp',
    'desert-polymer': '/manufacturer_logos/desert-polymer.png',
    'epoxy-depot': '/manufacturer_logos/Epoxy-Depot.png',
    'ghost-shield': '/manufacturer_logos/Ghostshield.png',
    'ghostshield': '/manufacturer_logos/Ghostshield.png',
    'mpc-coatings': '/manufacturer_logos/MPC.png',
    'ppi-polypro': '/manufacturer_logos/PPI.png',
    'ppi-polypro-industries': '/manufacturer_logos/PPI.png',
    'purepoxy': '/manufacturer_logos/PureEpoxy.png',
    'resin-force': '/manufacturer_logos/Resinforce.png',
    'simiron': '/manufacturer_logos/Simrion.png',
    'stonecoat': '/manufacturer_logos/Stonecoat.png',
    'us-resin-supply': '/manufacturer_logos/US.png',
    'versatile-high-performance-coatings': '/manufacturer_logos/versatile.png',
    'westcoat': '/manufacturer_logos/westcoat_logo_clearchem.jpg',
    'wrap-resins': '/manufacturer_logos/Wrap.png',
    'xps': '/manufacturer_logos/XPS.png'
  }), []);

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
        logo: localLogoMap[slug] || '/manufacturer_logos/default.png'
      };
    });
  }, [apiManufacturers, localLogoMap]);

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

  // Define category groups needed for various systems
  const categoryGroups = useMemo(() => [
    ['Epoxy', 'Polyurea', 'Polyaspartic', 'Primers', 'Primer'],
    ['Flake Colors', 'Flake Color'],
    ['Polyaspartic Top Coats', 'Metallic Top Coats', 'Polyaspartic Topcoats', 'Polyaspartic Top Coat', 'Metallic Top Coat', 'Top Coat', 'Topcoat'],
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
  ], []);

  // Fetch products for each category group scoped to the selected manufacturer
  const categoryQueries = useQueries({
    queries: categoryGroups.map(categories => ({
      queryKey: ['products', 'category-group', categories, selectedManufacturerIdNum],
      queryFn: async () => {
        console.log(`[API] Fetching products for categories: ${categories.join(', ')} for mfg: ${selectedManufacturerIdNum}`);
        const response = await apiGet('/api/user-products/my-products', {
          params: {
            product_categories: categories.join(','),
            manufacturer_id: selectedManufacturerIdNum,
            cart: false,
            limit: 500
          }
        });

        let productsArray: Product[] = [];
        if (Array.isArray(response)) {
          productsArray = response;
        } else if (response?.products && Array.isArray(response.products)) {
          productsArray = response.products;
        } else if (response?.data?.products && Array.isArray(response.data.products)) {
          productsArray = response.data.products;
        } else if (response?.data && Array.isArray(response.data)) {
          productsArray = response.data;
        }

        // Map backend products to our local Product interface
        return productsArray.map((p: any) => ({
          ...p,
          manufacturer: p.manufacturer || p.manufacturer_name || (selectedManufacturerIdNum ? apiManufacturers.find(m => m.id === selectedManufacturerIdNum)?.name : '') || '',
          unit_price: String(p.final_price || p.unit_price || '0')
        }));
      },
      enabled: !!selectedManufacturerIdNum,
      staleTime: 5 * 60 * 1000,
    }))
  });

  const productsLoading = categoryQueries.some(q => q.isLoading);
  const productsError = categoryQueries.some(q => q.error);

  // Consolidate all fetched products into a single "available" list for the current context
  const products: Product[] = useMemo(() => {
    const allProducts: Product[] = [];
    const seenIds = new Set<number>();

    categoryQueries.forEach(query => {
      if (query.data && Array.isArray(query.data)) {
        query.data.forEach(p => {
          if (!seenIds.has(p.id)) {
            seenIds.add(p.id);
            allProducts.push(p);
          }
        });
      }
    });

    console.log('[Products] Consolidated', allProducts.length, 'products from category queries');
    return allProducts;
  }, [categoryQueries]);

  // Load saved bid when editBid parameter is present (after products and manufacturers are loaded)
  useEffect(() => {
    let cancelled = false;
    async function loadSavedBid() {
      try {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('editBid');
        // Only load if there's an explicit editBid parameter in the URL
        if (!editId) {
          return;
        }

        setIsLoadingSavedBid(true);
        setEditingBidId(editId);

        // Wait for products to load first if we already have a manufacturer selected
        // This ensures system components can be restored correctly
        let retries = 0;
        if (selectedManufacturer) {
          while (productsLoading && retries < 20) {
            await new Promise(resolve => setTimeout(resolve, 300));
            retries++;
          }
        }

        // Additional wait to ensure everything is initialized
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch saved bid from API
        const savedBid = await apiGet<any>(`/api/saved-bids/${editId}`);
        if (cancelled || !savedBid) return;

        // Restore basic information
        if (savedBid.name) setBidName(savedBid.name);
        if (savedBid.description) setBidDescription(savedBid.description);
        if (savedBid.client_id) setSelectedClientId(savedBid.client_id);
        if (savedBid.client) {
          const clientName = `${savedBid.client.first_name || ''} ${savedBid.client.last_name || ''}`.trim();
          if (clientName) setSelectedClientName(clientName);
        }

        // Restore manufacturer and system
        if (savedBid.manufacturer_id || savedBid.manufacturer_name) {
          // Map manufacturer_id or manufacturer_name to the dropdown slug
          let manufacturerSlug = '';
          if (savedBid.manufacturer_name) {
            // Try to find by name first (more reliable)
            const found = availableManufacturers.find(m =>
              m.name.toLowerCase() === savedBid.manufacturer_name.toLowerCase()
            );
            if (found) {
              manufacturerSlug = found.id;
            }
          }
          // If not found by name, try to find by ID in apiManufacturers (NEW reliable way)
          if (!manufacturerSlug && savedBid.manufacturer_id) {
            const foundMfg = apiManufacturers.find(m => m.id === savedBid.manufacturer_id);
            if (foundMfg) {
              const found = availableManufacturers.find(m =>
                m.name.toLowerCase() === foundMfg.name.toLowerCase()
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
            console.warn('[UniversalCalculator] Could not map manufacturer:', savedBid.manufacturer_id, savedBid.manufacturer_name);
          }
        }
        if (savedBid.system_group) {
          setSelectedSystemGroup(savedBid.system_group);
        }
        if (savedBid.system_type) {
          setSelectedSystem(savedBid.system_type);
        }

        // Restore coverage and dimensions
        if (savedBid.coverage_area_sqft) {
          setTotalSqft(savedBid.coverage_area_sqft);
        }
        if (savedBid.dimensions) {
          setDimensions(savedBid.dimensions);
        }
        if (savedBid.surface_hardness) {
          setSelectedSurfaceHardness(savedBid.surface_hardness);
        }

        // Restore pricing configuration
        if (savedBid.pricing_method) {
          setPricingMethod(toUIPricingMethod(savedBid.pricing_method));
        }
        if (savedBid.margin_pct !== null && savedBid.margin_pct !== undefined) {
          setProfitMargin(savedBid.margin_pct); // Already in percentage form
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

        // Restore tier selection
        if (savedBid.selected_tier) {
          setSelectedTier(savedBid.selected_tier as 'good' | 'better' | 'best');
        }
        if (savedBid.tier_overrides) {
          // tier_overrides will be used in calculations
        }
        if (savedBid.result_qty_overrides) {
          setResultQtyOverrides(savedBid.result_qty_overrides);
        }

        // Restore system components - delay to ensure manufacturer/system dropdowns are populated
        if (savedBid.system_components) {
          if (import.meta.env.DEV) {
            console.log('[UniversalCalculator] Restoring system components:', savedBid.system_components);
          }
          // Wait a bit for manufacturer/system to be set and dropdowns to populate
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
              if (comps.metallicBasePigment) setSelectedMetallicBasePigment(String(comps.metallicBasePigment || ''));
              if (comps.metallicGroutCoat) setSelectedMetallicGroutCoat(String(comps.metallicGroutCoat || ''));
              if (comps.metallicBaseCoat) setSelectedMetallicBaseCoat(String(comps.metallicBaseCoat || ''));
              if (comps.metallicMoneyCoat) setSelectedMetallicMoneyCoat(String(comps.metallicMoneyCoat || ''));
              if (comps.metallicPigments && Array.isArray(comps.metallicPigments)) {
                setSelectedMetallicPigments(comps.metallicPigments);
              }
              if (comps.metallicTopCoat) setSelectedMetallicTopCoat(String(comps.metallicTopCoat || ''));
              if (comps.grindSealPrimer) setSelectedGrindSealPrimer(String(comps.grindSealPrimer || ''));
              if (comps.grindSealGroutCoat) setSelectedGrindSealGroutCoat(String(comps.grindSealGroutCoat || ''));
              if (comps.grindSealBaseCoat) setSelectedGrindSealBaseCoat(String(comps.grindSealBaseCoat || ''));
              if (comps.grindSealIntermediateCoat) setSelectedGrindSealIntermediateCoat(String(comps.grindSealIntermediateCoat || ''));
              if (comps.grindSealTopCoat) setSelectedGrindSealTopCoat(String(comps.grindSealTopCoat || ''));
              if (comps.grindSealAdditionalTopCoat) setSelectedGrindSealAdditionalTopCoat(String(comps.grindSealAdditionalTopCoat || ''));
              if (comps.countertopPrimer) setSelectedCountertopPrimer(String(comps.countertopPrimer || ''));
              if (comps.countertopBasePigment) setSelectedCountertopBasePigment(String(comps.countertopBasePigment || ''));
              if (comps.countertopMetallicArtCoat) setSelectedCountertopMetallicArtCoat(String(comps.countertopMetallicArtCoat || ''));
              if (comps.countertopMetallicPigments && Array.isArray(comps.countertopMetallicPigments)) {
                setSelectedCountertopMetallicPigments(comps.countertopMetallicPigments);
              }
              if (comps.countertopFloodCoat) setSelectedCountertopFloodCoat(String(comps.countertopFloodCoat || ''));
              if (comps.countertopTopCoat) setSelectedCountertopTopCoat(String(comps.countertopTopCoat || ''));
            }
          }, 300); // Small delay to ensure dropdowns are populated
        }

        // Restore spread rate overrides
        if (savedBid.spread_rate_overrides) {
          const overrides = savedBid.spread_rate_overrides;
          if (overrides.noMVBBasePigment) setNoMVBBasePigmentSpreadRate(Number(overrides.noMVBBasePigment));
          if (overrides.noMVBBaseCoat) setNoMVBBaseCoatSpreadRate(Number(overrides.noMVBBaseCoat));
          if (overrides.noMVBFlakeColor) setNoMVBFlakeColorSpreadRate(Number(overrides.noMVBFlakeColor));
          if (overrides.noMVBTopCoat) setNoMVBTopCoatSpreadRate(Number(overrides.noMVBTopCoat));
          if (overrides.mvbBasePigment) setMVBBasePigmentSpreadRate(Number(overrides.mvbBasePigment));
          if (overrides.mvbBaseCoat) setMVBBaseCoatSpreadRate(Number(overrides.mvbBaseCoat));
          if (overrides.mvbFlakeColor) setMVBFlakeColorSpreadRate(Number(overrides.mvbFlakeColor));
          if (overrides.mvbTopCoat) setMVBTopCoatSpreadRate(Number(overrides.mvbTopCoat));
          if (overrides.solidBasePigment) setSolidBasePigmentSpreadRate(Number(overrides.solidBasePigment));
          if (overrides.solidGroutCoat) setSolidGroutCoatSpreadRate(Number(overrides.solidGroutCoat));
          if (overrides.solidBaseCoat) setSolidBaseCoatSpreadRate(Number(overrides.solidBaseCoat));
          if (overrides.solidExtraBaseCoat) setSolidExtraBaseCoatSpreadRate(Number(overrides.solidExtraBaseCoat));
          if (overrides.solidTopCoat) setSolidTopCoatSpreadRate(Number(overrides.solidTopCoat));
          if (overrides.metallicBasePigment) setMetallicBasePigmentSpreadRate(Number(overrides.metallicBasePigment));
          if (overrides.metallicGroutCoat) setMetallicGroutCoatSpreadRate(Number(overrides.metallicGroutCoat));
          if (overrides.metallicBaseCoat) setMetallicBaseCoatSpreadRate(Number(overrides.metallicBaseCoat));
          if (overrides.metallicMoneyCoat) setMetallicMoneyCoatSpreadRate(Number(overrides.metallicMoneyCoat));
          if (overrides.metallicTopCoat) setMetallicTopCoatSpreadRate(Number(overrides.metallicTopCoat));
          if (overrides.grindSealGrout) setGrindSealGroutSpreadRate(Number(overrides.grindSealGrout));
          if (overrides.grindSealBase) setGrindSealBaseSpreadRate(Number(overrides.grindSealBase));
          if (overrides.grindSealIntermediateCoat) setGrindSealIntermediateCoatSpreadRate(Number(overrides.grindSealIntermediateCoat));
          if (overrides.countertopBaseCoat) setCountertopBaseCoatSpreadRate(Number(overrides.countertopBaseCoat));
          if (overrides.countertopMetallicArtCoat) setCountertopMetallicArtCoatSpreadRate(Number(overrides.countertopMetallicArtCoat));
          if (overrides.countertopClearCoat) setCountertopClearCoatSpreadRate(Number(overrides.countertopClearCoat));
          if (overrides.countertopMetallicPigment) setCountertopMetallicPigmentSpreadRate(Number(overrides.countertopMetallicPigment));
        }

        // Restore add-on quantities
        if (savedBid.add_on_quantities) {
          setAddOnQuantities(savedBid.add_on_quantities);
        }

        // Restore custom material prices
        if (savedBid.custom_material_prices) {
          setCustomMaterialPrices(savedBid.custom_material_prices);
        }

        // Restore labor rates
        if (savedBid.labor_rates) {
          setLaborRates(savedBid.labor_rates);
        }

        // Restore sundries
        if (savedBid.sundries_enabled !== null && savedBid.sundries_enabled !== undefined) {
          setSundriesEnabled(savedBid.sundries_enabled);
        }

        // Restore custom charge label
        if (savedBid.custom_charge_label) {
          setCustomChargeLabel(savedBid.custom_charge_label);
        }

        // Restore countertop configuration
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

        // Restore suggestion cycle
        if (savedBid.suggestion_cycle) {
          setSuggestionCycle(savedBid.suggestion_cycle);
        }

        // Restore UI state if available (for any additional state not covered above)
        if (savedBid.ui_state) {
          try {
            calculatorDraftActions.setUiState(savedBid.ui_state);
          } catch (e) {
            console.warn('[UniversalCalculator] Failed to restore UI state:', e);
          }
        }

        // Restore items to draft if available
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

          // Update draft with restored items and totals
          calculatorDraftActions.patch({
            items: restoredItems,
            totals: savedBid.customer_price > 0 || savedBid.total_cost > 0 ? {
              materialCost: Number(savedBid.material_cost || 0),
              laborCost: Number(savedBid.labor_cost || 0),
              totalCost: Number(savedBid.total_cost || 0),
              customerPrice: Number(savedBid.customer_price || 0),
              ppsf: Number(savedBid.price_per_sqft || 0),
              byTier: savedBid.totals_by_tier || {},
            } : undefined,
          });
        }

        // Mark as calculated if we have totals - auto-trigger recalculation to display results
        if (savedBid.customer_price > 0 || savedBid.total_cost > 0) {
          setHasCalculated(true);
          // Auto-trigger calculation after a delay to ensure all state is restored
          setTimeout(() => {
            if (cancelled) return;
            if (import.meta.env.DEV) {
              console.log('[UniversalCalculator] Auto-triggering calculation after load');
            }
            // Trigger calculation by calling handleCalculate
            // We'll do this by setting a flag that triggers calculation in useEffect
            setAutoTriggerCalc(true);
          }, 1000); // Wait 1 second for all state to be restored
        }

        notifications.show({
          title: 'Bid Loaded',
          message: `Loaded "${savedBid.name}" successfully. All values have been restored.`,
          color: 'green'
        });
      } catch (error: any) {
        console.error('[UniversalCalculator] Failed to load saved bid:', error);
        notifications.show({
          title: 'Load Failed',
          message: error?.message || 'Failed to load saved bid.',
          color: 'red'
        });
      } finally {
        setIsLoadingSavedBid(false);
      }
    }
    loadSavedBid();
    return () => { cancelled = true; };
  }, [products.length, availableManufacturers, apiManufacturers]);

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
    const key = String(product.manufacturer || '').toLowerCase().trim();
    const rule = manufacturerDiscountsMap[key];
    if (rule && rule.active && rule.pct > 0) {
      return Math.max(0, raw * (1 - rule.pct / 100));
    }
    return raw;
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

  // Note: category discovery is handled implicitly by option builders

  // Helper: build Select options from products by category and current manufacturer
  const getComponentsByCategory = (category: string) => {
    // Simplified slugify to match mobile (less aggressive, handles & and . better)
    const slugify = (s?: string | null) =>
      (s || '')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-');

    const normalize = (s?: string | null) => (s || '').toString().toLowerCase().trim();
    const catSlug = slugify(category);
    const targetLower = normalize(category);

    if (!selectedManufacturerIdNum) {
      return [] as { value: string; label: string }[];
    }

    // The products list is already scoped to the selected manufacturer via the API queries
    const filtered = products
      .filter(p => {
        // Match logic from mobile version:

        // 1. Primary category match
        const productCategory = slugify(p.category);
        if (productCategory === catSlug) return true;

        // 2. Product name match (for terms >= 4 chars)
        const productName = normalize(p.name || '');
        if (targetLower.length >= 4 && productName.includes(targetLower)) return true;

        // 3. System categories check
        if ((p as any).system_categories && Array.isArray((p as any).system_categories)) {
          if ((p as any).system_categories.some((sc: string) => slugify(sc) === catSlug)) {
            return true;
          }
        }

        return false;
      })
      .map(product => {
        let cleanName = product.name || '';
        // Remove manufacturer prefix to avoid redundancy/truncation
        const manu = product.manufacturer || '';
        if (normalize(cleanName).startsWith(normalize(manu))) {
          cleanName = cleanName.substring(manu.length).trim().replace(/^[-–—:\s]+/, '');
        }
        // Remove common prefixes for readability
        cleanName = cleanName.replace(/^metallic\s+pigment\s+/i, '');
        return {
          value: product.id.toString(),
          label: cleanName || product.name
        };
      });

    return filtered;
  };

  // Helper: build options by multiple category names in order with de-duplication
  const getByCategories = useCallback((cats: string[]) => {
    const raw = cats.flatMap(getComponentsByCategory);
    const seen = new Set<string>();
    return raw.filter(opt => {
      if (!opt.value || seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [getComponentsByCategory]);

  // No MVB (standard) Flake System options
  const baseCoatOptions = useMemo(() => {
    console.log('[Options] Computing baseCoatOptions');
    return getByCategories(['Epoxy', 'Polyurea', 'Polyaspartic', 'Primers']);
  }, [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const flakeColorOptions = useMemo(() => {
    console.log('[Options] Computing flakeColorOptions');
    return getByCategories(['Flake Colors']);
  }, [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  // General top coat options (non-MVB systems)
  const topCoatOptions = useMemo(() => (
    getByCategories(['Polyaspartic Top Coats', 'Metallic Top Coats'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  // Base pigment options (non-MVB)
  const basePigmentOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Base Pigments'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const solidTopCoatOptions = useMemo(() => (
    getByCategories(['Polyaspartic Top Coats', 'Metallic Top Coats'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  // MVB Flake System component options
  const mvbBasePigmentOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Base Pigments'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const mvbBaseCoatOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Epoxy', 'MVB'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const mvbFlakeColorOptions = useMemo(() => (
    getByCategories(['Flake Colors'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const mvbTopCoatOptions = useMemo(() => (
    getByCategories(['Polyaspartic Top Coats', 'Metallic Top Coats'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  // Metallic System component options
  const metallicBasePigmentOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Base Pigments'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const metallicBaseCoatOptions = useMemo(() => (
    getByCategories(['Epoxy', 'MVB'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const metallicMoneyCoatOptions = useMemo(() => (
    getByCategories(['Metallic Money Coat'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const metallicPigmentOptions = useMemo(() => {
    // Try multiple possible category names for metallic pigments
    const possibleCategories = [
      'Metallic Pigments', 'Metallic Pigment', 'Pigments', 'Pigment', 'Metallic Colors', 'Metallic', 'Colors', 'Flake Color'
    ];
    for (const category of possibleCategories) {
      const opts = getComponentsByCategory(category);
      if (opts.length > 0) return opts;
    }
    // Fallback when none found
    return [
      { value: 'flash-cobalt-blue', label: 'Flash Cobalt Blue' },
      { value: 'magic-blue', label: 'Magic Blue' },
      { value: 'pearl-white', label: 'Pearl White' },
      { value: 'copper-penny', label: 'Copper Penny' },
      { value: 'silver-bullet', label: 'Silver Bullet' },
      { value: 'gold-rush', label: 'Gold Rush' }
    ];
  }, [products, selectedManufacturer]);

  const metallicTopCoatOptions = useMemo(() => (
    getByCategories(['Metallic Top Coats', 'Polyaspartic Topcoats'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  // Polishing option builders
  const polishCleanerOptions = useMemo(() => (
    getByCategories(['Cleaners/Neutralizers', 'Cleaners', 'Neutralizers'])
  ), [products, selectedManufacturer, getByCategories]);
  const polishCrackFillerOptions = useMemo(() => (
    getByCategories(['Crack & Joint Filler', 'Crack & Joint Fillers'])
  ), [products, selectedManufacturer, getByCategories]);
  const polishSealerGuardOptions = useMemo(() => (
    getByCategories(['Sealers & Guards', 'Guards/Finishes', 'Sealers', 'Guards'])
  ), [products, selectedManufacturer, getByCategories]);
  const burnishPadOptions = useMemo(() => (
    getByCategories(['Diamond-impregnated Burnishing Pads', 'Burnishing Pads', 'Burnishing'])
  ), [products, selectedManufacturer, getByCategories]);
  const slurryGroutOptions = useMemo(() => (
    getByCategories(['Slurry/Grout', 'Grout', 'Slurry'])
  ), [products, selectedManufacturer, getByCategories]);
  const densifiersOptions = useMemo(() => (
    getByCategories(['Densifiers'])
  ), [products, selectedManufacturer, getByCategories]);
  const concreteDyesOptions = useMemo(() => (
    getByCategories(['Concrete Dyes', 'Dyes'])
  ), [products, selectedManufacturer, getByCategories]);
  const premiumGuardsOptions = useMemo(() => (
    getByCategories(['Guards/Finishes (Premium)', 'Premium Guards', 'Premium Micro-Guard', 'Premium Microguard'])
  ), [products, selectedManufacturer, getByCategories]);

  // Solid Color System component options
  const solidBasePigmentOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Base Pigments'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const solidGroutCoatOptions = useMemo(() => (
    getByCategories(['MVB', 'Epoxy'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const solidBaseCoatOptions = useMemo(() => (
    getByCategories(['MVB', 'Epoxy', 'Polyurea', 'Polyaspartic', 'Primers'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const solidExtraBaseCoatOptions = useMemo(() => (
    getByCategories(['Epoxy', 'Polyurea', 'Polyaspartic'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const metallicGroutCoatOptions = useMemo(() => (
    getByCategories(['MVB', 'Epoxy'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  // Grind & Seal System component options
  const grindSealPrimerOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getComponentsByCategory('Primers')
    ]
  ), [products, selectedManufacturer]);

  const grindSealGroutCoatOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Epoxy', 'Metallic Top Coats'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const grindSealBaseCoatOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Epoxy', 'Metallic Top Coats'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const grindSealIntermediateCoatOptions = useMemo(() => (
    getByCategories(['Epoxy', 'Metallic Top Coats'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const grindSealTopCoatOptions = useMemo(() => (
    getByCategories(['Metallic Top Coats', 'Polyaspartic Top Coats'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const grindSealAdditionalTopCoatOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Metallic Top Coats', 'Polyaspartic Top Coats'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  // Countertop System component options
  const countertopPrimerOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Primers'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const countertopBasePigmentOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Base Pigments'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const countertopMetallicArtCoatOptions = useMemo(() => (
    getByCategories(['Metallic Money Coat'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const countertopFloodCoatOptions = useMemo(() => (
    [
      { value: '', label: 'None' },
      ...getByCategories(['Metallic Money Coat'])
    ]
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

  const countertopMetallicPigmentOptions = useMemo(() => {
    const possibleCategories = [
      'Metallic Pigments', 'Metallic Pigment', 'Pigments', 'Pigment', 'Metallic Colors', 'Metallic', 'Colors', 'Flake Color'
    ];
    for (const category of possibleCategories) {
      const opts = getComponentsByCategory(category);
      if (opts.length > 0) return opts;
    }
    return [
      { value: 'flash-cobalt-blue', label: 'Flash Cobalt Blue' },
      { value: 'magic-blue', label: 'Magic Blue' },
      { value: 'pearl-white', label: 'Pearl White' },
      { value: 'copper-penny', label: 'Copper Penny' },
      { value: 'silver-bullet', label: 'Silver Bullet' },
      { value: 'gold-rush', label: 'Gold Rush' }
    ];
  }, [products, selectedManufacturer]);

  const countertopTopCoatOptions = useMemo(() => (
    getByCategories(['Metallic Top Coats'])
  ), [products, selectedManufacturer, selectedManufacturerIdNum, getByCategories]);

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

  // Helper function to determine if manufacturer uses 2 pigments per kit (US Resin Supply)
  const getBasePigmentRatio = (manufacturerName: string): number => {
    return manufacturerName.toLowerCase().includes('us resin supply') ? 2 : 1;
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
    if (!relativePath || relativePath.trim() === '') return 'https://via.placeholder.com/100x100/CCCCCC/666666?text=No+Image';
    if (relativePath.startsWith('http')) return relativePath;
    const API_BASE_URL = (import.meta.env.VITE_API_BASE as string) || 'https://floor-nexus-backend-latest.onrender.com';
    return `${API_BASE_URL}${relativePath}`;
  };

  // Small thumbnail component with robust fallback to avoid broken images
  const ThumbImg = ({ src, size = 28, alt = '' }: { src?: string; size?: number; alt?: string }) => {
    const [errored, setErrored] = useState<boolean>(false);
    const hasSrc = !!src && src.trim() !== '';
    const style: React.CSSProperties = { width: size, height: size, borderRadius: 4 };
    if (!hasSrc || errored) {
      return (
        <Box style={{ ...style, background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconReceipt2 size={Math.max(14, Math.floor(size * 0.6))} color="#9aa0a6" />
        </Box>
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        style={style}
        onError={() => setErrored(true)}
      />
    );
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
  // Suggestions panel UI state and local favorites (scoped to Universal Calculator)
  const [sugOpen, setSugOpen] = useState<boolean>(true);
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

  // Thumbnail/icon for labor add-ons (uses Tabler icons as lightweight thumbnails)
  const LaborThumb = ({ id }: { id: string }) => {
    // Reuse a small set of icons to represent tasks
    const style: React.CSSProperties = {
      width: 28,
      height: 28,
      borderRadius: 4,
      background: '#f3f4f6',
      border: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
    // Pick icon by category hint in id
    const lower = id.toLowerCase();
    let IconComp: any = IconReceipt2;
    if (lower.includes('hour') || lower.includes('overtime') || lower.includes('after-hours')) IconComp = IconClockHour3;
    else if (lower.includes('remote') || lower.includes('delivery') || lower.includes('fuel')) IconComp = IconRoad;
    else if (lower.includes('joint') || lower.includes('crack') || lower.includes('cut')) IconComp = IconRulerMeasure;
    else if (lower.includes('grind') || lower.includes('removal') || lower.includes('demo')) IconComp = IconReceipt2;
    else if (lower.includes('custom') || lower.includes('sundries') || lower.includes('fee')) IconComp = IconSparkles;

    return (
      <Box style={style}>
        <IconComp size={16} color="#555" />
      </Box>
    );
  };

  // Compute add-on material items and totals
  type LineItem = { id: string; name: string; qty: number; unit?: string; unitPrice: number; total: number };
  const materialAddOnItems = useMemo(() => {
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
    lists.forEach(list => {
      list.forEach(p => {
        const qty = addOnQuantities[p.id] || 0;
        if (qty > 0) {
          // Only allow overrides for editable custom items
          const unitPrice = (("editable" in p) && (p as any).editable)
            ? (customMaterialPrices[p.id] ?? p.price)
            : p.price;
          // Heuristic unit label for display
          const nameLC = (p.name || '').toLowerCase();
          let unit: string | undefined;
          if (nameLC.includes('sheet')) unit = 'sheets';
          else if (nameLC.includes('board')) unit = 'boards';
          else if (nameLC.includes('box')) unit = 'boxes';
          else if (nameLC.includes('piece')) unit = 'pieces';
          items.push({ id: p.id, name: p.name, qty, unit, unitPrice, total: unitPrice * qty });
          includedIds.add(p.id);
        }
      });
    });
    // Include any catalog-selected products (by addOnQuantities) that aren't in the above lists
    products.forEach(prod => {
      const id = prod.id.toString();
      const qty = addOnQuantities[id] || 0;
      if (qty > 0 && !includedIds.has(id)) {
        const unitPrice = getUnitPrice(prod);
        items.push({ id, name: prod.name, qty, unit: prod.unit || undefined, unitPrice, total: unitPrice * qty });
      }
    });
    return items;
  }, [addOnQuantities, crackJointFillers, nonSkidAdditives, commonlyUsedMaterials, micaFusionSprayColors, countertopIncidentals, countertopMaterialsResolved, customMaterialPrices]);

  // Compute labor add-on items and totals (excluding sundries which apply to materials)
  const laborAddOnItems = useMemo(() => {
    const items: LineItem[] = [];
    (effectiveLaborAddOns).forEach(def => {
      // percent-based handled within materials as sundries
      if (def.id === 'sundries') return;
      if (def.id === 'custom-charge') {
        const amount = addOnQuantities['custom-charge-amount'] || 0;
        if (amount > 0) {
          items.push({ id: def.id, name: customChargeLabel, qty: 1, unitPrice: amount, total: amount });
        }
      } else {
        const qty = addOnQuantities[def.id] || 0;
        if (qty > 0) {
          const name = def.label;
          const unitPrice = (laborRates[def.id] ?? def.rate);
          items.push({ id: def.id, name, qty, unitPrice, total: unitPrice * qty });
        }
      }
    });
    // Special case: Stem Walls extra labor hours (optional)
    const extraStemHours = addOnQuantities['stem-walls-hours'] || 0;
    if (extraStemHours > 0) {
      items.push({ id: 'stem-walls-hours', name: 'Stem Walls - Extra Labor Hours', qty: extraStemHours, unitPrice: laborRate, total: extraStemHours * laborRate });
    }
    return items;
  }, [addOnQuantities, effectiveLaborAddOns, customChargeLabel, laborRate, laborRates]);

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

  // Combined display items (system materials + material add-ons + labor add-ons + sundries row if applicable)
  const displayLineItems: LineItem[] = useMemo(() => {
    const items: LineItem[] = [];
    items.push(...systemMaterialItems);
    items.push(...materialAddOnItems);
    // Sundries percent as its own row if enabled and > 0
    const sundriesPercent = addOnQuantities['sundries'] ?? 5; // default 5%
    const baseMaterialsSubtotal = [...systemMaterialItems, ...materialAddOnItems].reduce((acc, it) => acc + it.total, 0);
    // Manual delta to materials subtotal before sundries
    const manualDelta = (() => {
      const baseMap: Record<string, { qty: number; unitPrice: number }> = {};
      [...systemMaterialItems, ...materialAddOnItems].forEach(it => {
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
      items.push({ id: 'sundries', name: `Sundries (${sundriesPercent}% of materials)`, qty: 1, unitPrice: sundriesAmount, total: sundriesAmount });
    }
    // Note: Do NOT include labor add-on items in this materials table; labor is shown separately
    return items;
  }, [systemMaterialItems, materialAddOnItems, addOnQuantities, sundriesEnabled, resultQtyOverrides]);

  // System components summary (selected count and subtotal)
  const systemComponentsSummary = useMemo(() => {
    const count = systemMaterialItems.length;
    const subtotal = systemMaterialItems.reduce((acc, it) => acc + it.total, 0);
    return { count, subtotal };
  }, [systemMaterialItems]);

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
        totalCost: { amount: revenue, currency: 'USD' },
        materialCost: { amount: materialCost, currency: 'USD' },
        laborCost: { amount: laborCost, currency: 'USD' },
        profit: { amount: revenue - (materialCost + laborCost), currency: 'USD' },
        ppsf: { amount: Number(pricingOutput.pricePerSqFt) || 0, currency: 'USD' },
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


  async function persistDraftAndSaveBid() {
    const snap = buildBidSnapshot();
    if (!snap) return null;
    // Compose CalculatorDraft from current UI
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
    };

    // Capitalize surface hardness for backend validation (expects 'Soft', 'Medium', 'Hard', not lowercase)
    const capitalizeSurfaceHardness = (value: string | null): string | null => {
      if (!value) return null;
      if (value === 'soft') return 'Soft';
      if (value === 'medium') return 'Medium';
      if (value === 'hard') return 'Hard';
      if (value === 'very-hard') return 'Hard'; // Backend doesn't support 'Very Hard', map to 'Hard'
      return value;
    };

    const totals = {
      materialCost: Number(pricingOutput.materialCost ?? getMaterialCost()),
      laborCost: calculateLaborCost(),
      totalCost: calculateTotalCost(),
      customerPrice: calculateRequiredRevenue(),
      ppsf: calculatePricePerSqft(),
      byTier: {
        good: { customerPrice: tierPricing.good.customerPrice, ppsf: tierPricing.good.pricePerSqFt },
        better: { customerPrice: tierPricing.better.customerPrice, ppsf: tierPricing.better.pricePerSqFt },
        best: { customerPrice: tierPricing.best.customerPrice, ppsf: tierPricing.best.pricePerSqFt },
      },
    } as const;

    // Build items directly from snapshot (like QuickQuote does) instead of going through snapshotToItems
    const items = (snap.lineItems || []).map((li) => {
      const productId = li.id ? parseInt(li.id, 10) : null;

      return {
        product_id: productId || null,
        item_type: 'product' as const,
        item_name: li.name || '',
        item_sku: li.sku || li.id || null,
        quantity: li.qty || 0,
        unit: li.unit || 'ea',
        unit_price: li.unitPrice || 0,
        total_price: li.total || (li.qty || 0) * (li.unitPrice || 0),
        product_name: li.name || null,
        product_category: null,
        product_manufacturer: li.manufacturer || null, // Use actual product manufacturer from snapshot
        product_image_url: li.imageUrl || null,
        product_tds_url: li.tdsUrl || null,
        component_key: undefined,
        is_system_material: false,
        is_add_on: false,
        is_labor: false,
        notes: null,
      };
    });

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
      items: snapshotToItems(snap), // Keep draft items as CalculatorItem format
      totals,
    });
    calculatorDraftActions.setUiState(ui);

    // Try backend Saved Bid
    try {
      // Get numeric manufacturer_id from apiManufacturers by matching manufacturer name (backend needs this for material orders)
      const manufacturerId = apiManufacturers.find(
        m => m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === selectedManufacturer
      )?.id || null;

      // Build payload directly with items from snapshot (not from draft)
      const payload = {
        source: 'universal-calculator' as const,
        name: 'Untitled Bid',
        description: null,
        client_id: draft.client?.id || null,
        manufacturer_id: manufacturerId,
        manufacturer_name: selectedManufacturerName,
        system_group: selectedSystemGroup || null,
        system_type: selectedSystem || null,
        coverage_area_sqft: Number(effectiveSqft) || null,
        dimensions: null,
        surface_hardness: capitalizeSurfaceHardness(selectedSurfaceHardness),
        pricing_method: toBackendPricingMethod(pricingMethod),
        margin_pct: (profitMargin || 0),
        labor_rate_per_hour: laborRate || 0,
        labor_hours: totalLaborHours || 0,
        target_price_per_sqft: null,
        material_cost: totals.materialCost,
        labor_cost: totals.laborCost,
        total_cost: totals.totalCost,
        customer_price: totals.customerPrice,
        price_per_sqft: totals.ppsf,
        profit_amount: totals.customerPrice - totals.totalCost,
        selected_tier: null,
        tier_overrides: null,
        totals_by_tier: totals.byTier,
        addons: {
          stemWalls: { enabled: false, included: false, mode: 'flat', flatUnitCost: 0, extraLaborHours: 0 },
          controlJoints: { enabled: false, included: false, linearFeet: 0, unitCost: 0, extraLaborHours: 0 },
          perimeterJoints: { enabled: false, included: false, linearFeet: 0, unitCost: 0, extraLaborHours: 0 },
          sundries: { enabled: false, included: false, mode: 'percent', percent: 5, flatAmount: 0 },
          fuel: { enabled: false, included: false, mode: 'flat', flatAmount: 0, percent: 0 },
          custom: { enabled: false, included: false, label: '', flatAmount: 0 },
        },
        custom_pieces: countertopMode === 'pieces' && countertopPieces.length > 0 ? {
          mode: 'build_by_pieces' as const,
          pieces: countertopPieces.map(p => ({
            name: p.name,
            surface: [p.length, p.width],
            edge: [p.edgeHeight, p.edgeWidth],
            backsplash: [p.backsplashHeight, p.backsplashWidth],
          }))
        } : countertopMode === 'totals' ? {
          mode: 'total' as const,
          piece: {
            surface: countertopDirectSurface || 0,
            edge: countertopDirectEdge || 0,
            backsplash: countertopDirectBacksplash || 0,
          }
        } : null,
        system_components: {
          basePigment: selectedBasePigment || null,
          baseCoat: selectedBaseCoat || null,
          flakeColor: selectedFlakeColor || null,
          topCoat: selectedTopCoat || null,
          mvbBasePigment: selectedMVBBasePigment || null,
          mvbBaseCoat: selectedMVBBaseCoat || null,
          mvbFlakeColor: selectedMVBFlakeColor || null,
          mvbTopCoat: selectedMVBTopCoat || null,
          solidBasePigment: selectedSolidBasePigment || null,
          solidGroutCoat: selectedSolidGroutCoat || null,
          solidBaseCoat: selectedSolidBaseCoat || null,
          solidExtraBaseCoat: selectedSolidExtraBaseCoat || null,
          solidTopCoat: selectedSolidTopCoat || null,
          metallicBasePigment: selectedMetallicBasePigment || null,
          metallicGroutCoat: selectedMetallicGroutCoat || null,
          metallicBaseCoat: selectedMetallicBaseCoat || null,
          metallicMoneyCoat: selectedMetallicMoneyCoat || null,
          metallicPigments: selectedMetallicPigments || [],
          metallicTopCoat: selectedMetallicTopCoat || null,
          grindSealPrimer: selectedGrindSealPrimer || null,
          grindSealGroutCoat: selectedGrindSealGroutCoat || null,
          grindSealBaseCoat: selectedGrindSealBaseCoat || null,
          grindSealIntermediateCoat: selectedGrindSealIntermediateCoat || null,
          grindSealTopCoat: selectedGrindSealTopCoat || null,
          grindSealAdditionalTopCoat: selectedGrindSealAdditionalTopCoat || null,
          countertopPrimer: selectedCountertopPrimer || null,
          countertopBasePigment: selectedCountertopBasePigment || null,
          countertopMetallicArtCoat: selectedCountertopMetallicArtCoat || null,
          countertopMetallicPigments: selectedCountertopMetallicPigments || [],
          countertopFloodCoat: selectedCountertopFloodCoat || null,
          countertopTopCoat: selectedCountertopTopCoat || null,
        },
        spread_rate_overrides: {
          noMVBBasePigment: noMVBBasePigmentSpreadRate,
          noMVBBaseCoat: noMVBBaseCoatSpreadRate,
          noMVBFlakeColor: noMVBFlakeColorSpreadRate,
          noMVBTopCoat: noMVBTopCoatSpreadRate,
          mvbBasePigment: mvbBasePigmentSpreadRate,
          mvbBaseCoat: mvbBaseCoatSpreadRate,
          mvbFlakeColor: mvbFlakeColorSpreadRate,
          mvbTopCoat: mvbTopCoatSpreadRate,
          solidBasePigment: solidBasePigmentSpreadRate,
          solidGroutCoat: solidGroutCoatSpreadRate,
          solidBaseCoat: solidBaseCoatSpreadRate,
          solidExtraBaseCoat: solidExtraBaseCoatSpreadRate,
          solidTopCoat: solidTopCoatSpreadRate,
          metallicBasePigment: metallicBasePigmentSpreadRate,
          metallicGroutCoat: metallicGroutCoatSpreadRate,
          metallicBaseCoat: metallicBaseCoatSpreadRate,
          metallicMoneyCoat: metallicMoneyCoatSpreadRate,
          metallicTopCoat: metallicTopCoatSpreadRate,
          grindSealGrout: grindSealGroutSpreadRate,
          grindSealBase: grindSealBaseSpreadRate,
          grindSealIntermediateCoat: grindSealIntermediateCoatSpreadRate,
          countertopBaseCoat: countertopBaseCoatSpreadRate,
          countertopMetallicArtCoat: countertopMetallicArtCoatSpreadRate,
          countertopClearCoat: countertopClearCoatSpreadRate,
          countertopMetallicPigment: countertopMetallicPigmentSpreadRate,
        },
        add_on_quantities: addOnQuantities,
        result_qty_overrides: resultQtyOverrides,
        custom_material_prices: customMaterialPrices,
        labor_rates: laborRates,
        custom_charge_label: customChargeLabel || null,
        sundries_enabled: sundriesEnabled || false,
        sundries_percent: null,
        ui_state: ui,
        draft_id: null,
        company_id: draft.company?.id || 'company-1',
        items,
      };

      const res = await apiPost<{ id: string }>(`/api/saved-bids/`, payload);
      // Note: Local bid storage has been deprecated
      sessionActions.patch({ returnTo: '/universal-calculator', lastSavedBidId: res.id });
      return res.id;
    } catch (e) {
      notifications.show({ title: 'Save Failed', message: 'Unable to save bid. Please try again.', color: 'red' });
      sessionActions.patch({ returnTo: '/universal-calculator', lastSavedBidId: null });
      return null;
    }
  }

  // Suggestions (rules + AI placeholder)
  type Suggestion = {
    id: string;
    source: 'rule' | 'ai';
    title: string;
    desc?: string;
    qty: number;
    unit?: string;
    price?: number;
    productId?: string; // when tied to a product (for [+ Add])
    onApply?: () => void; // optional custom handler (e.g., Metallic Color Assistant)
    tds?: string; // optional technical data sheet link
  };

  // Helper: allocate integer quantities by weights ensuring sum=total and no zeros
  const allocateByWeights = (total: number, weights: number[], count: number) => {
    if (count <= 0) return [] as number[];
    const ws = weights.slice(0, count);
    const sumW = ws.reduce((a, b) => a + (b || 0), 0) || count;
    // Ensure at least 1 per slot
    const base = new Array(count).fill(1);
    let remaining = Math.max(0, Math.floor(total) - count);
    if (remaining === 0) return base;
    // Largest remainder method
    const provisional = ws.map(w => (remaining * (w || 1)) / sumW);
    const floors = provisional.map(x => Math.floor(x));
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
  };

  // Reusable Metallic Mix Assistant applier
  const applyMetallicMixAssistant = useCallback(() => {
    if (selectedSystem !== 'metallic-system') return;
    if (selectedMetallicPigments.length === 0) {
      notifications.show({ title: 'Add pigments first', message: 'Select one or more metallic pigments, then Apply to auto-allocate quantities.', color: 'yellow' });
      return;
    }
    const sr = Math.max(1, metallicMoneyCoatSpreadRate || 30);
    const kitsNeeded = Math.ceil(effectiveSqft / (sr * 3));
    // Use manufacturer ratio from selected money coat product when available
    const manufacturer = (products.find(p => p.id.toString() === (selectedMetallicMoneyCoat || ''))?.manufacturer) || '';
    const pigmentRatio = getBasePigmentRatio(manufacturer);
    const computedTotal = Math.max(1, Math.ceil(kitsNeeded * pigmentRatio));
    const count = Math.max(1, selectedMetallicPigments.length);
    const totalPigments = Math.max(count, computedTotal); // ensure at least 1 each
    const weights = [4, 2, 1].slice(0, count);
    const parts = allocateByWeights(totalPigments, weights, count);
    const primary = parts[0] || 0;
    const accent = parts[1] || 0;
    const depth = parts[2] || 0;
    setSelectedMetallicPigments(prev => {
      const next = [...prev];
      if (next[0]) next[0] = { ...next[0], quantity: primary };
      if (next[1]) next[1] = { ...next[1], quantity: accent };
      if (next[2]) next[2] = { ...next[2], quantity: depth };
      return next;
    });
    notifications.show({ title: 'Applied', message: 'Pigment counts updated (Primary/Accent/Depth).', color: 'green' });
  }, [selectedSystem, selectedMetallicPigments, effectiveSqft, metallicMoneyCoatSpreadRate, products, selectedMetallicMoneyCoat, setSelectedMetallicPigments]);

  // Countertops: Mix Assistant for Metallic Pigments
  const applyCountertopMixAssistant = useCallback(() => {
    if (selectedSystemGroup !== 'countertops-custom') return;
    if (selectedCountertopMetallicPigments.length === 0) {
      notifications.show({ title: 'Add pigments first', message: 'Select one or more metallic pigments, then Apply to auto-allocate quantities.', color: 'yellow' });
      return;
    }
    // COUNTERTOP: Use ounce-based calculation - 4 oz per sq ft for metallic coat
    const totalOunces = effectiveSqft * 4; // 4 oz per sq ft
    const gallonsNeeded = totalOunces / 128; // 128 oz per gallon
    const kitsNeeded = Math.ceil(gallonsNeeded / 3); // 3-gal art coat kit
    const manufacturer = (products.find(p => p.id.toString() === (selectedCountertopMetallicArtCoat || ''))?.manufacturer) || '';
    const ratioFromMfr = getBasePigmentRatio(manufacturer);
    const perKit = ratioFromMfr || countertopMetallicPigmentSpreadRate || 1;
    const computedTotal = Math.max(1, Math.ceil(kitsNeeded * perKit));
    const count = Math.max(1, selectedCountertopMetallicPigments.length);
    const totalPigments = Math.max(count, computedTotal);
    const weights = [4, 2, 1].slice(0, count);
    const parts = allocateByWeights(totalPigments, weights, count);
    const primary = parts[0] || 0;
    const accent = parts[1] || 0;
    const depth = parts[2] || 0;
    setSelectedCountertopMetallicPigments(prev => {
      const next = [...prev];
      if (next[0]) next[0] = { ...next[0], quantity: primary };
      if (next[1]) next[1] = { ...next[1], quantity: accent };
      if (next[2]) next[2] = { ...next[2], quantity: depth };
      return next;
    });
    notifications.show({ title: 'Applied', message: 'Countertop pigment counts updated (Primary/Accent/Depth).', color: 'green' });
  }, [selectedSystemGroup, selectedCountertopMetallicPigments, countertopMetallicArtCoatSpreadRate, effectiveSqft, products, selectedCountertopMetallicArtCoat, countertopMetallicPigmentSpreadRate, setSelectedCountertopMetallicPigments]);

  // Removed enablePrimer quick action; soft slab now shows a suggestion only

  const findAddOnByName = (needle: string) => {
    const hay = [...commonlyUsedMaterials, ...countertopIncidentals];
    const n = needle.toLowerCase();
    return hay.find(it => it.name.toLowerCase().includes(n));
  };

  const ruleSuggestions: Suggestion[] = useMemo(() => {
    const out: Suggestion[] = [];
    if (!selectedSystem) return out;

    // Generic tools & consumables
    const buckets = Math.max(1, Math.ceil(effectiveSqft / 300));
    const bucketItem = findAddOnByName('5 Gal Bucket') || findAddOnByName('Bucket');
    if (bucketItem) {
      out.push({
        id: `rule-buckets-${bucketItem.id}`,
        source: 'rule',
        title: 'Mix Buckets',
        desc: 'Recommended mixing capacity for your area.',
        qty: buckets,
        unit: 'ea',
        price: bucketItem.price,
        productId: bucketItem.id,
        tds: (bucketItem as any).tds,
      });
    }
    const paddleItem = findAddOnByName('Mixing Paddle') || findAddOnByName('Paddle');
    if (paddleItem) {
      out.push({
        id: `rule-paddle-${paddleItem.id}`,
        source: 'rule',
        title: 'Mixing Paddle',
        desc: 'Useful for epoxy and polyaspartic systems.',
        qty: 1,
        unit: 'ea',
        price: paddleItem.price,
        productId: paddleItem.id,
        tds: (paddleItem as any).tds,
      });
    }
    const glovesItem = findAddOnByName('Glove') || findAddOnByName('Gloves');
    if (glovesItem) {
      out.push({
        id: `rule-gloves-${glovesItem.id}`,
        source: 'rule',
        title: 'Gloves',
        desc: 'Basic safety supplies for mixing and install.',
        qty: 4,
        unit: 'ea',
        price: glovesItem.price,
        productId: glovesItem.id,
        tds: (glovesItem as any).tds,
      });
    }

    // Floor system helpers (non-countertop): squeegee, spike shoes, roller covers, tape
    if (selectedSystemGroup !== 'countertops-custom') {
      const squeegeeItem = findAddOnByName('Squeegee') || findAddOnByName('Thar Squee');
      if (squeegeeItem) {
        out.push({
          id: `rule-squeegee-${squeegeeItem.id}`,
          source: 'rule',
          title: '18 inch Thar Squeegee',
          desc: 'Speeds up material pull and leveling.',
          qty: 1,
          unit: 'ea',
          price: squeegeeItem.price,
          productId: squeegeeItem.id,
          tds: (squeegeeItem as any).tds,
        });
      }
      const spikeItem = findAddOnByName('Spiked Shoe') || findAddOnByName('Spike Shoe') || findAddOnByName('Spikes');
      if (spikeItem) {
        const idx = suggestionCycle?.[suggestionKey] || 0;
        const allowSpike = selectedSystem === 'metallic-system' ? (idx % 6 === 0) : true;
        if (allowSpike) {
          out.push({
            id: `rule-spikes-${spikeItem.id}`,
            source: 'rule',
            title: 'Spiked Shoes',
            desc: 'Walk wet coats safely for back-rolling and broadcast.',
            qty: 1,
            unit: 'pair',
            price: spikeItem.price,
            productId: spikeItem.id,
            tds: (spikeItem as any).tds,
          });
        }
      }
      const rollerItem = findAddOnByName('Roller Cover') || findAddOnByName('9 inch Roller') || findAddOnByName('Roller');
      if (rollerItem) {
        const rollerQty = Math.max(2, Math.ceil(effectiveSqft / 500));
        out.push({
          id: `rule-roller-${rollerItem.id}`,
          source: 'rule',
          title: '9" Roller Covers',
          desc: 'Extra covers keep application smooth and lint-free.',
          qty: rollerQty,
          unit: 'ea',
          price: rollerItem.price,
          productId: rollerItem.id,
          tds: (rollerItem as any).tds,
        });
      }
      const tapeItem = findAddOnByName('Masking Tape') || findAddOnByName('Blue Tape') || findAddOnByName('Tape');
      if (tapeItem) {
        out.push({
          id: `rule-tape-${tapeItem.id}`,
          source: 'rule',
          title: 'Masking Tape',
          desc: 'Protects walls, thresholds, and fixtures during install.',
          qty: Math.max(1, Math.ceil(effectiveSqft / 800)),
          unit: 'roll',
          price: tapeItem.price,
          productId: tapeItem.id,
          tds: (tapeItem as any).tds,
        });
      }
    }

    // Note: Metallic Color Mix Assistant now appears inline near pigment selectors only (not in Suggestions)

    // Rotate suggestions based on cycle index
    const list = [...out];
    const c = (suggestionCycle?.[suggestionKey] || 0) % Math.max(1, list.length);
    const rotated = list.length > 0 ? list.slice(c).concat(list.slice(0, c)) : list;
    return rotated;
  }, [selectedSystem, selectedMetallicPigments, effectiveSqft, metallicMoneyCoatSpreadRate, products, selectedMetallicMoneyCoat, commonlyUsedMaterials, countertopIncidentals, suggestionCycle, suggestionKey]);

  const aiSuggestions: Suggestion[] = useMemo(() => {
    if (!hasCalculated) return [];
    // Placeholder: reuse a couple of generic items so we can unify the panel
    const items: Suggestion[] = [];
    const trowel = findAddOnByName('Notched Trowel');
    if (trowel) items.push({ id: `ai-trowel-${trowel.id}`, source: 'ai', title: 'Notched Trowel', desc: 'Recommended tool for base/grout coats.', qty: 1, unit: 'ea', price: trowel.price, productId: trowel.id });
    const squeegee = findAddOnByName('Squeegee') || findAddOnByName('Thar Squee');
    if (squeegee) items.push({ id: `ai-squeegee-${squeegee.id}`, source: 'ai', title: '18 inch Thar Squeegee', desc: 'Speeds up material pull and leveling.', qty: 1, unit: 'ea', price: squeegee.price, productId: squeegee.id });
    return items;
  }, [hasCalculated, commonlyUsedMaterials, countertopIncidentals]);

  const mergedSuggestions: Suggestion[] = useMemo(() => {
    const map = new Map<string, Suggestion>();
    [...ruleSuggestions, ...aiSuggestions].forEach(s => {
      const key = (s.productId ? `${s.title}-${s.productId}` : s.title).toLowerCase();
      if (!map.has(key)) map.set(key, s);
    });
    return Array.from(map.values());
  }, [ruleSuggestions, aiSuggestions]);

  // Per-suggestion editable quantity for Intelligent Suggestions (pre-calc)
  const [suggestionQty, setSuggestionQty] = useState<Record<string, number>>({});

  // (removed duplicate buildAffectedAggregatedItemsForTier; single definition moved earlier)

  const affectedSelectedTierItems = useMemo(() => buildAffectedAggregatedItemsForTier(selectedTier), [buildAffectedAggregatedItemsForTier, selectedTier]);
  const affectedBetterTierItems = useMemo(() => buildAffectedAggregatedItemsForTier('better'), [buildAffectedAggregatedItemsForTier]);

  const affectedSelectedMap = useMemo(() => new Map(affectedSelectedTierItems.map(i => [i.id, i])), [affectedSelectedTierItems]);
  const affectedBetterMap = useMemo(() => new Map(affectedBetterTierItems.map(i => [i.id, i])), [affectedBetterTierItems]);

  return (
    <AppLayout>
      <Container size="xl" py="md" px={"md"} fluid>
        {/* Header */}
        <PageHeader
          title="Universal Calculator"
          subtitle="Select products, adjust spreads and labor—real pricing, TDS, and product info included."
          rightSection={
            <Button size="xs" variant="white" color="red" onClick={() => {
              if (!confirm('Reset Universal Calculator? This will clear local calculator draft & snapshot state.')) return;
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
              window.history.replaceState({}, document.title, '/universal-calculator');
            }}>Reset</Button>
          }
        />

        {/* Sticky Mode Bar + Summary (mode indicated, toggled by header tabs below) */}
        <Box className="sticky-modebar" p="sm" mb="sm" bg="white" style={{ position: 'sticky', top: 0, zIndex: 6, borderBottom: '1px solid #e5e7eb' }}>
          <Group justify="space-between" align="center">
            <Group>
              <Text size="sm" c="dimmed">Mode: {uiMode === 'addons' ? 'Add-On Options' : 'Calculation Results'}</Text>
            </Group>
            <Group></Group>
          </Group>

          {/* Summary strip */}
          <Group gap="lg" mt="xs" wrap="wrap" className={uiMode === 'results' ? 'summary-condensed' : 'summary-expanded'}>
            <Group gap={6}><Text size="sm" c="dimmed">Materials</Text><Text fw={600}>${getMaterialCost().toFixed(2)}</Text></Group>
            <Group gap={6}><Text size="sm" c="dimmed">Labor</Text><Text fw={600}>${calculateLaborCost().toFixed(2)}</Text></Group>
            <Group gap={6}><Text size="sm" c="dimmed">Total</Text><Text fw={600}>${calculateTotalCost().toFixed(2)}</Text></Group>
            <Group gap={6}><Text size="sm" c="dimmed">$/sq ft</Text><Text fw={600}>{effectiveSqft > 0 ? `$${calculatePricePerSqft().toFixed(2)}` : '—'}</Text></Group>
            <Group gap={6}><Text size="sm" c="dimmed">Margin</Text><Text fw={600}>{calculateAchievedMargin().toFixed(1)}%</Text></Group>
          </Group>
        </Box>

        {/* Removed dev-only products loaded banner for production UI */}

        {/* 4-Column Step Layout */}
        <Grid gutter="lg" mb="xl">
          {/* Step 1: Select Manufacturer */}
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <Paper p="lg" withBorder style={{ height: '100%', borderColor: '#9333ea', borderWidth: '2px' }}>
              <Stack gap="md" h="100%">
                <Title order={4} c="purple">Step 1: Select Manufacturer</Title>
                <Text c="dimmed" size="sm">Choose your preferred manufacturer</Text>

                <Select
                  placeholder="Select a manufacturer..."
                  value={selectedManufacturer}
                  onChange={(value) => {
                    if (value && value !== selectedManufacturer) {
                      setSelectedManufacturer(value);
                      // Don't reset system group or specific system when manufacturer changes
                      // Only reset system-specific component selections
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
                    }
                  }}
                  data={availableManufacturers.map(mfg => ({ value: mfg.id, label: mfg.name }))}
                  size="md"
                  searchable
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: true, transitionProps: { transition: 'fade', duration: 100 } }}
                  renderOption={({ option }) => {
                    const manu = availableManufacturers.find((m) => m.id === option.value);
                    return (
                      <Group gap="sm">
                        <Image src={manu?.logo} alt="" h={20} w={20} fit="contain" radius="sm" />
                        <Text>{option.label}</Text>
                      </Group>
                    );
                  }}
                />

                <Box mt="auto">
                  {selectedManufacturer && (
                    <Box mt="md" p="md" bg="gray.0" style={{ borderRadius: '8px' }}>
                      <Group align="center" gap="xs">
                        <Box
                          w={60}
                          h={40}
                          bg="white"
                          style={{
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}
                        >
                          {(() => {
                            const manufacturer = availableManufacturers.find(m => m.id === selectedManufacturer);
                            const apiManufacturer = apiManufacturers.find(m => m.id.toString() === selectedManufacturer);
                            const logoUrl = apiManufacturer?.logo_url
                              ? getImageUrl(apiManufacturer.logo_url)
                              : manufacturer?.logo;
                            return (
                              <img
                                src={logoUrl}
                                alt={manufacturer?.name || apiManufacturer?.name}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain'
                                }}
                              />
                            );
                          })()}
                        </Box>
                        <Text fw={500} size="sm">
                          {availableManufacturers.find(m => m.id === selectedManufacturer)?.name || 'Unknown'}
                        </Text>
                      </Group>
                    </Box>
                  )}
                </Box>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Step 2: Select System */}
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <Paper p="lg" withBorder style={{ height: '100%', borderColor: '#16a34a', borderWidth: '2px' }}>
              <Stack gap="md" h="100%">
                <Title order={4} c="green">Step 2: Select System Type</Title>
                <Text c="dimmed" size="sm">Choose the group and specific system</Text>

                <Stack gap="sm">
                  <div>
                    <Text size="sm" fw={500} mb="xs">System Group</Text>
                    <Select
                      key={`system-group-${selectedManufacturer}-${selectedSystemGroup || 'none'}`}
                      placeholder="Select system group..."
                      value={selectedSystemGroup}
                      onChange={(value) => {
                        // Only update if value is different from current selection
                        if (value && value !== selectedSystemGroup) {
                          setSelectedSystemGroup(value);
                          setSelectedSystem(''); // Reset system when group changes
                          // Reset all system-specific components
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
                        }
                      }}
                      data={[
                        { value: 'resin-flooring', label: 'Resin Flooring' },
                        { value: 'polishing', label: 'Concrete Polishing' },
                        { value: 'countertops-custom', label: 'Countertops/Custom Pieces' }
                      ]}
                      disabled={!selectedManufacturer}
                      size="sm"
                      allowDeselect={false}
                    />
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb="xs">Specific System</Text>
                    <Select
                      key={`system-select-${selectedSystemGroup}`}
                      placeholder="Select system..."
                      value={selectedSystem}
                      onChange={(value) => {
                        // Only update if value is different from current selection
                        if (value && value !== selectedSystem) {
                          setSelectedSystem(value);
                          // Reset system-specific components when system changes
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
                        }
                      }}
                      data={availableSystems}
                      disabled={!selectedSystemGroup}
                      size="sm"
                      allowDeselect={false}
                    />
                  </div>
                </Stack>

                <Box mt="auto">
                  {selectedSystem && (
                    <Box p="md" bg="green.0" style={{ borderRadius: '8px' }}>
                      <Text fw={500} size="sm" c="green">
                        {availableManufacturers.find(m => m.id === selectedManufacturer)?.name} {
                          products.find(p => p.id.toString() === selectedSystem)?.name ||
                          availableSystems.find(s => s.value === selectedSystem)?.label ||
                          selectedSystem.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                        }
                      </Text>
                      <Text size="xs" c="green.7">
                        {selectedSystemGroup === 'resin-flooring' && 'Resin-based floor coating system'}
                        {selectedSystemGroup === 'polishing' && 'Concrete polishing system'}
                        {selectedSystemGroup === 'countertops-custom' && 'Custom countertop piece solution'}
                      </Text>
                    </Box>
                  )}

                  {/* System Components - No MVB Flake System (hidden in Step 2) */}
                  {showComponentsInStep2 && selectedSystem && (selectedSystem === 'no-mvb-flake-system' || products.find(p => p.id.toString() === selectedSystem)?.name === 'No MVB Flake System') && (
                    <Box mt="md" p="md" bg="gray.0" style={{ borderRadius: '8px' }}>
                      <Text fw={500} size="sm" mb="md" c="green">System Components</Text>
                      <Text size="xs" c="dimmed" mb="sm">Select products for each component in your No MVB Flake System</Text>

                      <Stack gap="sm">
                        {/* Base Pigment (Optional) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs">Base Pigment (Optional)</Text>
                          <Select
                            placeholder="Select base pigment product..."
                            value={selectedBasePigment}
                            onChange={(value) => handleSelectChange(selectedBasePigment, value, setSelectedBasePigment)}
                            data={basePigmentOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedBasePigment && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Pigment Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={noMVBBasePigmentSpreadRate}
                                onChange={(value) => setNoMVBBasePigmentSpreadRate(Number(value) || 1)}
                                min={0.1}
                                max={10}
                                step={0.1}
                                decimalScale={1}
                                description="Pigments per 3-gal Base Coat kit"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 1 pigment per 3-gal kit (US Resin: 2 per kit)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Base Coat *</Text>
                          <Select
                            placeholder="Select base coat..."
                            value={selectedBaseCoat}
                            onChange={(value) => handleSelectChange(selectedBaseCoat, value, setSelectedBaseCoat)}
                            data={baseCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={noMVBBaseCoatSpreadRate}
                                onChange={(value) => setNoMVBBaseCoatSpreadRate(Number(value) || 100)}
                                min={50}
                                max={200}
                                step={5}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 100 sq ft/gal (3-gal kit = 300 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Flake Color (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Flake Color *</Text>
                          <Select
                            placeholder="Select flake product..."
                            value={selectedFlakeColor}
                            onChange={(value) => handleSelectChange(selectedFlakeColor, value, setSelectedFlakeColor)}
                            data={flakeColorOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedFlakeColor && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Flake Color Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={noMVBFlakeColorSpreadRate}
                                onChange={(value) => setNoMVBFlakeColorSpreadRate(Number(value) || 350)}
                                min={200}
                                max={500}
                                step={25}
                                description="Square feet per box"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 350 sq ft per box</Text>
                            </Box>
                          )}
                        </div>

                        {/* Top Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Top Coat *</Text>
                          <Select
                            placeholder="Select top coat..."
                            value={selectedTopCoat}
                            onChange={(value) => handleSelectChange(selectedTopCoat, value, setSelectedTopCoat)}
                            data={topCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={noMVBTopCoatSpreadRate}
                                onChange={(value) => setNoMVBTopCoatSpreadRate(Number(value) || 200)}
                                min={100}
                                max={300}
                                step={25}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 200 sq ft per gallon (Polyaspartic)</Text>
                            </Box>
                          )}
                        </div>
                      </Stack>
                    </Box>
                  )}

                  {/* System Components - MVB Flake System (hidden in Step 2) */}
                  {showComponentsInStep2 && selectedSystem && selectedSystem === 'mvb-flake-system' && (
                    <Box mt="md" p="md" bg="gray.0" style={{ borderRadius: '8px' }}>
                      <Text fw={500} size="sm" mb="md" c="green">System Components</Text>
                      <Text size="xs" c="dimmed" mb="sm">Select products for each component in your MVB Flake System</Text>

                      <Stack gap="sm">
                        {/* Base Pigment (Optional) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs">Base Pigment (Optional)</Text>
                          <Select
                            placeholder="Select base pigment product..."
                            value={selectedMVBBasePigment}
                            onChange={(value) => handleSelectChange(selectedMVBBasePigment, value, setSelectedMVBBasePigment)}
                            data={mvbBasePigmentOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedMVBBasePigment && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Pigment Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={mvbBasePigmentSpreadRate}
                                onChange={(value) => setMVBBasePigmentSpreadRate(Number(value) || 1)}
                                min={0.1}
                                max={10}
                                step={0.1}
                                decimalScale={1}
                                description="Pigments per 3-gal Base Coat kit"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 1 pigment per 3-gal kit (US Resin: 2 per kit)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Required) - MVB Source */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Base Coat * (MVB)</Text>
                          <Select
                            placeholder="Select MVB base coat..."
                            value={selectedMVBBaseCoat}
                            onChange={(value) => handleSelectChange(selectedMVBBaseCoat, value, setSelectedMVBBaseCoat)}
                            data={mvbBaseCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedMVBBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={mvbBaseCoatSpreadRate}
                                onChange={(value) => setMVBBaseCoatSpreadRate(Number(value) || 100)}
                                min={50}
                                max={200}
                                step={5}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 100 sq ft/gal (3-gal kit = 300 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Flake Color (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Flake Color *</Text>
                          <Select
                            placeholder="Select flake product..."
                            value={selectedMVBFlakeColor}
                            onChange={(value) => handleSelectChange(selectedMVBFlakeColor, value, setSelectedMVBFlakeColor)}
                            data={mvbFlakeColorOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedMVBFlakeColor && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Flake Color Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={mvbFlakeColorSpreadRate}
                                onChange={(value) => setMVBFlakeColorSpreadRate(Number(value) || 350)}
                                min={200}
                                max={500}
                                step={25}
                                description="Square feet per box"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 350 sq ft per box</Text>
                            </Box>
                          )}
                        </div>

                        {/* Top Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Top Coat *</Text>
                          <Select
                            placeholder="Select top coat..."
                            value={selectedMVBTopCoat}
                            onChange={(value) => handleSelectChange(selectedMVBTopCoat, value, setSelectedMVBTopCoat)}
                            data={mvbTopCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedMVBTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={mvbTopCoatSpreadRate}
                                onChange={(value) => setMVBTopCoatSpreadRate(Number(value) || 200)}
                                min={100}
                                max={300}
                                step={25}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 200 sq ft per gallon (Polyaspartic)</Text>
                            </Box>
                          )}
                        </div>
                      </Stack>
                    </Box>
                  )}

                  {/* System Components - Solid Color System (hidden in Step 2) */}
                  {showComponentsInStep2 && selectedSystem && selectedSystem === 'solid-color-system' && (
                    <Box mt="md" p="md" bg="gray.0" style={{ borderRadius: '8px' }}>
                      <Text fw={500} size="sm" mb="md" c="green">System Components</Text>
                      <Text size="xs" c="dimmed" mb="sm">Select products for each component in your Solid Color System</Text>

                      <Stack gap="sm">
                        {/* Base Pigment (Optional) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs">Base Pigment (Optional)</Text>
                          <Select
                            placeholder="Select base pigment product..."
                            value={selectedSolidBasePigment}
                            onChange={(value) => handleSelectChange(selectedSolidBasePigment, value, setSelectedSolidBasePigment)}
                            data={solidBasePigmentOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedSolidBasePigment && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Pigment Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={solidBasePigmentSpreadRate}
                                onChange={(value) => setSolidBasePigmentSpreadRate(Number(value) || 1)}
                                min={0.1}
                                max={10}
                                step={0.1}
                                decimalScale={1}
                                description="Pigments per 3-gal Base Coat kit"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 1 pigment per 3-gal kit (US Resin: 2 per kit)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Grout Coat (Suggestive) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="orange">Grout Coat (Suggestive)</Text>
                          <Select
                            placeholder="Select grout coat..."
                            value={selectedSolidGroutCoat}
                            onChange={(value) => handleSelectChange(selectedSolidGroutCoat, value, setSelectedSolidGroutCoat)}
                            data={solidGroutCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedSolidGroutCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Grout Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={solidGroutCoatSpreadRate}
                                onChange={(value) => setSolidGroutCoatSpreadRate(Number(value) || 600)}
                                min={400}
                                max={800}
                                step={25}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 600 sq ft/gal (3-gal kit = 1,800 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Base Coat *</Text>
                          <Select
                            placeholder="Select base coat..."
                            value={selectedSolidBaseCoat}
                            onChange={(value) => handleSelectChange(selectedSolidBaseCoat, value, setSelectedSolidBaseCoat)}
                            data={solidBaseCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedSolidBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={solidBaseCoatSpreadRate}
                                onChange={(value) => setSolidBaseCoatSpreadRate(Number(value) || 75)}
                                min={50}
                                max={150}
                                step={5}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 75 sq ft/gal (3-gal kit = 225 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Extra Base Coat (Clear Coat - Optional) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs">Extra Base Coat (Clear Coat - Optional)</Text>
                          <Select
                            placeholder="Select extra base coat..."
                            value={selectedSolidExtraBaseCoat}
                            onChange={(value) => handleSelectChange(selectedSolidExtraBaseCoat, value, setSelectedSolidExtraBaseCoat)}
                            data={solidExtraBaseCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedSolidExtraBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Extra Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={solidExtraBaseCoatSpreadRate}
                                onChange={(value) => setSolidExtraBaseCoatSpreadRate(Number(value) || 80)}
                                min={50}
                                max={150}
                                step={5}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 80 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Top Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Top Coat *</Text>
                          <Select
                            placeholder="Select top coat..."
                            value={selectedSolidTopCoat}
                            onChange={(value) => handleSelectChange(selectedSolidTopCoat, value, setSelectedSolidTopCoat)}
                            data={solidTopCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedSolidTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={solidTopCoatSpreadRate}
                                onChange={(value) => setSolidTopCoatSpreadRate(Number(value) || 200)}
                                min={100}
                                max={300}
                                step={25}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Rate: Prefilled from selected topcoat; adjust if needed</Text>
                            </Box>
                          )}
                        </div>
                      </Stack>
                    </Box>
                  )}

                  {/* System Components - Metallic System (hidden in Step 2) */}
                  {showComponentsInStep2 && selectedSystem && selectedSystem === 'metallic-system' && (
                    <Box mt="md" p="md" bg="gray.0" style={{ borderRadius: '8px' }}>
                      <Text fw={500} size="sm" mb="md" c="green">System Components</Text>
                      <Text size="xs" c="dimmed" mb="sm">Select products for each component in your Metallic System</Text>

                      <Stack gap="sm">
                        {/* Base Pigment (Optional) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs">Base Pigment (Optional)</Text>
                          <Select
                            placeholder="Select base pigment product..."
                            value={selectedMetallicBasePigment}
                            onChange={(value) => handleSelectChange(selectedMetallicBasePigment, value, setSelectedMetallicBasePigment)}
                            data={metallicBasePigmentOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedMetallicBasePigment && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Pigment Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={metallicBasePigmentSpreadRate}
                                onChange={(value) => setMetallicBasePigmentSpreadRate(Number(value) || 1)}
                                min={0.1}
                                max={10}
                                step={0.1}
                                decimalScale={1}
                                description="Pigments per 3-gal Base Coat kit"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 1 pigment per 3-gal kit (US Resin: 2 per kit)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Grout Coat (Suggestive) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="orange">Grout Coat (Suggestive)</Text>
                          <Select
                            placeholder="Select grout coat..."
                            value={selectedMetallicGroutCoat}
                            onChange={(value) => handleSelectChange(selectedMetallicGroutCoat, value, setSelectedMetallicGroutCoat)}
                            data={metallicGroutCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedMetallicGroutCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Grout Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={metallicGroutCoatSpreadRate}
                                onChange={(value) => setMetallicGroutCoatSpreadRate(Number(value) || 600)}
                                min={400}
                                max={800}
                                step={25}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 600 sq ft/gal (3-gal kit = 1,800 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Base Coat *</Text>
                          <Select
                            placeholder="Select base coat..."
                            value={selectedMetallicBaseCoat}
                            onChange={(value) => handleSelectChange(selectedMetallicBaseCoat, value, setSelectedMetallicBaseCoat)}
                            data={metallicBaseCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedMetallicBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={metallicBaseCoatSpreadRate}
                                onChange={(value) => setMetallicBaseCoatSpreadRate(Number(value) || 80)}
                                min={50}
                                max={150}
                                step={5}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 80 sq ft/gal (3-gal kit = 240 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Metallic Money Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Metallic Money Coat *</Text>
                          <Select
                            placeholder="Select metallic money coat..."
                            value={selectedMetallicMoneyCoat}
                            onChange={(value) => handleSelectChange(selectedMetallicMoneyCoat, value, setSelectedMetallicMoneyCoat)}
                            data={metallicMoneyCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedMetallicMoneyCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Metallic Money Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={metallicMoneyCoatSpreadRate}
                                onChange={(value) => setMetallicMoneyCoatSpreadRate(Number(value) || 30)}
                                min={20}
                                max={50}
                                step={5}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 30 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Metallic Pigment (Required - Multi-Select with Quantities) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Metallic Pigment * (Multiple selections)</Text>
                          {/* Inline Mix Assistant helper right under the label */}
                          <Group gap={6} align="center" mb="xs">
                            <Text size="xs" c="dimmed">
                              (<Text span inherit fw={600}>Mix Assistant</Text>: Recommend pigment counts by Primary/Accent/Depth roles based on your area. Choose pigments first, then Apply.)
                            </Text>
                            <Button size="xs" variant="light" onClick={applyMetallicMixAssistant}>Apply</Button>
                          </Group>
                          <Text size="xs" c="dimmed" mb="xs">Select colors and set quantities for your metallic effect</Text>

                          {/* Pigment Selection Dropdown */}
                          <Group gap="xs" mb="xs">
                            <Select
                              placeholder="Choose a metallic pigment to add..."
                              value=""
                              onChange={(value) => {
                                if (value) {
                                  const option = metallicPigmentOptions.find(opt => opt.value === value);
                                  if (option) {
                                    // Check if this pigment is already selected
                                    const alreadySelected = selectedMetallicPigments.some(p => p.id === value);
                                    if (!alreadySelected) {
                                      setSelectedMetallicPigments([...selectedMetallicPigments, {
                                        id: value,
                                        name: option.label,
                                        quantity: 1
                                      }]);
                                    }
                                  }
                                }
                              }}
                              data={metallicPigmentOptions.filter(option =>
                                !selectedMetallicPigments.some(selected => selected.id === option.value)
                              )}
                              size="xs"
                              style={{ flex: 1 }}
                              searchable
                            />
                            <Button
                              size="xs"
                              variant="light"
                              disabled={metallicPigmentOptions.length === 0 || selectedMetallicPigments.length >= metallicPigmentOptions.length}
                            >
                              Add
                            </Button>
                          </Group>

                          {/* Selected Pigments List with thumbnails */}
                          <Stack gap="xs">
                            {selectedMetallicPigments.map((pigment, index) => (
                              <Box key={`${pigment.id}-${index}`} p="xs" bg="white" style={{ borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                                <Group gap="xs" align="center">
                                  {/* Thumbnail preview if product has image */}
                                  {(() => {
                                    const prod = getProduct(pigment.id); return (
                                      <ThumbImg src={prod ? getProductImageUrl(prod.image_url) : undefined} size={24} />
                                    );
                                  })()}
                                  {/* Pigment name with color indicator using text */}
                                  <Text size="xs" fw={500} style={{ flex: 1, minWidth: 0 }} truncate>
                                    {pigment.name}
                                  </Text>

                                  {/* Quantity input */}
                                  <NumberInput
                                    placeholder="Qty"
                                    value={pigment.quantity}
                                    onChange={(value) => {
                                      setSelectedMetallicPigments(selectedMetallicPigments.map((p, i) =>
                                        i === index ? { ...p, quantity: Number(value) || 0 } : p
                                      ));
                                    }}
                                    min={0}
                                    step={1}
                                    size="xs"
                                    w={70}
                                    styles={{
                                      input: { textAlign: 'center' }
                                    }}
                                  />

                                  {/* Remove button */}
                                  <Button
                                    size="xs"
                                    variant="subtle"
                                    color="red"
                                    onClick={() => {
                                      setSelectedMetallicPigments(selectedMetallicPigments.filter((_, i) => i !== index));
                                    }}
                                    w={30}
                                    h={24}
                                    p={0}
                                  >
                                    ×
                                  </Button>
                                </Group>
                              </Box>
                            ))}

                            {selectedMetallicPigments.length === 0 && (
                              <Box p="xs" bg="gray.1" style={{ borderRadius: '4px', border: '1px dashed #ccc' }}>
                                <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
                                  No metallic pigments selected
                                </Text>
                              </Box>
                            )}
                          </Stack>
                        </div>

                        {/* Top Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Top Coat *</Text>
                          <Select
                            placeholder="Select top coat..."
                            value={selectedMetallicTopCoat}
                            onChange={(value) => handleSelectChange(selectedMetallicTopCoat, value, setSelectedMetallicTopCoat)}
                            data={metallicTopCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedMetallicTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Metallic Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={metallicTopCoatSpreadRate}
                                onChange={(value) => setMetallicTopCoatSpreadRate(Number(value) || 200)}
                                min={100}
                                max={400}
                                step={5}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested from product when available; editable for job-specific conditions.</Text>
                            </Box>
                          )}
                        </div>
                      </Stack>
                    </Box>
                  )}

                  {/* System Components - Grind & Seal System (hidden in Step 2) */}
                  {showComponentsInStep2 && selectedSystem && selectedSystem === 'grind-seal-system' && (
                    <Box mt="md" p="md" bg="gray.0" style={{ borderRadius: '8px' }}>
                      <Text fw={500} size="sm" mb="md" c="green">System Components</Text>
                      <Text size="xs" c="dimmed" mb="sm">Select products for each component in your Grind & Seal System</Text>

                      <Stack gap="sm">
                        {/* Primer (Optional) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs">Primer (Optional)</Text>
                          <Text size="xs" c="dimmed" mb="xs">Choose none if not selecting product</Text>
                          <Select
                            placeholder="Select primer product..."
                            value={selectedGrindSealPrimer}
                            onChange={(value) => handleSelectChange(selectedGrindSealPrimer, value, setSelectedGrindSealPrimer)}
                            data={grindSealPrimerOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedGrindSealPrimer && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Primer Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={200} // Default primer rate
                                onChange={() => { }} // Read-only for now
                                min={100}
                                max={300}
                                step={25}
                                description="Square feet per gallon"
                                disabled
                              />
                              <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected primer product specifications</Text>
                            </Box>
                          )}
                        </div>

                        {/* Grout Coat (Optional) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs">Grout Coat (Optional)</Text>
                          <Text size="xs" c="dimmed" mb="xs">Products from Epoxy or Metallic Top Coats categories</Text>
                          <Select
                            placeholder="Select grout coat..."
                            value={selectedGrindSealGroutCoat}
                            onChange={(value) => handleSelectChange(selectedGrindSealGroutCoat, value, setSelectedGrindSealGroutCoat)}
                            data={grindSealGroutCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedGrindSealGroutCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Grout Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={grindSealGroutSpreadRate}
                                onChange={(value) => setGrindSealGroutSpreadRate(Number(value) || 600)}
                                min={400}
                                max={800}
                                step={25}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 600 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Optional) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs">Base Coat (Optional)</Text>
                          <Text size="xs" c="dimmed" mb="xs">Products from Epoxy or Metallic Top Coats categories</Text>
                          <Select
                            placeholder="Select base coat..."
                            value={selectedGrindSealBaseCoat}
                            onChange={(value) => handleSelectChange(selectedGrindSealBaseCoat, value, setSelectedGrindSealBaseCoat)}
                            data={grindSealBaseCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedGrindSealBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={grindSealBaseSpreadRate}
                                onChange={(value) => setGrindSealBaseSpreadRate(Number(value) || 125)}
                                min={75}
                                max={200}
                                step={25}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 125 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Intermediate Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Intermediate Coat *</Text>
                          <Text size="xs" c="dimmed" mb="xs">Products from Epoxy or Metallic Top Coats categories</Text>
                          <Select
                            placeholder="Select intermediate coat..."
                            value={selectedGrindSealIntermediateCoat}
                            onChange={(value) => handleSelectChange(selectedGrindSealIntermediateCoat, value, setSelectedGrindSealIntermediateCoat)}
                            data={grindSealIntermediateCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedGrindSealIntermediateCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Intermediate Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={grindSealIntermediateCoatSpreadRate}
                                onChange={(value) => setGrindSealIntermediateCoatSpreadRate(Number(value) || 150)}
                                min={100}
                                max={250}
                                step={25}
                                description="Square feet per gallon"
                              />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 150 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Top Coat (Required) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs" c="red">Top Coat *</Text>
                          <Text size="xs" c="dimmed" mb="xs">Products from Metallic Top Coats or Polyaspartic Topcoats</Text>
                          <Select
                            placeholder="Select top coat..."
                            value={selectedGrindSealTopCoat}
                            onChange={(value) => handleSelectChange(selectedGrindSealTopCoat, value, setSelectedGrindSealTopCoat)}
                            data={grindSealTopCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedGrindSealTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={200} // Default rate - should refer to product
                                onChange={() => { }} // Read-only for now
                                min={100}
                                max={300}
                                step={25}
                                description="Square feet per gallon"
                                disabled
                              />
                              <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected topcoat product specifications</Text>
                            </Box>
                          )}
                        </div>

                        {/* Additional Top Coat (Optional) */}
                        <div>
                          <Text size="xs" fw={500} mb="xs">Additional Top Coat (Optional)</Text>
                          <Text size="xs" c="dimmed" mb="xs">Products from Metallic Top Coats or Polyaspartic Topcoats</Text>
                          <Select
                            placeholder="Select additional top coat..."
                            value={selectedGrindSealAdditionalTopCoat}
                            onChange={(value) => handleSelectChange(selectedGrindSealAdditionalTopCoat, value, setSelectedGrindSealAdditionalTopCoat)}
                            data={grindSealAdditionalTopCoatOptions}
                            size="xs"
                            allowDeselect={false}
                          />
                          {selectedGrindSealAdditionalTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Additional Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput
                                size="xs"
                                value={200} // Default rate - should refer to product
                                onChange={() => { }} // Read-only for now
                                min={100}
                                max={300}
                                step={25}
                                description="Square feet per gallon"
                                disabled
                              />
                              <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected topcoat product specifications</Text>
                            </Box>
                          )}
                        </div>
                      </Stack>
                    </Box>
                  )}

                  {/* System Components - Countertop Systems (hidden in Step 2) */}
                  {showComponentsInStep2 && selectedSystem && selectedSystemGroup === 'countertops-custom' && (
                    <Box mt="md" p="md" bg="gray.0" style={{ borderRadius: '8px' }}>
                      <Group justify="space-between" align="center" mb="md">
                        <Text fw={500} size="sm" c="green">System Components</Text>
                        <Badge variant="light" color="green" size="sm">
                          {[selectedCountertopPrimer, selectedCountertopBasePigment, selectedCountertopMetallicArtCoat, selectedCountertopFloodCoat, selectedCountertopTopCoat].filter(v => v).length + (selectedCountertopMetallicPigments.length > 0 ? 1 : 0)}/6 Selected
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed" mb="sm">Configure your countertop system components</Text>

                      <Accordion variant="contained" radius="sm">
                        {/* Primer Section */}
                        <Accordion.Item value="primer" id="ct-step-1">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={500}>Primer (Optional)</Text>
                              {selectedCountertopPrimer && (
                                <Badge variant="filled" color="green" size="sm">Selected</Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Primers category</Text>
                            <Select
                              placeholder="Select primer product..."
                              value={selectedCountertopPrimer}
                              onChange={(value) => setSelectedCountertopPrimer(value || '')}
                              data={countertopPrimerOptions}
                              size="sm"
                            />
                            {selectedCountertopPrimer && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Bonding Primer Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={200} // Default primer rate
                                  onChange={() => { }} // Read-only for now
                                  min={100}
                                  max={300}
                                  step={25}
                                  description="Square feet per gallon"
                                  disabled
                                />
                                <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected primer product specifications</Text>
                                {guidedMode && (
                                  <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep('ct-step-2')}>
                                    Next: Base Pigment →
                                  </Button>
                                )}
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Base Pigment Section */}
                        <Accordion.Item value="base-pigment" id="ct-step-2">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={500}>Base Pigment (Optional)</Text>
                              {selectedCountertopBasePigment && (
                                <Badge variant="filled" color="green" size="sm">Selected</Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Base Pigments category</Text>
                            <Select
                              placeholder="Select base pigment product..."
                              value={selectedCountertopBasePigment}
                              onChange={(value) => setSelectedCountertopBasePigment(value || '')}
                              data={countertopBasePigmentOptions}
                              size="sm"
                            />
                            {selectedCountertopBasePigment && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={countertopBaseCoatSpreadRate}
                                  onChange={(value) => setCountertopBaseCoatSpreadRate(Number(value) || 400)}
                                  min={200}
                                  max={600}
                                  step={25}
                                  description="Square feet per gallon"
                                />
                                <Text size="xs" c="dimmed" mt="2">Suggested: 1 qt per 100 sq ft (400 sq ft per gallon)</Text>
                                {guidedMode && (
                                  <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep('ct-step-3')}>
                                    Next: Metallic Art Coat →
                                  </Button>
                                )}
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Metallic Art Coat Section */}
                        <Accordion.Item value="metallic-art-coat" id="ct-step-3">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={500} c="red">Metallic Art Coat * (Required)</Text>
                              {selectedCountertopMetallicArtCoat && (
                                <Badge variant="filled" color="green" size="sm">Selected</Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Metallic Money Coat category</Text>
                            <Select
                              placeholder="Select metallic art coat..."
                              value={selectedCountertopMetallicArtCoat}
                              onChange={(value) => setSelectedCountertopMetallicArtCoat(value || '')}
                              data={countertopMetallicArtCoatOptions}
                              size="sm"
                            />
                            {selectedCountertopMetallicArtCoat && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Metallic Art Coat Application Rate:</Text>
                                <NumberInput
                                  size="xs"
                                  value={countertopMetallicArtCoatSpreadRate}
                                  onChange={(value) => setCountertopMetallicArtCoatSpreadRate(Number(value) || 4.57)}
                                  min={3}
                                  max={8}
                                  step={0.1}
                                  decimalScale={2}
                                  description="Display only - ounces per square foot used for calculations"
                                />
                                <Text size="xs" c="dimmed" mt="2">Standard: 4 ounces per square foot</Text>
                                {guidedMode && (
                                  <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep('ct-step-4')}>
                                    Next: Metallic Pigments →
                                  </Button>
                                )}
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Metallic Pigments Section */}
                        <Accordion.Item value="metallic-pigments" id="ct-step-4">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={500} c="red">Metallic Pigments * (Required)</Text>
                              {selectedCountertopMetallicPigments.length > 0 && (
                                <Badge variant="filled" color="green" size="sm">
                                  {selectedCountertopMetallicPigments.length} Selected
                                </Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Select colors and set quantities for your metallic effect</Text>
                            <Group gap={6} align="center" mb="md">
                              <Text size="xs" c="dimmed">
                                (<Text span inherit fw={600}>Mix Assistant</Text>: Recommend pigment counts by Primary/Accent/Depth roles based on your area. Choose pigments first, then Apply.)
                              </Text>
                              <Button size="xs" variant="light" onClick={applyCountertopMixAssistant}>Apply</Button>
                            </Group>

                            {/* Pigment Selection Dropdown */}
                            <Group gap="xs" mb="md">
                              <Select
                                placeholder="Choose a metallic pigment to add..."
                                value=""
                                onChange={(value) => {
                                  if (value) {
                                    const option = countertopMetallicPigmentOptions.find(opt => opt.value === value);
                                    if (option) {
                                      const alreadySelected = selectedCountertopMetallicPigments.some(p => p.id === value);
                                      if (!alreadySelected) {
                                        setSelectedCountertopMetallicPigments([...selectedCountertopMetallicPigments, {
                                          id: value,
                                          name: option.label,
                                          quantity: 1
                                        }]);
                                      }
                                    }
                                  }
                                }}
                                data={countertopMetallicPigmentOptions.filter(option =>
                                  !selectedCountertopMetallicPigments.some(selected => selected.id === option.value)
                                )}
                                size="sm"
                                style={{ flex: 1 }}
                                searchable
                              />
                              <Button
                                size="sm"
                                variant="light"
                                disabled={countertopMetallicPigmentOptions.length === 0 || selectedCountertopMetallicPigments.length >= countertopMetallicPigmentOptions.length}
                              >
                                Add
                              </Button>
                            </Group>

                            {/* Selected Pigments List */}
                            <Stack gap="sm">
                              {selectedCountertopMetallicPigments.map((pigment, index) => (
                                <Box key={`${pigment.id}-${index}`} p="sm" bg="white" style={{ borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                                  <Group gap="sm" align="center">
                                    {/* Thumbnail preview if product has image */}
                                    {(() => {
                                      const prod = getProduct(pigment.id); return (
                                        <ThumbImg src={prod ? getProductImageUrl(prod.image_url) : undefined} size={28} />
                                      );
                                    })()}
                                    <Text size="sm" fw={500} style={{ flex: 1, minWidth: 0 }} truncate>
                                      {pigment.name}
                                    </Text>
                                    <NumberInput
                                      placeholder="Qty"
                                      value={pigment.quantity}
                                      onChange={(value) => {
                                        setSelectedCountertopMetallicPigments(selectedCountertopMetallicPigments.map((p, i) =>
                                          i === index ? { ...p, quantity: Number(value) || 0 } : p
                                        ));
                                      }}
                                      min={0}
                                      step={1}
                                      size="sm"
                                      w={80}
                                    />
                                    <Button
                                      size="sm"
                                      variant="subtle"
                                      color="red"
                                      onClick={() => {
                                        setSelectedCountertopMetallicPigments(selectedCountertopMetallicPigments.filter((_, i) => i !== index));
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </Group>
                                </Box>
                              ))}

                              {selectedCountertopMetallicPigments.length === 0 && (
                                <Box p="md" bg="gray.1" style={{ borderRadius: '6px', border: '1px dashed #ccc' }}>
                                  <Text size="sm" c="dimmed" style={{ textAlign: 'center' }}>
                                    No metallic pigments selected
                                  </Text>
                                </Box>
                              )}
                            </Stack>

                            {selectedCountertopMetallicPigments.length > 0 && (
                              <Box mt="md">
                                <Text size="xs" c="dimmed" mb="4">Metallic Pigment Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={countertopMetallicPigmentSpreadRate}
                                  onChange={(value) => setCountertopMetallicPigmentSpreadRate(Number(value) || 1)}
                                  min={0.1}
                                  max={10}
                                  step={0.1}
                                  decimalScale={1}
                                  description="Containers per 3-gal Art Coat kit"
                                />
                                <Text size="xs" c="dimmed" mt="2">Suggested: 1 container per 3-gal kit</Text>
                                {guidedMode && (
                                  <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep('ct-step-5')}>
                                    Next: Flood Coat →
                                  </Button>
                                )}
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Flood Coat Section */}
                        <Accordion.Item value="flood-coat" id="ct-step-5">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={500}>Flood Coat (Optional)</Text>
                              {selectedCountertopFloodCoat && (
                                <Badge variant="filled" color="green" size="sm">Selected</Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Metallic Money Coat - Usually have enough from Art Coat</Text>
                            <Select
                              placeholder="Select flood coat..."
                              value={selectedCountertopFloodCoat}
                              onChange={(value) => setSelectedCountertopFloodCoat(value || '')}
                              data={countertopFloodCoatOptions}
                              size="sm"
                            />
                            {selectedCountertopFloodCoat && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Clear Coat Application Rate:</Text>
                                <NumberInput
                                  size="xs"
                                  value={countertopClearCoatSpreadRate}
                                  onChange={(value) => setCountertopClearCoatSpreadRate(Number(value) || 4.57)}
                                  min={3}
                                  max={8}
                                  step={0.1}
                                  decimalScale={2}
                                  description="Square feet per gallon"
                                />
                                <Text size="xs" c="dimmed" mt="2">Standard: 3 ounces per square foot</Text>
                                {guidedMode && (
                                  <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep('ct-step-6')}>
                                    Next: Top Coat →
                                  </Button>
                                )}
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Top Coat Section */}
                        <Accordion.Item value="top-coat" id="ct-step-6">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={500} c="red">Top Coat * (Required)</Text>
                              {selectedCountertopTopCoat && (
                                <Badge variant="filled" color="green" size="sm">Selected</Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Metallic Top Coats category</Text>
                            <Select
                              placeholder="Select top coat..."
                              value={selectedCountertopTopCoat}
                              onChange={(value) => setSelectedCountertopTopCoat(value || '')}
                              data={countertopTopCoatOptions}
                              size="sm"
                            />
                            {selectedCountertopTopCoat && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Metallic Top Coat Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={200} // Default rate - should refer to product
                                  onChange={() => { }} // Read-only for now
                                  min={100}
                                  max={300}
                                  step={25}
                                  description="Square feet per gallon"
                                  disabled
                                />
                                <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected topcoat product specifications</Text>
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>
                    </Box>
                  )}
                </Box>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Step 3: Area & Surface Details */}
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <Paper p="lg" withBorder style={{ height: '100%', borderColor: '#0ea5e9', borderWidth: '2px' }}>
              <Stack gap="md" h="100%">
                <Title order={4} c="blue">
                  Step 3: {selectedSystemGroup === 'countertops-custom' ? 'Custom Pieces' : 'Area & Surface'}
                </Title>
                <Text c="dimmed" size="sm">
                  {selectedSystemGroup === 'countertops-custom' ? 'Add and configure custom pieces or enter totals directly' : 'Enter dimensions or total area'}
                </Text>

                {selectedSystemGroup === 'countertops-custom' ? (
                  <Stack gap="sm">
                    {countertopMode === 'pieces' && (
                      <Group justify="flex-end">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => {
                            const newPiece = {
                              id: countertopPieces.length + 1,
                              name: `Piece ${countertopPieces.length + 1}`,
                              length: 0,
                              width: 0,
                              edgeHeight: 0,
                              edgeWidth: 0,
                              backsplashHeight: 0,
                              backsplashWidth: 0
                            };
                            setCountertopPieces([...countertopPieces, newPiece]);
                          }}
                        >
                          + Add Piece
                        </Button>
                      </Group>
                    )}

                    {/* Mode toggle */}
                    <Radio.Group value={countertopMode} onChange={(v) => setCountertopMode(v as 'pieces' | 'totals')}>
                      <Group gap="xs">
                        <Radio value="pieces" label="Build by pieces" />
                        <Radio value="totals" label="Enter totals" />
                      </Group>
                    </Radio.Group>

                    {countertopMode === 'totals' ? (
                      <Paper withBorder p="sm" radius="md" style={{ backgroundColor: '#F8FAFC' }}>
                        <Stack gap={6}>
                          <Group gap="xs" wrap="nowrap" align="flex-end">
                            <Badge color="blue" variant="light">SURFACE</Badge>
                            <NumberInput
                              value={countertopDirectSurface || ''}
                              onChange={(v) => setCountertopDirectSurface(Number(v) || 0)}
                              min={0}
                              placeholder="0"
                              label="Surface"
                              rightSection={<Text c="dimmed">sq ft</Text>}
                              style={{ maxWidth: 200 }}
                            />
                          </Group>
                          <Group gap="xs" wrap="nowrap" align="flex-end">
                            <Badge color="teal" variant="light">EDGE</Badge>
                            <NumberInput
                              value={countertopDirectEdge || ''}
                              onChange={(v) => setCountertopDirectEdge(Number(v) || 0)}
                              min={0}
                              placeholder="0"
                              label="Edge"
                              rightSection={<Text c="dimmed">lf</Text>}
                              style={{ maxWidth: 200 }}
                            />
                          </Group>
                          <Group gap="xs" wrap="nowrap" align="flex-end">
                            <Badge color="pink" variant="light">BACKSPLASH</Badge>
                            <NumberInput
                              value={countertopDirectBacksplash || ''}
                              onChange={(v) => setCountertopDirectBacksplash(Number(v) || 0)}
                              min={0}
                              placeholder="0"
                              label="Backsplash"
                              rightSection={<Text c="dimmed">lf</Text>}
                              style={{ maxWidth: 200 }}
                            />
                          </Group>
                        </Stack>
                      </Paper>
                    ) : (
                      countertopPieces.map((piece) => (
                        <Paper key={piece.id} withBorder p="sm" radius="md" style={{ backgroundColor: '#F8FAFC' }}>
                          <Stack gap={6}>
                            <TextInput
                              value={piece.name}
                              onChange={(e) => {
                                const updated = countertopPieces.map(p =>
                                  p.id === piece.id ? { ...p, name: e.currentTarget.value } : p
                                );
                                setCountertopPieces(updated);
                              }}
                              placeholder={`Piece ${piece.id}`}
                            />

                            <Box style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 12px minmax(0,1fr)', alignItems: 'end', columnGap: 6, width: '100%' }}>
                              <Badge color="blue" variant="light" style={{ minWidth: 90, justifySelf: 'start', whiteSpace: 'nowrap', flexShrink: 0 }}>SURFACE</Badge>
                              <NumberInput
                                value={piece.length || ''}
                                onChange={(value) => {
                                  const updated = countertopPieces.map(p =>
                                    p.id === piece.id ? { ...p, length: Number(value) || 0 } : p
                                  );
                                  setCountertopPieces(updated);
                                }}
                                min={0}
                                placeholder="0"
                                rightSection={<Text c="dimmed">ft</Text>}
                                size="sm"
                                styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                              />
                              <Text c="dimmed" style={{ alignSelf: 'center' }}>×</Text>
                              <NumberInput
                                value={piece.width || ''}
                                onChange={(value) => {
                                  const updated = countertopPieces.map(p =>
                                    p.id === piece.id ? { ...p, width: Number(value) || 0 } : p
                                  );
                                  setCountertopPieces(updated);
                                }}
                                min={0}
                                placeholder="0"
                                rightSection={<Text c="dimmed">ft</Text>}
                                size="sm"
                                styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                              />
                            </Box>

                            <Box style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 12px minmax(0,1fr)', alignItems: 'end', columnGap: 6, width: '100%' }}>
                              <Badge color="teal" variant="light" style={{ minWidth: 90, justifySelf: 'start', whiteSpace: 'nowrap', flexShrink: 0 }}>EDGE</Badge>
                              <NumberInput
                                value={piece.edgeHeight || ''}
                                onChange={(value) => {
                                  const updated = countertopPieces.map(p =>
                                    p.id === piece.id ? { ...p, edgeHeight: Number(value) || 0 } : p
                                  );
                                  setCountertopPieces(updated);
                                }}
                                min={0}
                                placeholder="0"
                                rightSection={<Text c="dimmed">in</Text>}
                                size="sm"
                                styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                              />
                              <Box />
                              <NumberInput
                                value={piece.edgeWidth || ''}
                                onChange={(value) => {
                                  const updated = countertopPieces.map(p =>
                                    p.id === piece.id ? { ...p, edgeWidth: Number(value) || 0 } : p
                                  );
                                  setCountertopPieces(updated);
                                }}
                                min={0}
                                placeholder="0"
                                rightSection={<Text c="dimmed">ft</Text>}
                                size="sm"
                                styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                              />
                            </Box>

                            <Box style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 12px minmax(0,1fr)', alignItems: 'end', columnGap: 6, width: '100%' }}>
                              <Badge color="pink" variant="light" style={{ minWidth: 90, justifySelf: 'start', whiteSpace: 'nowrap', flexShrink: 0 }}>BACKSPLASH</Badge>
                              <NumberInput
                                value={piece.backsplashHeight || ''}
                                onChange={(value) => {
                                  const updated = countertopPieces.map(p =>
                                    p.id === piece.id ? { ...p, backsplashHeight: Number(value) || 0 } : p
                                  );
                                  setCountertopPieces(updated);
                                }}
                                min={0}
                                placeholder="0"
                                rightSection={<Text c="dimmed">in</Text>}
                                size="sm"
                                styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                              />
                              <Box />
                              <NumberInput
                                value={piece.backsplashWidth || ''}
                                onChange={(value) => {
                                  const updated = countertopPieces.map(p =>
                                    p.id === piece.id ? { ...p, backsplashWidth: Number(value) || 0 } : p
                                  );
                                  setCountertopPieces(updated);
                                }}
                                min={0}
                                placeholder="0"
                                rightSection={<Text c="dimmed">ft</Text>}
                                size="sm"
                                styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                              />
                            </Box>

                            <Text size="xs" c="dimmed">
                              Edge: {(Number(piece.edgeWidth) || 0).toFixed(2)} lf • Backsplash: {(Number(piece.backsplashWidth) || 0).toFixed(2)} lf
                            </Text>

                            {piece.length * piece.width > 0 && (
                              <Text size="xs" c="blue" fw={500}>
                                Surface: {(piece.length * piece.width).toFixed(2)} sq ft
                              </Text>
                            )}
                          </Stack>
                        </Paper>
                      ))
                    )}

                    <Box p="sm" bg="blue.1" style={{ borderRadius: '6px' }}>
                      <Stack gap={6}>
                        <Group gap={6} wrap="wrap">
                          <Badge variant="light" color="blue">SURFACE: {(() => {
                            if (countertopMode === 'totals') return countertopDirectSurface.toFixed(2);
                            return countertopPieces.reduce((total, piece) => total + (piece.length * piece.width), 0).toFixed(2);
                          })()} sq ft</Badge>
                          <Badge variant="light" color="teal">EDGE: {countertopEdgeLf.toFixed(2)} lf</Badge>
                          <Badge variant="light" color="pink">BACKSPLASH: {countertopBacksplashLf.toFixed(2)} lf</Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Edge and backsplash measured in linear feet (lf). Heights are captured for materials but don’t affect LF totals.
                        </Text>
                      </Stack>
                    </Box>
                  </Stack>
                ) : (
                  <Stack gap="sm">
                    <div>
                      <Text size="sm" fw={500} mb="xs">Dimensions (ft)</Text>
                      <Group gap="xs">
                        <NumberInput
                          placeholder="Length"
                          value={dimensions.length}
                          onChange={(value) => setDimensions(prev => ({ ...prev, length: Number(value) || 0 }))}
                          min={0}
                          step={0.1}
                          size="sm"
                          style={{ flex: 1 }}
                        />
                        <Text size="sm" c="dimmed">×</Text>
                        <NumberInput
                          placeholder="Width"
                          value={dimensions.width}
                          onChange={(value) => setDimensions(prev => ({ ...prev, width: Number(value) || 0 }))}
                          min={0}
                          step={0.1}
                          size="sm"
                          style={{ flex: 1 }}
                        />
                      </Group>
                      {calculatedSqft > 0 && (
                        <Text size="xs" c="blue" fw={500} mt="xs">
                          = {calculatedSqft.toFixed(1)} sq ft
                        </Text>
                      )}
                    </div>

                    <div>
                      <Text size="sm" fw={500} mb="xs">Or Total Area</Text>
                      <NumberInput
                        placeholder="Enter square footage"
                        value={totalSqft}
                        onChange={(value) => setTotalSqft(Number(value) || 0)}
                        min={0}
                        step={1}
                        size="sm"
                        rightSection={
                          <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                            sq ft
                          </Text>
                        }
                      />
                    </div>

                    <div>
                      <Text size="sm" fw={500} mb="xs">Quick Presets</Text>
                      <Group gap="xs">
                        {quickPresets.map((preset) => (
                          <Button
                            key={preset.id}
                            variant="light"
                            size="xs"
                            onClick={() => setTotalSqft(preset.value)}
                            onDoubleClick={() => {
                              setEditingPresetId(preset.id);
                              setEditingPresetValue(preset.value);
                            }}
                            title="Double-click to edit preset"
                            style={{ minWidth: '80px' }}
                          >
                            {editingPresetId === preset.id ? (
                              <NumberInput
                                value={editingPresetValue}
                                onChange={(value) => setEditingPresetValue(Number(value) || 0)}
                                onBlur={() => {
                                  updatePreset(preset.id, editingPresetValue);
                                  setEditingPresetId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updatePreset(preset.id, editingPresetValue);
                                    setEditingPresetId(null);
                                  }
                                }}
                                size="xs"
                                style={{ width: '60px' }}
                                variant="unstyled"
                                autoFocus
                              />
                            ) : (
                              `${preset.value}`
                            )}
                          </Button>
                        ))}
                      </Group>
                      <Text size="xs" c="dimmed" mt="xs">
                        Click to apply, double-click to edit presets
                      </Text>
                    </div>
                    {selectedSystemGroup === 'resin-flooring' && selectedSurfaceHardness === 'soft' && (
                      <Box mt="xs" p="sm" style={{ border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e', borderRadius: 6 }}>
                        <Text size="sm">Soft slab selected — consider a primer coat or higher-build to account for absorption.</Text>
                      </Box>
                    )}
                    {selectedSystemGroup === 'resin-flooring' && (
                      <div>
                        <Text size="sm" fw={500} mb="xs">Surface Hardness</Text>
                        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                          {[
                            { value: 'soft', label: 'Soft', desc: 'Under 3000 PSI' },
                            { value: 'medium', label: 'Medium', desc: '3000–5000 PSI' },
                            { value: 'hard', label: 'Hard', desc: '5000–7000 PSI' },
                            { value: 'very-hard', label: 'Very Hard', desc: 'Over 7000 PSI' }
                          ].map((opt) => (
                            <Box
                              key={opt.value}
                              onClick={() => hasArea && setSelectedSurfaceHardness(opt.value)}
                              style={{
                                border: selectedSurfaceHardness === opt.value ? '2px solid #16a34a' : '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: 8,
                                background: hasArea ? '#ffffff' : '#f8fafc',
                                cursor: hasArea ? 'pointer' : 'not-allowed',
                                opacity: hasArea ? 1 : 0.6,
                                userSelect: 'none'
                              }}
                            >
                              <Text size="sm" fw={500}>{opt.label}</Text>
                              <Text size="xs" c="dimmed">{opt.desc}</Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                        {!hasArea && (
                          <Text size="xs" c="dimmed" mt="xs">Enter total area to unlock Surface Hardness.</Text>
                        )}
                      </div>
                    )}
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Step 4: Pricing */}
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <Paper p="lg" withBorder style={{ height: '100%', borderColor: '#f97316', borderWidth: '2px' }}>
              <Stack gap="md" h="100%">
                <Title order={4} c="orange">Step 4: Pricing</Title>
                <Text c="dimmed" size="sm">Choose a pricing method and inputs</Text>
                {!pricingUnlocked && (
                  <Box p="sm" style={{ borderRadius: 6, border: '1px dashed #cbd5e1', background: '#f8fafc' }}>
                    <Text size="xs" c="dimmed">
                      {!hasArea
                        ? 'Enter total area to unlock pricing.'
                        : 'Complete prior steps to unlock pricing.'}
                    </Text>
                  </Box>
                )}

                <Stack gap="sm">
                  <div>
                    <Text size="sm" fw={500} mb="xs">Pricing Method</Text>
                    <Radio.Group value={pricingMethod} onChange={(v) => setPricingMethod(v as any)} size="sm">
                      <Stack gap="xs">
                        <Radio value="MARGIN_BASED" label="Margin-Based Pricing" disabled={!pricingUnlocked} />
                        <Radio value="COST_PLUS_LABOR" label="Material Cost + Labor" disabled={!pricingUnlocked} />
                        <Radio value="TARGET_PPSF" label="Target Price per Sq Ft" disabled={!pricingUnlocked} />
                      </Stack>
                    </Radio.Group>
                  </div>

                  {pricingMethod === 'MARGIN_BASED' ? (
                    <>
                      <div>
                        <Text size="sm" fw={500}>Profit Margin %</Text>
                        <NumberInput
                          value={profitMargin}
                          onChange={(value) => setProfitMargin(Math.min(Number(value) || 0, 99))}
                          min={0}
                          max={99}
                          step={1}
                          size="sm"
                          disabled={!pricingUnlocked}
                        />
                        {profitMargin >= 99 && (
                          <Text size="xs" c="red">Margin at or above 99% disables cost-plus behavior; consider lowering.</Text>
                        )}
                      </div>

                      <div>
                        <Text size="sm" fw={500}>Labor Rate ($/hr)</Text>
                        <NumberInput
                          value={laborRate}
                          onChange={(value) => setLaborRate(Number(value) || 0)}
                          min={0}
                          step={0.01}
                          size="sm"
                          leftSection="$"
                          disabled={!pricingUnlocked}
                        />
                      </div>

                      <div>
                        <Text size="sm" fw={500}>Labor Hours</Text>
                        <NumberInput
                          value={totalLaborHours}
                          onChange={(value) => setTotalLaborHours(Number(value) || 0)}
                          min={0}
                          step={0.1}
                          size="sm"
                          disabled={!pricingUnlocked}
                        />
                      </div>
                    </>
                  ) : pricingMethod === 'COST_PLUS_LABOR' ? (
                    <>
                      <Text size="sm" c="dimmed">Customer price equals material + labor (no margin target). Adjust labor rate and hours below.</Text>
                      <div>
                        <Text size="sm" fw={500}>Labor Rate ($/hr)</Text>
                        <NumberInput value={laborRate} onChange={(v) => setLaborRate(Number(v) || 0)} min={0} step={0.01} size="sm" leftSection="$" disabled={!pricingUnlocked} />
                      </div>
                      <div>
                        <Text size="sm" fw={500}>Labor Hours</Text>
                        <NumberInput value={totalLaborHours} onChange={(v) => setTotalLaborHours(Number(v) || 0)} min={0} step={0.1} size="sm" disabled={!pricingUnlocked} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Text size="sm" fw={500}>Target Price per Sq Ft</Text>
                        <NumberInput
                          value={targetPpsf}
                          onChange={(value) => setTargetPpsf(Number(value) || 0)}
                          min={0}
                          step={0.01}
                          size="sm"
                          leftSection="$"
                          disabled={!pricingUnlocked}
                        />
                      </div>
                      <div>
                        <Text size="sm" fw={500}>Labor Rate ($/hr)</Text>
                        <NumberInput value={laborRate} onChange={(v) => setLaborRate(Number(v) || 0)} min={0} step={0.01} size="sm" leftSection="$" disabled={!pricingUnlocked} />
                      </div>
                      <div>
                        <Text size="sm" fw={500}>Labor Hours</Text>
                        <NumberInput value={totalLaborHours} onChange={(v) => setTotalLaborHours(Number(v) || 0)} min={0} step={0.1} size="sm" disabled={!pricingUnlocked} />
                      </div>
                    </>
                  )}

                  {effectiveSqft > 0 && (
                    <Box p="sm" bg="orange.0" style={{ borderRadius: '6px' }}>
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="xs">Material Cost:</Text>
                          <Text size="xs" fw={500}>${getMaterialCost().toFixed(2)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs">Labor Cost:</Text>
                          <Text size="xs" fw={500}>${calculateLaborCost().toFixed(2)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs">Total Cost:</Text>
                          <Text size="xs" fw={500}>${calculateTotalCost().toFixed(2)}</Text>
                        </Group>
                        <Divider />
                        <Group justify="space-between">
                          <Text size="sm" fw={600}>Customer Price:</Text>
                          <Text size="sm" fw={700} c="orange">${calculateRequiredRevenue().toFixed(2)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs">Price per Sq Ft:</Text>
                          <Text size="xs" fw={500} c="blue">{(calculatePricePerSqft()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                        </Group>
                        <Text size="xs" c="green" fw={500} style={{ textAlign: 'center' }}>
                          ✓ Achieves {calculateAchievedMargin().toFixed(1)}% margin
                        </Text>
                      </Stack>
                    </Box>
                  )}

                  {/* Calculate Button moved below System Components */}
                  {showCalculateInStep4 && (
                    <Button
                      size="md"
                      variant="filled"
                      color="orange"
                      leftSection={<IconCalculator size={16} />}
                      disabled={!canCalculate}
                      onClick={handleCalculate}
                      fullWidth
                      mt="md"
                    >
                      Calculate Pricing
                    </Button>
                  )}


                  {/* Status Text */}
                  <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
                    {canCalculate
                      ? `Ready to calculate • ${effectiveSqft.toFixed(1)} sq ft • ${selectedSystemGroup || 'System'} project`
                      : `Complete all steps to calculate pricing`
                    }
                  </Text>
                </Stack>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Split: System Components (left) + Add-On Options (right) */}
        <section className="uc-split" aria-label="System Components and Add-On Options">
          <div id="uc-components" className="space-y-4">
            {/* System Components — moved out of Step 2 for better flow */}
            {steps123Complete && selectedSystem && (
              (
                <Paper p="lg" withBorder mb="md" style={{ borderColor: '#16a34a', borderWidth: '2px' }}>
                  <Group justify="space-between" align="center" mb="xs">
                    <Title order={4} c="green">System Components</Title>
                    <Badge variant="light" size="sm">{systemComponentsSummary.count} selected • ${systemComponentsSummary.subtotal.toFixed(2)}</Badge>
                    <Group gap="xs">
                      <Switch size="xs" checked={guidedMode} onChange={(e) => setGuidedMode(e.currentTarget.checked)} label="Guided" />
                    </Group>
                  </Group>
                  <Text size="xs" c="dimmed" mb="md">Select products for each component of your chosen system. Quantities update totals live.</Text>

                  {/* No MVB Flake System */}
                  {(selectedSystem === 'no-mvb-flake-system' || products.find(p => p.id.toString() === selectedSystem)?.name === 'No MVB Flake System') && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: guidedMode ? 1 : 2 }} spacing="sm">
                        {/* Base Pigment (Optional) */}
                        <div id={`${selectedSystem}-step-1`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500}>Base Pigment (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select base pigment product..." value={selectedBasePigment} onChange={(value) => handleSelectChange(selectedBasePigment, value, setSelectedBasePigment)} data={basePigmentOptions} size="xs" allowDeselect={false} />
                          {selectedBasePigment && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Pigment Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={noMVBBasePigmentSpreadRate} onChange={(value) => setNoMVBBasePigmentSpreadRate(Number(value) || 1)} min={0.1} max={10} step={0.1} decimalScale={1} description="Pigments per 3-gal Base Coat kit" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 1 pigment per 3-gal kit (US Resin: 2 per kit)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Required) */}
                        <div id={`${selectedSystem}-step-2`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500} c="red">Base Coat *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select base coat..." value={selectedBaseCoat} onChange={(value) => handleSelectChange(selectedBaseCoat, value, setSelectedBaseCoat)} data={baseCoatOptions} size="xs" allowDeselect={false} />
                          {selectedBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={noMVBBaseCoatSpreadRate} onChange={(value) => setNoMVBBaseCoatSpreadRate(Number(value) || 100)} min={50} max={200} step={5} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 100 sq ft/gal (3-gal kit = 300 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Flake Color (Required) */}
                        <div id={`${selectedSystem}-step-3`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500} c="red">Flake Color *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select flake product..." value={selectedFlakeColor} onChange={(value) => handleSelectChange(selectedFlakeColor, value, setSelectedFlakeColor)} data={flakeColorOptions} size="xs" allowDeselect={false} />
                          {selectedFlakeColor && (
                            <Box mt="xs">
                              {/* Preview thumbnail */}
                              {(() => {
                                const p = getProduct(selectedFlakeColor); return p ? (
                                  <Group gap="xs" mb="xs" align="center">
                                    <ThumbImg src={getProductImageUrl(p.image_url)} size={28} />
                                    <Text size="xs" c="dimmed">Preview</Text>
                                  </Group>
                                ) : null;
                              })()}
                              <Text size="xs" c="dimmed" mb="4">Flake Color Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={noMVBFlakeColorSpreadRate} onChange={(value) => setNoMVBFlakeColorSpreadRate(Number(value) || 350)} min={200} max={500} step={25} description="Square feet per box" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 350 sq ft per box</Text>
                            </Box>
                          )}
                        </div>

                        {/* Top Coat (Required) */}
                        <div id={`${selectedSystem}-step-4`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500} c="red">Top Coat *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select top coat..." value={selectedTopCoat} onChange={(value) => handleSelectChange(selectedTopCoat, value, setSelectedTopCoat)} data={topCoatOptions} size="xs" allowDeselect={false} />
                          {selectedTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={noMVBTopCoatSpreadRate} onChange={(value) => setNoMVBTopCoatSpreadRate(Number(value) || 200)} min={100} max={300} step={25} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 200 sq ft per gallon (Polyaspartic)</Text>
                            </Box>
                          )}
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}

                  {selectedSystemGroup === 'polishing' && selectedSystem === 'polish-grind-seal' && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: guidedMode ? 1 : 2 }} spacing="sm">
                        {/* Metal Bond Diamonds (Required) */}
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500} c="red">Metal Bond Diamonds *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Select sequence (packs per grit are estimated).</Text>
                          <Group gap={6} wrap="wrap">
                            {['30/40', '60/80', '120/150'].map(g => (
                              <Switch key={g} size="xs" checked={!!pgsMetalSelected[g]} onChange={(e) => setPgsMetalSelected({ ...pgsMetalSelected, [g]: e.currentTarget.checked })} label={g} />
                            ))}
                          </Group>
                          <Group gap="sm" mt="xs">
                            <NumberInput label="Coverage Adjuster" size="xs" value={pgsMetalAdj} onChange={(v) => setPgsMetalAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                          </Group>
                        </div>

                        {/* Slurry/Grout (Optional) */}
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500}>Prime/Grout Coat (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select slurry/grout..." value={pgsSlurry} onChange={(v) => handleSelectChange(pgsSlurry, v, setPgsSlurry)} data={slurryGroutOptions} size="xs" searchable allowDeselect={false} />
                          {pgsSlurry && (
                            <Group gap="sm" mt="xs">
                              <NumberInput label="Coats" size="xs" value={pgsSlurryCoats} onChange={(v) => setPgsSlurryCoats(Number(v) || 1)} min={1} step={1} w={120} />
                              <NumberInput label="Coverage Adjuster" size="xs" value={pgsSlurryAdj} onChange={(v) => setPgsSlurryAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 500 sq ft/gal</Text>
                            </Group>
                          )}
                        </div>

                        {/* Concrete Sealer / Guard (Required) */}
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500} c="red">Finish Sealer / Guard *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select sealer/guard..." value={pgsSealer} onChange={(v) => handleSelectChange(pgsSealer, v, setPgsSealer)} data={polishSealerGuardOptions} size="xs" searchable allowDeselect={false} />
                          {pgsSealer && (
                            <Group gap="sm" mt="xs">
                              <NumberInput label="Coats" size="xs" value={pgsSealerCoats} onChange={(v) => setPgsSealerCoats(Number(v) || 1)} min={1} step={1} w={120} />
                              <NumberInput label="Coverage Adjuster" size="xs" value={pgsSealerAdj} onChange={(v) => setPgsSealerAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Film default 400 • Penetrating 1,000 sq ft/gal</Text>
                            </Group>
                          )}
                        </div>

                        {/* Burnish (Optional) */}
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500}>Burnish (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select pad type..." value={pgsBurnishPad} onChange={(v) => handleSelectChange(pgsBurnishPad, v, setPgsBurnishPad)} data={burnishPadOptions} size="xs" searchable allowDeselect={false} />
                          {pgsBurnishPad && (
                            <NumberInput mt="xs" size="xs" label="Pad count" value={pgsBurnishCount} onChange={(v) => setPgsBurnishCount(Number(v) || 0)} min={0} step={1} />
                          )}
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}

                  {selectedSystemGroup === 'polishing' && selectedSystem === 'polish-medium' && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: guidedMode ? 1 : 2 }} spacing="sm">
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500}>Metal Prep</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Switch size="xs" checked={pmNeedMetal} onChange={(e) => setPmNeedMetal(e.currentTarget.checked)} label="Need Metal Prep" />
                          {pmNeedMetal && (
                            <>
                              <Group gap={6} wrap="wrap" mt="xs">
                                {['30/40', '70/80', '120'].map(g => (
                                  <Switch key={g} size="xs" checked={!!pmMetalSelected[g]} onChange={(e) => setPmMetalSelected({ ...pmMetalSelected, [g]: e.currentTarget.checked })} label={g} />
                                ))}
                              </Group>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={pmMetalAdj} onChange={(v) => setPmMetalAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500}>Prime/Grout Coat (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select slurry/grout..." value={pmSlurry} onChange={(v) => handleSelectChange(pmSlurry, v, setPmSlurry)} data={slurryGroutOptions} size="xs" searchable allowDeselect={false} />
                          {pmSlurry && (
                            <>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={pmSlurryAdj} onChange={(v) => setPmSlurryAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 500 sq ft/gal</Text>
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500} c="red">Densifier (1 pass) *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select densifier..." value={pmDensifier} onChange={(v) => handleSelectChange(pmDensifier, v, setPmDensifier)} data={densifiersOptions} size="xs" searchable allowDeselect={false} />
                          {pmDensifier && (
                            <Group gap="sm" mt="xs">
                              <NumberInput label="Passes" size="xs" value={pmDensifierPasses} onChange={(v) => setPmDensifierPasses(Number(v) || 1)} min={1} step={1} w={120} />
                              <NumberInput label="Coverage Adjuster" size="xs" value={pmDensifierAdj} onChange={(v) => setPmDensifierAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 500 sq ft/gal</Text>
                            </Group>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500} c="red">Resin Bond Pads *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed">Toggle grits</Text>
                          <Group gap={6} wrap="wrap">
                            {['50', '100', '200', '400'].map(g => (
                              <Switch key={g} size="xs" checked={!!pmResinSelected[g]} onChange={(e) => setPmResinSelected({ ...pmResinSelected, [g]: e.currentTarget.checked })} label={g} />
                            ))}
                          </Group>
                          <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={pmResinAdj} onChange={(v) => setPmResinAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                          <Text size="xs" c="dimmed">Default: 900 sq ft/pack/grit</Text>
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">5</Badge>
                            <Text size="xs" fw={500} c="red">Guard (thin) *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select guard..." value={pmGuard} onChange={(v) => handleSelectChange(pmGuard, v, setPmGuard)} data={polishSealerGuardOptions} size="xs" searchable allowDeselect={false} />
                          {pmGuard && (
                            <Group gap="sm" mt="xs">
                              <NumberInput label="Coats" size="xs" value={pmGuardCoats} onChange={(v) => setPmGuardCoats(Number(v) || 1)} min={1} step={1} w={120} />
                              <NumberInput label="Coverage Adjuster" size="xs" value={pmGuardAdj} onChange={(v) => setPmGuardAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 1,800 sq ft/gal</Text>
                            </Group>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">6</Badge>
                            <Text size="xs" fw={500} c="red">Burnish *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select pad type..." value={pmBurnishPad} onChange={(v) => handleSelectChange(pmBurnishPad, v, setPmBurnishPad)} data={burnishPadOptions} size="xs" searchable allowDeselect={false} />
                          <NumberInput mt="xs" size="xs" label="Pad count" value={pmBurnishCount} onChange={(v) => setPmBurnishCount(Number(v) || 1)} min={1} step={1} />
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}

                  {selectedSystemGroup === 'polishing' && selectedSystem === 'polish-true' && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: guidedMode ? 1 : 2 }} spacing="sm">
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500} c="red">Metal Bond Diamonds *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Group gap={6} wrap="wrap">
                            {['30/40', '70/80', '120'].map(g => (
                              <Switch key={g} size="xs" checked={!!ptMetalSelected[g]} onChange={(e) => setPtMetalSelected({ ...ptMetalSelected, [g]: e.currentTarget.checked })} label={g} />
                            ))}
                          </Group>
                          <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={ptMetalAdj} onChange={(v) => setPtMetalAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500}>Prime/Grout Coat (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select slurry/grout..." value={ptSlurry} onChange={(v) => handleSelectChange(ptSlurry, v, setPtSlurry)} data={slurryGroutOptions} size="xs" searchable allowDeselect={false} />
                          {ptSlurry && (
                            <>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={ptSlurryAdj} onChange={(v) => setPtSlurryAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 500 sq ft/gal</Text>
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500} c="red">Densifier #1 *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select densifier..." value={ptDensifier1} onChange={(v) => handleSelectChange(ptDensifier1, v, setPtDensifier1)} data={densifiersOptions} size="xs" searchable allowDeselect={false} />
                          {ptDensifier1 && (
                            <>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={ptDensifier1Adj} onChange={(v) => setPtDensifier1Adj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 500 sq ft/gal</Text>
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500} c="red">Resin Pads (full progression) *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Group gap={6} wrap="wrap">
                            {['50', '100', '200', '400', '800'].map(g => (
                              <Switch key={g} size="xs" checked={!!ptResinSelected[g]} onChange={(e) => setPtResinSelected({ ...ptResinSelected, [g]: e.currentTarget.checked })} label={g} />
                            ))}
                          </Group>
                          <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={ptResinAdj} onChange={(v) => setPtResinAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                          <Text size="xs" c="dimmed">Default: 900 sq ft/pack/grit</Text>
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">5</Badge>
                            <Text size="xs" fw={500}>Concrete Dye (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select dye..." value={ptDye} onChange={(v) => handleSelectChange(ptDye, v, setPtDye)} data={concreteDyesOptions} size="xs" searchable allowDeselect={false} />
                          {ptDye && (
                            <>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={ptDyeAdj} onChange={(v) => setPtDyeAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed" mt="xs">Applied after 200/400 grit; locks with next densifier.</Text>
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">6</Badge>
                            <Text size="xs" fw={500}>Densifier #2 (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select densifier..." value={ptDensifier2} onChange={(v) => handleSelectChange(ptDensifier2, v, setPtDensifier2)} data={densifiersOptions} size="xs" searchable allowDeselect={false} />
                          {ptDensifier2 && (
                            <>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={ptDensifier2Adj} onChange={(v) => setPtDensifier2Adj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 700 sq ft/gal</Text>
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">7</Badge>
                            <Text size="xs" fw={500} c="red">Micro-Guard / Guard (thin) *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select guard..." value={ptGuard} onChange={(v) => handleSelectChange(ptGuard, v, setPtGuard)} data={polishSealerGuardOptions} size="xs" searchable allowDeselect={false} />
                          {ptGuard && (
                            <Group gap="sm" mt="xs">
                              <NumberInput label="Coats" size="xs" value={ptGuardCoats} onChange={(v) => setPtGuardCoats(Number(v) || 1)} min={1} step={1} w={120} />
                              <NumberInput label="Coverage Adjuster" size="xs" value={ptGuardAdj} onChange={(v) => setPtGuardAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 1,900 sq ft/gal</Text>
                            </Group>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">8</Badge>
                            <Text size="xs" fw={500} c="red">Burnish *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select pad type..." value={ptBurnishPad} onChange={(v) => handleSelectChange(ptBurnishPad, v, setPtBurnishPad)} data={burnishPadOptions} size="xs" searchable allowDeselect={false} />
                          <NumberInput mt="xs" size="xs" label="Pad count" value={ptBurnishCount} onChange={(v) => setPtBurnishCount(Number(v) || 1)} min={1} step={1} />
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}

                  {selectedSystemGroup === 'polishing' && selectedSystem === 'polish-high-end' && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: guidedMode ? 1 : 2 }} spacing="sm">
                        {/* Reuse structure from True Polish with premium guard & multi-pass burnish */}
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500} c="red">Metal Bond Diamonds *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Group gap={6} wrap="wrap">
                            {['30/40', '70/80', '120'].map(g => (
                              <Switch key={g} size="xs" checked={!!phMetalSelected[g]} onChange={(e) => setPhMetalSelected({ ...phMetalSelected, [g]: e.currentTarget.checked })} label={g} />
                            ))}
                          </Group>
                          <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={phMetalAdj} onChange={(v) => setPhMetalAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500}>Prime/Grout Coat (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select slurry/grout..." value={phSlurry} onChange={(v) => handleSelectChange(phSlurry, v, setPhSlurry)} data={slurryGroutOptions} size="xs" searchable allowDeselect={false} />
                          {phSlurry && (
                            <>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={phSlurryAdj} onChange={(v) => setPhSlurryAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 500 sq ft/gal</Text>
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500} c="red">Densifier #1 *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select densifier..." value={phDensifier1} onChange={(v) => handleSelectChange(phDensifier1, v, setPhDensifier1)} data={densifiersOptions} size="xs" searchable allowDeselect={false} />
                          {phDensifier1 && (
                            <>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={phDensifier1Adj} onChange={(v) => setPhDensifier1Adj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 500 sq ft/gal</Text>
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500} c="red">Resin Pads (full) *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Group gap={6} wrap="wrap">
                            {['50', '100', '200', '400', '800', '1500', '3000'].map(g => (
                              <Switch key={g} size="xs" checked={!!phResinSelected[g]} onChange={(e) => setPhResinSelected({ ...phResinSelected, [g]: e.currentTarget.checked })} label={g} />
                            ))}
                          </Group>
                          <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={phResinAdj} onChange={(v) => setPhResinAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                          <Text size="xs" c="dimmed">Default: 900 sq ft/pack/grit</Text>
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">5</Badge>
                            <Text size="xs" fw={500}>Dye (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select dye..." value={phDye} onChange={(v) => handleSelectChange(phDye, v, setPhDye)} data={concreteDyesOptions} size="xs" searchable allowDeselect={false} />
                          {phDye && (
                            <>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={phDyeAdj} onChange={(v) => setPhDyeAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed" mt="xs">Applied after 200/400 grit; locks with next densifier.</Text>
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">6</Badge>
                            <Text size="xs" fw={500}>Densifier #2</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select densifier..." value={phDensifier2} onChange={(v) => handleSelectChange(phDensifier2, v, setPhDensifier2)} data={densifiersOptions} size="xs" searchable allowDeselect={false} />
                          {phDensifier2 && (
                            <>
                              <NumberInput mt="xs" size="xs" label="Coverage Adjuster" value={phDensifier2Adj} onChange={(v) => setPhDensifier2Adj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 700 sq ft/gal</Text>
                            </>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">7</Badge>
                            <Text size="xs" fw={500} c="red">Premium Micro-Guard (2 very thin coats) *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select premium guard..." value={phPremiumGuard} onChange={(v) => handleSelectChange(phPremiumGuard, v, setPhPremiumGuard)} data={premiumGuardsOptions} size="xs" searchable allowDeselect={false} />
                          {phPremiumGuard && (
                            <Group gap="sm" mt="xs">
                              <NumberInput label="Coats" size="xs" value={phPremiumGuardCoats} onChange={(v) => setPhPremiumGuardCoats(Number(v) || 2)} min={1} step={1} w={120} />
                              <NumberInput label="Coverage Adjuster" size="xs" value={phPremiumGuardAdj} onChange={(v) => setPhPremiumGuardAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed">Default: 2,000 sq ft/gal</Text>
                            </Group>
                          )}
                        </div>

                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">8</Badge>
                            <Text size="xs" fw={500} c="red">High-Speed Burnish (multi-pass) *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select pad type..." value={phBurnishPad} onChange={(v) => handleSelectChange(phBurnishPad, v, setPhBurnishPad)} data={burnishPadOptions} size="xs" searchable allowDeselect={false} />
                          <NumberInput mt="xs" size="xs" label="Pad count" value={phBurnishCount} onChange={(v) => setPhBurnishCount(Number(v) || 2)} min={1} step={1} />
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}
                  {/* MVB Flake System */}
                  {selectedSystem === 'mvb-flake-system' && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                        {/* Guided: MVB Flake */}
                        {/* Base Pigment (Optional) */}
                        <div id={`${selectedSystem}-step-1`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500}>Base Pigment (Optional)</Text>
                          </Group>
                          <Select placeholder="Select base pigment product..." value={selectedMVBBasePigment} onChange={(value) => handleSelectChange(selectedMVBBasePigment, value, setSelectedMVBBasePigment)} data={mvbBasePigmentOptions} size="xs" allowDeselect={false} />
                          {selectedMVBBasePigment && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Pigment Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={mvbBasePigmentSpreadRate} onChange={(value) => setMVBBasePigmentSpreadRate(Number(value) || 1)} min={0.1} max={10} step={0.1} decimalScale={1} description="Pigments per 3-gal Base Coat kit" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 1 pigment per 3-gal kit (US Resin: 2 per kit)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Required - MVB) */}
                        <div id={`${selectedSystem}-step-2`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500} c="red">Base Coat * (MVB)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select MVB base coat..." value={selectedMVBBaseCoat} onChange={(value) => handleSelectChange(selectedMVBBaseCoat, value, setSelectedMVBBaseCoat)} data={mvbBaseCoatOptions} size="xs" allowDeselect={false} />
                          {selectedMVBBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={mvbBaseCoatSpreadRate} onChange={(value) => setMVBBaseCoatSpreadRate(Number(value) || 100)} min={50} max={200} step={5} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 100 sq ft/gal (3-gal kit = 300 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Flake Color */}
                        <div id={`${selectedSystem}-step-3`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500} c="red">Flake Color *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select flake product..." value={selectedMVBFlakeColor} onChange={(value) => handleSelectChange(selectedMVBFlakeColor, value, setSelectedMVBFlakeColor)} data={mvbFlakeColorOptions} size="xs" allowDeselect={false} />
                          {selectedMVBFlakeColor && (
                            <Box mt="xs">
                              {(() => {
                                const p = getProduct(selectedMVBFlakeColor); return p ? (
                                  <Group gap="xs" mb="xs" align="center">
                                    <ThumbImg src={getProductImageUrl(p.image_url)} size={28} />
                                    <Text size="xs" c="dimmed">Preview</Text>
                                  </Group>
                                ) : null;
                              })()}
                              <Text size="xs" c="dimmed" mb="4">Flake Color Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={mvbFlakeColorSpreadRate} onChange={(value) => setMVBFlakeColorSpreadRate(Number(value) || 350)} min={200} max={500} step={25} description="Square feet per box" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 350 sq ft per box</Text>
                            </Box>
                          )}
                        </div>

                        {/* Top Coat */}
                        <div id={`${selectedSystem}-step-4`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500} c="red">Top Coat *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select top coat..." value={selectedMVBTopCoat} onChange={(value) => handleSelectChange(selectedMVBTopCoat, value, setSelectedMVBTopCoat)} data={mvbTopCoatOptions} size="xs" allowDeselect={false} />
                          {selectedMVBTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={mvbTopCoatSpreadRate} onChange={(value) => setMVBTopCoatSpreadRate(Number(value) || 200)} min={100} max={300} step={25} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 200 sq ft per gallon (Polyaspartic)</Text>
                            </Box>
                          )}
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}

                  {/* Solid Color System */}
                  {selectedSystem === 'solid-color-system' && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: guidedMode ? 1 : 2 }} spacing="sm">
                        {/* Base Pigment (Optional) */}
                        <div id={`${selectedSystem}-step-1`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500}>Base Pigment (Optional)</Text>
                          </Group>
                          <Select placeholder="Select base pigment product..." value={selectedSolidBasePigment} onChange={(value) => handleSelectChange(selectedSolidBasePigment, value, setSelectedSolidBasePigment)} data={solidBasePigmentOptions} size="xs" allowDeselect={false} />
                          {selectedSolidBasePigment && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Pigment Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={solidBasePigmentSpreadRate} onChange={(value) => setSolidBasePigmentSpreadRate(Number(value) || 1)} min={0.1} max={10} step={0.1} decimalScale={1} description="Pigments per 3-gal Base Coat kit" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 1 pigment per 3-gal kit (US Resin: 2 per kit)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Grout Coat (Suggestive) */}
                        <div id={`${selectedSystem}-step-2`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500} c="orange">Grout Coat (Suggestive)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Divider mb="xs" />
                          <Select placeholder="Select grout coat..." value={selectedSolidGroutCoat} onChange={(value) => handleSelectChange(selectedSolidGroutCoat, value, setSelectedSolidGroutCoat)} data={solidGroutCoatOptions} size="xs" allowDeselect={false} />
                          {selectedSolidGroutCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Grout Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={solidGroutCoatSpreadRate} onChange={(value) => setSolidGroutCoatSpreadRate(Number(value) || 600)} min={400} max={800} step={25} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 600 sq ft/gal (3-gal kit = 1,800 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Required) */}
                        <div id={`${selectedSystem}-step-3`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500} c="red">Base Coat *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Divider mb="xs" />
                          <Select placeholder="Select base coat..." value={selectedSolidBaseCoat} onChange={(value) => handleSelectChange(selectedSolidBaseCoat, value, setSelectedSolidBaseCoat)} data={solidBaseCoatOptions} size="xs" allowDeselect={false} />
                          {selectedSolidBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={solidBaseCoatSpreadRate} onChange={(value) => setSolidBaseCoatSpreadRate(Number(value) || 75)} min={50} max={150} step={5} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 75 sq ft/gal (3-gal kit = 225 sq ft)</Text>
                            </Box>
                          )}
                        </div>

                        {/* Extra Base Coat (Optional) */}
                        <div id={`${selectedSystem}-step-4`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500}>Extra Base Coat (Clear Coat - Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select extra base coat..." value={selectedSolidExtraBaseCoat} onChange={(value) => handleSelectChange(selectedSolidExtraBaseCoat, value, setSelectedSolidExtraBaseCoat)} data={solidExtraBaseCoatOptions} size="xs" allowDeselect={false} />
                          {selectedSolidExtraBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Extra Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={solidExtraBaseCoatSpreadRate} onChange={(value) => setSolidExtraBaseCoatSpreadRate(Number(value) || 80)} min={50} max={150} step={5} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 80 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Top Coat (Required) */}
                        <div id={`${selectedSystem}-step-5`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">5</Badge>
                            <Text size="xs" fw={500} c="red">Top Coat *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select top coat..." value={selectedSolidTopCoat} onChange={(value) => handleSelectChange(selectedSolidTopCoat, value, setSelectedSolidTopCoat)} data={solidTopCoatOptions} size="xs" allowDeselect={false} />
                          {selectedSolidTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={solidTopCoatSpreadRate} onChange={(value) => setSolidTopCoatSpreadRate(Number(value) || 200)} min={100} max={300} step={25} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Rate: Prefilled from selected topcoat; adjust if needed</Text>
                            </Box>
                          )}
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}

                  {/* Metallic System */}
                  {selectedSystem === 'metallic-system' && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: guidedMode ? 1 : 2 }} spacing="sm">
                        {/* Base Pigment (Optional) */}
                        <div id={`${selectedSystem}-step-1`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500}>Base Pigment (Optional)</Text>
                          </Group>
                          <Select placeholder="Select base pigment product..." value={selectedMetallicBasePigment} onChange={(value) => handleSelectChange(selectedMetallicBasePigment, value, setSelectedMetallicBasePigment)} data={metallicBasePigmentOptions} size="xs" allowDeselect={false} />
                          {selectedMetallicBasePigment && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Pigment Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={metallicBasePigmentSpreadRate} onChange={(value) => setMetallicBasePigmentSpreadRate(Number(value) || 1)} min={0.1} max={10} step={0.1} decimalScale={1} description="Pigments per 3-gal Base Coat kit" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 1 pigment per 3-gal kit (US Resin: 2 per kit)</Text>
                              {guidedMode && (
                                <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep(`${selectedSystem}-step-2`)}>
                                  Next: Grout Coat →
                                </Button>
                              )}
                            </Box>
                          )}
                        </div>

                        {/* Grout Coat (Suggestive) */}
                        <div id={`${selectedSystem}-step-2`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500} c="orange">Grout Coat (Suggestive)</Text>
                          </Group>
                          <Select placeholder="Select grout coat..." value={selectedMetallicGroutCoat} onChange={(value) => handleSelectChange(selectedMetallicGroutCoat, value, setSelectedMetallicGroutCoat)} data={metallicGroutCoatOptions} size="xs" allowDeselect={false} />
                          {selectedMetallicGroutCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Grout Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={metallicGroutCoatSpreadRate} onChange={(value) => setMetallicGroutCoatSpreadRate(Number(value) || 600)} min={400} max={800} step={25} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 600 sq ft/gal (3-gal kit = 1,800 sq ft)</Text>
                              {guidedMode && (
                                <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep(`${selectedSystem}-step-3`)}>
                                  Next: Base Coat →
                                </Button>
                              )}
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Required) */}
                        <div id={`${selectedSystem}-step-3`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500} c="red">Base Coat *</Text>
                          </Group>
                          <Select placeholder="Select base coat..." value={selectedMetallicBaseCoat} onChange={(value) => handleSelectChange(selectedMetallicBaseCoat, value, setSelectedMetallicBaseCoat)} data={metallicBaseCoatOptions} size="xs" allowDeselect={false} />
                          {selectedMetallicBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={metallicBaseCoatSpreadRate} onChange={(value) => setMetallicBaseCoatSpreadRate(Number(value) || 80)} min={50} max={150} step={5} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 80 sq ft/gal (3-gal kit = 240 sq ft)</Text>
                              {guidedMode && (
                                <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep(`${selectedSystem}-step-4`)}>
                                  Next: Metallic Money Coat →
                                </Button>
                              )}
                            </Box>
                          )}
                        </div>

                        {/* Metallic Money Coat (Required) */}
                        <div id={`${selectedSystem}-step-4`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500} c="red">Metallic Money Coat *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select metallic money coat..." value={selectedMetallicMoneyCoat} onChange={(value) => handleSelectChange(selectedMetallicMoneyCoat, value, setSelectedMetallicMoneyCoat)} data={metallicMoneyCoatOptions} size="xs" allowDeselect={false} />
                          {selectedMetallicMoneyCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Metallic Money Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={metallicMoneyCoatSpreadRate} onChange={(value) => setMetallicMoneyCoatSpreadRate(Number(value) || 30)} min={20} max={50} step={5} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 30 sq ft per gallon</Text>
                              {guidedMode && (
                                <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep(`${selectedSystem}-step-5`)}>
                                  Next: Metallic Pigments →
                                </Button>
                              )}
                            </Box>
                          )}
                        </div>

                        {/* Metallic Pigment (multi-select) */}
                        <div id={`${selectedSystem}-step-5`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">5</Badge>
                            <Text size="xs" fw={500} c="red">Metallic Pigment * (Multiple selections)</Text>
                            {/* Inline Mix Assistant helper under the label */}
                            <Group gap={6} align="center" mb="xs">
                              <Text size="xs" c="dimmed">
                                (<Text span inherit fw={600}>Mix Assistant</Text>: Recommend pigment counts by Primary/Accent/Depth roles based on your area. Choose pigments first, then Apply.)
                              </Text>
                              <Button size="xs" variant="light" onClick={applyMetallicMixAssistant}>Apply</Button>
                            </Group>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Select colors and set quantities for your metallic effect</Text>
                          <Group gap="xs" mb="xs">
                            <Select placeholder="Choose a metallic pigment to add..." value="" onChange={(value) => {
                              if (value) {
                                const option = metallicPigmentOptions.find(opt => opt.value === value);
                                if (option) {
                                  const alreadySelected = selectedMetallicPigments.some(p => p.id === value);
                                  if (!alreadySelected) {
                                    setSelectedMetallicPigments([...selectedMetallicPigments, { id: value, name: option.label, quantity: 1 }]);
                                  }
                                }
                              }
                            }} data={metallicPigmentOptions.filter(option => !selectedMetallicPigments.some(selected => selected.id === option.value))} size="xs" style={{ flex: 1 }} searchable />
                            <Button size="xs" variant="light" disabled={metallicPigmentOptions.length === 0 || selectedMetallicPigments.length >= metallicPigmentOptions.length}>Add</Button>
                          </Group>
                          <Stack gap="xs">
                            {selectedMetallicPigments.map((pigment, index) => (
                              <Box key={`${pigment.id}-${index}`} p="xs" bg="white" style={{ borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                                <Group gap="xs" align="center">
                                  {(() => {
                                    const prod = getProduct(pigment.id); return (
                                      <ThumbImg src={prod ? getProductImageUrl(prod.image_url) : undefined} size={24} />
                                    );
                                  })()}
                                  <Text size="xs" fw={500} style={{ flex: 1, minWidth: 0 }} truncate>
                                    {pigment.name}
                                  </Text>
                                  <NumberInput placeholder="Qty" value={pigment.quantity} onChange={(value) => { setSelectedMetallicPigments(selectedMetallicPigments.map((p, i) => i === index ? { ...p, quantity: Number(value) || 0 } : p)); }} min={0} step={1} size="xs" w={70} styles={{ input: { textAlign: 'center' } }} />
                                  <Button size="xs" variant="subtle" color="red" onClick={() => { setSelectedMetallicPigments(selectedMetallicPigments.filter((_, i) => i !== index)); }} w={30} h={24} p={0}>×</Button>
                                </Group>
                              </Box>
                            ))}
                            {selectedMetallicPigments.length === 0 && (
                              <Box p="xs" bg="gray.1" style={{ borderRadius: '4px', border: '1px dashed #ccc' }}>
                                <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>No metallic pigments selected</Text>
                              </Box>
                            )}
                            {guidedMode && selectedMetallicPigments.length > 0 && (
                              <Button size="xs" variant="subtle" mt="xs" onClick={() => scrollToStep(`${selectedSystem}-step-6`)}>
                                Next: Top Coat →
                              </Button>
                            )}
                          </Stack>
                        </div>

                        {/* Top Coat (Required) */}
                        <div id={`${selectedSystem}-step-6`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">6</Badge>
                            <Text size="xs" fw={500} c="red">Top Coat *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Select placeholder="Select top coat..." value={selectedMetallicTopCoat} onChange={(value) => setSelectedMetallicTopCoat(value || '')} data={metallicTopCoatOptions} size="xs" />
                          {selectedMetallicTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Metallic Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={metallicTopCoatSpreadRate} onChange={(value) => setMetallicTopCoatSpreadRate(Number(value) || 200)} min={100} max={400} step={5} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested from product when available; editable for job-specific conditions.</Text>
                            </Box>
                          )}
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}

                  {/* Polishing Systems */}
                  {selectedSystemGroup === 'polishing' && selectedSystem === 'polish-clean-seal' && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: guidedMode ? 1 : 2 }} spacing="sm">
                        {/* Surface Cleaner (Required) */}
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500} c="red">Surface Cleaner *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Products from Cleaners/Neutralizers</Text>
                          <Select placeholder="Select cleaner..." value={polishCleaner} onChange={(v) => handleSelectChange(polishCleaner, v, setPolishCleaner)} data={polishCleanerOptions} size="xs" searchable allowDeselect={false} />
                          {polishCleaner && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Coverage Adjuster</Text>
                              <NumberInput size="xs" value={polishCleanerAdj} onChange={(v) => setPolishCleanerAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              <Text size="xs" c="dimmed" mt="2">Default: 1,000 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Crack & Joint Filler (Optional) */}
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500}>Crack & Joint Filler (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Products from Crack & Joint Filler</Text>
                          <Select placeholder="Select filler..." value={polishCrackFiller} onChange={(v) => handleSelectChange(polishCrackFiller, v, setPolishCrackFiller)} data={polishCrackFillerOptions} size="xs" searchable allowDeselect={false} />
                          {polishCrackFiller && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Linear feet or unit count</Text>
                              <NumberInput size="xs" value={polishCrackFillerQty} onChange={(v) => setPolishCrackFillerQty(Number(v) || 0)} min={0} step={1} />
                            </Box>
                          )}
                        </div>

                        {/* Concrete Sealer / Guard (Required) */}
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500} c="red">Concrete Sealer / Guard *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Products from Sealers & Guards (film-forming or penetrating)</Text>
                          <Select placeholder="Select sealer/guard..." value={polishSealerGuard} onChange={(v) => handleSelectChange(polishSealerGuard, v, setPolishSealerGuard)} data={polishSealerGuardOptions} size="xs" searchable allowDeselect={false} />
                          {polishSealerGuard && (
                            <Stack gap={6} mt="xs">
                              <Group gap="sm" align="flex-end">
                                <NumberInput label="Coats" size="xs" value={polishSealerCoats} onChange={(v) => setPolishSealerCoats(Number(v) || 1)} min={1} step={1} w={120} />
                                <NumberInput label="Coverage Adjuster" size="xs" value={polishSealerAdj} onChange={(v) => setPolishSealerAdj(Number(v) || 1)} min={0.1} step={0.1} decimalScale={2} w={180} rightSection={<Text size="xs" c="dimmed">×</Text>} />
                              </Group>
                              <Text size="xs" c="dimmed">Defaults: Film 300–500 (use 400) • Penetrating 800–1,200 (use 1,000) sq ft/gal when product lacks coverage.</Text>
                            </Stack>
                          )}
                        </div>

                        {/* Burnish (Optional) */}
                        <div>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500}>Burnish (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Products from Burnishing Pads</Text>
                          <Select placeholder="Select pad type..." value={polishBurnishPad} onChange={(v) => handleSelectChange(polishBurnishPad, v, setPolishBurnishPad)} data={burnishPadOptions} size="xs" searchable allowDeselect={false} />
                          {polishBurnishPad && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Pad count</Text>
                              <NumberInput size="xs" value={polishBurnishCount} onChange={(v) => setPolishBurnishCount(Number(v) || 0)} min={0} step={1} />
                            </Box>
                          )}
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}

                  {/* Existing resin-flooring Grind & Seal UI (unchanged) */}
                  {selectedSystemGroup !== 'polishing' && selectedSystem === 'grind-seal-system' && (
                    <Box>
                      <SimpleGrid cols={{ base: 1, md: guidedMode ? 1 : 2 }} spacing="sm">
                        {/* Primer (Optional) */}
                        <div id={`${selectedSystem}-step-1`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">1</Badge>
                            <Text size="xs" fw={500}>Primer (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Choose none if not selecting product</Text>
                          <Select placeholder="Select primer product..." value={selectedGrindSealPrimer} onChange={(value) => handleSelectChange(selectedGrindSealPrimer, value, setSelectedGrindSealPrimer)} data={grindSealPrimerOptions} size="xs" allowDeselect={false} />
                          {selectedGrindSealPrimer && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Primer Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={200} onChange={() => { }} min={100} max={300} step={25} description="Square feet per gallon" disabled />
                              <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected primer product specifications</Text>
                            </Box>
                          )}
                        </div>

                        {/* Grout Coat (Optional) */}
                        <div id={`${selectedSystem}-step-2`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">2</Badge>
                            <Text size="xs" fw={500}>Grout Coat (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Products from Epoxy or Metallic Top Coats categories</Text>
                          <Select placeholder="Select grout coat..." value={selectedGrindSealGroutCoat} onChange={(value) => handleSelectChange(selectedGrindSealGroutCoat, value, setSelectedGrindSealGroutCoat)} data={grindSealGroutCoatOptions} size="xs" allowDeselect={false} />
                          {selectedGrindSealGroutCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Grout Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={grindSealGroutSpreadRate} onChange={(value) => setGrindSealGroutSpreadRate(Number(value) || 600)} min={400} max={800} step={25} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 600 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Base Coat (Optional) */}
                        <div id={`${selectedSystem}-step-3`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">3</Badge>
                            <Text size="xs" fw={500}>Base Coat (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Products from Epoxy or Metallic Top Coats categories</Text>
                          <Select placeholder="Select base coat..." value={selectedGrindSealBaseCoat} onChange={(value) => handleSelectChange(selectedGrindSealBaseCoat, value, setSelectedGrindSealBaseCoat)} data={grindSealBaseCoatOptions} size="xs" allowDeselect={false} />
                          {selectedGrindSealBaseCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={grindSealBaseSpreadRate} onChange={(value) => setGrindSealBaseSpreadRate(Number(value) || 125)} min={75} max={200} step={25} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 125 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Intermediate Coat (Required) */}
                        <div id={`${selectedSystem}-step-4`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">4</Badge>
                            <Text size="xs" fw={500} c="red">Intermediate Coat *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Products from Epoxy or Metallic Top Coats categories</Text>
                          <Select placeholder="Select intermediate coat..." value={selectedGrindSealIntermediateCoat} onChange={(value) => handleSelectChange(selectedGrindSealIntermediateCoat, value, setSelectedGrindSealIntermediateCoat)} data={grindSealIntermediateCoatOptions} size="xs" allowDeselect={false} />
                          {selectedGrindSealIntermediateCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Intermediate Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={grindSealIntermediateCoatSpreadRate} onChange={(value) => setGrindSealIntermediateCoatSpreadRate(Number(value) || 150)} min={100} max={250} step={25} description="Square feet per gallon" />
                              <Text size="xs" c="dimmed" mt="2">Suggested: 150 sq ft per gallon</Text>
                            </Box>
                          )}
                        </div>

                        {/* Top Coat (Required) */}
                        <div id={`${selectedSystem}-step-5`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">5</Badge>
                            <Text size="xs" fw={500} c="red">Top Coat *</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Products from Metallic Top Coats or Polyaspartic Topcoats</Text>
                          <Select placeholder="Select top coat..." value={selectedGrindSealTopCoat} onChange={(value) => handleSelectChange(selectedGrindSealTopCoat, value, setSelectedGrindSealTopCoat)} data={grindSealTopCoatOptions} size="xs" allowDeselect={false} />
                          {selectedGrindSealTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={200} onChange={() => { }} min={100} max={300} step={25} description="Square feet per gallon" disabled />
                              <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected topcoat product specifications</Text>
                            </Box>
                          )}
                        </div>

                        {/* Additional Top Coat (Optional) */}
                        <div id={`${selectedSystem}-step-6`}>
                          <Group gap="xs" mb="xs" align="center">
                            <Badge size="xs" color="gray" variant="filled">6</Badge>
                            <Text size="xs" fw={500}>Additional Top Coat (Optional)</Text>
                          </Group>
                          <Divider mb="xs" />
                          <Text size="xs" c="dimmed" mb="xs">Products from Metallic Top Coats or Polyaspartic Topcoats</Text>
                          <Select placeholder="Select additional top coat..." value={selectedGrindSealAdditionalTopCoat} onChange={(value) => handleSelectChange(selectedGrindSealAdditionalTopCoat, value, setSelectedGrindSealAdditionalTopCoat)} data={grindSealAdditionalTopCoatOptions} size="xs" allowDeselect={false} />
                          {selectedGrindSealAdditionalTopCoat && (
                            <Box mt="xs">
                              <Text size="xs" c="dimmed" mb="4">Additional Top Coat Spread Rate Adjuster:</Text>
                              <NumberInput size="xs" value={200} onChange={() => { }} min={100} max={300} step={25} description="Square feet per gallon" disabled />
                              <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected topcoat product specifications</Text>
                            </Box>
                          )}
                        </div>
                      </SimpleGrid>
                    </Box>
                  )}

                  {/* Countertops Systems */}
                  {selectedSystemGroup === 'countertops-custom' && (
                    <Box>
                      <Accordion variant="contained" radius="sm">
                        {/* Primer Section */}
                        <Accordion.Item value="primer">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Group gap="xs" align="center">
                                <Badge size="xs" color="gray" variant="filled">1</Badge>
                                <Text size="sm" fw={500}>Primer (Optional)</Text>
                              </Group>
                              {selectedCountertopPrimer && (<Badge variant="filled" color="green" size="sm">Selected</Badge>)}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Primers category</Text>
                            <Select
                              placeholder="Select primer product..."
                              value={selectedCountertopPrimer}
                              onChange={(value) => setSelectedCountertopPrimer(value || '')}
                              data={countertopPrimerOptions}
                              size="sm"
                            />
                            {selectedCountertopPrimer && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Bonding Primer Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={200}
                                  onChange={() => { }}
                                  min={100}
                                  max={300}
                                  step={25}
                                  description="Square feet per gallon"
                                  disabled
                                />
                                <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected primer product specifications</Text>
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Base Pigment Section */}
                        <Accordion.Item value="base-pigment">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Group gap="xs" align="center">
                                <Badge size="xs" color="gray" variant="filled">2</Badge>
                                <Text size="sm" fw={500}>Base Pigment (Optional)</Text>
                              </Group>
                              {selectedCountertopBasePigment && (
                                <Badge variant="filled" color="green" size="sm">Selected</Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Base Pigments category</Text>
                            <Select
                              placeholder="Select base pigment product..."
                              value={selectedCountertopBasePigment}
                              onChange={(value) => setSelectedCountertopBasePigment(value || '')}
                              data={countertopBasePigmentOptions}
                              size="sm"
                            />
                            {selectedCountertopBasePigment && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Base Coat Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={countertopBaseCoatSpreadRate}
                                  onChange={(value) => setCountertopBaseCoatSpreadRate(Number(value) || 400)}
                                  min={200}
                                  max={600}
                                  step={25}
                                  description="Square feet per gallon"
                                />
                                <Text size="xs" c="dimmed" mt="2">Suggested: 1 qt per 100 sq ft (400 sq ft per gallon)</Text>
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Metallic Art Coat Section */}
                        <Accordion.Item value="metallic-art-coat">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Group gap="xs" align="center">
                                <Badge size="xs" color="gray" variant="filled">3</Badge>
                                <Text size="sm" fw={500} c="red">Metallic Art Coat * (Required)</Text>
                              </Group>
                              {selectedCountertopMetallicArtCoat && (
                                <Badge variant="filled" color="green" size="sm">Selected</Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Metallic Money Coat category</Text>
                            <Select
                              placeholder="Select metallic art coat..."
                              value={selectedCountertopMetallicArtCoat}
                              onChange={(value) => setSelectedCountertopMetallicArtCoat(value || '')}
                              data={countertopMetallicArtCoatOptions}
                              size="sm"
                            />
                            {selectedCountertopMetallicArtCoat && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Metallic Art Coat Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={countertopMetallicArtCoatSpreadRate}
                                  onChange={(value) => setCountertopMetallicArtCoatSpreadRate(Number(value) || 4.57)}
                                  min={3}
                                  max={8}
                                  step={0.1}
                                  decimalScale={2}
                                  description="Square feet per gallon"
                                />
                                <Text size="xs" c="dimmed" mt="2">Suggested: 3.5 oz per sq ft (4.57 sq ft per gallon)</Text>
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Metallic Pigments Section */}
                        <Accordion.Item value="metallic-pigments">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Group gap="xs" align="center">
                                <Badge size="xs" color="gray" variant="filled">4</Badge>
                                <Text size="sm" fw={500} c="red">Metallic Pigments * (Required)</Text>
                              </Group>
                              {selectedCountertopMetallicPigments.length > 0 && (
                                <Badge variant="filled" color="green" size="sm">
                                  {selectedCountertopMetallicPigments.length} Selected
                                </Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Select colors and set quantities for your metallic effect</Text>
                            <Group gap={6} align="center" mb="md">
                              <Text size="xs" c="dimmed">
                                (<Text span inherit fw={600}>Mix Assistant</Text>: Recommend pigment counts by Primary/Accent/Depth roles based on your area. Choose pigments first, then Apply.)
                              </Text>
                              <Button size="xs" variant="light" onClick={applyCountertopMixAssistant}>Apply</Button>
                            </Group>
                            <Group gap="xs" mb="md">
                              <Select
                                placeholder="Choose a metallic pigment to add..."
                                value=""
                                onChange={(value) => {
                                  if (value) {
                                    const option = countertopMetallicPigmentOptions.find(opt => opt.value === value);
                                    if (option) {
                                      const alreadySelected = selectedCountertopMetallicPigments.some(p => p.id === value);
                                      if (!alreadySelected) {
                                        setSelectedCountertopMetallicPigments([
                                          ...selectedCountertopMetallicPigments,
                                          { id: value, name: option.label, quantity: 1 }
                                        ]);
                                      }
                                    }
                                  }
                                }}
                                data={countertopMetallicPigmentOptions.filter(option => !selectedCountertopMetallicPigments.some(selected => selected.id === option.value))}
                                size="sm"
                                style={{ flex: 1 }}
                                searchable
                              />
                              <Button
                                size="sm"
                                variant="light"
                                disabled={countertopMetallicPigmentOptions.length === 0 || selectedCountertopMetallicPigments.length >= countertopMetallicPigmentOptions.length}
                              >
                                Add
                              </Button>
                            </Group>
                            <Stack gap="sm">
                              {selectedCountertopMetallicPigments.map((pigment, index) => (
                                <Box key={`${pigment.id}-${index}`} p="sm" bg="white" style={{ borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                                  <Group gap="sm" align="center">
                                    {(() => {
                                      const prod = getProduct(pigment.id); return (
                                        <ThumbImg src={prod ? getProductImageUrl(prod.image_url) : undefined} size={28} />
                                      );
                                    })()}
                                    <Text size="sm" fw={500} style={{ flex: 1, minWidth: 0 }} truncate>
                                      {pigment.name}
                                    </Text>
                                    <NumberInput
                                      placeholder="Qty"
                                      value={pigment.quantity}
                                      onChange={(value) => {
                                        setSelectedCountertopMetallicPigments(selectedCountertopMetallicPigments.map((p, i) =>
                                          i === index ? { ...p, quantity: Number(value) || 0 } : p
                                        ));
                                      }}
                                      min={0}
                                      step={1}
                                      size="sm"
                                      w={80}
                                    />
                                    <Button
                                      size="sm"
                                      variant="subtle"
                                      color="red"
                                      onClick={() => {
                                        setSelectedCountertopMetallicPigments(selectedCountertopMetallicPigments.filter((_, i) => i !== index));
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </Group>
                                </Box>
                              ))}

                              {selectedCountertopMetallicPigments.length === 0 && (
                                <Box p="md" bg="gray.1" style={{ borderRadius: '6px', border: '1px dashed #ccc' }}>
                                  <Text size="sm" c="dimmed" style={{ textAlign: 'center' }}>
                                    No metallic pigments selected
                                  </Text>
                                </Box>
                              )}
                            </Stack>

                            {selectedCountertopMetallicPigments.length > 0 && (
                              <Box mt="md">
                                <Text size="xs" c="dimmed" mb="4">Metallic Pigment Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={countertopMetallicPigmentSpreadRate}
                                  onChange={(value) => setCountertopMetallicPigmentSpreadRate(Number(value) || 1)}
                                  min={0.1}
                                  max={10}
                                  step={0.1}
                                  decimalScale={1}
                                  description="Containers per 3-gal Art Coat kit"
                                />
                                <Text size="xs" c="dimmed" mt="2">Suggested: 1 container per 3-gal kit</Text>
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Flood Coat Section */}
                        <Accordion.Item value="flood-coat">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Group gap="xs" align="center">
                                <Badge size="xs" color="gray" variant="filled">5</Badge>
                                <Text size="sm" fw={500}>Flood Coat (Optional)</Text>
                              </Group>
                              {selectedCountertopFloodCoat && (
                                <Badge variant="filled" color="green" size="sm">Selected</Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Metallic Money Coat - Usually have enough from Art Coat</Text>
                            <Select
                              placeholder="Select flood coat..."
                              value={selectedCountertopFloodCoat}
                              onChange={(value) => setSelectedCountertopFloodCoat(value || '')}
                              data={countertopFloodCoatOptions}
                              size="sm"
                            />
                            {selectedCountertopFloodCoat && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Clear Coat Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={countertopClearCoatSpreadRate}
                                  onChange={(value) => setCountertopClearCoatSpreadRate(Number(value) || 4.57)}
                                  min={3}
                                  max={8}
                                  step={0.1}
                                  decimalScale={2}
                                  description="Square feet per gallon"
                                />
                                <Text size="xs" c="dimmed" mt="2">Suggested: 3.5 oz per sq ft (4.57 sq ft per gallon)</Text>
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>

                        {/* Top Coat Section */}
                        <Accordion.Item value="top-coat">
                          <Accordion.Control>
                            <Group justify="space-between" align="center">
                              <Group gap="xs" align="center">
                                <Badge size="xs" color="gray" variant="filled">6</Badge>
                                <Text size="sm" fw={500} c="red">Top Coat * (Required)</Text>
                              </Group>
                              {selectedCountertopTopCoat && (
                                <Badge variant="filled" color="green" size="sm">Selected</Badge>
                              )}
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="xs" c="dimmed" mb="xs">Products from Metallic Top Coats category</Text>
                            <Select
                              placeholder="Select top coat..."
                              value={selectedCountertopTopCoat}
                              onChange={(value) => setSelectedCountertopTopCoat(value || '')}
                              data={countertopTopCoatOptions}
                              size="sm"
                            />
                            {selectedCountertopTopCoat && (
                              <Box mt="xs">
                                <Text size="xs" c="dimmed" mb="4">Metallic Top Coat Spread Rate Adjuster:</Text>
                                <NumberInput
                                  size="xs"
                                  value={200}
                                  onChange={() => { }}
                                  min={100}
                                  max={300}
                                  step={25}
                                  description="Square feet per gallon"
                                  disabled
                                />
                                <Text size="xs" c="dimmed" mt="2">Rate: Refer to selected topcoat product specifications</Text>
                              </Box>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>
                    </Box>
                  )}

                  {/* Single Calculate button lives in the right column footer */}
                </Paper>
              )
            )}
          </div>
          {steps123Complete ? (
            <aside id="uc-addons" className="space-y-4">
              <Paper p="lg" withBorder mb="xl" style={{ borderColor: '#0ea5e9', borderWidth: '2px' }}>
                {/* Right column: Add-On Options always visible */}
                <Group justify="space-between" align="center" mb="xs">
                  <Title order={4} c="blue">Identify Job Add‑Ons</Title>
                </Group>

                {/* Intelligent Suggestions (moved near footer) */}

                <Accordion multiple defaultValue={[]}>
                  <Accordion.Item value="labor">
                    <Accordion.Control>
                      <Group justify="space-between" align="center">
                        <Text>Labor Options Add-on</Text>
                        <Badge variant="light" size="sm">{addOnCategorySummaries.labor.count} selected • ${addOnCategorySummaries.labor.subtotal.toFixed(2)}</Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Accordion multiple variant="separated" radius="sm">
                        <Group justify="space-between" mb="xs">
                          <Text size="xs" c="dimmed">Edit rates as needed. Your changes are saved.</Text>
                          <Button size="xs" variant="light" onClick={resetLaborRatesToDefaults}>Reset rates to default</Button>
                        </Group>
                        <Accordion.Item value="quick">
                          <Accordion.Control>
                            <Group gap="xs" align="center">
                              <IconSparkles size={16} />
                              <Text>Quick Add-ons</Text>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap="sm">
                              {effectiveLaborAddOns.filter(a => a.group === 'quick').map(a => (
                                <Box key={a.id}>
                                  <Group justify="space-between" wrap="nowrap" align="center">
                                    <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                                      <LaborThumb id={a.id} />
                                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</Text>
                                        {/* No descriptive subtext in Universal for labor add-ons */}
                                      </div>
                                    </Group>
                                    {a.unit === 'percent' ? (
                                      <Group gap="xs" wrap="nowrap" align="center">
                                        {a.id === 'sundries' && (
                                          <Switch
                                            size="xs"
                                            checked={!!sundriesEnabled}
                                            onChange={(e) => setSundriesEnabled(e.currentTarget.checked)}
                                            onLabel="On"
                                            offLabel="Off"
                                            title="Include sundries"
                                          />
                                        )}
                                        <NumberInput size="xs" w={100} min={0} max={100}
                                          value={(addOnQuantities[a.id] ?? 5)}
                                          onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [a.id]: Number(v) || 0 }))}
                                          rightSection={<Text size="xs" c="dimmed">%</Text>}
                                          disabled={a.id === 'sundries' ? !sundriesEnabled : false}
                                        />
                                      </Group>
                                    ) : (
                                      <Group gap="xs" wrap="nowrap">
                                        <NumberInput size="xs" w={110} min={0}
                                          value={(laborRates[a.id] ?? a.rate)}
                                          onChange={(v) => setLaborRates({ ...laborRates, [a.id]: Number(v) || 0 })}
                                          leftSection={<Text size="xs" c="dimmed">$</Text>}
                                        />
                                        <NumberInput size="xs" w={110} min={0}
                                          value={addOnQuantities[a.id] || 0}
                                          onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [a.id]: Number(v) || 0 }))}
                                          rightSection={<Text size="xs" c="dimmed">{a.unit}</Text>}
                                        />
                                      </Group>
                                    )}
                                  </Group>
                                  {a.id === 'stem-walls' && (
                                    <Group justify="space-between" mt={6}>
                                      <Text size="xs" c="dimmed">Extra labor hours (optional)</Text>
                                      <NumberInput size="xs" w={120} min={0}
                                        value={addOnQuantities['stem-walls-hours'] || 0}
                                        onChange={(v) => setAddOnQuantities(prev => ({ ...prev, ['stem-walls-hours']: Number(v) || 0 }))}
                                        rightSection={<Text size="xs" c="dimmed">hr</Text>}
                                      />
                                    </Group>
                                  )}
                                </Box>
                              ))}
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>

                        <Accordion.Item value="hourly">
                          <Accordion.Control>
                            <Group gap="xs" align="center">
                              <IconClockHour3 size={16} />
                              <Text>Hourly / Time-Based Labor</Text>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            {effectiveLaborAddOns.filter(a => a.group === 'hourly').map(a => (
                              <Group key={a.id} justify="space-between" wrap="nowrap" align="center">
                                <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                                  <LaborThumb id={a.id} />
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</Text>
                                    {/* No descriptive subtext in Universal for labor add-ons */}
                                  </div>
                                </Group>
                                <Group gap="xs" wrap="nowrap">
                                  <NumberInput size="xs" w={110} min={0}
                                    value={(laborRates[a.id] ?? a.rate)}
                                    onChange={(v) => setLaborRates({ ...laborRates, [a.id]: Number(v) || 0 })}
                                    leftSection={<Text size="xs" c="dimmed">$</Text>}
                                  />
                                  <NumberInput size="xs" w={110} min={0}
                                    value={addOnQuantities[a.id] || 0}
                                    onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [a.id]: Number(v) || 0 }))}
                                    rightSection={<Text size="xs" c="dimmed">hr</Text>}
                                  />
                                </Group>
                              </Group>
                            ))}
                          </Accordion.Panel>
                        </Accordion.Item>

                        <Accordion.Item value="distance">
                          <Accordion.Control>
                            <Group gap="xs" align="center">
                              <IconRoad size={16} />
                              <Text>Distance / Travel</Text>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            {effectiveLaborAddOns.filter(a => a.group === 'distance').map(a => (
                              <Group key={a.id} justify="space-between" wrap="nowrap" align="center">
                                <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                                  <LaborThumb id={a.id} />
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</Text>
                                    {/* No descriptive subtext in Universal for labor add-ons */}
                                  </div>
                                </Group>
                                <Group gap="xs" wrap="nowrap">
                                  <NumberInput size="xs" w={110} min={0}
                                    value={(laborRates[a.id] ?? a.rate)}
                                    onChange={(v) => setLaborRates({ ...laborRates, [a.id]: Number(v) || 0 })}
                                    leftSection={<Text size="xs" c="dimmed">$</Text>}
                                  />
                                  <NumberInput size="xs" w={110} min={0}
                                    value={addOnQuantities[a.id] || 0}
                                    onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [a.id]: Number(v) || 0 }))}
                                    rightSection={<Text size="xs" c="dimmed">{a.unit === 'mi' ? 'mi' : 'ct'}</Text>}
                                  />
                                </Group>
                              </Group>
                            ))}
                          </Accordion.Panel>
                        </Accordion.Item>

                        <Accordion.Item value="per-unit">
                          <Accordion.Control>
                            <Group gap="xs" align="center">
                              <IconRulerMeasure size={16} />
                              <Text>Per-Unit Tasks (Prep / Repair)</Text>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap="xs">
                              {effectiveLaborAddOns.filter(a => a.group === 'perUnit').map(a => (
                                <Group key={a.id} justify="space-between" align="center" wrap="nowrap">
                                  <Group gap="sm" align="center" style={{ flex: 1, minWidth: 0 }}>
                                    <LaborThumb id={a.id} />
                                    <Text size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</Text>
                                  </Group>
                                  <Group gap="sm" justify="flex-end" wrap="nowrap" style={{ minWidth: 240 }}>
                                    <NumberInput size="xs" w={96} min={0}
                                      value={(laborRates[a.id] ?? a.rate)}
                                      onChange={(v) => setLaborRates({ ...laborRates, [a.id]: Number(v) || 0 })}
                                      leftSection={<Text size="xs" c="dimmed">$</Text>}
                                    />
                                    <NumberInput size="xs" w={72} min={0}
                                      value={addOnQuantities[a.id] || 0}
                                      onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [a.id]: Number(v) || 0 }))}
                                    />
                                    <Badge variant="light" color="gray" fw={400} size="xs" style={{ minWidth: 36, textAlign: 'center' }}>{a.unit}</Badge>
                                  </Group>
                                </Group>
                              ))}
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>

                        <Accordion.Item value="flat">
                          <Accordion.Control>
                            <Group gap="xs" align="center">
                              <IconReceipt2 size={16} />
                              <Text>Flat Surcharges / Admin</Text>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            {effectiveLaborAddOns.filter(a => a.group === 'flat' && a.id !== 'custom-charge').map(a => (
                              <Group key={a.id} justify="space-between" wrap="nowrap" align="center">
                                <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                                  <LaborThumb id={a.id} />
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</Text>
                                    {/* No descriptive subtext in Universal for labor add-ons */}
                                  </div>
                                </Group>
                                <Group gap="xs" wrap="nowrap">
                                  <NumberInput size="xs" w={110} min={0}
                                    value={(laborRates[a.id] ?? a.rate)}
                                    onChange={(v) => setLaborRates({ ...laborRates, [a.id]: Number(v) || 0 })}
                                    leftSection={<Text size="xs" c="dimmed">$</Text>}
                                  />
                                  <NumberInput size="xs" w={110} min={0}
                                    value={addOnQuantities[a.id] || 0}
                                    onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [a.id]: Number(v) || 0 }))}
                                    rightSection={<Text size="xs" c="dimmed">ct</Text>}
                                  />
                                </Group>
                              </Group>
                            ))}
                          </Accordion.Panel>
                        </Accordion.Item>

                        <Accordion.Item value="custom">
                          <Accordion.Control>
                            <Group gap="xs" align="center">
                              <IconReceipt2 size={16} />
                              <Text>Custom Charge</Text>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Group>
                              <TextInput size="xs" placeholder="Label" value={customChargeLabel} onChange={(e) => setCustomChargeLabel(e.currentTarget.value)} style={{ flex: 1 }} />
                              <NumberInput size="xs" w={160} min={0}
                                value={addOnQuantities['custom-charge-amount'] || 0}
                                onChange={(v) => setAddOnQuantities(prev => ({ ...prev, ['custom-charge-amount']: Number(v) || 0 }))}
                                leftSection={<Text size="xs" c="dimmed">$</Text>}
                              />
                            </Group>
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>
                    </Accordion.Panel>
                  </Accordion.Item>

                  {selectedSystemGroup !== 'countertops-custom' && (
                    <Accordion.Item value="crack">
                      <Accordion.Control>
                        <Group justify="space-between" align="center">
                          <Text>Crack & Joint Fillers</Text>
                          <Badge variant="light" size="sm">{addOnCategorySummaries.crack.count} selected • ${addOnCategorySummaries.crack.subtotal.toFixed(2)}</Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="xs">
                          {crackJointFillers.length === 0 && (
                            <Text size="sm" c="dimmed">No products found in category.</Text>
                          )}
                          {crackJointFillers.map(item => (
                            <Group key={item.id} justify="space-between" wrap="nowrap">
                              <Group gap="sm">
                                <ThumbImg src={item.image} />
                                <div>
                                  <Text size="sm" fw={500}>{item.name}</Text>
                                  <Group gap={8} wrap="nowrap">
                                    <Text size="xs" c="dimmed">${item.price.toFixed(2)}</Text>
                                    {item.tds && (
                                      <Text size="xs">• <a href={item.tds} target="_blank" rel="noreferrer">View TDS</a></Text>
                                    )}
                                  </Group>
                                </div>
                              </Group>
                              <NumberInput size="xs" w={90} min={0} value={addOnQuantities[item.id] || 0}
                                onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [item.id]: Number(v) || 0 }))} />
                            </Group>
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  )}

                  {selectedSystemGroup !== 'countertops-custom' && (
                    <Accordion.Item value="nonskid">
                      <Accordion.Control>
                        <Group justify="space-between" align="center">
                          <Text>Non-Skid Additives</Text>
                          <Badge variant="light" size="sm">{addOnCategorySummaries.nonskid.count} selected • ${addOnCategorySummaries.nonskid.subtotal.toFixed(2)}</Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="xs">
                          {nonSkidAdditives.length === 0 && (
                            <Text size="sm" c="dimmed">No products found in category.</Text>
                          )}
                          {nonSkidAdditives.map(item => (
                            <Group key={item.id} justify="space-between" wrap="nowrap">
                              <Group gap="sm">
                                <ThumbImg src={item.image} />
                                <div>
                                  <Text size="sm" fw={500}>{item.name}</Text>
                                  <Group gap={8} wrap="nowrap">
                                    <Text size="xs" c="dimmed">${item.price.toFixed(2)}</Text>
                                    {item.tds && (
                                      <Text size="xs">• <a href={item.tds} target="_blank" rel="noreferrer">View TDS</a></Text>
                                    )}
                                  </Group>
                                </div>
                              </Group>
                              <NumberInput size="xs" w={90} min={0} value={addOnQuantities[item.id] || 0}
                                onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [item.id]: Number(v) || 0 }))} />
                            </Group>
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  )}

                  {selectedSystemGroup !== 'countertops-custom' && (
                    <Accordion.Item value="common">
                      <Accordion.Control>
                        <Group justify="space-between" align="center">
                          <Text>Commonly Used Materials</Text>
                          <Badge variant="light" size="sm">{addOnCategorySummaries.common.count} selected • ${addOnCategorySummaries.common.subtotal.toFixed(2)}</Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="xs">
                          {commonlyUsedMaterials.length === 0 && (
                            <Text size="sm" c="dimmed">No products found in category.</Text>
                          )}
                          {commonlyUsedMaterials.map(item => (
                            <Group key={item.id} justify="space-between" wrap="nowrap">
                              <Group gap="sm">
                                <ThumbImg src={item.image} />
                                <div>
                                  <Text size="sm" fw={500}>{item.name}</Text>
                                  <Group gap={8} wrap="nowrap">
                                    <Text size="xs" c="dimmed">${item.price.toFixed(2)}</Text>
                                    {item.tds && (
                                      <Text size="xs">• <a href={item.tds} target="_blank" rel="noreferrer">View TDS</a></Text>
                                    )}
                                  </Group>
                                </div>
                              </Group>
                              <NumberInput size="xs" w={90} min={0} value={addOnQuantities[item.id] || 0}
                                onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [item.id]: Number(v) || 0 }))} />
                            </Group>
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  )}
                  {selectedSystemGroup === 'countertops-custom' && (
                    <>
                      <Accordion.Item value="ct-materials">
                        <Accordion.Control>
                          <Group justify="space-between" align="center">
                            <Text>Countertop Materials</Text>
                            <Badge variant="light" size="sm">{addOnCategorySummaries.ctMaterials.count} selected • ${addOnCategorySummaries.ctMaterials.subtotal.toFixed(2)}</Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="xs">
                            <Group justify="space-between" mb="xs">
                              <Text size="xs" c="dimmed">Edit prices as needed. Your changes are saved.</Text>
                              <Button size="xs" variant="light" onClick={resetCountertopMaterialPrices}>Reset to defaults</Button>
                            </Group>
                            {countertopMaterialsResolved.length === 0 && (
                              <Text size="sm" c="dimmed">No items available.</Text>
                            )}
                            {countertopMaterialsResolved.map(item => {
                              const isEditable = (item as any).editable === true;
                              const price = isEditable ? (customMaterialPrices[item.id] ?? item.price) : item.price;
                              return (
                                <Group key={item.id} justify="space-between" wrap="nowrap">
                                  <Group gap="sm">
                                    <ThumbImg src={item.image} />
                                    <div>
                                      <Text size="sm" fw={500}>{item.name}</Text>
                                      {isEditable ? (
                                        <Group gap={8} wrap="nowrap" align="center">
                                          <NumberInput size="xs" w={120} min={0} value={price}
                                            onChange={(v) => setCustomMaterialPrices({ ...customMaterialPrices, [item.id]: Number(v) || 0 })}
                                            leftSection={<Text size="xs" c="dimmed">$</Text>}
                                          />
                                          <Text size="xs" c="dimmed">(editable)</Text>
                                        </Group>
                                      ) : (
                                        <Group gap={8} wrap="nowrap">
                                          <Text size="xs" c="dimmed">${price.toFixed(2)}</Text>
                                          {item.tds && (
                                            <Text size="xs">• <a href={item.tds} target="_blank" rel="noreferrer">View TDS</a></Text>
                                          )}
                                        </Group>
                                      )}
                                    </div>
                                  </Group>
                                  <NumberInput size="xs" w={90} min={0} value={addOnQuantities[item.id] || 0}
                                    onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [item.id]: Number(v) || 0 }))} />
                                </Group>
                              );
                            })}
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                      <Accordion.Item value="countertop-incidentals">
                        <Accordion.Control>
                          <Group justify="space-between" align="center">
                            <Text>Countertop Incidentals</Text>
                            <Badge variant="light" size="sm">{addOnCategorySummaries.ctIncidentals.count} selected • ${addOnCategorySummaries.ctIncidentals.subtotal.toFixed(2)}</Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="xs">
                            {countertopIncidentals.length === 0 && (
                              <Text size="sm" c="dimmed">No products found in category.</Text>
                            )}
                            {countertopIncidentals.map(item => (
                              <Group key={item.id} justify="space-between" wrap="nowrap">
                                <Group gap="sm">
                                  <ThumbImg src={item.image} />
                                  <div>
                                    <Text size="sm" fw={500}>{item.name}</Text>
                                    <Group gap={8} wrap="nowrap">
                                      <Text size="xs" c="dimmed">${item.price.toFixed(2)}</Text>
                                      {item.tds && (
                                        <Text size="xs">• <a href={item.tds} target="_blank" rel="noreferrer">View TDS</a></Text>
                                      )}
                                    </Group>
                                  </div>
                                </Group>
                                <NumberInput size="xs" w={90} min={0} value={addOnQuantities[item.id] || 0}
                                  onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [item.id]: Number(v) || 0 }))} />
                              </Group>
                            ))}
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </>
                  )}
                  {(selectedSystem === 'metallic-system' || selectedSystemGroup === 'countertops-custom') && (
                    <Accordion.Item value="mica">
                      <Accordion.Control>
                        <Group justify="space-between" align="center">
                          <Text>Mica Fusion Spray Colors</Text>
                          <Badge variant="light" size="sm">{addOnCategorySummaries.mica.count} selected • ${addOnCategorySummaries.mica.subtotal.toFixed(2)}</Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="xs">
                          {micaFusionSprayColors.length === 0 && (
                            <Text size="sm" c="dimmed">No products found in category.</Text>
                          )}
                          {micaFusionSprayColors.map(item => (
                            <Group key={item.id} justify="space-between" wrap="nowrap">
                              <Group gap="sm">
                                <ThumbImg src={item.image} />
                                <div>
                                  <Text size="sm" fw={500}>{item.name}</Text>
                                  <Group gap={8} wrap="nowrap">
                                    <Text size="xs" c="dimmed">${item.price.toFixed(2)}</Text>
                                    {item.tds && (
                                      <Text size="xs">• <a href={item.tds} target="_blank" rel="noreferrer">View TDS</a></Text>
                                    )}
                                  </Group>
                                </div>
                              </Group>
                              <NumberInput size="xs" w={90} min={0} value={addOnQuantities[item.id] || 0}
                                onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [item.id]: Number(v) || 0 }))} />
                            </Group>
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  )}
                </Accordion>
                {/* Catalog Modal */}
                <Modal
                  opened={catalogOpen}
                  onClose={() => setCatalogOpen(false)}
                  title={`Product Catalog${catalogManu ? ` — ${catalogManu}` : (selectedManufacturerName ? ` — ${selectedManufacturerName}` : '')}`}
                  size="80vw"
                  radius="md"
                  centered
                >
                  <Stack gap="sm">
                    <Group align="flex-end" wrap="wrap" justify="space-between">
                      <Group align="flex-end" wrap="wrap" style={{ flex: 1 }}>
                        <TextInput label="Search" placeholder="Search products by name…" value={catalogQuery} onChange={(e) => setCatalogQuery(e.currentTarget.value)} style={{ flex: 1, minWidth: 220 }} />
                        <Select
                          label="Category"
                          clearable
                          placeholder="All Categories"
                          data={[...new Set(products.map(p => p.category).filter(Boolean))].map(c => ({ value: c!, label: c! }))}
                          value={catalogCategory}
                          onChange={setCatalogCategory}
                          style={{ minWidth: 200 }}
                        />
                        <Select
                          label="Manufacturer"
                          clearable
                          placeholder="All Manufacturers"
                          data={[...new Set(products.map(p => p.manufacturer).filter(Boolean))].map(m => ({ value: m!, label: m! }))}
                          value={catalogManu}
                          onChange={setCatalogManu}
                          style={{ minWidth: 220 }}
                        />
                      </Group>
                      {(() => {
                        const filtered = products
                          .filter(p => !catalogQuery || p.name.toLowerCase().includes(catalogQuery.toLowerCase()))
                          .filter(p => !catalogCategory || p.category === catalogCategory)
                          .filter(p => !catalogManu || p.manufacturer === catalogManu);
                        const total = filtered.length;
                        const shown = Math.min(catalogLimit, total);
                        return (
                          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                            Showing {total > 0 ? `1–${shown}` : '0'} of {total} products
                          </Text>
                        );
                      })()}
                    </Group>
                    <Divider />
                    {(() => {
                      const filtered = products
                        .filter(p => !catalogQuery || p.name.toLowerCase().includes(catalogQuery.toLowerCase()))
                        .filter(p => !catalogCategory || p.category === catalogCategory)
                        .filter(p => !catalogManu || p.manufacturer === catalogManu);
                      const slice = filtered.slice(0, catalogLimit);
                      return (
                        <>
                          <SimpleGrid
                            cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
                            spacing="sm"
                            style={{ maxHeight: '70vh', overflow: 'auto', paddingRight: 4 }}
                          >
                            {slice.map(p => {
                              const id = p.id.toString();
                              const price = getUnitPrice(p) || 0;
                              const qty = addOnQuantities[id] || 0;
                              return (
                                <Paper key={id} withBorder radius="md" p="sm">
                                  <Stack gap={6}>
                                    <Group gap={8} align="flex-start" wrap="nowrap">
                                      <ThumbImg src={getProductImageUrl(p.image_url)} size={48} />
                                      <div style={{ minWidth: 0 }}>
                                        <Text
                                          size="sm"
                                          fw={600}
                                          style={{
                                            lineHeight: 1.2,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2 as any,
                                            WebkitBoxOrient: 'vertical' as any,
                                            overflow: 'hidden'
                                          }}
                                        >
                                          {p.name}
                                        </Text>
                                        <Group gap={8} wrap="wrap">
                                          {p.sku && <Badge size="xs" variant="light" color="gray">SKU: {p.sku}</Badge>}
                                          <Badge size="xs" variant="light" color="blue">{p.category || 'Uncategorized'}</Badge>
                                          {p.manufacturer && <Badge size="xs" variant="light" color="teal">{p.manufacturer}</Badge>}
                                        </Group>
                                      </div>
                                    </Group>
                                    <Group justify="space-between" align="center">
                                      <Text size="sm" fw={600}>${price.toFixed(2)}</Text>
                                      <Group gap="xs" align="center">
                                        <NumberInput size="xs" w={84} min={0} value={qty} onChange={(v) => setAddOnQuantities(prev => ({ ...prev, [id]: Number(v) || 0 }))} />
                                        <Button size="xs" onClick={() => {
                                          setAddOnQuantities(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
                                          notifications.show({ title: 'Added to estimate', message: `${p.name} added.`, color: 'green' });
                                        }}>Add to Estimate</Button>
                                      </Group>
                                    </Group>
                                  </Stack>
                                </Paper>
                              );
                            })}
                          </SimpleGrid>
                          {filtered.length > catalogLimit && (
                            <Group justify="center" mt="sm">
                              <Button variant="light" onClick={() => setCatalogLimit(l => l + 24)}>Load more</Button>
                            </Group>
                          )}
                        </>
                      );
                    })()}
                  </Stack>
                </Modal>

                {/* Suggestions appear just above the footer actions for better flow */}
                {(effectiveSqft > 0 && !!selectedSystem) && (
                  <Box mt="md">
                    <Accordion value={sugOpen ? 'suggestions' : null} onChange={(v) => setSugOpen(!!v)}>
                      <Accordion.Item value="suggestions">
                        <Accordion.Control>
                          <Group justify="space-between" align="center" style={{ borderRadius: 8 }}>
                            <Text fw={600} c="blue">Intelligent Suggestions</Text>
                            <Button size="xs" variant="subtle" c="blue" onClick={(e) => { e.stopPropagation(); setSugOpen(false); }}>
                              ✕ Dismiss recommendations
                            </Button>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Box p="sm" style={{ border: '1px solid rgba(125, 211, 252, 0.7)', background: '#eff6ff', borderRadius: 8 }}>
                            {(() => {
                              const getFavKeyForSuggestion = (s: Suggestion): string | null => {
                                if (s.productId) {
                                  const prod = getProduct(s.productId);
                                  if (prod) return (prod.sku || prod.id.toString()) as string;
                                  return s.productId;
                                }
                                return s.id;
                              };
                              const engine = mergedSuggestions.filter(s => !s.productId || (addOnQuantities[s.productId] || 0) === 0);
                              const dedupeByProduct = (arr: Suggestion[]) => {
                                const seen = new Set<string>();
                                const out: Suggestion[] = [];
                                arr.forEach(s => {
                                  const key = s.productId || s.id;
                                  if (!seen.has(key)) { seen.add(key); out.push(s); }
                                });
                                return out;
                              };
                              const favFirst = engine.filter(s => {
                                const key = getFavKeyForSuggestion(s);
                                return !!key && favSkus.includes(key);
                              });
                              const cards = dedupeByProduct([...favFirst, ...engine]).slice(0, 6);
                              if (cards.length === 0) return <Text size="sm" c="dimmed">No suggestions right now.</Text>;
                              return (
                                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                                  {cards.map((s) => {
                                    const favKey = getFavKeyForSuggestion(s);
                                    const isFav = !!favKey && favSkus.includes(favKey);
                                    return (
                                      <Paper key={s.id} p="sm" withBorder>
                                        <Stack gap={6}>
                                          <Group justify="space-between" align="flex-start">
                                            <div>
                                              <Text fw={600} size="sm">{s.title}</Text>
                                              {s.desc && <Text size="xs" c="dimmed">{s.desc}</Text>}
                                            </div>
                                            <Button variant="subtle" size="compact-xs" aria-label={isFav ? 'Unfavorite' : 'Favorite'} c={isFav ? 'pink' : 'gray'} onClick={() => favKey && toggleFav(favKey)}>
                                              ♥
                                            </Button>
                                          </Group>
                                          {(s.price !== undefined) && (
                                            <Text size="xs" c="dimmed">${s.price.toFixed(2)} each</Text>
                                          )}
                                          <Group justify="space-between" gap="xs" align="center">
                                            {s.productId && (
                                              <Group gap={6} align="center">
                                                <NumberInput size="xs" w={80} min={0} step={1} value={Number.isFinite(suggestionQty[s.id]) ? suggestionQty[s.id] : s.qty} onChange={(v) => setSuggestionQty(prev => ({ ...prev, [s.id]: Number(v) || 0 }))} />
                                                <Text size="xs" c="dimmed">{s.unit || 'ea'}</Text>
                                                <Text size="xs" c="dimmed">(suggested: {s.qty})</Text>
                                              </Group>
                                            )}
                                            <Group gap="xs">
                                              {s.onApply && (
                                                <Button size="xs" variant="light" onClick={s.onApply}>Apply</Button>
                                              )}
                                              {s.productId && (
                                                <Button size="xs" onClick={() => {
                                                  const q = Number.isFinite(suggestionQty[s.id]) ? (suggestionQty[s.id] || 0) : s.qty;
                                                  setAddOnQuantities(prev => ({ ...prev, [s.productId!]: (prev[s.productId!] || 0) + q }));
                                                }}>+ Add</Button>
                                              )}
                                            </Group>
                                          </Group>
                                        </Stack>
                                      </Paper>
                                    );
                                  })}
                                </SimpleGrid>
                              );
                            })()}
                          </Box>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                  </Box>
                )}

                {/* Footer actions: Browse catalog next to Calculate Pricing */}
                <Group justify="space-between" mt="md">
                  <Text size="sm" c="dimmed">Browse for additional products.</Text>
                  <Group>
                    <Button variant="default" onClick={() => setCatalogOpen(true)}>Browse Catalog</Button>
                    <Button size="md" color="green" leftSection={<IconCalculator size={16} />} onClick={handleCalculate} disabled={!canCalculate}>
                      Calculate Pricing
                    </Button>
                  </Group>
                </Group>
              </Paper>
            </aside>
          ) : (
            <aside id="uc-addons" className="space-y-4">
              <Paper p="lg" withBorder mb="xl">
                <Stack gap="xs">
                  <Text fw={600}>Materials & Products</Text>
                  <Box p="sm" style={{ borderRadius: 6, border: '1px dashed #cbd5e1', background: '#f8fafc' }}>
                    <Text size="sm" c="dimmed">Complete Steps 1–3 to view Add‑Ons and browse additional products.</Text>
                  </Box>
                </Stack>
              </Paper>
            </aside>
          )}
        </section>

        {/* Full-width Calculation Results below the split */}
        {hasCalculated && (
          <section id="uc-results" className="mt-6">
            <Paper p="lg" withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Text fw={600} size="lg" c="green">Calculation Results</Text>
                </Group>
                <Box p="md" bg="gray.0" style={{ borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <Stack gap="xs">
                    <Text fw={600} size="sm">Good / Better / Best</Text>
                    <Text size="xs" c="dimmed">Choose a tier to adjust coat thickness and pricing. Better is the baseline.</Text>
                    <div role="radiogroup" aria-label="Tier" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(['good', 'better', 'best'] as const).map((tier) => {
                        const title = tier === 'good' ? 'Good' : tier === 'better' ? 'Better' : 'Best';
                        const selected = selectedTier === tier;
                        return (
                          <button
                            key={tier}
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setSelectedTier(tier)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 10px', borderRadius: 8,
                              border: `1px solid ${selected ? '#0ea5e9' : '#e5e7eb'}`,
                              background: selected ? '#f0f9ff' : 'white'
                            }}
                          >
                            <span style={{
                              display: 'inline-block', width: 10, height: 10, borderRadius: '9999px',
                              background: selected ? '#0369a1' : 'transparent', border: selected ? 'none' : '1px solid #9ca3af'
                            }} />
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Tier Card explainer */}
                    <Box mt="sm" p="md" style={{ borderRadius: 8, border: '1px solid #e5e7eb', background: '#ffffff' }}>
                      {selectedTier === 'good' && (
                        <Stack gap={4}>
                          <Text fw={700}>Good</Text>
                          <Text size="sm" c="dimmed">Compact coating package for reliable, budget-friendly protection—best for single-car garages, basements, storage rooms, light retail back-of-house.</Text>
                          <Text size="sm">Thickness: 10–15 mils · Cure: 24–48 hrs · Warranty: 2 years</Text>
                          <Text size="sm">Pulls thinner than Better — uses less material and builds a thinner film.</Text>
                          {affectedDefaultSpreads.length > 0 && (
                            <Text size="xs" c="dimmed">Approx build vs Better: {buildDeltaPctSelectedTier.toFixed(0)}% (est.)</Text>
                          )}
                          <Text fw={600}>Price to homeowner: {fmtMoney(tierPricing.good.customerPrice)} • {fmtPpsf(tierPricing.good.pricePerSqFt)}</Text>
                        </Stack>
                      )}
                      {selectedTier === 'better' && (
                        <Stack gap={4}>
                          <Text fw={700}>Better (baseline)</Text>
                          <Text size="sm" c="dimmed">Premium blend tuned for stronger wear resistance and color hold—ideal for 2–3 car garages, showrooms, clinics, classrooms, busy hallways, restaurants.</Text>
                          <Text size="sm">Thickness: 15–20 mils · Cure: 24–36 hrs · Warranty: 10 years</Text>
                          <Text size="sm">Baseline uses the systems preset spread values for base/grout/extra/money coats. Balanced material usage and durability.</Text>
                          <Text fw={600}>Price to homeowner: {fmtMoney(tierPricing.better.customerPrice)} • {fmtPpsf(tierPricing.better.pricePerSqFt)}</Text>
                        </Stack>
                      )}
                      {selectedTier === 'best' && (
                        <Stack gap={4}>
                          <Text fw={700}>Best</Text>
                          <Text size="sm" c="dimmed">Industrial-grade build for maximum longevity and abuse resistance—built for warehouses, factories, service bays, breweries, distribution centers, metallic feature floors.</Text>
                          <Text size="sm">Thickness: 20–30 mils · Cure: 48–72 hrs · Warranty: 15 years</Text>
                          <Text size="sm">Pulls heavier than Better — uses more material and builds a thicker film.</Text>
                          {affectedDefaultSpreads.length > 0 && (
                            <Text size="xs" c="dimmed">Approx build vs Better: {buildDeltaPctSelectedTier.toFixed(0)}% (est.)</Text>
                          )}
                          <Text fw={600}>Price to homeowner: {fmtMoney(tierPricing.best.customerPrice)} • {fmtPpsf(tierPricing.best.pricePerSqFt)}</Text>
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                </Box>
                <Box>
                  {displayLineItems.length > 0 ? (
                    <div className="results-table-wrapper">
                      <Table striped highlightOnHover withTableBorder withColumnBorders className="results-table">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Item</Table.Th>
                            <Table.Th style={{ width: 160 }}>Qty</Table.Th>
                            <Table.Th style={{ width: 140 }}>Unit Price</Table.Th>
                            <Table.Th style={{ width: 140 }}>Total</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {displayLineItems.map(item => {
                            const prod = products.find(p => p.id.toString() === item.id);
                            const effectiveQty = prod ? (resultQtyOverrides[item.id] ?? item.qty) : item.qty;
                            const effectiveTotal = item.unitPrice * effectiveQty;
                            return (
                              <Table.Tr key={item.id}>
                                <Table.Td>
                                  <Group gap="sm" align="center">
                                    {prod && prod.image_url ? (
                                      <ThumbImg src={getProductImageUrl(prod.image_url)} size={32} />
                                    ) : (
                                      <LaborThumb id={item.id} />
                                    )}
                                    <div>
                                      <Text size="sm" fw={500}>{item.name}</Text>
                                      {selectedTier !== 'better' && affectedSelectedMap.has(item.id) && (
                                        (() => {
                                          const sel = affectedSelectedMap.get(item.id)!;
                                          const base = affectedBetterMap.get(item.id);
                                          const changed = !base || base.qty !== sel.qty;
                                          if (!changed) return null;
                                          return (
                                            <Badge size="xs" variant="light" color="teal" title={`Better: ${base ? base.qty : 0} ${base?.unit || ''} → ${sel.qty} ${sel.unit || ''}`}>
                                              Changed by tier
                                            </Badge>
                                          );
                                        })()
                                      )}
                                      {prod?.technical_data_sheet_url && (
                                        <Text size="xs"><a href={prod.technical_data_sheet_url} target="_blank" rel="noreferrer">View TDS</a></Text>
                                      )}
                                    </div>
                                  </Group>
                                </Table.Td>
                                <Table.Td>
                                  {prod ? (
                                    <Group gap={6} align="center">
                                      <NumberInput
                                        size="xs"
                                        w={110}
                                        min={0}
                                        value={effectiveQty}
                                        onChange={(v) => setResultQtyOverrides(prev => ({ ...prev, [item.id]: Number(v) || 0 }))}
                                      />
                                      {item.unit && <Badge variant="light" size="xs" color="gray">{item.unit}</Badge>}
                                    </Group>
                                  ) : (
                                    <Text size="sm">
                                      {item.qty}{item.unit ? ` ${item.unit}` : ''}
                                    </Text>
                                  )}
                                </Table.Td>
                                <Table.Td><Text size="sm">{fmtMoney(item.unitPrice)}</Text></Table.Td>
                                <Table.Td><Text size="sm" fw={600}>{fmtMoney(effectiveTotal)}</Text></Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </div>
                  ) : (
                    <Text size="sm" c="dimmed">No items selected yet. Choose system components to see a detailed list here.</Text>
                  )}
                </Box>

                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Box p="md" bg="blue.0" style={{ borderRadius: '6px' }}>
                      <Text fw={600} size="lg" c="blue" mb="xs">{fmtMoney(calculateRequiredRevenue())}</Text>
                      <Text size="sm">Total Customer Price</Text>
                    </Box>
                    <Stack gap="xs" mt="sm">
                      <Group justify="space-between"><Text size="sm">Material Cost:</Text><Text size="sm" fw={500}>{fmtMoney(getMaterialCost())}</Text></Group>
                      <Group justify="space-between"><Text size="sm">Labor Cost:</Text><Text size="sm" fw={500}>{fmtMoney(calculateLaborCost())}</Text></Group>
                      <Group justify="space-between"><Text size="sm">Total Cost:</Text><Text size="sm" fw={500}>{fmtMoney(calculateTotalCost())}</Text></Group>
                      <Divider />
                      <Group justify="space-between"><Text size="sm" fw={600}>Profit:</Text><Text size="sm" fw={600} c="green">{fmtMoney(calculateRequiredRevenue() - calculateTotalCost())}</Text></Group>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Box p="md" bg="orange.0" style={{ borderRadius: '6px' }}>
                      <Text fw={600} size="lg" c="orange" mb="xs">{fmtPpsf(calculatePricePerSqft())}</Text>
                      <Text size="sm">Price per Square Foot</Text>
                    </Box>
                    <Stack gap="xs" mt="sm">
                      <Group justify="space-between"><Text size="sm">Coverage Area:</Text><Text size="sm" fw={500}>{effectiveSqft.toFixed(1)} sq ft</Text></Group>
                      <Group justify="space-between"><Text size="sm">Profit Margin:</Text><Text size="sm" fw={500}>{calculateAchievedMargin().toFixed(1)}%</Text></Group>
                      <Group justify="space-between"><Text size="sm">Labor Rate:</Text><Text size="sm" fw={500}>${laborRate}/hr</Text></Group>
                      <Group justify="space-between"><Text size="sm">Labor Hours:</Text><Text size="sm" fw={500}>{totalLaborHours}</Text></Group>
                    </Stack>
                  </Grid.Col>
                </Grid>

                <Group justify="center" mt="xs" className="sticky-actions">
                  <Button size="lg" onClick={() => { setSaveBidModalOpen(true); }}>Save Bid</Button>
                  <Button size="lg" variant="outline" onClick={handleCreateEstimate}>
                    Create Estimate
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => {
                    if (editingBidId) {
                      // Already saved, navigate directly with savedBidId
                      setLocation(`/order-requests/new?source=universal-calculator&savedBidId=${editingBidId}`);
                    } else {
                      // Not saved yet, prompt to save first
                      setPendingOrderSheet(true);
                      setSaveBidModalOpen(true);
                    }
                  }}>Material Order Request</Button>
                  <Button size="lg" variant="outline" onClick={() => {
                    setLocation('/pnl-statement');
                  }}>P&L Statement</Button>
                  {/* Reset moved to top sticky bar */}
                </Group>
                {/* Save/Update Bid Modal */}
                <Modal opened={saveBidModalOpen} onClose={() => {
                  setSaveBidModalOpen(false);
                  setSubmitAttempted(false);
                }} title={editingBidId ? 'Update Bid' : 'Save Bid'} size="lg">
                  <Stack gap="sm">
                    <TextInput
                      label="Bid Name"
                      placeholder="e.g. Garage Floor Coating Project"
                      value={bidName}
                      onChange={(e) => setBidName(e.currentTarget.value)}
                      required
                      error={submitAttempted && !bidName.trim() ? 'Bid name is required' : undefined}
                    />
                    <Textarea
                      label="Description"
                      placeholder="Optional description for this bid"
                      value={bidDescription}
                      onChange={(e) => setBidDescription(e.currentTarget.value)}
                      minRows={2}
                    />

                    <Divider label="Client Selection" labelPosition="left" />

                    {selectedClientId && selectedClientName ? (
                      <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                        <Group justify="space-between" align="center">
                          <div>
                            <Text size="sm" fw={500}>Selected Client:</Text>
                            <Text size="lg" fw={600}>{selectedClientName}</Text>
                          </div>
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            onClick={() => {
                              setSelectedClientId(null);
                              setSelectedClientName('');
                            }}
                          >
                            Change
                          </Button>
                        </Group>
                      </Paper>
                    ) : (
                      <Paper p="md" withBorder style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
                        <Text size="sm" c="dimmed" mb="sm">No client selected. Please select or create a client.</Text>
                        <Group>
                          <Button
                            variant="light"
                            onClick={() => setPickContactOpen(true)}
                          >
                            Select Existing Client
                          </Button>
                          <Button
                            variant="light"
                            onClick={() => setCreateClientModalOpen(true)}
                          >
                            Create New Client
                          </Button>
                        </Group>
                      </Paper>
                    )}

                    {submitAttempted && !selectedClientId && (
                      <Text size="xs" c="red" mt={-8}>Client selection is required to save bid</Text>
                    )}

                    <Group justify="flex-end" mt="md">
                      <Button variant="subtle" onClick={() => {
                        setSaveBidModalOpen(false);
                        setSubmitAttempted(false);
                      }}>Cancel</Button>
                      <Button loading={isSavingBid} disabled={isSavingBid} onClick={async () => {
                        if (isSavingBid) return; // Prevent duplicate submissions
                        
                        setSubmitAttempted(true);
                        const snap = buildBidSnapshot();
                        if (!snap) {
                          notifications.show({ title: 'Nothing to save', message: 'Run a calculation first.', color: 'orange' });
                          return;
                        }
                        if (!bidName || !bidName.trim()) {
                          notifications.show({ title: 'Bid Name Required', message: 'Please enter a bid name to save.', color: 'red' });
                          return;
                        }
                        if (!selectedClientId) {
                          notifications.show({ title: 'Client Required', message: 'Please select or create a client to save bid.', color: 'red' });
                          return;
                        }

                        setIsSavingBid(true);
                        try {
                          // Build comprehensive system components object
                          const systemComponents: Record<string, any> = {
                            basePigment: selectedBasePigment || null,
                            baseCoat: selectedBaseCoat || null,
                            flakeColor: selectedFlakeColor || null,
                            topCoat: selectedTopCoat || null,
                            mvbBasePigment: selectedMVBBasePigment || null,
                            mvbBaseCoat: selectedMVBBaseCoat || null,
                            mvbFlakeColor: selectedMVBFlakeColor || null,
                            mvbTopCoat: selectedMVBTopCoat || null,
                            solidBasePigment: selectedSolidBasePigment || null,
                            solidGroutCoat: selectedSolidGroutCoat || null,
                            solidBaseCoat: selectedSolidBaseCoat || null,
                            solidExtraBaseCoat: selectedSolidExtraBaseCoat || null,
                            solidTopCoat: selectedSolidTopCoat || null,
                            metallicBasePigment: selectedMetallicBasePigment || null,
                            metallicGroutCoat: selectedMetallicGroutCoat || null,
                            metallicBaseCoat: selectedMetallicBaseCoat || null,
                            metallicMoneyCoat: selectedMetallicMoneyCoat || null,
                            metallicPigments: selectedMetallicPigments || [],
                            metallicTopCoat: selectedMetallicTopCoat || null,
                            grindSealPrimer: selectedGrindSealPrimer || null,
                            grindSealGroutCoat: selectedGrindSealGroutCoat || null,
                            grindSealBaseCoat: selectedGrindSealBaseCoat || null,
                            grindSealIntermediateCoat: selectedGrindSealIntermediateCoat || null,
                            grindSealTopCoat: selectedGrindSealTopCoat || null,
                            grindSealAdditionalTopCoat: selectedGrindSealAdditionalTopCoat || null,
                            countertopPrimer: selectedCountertopPrimer || null,
                            countertopBasePigment: selectedCountertopBasePigment || null,
                            countertopMetallicArtCoat: selectedCountertopMetallicArtCoat || null,
                            countertopMetallicPigments: selectedCountertopMetallicPigments || [],
                            countertopFloodCoat: selectedCountertopFloodCoat || null,
                            countertopTopCoat: selectedCountertopTopCoat || null,
                          };

                          // Build spread rate overrides
                          const spreadRateOverrides: Record<string, number> = {
                            noMVBBasePigment: noMVBBasePigmentSpreadRate,
                            noMVBBaseCoat: noMVBBaseCoatSpreadRate,
                            noMVBFlakeColor: noMVBFlakeColorSpreadRate,
                            noMVBTopCoat: noMVBTopCoatSpreadRate,
                            mvbBasePigment: mvbBasePigmentSpreadRate,
                            mvbBaseCoat: mvbBaseCoatSpreadRate,
                            mvbFlakeColor: mvbFlakeColorSpreadRate,
                            mvbTopCoat: mvbTopCoatSpreadRate,
                            solidBasePigment: solidBasePigmentSpreadRate,
                            solidGroutCoat: solidGroutCoatSpreadRate,
                            solidBaseCoat: solidBaseCoatSpreadRate,
                            solidExtraBaseCoat: solidExtraBaseCoatSpreadRate,
                            solidTopCoat: solidTopCoatSpreadRate,
                            metallicBasePigment: metallicBasePigmentSpreadRate,
                            metallicGroutCoat: metallicGroutCoatSpreadRate,
                            metallicBaseCoat: metallicBaseCoatSpreadRate,
                            metallicMoneyCoat: metallicMoneyCoatSpreadRate,
                            metallicTopCoat: metallicTopCoatSpreadRate,
                            grindSealGrout: grindSealGroutSpreadRate,
                            grindSealBase: grindSealBaseSpreadRate,
                            grindSealIntermediateCoat: grindSealIntermediateCoatSpreadRate,
                            countertopBaseCoat: countertopBaseCoatSpreadRate,
                            countertopMetallicArtCoat: countertopMetallicArtCoatSpreadRate,
                            countertopClearCoat: countertopClearCoatSpreadRate,
                            countertopMetallicPigment: countertopMetallicPigmentSpreadRate,
                          };

                          // Build UI state
                          const uiState = {
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
                          };

                          // Build totals by tier
                          const totalsByTier = {
                            good: { customerPrice: tierPricing.good.customerPrice, ppsf: tierPricing.good.pricePerSqFt },
                            better: { customerPrice: tierPricing.better.customerPrice, ppsf: tierPricing.better.pricePerSqFt },
                            best: { customerPrice: tierPricing.best.customerPrice, ppsf: tierPricing.best.pricePerSqFt },
                          };

                          const items = snapshotToItems(snap);
                          const totals = {
                            materialCost: Number(pricingOutput.materialCost ?? getMaterialCost()),
                            laborCost: calculateLaborCost(),
                            totalCost: calculateTotalCost(),
                            customerPrice: calculateRequiredRevenue(),
                            ppsf: calculatePricePerSqft(),
                            byTier: totalsByTier,
                          };

                          // Get numeric manufacturer_id from apiManufacturers by matching manufacturer name (backend needs this for material orders)
                          const manufacturerId = apiManufacturers.find(
                            m => m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === selectedManufacturer
                          )?.id || null;

                          // Capitalize surface hardness for backend validation (expects 'Soft', 'Medium', 'Hard', not lowercase)
                          const capitalizeSurfaceHardness = (value: string | null): string | null => {
                            if (!value) return null;
                            if (value === 'soft') return 'Soft';
                            if (value === 'medium') return 'Medium';
                            if (value === 'hard') return 'Hard';
                            if (value === 'very-hard') return 'Hard'; // Backend doesn't support 'Very Hard', map to 'Hard'
                            return value;
                          };

                          // Build items directly from snapshot (like QuickQuote) to preserve manufacturer info
                          const savedBidItems = (snap.lineItems || []).map((li) => {
                            const productId = li.id ? parseInt(li.id, 10) : null;

                            return {
                              product_id: productId || null,
                              item_type: 'product' as const,
                              item_name: li.name || '',
                              item_sku: li.sku || li.id || null,
                              quantity: li.qty || 0,
                              unit: li.unit || 'ea',
                              unit_price: li.unitPrice || 0,
                              total_price: li.total || (li.qty || 0) * (li.unitPrice || 0),
                              product_name: li.name || null,
                              product_category: null,
                              product_manufacturer: li.manufacturer || null, // Use actual product manufacturer from snapshot
                              product_image_url: li.imageUrl || null,
                              product_tds_url: li.tdsUrl || null,
                              component_key: undefined,
                              is_system_material: false,
                              is_add_on: false,
                              is_labor: false,
                              notes: null,
                            };
                          });

                          const draftPayload = {
                            ...draft,
                            items,
                            totals,
                            pricingMethod: toDraftPricingMethod(pricingMethod),
                            coverageAreaSqFt: Number(effectiveSqft) || 0,
                            systemGroup: selectedSystemGroup,
                            systemType: selectedSystem,
                            client: selectedClientId ? { id: parseInt(String(selectedClientId), 10) } : null,
                            manufacturerId: manufacturerId,
                            surfaceHardness: capitalizeSurfaceHardness(selectedSurfaceHardness),
                          };

                          // Format custom pieces for countertops to match backend schema
                          const customPieces = countertopMode === 'pieces' && countertopPieces.length > 0 ? {
                            mode: 'build_by_pieces' as const,
                            pieces: countertopPieces.map(p => ({
                              name: p.name,
                              surface: [p.length, p.width],
                              edge: [p.edgeHeight, p.edgeWidth],
                              backsplash: [p.backsplashHeight, p.backsplashWidth],
                            }))
                          } : countertopMode === 'totals' ? {
                            mode: 'total' as const,
                            piece: {
                              surface: countertopDirectSurface || 0,
                              edge: countertopDirectEdge || 0,
                              backsplash: countertopDirectBacksplash || 0,
                            }
                          } : null;

                          const payload = buildSavedBidPayload(draftPayload as any, {
                            bidName,
                            bidDescription,
                            manufacturerName: selectedManufacturerName,
                            systemComponents,
                            spreadRateOverrides,
                            resultQtyOverrides,
                            addOnQuantities,
                            customMaterialPrices,
                            laborRates,
                            uiState,
                            dimensions,
                            selectedTier,
                            totalsByTier,
                            customPieces,
                            sundriesEnabled,
                            suggestionCycle,
                            customChargeLabel,
                          });

                          // Override items in payload with properly formatted items from snapshot
                          payload.items = savedBidItems;

                          if (editingBidId) {
                            // Update existing bid
                            await apiPut(`/api/saved-bids/${editingBidId}`, payload);
                            notifications.show({ title: 'Bid Updated', message: 'Your bid has been updated successfully.', color: 'green' });
                          } else {
                            // Create new bid
                            const res = await apiPost<{ id: string }>(`/api/saved-bids/`, payload);
                            notifications.show({ title: 'Bid Saved', message: 'Your bid has been saved successfully.', color: 'green' });

                            // Navigate to order sheet if pending, otherwise to saved bids
                            if (pendingOrderSheet) {
                              setPendingOrderSheet(false);
                              setLocation(`/order-requests/new?source=universal-calculator&savedBidId=${res.id}`);
                            } else {
                              setLocation('/saved-bids');
                            }
                          }
                          setSaveBidModalOpen(false);
                          setSubmitAttempted(false);
                          if (!editingBidId) {
                            setBidName('');
                            setBidDescription('');
                            setSelectedClientId(null);
                            setSelectedClientName('');
                          }
                        } catch (error: any) {
                          console.error('Failed to save bid:', error);
                          notifications.show({ title: 'Save Failed', message: error?.message || 'Unable to save bid.', color: 'red' });
                        } finally {
                          setIsSavingBid(false);
                        }
                      }}>{editingBidId ? 'Update Bid' : 'Save Bid'}</Button>
                    </Group>
                  </Stack>
                </Modal>
                <SelectContactModal
                  opened={pickContactOpen}
                  onClose={() => setPickContactOpen(false)}
                  onSelected={(c) => {
                    setSelectedClientId(c.id);
                    setSelectedClientName(`${c.first_name} ${c.last_name}`.trim() || c.company_name || '');
                    setPickContactOpen(false);
                    setSubmitAttempted(false); // Clear error state when client is selected
                    notifications.show({ title: 'Client Selected', message: 'Client applied to bid.', color: 'green' });
                  }}
                />
                <AddContactModal
                  opened={createClientModalOpen}
                  onClose={() => setCreateClientModalOpen(false)}
                  onSuccess={async () => {
                    setCreateClientModalOpen(false);
                    setSubmitAttempted(false); // Clear error state
                    notifications.show({
                      title: 'Client Created',
                      message: 'Client created successfully. Please select it from existing clients.',
                      color: 'green'
                    });
                    // Optionally open the select modal
                    setPickContactOpen(true);
                  }}
                />
              </Stack>
            </Paper>
          </section>
        )}

        {/* Additional Sections - Show after calculation */}
        {hasCalculated && (
          <Stack gap="xl" mt="xl">
            {/* System Components Details */}
            <Paper p="lg" withBorder>
              <Title order={3} mb="md" c="blue">System Components</Title>
              <Text size="sm" c="dimmed" mb="lg">
                Selected products for each component in your {selectedSystemGroup} system
              </Text>

              <Grid gutter="md">
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="sm">
                    <Text fw={500} size="sm">Selected Components:</Text>
                    {/* Good/Better/Best moved under Calculation Results */}
                    {selectedSystemGroup === 'flooring' && selectedSystem === 'metallic-system' && (
                      <Stack gap="xs">
                        {selectedMetallicBasePigment && (
                          <Group justify="space-between">
                            <Text size="sm">Base Pigment:</Text>
                            <Text size="sm" fw={500}>{products.find(p => p.id.toString() === selectedMetallicBasePigment)?.name || 'Selected'}</Text>
                          </Group>
                        )}
                        {selectedMetallicBaseCoat && (
                          <Group justify="space-between">
                            <Text size="sm">Base Coat:</Text>
                            <Text size="sm" fw={500}>{products.find(p => p.id.toString() === selectedMetallicBaseCoat)?.name || 'Selected'}</Text>
                          </Group>
                        )}
                        {selectedMetallicPigments.length > 0 && (
                          <div>
                            <Text size="sm" mb="xs">Metallic Pigments:</Text>
                            {selectedMetallicPigments.map((pigment, idx) => (
                              <Group justify="space-between" key={idx} pl="sm">
                                <Text size="xs">{pigment.name}</Text>
                                <Text size="xs" fw={500}>Qty: {pigment.quantity}</Text>
                              </Group>
                            ))}
                          </div>
                        )}
                        {selectedMetallicTopCoat && (
                          <Group justify="space-between">
                            <Text size="sm">Top Coat:</Text>
                            <Text size="sm" fw={500}>{products.find(p => p.id.toString() === selectedMetallicTopCoat)?.name || 'Selected'}</Text>
                          </Group>
                        )}
                      </Stack>
                    )}

                    {selectedSystemGroup === 'countertops-custom' && (
                      <Stack gap="xs">
                        {selectedCountertopPrimer && (
                          <Group justify="space-between">
                            <Text size="sm">Primer:</Text>
                            <Text size="sm" fw={500}>{products.find(p => p.id.toString() === selectedCountertopPrimer)?.name || 'Selected'}</Text>
                          </Group>
                        )}
                        {selectedCountertopMetallicArtCoat && (
                          <Group justify="space-between">
                            <Text size="sm">Metallic Art Coat:</Text>
                            <Text size="sm" fw={500}>{products.find(p => p.id.toString() === selectedCountertopMetallicArtCoat)?.name || 'Selected'}</Text>
                          </Group>
                        )}
                        {selectedCountertopMetallicPigments.length > 0 && (
                          <div>
                            <Text size="sm" mb="xs">Metallic Pigments:</Text>
                            {selectedCountertopMetallicPigments.map((pigment, idx) => (
                              <Group justify="space-between" key={idx} pl="sm">
                                <Text size="xs">{pigment.name}</Text>
                                <Text size="xs" fw={500}>Qty: {pigment.quantity}</Text>
                              </Group>
                            ))}
                          </div>
                        )}
                        {selectedCountertopTopCoat && (
                          <Group justify="space-between">
                            <Text size="sm">Top Coat:</Text>
                            <Text size="sm" fw={500}>{products.find(p => p.id.toString() === selectedCountertopTopCoat)?.name || 'Selected'}</Text>
                          </Group>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="sm">
                    <Text fw={500} size="sm">Material Requirements:</Text>
                    <Box p="md" bg="gray.0" style={{ borderRadius: '6px' }}>
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm">Coverage Area:</Text>
                          <Text size="sm" fw={500}>{effectiveSqft.toFixed(1)} sq ft</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm">System Type:</Text>
                          <Text size="sm" fw={500}>{selectedSystem?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm">Manufacturer:</Text>
                          <Text size="sm" fw={500}>{availableManufacturers.find(m => m.id === selectedManufacturer)?.name}</Text>
                        </Group>
                      </Stack>
                    </Box>
                  </Stack>
                </Grid.Col>
              </Grid>
            </Paper>

            {/* (Removed old Add-on and Calculation Results here since shown above) */}
          </Stack>
        )}

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
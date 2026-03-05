import { Button, Divider, Group, Modal, Paper, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';

type AnyFn = (...args: any[]) => any;

export type SaveBidModalProps = Readonly<{
  opened: boolean;
  title: string;
  onClose: () => void;

  // Form
  bidName: string;
  setBidName: (v: string) => void;
  bidDescription: string;
  setBidDescription: (v: string) => void;
  submitAttempted: boolean;
  setSubmitAttempted: (v: boolean) => void;

  // Optional client attachment
  selectedClientId: number | null;
  setSelectedClientId: (v: number | null) => void;
  selectedClientName: string;
  setSelectedClientName: (v: string) => void;

  // Save state
  isSavingBid: boolean;
  setIsSavingBid: (v: boolean) => void;
  pendingOrderSheet: boolean;
  setPendingOrderSheet: (v: boolean) => void;
  editingBidId: string | null;

  // Calculator context
  buildBidSnapshot: AnyFn;
  snapshotToItems: AnyFn;
  pricingOutput: any;
  getMaterialCost: AnyFn;
  calculateLaborCost: AnyFn;
  calculateTotalCost: AnyFn;
  calculateRequiredRevenue: AnyFn;
  calculatePricePerSqft: AnyFn;
  effectiveSqft: number;

  // Draft + serialization
  draft: any;
  toDraftPricingMethod: AnyFn;
  pricingMethod: any;
  selectedSystemGroup: string;
  selectedSystem: string;
  selectedManufacturer: string;
  selectedManufacturerName: string | null;
  apiManufacturers: Array<{ id: number; name: string }>;
  selectedSurfaceHardness: string;
  profitMargin: number;
  laborRate: number;
  totalLaborHours: number;
  targetPpsf: number;
  hasCalculated: boolean;

  // Tiering and overrides
  tierPricing: any;
  selectedTier: any;
  resultQtyOverrides: any;

  // System components
  selectedBasePigment: string;
  selectedBaseCoat: string;
  selectedFlakeColor: string;
  selectedTopCoat: string;
  selectedMVBBasePigment: string;
  selectedMVBBaseCoat: string;
  selectedMVBFlakeColor: string;
  selectedMVBTopCoat: string;
  selectedSolidBasePigment: string;
  selectedSolidGroutCoat: string;
  selectedSolidBaseCoat: string;
  selectedSolidExtraBaseCoat: string;
  selectedSolidTopCoat: string;
  selectedMetallicBasePigment: string;
  selectedMetallicGroutCoat: string;
  selectedMetallicBaseCoat: string;
  selectedMetallicMoneyCoat: string;
  selectedMetallicPigments: any[];
  selectedMetallicTopCoat: string;
  selectedGrindSealPrimer: string;
  selectedGrindSealGroutCoat: string;
  selectedGrindSealBaseCoat: string;
  selectedGrindSealIntermediateCoat: string;
  selectedGrindSealTopCoat: string;
  selectedGrindSealAdditionalTopCoat: string;
  selectedCountertopPrimer: string;
  selectedCountertopBasePigment: string;
  selectedCountertopMetallicArtCoat: string;
  selectedCountertopMetallicPigments: any[];
  selectedCountertopFloodCoat: string;
  selectedCountertopTopCoat: string;

  // Spread rates
  noMVBBasePigmentSpreadRate: number;
  noMVBBaseCoatSpreadRate: number;
  noMVBFlakeColorSpreadRate: number;
  noMVBTopCoatSpreadRate: number;
  mvbBasePigmentSpreadRate: number;
  mvbBaseCoatSpreadRate: number;
  mvbFlakeColorSpreadRate: number;
  mvbTopCoatSpreadRate: number;
  solidBasePigmentSpreadRate: number;
  solidGroutCoatSpreadRate: number;
  solidBaseCoatSpreadRate: number;
  solidExtraBaseCoatSpreadRate: number;
  solidTopCoatSpreadRate: number;
  metallicBasePigmentSpreadRate: number;
  metallicGroutCoatSpreadRate: number;
  metallicBaseCoatSpreadRate: number;
  metallicMoneyCoatSpreadRate: number;
  metallicTopCoatSpreadRate: number;
  grindSealGroutSpreadRate: number;
  grindSealBaseSpreadRate: number;
  grindSealIntermediateCoatSpreadRate: number;
  countertopBaseCoatSpreadRate: number;
  countertopMetallicArtCoatSpreadRate: number;
  countertopClearCoatSpreadRate: number;
  countertopMetallicPigmentSpreadRate: number;

  // Add-ons, labor, materials
  addOnQuantities: any;
  customMaterialPrices: any;
  laborRates: any;
  sundriesEnabled: boolean;
  suggestionCycle: any;
  customChargeLabel: string;

  // Countertop config
  countertopMode: 'pieces' | 'totals';
  countertopPieces: any[];
  countertopDirectSurface: number;
  countertopDirectEdge: number;
  countertopDirectBacksplash: number;
  dimensions: any;
  totalSqft: number;

  // API functions
  apiPost: <T = any>(url: string, data?: unknown) => Promise<T>;
  apiPut: AnyFn;
  buildSavedBidPayload: AnyFn;

  // Navigation
  setLocation: (path: string) => void;
}>;

export function SaveBidModal(props: SaveBidModalProps) {
  const {
    opened,
    title,
    onClose,
    bidName,
    setBidName,
    bidDescription,
    setBidDescription,
    submitAttempted,
    setSubmitAttempted,
    selectedClientId,
    setSelectedClientId,
    selectedClientName,
    setSelectedClientName,
    isSavingBid,
    setIsSavingBid,
    pendingOrderSheet,
    setPendingOrderSheet,
    editingBidId,
    buildBidSnapshot,
    snapshotToItems,
    pricingOutput,
    getMaterialCost,
    calculateLaborCost,
    calculateTotalCost,
    calculateRequiredRevenue,
    calculatePricePerSqft,
    effectiveSqft,
    draft,
    toDraftPricingMethod,
    pricingMethod,
    selectedSystemGroup,
    selectedSystem,
    selectedManufacturer,
    selectedManufacturerName,
    apiManufacturers,
    selectedSurfaceHardness,
    tierPricing,
    selectedTier,
    resultQtyOverrides,
    countertopMode,
    countertopPieces,
    countertopDirectSurface,
    countertopDirectEdge,
    countertopDirectBacksplash,
    dimensions,
    totalSqft,
    apiPost,
    apiPut,
    buildSavedBidPayload,
    setLocation,
  } = props;

  const onSave = async () => {
    if (isSavingBid) return;
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

    setIsSavingBid(true);
    try {
      const systemComponents: Record<string, any> = {
        basePigment: props.selectedBasePigment || null,
        baseCoat: props.selectedBaseCoat || null,
        flakeColor: props.selectedFlakeColor || null,
        topCoat: props.selectedTopCoat || null,
        mvbBasePigment: props.selectedMVBBasePigment || null,
        mvbBaseCoat: props.selectedMVBBaseCoat || null,
        mvbFlakeColor: props.selectedMVBFlakeColor || null,
        mvbTopCoat: props.selectedMVBTopCoat || null,
        solidBasePigment: props.selectedSolidBasePigment || null,
        solidGroutCoat: props.selectedSolidGroutCoat || null,
        solidBaseCoat: props.selectedSolidBaseCoat || null,
        solidExtraBaseCoat: props.selectedSolidExtraBaseCoat || null,
        solidTopCoat: props.selectedSolidTopCoat || null,
        metallicBasePigment: props.selectedMetallicBasePigment || null,
        metallicGroutCoat: props.selectedMetallicGroutCoat || null,
        metallicBaseCoat: props.selectedMetallicBaseCoat || null,
        metallicMoneyCoat: props.selectedMetallicMoneyCoat || null,
        metallicPigments: props.selectedMetallicPigments || [],
        metallicTopCoat: props.selectedMetallicTopCoat || null,
        grindSealPrimer: props.selectedGrindSealPrimer || null,
        grindSealGroutCoat: props.selectedGrindSealGroutCoat || null,
        grindSealBaseCoat: props.selectedGrindSealBaseCoat || null,
        grindSealIntermediateCoat: props.selectedGrindSealIntermediateCoat || null,
        grindSealTopCoat: props.selectedGrindSealTopCoat || null,
        grindSealAdditionalTopCoat: props.selectedGrindSealAdditionalTopCoat || null,
        countertopPrimer: props.selectedCountertopPrimer || null,
        countertopBasePigment: props.selectedCountertopBasePigment || null,
        countertopMetallicArtCoat: props.selectedCountertopMetallicArtCoat || null,
        countertopMetallicPigments: props.selectedCountertopMetallicPigments || [],
        countertopFloodCoat: props.selectedCountertopFloodCoat || null,
        countertopTopCoat: props.selectedCountertopTopCoat || null,
      };

      const spreadRateOverrides: Record<string, number> = {
        noMVBBasePigment: props.noMVBBasePigmentSpreadRate,
        noMVBBaseCoat: props.noMVBBaseCoatSpreadRate,
        noMVBFlakeColor: props.noMVBFlakeColorSpreadRate,
        noMVBTopCoat: props.noMVBTopCoatSpreadRate,
        mvbBasePigment: props.mvbBasePigmentSpreadRate,
        mvbBaseCoat: props.mvbBaseCoatSpreadRate,
        mvbFlakeColor: props.mvbFlakeColorSpreadRate,
        mvbTopCoat: props.mvbTopCoatSpreadRate,
        solidBasePigment: props.solidBasePigmentSpreadRate,
        solidGroutCoat: props.solidGroutCoatSpreadRate,
        solidBaseCoat: props.solidBaseCoatSpreadRate,
        solidExtraBaseCoat: props.solidExtraBaseCoatSpreadRate,
        solidTopCoat: props.solidTopCoatSpreadRate,
        metallicBasePigment: props.metallicBasePigmentSpreadRate,
        metallicGroutCoat: props.metallicGroutCoatSpreadRate,
        metallicBaseCoat: props.metallicBaseCoatSpreadRate,
        metallicMoneyCoat: props.metallicMoneyCoatSpreadRate,
        metallicTopCoat: props.metallicTopCoatSpreadRate,
        grindSealGrout: props.grindSealGroutSpreadRate,
        grindSealBase: props.grindSealBaseSpreadRate,
        grindSealIntermediateCoat: props.grindSealIntermediateCoatSpreadRate,
        countertopBaseCoat: props.countertopBaseCoatSpreadRate,
        countertopMetallicArtCoat: props.countertopMetallicArtCoatSpreadRate,
        countertopClearCoat: props.countertopClearCoatSpreadRate,
        countertopMetallicPigment: props.countertopMetallicPigmentSpreadRate,
      };

      const uiState = {
        selectedManufacturer,
        selectedSystemGroup,
        selectedSystem,
        totalSqft,
        dimensions,
        selectedSurfaceHardness,
        pricingMethod,
        profitMargin: props.profitMargin,
        laborRate: props.laborRate,
        totalLaborHours: props.totalLaborHours,
        targetPpsf: props.targetPpsf,
        resultQtyOverrides,
        selectedTier,
        hasCalculated: props.hasCalculated,
      };

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

      const manufacturerId =
        apiManufacturers.find((m) => m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === selectedManufacturer)?.id ||
        null;

      const capitalizeSurfaceHardness = (value: string | null): string | null => {
        if (!value) return null;
        if (value === 'soft') return 'Soft';
        if (value === 'medium') return 'Medium';
        if (value === 'hard') return 'Hard';
        if (value === 'very-hard') return 'Hard';
        return value;
      };

      const savedBidItems = (snap.lineItems || []).map((li: any) => {
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
          product_manufacturer: li.manufacturer || null,
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

      const customPieces =
        countertopMode === 'pieces' && countertopPieces.length > 0
          ? {
              mode: 'build_by_pieces' as const,
              pieces: countertopPieces.map((p: any) => ({
                name: p.name,
                surface: [p.length, p.width],
                edge: [p.edgeHeight, p.edgeWidth],
                backsplash: [p.backsplashHeight, p.backsplashWidth],
              })),
            }
          : countertopMode === 'totals'
            ? {
                mode: 'total' as const,
                piece: {
                  surface: countertopDirectSurface || 0,
                  edge: countertopDirectEdge || 0,
                  backsplash: countertopDirectBacksplash || 0,
                },
              }
            : null;

      const payload = buildSavedBidPayload(draftPayload as any, {
        bidName,
        bidDescription,
        manufacturerName: selectedManufacturerName,
        systemComponents,
        spreadRateOverrides,
        resultQtyOverrides,
        addOnQuantities: props.addOnQuantities,
        customMaterialPrices: props.customMaterialPrices,
        laborRates: props.laborRates,
        uiState,
        dimensions,
        selectedTier,
        totalsByTier,
        customPieces,
        sundriesEnabled: props.sundriesEnabled,
        suggestionCycle: props.suggestionCycle,
        customChargeLabel: props.customChargeLabel,
      });

      payload.items = savedBidItems;

      if (editingBidId) {
        await apiPut(`/api/saved-bids/${editingBidId}`, payload);
        notifications.show({ title: 'Bid Updated', message: 'Your bid has been updated successfully.', color: 'green' });
      } else {
        const res = await apiPost<{ id: number }>(`/api/saved-bids/`, payload);
        notifications.show({ title: 'Bid Saved', message: 'Your bid has been saved successfully.', color: 'green' });
        if (pendingOrderSheet) {
          setPendingOrderSheet(false);
          setLocation(`/order-requests/new?source=universal-calculator&savedBidId=${res.id}`);
        } else {
          setLocation('/saved-bids');
        }
      }

      onClose();
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
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg">
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
            <Text size="sm" c="dimmed">
              No client is currently attached to this bid. You can still save the bid and associate it with a client later from workflows that manage contacts.
            </Text>
          </Paper>
        )}

        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            onClick={() => {
              onClose();
              setSubmitAttempted(false);
            }}
          >
            Cancel
          </Button>
          <Button loading={isSavingBid} disabled={isSavingBid} onClick={onSave}>
            {editingBidId ? 'Update Bid' : 'Save Bid'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


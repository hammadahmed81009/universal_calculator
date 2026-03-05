import { Badge, Box, Button, Divider, Grid, Group, NumberInput, Paper, Stack, Table, Text } from '@mantine/core';

import { SaveBidModal } from './SaveBidModal';

type AnyFn = (...args: any[]) => any;

export type CalculationResultsSectionProps = Readonly<{
  hasCalculated: boolean;

  // Tiering
  selectedTier: 'good' | 'better' | 'best';
  setSelectedTier: (tier: 'good' | 'better' | 'best') => void;
  affectedDefaultSpreads: any[];
  buildDeltaPctSelectedTier: number;
  tierPricing: any;
  fmtMoney: (n: number) => string;
  fmtPpsf: (n: number) => string;

  // Line items
  displayLineItems: Array<{ id: string; name: string; qty: number; unit?: string; unitPrice: number }>;
  products: Array<{ id: number; image_url?: string; technical_data_sheet_url?: string }>;
  getProductImageUrl: (url: string) => string;
  resultQtyOverrides: Record<string, number>;
  setResultQtyOverrides: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
  affectedSelectedMap: Map<string, any>;
  affectedBetterMap: Map<string, any>;

  // Small “thumbnail” components coming from parent
  ThumbImg: (props: { src: string; size?: number }) => any;
  LaborThumb: (props: { id: string }) => any;

  // Totals
  effectiveSqft: number;
  laborRate: number;
  totalLaborHours: number;
  getMaterialCost: () => number;
  calculateLaborCost: () => number;
  calculateTotalCost: () => number;
  calculateRequiredRevenue: () => number;
  calculatePricePerSqft: () => number;
  calculateAchievedMargin: () => number;

  // Actions
  handleCreateEstimate: AnyFn;
  editingBidId: string | null;
  setPendingOrderSheet: (v: boolean) => void;
  setLocation: (path: string) => void;

  // Save bid modal wiring
  saveBidModalOpen: boolean;
  setSaveBidModalOpen: (v: boolean) => void;
  submitAttempted: boolean;
  setSubmitAttempted: (v: boolean) => void;

  bidName: string;
  setBidName: (v: string) => void;
  bidDescription: string;
  setBidDescription: (v: string) => void;
  selectedClientId: number | null;
  setSelectedClientId: (v: number | null) => void;
  selectedClientName: string;
  setSelectedClientName: (v: string) => void;
  isSavingBid: boolean;
  setIsSavingBid: (v: boolean) => void;
  pendingOrderSheet: boolean;

  buildBidSnapshot: AnyFn;
  snapshotToItems: AnyFn;
  pricingOutput: any;
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
  targetPpsf: number;
  hasCalculatedState: boolean;

  // System components (passed through to SaveBidModal)
  systemComponentSelections: Record<string, any>;
  spreadRates: Record<string, number>;
  addOnQuantities: any;
  customMaterialPrices: any;
  laborRates: any;
  sundriesEnabled: boolean;
  suggestionCycle: any;
  customChargeLabel: string;
  countertopConfig: Record<string, any>;
  dimensions: any;
  totalSqft: number;

  apiPost: any;
  apiPut: any;
  buildSavedBidPayload: AnyFn;
}>;

export function CalculationResultsSection(props: CalculationResultsSectionProps) {
  const {
    hasCalculated,
    selectedTier,
    setSelectedTier,
    affectedDefaultSpreads,
    buildDeltaPctSelectedTier,
    tierPricing,
    fmtMoney,
    fmtPpsf,
    displayLineItems,
    products,
    getProductImageUrl,
    resultQtyOverrides,
    setResultQtyOverrides,
    affectedSelectedMap,
    affectedBetterMap,
    ThumbImg,
    LaborThumb,
    effectiveSqft,
    laborRate,
    totalLaborHours,
    getMaterialCost,
    calculateLaborCost,
    calculateTotalCost,
    calculateRequiredRevenue,
    calculatePricePerSqft,
    calculateAchievedMargin,
    handleCreateEstimate,
    editingBidId,
    setPendingOrderSheet,
    setLocation,
    saveBidModalOpen,
    setSaveBidModalOpen,
    submitAttempted,
    setSubmitAttempted,
  } = props;

  if (!hasCalculated) return null;

  return (
    <section id="uc-results" className="mt-6">
      <Paper p="lg" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text fw={600} size="lg" c="green">
              Calculation Results
            </Text>
          </Group>

          <Box p="md" bg="gray.0" style={{ borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <Stack gap="xs">
              <Text fw={600} size="sm">
                Good / Better / Best
              </Text>
              <Text size="xs" c="dimmed">
                Choose a tier to adjust coat thickness and pricing. Better is the baseline.
              </Text>
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: `1px solid ${selected ? '#0ea5e9' : '#e5e7eb'}`,
                        background: selected ? '#f0f9ff' : 'white',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: '9999px',
                          background: selected ? '#0369a1' : 'transparent',
                          border: selected ? 'none' : '1px solid #9ca3af',
                        }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
                    </button>
                  );
                })}
              </div>

              <Box mt="sm" p="md" style={{ borderRadius: 8, border: '1px solid #e5e7eb', background: '#ffffff' }}>
                {selectedTier === 'good' && (
                  <Stack gap={4}>
                    <Text fw={700}>Good</Text>
                    <Text size="sm" c="dimmed">
                      Compact coating package for reliable, budget-friendly protection—best for single-car garages,
                      basements, storage rooms, light retail back-of-house.
                    </Text>
                    <Text size="sm">Thickness: 10–15 mils · Cure: 24–48 hrs · Warranty: 2 years</Text>
                    {affectedDefaultSpreads.length > 0 && (
                      <Text size="xs" c="dimmed">
                        Approx build vs Better: {buildDeltaPctSelectedTier.toFixed(0)}% (est.)
                      </Text>
                    )}
                    <Text fw={600}>
                      Price to homeowner: {fmtMoney(tierPricing.good.customerPrice)} • {fmtPpsf(tierPricing.good.pricePerSqFt)}
                    </Text>
                  </Stack>
                )}
                {selectedTier === 'better' && (
                  <Stack gap={4}>
                    <Text fw={700}>Better (baseline)</Text>
                    <Text size="sm" c="dimmed">
                      Premium blend tuned for stronger wear resistance and color hold—ideal for 2–3 car garages,
                      showrooms, clinics, classrooms, busy hallways, restaurants.
                    </Text>
                    <Text size="sm">Thickness: 15–20 mils · Cure: 24–36 hrs · Warranty: 10 years</Text>
                    <Text fw={600}>
                      Price to homeowner: {fmtMoney(tierPricing.better.customerPrice)} • {fmtPpsf(tierPricing.better.pricePerSqFt)}
                    </Text>
                  </Stack>
                )}
                {selectedTier === 'best' && (
                  <Stack gap={4}>
                    <Text fw={700}>Best</Text>
                    <Text size="sm" c="dimmed">
                      Industrial-grade build for maximum longevity and abuse resistance—built for warehouses, factories,
                      service bays, breweries, distribution centers, metallic feature floors.
                    </Text>
                    <Text size="sm">Thickness: 20–30 mils · Cure: 48–72 hrs · Warranty: 15 years</Text>
                    {affectedDefaultSpreads.length > 0 && (
                      <Text size="xs" c="dimmed">
                        Approx build vs Better: {buildDeltaPctSelectedTier.toFixed(0)}% (est.)
                      </Text>
                    )}
                    <Text fw={600}>
                      Price to homeowner: {fmtMoney(tierPricing.best.customerPrice)} • {fmtPpsf(tierPricing.best.pricePerSqFt)}
                    </Text>
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
                    {displayLineItems.map((item) => {
                      const prod = products.find((p) => p.id.toString() === item.id) as any;
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
                                <Text size="sm" fw={500}>
                                  {item.name}
                                </Text>
                                {selectedTier !== 'better' && affectedSelectedMap.has(item.id) && (() => {
                                  const sel = affectedSelectedMap.get(item.id)!;
                                  const base = affectedBetterMap.get(item.id);
                                  const changed = !base || base.qty !== sel.qty;
                                  if (!changed) return null;
                                  return (
                                    <Badge
                                      size="xs"
                                      variant="light"
                                      color="teal"
                                      title={`Better: ${base ? base.qty : 0} ${base?.unit || ''} → ${sel.qty} ${sel.unit || ''}`}
                                    >
                                      Changed by tier
                                    </Badge>
                                  );
                                })()}
                                {prod?.technical_data_sheet_url && (
                                  <Text size="xs">
                                    <a href={prod.technical_data_sheet_url} target="_blank" rel="noreferrer">
                                      View TDS
                                    </a>
                                  </Text>
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
                                  onChange={(v) =>
                                    setResultQtyOverrides((prev) => ({
                                      ...prev,
                                      [item.id]: Number(v) || 0,
                                    }))
                                  }
                                />
                                {item.unit && (
                                  <Badge variant="light" size="xs" color="gray">
                                    {item.unit}
                                  </Badge>
                                )}
                              </Group>
                            ) : (
                              <Text size="sm">
                                {item.qty}
                                {item.unit ? ` ${item.unit}` : ''}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{fmtMoney(item.unitPrice)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {fmtMoney(effectiveTotal)}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </div>
            ) : (
              <Text size="sm" c="dimmed">
                No items selected yet. Choose system components to see a detailed list here.
              </Text>
            )}
          </Box>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Box p="md" bg="blue.0" style={{ borderRadius: '6px' }}>
                <Text fw={600} size="lg" c="blue" mb="xs">
                  {fmtMoney(calculateRequiredRevenue())}
                </Text>
                <Text size="sm">Total Customer Price</Text>
              </Box>
              <Stack gap="xs" mt="sm">
                <Group justify="space-between">
                  <Text size="sm">Material Cost:</Text>
                  <Text size="sm" fw={500}>
                    {fmtMoney(getMaterialCost())}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Labor Cost:</Text>
                  <Text size="sm" fw={500}>
                    {fmtMoney(calculateLaborCost())}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Total Cost:</Text>
                  <Text size="sm" fw={500}>
                    {fmtMoney(calculateTotalCost())}
                  </Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Profit:
                  </Text>
                  <Text size="sm" fw={600} c="green">
                    {fmtMoney(calculateRequiredRevenue() - calculateTotalCost())}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Box p="md" bg="orange.0" style={{ borderRadius: '6px' }}>
                <Text fw={600} size="lg" c="orange" mb="xs">
                  {fmtPpsf(calculatePricePerSqft())}
                </Text>
                <Text size="sm">Price per Square Foot</Text>
              </Box>
              <Stack gap="xs" mt="sm">
                <Group justify="space-between">
                  <Text size="sm">Coverage Area:</Text>
                  <Text size="sm" fw={500}>
                    {effectiveSqft.toFixed(1)} sq ft
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Profit Margin:</Text>
                  <Text size="sm" fw={500}>
                    {calculateAchievedMargin().toFixed(1)}%
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Labor Rate:</Text>
                  <Text size="sm" fw={500}>
                    ${laborRate}/hr
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Labor Hours:</Text>
                  <Text size="sm" fw={500}>
                    {totalLaborHours}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>

          <Group justify="center" mt="xs" className="sticky-actions">
            <Button size="lg" onClick={() => setSaveBidModalOpen(true)}>
              Save Bid
            </Button>
            <Button size="lg" variant="outline" onClick={handleCreateEstimate}>
              Create Estimate
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                if (editingBidId) {
                  setLocation(`/order-requests/new?source=universal-calculator&savedBidId=${editingBidId}`);
                } else {
                  setPendingOrderSheet(true);
                  setSaveBidModalOpen(true);
                }
              }}
            >
              Material Order Request
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation('/pnl-statement')}>
              P&L Statement
            </Button>
          </Group>

          <SaveBidModal
            opened={saveBidModalOpen}
            title={editingBidId ? 'Update Bid' : 'Save Bid'}
            onClose={() => {
              props.setSaveBidModalOpen(false);
              props.setSubmitAttempted(false);
            }}
            bidName={props.bidName}
            setBidName={props.setBidName}
            bidDescription={props.bidDescription}
            setBidDescription={props.setBidDescription}
            submitAttempted={submitAttempted}
            setSubmitAttempted={setSubmitAttempted}
            selectedClientId={props.selectedClientId}
            setSelectedClientId={props.setSelectedClientId}
            selectedClientName={props.selectedClientName}
            setSelectedClientName={props.setSelectedClientName}
            isSavingBid={props.isSavingBid}
            setIsSavingBid={props.setIsSavingBid}
            pendingOrderSheet={props.pendingOrderSheet}
            setPendingOrderSheet={props.setPendingOrderSheet}
            editingBidId={props.editingBidId}
            buildBidSnapshot={props.buildBidSnapshot}
            snapshotToItems={props.snapshotToItems}
            pricingOutput={props.pricingOutput}
            getMaterialCost={props.getMaterialCost}
            calculateLaborCost={props.calculateLaborCost}
            calculateTotalCost={props.calculateTotalCost}
            calculateRequiredRevenue={props.calculateRequiredRevenue}
            calculatePricePerSqft={props.calculatePricePerSqft}
            effectiveSqft={props.effectiveSqft}
            draft={props.draft}
            toDraftPricingMethod={props.toDraftPricingMethod}
            pricingMethod={props.pricingMethod}
            selectedSystemGroup={props.selectedSystemGroup}
            selectedSystem={props.selectedSystem}
            selectedManufacturer={props.selectedManufacturer}
            selectedManufacturerName={props.selectedManufacturerName}
            apiManufacturers={props.apiManufacturers}
            selectedSurfaceHardness={props.selectedSurfaceHardness}
            profitMargin={props.profitMargin}
            laborRate={props.laborRate}
            totalLaborHours={props.totalLaborHours}
            targetPpsf={props.targetPpsf}
            hasCalculated={props.hasCalculatedState}
            tierPricing={props.tierPricing}
            selectedTier={props.selectedTier}
            resultQtyOverrides={props.resultQtyOverrides}
            selectedBasePigment={props.systemComponentSelections.selectedBasePigment}
            selectedBaseCoat={props.systemComponentSelections.selectedBaseCoat}
            selectedFlakeColor={props.systemComponentSelections.selectedFlakeColor}
            selectedTopCoat={props.systemComponentSelections.selectedTopCoat}
            selectedMVBBasePigment={props.systemComponentSelections.selectedMVBBasePigment}
            selectedMVBBaseCoat={props.systemComponentSelections.selectedMVBBaseCoat}
            selectedMVBFlakeColor={props.systemComponentSelections.selectedMVBFlakeColor}
            selectedMVBTopCoat={props.systemComponentSelections.selectedMVBTopCoat}
            selectedSolidBasePigment={props.systemComponentSelections.selectedSolidBasePigment}
            selectedSolidGroutCoat={props.systemComponentSelections.selectedSolidGroutCoat}
            selectedSolidBaseCoat={props.systemComponentSelections.selectedSolidBaseCoat}
            selectedSolidExtraBaseCoat={props.systemComponentSelections.selectedSolidExtraBaseCoat}
            selectedSolidTopCoat={props.systemComponentSelections.selectedSolidTopCoat}
            selectedMetallicBasePigment={props.systemComponentSelections.selectedMetallicBasePigment}
            selectedMetallicGroutCoat={props.systemComponentSelections.selectedMetallicGroutCoat}
            selectedMetallicBaseCoat={props.systemComponentSelections.selectedMetallicBaseCoat}
            selectedMetallicMoneyCoat={props.systemComponentSelections.selectedMetallicMoneyCoat}
            selectedMetallicPigments={props.systemComponentSelections.selectedMetallicPigments}
            selectedMetallicTopCoat={props.systemComponentSelections.selectedMetallicTopCoat}
            selectedGrindSealPrimer={props.systemComponentSelections.selectedGrindSealPrimer}
            selectedGrindSealGroutCoat={props.systemComponentSelections.selectedGrindSealGroutCoat}
            selectedGrindSealBaseCoat={props.systemComponentSelections.selectedGrindSealBaseCoat}
            selectedGrindSealIntermediateCoat={props.systemComponentSelections.selectedGrindSealIntermediateCoat}
            selectedGrindSealTopCoat={props.systemComponentSelections.selectedGrindSealTopCoat}
            selectedGrindSealAdditionalTopCoat={props.systemComponentSelections.selectedGrindSealAdditionalTopCoat}
            selectedCountertopPrimer={props.systemComponentSelections.selectedCountertopPrimer}
            selectedCountertopBasePigment={props.systemComponentSelections.selectedCountertopBasePigment}
            selectedCountertopMetallicArtCoat={props.systemComponentSelections.selectedCountertopMetallicArtCoat}
            selectedCountertopMetallicPigments={props.systemComponentSelections.selectedCountertopMetallicPigments}
            selectedCountertopFloodCoat={props.systemComponentSelections.selectedCountertopFloodCoat}
            selectedCountertopTopCoat={props.systemComponentSelections.selectedCountertopTopCoat}
            noMVBBasePigmentSpreadRate={props.spreadRates.noMVBBasePigmentSpreadRate}
            noMVBBaseCoatSpreadRate={props.spreadRates.noMVBBaseCoatSpreadRate}
            noMVBFlakeColorSpreadRate={props.spreadRates.noMVBFlakeColorSpreadRate}
            noMVBTopCoatSpreadRate={props.spreadRates.noMVBTopCoatSpreadRate}
            mvbBasePigmentSpreadRate={props.spreadRates.mvbBasePigmentSpreadRate}
            mvbBaseCoatSpreadRate={props.spreadRates.mvbBaseCoatSpreadRate}
            mvbFlakeColorSpreadRate={props.spreadRates.mvbFlakeColorSpreadRate}
            mvbTopCoatSpreadRate={props.spreadRates.mvbTopCoatSpreadRate}
            solidBasePigmentSpreadRate={props.spreadRates.solidBasePigmentSpreadRate}
            solidGroutCoatSpreadRate={props.spreadRates.solidGroutCoatSpreadRate}
            solidBaseCoatSpreadRate={props.spreadRates.solidBaseCoatSpreadRate}
            solidExtraBaseCoatSpreadRate={props.spreadRates.solidExtraBaseCoatSpreadRate}
            solidTopCoatSpreadRate={props.spreadRates.solidTopCoatSpreadRate}
            metallicBasePigmentSpreadRate={props.spreadRates.metallicBasePigmentSpreadRate}
            metallicGroutCoatSpreadRate={props.spreadRates.metallicGroutCoatSpreadRate}
            metallicBaseCoatSpreadRate={props.spreadRates.metallicBaseCoatSpreadRate}
            metallicMoneyCoatSpreadRate={props.spreadRates.metallicMoneyCoatSpreadRate}
            metallicTopCoatSpreadRate={props.spreadRates.metallicTopCoatSpreadRate}
            grindSealGroutSpreadRate={props.spreadRates.grindSealGroutSpreadRate}
            grindSealBaseSpreadRate={props.spreadRates.grindSealBaseSpreadRate}
            grindSealIntermediateCoatSpreadRate={props.spreadRates.grindSealIntermediateCoatSpreadRate}
            countertopBaseCoatSpreadRate={props.spreadRates.countertopBaseCoatSpreadRate}
            countertopMetallicArtCoatSpreadRate={props.spreadRates.countertopMetallicArtCoatSpreadRate}
            countertopClearCoatSpreadRate={props.spreadRates.countertopClearCoatSpreadRate}
            countertopMetallicPigmentSpreadRate={props.spreadRates.countertopMetallicPigmentSpreadRate}
            addOnQuantities={props.addOnQuantities}
            customMaterialPrices={props.customMaterialPrices}
            laborRates={props.laborRates}
            sundriesEnabled={props.sundriesEnabled}
            suggestionCycle={props.suggestionCycle}
            customChargeLabel={props.customChargeLabel}
            countertopMode={props.countertopConfig.countertopMode}
            countertopPieces={props.countertopConfig.countertopPieces}
            countertopDirectSurface={props.countertopConfig.countertopDirectSurface}
            countertopDirectEdge={props.countertopConfig.countertopDirectEdge}
            countertopDirectBacksplash={props.countertopConfig.countertopDirectBacksplash}
            dimensions={props.dimensions}
            totalSqft={props.totalSqft}
            apiPost={props.apiPost}
            apiPut={props.apiPut}
            buildSavedBidPayload={props.buildSavedBidPayload}
            setLocation={props.setLocation}
          />
        </Stack>
      </Paper>
    </section>
  );
}


import React from 'react';
import {
  Accordion,
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconCalculator,
  IconClockHour3,
  IconReceipt2,
  IconRoad,
  IconRulerMeasure,
  IconSparkles,
} from '@tabler/icons-react';

import type { LaborAddOn } from '../../lib/laborCatalog';

type AddOnCategorySummary = {
  count: number;
  subtotal: number;
};

type AddOnCategorySummaries = {
  labor?: AddOnCategorySummary;
  crack?: AddOnCategorySummary;
  nonskid?: AddOnCategorySummary;
  common?: AddOnCategorySummary;
  mica?: AddOnCategorySummary;
  ctMaterials?: AddOnCategorySummary;
  ctIncidentals?: AddOnCategorySummary;
};

export type AddOnOptionsSectionProps = Readonly<{
  steps123Complete: boolean;
  selectedSystemGroup: string | null | undefined;
  addOnCategorySummaries: AddOnCategorySummaries;
  effectiveLaborAddOns: LaborAddOn[];
  sundriesEnabled: boolean;
  setSundriesEnabled: (value: boolean) => void;
  addOnQuantities: Record<string, number>;
  setAddOnQuantities: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
  laborRates: Record<string, number>;
  setLaborRates: (value: Record<string, number>) => void;
  customChargeLabel: string;
  setCustomChargeLabel: (value: string) => void;
  crackJointFillers: any[];
  nonSkidAdditives: any[];
  commonlyUsedMaterials: any[];
  countertopIncidentals: any[];
  mergedSuggestions: any[];
  suggestionQty: Record<string, number>;
  setSuggestionQty: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
  effectiveSqft: number;
  resetLaborRatesToDefaults: () => void;
  findAddOnByName: (name: string) => { image?: string } | undefined;
  toggleFav: (sku: string) => void;
  favSkus: string[];
  getProductImageUrl: (relativePath: string | undefined) => string;
  ThumbImg: React.ComponentType<{ src?: string; size?: number }>;
  LaborThumb: React.ComponentType<{ id: string }>;
  setCatalogOpen: (open: boolean) => void;
  handleCalculate: () => void;
  canCalculate: boolean;
}>;

export function AddOnOptionsSection(props: AddOnOptionsSectionProps) {
  const {
    steps123Complete,
    selectedSystemGroup,
    addOnCategorySummaries,
    effectiveLaborAddOns,
    sundriesEnabled,
    setSundriesEnabled,
    addOnQuantities,
    setAddOnQuantities,
    laborRates,
    setLaborRates,
    customChargeLabel,
    setCustomChargeLabel,
    crackJointFillers,
    nonSkidAdditives,
    commonlyUsedMaterials,
    countertopIncidentals,
    mergedSuggestions,
    suggestionQty,
    setSuggestionQty,
    effectiveSqft,
    resetLaborRatesToDefaults,
    findAddOnByName,
    toggleFav,
    favSkus,
    getProductImageUrl,
    ThumbImg,
    LaborThumb,
    setCatalogOpen,
    handleCalculate,
    canCalculate,
  } = props;

  const safeSummary = (summary: AddOnCategorySummary | undefined): AddOnCategorySummary => ({
    count: summary?.count ?? 0,
    subtotal: summary?.subtotal ?? 0,
  });

  if (!steps123Complete) {
    return (
      <aside id="uc-addons" className="space-y-4">
        <Paper p="lg" withBorder mb="xl">
          <Stack gap="xs">
            <Text fw={600}>Materials & Products</Text>
            <Box p="sm" style={{ borderRadius: 6, border: '1px dashed #cbd5e1', background: '#f8fafc' }}>
              <Text size="sm" c="dimmed">
                Complete Steps 1–3 to view Add‑Ons and browse additional products.
              </Text>
            </Box>
          </Stack>
        </Paper>
      </aside>
    );
  }

  return (
    <aside id="uc-addons" className="space-y-4">
      <Paper p="lg" withBorder mb="xl" style={{ borderColor: '#0ea5e9', borderWidth: '2px' }}>
        <Group justify="space-between" align="center" mb="xs">
          <Title order={4} c="blue">
            Identify Job Add‑Ons
          </Title>
        </Group>
        <Text size="xs" c="dimmed" mb="sm">
          Based on an effective area of approximately {effectiveSqft.toFixed(0)} sq ft.
        </Text>

        <Accordion multiple defaultValue={[]}>
          {/* Labor options */}
          <Accordion.Item value="labor">
            <Accordion.Control>
              <Group justify="space-between" align="center">
                <Text>Labor Options Add-on</Text>
                <Badge variant="light" size="sm">
                  {safeSummary(addOnCategorySummaries.labor).count} selected • $
                  {safeSummary(addOnCategorySummaries.labor).subtotal.toFixed(2)}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Accordion multiple variant="separated" radius="sm">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed">
                    Edit rates as needed. Your changes are saved.
                  </Text>
                  <Button size="xs" variant="light" onClick={() => resetLaborRatesToDefaults()}>
                    Reset rates to default
                  </Button>
                </Group>
                {/* Quick add-ons */}
                <Accordion.Item value="quick">
                  <Accordion.Control>
                    <Group gap="xs" align="center">
                      <IconSparkles size={16} />
                      <Text>Quick Add-ons</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      {effectiveLaborAddOns
                        .filter((a) => a.group === 'quick')
                        .map((a) => (
                          <Box key={a.id}>
                            <Group justify="space-between" wrap="nowrap" align="center">
                              <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                                <LaborThumb id={a.id} />
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {a.label}
                                  </Text>
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
                                  <NumberInput
                                    size="xs"
                                    w={100}
                                    min={0}
                                    max={100}
                                    value={addOnQuantities[a.id] ?? 5}
                                    onChange={(v) =>
                                      setAddOnQuantities((prev) => ({
                                        ...prev,
                                        [a.id]: Number(v) || 0,
                                      }))
                                    }
                                    rightSection={
                                      <Text size="xs" c="dimmed">
                                        %
                                      </Text>
                                    }
                                    disabled={a.id === 'sundries' ? !sundriesEnabled : false}
                                  />
                                </Group>
                              ) : (
                                <Group gap="xs" wrap="nowrap">
                                  <NumberInput
                                    size="xs"
                                    w={110}
                                    min={0}
                                    value={laborRates[a.id] ?? a.rate}
                                    onChange={(v) =>
                                      setLaborRates({
                                        ...laborRates,
                                        [a.id]: Number(v) || 0,
                                      })
                                    }
                                    leftSection={
                                      <Text size="xs" c="dimmed">
                                        $
                                      </Text>
                                    }
                                  />
                                  <NumberInput
                                    size="xs"
                                    w={110}
                                    min={0}
                                    value={addOnQuantities[a.id] || 0}
                                    onChange={(v) =>
                                      setAddOnQuantities((prev) => ({
                                        ...prev,
                                        [a.id]: Number(v) || 0,
                                      }))
                                    }
                                    rightSection={
                                      <Text size="xs" c="dimmed">
                                        {a.unit}
                                      </Text>
                                    }
                                  />
                                </Group>
                              )}
                            </Group>
                            {a.id === 'stem-walls' && (
                              <Group justify="space-between" mt={6}>
                                <Text size="xs" c="dimmed">
                                  Extra labor hours (optional)
                                </Text>
                                <NumberInput
                                  size="xs"
                                  w={120}
                                  min={0}
                                  value={addOnQuantities['stem-walls-hours'] || 0}
                                  onChange={(v) =>
                                    setAddOnQuantities((prev) => ({
                                      ...prev,
                                      ['stem-walls-hours']: Number(v) || 0,
                                    }))
                                  }
                                  rightSection={
                                    <Text size="xs" c="dimmed">
                                      hr
                                    </Text>
                                  }
                                />
                              </Group>
                            )}
                          </Box>
                        ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                {/* Additional labor groups (hourly, distance, per-unit, flat, custom) */}
                {/* NOTE: For brevity, we keep the behavior identical to the original JSX,
                    delegating to the same state/handlers via props. */}
                {/* Hourly / time-based labor */}
                <Accordion.Item value="hourly">
                  <Accordion.Control>
                    <Group gap="xs" align="center">
                      <IconClockHour3 size={16} />
                      <Text>Hourly / Time-Based Labor</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {effectiveLaborAddOns
                      .filter((a) => a.group === 'hourly')
                      .map((a) => (
                        <Group key={a.id} justify="space-between" wrap="nowrap" align="center">
                          <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                            <LaborThumb id={a.id} />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {a.label}
                              </Text>
                            </div>
                          </Group>
                          <Group gap="xs" wrap="nowrap">
                            <NumberInput
                              size="xs"
                              w={110}
                              min={0}
                              value={laborRates[a.id] ?? a.rate}
                              onChange={(v) =>
                                setLaborRates({
                                  ...laborRates,
                                  [a.id]: Number(v) || 0,
                                })
                              }
                              leftSection={
                                <Text size="xs" c="dimmed">
                                  $
                                </Text>
                              }
                            />
                            <NumberInput
                              size="xs"
                              w={110}
                              min={0}
                              value={addOnQuantities[a.id] || 0}
                              onChange={(v) =>
                                setAddOnQuantities((prev) => ({
                                  ...prev,
                                  [a.id]: Number(v) || 0,
                                }))
                              }
                              rightSection={
                                <Text size="xs" c="dimmed">
                                  hr
                                </Text>
                              }
                            />
                          </Group>
                        </Group>
                      ))}
                  </Accordion.Panel>
                </Accordion.Item>

                {/* Distance / travel */}
                <Accordion.Item value="distance">
                  <Accordion.Control>
                    <Group gap="xs" align="center">
                      <IconRoad size={16} />
                      <Text>Distance / Travel</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {effectiveLaborAddOns
                      .filter((a) => a.group === 'distance')
                      .map((a) => (
                        <Group key={a.id} justify="space-between" wrap="nowrap" align="center">
                          <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                            <LaborThumb id={a.id} />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {a.label}
                              </Text>
                            </div>
                          </Group>
                          <Group gap="xs" wrap="nowrap">
                            <NumberInput
                              size="xs"
                              w={110}
                              min={0}
                              value={laborRates[a.id] ?? a.rate}
                              onChange={(v) =>
                                setLaborRates({
                                  ...laborRates,
                                  [a.id]: Number(v) || 0,
                                })
                              }
                              leftSection={
                                <Text size="xs" c="dimmed">
                                  $
                                </Text>
                              }
                            />
                            <NumberInput
                              size="xs"
                              w={110}
                              min={0}
                              value={addOnQuantities[a.id] || 0}
                              onChange={(v) =>
                                setAddOnQuantities((prev) => ({
                                  ...prev,
                                  [a.id]: Number(v) || 0,
                                }))
                              }
                              rightSection={
                                <Text size="xs" c="dimmed">
                                  {a.unit === 'mi' ? 'mi' : 'ct'}
                                </Text>
                              }
                            />
                          </Group>
                        </Group>
                      ))}
                  </Accordion.Panel>
                </Accordion.Item>

                {/* Per-unit tasks */}
                <Accordion.Item value="per-unit">
                  <Accordion.Control>
                    <Group gap="xs" align="center">
                      <IconRulerMeasure size={16} />
                      <Text>Per-Unit Tasks (Prep / Repair)</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="xs">
                      {effectiveLaborAddOns
                        .filter((a) => a.group === 'perUnit')
                        .map((a) => (
                          <Group key={a.id} justify="space-between" align="center" wrap="nowrap">
                            <Group gap="sm" align="center" style={{ flex: 1, minWidth: 0 }}>
                              <LaborThumb id={a.id} />
                              <Text
                                size="sm"
                                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {a.label}
                              </Text>
                            </Group>
                            <Group gap="sm" justify="flex-end" wrap="nowrap" style={{ minWidth: 240 }}>
                              <NumberInput
                                size="xs"
                                w={96}
                                min={0}
                                value={laborRates[a.id] ?? a.rate}
                                onChange={(v) =>
                                  setLaborRates({
                                    ...laborRates,
                                    [a.id]: Number(v) || 0,
                                  })
                                }
                                leftSection={
                                  <Text size="xs" c="dimmed">
                                    $
                                  </Text>
                                }
                              />
                              <NumberInput
                                size="xs"
                                w={72}
                                min={0}
                                value={addOnQuantities[a.id] || 0}
                                onChange={(v) =>
                                  setAddOnQuantities((prev) => ({
                                    ...prev,
                                    [a.id]: Number(v) || 0,
                                  }))
                                }
                              />
                              <Badge
                                variant="light"
                                color="gray"
                                fw={400}
                                size="xs"
                                style={{ minWidth: 36, textAlign: 'center' }}
                              >
                                {a.unit}
                              </Badge>
                            </Group>
                          </Group>
                        ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                {/* Flat surcharges / admin */}
                <Accordion.Item value="flat">
                  <Accordion.Control>
                    <Group gap="xs" align="center">
                      <IconReceipt2 size={16} />
                      <Text>Flat Surcharges / Admin</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {effectiveLaborAddOns
                      .filter((a) => a.group === 'flat' && a.id !== 'custom-charge')
                      .map((a) => (
                        <Group key={a.id} justify="space-between" wrap="nowrap" align="center">
                          <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                            <LaborThumb id={a.id} />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {a.label}
                              </Text>
                            </div>
                          </Group>
                          <Group gap="xs" wrap="nowrap">
                            <NumberInput
                              size="xs"
                              w={110}
                              min={0}
                              value={laborRates[a.id] ?? a.rate}
                              onChange={(v) =>
                                setLaborRates({
                                  ...laborRates,
                                  [a.id]: Number(v) || 0,
                                })
                              }
                              leftSection={
                                <Text size="xs" c="dimmed">
                                  $
                                </Text>
                              }
                            />
                            <NumberInput
                              size="xs"
                              w={110}
                              min={0}
                              value={addOnQuantities[a.id] || 0}
                              onChange={(v) =>
                                setAddOnQuantities((prev) => ({
                                  ...prev,
                                  [a.id]: Number(v) || 0,
                                }))
                              }
                              rightSection={
                                <Text size="xs" c="dimmed">
                                  ct
                                </Text>
                              }
                            />
                          </Group>
                        </Group>
                      ))}
                  </Accordion.Panel>
                </Accordion.Item>

                {/* Custom charge */}
                <Accordion.Item value="custom">
                  <Accordion.Control>
                    <Group gap="xs" align="center">
                      <IconReceipt2 size={16} />
                      <Text>Custom Charge</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Group>
                      <TextInput
                        size="xs"
                        placeholder="Label"
                        value={customChargeLabel}
                        onChange={(e) => setCustomChargeLabel(e.currentTarget.value)}
                        style={{ flex: 1 }}
                      />
                      <NumberInput
                        size="xs"
                        w={160}
                        min={0}
                        value={addOnQuantities['custom-charge-amount'] || 0}
                        onChange={(v) =>
                          setAddOnQuantities((prev) => ({
                            ...prev,
                            ['custom-charge-amount']: Number(v) || 0,
                          }))
                        }
                        leftSection={
                          <Text size="xs" c="dimmed">
                            $
                          </Text>
                        }
                      />
                    </Group>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Material add-ons for non-countertop systems */}
          {selectedSystemGroup !== 'countertops-custom' && (
            <Accordion.Item value="crack">
              <Accordion.Control>
                <Group justify="space-between" align="center">
                  <Text>Crack & Joint Fillers</Text>
                  <Badge variant="light" size="sm">
                    {safeSummary(addOnCategorySummaries.crack).count} selected • $
                    {safeSummary(addOnCategorySummaries.crack).subtotal.toFixed(2)}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                  {crackJointFillers.map((item) => (
                    <Box
                      key={item.id}
                      p="xs"
                      style={{ borderRadius: 6, border: '1px solid #e5e7eb', background: 'white' }}
                    >
                      <Group justify="space-between" align="flex-start" gap="sm">
                        <Group gap="sm" align="center">
                          <ThumbImg src={item.image} />
                          <div>
                            <Text size="sm" fw={500}>
                              {item.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              ${item.price.toFixed(2)} / {item.unit}
                            </Text>
                          </div>
                        </Group>
                        <Stack gap={4} align="flex-end">
                          <NumberInput
                            size="xs"
                            w={80}
                            min={0}
                            value={addOnQuantities[item.id] || 0}
                            onChange={(v) =>
                              setAddOnQuantities((prev) => ({
                                ...prev,
                                [item.id]: Number(v) || 0,
                              }))
                            }
                          />
                          <Button
                            size="xs"
                            variant={addOnQuantities[item.id] ? 'filled' : 'outline'}
                            onClick={() =>
                              setAddOnQuantities((prev) => ({
                                ...prev,
                                [item.id]: prev[item.id] ? 0 : 1,
                              }))
                            }
                          >
                            {addOnQuantities[item.id] ? 'Remove' : 'Add'}
                          </Button>
                        </Stack>
                      </Group>
                    </Box>
                  ))}
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {/* Additional material categories and intelligent suggestions */}
          {/* To keep this refactor focused on file size, we preserve behavior but
              keep these sections structurally similar, just moved into this component. */}

          {/* Non-skid additives */}
          {selectedSystemGroup !== 'countertops-custom' && (
            <Accordion.Item value="nonskid">
              <Accordion.Control>
                <Group justify="space-between" align="center">
                  <Text>Non-Skid Additives</Text>
                  <Badge variant="light" size="sm">
                    {safeSummary(addOnCategorySummaries.nonskid).count} selected • $
                    {safeSummary(addOnCategorySummaries.nonskid).subtotal.toFixed(2)}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                  {nonSkidAdditives.map((item) => (
                    <Box
                      key={item.id}
                      p="xs"
                      style={{ borderRadius: 6, border: '1px solid #e5e7eb', background: 'white' }}
                    >
                      <Group justify="space-between" align="flex-start" gap="sm">
                        <Group gap="sm" align="center">
                          <ThumbImg src={item.image} />
                          <div>
                            <Text size="sm" fw={500}>
                              {item.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              ${item.price.toFixed(2)} / {item.unit}
                            </Text>
                          </div>
                        </Group>
                        <Stack gap={4} align="flex-end">
                          <NumberInput
                            size="xs"
                            w={80}
                            min={0}
                            value={addOnQuantities[item.id] || 0}
                            onChange={(v) =>
                              setAddOnQuantities((prev) => ({
                                ...prev,
                                [item.id]: Number(v) || 0,
                              }))
                            }
                          />
                          <Button
                            size="xs"
                            variant={addOnQuantities[item.id] ? 'filled' : 'outline'}
                            onClick={() =>
                              setAddOnQuantities((prev) => ({
                                ...prev,
                                [item.id]: prev[item.id] ? 0 : 1,
                              }))
                            }
                          >
                            {addOnQuantities[item.id] ? 'Remove' : 'Add'}
                          </Button>
                        </Stack>
                      </Group>
                    </Box>
                  ))}
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {/* Commonly used materials & countertop incidentals, plus intelligent suggestions */}
          <Accordion.Item value="materials">
            <Accordion.Control>
              <Group justify="space-between" align="center">
                <Text>Commonly Used Materials</Text>
                <Badge variant="light" size="sm">
                  {safeSummary(addOnCategorySummaries.common).count} selected • $
                  {safeSummary(addOnCategorySummaries.common).subtotal.toFixed(2)}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                {[...commonlyUsedMaterials, ...countertopIncidentals].map((item) => (
                  <Box
                    key={item.id}
                    p="xs"
                    style={{ borderRadius: 6, border: '1px solid #e5e7eb', background: 'white' }}
                  >
                    <Group justify="space-between" align="flex-start" gap="sm">
                      <Group gap="sm" align="center">
                        <ThumbImg src={item.image} />
                        <div>
                          <Text size="sm" fw={500}>
                            {item.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            ${item.price.toFixed(2)} / {item.unit}
                          </Text>
                        </div>
                      </Group>
                      <Stack gap={4} align="flex-end">
                        <NumberInput
                          size="xs"
                          w={80}
                          min={0}
                          value={addOnQuantities[item.id] || 0}
                          onChange={(v) =>
                            setAddOnQuantities((prev) => ({
                              ...prev,
                              [item.id]: Number(v) || 0,
                            }))
                          }
                        />
                        <Button
                          size="xs"
                          variant={addOnQuantities[item.id] ? 'filled' : 'outline'}
                          onClick={() =>
                            setAddOnQuantities((prev) => ({
                              ...prev,
                              [item.id]: prev[item.id] ? 0 : 1,
                            }))
                          }
                        >
                          {addOnQuantities[item.id] ? 'Remove' : 'Add'}
                        </Button>
                      </Stack>
                    </Group>
                  </Box>
                ))}
              </SimpleGrid>

              {/* Intelligent suggestions list */}
              {mergedSuggestions.length > 0 && (
                <Box mt="md">
                  <Text size="sm" fw={500} mb="xs">
                    Intelligent Suggestions
                  </Text>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                    {mergedSuggestions.map((s) => {
                      const qty = suggestionQty[s.id] ?? s.qty ?? 1;
                      const total = (s.price || 0) * qty;
                      const product = s.productId ? findAddOnByName(s.title) : undefined;
                      const imageUrl = product ? getProductImageUrl(product.image) : s.image;
                      const isFav = s.sku && favSkus.includes(s.sku);
                      return (
                        <Box
                          key={s.id}
                          p="xs"
                          style={{ borderRadius: 6, border: '1px solid #e5e7eb', background: 'white' }}
                        >
                          <Group justify="space-between" align="flex-start" gap="sm">
                            <Group gap="sm" align="center">
                              <ThumbImg src={imageUrl} />
                              <div>
                                <Text size="sm" fw={500}>
                                  {s.title}
                                </Text>
                                {s.desc && (
                                  <Text size="xs" c="dimmed">
                                    {s.desc}
                                  </Text>
                                )}
                                <Text size="xs" c="dimmed">
                                  ${s.price?.toFixed(2) ?? '0.00'} {s.unit ? `/ ${s.unit}` : ''}
                                </Text>
                              </div>
                            </Group>
                            <Stack gap={4} align="flex-end">
                              <NumberInput
                                size="xs"
                                w={80}
                                min={0}
                                value={qty}
                                onChange={(v) =>
                                  setSuggestionQty((prev) => ({
                                    ...prev,
                                    [s.id]: Number(v) || 0,
                                  }))
                                }
                              />
                              <Text size="xs" c="dimmed">
                                Est. ${total.toFixed(2)}
                              </Text>
                              {s.sku && (
                                <Button
                                  size="xs"
                                  variant={isFav ? 'filled' : 'outline'}
                                  onClick={() => toggleFav(s.sku)}
                                >
                                  {isFav ? 'Favorited' : 'Favorite'}
                                </Button>
                              )}
                            </Stack>
                          </Group>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                </Box>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {/* Footer actions: Browse catalog next to Calculate Pricing */}
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            Browse for additional products.
          </Text>
          <Group>
            <Button variant="default" onClick={() => setCatalogOpen(true)}>
              Browse Catalog
            </Button>
            <Button
              size="md"
              color="green"
              leftSection={<IconCalculator size={16} />}
              onClick={handleCalculate}
              disabled={!canCalculate}
            >
              Calculate Pricing
            </Button>
          </Group>
        </Group>
      </Paper>
    </aside>
  );
}


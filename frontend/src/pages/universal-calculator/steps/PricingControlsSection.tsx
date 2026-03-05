import React from 'react';
import { Box, Button, Divider, Group, NumberInput, Paper, Radio, Stack, Text, Title } from '@mantine/core';
import { IconCalculator } from '@tabler/icons-react';

import type { PricingMethod } from '../../../utils/pricing';

type PricingControlsSectionProps = Readonly<{
  pricingUnlocked: boolean;
  hasArea: boolean;
  pricingMethod: PricingMethod;
  setPricingMethod: React.Dispatch<React.SetStateAction<PricingMethod>>;
  profitMargin: number;
  setProfitMargin: React.Dispatch<React.SetStateAction<number>>;
  laborRate: number;
  setLaborRate: React.Dispatch<React.SetStateAction<number>>;
  totalLaborHours: number;
  setTotalLaborHours: React.Dispatch<React.SetStateAction<number>>;
  targetPpsf: number;
  setTargetPpsf: React.Dispatch<React.SetStateAction<number>>;
  effectiveSqft: number;
  getMaterialCost: () => number;
  calculateLaborCost: () => number;
  calculateTotalCost: () => number;
  calculateRequiredRevenue: () => number;
  calculatePricePerSqft: () => number;
  calculateAchievedMargin: () => number;
  showCalculateInStep4: boolean;
  canCalculate: boolean;
  handleCalculate: () => void;
  selectedSystemGroup: string;
}>;

export function PricingControlsSection(props: PricingControlsSectionProps) {
  const {
    pricingUnlocked,
    hasArea,
    pricingMethod,
    setPricingMethod,
    profitMargin,
    setProfitMargin,
    laborRate,
    setLaborRate,
    totalLaborHours,
    setTotalLaborHours,
    targetPpsf,
    setTargetPpsf,
    effectiveSqft,
    getMaterialCost,
    calculateLaborCost,
    calculateTotalCost,
    calculateRequiredRevenue,
    calculatePricePerSqft,
    calculateAchievedMargin,
    showCalculateInStep4,
    canCalculate,
    handleCalculate,
    selectedSystemGroup,
  } = props;

  return (
    <Paper p="lg" withBorder style={{ height: '100%', borderColor: '#f97316', borderWidth: '2px' }}>
      <Stack gap="md" h="100%">
        <Title order={4} c="orange">
          Step 4: Pricing
        </Title>
        <Text c="dimmed" size="sm">
          Choose a pricing method and inputs
        </Text>
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
            <Text size="sm" fw={500} mb="xs">
              Pricing Method
            </Text>
            <Radio.Group
              value={pricingMethod}
              onChange={(v) => setPricingMethod(v as PricingMethod)}
              size="sm"
            >
              <Stack gap="xs">
                <Radio
                  value="MARGIN_BASED"
                  label="Margin-Based Pricing"
                  disabled={!pricingUnlocked}
                />
                <Radio
                  value="COST_PLUS_LABOR"
                  label="Material Cost + Labor"
                  disabled={!pricingUnlocked}
                />
                <Radio
                  value="TARGET_PPSF"
                  label="Target Price per Sq Ft"
                  disabled={!pricingUnlocked}
                />
              </Stack>
            </Radio.Group>
          </div>

          {pricingMethod === 'MARGIN_BASED' ? (
            <>
              <div>
                <Text size="sm" fw={500}>
                  Profit Margin %
                </Text>
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
                  <Text size="xs" c="red">
                    Margin at or above 99% disables cost-plus behavior; consider lowering.
                  </Text>
                )}
              </div>

              <div>
                <Text size="sm" fw={500}>
                  Labor Rate ($/hr)
                </Text>
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
                <Text size="sm" fw={500}>
                  Labor Hours
                </Text>
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
              <Text size="sm" c="dimmed">
                Customer price equals material + labor (no margin target). Adjust labor rate and hours
                below.
              </Text>
              <div>
                <Text size="sm" fw={500}>
                  Labor Rate ($/hr)
                </Text>
                <NumberInput
                  value={laborRate}
                  onChange={(v) => setLaborRate(Number(v) || 0)}
                  min={0}
                  step={0.01}
                  size="sm"
                  leftSection="$"
                  disabled={!pricingUnlocked}
                />
              </div>
              <div>
                <Text size="sm" fw={500}>
                  Labor Hours
                </Text>
                <NumberInput
                  value={totalLaborHours}
                  onChange={(v) => setTotalLaborHours(Number(v) || 0)}
                  min={0}
                  step={0.1}
                  size="sm"
                  disabled={!pricingUnlocked}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Text size="sm" fw={500}>
                  Target Price per Sq Ft
                </Text>
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
                <Text size="sm" fw={500}>
                  Labor Rate ($/hr)
                </Text>
                <NumberInput
                  value={laborRate}
                  onChange={(v) => setLaborRate(Number(v) || 0)}
                  min={0}
                  step={0.01}
                  size="sm"
                  leftSection="$"
                  disabled={!pricingUnlocked}
                />
              </div>
              <div>
                <Text size="sm" fw={500}>
                  Labor Hours
                </Text>
                <NumberInput
                  value={totalLaborHours}
                  onChange={(v) => setTotalLaborHours(Number(v) || 0)}
                  min={0}
                  step={0.1}
                  size="sm"
                  disabled={!pricingUnlocked}
                />
              </div>
            </>
          )}

          {effectiveSqft > 0 && (
            <Box p="sm" bg="orange.0" style={{ borderRadius: '6px' }}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="xs">Material Cost:</Text>
                  <Text size="xs" fw={500}>
                    ${getMaterialCost().toFixed(2)}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs">Labor Cost:</Text>
                  <Text size="xs" fw={500}>
                    ${calculateLaborCost().toFixed(2)}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs">Total Cost:</Text>
                  <Text size="xs" fw={500}>
                    ${calculateTotalCost().toFixed(2)}
                  </Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Customer Price:
                  </Text>
                  <Text size="sm" fw={700} c="orange">
                    ${calculateRequiredRevenue().toFixed(2)}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs">Price per Sq Ft:</Text>
                  <Text size="xs" fw={500} c="blue">
                    {calculatePricePerSqft().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </Group>
                <Text size="xs" c="green" fw={500} style={{ textAlign: 'center' }}>
                  ✓ Achieves {calculateAchievedMargin().toFixed(1)}% margin
                </Text>
              </Stack>
            </Box>
          )}

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

          <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
            {canCalculate
              ? `Ready to calculate • ${effectiveSqft.toFixed(1)} sq ft • ${
                  selectedSystemGroup || 'System'
                } project`
              : `Complete all steps to calculate pricing`}
          </Text>
        </Stack>
      </Stack>
    </Paper>
  );
}


import React from 'react';
import { Box, Group, Text } from '@mantine/core';

type SummaryBarProps = Readonly<{
  uiMode: 'results' | 'addons';
  effectiveSqft: number;
  getMaterialCost: () => number;
  calculateLaborCost: () => number;
  calculateTotalCost: () => number;
  calculatePricePerSqft: () => number;
  calculateAchievedMargin: () => number;
}>;

export function SummaryBar(props: SummaryBarProps) {
  const {
    uiMode,
    effectiveSqft,
    getMaterialCost,
    calculateLaborCost,
    calculateTotalCost,
    calculatePricePerSqft,
    calculateAchievedMargin,
  } = props;

  return (
    <Box
      className="sticky-modebar"
      p="sm"
      mb="sm"
      bg="white"
      style={{ position: 'sticky', top: 0, zIndex: 6, borderBottom: '1px solid #e5e7eb' }}
    >
      <Group justify="space-between" align="center">
        <Group>
          <Text size="sm" c="dimmed">
            Mode: {uiMode === 'addons' ? 'Add-On Options' : 'Calculation Results'}
          </Text>
        </Group>
        <Group />
      </Group>

      <Group
        gap="lg"
        mt="xs"
        wrap="wrap"
        className={uiMode === 'results' ? 'summary-condensed' : 'summary-expanded'}
      >
        <Group gap={6}>
          <Text size="sm" c="dimmed">
            Materials
          </Text>
          <Text fw={600}>${getMaterialCost().toFixed(2)}</Text>
        </Group>
        <Group gap={6}>
          <Text size="sm" c="dimmed">
            Labor
          </Text>
          <Text fw={600}>${calculateLaborCost().toFixed(2)}</Text>
        </Group>
        <Group gap={6}>
          <Text size="sm" c="dimmed">
            Total
          </Text>
          <Text fw={600}>${calculateTotalCost().toFixed(2)}</Text>
        </Group>
        <Group gap={6}>
          <Text size="sm" c="dimmed">
            $/sq ft
          </Text>
          <Text fw={600}>
            {effectiveSqft > 0 ? `$${calculatePricePerSqft().toFixed(2)}` : '—'}
          </Text>
        </Group>
        <Group gap={6}>
          <Text size="sm" c="dimmed">
            Margin
          </Text>
          <Text fw={600}>{calculateAchievedMargin().toFixed(1)}%</Text>
        </Group>
      </Group>
    </Box>
  );
}


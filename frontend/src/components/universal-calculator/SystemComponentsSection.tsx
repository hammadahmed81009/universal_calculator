import { Paper, Group, Text, Table, Stack, Badge } from '@mantine/core';
import React from 'react';
import type { LineItem } from '../../utils/pnl';

export type SystemComponentsSummary = {
  count: number;
  subtotal: number;
};

export type SystemComponentsSectionProps = Readonly<{
  systemMaterialItems: LineItem[];
  summary: SystemComponentsSummary;
  effectiveSqft: number;
}>;

export function SystemComponentsSection(props: SystemComponentsSectionProps) {
  const { systemMaterialItems, summary, effectiveSqft } = props;

  const hasItems = systemMaterialItems.length > 0;

  return (
    <Paper p="lg" withBorder radius="md" shadow="xs">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={600}>System Components</Text>
            <Text size="xs" c="dimmed">
              Core materials for the selected system{effectiveSqft > 0 ? ` • approx. ${effectiveSqft.toFixed(1)} sq ft` : ''}
            </Text>
          </div>
          <Stack gap={4} align="flex-end">
            <Badge size="sm" variant="light" color="blue">
              {summary.count} item{summary.count === 1 ? '' : 's'}
            </Badge>
            <Text size="sm" fw={500}>
              Materials subtotal:{' '}
              <Text span fw={600}>
                ${summary.subtotal.toFixed(2)}
              </Text>
            </Text>
          </Stack>
        </Group>

        {!hasItems && (
          <Text size="sm" c="dimmed">
            System components will appear here after you select a manufacturer, system, and area.
          </Text>
        )}

        {hasItems && (
          <Table striped withColumnBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Component</Table.Th>
                <Table.Th ta="right">Qty</Table.Th>
                <Table.Th ta="right">Unit price</Table.Th>
                <Table.Th ta="right">Total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {systemMaterialItems.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {item.name}
                    </Text>
                    {item.unit && (
                      <Text size="xs" c="dimmed">
                        Unit: {item.unit}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm">{item.qty}</Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm">${item.unitPrice.toFixed(2)}</Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm" fw={500}>
                      ${item.total.toFixed(2)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}


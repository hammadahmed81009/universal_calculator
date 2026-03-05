import { Box, Button, Grid, Group, Paper, Stack, Text, Title } from '@mantine/core';

type Product = { id: number; name: string };

export type PostCalculationDetailsProps = {
  hasCalculated: boolean;
  selectedSystemGroup: string;
  selectedSystem: string;
  products: Product[];

  // Metallic selections
  selectedMetallicBasePigment: string;
  selectedMetallicBaseCoat: string;
  selectedMetallicPigments: Array<{ name: string; quantity: number }>;
  selectedMetallicTopCoat: string;

  // Countertop selections
  selectedCountertopPrimer: string;
  selectedCountertopMetallicArtCoat: string;
  selectedCountertopMetallicPigments: Array<{ name: string; quantity: number }>;
  selectedCountertopTopCoat: string;

  // Summary
  effectiveSqft: number;
  availableManufacturers: Array<{ id: string; name: string }>;
  selectedManufacturer: string;

  // Optional mix assistants
  onApplyMetallicMix?: () => void;
  onApplyCountertopMix?: () => void;
};

export function PostCalculationDetails(props: PostCalculationDetailsProps) {
  const {
    hasCalculated,
    selectedSystemGroup,
    selectedSystem,
    products,
    selectedMetallicBasePigment,
    selectedMetallicBaseCoat,
    selectedMetallicPigments,
    selectedMetallicTopCoat,
    selectedCountertopPrimer,
    selectedCountertopMetallicArtCoat,
    selectedCountertopMetallicPigments,
    selectedCountertopTopCoat,
    effectiveSqft,
    availableManufacturers,
    selectedManufacturer,
    onApplyMetallicMix,
    onApplyCountertopMix,
  } = props;

  if (!hasCalculated) return null;

  return (
    <Stack gap="xl" mt="xl">
      <Paper p="lg" withBorder>
        <Title order={3} mb="md" c="blue">
          System Components
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          Selected products for each component in your {selectedSystemGroup} system
        </Text>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="sm">
              <Text fw={500} size="sm">
                Selected Components:
              </Text>

              {selectedSystemGroup === 'flooring' && selectedSystem === 'metallic-system' && (
                <Stack gap="xs">
                  {selectedMetallicBasePigment && (
                    <Group justify="space-between">
                      <Text size="sm">Base Pigment:</Text>
                      <Text size="sm" fw={500}>
                        {products.find((p) => p.id.toString() === selectedMetallicBasePigment)?.name ||
                          'Selected'}
                      </Text>
                    </Group>
                  )}
                  {selectedMetallicBaseCoat && (
                    <Group justify="space-between">
                      <Text size="sm">Base Coat:</Text>
                      <Text size="sm" fw={500}>
                        {products.find((p) => p.id.toString() === selectedMetallicBaseCoat)?.name ||
                          'Selected'}
                      </Text>
                    </Group>
                  )}
                  {selectedMetallicPigments.length > 0 && (
                    <Stack gap="xs">
                      <div>
                        <Text size="sm" mb="xs">
                          Metallic Pigments:
                        </Text>
                        {selectedMetallicPigments.map((pigment, idx) => (
                          <Group justify="space-between" key={idx} pl="sm">
                            <Text size="xs">{pigment.name}</Text>
                            <Text size="xs" fw={500}>
                              Qty: {pigment.quantity}
                            </Text>
                          </Group>
                        ))}
                      </div>
                      {onApplyMetallicMix && (
                        <Group justify="flex-end">
                          <Button size="xs" variant="light" onClick={onApplyMetallicMix}>
                            Auto-allocate pigments
                          </Button>
                        </Group>
                      )}
                    </Stack>
                  )}
                  {selectedMetallicTopCoat && (
                    <Group justify="space-between">
                      <Text size="sm">Top Coat:</Text>
                      <Text size="sm" fw={500}>
                        {products.find((p) => p.id.toString() === selectedMetallicTopCoat)?.name ||
                          'Selected'}
                      </Text>
                    </Group>
                  )}
                </Stack>
              )}

              {selectedSystemGroup === 'countertops-custom' && (
                <Stack gap="xs">
                  {selectedCountertopPrimer && (
                    <Group justify="space-between">
                      <Text size="sm">Primer:</Text>
                      <Text size="sm" fw={500}>
                        {products.find((p) => p.id.toString() === selectedCountertopPrimer)?.name ||
                          'Selected'}
                      </Text>
                    </Group>
                  )}
                  {selectedCountertopMetallicArtCoat && (
                    <Group justify="space-between">
                      <Text size="sm">Metallic Art Coat:</Text>
                      <Text size="sm" fw={500}>
                        {products.find((p) => p.id.toString() === selectedCountertopMetallicArtCoat)
                          ?.name || 'Selected'}
                      </Text>
                    </Group>
                  )}
                  {selectedCountertopMetallicPigments.length > 0 && (
                    <Stack gap="xs">
                      <div>
                        <Text size="sm" mb="xs">
                          Metallic Pigments:
                        </Text>
                        {selectedCountertopMetallicPigments.map((pigment, idx) => (
                          <Group justify="space-between" key={idx} pl="sm">
                            <Text size="xs">{pigment.name}</Text>
                            <Text size="xs" fw={500}>
                              Qty: {pigment.quantity}
                            </Text>
                          </Group>
                        ))}
                      </div>
                      {onApplyCountertopMix && (
                        <Group justify="flex-end">
                          <Button size="xs" variant="light" onClick={onApplyCountertopMix}>
                            Auto-allocate pigments
                          </Button>
                        </Group>
                      )}
                    </Stack>
                  )}
                  {selectedCountertopTopCoat && (
                    <Group justify="space-between">
                      <Text size="sm">Top Coat:</Text>
                      <Text size="sm" fw={500}>
                        {products.find((p) => p.id.toString() === selectedCountertopTopCoat)?.name ||
                          'Selected'}
                      </Text>
                    </Group>
                  )}
                </Stack>
              )}
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="sm">
              <Text fw={500} size="sm">
                Material Requirements:
              </Text>
              <Box p="md" bg="gray.0" style={{ borderRadius: '6px' }}>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Coverage Area:</Text>
                    <Text size="sm" fw={500}>
                      {effectiveSqft.toFixed(1)} sq ft
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">System Type:</Text>
                    <Text size="sm" fw={500}>
                      {selectedSystem?.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Manufacturer:</Text>
                    <Text size="sm" fw={500}>
                      {availableManufacturers.find((m) => m.id === selectedManufacturer)?.name}
                    </Text>
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>
    </Stack>
  );
}


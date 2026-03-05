import { Box, Grid, Paper, Select, Stack, Text, Title } from '@mantine/core';

export type SystemStepColProps = Readonly<{
  selectedManufacturer: string;
  selectedSystemGroup: string;
  setSelectedSystemGroup: (value: string) => void;
  selectedSystem: string;
  setSelectedSystem: (value: string) => void;
  availableSystems: Array<{ value: string; label: string }>;
  availableManufacturers: Array<{ id: string; name: string; logo: string }>;
  products: Array<{ id: number; name: string }>;
  resetSystemComponentSelections: () => void;
}>;

export function SystemStepCol(props: SystemStepColProps) {
  const {
    selectedManufacturer,
    selectedSystemGroup,
    setSelectedSystemGroup,
    selectedSystem,
    setSelectedSystem,
    availableSystems,
    availableManufacturers,
    products,
    resetSystemComponentSelections,
  } = props;

  const selectedManufacturerName =
    availableManufacturers.find((m) => m.id === selectedManufacturer)?.name;

  const selectedSystemDisplayName = (() => {
    if (!selectedSystem) return '';
    const fromProducts = products.find((p) => p.id.toString() === selectedSystem)?.name;
    if (fromProducts) return fromProducts;
    const fromOptions = availableSystems.find((s) => s.value === selectedSystem)?.label;
    if (fromOptions) return fromOptions;
    return selectedSystem.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  })();

  const selectedSystemDescription =
    (selectedSystemGroup === 'resin-flooring' && 'Resin-based floor coating system') ||
    (selectedSystemGroup === 'polishing' && 'Concrete polishing system') ||
    (selectedSystemGroup === 'countertops-custom' && 'Custom countertop piece solution') ||
    '';

  return (
    <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
      <Paper p="lg" withBorder style={{ height: '100%', borderColor: '#16a34a', borderWidth: '2px' }}>
        <Stack gap="md" h="100%">
          <Title order={4} c="green">
            Step 2: Select System Type
          </Title>
          <Text c="dimmed" size="sm">
            Choose the group and specific system
          </Text>

          <Stack gap="sm">
            <div>
              <Text size="sm" fw={500} mb="xs">
                System Group
              </Text>
              <Select
                key={`system-group-${selectedManufacturer}-${selectedSystemGroup || 'none'}`}
                placeholder="Select system group..."
                value={selectedSystemGroup}
                onChange={(value) => {
                  if (value && value !== selectedSystemGroup) {
                    setSelectedSystemGroup(value);
                    setSelectedSystem('');
                    resetSystemComponentSelections();
                  }
                }}
                data={[
                  { value: 'resin-flooring', label: 'Resin Flooring' },
                  { value: 'polishing', label: 'Concrete Polishing' },
                  { value: 'countertops-custom', label: 'Countertops/Custom Pieces' },
                ]}
                disabled={!selectedManufacturer}
                size="sm"
                allowDeselect={false}
              />
            </div>

            <div>
              <Text size="sm" fw={500} mb="xs">
                Specific System
              </Text>
              <Select
                key={`system-select-${selectedSystemGroup}`}
                placeholder="Select system..."
                value={selectedSystem}
                onChange={(value) => {
                  if (value && value !== selectedSystem) {
                    setSelectedSystem(value);
                    resetSystemComponentSelections();
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
                  {selectedManufacturerName}{' '}
                  {selectedSystemDisplayName}
                </Text>
                {selectedSystemDescription && (
                  <Text size="xs" c="green.7">
                    {selectedSystemDescription}
                  </Text>
                )}
              </Box>
            )}
          </Box>
        </Stack>
      </Paper>
    </Grid.Col>
  );
}


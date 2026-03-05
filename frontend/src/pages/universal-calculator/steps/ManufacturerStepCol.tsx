import { Box, Grid, Group, Image, Select, Text } from '@mantine/core';

import { StepCard } from '../../../components/universal-calculator/StepCard';

export type ManufacturerStepColProps = Readonly<{
  selectedManufacturer: string;
  setSelectedManufacturer: (v: string) => void;
  availableManufacturers: Array<{ id: string; name: string; logo: string }>;
  apiManufacturers: Array<{ id: number; name: string; logo_url?: string }>;
  getImageUrl: (path: string) => string;
  resetSystemComponentSelections: () => void;
}>;

export function ManufacturerStepCol(props: ManufacturerStepColProps) {
  const {
    selectedManufacturer,
    setSelectedManufacturer,
    availableManufacturers,
    apiManufacturers,
    getImageUrl,
    resetSystemComponentSelections,
  } = props;

  return (
    <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
      <StepCard
        title="Step 1: Select Manufacturer"
        subtitle="Choose your preferred manufacturer"
        accentColor="#9333ea"
        titleColor="purple"
      >
        <Select
          placeholder="Select a manufacturer..."
          value={selectedManufacturer}
          onChange={(value) => {
            if (value && value !== selectedManufacturer) {
              setSelectedManufacturer(value);
              // Keep system selection; reset system-specific components only
              resetSystemComponentSelections();
            }
          }}
          data={availableManufacturers.map((mfg) => ({ value: mfg.id, label: mfg.name }))}
          size="md"
          searchable
          allowDeselect={false}
          comboboxProps={{
            withinPortal: true,
            transitionProps: { transition: 'fade', duration: 100 },
          }}
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
                    overflow: 'hidden',
                  }}
                >
                  {(() => {
                    const manufacturer = availableManufacturers.find((m) => m.id === selectedManufacturer);
                    const apiManufacturer = apiManufacturers.find(
                      (m) => m.id.toString() === selectedManufacturer
                    );
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
                          objectFit: 'contain',
                        }}
                      />
                    );
                  })()}
                </Box>
                <Text fw={500} size="sm">
                  {availableManufacturers.find((m) => m.id === selectedManufacturer)?.name || 'Unknown'}
                </Text>
              </Group>
            </Box>
          )}
        </Box>
      </StepCard>
    </Grid.Col>
  );
}


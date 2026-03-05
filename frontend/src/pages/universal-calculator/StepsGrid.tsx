import {
  Grid,
  Paper,
  Stack,
  Title,
  Text,
  Select,
  Box,
  Group,
  Image,
  NumberInput,
  Divider,
  Radio,
  Button,
} from '@mantine/core';
import { IconCalculator } from '@tabler/icons-react';

import { StepCard } from '../../components/universal-calculator/StepCard';

type AnyFn = (...args: any[]) => any;

export type StepsGridProps = {
  // Step 1
  selectedManufacturer: string;
  setSelectedManufacturer: (v: string) => void;
  availableManufacturers: Array<{ id: string; name: string; logo: string }>;
  apiManufacturers: Array<{ id: number; name: string; logo_url?: string }>;
  getImageUrl: (path: string) => string;

  // Step 2
  selectedSystemGroup: string;
  setSelectedSystemGroup: (v: string) => void;
  selectedSystem: string;
  setSelectedSystem: (v: string) => void;
  availableSystems: Array<{ value: string; label: string }>;
  products: Array<{ id: number; name: string }>;

  // Step 3
  selectedSurfaceHardness: string;
  setSelectedSurfaceHardness: (v: string) => void;
  totalSqft: number;
  setTotalSqft: (v: number) => void;
  dimensions: { length: number; width: number };
  setDimensions: (v: { length: number; width: number }) => void;
  selectedSystemGroupForStep3: string;
  countertopMode: 'pieces' | 'totals';
  setCountertopMode: (v: 'pieces' | 'totals') => void;
  countertopPieces: any[];
  setCountertopPieces: (v: any[]) => void;
  countertopDirectSurface: number;
  setCountertopDirectSurface: (v: number) => void;
  countertopDirectEdge: number;
  setCountertopDirectEdge: (v: number) => void;
  countertopDirectBacksplash: number;
  setCountertopDirectBacksplash: (v: number) => void;

  // Derived flags for Step 3 / 4
  hasArea: boolean;
  hasDimensions: boolean;
  hasSystem: boolean;
  hasManufacturer: boolean;
  hasSystemGroup: boolean;
  pricingUnlocked: boolean;
  effectiveSqft: number;

  // Step 4
  pricingMethod: any;
  setPricingMethod: (v: any) => void;
  profitMargin: number;
  setProfitMargin: (v: number) => void;
  laborRate: number;
  setLaborRate: (v: number) => void;
  totalLaborHours: number;
  setTotalLaborHours: (v: number) => void;
  targetPpsf: number;
  setTargetPpsf: (v: number) => void;

  canCalculate: boolean;
  showCalculateInStep4: boolean;
  handleCalculate: AnyFn;

  getMaterialCost: AnyFn;
  calculateLaborCost: AnyFn;
  calculateTotalCost: AnyFn;
  calculateRequiredRevenue: AnyFn;
  calculatePricePerSqft: AnyFn;
  calculateAchievedMargin: AnyFn;

  // Shared actions
  resetSystemComponentSelections: () => void;
};

export function StepsGrid(props: StepsGridProps) {
  const {
    // Step 1
    selectedManufacturer,
    setSelectedManufacturer,
    availableManufacturers,
    apiManufacturers,
    getImageUrl,

    // Step 2
    selectedSystemGroup,
    setSelectedSystemGroup,
    selectedSystem,
    setSelectedSystem,
    availableSystems,
    products,

    // Step 3
    selectedSurfaceHardness,
    setSelectedSurfaceHardness,
    totalSqft,
    setTotalSqft,
    dimensions,
    setDimensions,
    selectedSystemGroupForStep3,
    countertopMode,
    setCountertopMode,
    countertopPieces,
    setCountertopPieces,
    countertopDirectSurface,
    setCountertopDirectSurface,
    countertopDirectEdge,
    setCountertopDirectEdge,
    countertopDirectBacksplash,
    setCountertopDirectBacksplash,

    // Derived flags
    hasArea,
    hasDimensions,
    pricingUnlocked,
    effectiveSqft,

    // Step 4
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
    canCalculate,
    showCalculateInStep4,
    handleCalculate,
    getMaterialCost,
    calculateLaborCost,
    calculateTotalCost,
    calculateRequiredRevenue,
    calculatePricePerSqft,
    calculateAchievedMargin,

    resetSystemComponentSelections,
  } = props;

  return (
    <Grid gutter="lg" mb="xl">
      {/* Step 1: Select Manufacturer */}
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
                // Don't reset system group or specific system when manufacturer changes
                // Only reset system-specific component selections
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
                      const manufacturer = availableManufacturers.find(
                        (m) => m.id === selectedManufacturer
                      );
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
                    {availableManufacturers.find((m) => m.id === selectedManufacturer)?.name ||
                      'Unknown'}
                  </Text>
                </Group>
              </Box>
            )}
          </Box>
        </StepCard>
      </Grid.Col>

      {/* Step 2: Select System */}
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <Paper
          p="lg"
          withBorder
          style={{ height: '100%', borderColor: '#16a34a', borderWidth: '2px' }}
        >
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
                    {availableManufacturers.find((m) => m.id === selectedManufacturer)?.name}{' '}
                    {products.find((p) => p.id.toString() === selectedSystem)?.name ||
                      availableSystems.find((s) => s.value === selectedSystem)?.label ||
                      selectedSystem.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                  <Text size="xs" c="green.7">
                    {selectedSystemGroup === 'resin-flooring' && 'Resin-based floor coating system'}
                    {selectedSystemGroup === 'polishing' && 'Concrete polishing system'}
                    {selectedSystemGroup === 'countertops-custom' &&
                      'Custom countertop piece solution'}
                  </Text>
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>
      </Grid.Col>

      {/* Step 3: Area & Surface Details */}
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <Paper
          p="lg"
          withBorder
          style={{ height: '100%', borderColor: '#0ea5e9', borderWidth: '2px' }}
        >
          <Stack gap="md" h="100%">
            <Title order={4} c="blue">
              Step 3:{' '}
              {selectedSystemGroupForStep3 === 'countertops-custom'
                ? 'Custom Pieces'
                : 'Area & Surface'}
            </Title>
            <Text c="dimmed" size="sm">
              {selectedSystemGroupForStep3 === 'countertops-custom'
                ? 'Add and configure custom pieces or enter totals directly'
                : 'Enter dimensions or total area'}
            </Text>

            {selectedSystemGroupForStep3 === 'countertops-custom' ? (
              <Stack gap="sm">
                <Radio.Group
                  value={countertopMode}
                  onChange={(v) => setCountertopMode(v as any)}
                >
                  <Group gap="md">
                    <Radio value="pieces" label="Pieces" />
                    <Radio value="totals" label="Totals" />
                  </Group>
                </Radio.Group>

                {countertopMode === 'pieces' && (
                  <>
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
                            backsplashWidth: 0,
                          };
                          setCountertopPieces([...countertopPieces, newPiece]);
                        }}
                      >
                        + Add Piece
                      </Button>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Configure each piece below; total area will be derived from all pieces.
                    </Text>
                  </>
                )}

                {countertopMode === 'totals' && (
                  <Stack gap="xs">
                    <NumberInput
                      label="Surface Area (sq ft)"
                      value={countertopDirectSurface}
                      onChange={(v) => setCountertopDirectSurface(Number(v) || 0)}
                      min={0}
                      step={0.1}
                    />
                    <NumberInput
                      label="Edge (linear ft)"
                      value={countertopDirectEdge}
                      onChange={(v) => setCountertopDirectEdge(Number(v) || 0)}
                      min={0}
                      step={0.1}
                    />
                    <NumberInput
                      label="Backsplash (sq ft)"
                      value={countertopDirectBacksplash}
                      onChange={(v) => setCountertopDirectBacksplash(Number(v) || 0)}
                      min={0}
                      step={0.1}
                    />
                  </Stack>
                )}
              </Stack>
            ) : (
              <Stack gap="sm">
                <div>
                  <Text size="sm" fw={500} mb="xs">
                    Total Area (sq ft)
                  </Text>
                  <NumberInput
                    value={totalSqft}
                    onChange={(value) => setTotalSqft(Number(value) || 0)}
                    min={0}
                    step={0.1}
                    size="sm"
                  />
                  <Text size="xs" c="dimmed" mt="xs">
                    Enter a total, or provide dimensions below to auto-calculate.
                  </Text>
                </div>

                <Divider label="Dimensions" labelPosition="center" />
                <Group grow>
                  <NumberInput
                    label="Length (ft)"
                    value={dimensions.length}
                    onChange={(v) => setDimensions({ ...dimensions, length: Number(v) || 0 })}
                    min={0}
                    step={0.1}
                    size="sm"
                  />
                  <NumberInput
                    label="Width (ft)"
                    value={dimensions.width}
                    onChange={(v) => setDimensions({ ...dimensions, width: Number(v) || 0 })}
                    min={0}
                    step={0.1}
                    size="sm"
                  />
                </Group>

                <Divider label="Surface Hardness" labelPosition="center" />
                <Select
                  placeholder="Select surface hardness..."
                  value={selectedSurfaceHardness}
                  onChange={(value) => value && setSelectedSurfaceHardness(value)}
                  data={[
                    { value: 'soft', label: 'Soft (wood / soft concrete)' },
                    { value: 'medium', label: 'Medium (typical concrete)' },
                    { value: 'hard', label: 'Hard (dense / polished concrete)' },
                  ]}
                  size="sm"
                  disabled={!hasArea}
                  allowDeselect={false}
                />
                {!hasArea && (
                  <Text size="xs" c="dimmed">
                    Enter total area to unlock Surface Hardness.
                  </Text>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Grid.Col>

      {/* Step 4: Pricing */}
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <Paper
          p="lg"
          withBorder
          style={{ height: '100%', borderColor: '#f97316', borderWidth: '2px' }}
        >
          <Stack gap="md" h="100%">
            <Title order={4} c="orange">
              Step 4: Pricing
            </Title>
            <Text c="dimmed" size="sm">
              Choose a pricing method and inputs
            </Text>
            {!pricingUnlocked && (
              <Box
                p="sm"
                style={{
                  borderRadius: 6,
                  border: '1px dashed #cbd5e1',
                  background: '#f8fafc',
                }}
              >
                <Text size="xs" c="dimmed">
                  {!hasArea ? 'Enter total area to unlock pricing.' : 'Complete prior steps to unlock pricing.'}
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
                  onChange={(v) => setPricingMethod(v as any)}
                  size="sm"
                >
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
                    Customer price equals material + labor (no margin target). Adjust labor rate and hours below.
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
                  ? `Ready to calculate • ${effectiveSqft.toFixed(1)} sq ft • ${selectedSystemGroup || 'System'} project`
                  : `Complete all steps to calculate pricing`}
              </Text>
            </Stack>
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}


import React from 'react';
import {
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

type CountertopPiece = {
  id: number;
  name: string;
  length: number;
  width: number;
  edgeHeight: number;
  edgeWidth: number;
  backsplashHeight: number;
  backsplashWidth: number;
};

type QuickPreset = {
  id: string | number;
  value: number;
};

export type AreaAndSurfaceStepProps = Readonly<{
  selectedSystemGroup: string;
  // Countertop mode & pieces
  countertopMode: 'pieces' | 'totals';
  setCountertopMode: (mode: 'pieces' | 'totals') => void;
  countertopPieces: CountertopPiece[];
  setCountertopPieces: (pieces: CountertopPiece[]) => void;
  countertopDirectSurface: number;
  setCountertopDirectSurface: (v: number) => void;
  countertopDirectEdge: number;
  setCountertopDirectEdge: (v: number) => void;
  countertopDirectBacksplash: number;
  setCountertopDirectBacksplash: (v: number) => void;
  countertopEdgeLf: number;
  countertopBacksplashLf: number;

  // Dimensions & area
  dimensions: { length: number; width: number };
  setDimensions: (next: { length: number; width: number }) => void;
  calculatedSqft: number;
  totalSqft: number;
  setTotalSqft: (v: number) => void;

  // Quick presets
  quickPresets: QuickPreset[];
  editingPresetId: string | number | null;
  setEditingPresetId: React.Dispatch<React.SetStateAction<string | number | null>>;
  editingPresetValue: number;
  setEditingPresetValue: React.Dispatch<React.SetStateAction<number>>;
  updatePreset: (id: string | number, value: number) => void;

  // Surface hardness
  selectedSurfaceHardness: string;
  setSelectedSurfaceHardness: (v: string) => void;
  hasArea: boolean;
}>;

export function AreaAndSurfaceStep(props: AreaAndSurfaceStepProps) {
  const {
    selectedSystemGroup,
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
    countertopEdgeLf,
    countertopBacksplashLf,
    dimensions,
    setDimensions,
    calculatedSqft,
    totalSqft,
    setTotalSqft,
    quickPresets,
    editingPresetId,
    setEditingPresetId,
    editingPresetValue,
    setEditingPresetValue,
    updatePreset,
    selectedSurfaceHardness,
    setSelectedSurfaceHardness,
    hasArea,
  } = props;

  return (
    <Paper p="lg" withBorder style={{ height: '100%', borderColor: '#0ea5e9', borderWidth: '2px' }}>
      <Stack gap="md" h="100%">
        <Title order={4} c="blue">
          Step 3: {selectedSystemGroup === 'countertops-custom' ? 'Custom Pieces' : 'Area & Surface'}
        </Title>
        <Text c="dimmed" size="sm">
          {selectedSystemGroup === 'countertops-custom'
            ? 'Add and configure custom pieces or enter totals directly'
            : 'Enter dimensions or total area'}
        </Text>

        {selectedSystemGroup === 'countertops-custom' ? (
          <Stack gap="sm">
            {countertopMode === 'pieces' && (
              <Group justify="flex-end">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    const newPiece: CountertopPiece = {
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
            )}

            <Radio.Group
              value={countertopMode}
              onChange={(v) => setCountertopMode(v as 'pieces' | 'totals')}
            >
              <Group gap="xs">
                <Radio value="pieces" label="Build by pieces" />
                <Radio value="totals" label="Enter totals" />
              </Group>
            </Radio.Group>

            {countertopMode === 'totals' ? (
              <Paper withBorder p="sm" radius="md" style={{ backgroundColor: '#F8FAFC' }}>
                <Stack gap={6}>
                  <Group gap="xs" wrap="nowrap" align="flex-end">
                    <Badge color="blue" variant="light">
                      SURFACE
                    </Badge>
                    <NumberInput
                      value={countertopDirectSurface || ''}
                      onChange={(v) => setCountertopDirectSurface(Number(v) || 0)}
                      min={0}
                      placeholder="0"
                      label="Surface"
                      rightSection={<Text c="dimmed">sq ft</Text>}
                      style={{ maxWidth: 200 }}
                    />
                  </Group>
                  <Group gap="xs" wrap="nowrap" align="flex-end">
                    <Badge color="teal" variant="light">
                      EDGE
                    </Badge>
                    <NumberInput
                      value={countertopDirectEdge || ''}
                      onChange={(v) => setCountertopDirectEdge(Number(v) || 0)}
                      min={0}
                      placeholder="0"
                      label="Edge"
                      rightSection={<Text c="dimmed">lf</Text>}
                      style={{ maxWidth: 200 }}
                    />
                  </Group>
                  <Group gap="xs" wrap="nowrap" align="flex-end">
                    <Badge color="pink" variant="light">
                      BACKSPLASH
                    </Badge>
                    <NumberInput
                      value={countertopDirectBacksplash || ''}
                      onChange={(v) => setCountertopDirectBacksplash(Number(v) || 0)}
                      min={0}
                      placeholder="0"
                      label="Backsplash"
                      rightSection={<Text c="dimmed">lf</Text>}
                      style={{ maxWidth: 200 }}
                    />
                  </Group>
                </Stack>
              </Paper>
            ) : (
              countertopPieces.map((piece) => (
                <Paper
                  key={piece.id}
                  withBorder
                  p="sm"
                  radius="md"
                  style={{ backgroundColor: '#F8FAFC' }}
                >
                  <Stack gap={6}>
                    <TextInput
                      value={piece.name}
                      onChange={(e) => {
                        const updated = countertopPieces.map((p) =>
                          p.id === piece.id ? { ...p, name: e.currentTarget.value } : p,
                        );
                        setCountertopPieces(updated);
                      }}
                      placeholder={`Piece ${piece.id}`}
                    />

                    <Box
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px minmax(0,1fr) 12px minmax(0,1fr)',
                        alignItems: 'end',
                        columnGap: 6,
                        width: '100%',
                      }}
                    >
                      <Badge
                        color="blue"
                        variant="light"
                        style={{ minWidth: 90, justifySelf: 'start', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        SURFACE
                      </Badge>
                      <NumberInput
                        value={piece.length || ''}
                        onChange={(value) => {
                          const updated = countertopPieces.map((p) =>
                            p.id === piece.id ? { ...p, length: Number(value) || 0 } : p,
                          );
                          setCountertopPieces(updated);
                        }}
                        min={0}
                        placeholder="0"
                        rightSection={<Text c="dimmed">ft</Text>}
                        size="sm"
                        styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                      />
                      <Text c="dimmed" style={{ alignSelf: 'center' }}>
                        ×
                      </Text>
                      <NumberInput
                        value={piece.width || ''}
                        onChange={(value) => {
                          const updated = countertopPieces.map((p) =>
                            p.id === piece.id ? { ...p, width: Number(value) || 0 } : p,
                          );
                          setCountertopPieces(updated);
                        }}
                        min={0}
                        placeholder="0"
                        rightSection={<Text c="dimmed">ft</Text>}
                        size="sm"
                        styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                      />
                    </Box>

                    <Box
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px minmax(0,1fr) 12px minmax(0,1fr)',
                        alignItems: 'end',
                        columnGap: 6,
                        width: '100%',
                      }}
                    >
                      <Badge
                        color="teal"
                        variant="light"
                        style={{ minWidth: 90, justifySelf: 'start', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        EDGE
                      </Badge>
                      <NumberInput
                        value={piece.edgeHeight || ''}
                        onChange={(value) => {
                          const updated = countertopPieces.map((p) =>
                            p.id === piece.id ? { ...p, edgeHeight: Number(value) || 0 } : p,
                          );
                          setCountertopPieces(updated);
                        }}
                        min={0}
                        placeholder="0"
                        rightSection={<Text c="dimmed">in</Text>}
                        size="sm"
                        styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                      />
                      <Box />
                      <NumberInput
                        value={piece.edgeWidth || ''}
                        onChange={(value) => {
                          const updated = countertopPieces.map((p) =>
                            p.id === piece.id ? { ...p, edgeWidth: Number(value) || 0 } : p,
                          );
                          setCountertopPieces(updated);
                        }}
                        min={0}
                        placeholder="0"
                        rightSection={<Text c="dimmed">ft</Text>}
                        size="sm"
                        styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                      />
                    </Box>

                    <Box
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px minmax(0,1fr) 12px minmax(0,1fr)',
                        alignItems: 'end',
                        columnGap: 6,
                        width: '100%',
                      }}
                    >
                      <Badge
                        color="pink"
                        variant="light"
                        style={{ minWidth: 90, justifySelf: 'start', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        BACKSPLASH
                      </Badge>
                      <NumberInput
                        value={piece.backsplashHeight || ''}
                        onChange={(value) => {
                          const updated = countertopPieces.map((p) =>
                            p.id === piece.id ? { ...p, backsplashHeight: Number(value) || 0 } : p,
                          );
                          setCountertopPieces(updated);
                        }}
                        min={0}
                        placeholder="0"
                        rightSection={<Text c="dimmed">in</Text>}
                        size="sm"
                        styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                      />
                      <Box />
                      <NumberInput
                        value={piece.backsplashWidth || ''}
                        onChange={(value) => {
                          const updated = countertopPieces.map((p) =>
                            p.id === piece.id ? { ...p, backsplashWidth: Number(value) || 0 } : p,
                          );
                          setCountertopPieces(updated);
                        }}
                        min={0}
                        placeholder="0"
                        rightSection={<Text c="dimmed">ft</Text>}
                        size="sm"
                        styles={{ input: { textAlign: 'right', minWidth: 0 } }}
                      />
                    </Box>

                    <Text size="xs" c="dimmed">
                      Edge: {(Number(piece.edgeWidth) || 0).toFixed(2)} lf • Backsplash:{' '}
                      {(Number(piece.backsplashWidth) || 0).toFixed(2)} lf
                    </Text>

                    {piece.length * piece.width > 0 && (
                      <Text size="xs" c="blue" fw={500}>
                        Surface: {(piece.length * piece.width).toFixed(2)} sq ft
                      </Text>
                    )}
                  </Stack>
                </Paper>
              ))
            )}

            <Box p="sm" bg="blue.1" style={{ borderRadius: '6px' }}>
              <Stack gap={6}>
                <Group gap={6} wrap="wrap">
                  <Badge variant="light" color="blue">
                    SURFACE:{' '}
                    {(() => {
                      if (countertopMode === 'totals') return countertopDirectSurface.toFixed(2);
                      return countertopPieces
                        .reduce((total, piece) => total + piece.length * piece.width, 0)
                        .toFixed(2);
                    })()}{' '}
                    sq ft
                  </Badge>
                  <Badge variant="light" color="teal">
                    EDGE: {countertopEdgeLf.toFixed(2)} lf
                  </Badge>
                  <Badge variant="light" color="pink">
                    BACKSPLASH: {countertopBacksplashLf.toFixed(2)} lf
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Edge and backsplash measured in linear feet (lf). Heights are captured for
                  materials but don’t affect LF totals.
                </Text>
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Stack gap="sm">
            <div>
              <Text size="sm" fw={500} mb="xs">
                Dimensions (ft)
              </Text>
              <Group gap="xs">
                <NumberInput
                  placeholder="Length"
                  value={dimensions.length}
                  onChange={(value) =>
                    setDimensions({ ...dimensions, length: Number(value) || 0 })
                  }
                  min={0}
                  step={0.1}
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Text size="sm" c="dimmed">
                  ×
                </Text>
                <NumberInput
                  placeholder="Width"
                  value={dimensions.width}
                  onChange={(value) =>
                    setDimensions({ ...dimensions, width: Number(value) || 0 })
                  }
                  min={0}
                  step={0.1}
                  size="sm"
                  style={{ flex: 1 }}
                />
              </Group>
              {calculatedSqft > 0 && (
                <Text size="xs" c="blue" fw={500} mt="xs">
                  = {calculatedSqft.toFixed(1)} sq ft
                </Text>
              )}
            </div>

            <div>
              <Text size="sm" fw={500} mb="xs">
                Or Total Area
              </Text>
              <NumberInput
                placeholder="Enter square footage"
                value={totalSqft}
                onChange={(value) => setTotalSqft(Number(value) || 0)}
                min={0}
                step={1}
                size="sm"
                rightSection={
                  <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    sq ft
                  </Text>
                }
              />
            </div>

            <div>
              <Text size="sm" fw={500} mb="xs">
                Quick Presets
              </Text>
              <Group gap="xs">
                {quickPresets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="light"
                    size="xs"
                    onClick={() => setTotalSqft(preset.value)}
                    onDoubleClick={() => {
                      setEditingPresetId(preset.id);
                      setEditingPresetValue(preset.value);
                    }}
                    title="Double-click to edit preset"
                    style={{ minWidth: '80px' }}
                  >
                    {editingPresetId === preset.id ? (
                      <NumberInput
                        value={editingPresetValue}
                        onChange={(value) => setEditingPresetValue(Number(value) || 0)}
                        onBlur={() => {
                          updatePreset(preset.id, editingPresetValue);
                          setEditingPresetId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updatePreset(preset.id, editingPresetValue);
                            setEditingPresetId(null);
                          }
                        }}
                        size="xs"
                        style={{ width: '60px' }}
                        variant="unstyled"
                        autoFocus
                      />
                    ) : (
                      `${preset.value}`
                    )}
                  </Button>
                ))}
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                Click to apply, double-click to edit presets
              </Text>
            </div>

            {selectedSystemGroup === 'resin-flooring' && selectedSurfaceHardness === 'soft' && (
              <Box
                mt="xs"
                p="sm"
                style={{
                  border: '1px solid #fcd34d',
                  background: '#fffbeb',
                  color: '#92400e',
                  borderRadius: 6,
                }}
              >
                <Text size="sm">
                  Soft slab selected — consider a primer coat or higher-build to account for
                  absorption.
                </Text>
              </Box>
            )}
            {selectedSystemGroup === 'resin-flooring' && (
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Surface Hardness
                </Text>
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                  {[
                    { value: 'soft', label: 'Soft', desc: 'Under 3000 PSI' },
                    { value: 'medium', label: 'Medium', desc: '3000–5000 PSI' },
                    { value: 'hard', label: 'Hard', desc: '5000–7000 PSI' },
                    { value: 'very-hard', label: 'Very Hard', desc: 'Over 7000 PSI' },
                  ].map((opt) => (
                    <Box
                      key={opt.value}
                      onClick={() => hasArea && setSelectedSurfaceHardness(opt.value)}
                      style={{
                        border:
                          selectedSurfaceHardness === opt.value
                            ? '2px solid #16a34a'
                            : '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: 8,
                        background: hasArea ? '#ffffff' : '#f8fafc',
                        cursor: hasArea ? 'pointer' : 'not-allowed',
                        opacity: hasArea ? 1 : 0.6,
                        userSelect: 'none',
                      }}
                    >
                      <Text size="sm" fw={500}>
                        {opt.label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {opt.desc}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                {!hasArea && (
                  <Text size="xs" c="dimmed" mt="xs">
                    Enter total area to unlock Surface Hardness.
                  </Text>
                )}
              </div>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}


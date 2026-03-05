import React from 'react';
import { Box } from '@mantine/core';
import {
  IconClockHour3,
  IconRoad,
  IconRulerMeasure,
  IconReceipt2,
  IconSparkles,
} from '@tabler/icons-react';

export type LaborThumbProps = Readonly<{
  id: string;
}>;

export function LaborThumb(props: LaborThumbProps) {
  const { id } = props;

  const style: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 4,
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const lower = id.toLowerCase();
  let IconComp: React.ComponentType<{ size?: number; color?: string }> = IconReceipt2;
  if (lower.includes('hour') || lower.includes('overtime') || lower.includes('after-hours')) {
    IconComp = IconClockHour3;
  } else if (lower.includes('remote') || lower.includes('delivery') || lower.includes('fuel')) {
    IconComp = IconRoad;
  } else if (lower.includes('joint') || lower.includes('crack') || lower.includes('cut')) {
    IconComp = IconRulerMeasure;
  } else if (lower.includes('grind') || lower.includes('removal') || lower.includes('demo')) {
    IconComp = IconReceipt2;
  } else if (lower.includes('custom') || lower.includes('sundries') || lower.includes('fee')) {
    IconComp = IconSparkles;
  }

  return (
    <Box style={style}>
      <IconComp size={16} color="#555" />
    </Box>
  );
}


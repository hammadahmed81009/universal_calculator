import { ReactNode } from 'react';
import { Paper, Stack, Title, Text } from '@mantine/core';

interface StepCardProps {
  title: string;
  subtitle?: string;
  /**
   * Border color for the step card. Accepts any valid CSS color.
   */
  accentColor?: string;
  /**
   * Mantine color for the title text (e.g. "blue", "green").
   */
  titleColor?: string;
  children: ReactNode;
}

export function StepCard({
  title,
  subtitle,
  accentColor = '#2563eb',
  titleColor = 'blue',
  children,
}: StepCardProps) {
  return (
    <Paper
      p="lg"
      withBorder
      style={{ height: '100%', borderColor: accentColor, borderWidth: '2px' }}
    >
      <Stack gap="md" h="100%">
        <Title order={4} c={titleColor}>
          {title}
        </Title>
        {subtitle && (
          <Text c="dimmed" size="sm">
            {subtitle}
          </Text>
        )}
        {children}
      </Stack>
    </Paper>
  );
}


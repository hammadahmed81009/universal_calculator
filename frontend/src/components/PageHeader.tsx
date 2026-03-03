import { Paper, Group, Title, Text, Box, useMantineTheme } from '@mantine/core';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  color?: string;
  rightSection?: ReactNode;
};

export default function PageHeader({ title, subtitle, color = 'blue', rightSection }: PageHeaderProps) {
  const theme = useMantineTheme();
  const primaryColor = theme.primaryColor || color;
  const colorArray = theme.colors[primaryColor] || theme.colors.blue || theme.colors[color];
  const leftBorder = `4px solid ${colorArray[6]}`;
  const bg = `linear-gradient(180deg, ${colorArray[0]}, transparent)`;

  return (
    <Paper withBorder radius="md" p="md" style={{ background: bg, borderLeft: leftBorder }}>
      <Group justify="space-between" align="center">
        <Box>
          <Title order={2} c="dark.8">{title}</Title>
          {subtitle && (
            <Text mt={4} size="md" c="gray.7">{subtitle}</Text>
          )}
        </Box>
        {rightSection && <Box style={{ display: 'flex', alignItems: 'center' }}>{rightSection}</Box>}
      </Group>
    </Paper>
  );
}

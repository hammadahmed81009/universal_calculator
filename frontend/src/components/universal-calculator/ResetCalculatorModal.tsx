import React from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';

export type ResetCalculatorModalProps = Readonly<{
  opened: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function ResetCalculatorModal(props: ResetCalculatorModalProps) {
  const { opened, onCancel, onConfirm } = props;

  return (
    <Modal opened={opened} onClose={onCancel} title="Reset Universal Calculator?" centered>
      <Stack gap="sm">
        <Text size="sm">
          This will clear your local calculator draft, snapshot state, and selections. Saved bids in
          the backend will not be affected.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="red" onClick={onConfirm}>
            Reset Calculator
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


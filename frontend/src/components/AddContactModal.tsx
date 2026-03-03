import { Modal } from '@mantine/core';

/** Stub: calculator-only handoff — add contact removed. Kept so UniversalCalculator.tsx builds without edits. */
interface AddContactModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export function AddContactModal({ opened, onClose }: AddContactModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Add Contact" size="md">
      <p style={{ color: 'var(--mantine-color-dimmed)' }}>Calculator-only build — add contact unavailable.</p>
    </Modal>
  );
}

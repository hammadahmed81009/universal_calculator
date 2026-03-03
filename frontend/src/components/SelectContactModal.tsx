import { Modal } from '@mantine/core';

/** Stub: calculator-only handoff — contact selection removed. Kept so UniversalCalculator.tsx builds without edits. */
interface SelectContactModalProps {
  opened: boolean;
  onClose: () => void;
  onSelected: (c: { id: number; first_name?: string; last_name?: string; company_name?: string }) => void;
}

export default function SelectContactModal({ opened, onClose }: SelectContactModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Select Contact" size="md">
      <p style={{ color: 'var(--mantine-color-dimmed)' }}>Calculator-only build — contact selection unavailable.</p>
    </Modal>
  );
}

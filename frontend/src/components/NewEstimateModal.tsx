import { Modal } from '@mantine/core';

/** Stub: calculator-only handoff — new estimate removed. Kept so UniversalCalculator.tsx builds without edits. */

export interface EstimateRecord {
  id?: string;
  name?: string;
  [key: string]: any;
}

export interface EstimateService {
  createEstimate?: (data: any) => Promise<EstimateRecord>;
  [key: string]: any;
}

interface NewEstimateModalProps {
  opened: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  businessLogoUrl?: string | null;
}

export default function NewEstimateModal({ opened, onClose }: NewEstimateModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="New Estimate" size="lg">
      <p style={{ color: 'var(--mantine-color-dimmed)' }}>Calculator-only build — create estimate unavailable.</p>
    </Modal>
  );
}

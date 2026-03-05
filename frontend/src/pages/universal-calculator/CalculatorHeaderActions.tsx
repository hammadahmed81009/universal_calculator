import { Button, Group } from '@mantine/core';
import { useLocation } from 'wouter';

export type CalculatorHeaderActionsProps = Readonly<{
  onResetClick: () => void;
}>;

export function CalculatorHeaderActions(props: CalculatorHeaderActionsProps) {
  const [, setLocation] = useLocation();

  return (
    <Group gap="xs">
      <Button
        size="xs"
        variant="default"
        onClick={() => setLocation('/saved-bids')}
      >
        View Saved Bids
      </Button>
      <Button
        size="xs"
        variant="white"
        color="red"
        onClick={props.onResetClick}
      >
        Reset
      </Button>
    </Group>
  );
}


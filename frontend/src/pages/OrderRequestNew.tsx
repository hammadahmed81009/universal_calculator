import { useEffect, useState } from 'react';
import { Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconReceipt2 } from '@tabler/icons-react';
import { useLocation } from 'wouter';

import { apiGet } from '../lib/api';

type SavedBid = {
  id: number;
  name: string;
  description: string | null;
  manufacturer_name?: string | null;
  coverage_area_sqft?: number | null;
  price_per_sqft?: number | null;
  customer_price?: number | null;
};

export default function OrderRequestNew() {
  const [, setLocation] = useLocation();
  const [savedBid, setSavedBid] = useState<SavedBid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const savedBidId = params.get('savedBidId');

  useEffect(() => {
    if (!savedBidId) {
      setError('Missing saved bid id in URL.');
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<SavedBid>(`/api/saved-bids/${savedBidId}`);
        if (!cancelled) {
          setSavedBid(res);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load saved bid.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [savedBidId]);

  const handleBackToCalculator = () => {
    setLocation(savedBidId ? `/?editBid=${encodeURIComponent(savedBidId)}` : '/');
  };

  const handleGoToSavedBids = () => {
    setLocation('/saved-bids');
  };

  return (
    <main style={{ padding: '24px 16px', maxWidth: 960, margin: '0 auto' }}>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={2}>New Material Order Request</Title>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={handleBackToCalculator}
          >
            Back to Calculator
          </Button>
        </Group>

        <Card withBorder shadow="xs" padding="lg" radius="md">
          {!savedBidId && (
            <Text c="red" size="sm">
              Missing <code>savedBidId</code> in URL. Please create an order request from a saved bid
              or the Universal Calculator.
            </Text>
          )}

          {savedBidId && loading && (
            <Group justify="center" p="md">
              <Loader size="sm" />
            </Group>
          )}

          {savedBidId && error && !loading && (
            <Stack gap="sm">
              <Text c="red" size="sm">
                {error}
              </Text>
              <Group>
                <Button variant="outline" size="xs" onClick={handleGoToSavedBids}>
                  View Saved Bids
                </Button>
                <Button variant="light" size="xs" onClick={handleBackToCalculator}>
                  Back to Calculator
                </Button>
              </Group>
            </Stack>
          )}

          {savedBidId && !loading && !error && savedBid && (
            <Stack gap="md">
              <Group gap="sm" align="center">
                <IconReceipt2 size={20} />
                <div>
                  <Text fw={600} size="sm">
                    Order request started from bid #{savedBid.id}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {savedBid.name || 'Untitled bid'}
                  </Text>
                </div>
              </Group>

              <Stack gap={4}>
                <Text size="sm">
                  <strong>Manufacturer:</strong>{' '}
                  {savedBid.manufacturer_name || 'Not specified'}
                </Text>
                <Text size="sm">
                  <strong>Coverage area:</strong>{' '}
                  {savedBid.coverage_area_sqft != null
                    ? `${savedBid.coverage_area_sqft.toLocaleString()} sq ft`
                    : 'Not specified'}
                </Text>
                <Text size="sm">
                  <strong>Customer price:</strong>{' '}
                  {savedBid.customer_price != null
                    ? `$${savedBid.customer_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : 'Not specified'}
                </Text>
                <Text size="sm">
                  <strong>Price per sq ft:</strong>{' '}
                  {savedBid.price_per_sqft != null
                    ? `$${savedBid.price_per_sqft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : 'Not specified'}
                </Text>
              </Stack>

              <Text size="sm" c="dimmed">
                This screen is an early placeholder for the full material order workflow. Your bid has
                been saved successfully; you can now coordinate materials with your distributor using
                the information above.
              </Text>

              <Group>
                <Button size="sm" onClick={handleGoToSavedBids}>
                  View All Saved Bids
                </Button>
                <Button variant="outline" size="sm" onClick={handleBackToCalculator}>
                  Adjust Bid in Calculator
                </Button>
              </Group>
            </Stack>
          )}
        </Card>
      </Stack>
    </main>
  );
}


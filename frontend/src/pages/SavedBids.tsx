import { Button, Card, Group, Loader, Pagination, Stack, Table, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconCalculator } from '@tabler/icons-react';
import { useLocation } from 'wouter';

import { useSessionContext } from '../store/sessionContext';
import { apiGet } from '../lib/api';
import { useEffect, useState } from 'react';

type SavedBidListItem = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  client_id: number | null;
  manufacturer_id: number | null;
};

type SavedBidListResponse = {
  items: SavedBidListItem[];
  total: number;
  page: number;
  page_size: number;
};

export default function SavedBids() {
  const session = useSessionContext();
  const [, setLocation] = useLocation();
  const lastId = session.lastSavedBidId ?? null;

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [data, setData] = useState<SavedBidListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<SavedBidListResponse>('/api/saved-bids', {
          params: { page, page_size: pageSize },
        });
        if (!cancelled) {
          setData(res);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load saved bids.');
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
  }, [page, pageSize]);

  const handleBackToCalculator = () => {
    setLocation('/');
  };

  return (
    <main style={{ padding: '24px 16px', maxWidth: 960, margin: '0 auto' }}>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={2}>Saved Bids</Title>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={handleBackToCalculator}
          >
            Back to Calculator
          </Button>
        </Group>

        <Card withBorder shadow="xs" padding="lg" radius="md">
          {loading && (
            <Group justify="center" p="md">
              <Loader size="sm" />
            </Group>
          )}

          {error && !loading && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}

          {!loading && !error && data && data.items.length === 0 && (
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                No saved bids found yet. Run a calculation and save a bid from the Universal
                Calculator to see it here.
              </Text>
              <Button
                leftSection={<IconCalculator size={16} />}
                onClick={handleBackToCalculator}
              >
                Go to Calculator
              </Button>
            </Stack>
          )}

          {!loading && !error && data && data.items.length > 0 && (
            <Stack gap="md">
              <Table striped highlightOnHover withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Created</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.items.map((bid) => (
                    <Table.Tr key={bid.id}>
                      <Table.Td>{bid.id}</Table.Td>
                      <Table.Td>{bid.name}</Table.Td>
                      <Table.Td>{bid.description || '—'}</Table.Td>
                      <Table.Td>
                        {bid.created_at
                          ? new Date(bid.created_at).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : ''}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() =>
                              setLocation(`/?editBid=${encodeURIComponent(String(bid.id))}`)
                            }
                          >
                            Open in Calculator
                          </Button>
                          {lastId && lastId === String(bid.id) && (
                            <Text size="xs" c="dimmed">
                              Last saved this session
                            </Text>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {data.total > data.page_size && (
                <Group justify="space-between" align="center">
                  <Text size="xs" c="dimmed">
                    Showing page {data.page} of {Math.ceil(data.total / data.page_size)} (
                    {data.total} total)
                  </Text>
                  <Pagination
                    value={page}
                    onChange={setPage}
                    total={Math.max(1, Math.ceil(data.total / data.page_size))}
                    size="sm"
                  />
                </Group>
              )}
            </Stack>
          )}
        </Card>
      </Stack>
    </main>
  );
}


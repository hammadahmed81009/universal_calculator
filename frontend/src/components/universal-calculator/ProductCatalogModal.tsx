import React from 'react';
import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

type CatalogProduct = {
  id: number;
  name: string;
  category?: string | null;
  manufacturer?: string | null;
  image_url?: string | null;
  sku?: string | null;
};

export type ProductCatalogModalProps = Readonly<{
  opened: boolean;
  onClose: () => void;
  products: CatalogProduct[];
  selectedManufacturerName: string | null;

  catalogQuery: string;
  setCatalogQuery: (value: string) => void;
  catalogCategory: string | null;
  setCatalogCategory: (value: string | null) => void;
  catalogManu: string | null;
  setCatalogManu: (value: string | null) => void;
  catalogLimit: number;
  setCatalogLimit: (updater: (prev: number) => number) => void;

  addOnQuantities: Record<string, number>;
  setAddOnQuantities: (updater: (prev: Record<string, number>) => Record<string, number>) => void;

  getUnitPrice: (p: CatalogProduct) => number;
  getProductImageUrl: (relativePath: string | undefined) => string;
  ThumbImg: React.ComponentType<{ src?: string; size?: number }>;
}>;

export function ProductCatalogModal(props: ProductCatalogModalProps) {
  const {
    opened,
    onClose,
    products,
    selectedManufacturerName,
    catalogQuery,
    setCatalogQuery,
    catalogCategory,
    setCatalogCategory,
    catalogManu,
    setCatalogManu,
    catalogLimit,
    setCatalogLimit,
    addOnQuantities,
    setAddOnQuantities,
    getUnitPrice,
    getProductImageUrl,
    ThumbImg,
  } = props;

  const filteredProducts = products
    .filter(
      (p) => !catalogQuery || p.name.toLowerCase().includes(catalogQuery.toLowerCase()),
    )
    .filter((p) => !catalogCategory || p.category === catalogCategory)
    .filter((p) => !catalogManu || p.manufacturer === catalogManu);

  const shownCount = Math.min(catalogLimit, filteredProducts.length);

  const slice = filteredProducts.slice(0, catalogLimit);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Product Catalog${
        catalogManu
          ? ` — ${catalogManu}`
          : selectedManufacturerName
            ? ` — ${selectedManufacturerName}`
            : ''
      }`}
      size="80vw"
      radius="md"
      centered
    >
      <Stack gap="sm">
        <Group align="flex-end" wrap="wrap" justify="space-between">
          <Group align="flex-end" wrap="wrap" style={{ flex: 1 }}>
            <TextInput
              label="Search"
              placeholder="Search products by name…"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 220 }}
            />
            <Select
              label="Category"
              clearable
              placeholder="All Categories"
              data={[...new Set(products.map((p) => p.category).filter(Boolean))].map((c) => ({
                value: c as string,
                label: c as string,
              }))}
              value={catalogCategory}
              onChange={setCatalogCategory}
              style={{ minWidth: 200 }}
            />
            <Select
              label="Manufacturer"
              clearable
              placeholder="All Manufacturers"
              data={[...new Set(products.map((p) => p.manufacturer).filter(Boolean))].map((m) => ({
                value: m as string,
                label: m as string,
              }))}
              value={catalogManu}
              onChange={setCatalogManu}
              style={{ minWidth: 220 }}
            />
          </Group>
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            Showing {filteredProducts.length > 0 ? `1–${shownCount}` : '0'} of{' '}
            {filteredProducts.length} products
          </Text>
        </Group>

        <Divider />

        <SimpleGrid
          cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
          spacing="sm"
          style={{ maxHeight: '70vh', overflow: 'auto', paddingRight: 4 }}
        >
          {slice.map((p) => {
            const id = p.id.toString();
            const price = getUnitPrice(p) || 0;
            const qty = addOnQuantities[id] || 0;
            return (
              <Paper key={id} withBorder radius="md" p="sm">
                <Stack gap={6}>
                  <Group gap={8} align="flex-start" wrap="nowrap">
                    <ThumbImg src={getProductImageUrl(p.image_url || undefined)} size={48} />
                    <div style={{ minWidth: 0 }}>
                      <Text
                        size="sm"
                        fw={600}
                        style={{
                          lineHeight: 1.2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2 as any,
                          WebkitBoxOrient: 'vertical' as any,
                          overflow: 'hidden',
                        }}
                      >
                        {p.name}
                      </Text>
                      <Group gap={8} wrap="wrap">
                        {p.sku && (
                          <Badge size="xs" variant="light" color="gray">
                            SKU: {p.sku}
                          </Badge>
                        )}
                        <Badge size="xs" variant="light" color="blue">
                          {p.category || 'Uncategorized'}
                        </Badge>
                        {p.manufacturer && (
                          <Badge size="xs" variant="light" color="teal">
                            {p.manufacturer}
                          </Badge>
                        )}
                      </Group>
                    </div>
                  </Group>
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={600}>
                      ${price.toFixed(2)}
                    </Text>
                    <Group gap="xs" align="center">
                      <NumberInput
                        size="xs"
                        w={84}
                        min={0}
                        value={qty}
                        onChange={(v) =>
                          setAddOnQuantities((prev) => ({
                            ...prev,
                            [id]: Number(v) || 0,
                          }))
                        }
                      />
                      <Button
                        size="xs"
                        onClick={() => {
                          setAddOnQuantities((prev) => ({
                            ...prev,
                            [id]: (prev[id] || 0) + 1,
                          }));
                          notifications.show({
                            title: 'Added to estimate',
                            message: `${p.name} added.`,
                            color: 'green',
                          });
                        }}
                      >
                        Add to Estimate
                      </Button>
                    </Group>
                  </Group>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>

        {filteredProducts.length > catalogLimit && (
          <Group justify="center" mt="sm">
            <Button variant="light" onClick={() => setCatalogLimit((l) => l + 24)}>
              Load more
            </Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}


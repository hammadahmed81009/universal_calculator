import { useMemo, useState } from 'react';

export type Suggestion = {
  id: string;
  source: 'rule' | 'ai';
  title: string;
  desc?: string;
  qty: number;
  unit?: string;
  price?: number;
  productId?: string;
  onApply?: () => void;
  tds?: string;
};

type AddOnSourceItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  tds: string;
};

type UseAddOnSuggestionsArgs = {
  selectedSystem: string;
  selectedSystemGroup: string;
  effectiveSqft: number;
  commonlyUsedMaterials: AddOnSourceItem[];
  countertopIncidentals: AddOnSourceItem[];
  suggestionCycle: Record<string, number>;
  suggestionKey: string;
  hasCalculated: boolean;
};

export function useAddOnSuggestions(args: UseAddOnSuggestionsArgs) {
  const {
    selectedSystem,
    selectedSystemGroup,
    effectiveSqft,
    commonlyUsedMaterials,
    countertopIncidentals,
    suggestionCycle,
    suggestionKey,
    hasCalculated,
  } = args;

  const findAddOnByName = (needle: string) => {
    const hay = [...commonlyUsedMaterials, ...countertopIncidentals];
    const n = needle.toLowerCase();
    return hay.find((it) => it.name.toLowerCase().includes(n));
  };

  const ruleSuggestions: Suggestion[] = useMemo(() => {
    const out: Suggestion[] = [];
    if (!selectedSystem) return out;

    const buckets = Math.max(1, Math.ceil(effectiveSqft / 300));
    const bucketItem = findAddOnByName('5 Gal Bucket') || findAddOnByName('Bucket');
    if (bucketItem) {
      out.push({
        id: `rule-buckets-${bucketItem.id}`,
        source: 'rule',
        title: 'Mix Buckets',
        desc: 'Recommended mixing capacity for your area.',
        qty: buckets,
        unit: 'ea',
        price: bucketItem.price,
        productId: bucketItem.id,
        tds: bucketItem.tds,
      });
    }

    const paddleItem = findAddOnByName('Mixing Paddle') || findAddOnByName('Paddle');
    if (paddleItem) {
      out.push({
        id: `rule-paddle-${paddleItem.id}`,
        source: 'rule',
        title: 'Mixing Paddle',
        desc: 'Useful for epoxy and polyaspartic systems.',
        qty: 1,
        unit: 'ea',
        price: paddleItem.price,
        productId: paddleItem.id,
        tds: paddleItem.tds,
      });
    }

    const glovesItem = findAddOnByName('Glove') || findAddOnByName('Gloves');
    if (glovesItem) {
      out.push({
        id: `rule-gloves-${glovesItem.id}`,
        source: 'rule',
        title: 'Gloves',
        desc: 'Basic safety supplies for mixing and install.',
        qty: 4,
        unit: 'ea',
        price: glovesItem.price,
        productId: glovesItem.id,
        tds: glovesItem.tds,
      });
    }

    if (selectedSystemGroup !== 'countertops-custom') {
      const squeegeeItem = findAddOnByName('Squeegee') || findAddOnByName('Thar Squee');
      if (squeegeeItem) {
        out.push({
          id: `rule-squeegee-${squeegeeItem.id}`,
          source: 'rule',
          title: '18 inch Thar Squeegee',
          desc: 'Speeds up material pull and leveling.',
          qty: 1,
          unit: 'ea',
          price: squeegeeItem.price,
          productId: squeegeeItem.id,
          tds: squeegeeItem.tds,
        });
      }

      const spikeItem =
        findAddOnByName('Spiked Shoe') ||
        findAddOnByName('Spike Shoe') ||
        findAddOnByName('Spikes');
      if (spikeItem) {
        const idx = suggestionCycle?.[suggestionKey] || 0;
        const allowSpike = selectedSystem === 'metallic-system' ? idx % 6 === 0 : true;
        if (allowSpike) {
          out.push({
            id: `rule-spikes-${spikeItem.id}`,
            source: 'rule',
            title: 'Spiked Shoes',
            desc: 'Walk wet coats safely for back-rolling and broadcast.',
            qty: 1,
            unit: 'pair',
            price: spikeItem.price,
            productId: spikeItem.id,
            tds: spikeItem.tds,
          });
        }
      }

      const rollerItem =
        findAddOnByName('Roller Cover') ||
        findAddOnByName('9 inch Roller') ||
        findAddOnByName('Roller');
      if (rollerItem) {
        const rollerQty = Math.max(2, Math.ceil(effectiveSqft / 500));
        out.push({
          id: `rule-roller-${rollerItem.id}`,
          source: 'rule',
          title: '9\" Roller Covers',
          desc: 'Extra covers keep application smooth and lint-free.',
          qty: rollerQty,
          unit: 'ea',
          price: rollerItem.price,
          productId: rollerItem.id,
          tds: rollerItem.tds,
        });
      }

      const tapeItem =
        findAddOnByName('Masking Tape') ||
        findAddOnByName('Blue Tape') ||
        findAddOnByName('Tape');
      if (tapeItem) {
        out.push({
          id: `rule-tape-${tapeItem.id}`,
          source: 'rule',
          title: 'Masking Tape',
          desc: 'Protects walls, thresholds, and fixtures during install.',
          qty: Math.max(1, Math.ceil(effectiveSqft / 800)),
          unit: 'roll',
          price: tapeItem.price,
          productId: tapeItem.id,
          tds: tapeItem.tds,
        });
      }
    }

    const list = [...out];
    const c = (suggestionCycle?.[suggestionKey] || 0) % Math.max(1, list.length);
    const rotated = list.length > 0 ? list.slice(c).concat(list.slice(0, c)) : list;
    return rotated;
  }, [
    selectedSystem,
    selectedSystemGroup,
    effectiveSqft,
    suggestionCycle,
    suggestionKey,
    commonlyUsedMaterials,
    countertopIncidentals,
  ]);

  const aiSuggestions: Suggestion[] = useMemo(() => {
    if (!hasCalculated) return [];
    const items: Suggestion[] = [];
    const trowel = findAddOnByName('Notched Trowel');
    if (trowel) {
      items.push({
        id: `ai-trowel-${trowel.id}`,
        source: 'ai',
        title: 'Notched Trowel',
        desc: 'Recommended tool for base/grout coats.',
        qty: 1,
        unit: 'ea',
        price: trowel.price,
        productId: trowel.id,
        tds: trowel.tds,
      });
    }
    const squeegee = findAddOnByName('Squeegee') || findAddOnByName('Thar Squee');
    if (squeegee) {
      items.push({
        id: `ai-squeegee-${squeegee.id}`,
        source: 'ai',
        title: '18 inch Thar Squeegee',
        desc: 'Speeds up material pull and leveling.',
        qty: 1,
        unit: 'ea',
        price: squeegee.price,
        productId: squeegee.id,
        tds: squeegee.tds,
      });
    }
    return items;
  }, [hasCalculated, commonlyUsedMaterials, countertopIncidentals]);

  const mergedSuggestions: Suggestion[] = useMemo(() => {
    const map = new Map<string, Suggestion>();
    [...ruleSuggestions, ...aiSuggestions].forEach((s) => {
      const key = (s.productId ? `${s.title}-${s.productId}` : s.title).toLowerCase();
      if (!map.has(key)) map.set(key, s);
    });
    return Array.from(map.values());
  }, [ruleSuggestions, aiSuggestions]);

  const [suggestionQty, setSuggestionQty] = useState<Record<string, number>>({});

  return {
    mergedSuggestions,
    suggestionQty,
    setSuggestionQty,
    findAddOnByName,
  };
}


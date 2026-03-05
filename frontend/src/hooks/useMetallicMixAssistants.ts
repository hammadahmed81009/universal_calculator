import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';

import { allocateByWeights, getBasePigmentRatio } from '../utils/universalCalculator';
import type { UniversalProduct } from './useUniversalProducts';

type MetallicPigment = { id: string; name: string; quantity: number };

type UseMetallicMixAssistantsArgs = {
  selectedSystem: string | null;
  selectedSystemGroup: string | null;
  effectiveSqft: number;
  products: UniversalProduct[];

  // Flooring metallic system
  selectedMetallicMoneyCoat: string;
  metallicMoneyCoatSpreadRate: number | null;
  selectedMetallicPigments: MetallicPigment[];
  setSelectedMetallicPigments: React.Dispatch<React.SetStateAction<MetallicPigment[]>>;

  // Countertop metallic system
  selectedCountertopMetallicArtCoat: string;
  countertopMetallicPigmentSpreadRate: number | null;
  selectedCountertopMetallicPigments: MetallicPigment[];
  setSelectedCountertopMetallicPigments: React.Dispatch<React.SetStateAction<MetallicPigment[]>>;
};

export function useMetallicMixAssistants({
  selectedSystem,
  selectedSystemGroup,
  effectiveSqft,
  products,
  selectedMetallicMoneyCoat,
  metallicMoneyCoatSpreadRate,
  selectedMetallicPigments,
  setSelectedMetallicPigments,
  selectedCountertopMetallicArtCoat,
  countertopMetallicPigmentSpreadRate,
  selectedCountertopMetallicPigments,
  setSelectedCountertopMetallicPigments,
}: UseMetallicMixAssistantsArgs) {
  // Reusable Metallic Mix Assistant applier (flooring metallic system)
  const applyMetallicMixAssistant = useCallback(() => {
    if (selectedSystem !== 'metallic-system') return;
    if (selectedMetallicPigments.length === 0) {
      notifications.show({
        title: 'Add pigments first',
        message: 'Select one or more metallic pigments, then Apply to auto-allocate quantities.',
        color: 'yellow',
      });
      return;
    }
    const sr = Math.max(1, metallicMoneyCoatSpreadRate || 30);
    const kitsNeeded = Math.ceil(effectiveSqft / (sr * 3));
    // Use manufacturer ratio from selected money coat product when available
    const manufacturer =
      products.find((p) => p.id.toString() === (selectedMetallicMoneyCoat || ''))?.manufacturer || '';
    const pigmentRatio = getBasePigmentRatio(manufacturer);
    const computedTotal = Math.max(1, Math.ceil(kitsNeeded * pigmentRatio));
    const count = Math.max(1, selectedMetallicPigments.length);
    const totalPigments = Math.max(count, computedTotal); // ensure at least 1 each
    const weights = [4, 2, 1].slice(0, count);
    const parts = allocateByWeights(totalPigments, weights, count);
    const primary = parts[0] || 0;
    const accent = parts[1] || 0;
    const depth = parts[2] || 0;
    setSelectedMetallicPigments((prev) => {
      const next = [...prev];
      if (next[0]) next[0] = { ...next[0], quantity: primary };
      if (next[1]) next[1] = { ...next[1], quantity: accent };
      if (next[2]) next[2] = { ...next[2], quantity: depth };
      return next;
    });
    notifications.show({
      title: 'Applied',
      message: 'Pigment counts updated (Primary/Accent/Depth).',
      color: 'green',
    });
  }, [
    selectedSystem,
    selectedMetallicPigments,
    effectiveSqft,
    metallicMoneyCoatSpreadRate,
    products,
    selectedMetallicMoneyCoat,
    setSelectedMetallicPigments,
  ]);

  // Countertops: Mix Assistant for Metallic Pigments
  const applyCountertopMixAssistant = useCallback(() => {
    if (selectedSystemGroup !== 'countertops-custom') return;
    if (selectedCountertopMetallicPigments.length === 0) {
      notifications.show({
        title: 'Add pigments first',
        message: 'Select one or more metallic pigments, then Apply to auto-allocate quantities.',
        color: 'yellow',
      });
      return;
    }
    // COUNTERTOP: Use ounce-based calculation - 4 oz per sq ft for metallic coat
    const totalOunces = effectiveSqft * 4; // 4 oz per sq ft
    const gallonsNeeded = totalOunces / 128; // 128 oz per gallon
    const kitsNeeded = Math.ceil(gallonsNeeded / 3); // 3-gal art coat kit
    const manufacturer =
      products.find((p) => p.id.toString() === (selectedCountertopMetallicArtCoat || ''))?.manufacturer || '';
    const ratioFromMfr = getBasePigmentRatio(manufacturer);
    const perKit = ratioFromMfr || countertopMetallicPigmentSpreadRate || 1;
    const computedTotal = Math.max(1, Math.ceil(kitsNeeded * perKit));
    const count = Math.max(1, selectedCountertopMetallicPigments.length);
    const totalPigments = Math.max(count, computedTotal);
    const weights = [4, 2, 1].slice(0, count);
    const parts = allocateByWeights(totalPigments, weights, count);
    const primary = parts[0] || 0;
    const accent = parts[1] || 0;
    const depth = parts[2] || 0;
    setSelectedCountertopMetallicPigments((prev) => {
      const next = [...prev];
      if (next[0]) next[0] = { ...next[0], quantity: primary };
      if (next[1]) next[1] = { ...next[1], quantity: accent };
      if (next[2]) next[2] = { ...next[2], quantity: depth };
      return next;
    });
    notifications.show({
      title: 'Applied',
      message: 'Countertop pigment counts updated (Primary/Accent/Depth).',
      color: 'green',
    });
  }, [
    selectedSystemGroup,
    selectedCountertopMetallicPigments,
    effectiveSqft,
    products,
    selectedCountertopMetallicArtCoat,
    countertopMetallicPigmentSpreadRate,
    setSelectedCountertopMetallicPigments,
  ]);

  return {
    applyMetallicMixAssistant,
    applyCountertopMixAssistant,
  };
}


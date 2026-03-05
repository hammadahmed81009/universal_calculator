import { useState, type Dispatch, type SetStateAction } from 'react';
import type { PricingMethod } from '../utils/pricing';

type Dimensions = { length: number; width: number };

export type UniversalCalculatorCoreState = {
  selectedManufacturer: string;
  setSelectedManufacturer: (v: string) => void;
  selectedSystemGroup: string;
  setSelectedSystemGroup: (v: string) => void;
  selectedSystem: string;
  setSelectedSystem: (v: string) => void;
  selectedSurfaceHardness: string;
  setSelectedSurfaceHardness: (v: string) => void;
  totalSqft: number;
  setTotalSqft: (v: number) => void;
  dimensions: Dimensions;
  setDimensions: (v: Dimensions) => void;

  pricingMethod: PricingMethod;
  setPricingMethod: (v: PricingMethod) => void;
  profitMargin: number;
  setProfitMargin: (v: number) => void;
  laborRate: number;
  setLaborRate: (v: number) => void;
  totalLaborHours: number;
  setTotalLaborHours: (v: number) => void;
  hasCalculated: boolean;
  setHasCalculated: (v: boolean) => void;
  resultQtyOverrides: Record<string, number>;
  setResultQtyOverrides: Dispatch<SetStateAction<Record<string, number>>>;
  targetPpsf: number;
  setTargetPpsf: (v: number) => void;
};

export function useUniversalCalculatorState(): UniversalCalculatorCoreState {
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('');
  const [selectedSystemGroup, setSelectedSystemGroup] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [selectedSurfaceHardness, setSelectedSurfaceHardness] = useState<string>('');
  const [totalSqft, setTotalSqft] = useState<number>(0);
  const [dimensions, setDimensions] = useState<Dimensions>({ length: 0, width: 0 });

  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('MARGIN_BASED');
  const [profitMargin, setProfitMargin] = useState<number>(50);
  const [laborRate, setLaborRate] = useState<number>(55);
  const [totalLaborHours, setTotalLaborHours] = useState<number>(0);
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);
  const [resultQtyOverrides, setResultQtyOverrides] = useState<Record<string, number>>({});
  const [targetPpsf, setTargetPpsf] = useState<number>(0);

  return {
    selectedManufacturer,
    setSelectedManufacturer,
    selectedSystemGroup,
    setSelectedSystemGroup,
    selectedSystem,
    setSelectedSystem,
    selectedSurfaceHardness,
    setSelectedSurfaceHardness,
    totalSqft,
    setTotalSqft,
    dimensions,
    setDimensions,
    pricingMethod,
    setPricingMethod,
    profitMargin,
    setProfitMargin,
    laborRate,
    setLaborRate,
    totalLaborHours,
    setTotalLaborHours,
    hasCalculated,
    setHasCalculated,
    resultQtyOverrides,
    setResultQtyOverrides,
    targetPpsf,
    setTargetPpsf,
  };
}


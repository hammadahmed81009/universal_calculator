import { useQuery } from '@tanstack/react-query';
import { dummyManufacturers } from '../data/dummyData';

export interface Manufacturer {
  id: number;
  name: string;
  logo_url?: string;
}

export function useMyManufacturers() {
  return useQuery({
    queryKey: ['manufacturers', 'dummy'],
    queryFn: (): Manufacturer[] => dummyManufacturers,
    staleTime: Infinity,
  });
}

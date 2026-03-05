import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

export interface Manufacturer {
  id: number;
  name: string;
  logo_url?: string;
}

export function useMyManufacturers() {
  return useQuery({
    queryKey: ['manufacturers'],
    queryFn: async (): Promise<Manufacturer[]> => {
      const data = await apiGet<Manufacturer[]>('/api/manufacturers/');
      return data ?? [];
    },
    staleTime: Infinity,
  });
}

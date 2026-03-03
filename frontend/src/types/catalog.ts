export type CatalogCategory = 'Resin' | 'Countertop' | 'Polish' | 'Addon';
export type AddonGroup = 'Quick Add-ons' | 'Hourly / Time-Based Labor' | 'Distance / Travel' | 'Per-Unit Tasks (Prep / Repair)' | 'Flat Surcharges / Admin';
export interface ServiceDto { id: string; name: string; category: CatalogCategory; price: number; unit: string; description: string; locked?: boolean; group?: AddonGroup; meta?: Record<string, any>; active?: boolean; }

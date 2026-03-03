// Shared labor add-on definitions for both Universal Calculator and Services
// This creates a single source of truth for labels, units, default rates, and grouping.

import type { ServiceDto, AddonGroup } from '../types/catalog';

export type LaborAddOn = {
  id: string;              // stable id used across app (e.g., 'sundries', 'remote-jobsite')
  label: string;           // display label
  unit: string;            // e.g., 'LF' | 'SF' | 'hr' | 'mi' | 'flat' | 'percent' | 'EACH' | 'SET' | 'SEAM' | 'COLOR' | 'TRIP' | 'FLIGHT'
  rate: number;            // dollars per unit (or percent when unit === 'percent')
  group: 'quick' | 'hourly' | 'distance' | 'perUnit' | 'flat';
};

// Flooring/general labor add-ons (default set)
export const flooringLaborAddOns: LaborAddOn[] = [
  // Quick Add-ons
  { id: 'control-joints-filling', label: 'Control Joints (Filling)', unit: 'LF', rate: 5.0, group: 'quick' },
  { id: 'perimeter-joints-filling', label: 'Perimeter Joints (Filling)', unit: 'LF', rate: 5.0, group: 'quick' },
  { id: 'joint-fill', label: 'Joint Fill', unit: 'LF', rate: 2.5, group: 'quick' },
  { id: 'vapor-barrier-install', label: 'Vapor Barrier Installation', unit: 'SF', rate: 2.5, group: 'quick' },
  { id: 'floor-leveling', label: 'Floor Leveling', unit: 'SF', rate: 5.0, group: 'quick' },
  { id: 'sundries', label: 'Sundries (% of materials subtotal)', unit: 'percent', rate: 5.0, group: 'quick' },
  { id: 'stem-walls', label: 'Stem Walls (Concrete) — Flat charge', unit: 'flat', rate: 200.0, group: 'quick' },
  // Hourly / Time-based
  { id: 'hourly-emp1', label: 'Hourly Labor Rate – Employee 1', unit: 'hr', rate: 45.0, group: 'hourly' },
  { id: 'hourly-emp2', label: 'Hourly Labor Rate – Employee 2', unit: 'hr', rate: 35.0, group: 'hourly' },
  { id: 'foreman', label: 'Foreman Rate', unit: 'hr', rate: 60.0, group: 'hourly' },
  { id: 'overtime', label: 'Overtime Rate', unit: 'hr', rate: 70.0, group: 'hourly' },
  { id: 'subcontractor', label: 'Subcontractor Rate', unit: 'hr', rate: 55.0, group: 'hourly' },
  { id: 'setup-teardown', label: 'Setup or Tear Down Hours', unit: 'hr', rate: 50.0, group: 'hourly' },
  { id: 'material-load-unload', label: 'Material Load/Unload Labor', unit: 'hr', rate: 45.0, group: 'hourly' },
  { id: 'after-hours', label: 'After Hours Work', unit: 'hr', rate: 75.0, group: 'hourly' },
  // Distance / Travel
  { id: 'remote-jobsite', label: 'Remote Jobsite Charge', unit: 'mi', rate: 1.0, group: 'distance' },
  { id: 'fuel-surcharge', label: 'Fuel Surcharge — Flat Fee', unit: 'flat', rate: 25.0, group: 'distance' },
  { id: 'delivery-fee', label: 'Delivery Fee — Flat Fee', unit: 'flat', rate: 100.0, group: 'distance' },
  // Per-unit tasks (prep/repair)
  { id: 'heavy-concrete-removal', label: 'Heavy Concrete Removal', unit: 'SF', rate: 6.0, group: 'perUnit' },
  { id: 'surface-grinding', label: 'Surface Grinding', unit: 'SF', rate: 3.0, group: 'perUnit' },
  { id: 'moisture-vapor-testing', label: 'Moisture Vapor Testing', unit: 'test', rate: 75.0, group: 'perUnit' },
  { id: 'crack-chasing-filling', label: 'Crack Chasing and Filling', unit: 'LF', rate: 3.0, group: 'perUnit' },
  { id: 'joint-cutting', label: 'Joint Cutting', unit: 'LF', rate: 2.0, group: 'perUnit' },
  { id: 'wood-subfloor-prep', label: 'Wood Subfloor Prep', unit: 'SF', rate: 3.0, group: 'perUnit' },
  { id: 'coating-over-tile', label: 'Coating Over Tile', unit: 'SF', rate: 2.5, group: 'perUnit' },
  { id: 'floor-height-adjustment', label: 'Floor Height Adjustment', unit: 'SF', rate: 1.5, group: 'perUnit' },
  { id: 'demo-disposal', label: 'Demo and Disposal', unit: 'SF', rate: 2.5, group: 'perUnit' },
  { id: 'major-concrete-damage', label: 'Major Concrete Damage', unit: 'SF', rate: 7.0, group: 'perUnit' },
  { id: 'minor-crack-repair', label: 'Minor Crack Repair', unit: 'LF', rate: 3.0, group: 'perUnit' },
  { id: 'tile-removal', label: 'Tile Removal', unit: 'SF', rate: 4.0, group: 'perUnit' },
  { id: 'baseboard-removal-reinstall', label: 'Baseboard Removal & Reinstall', unit: 'LF', rate: 2.0, group: 'perUnit' },
  { id: 'paint-adhesive-removal', label: 'Paint or Adhesive Removal', unit: 'SF', rate: 4.0, group: 'perUnit' },
  { id: 'grease-oil-prep', label: 'Grease/Oil Contamination Prep', unit: 'SF', rate: 5.0, group: 'perUnit' },
  { id: 'wall-taping-edge-protection', label: 'Wall Taping or Edge Protection', unit: 'LF', rate: 1.0, group: 'perUnit' },
  // Flat surcharges / admin
  { id: 'weekend-holiday-upcharge', label: 'Weekend or Holiday Upcharge', unit: 'flat', rate: 15.0, group: 'flat' },
  { id: 'permit-inspection-fees', label: 'Permit or Inspection Fees', unit: 'flat', rate: 150.0, group: 'flat' },
  { id: 'pool-on-premises', label: 'Pool on Premises', unit: 'flat', rate: 250.0, group: 'flat' },
  { id: 'custom-charge', label: 'Custom Charge — Flat Amount', unit: 'flat', rate: 0.0, group: 'flat' },
];

// Countertops-specific labor add-ons
export const countertopLaborAddOns: LaborAddOn[] = [
  // Quick: sundries only
  { id: 'sundries', label: 'Sundries (% of materials subtotal)', unit: 'percent', rate: 5.0, group: 'quick' },
  // Distance / Travel
  { id: 'remote-jobsite', label: 'Remote Jobsite Travel (one way)', unit: 'mi', rate: 1.5, group: 'distance' },
  // Per-unit tasks (epoxy over substrate)
  { id: 'substrate-prep', label: 'Substrate Prep / Sand & Clean', unit: 'SF', rate: 2.25, group: 'perUnit' },
  { id: 'seam-fill-feather', label: 'Seam Fill & Feather', unit: 'SEAM', rate: 17.5, group: 'perUnit' },
  { id: 'leveling-low-spot', label: 'Leveling / Low-Spot Fill', unit: 'SF', rate: 4.5, group: 'perUnit' },
  { id: 'build-up-edge', label: 'Build-Up Edge (thickness add)', unit: 'LF', rate: 22.5, group: 'perUnit' },
  { id: 'decorative-edge-profile', label: 'Decorative Edge Profile (bullnose/ogee)', unit: 'LF', rate: 17.5, group: 'perUnit' },
  { id: 'waterfall-edge', label: 'Waterfall Edge', unit: 'LF', rate: 90.0, group: 'perUnit' },
  { id: 'backsplash-flat', label: 'Backsplash (flat/short)', unit: 'LF', rate: 18.5, group: 'perUnit' },
  { id: 'backsplash-full-height', label: 'Full-Height Backsplash', unit: 'SF', rate: 22.5, group: 'perUnit' },
  { id: 'color-match', label: 'Color Match / Custom Tint', unit: 'COLOR', rate: 42.5, group: 'perUnit' },
  { id: 'metallic-glitter-add', label: 'Metallic/Glitter Additive', unit: 'SF', rate: 1.75, group: 'perUnit' },
  { id: 'heat-resistant-upgrade', label: 'Heat-Resistant Topcoat Upgrade', unit: 'SF', rate: 3.0, group: 'perUnit' },
  { id: 'anti-slip-additive', label: 'Anti-Slip Additive (bar tops)', unit: 'SF', rate: 0.75, group: 'perUnit' },
  { id: 'flood-coat-extra', label: 'Flood Coat (extra build)', unit: 'SF', rate: 2.25, group: 'perUnit' },
  { id: 'masking-protection', label: 'Masking & Protection', unit: 'SF', rate: 0.75, group: 'perUnit' },
  { id: 'on-site-repair', label: 'On-Site Repair (chips/scratches)', unit: 'EACH', rate: 112.5, group: 'perUnit' },
  { id: 'remove-existing-tops', label: 'Removal of Existing Pieces', unit: 'LF', rate: 18.5, group: 'perUnit' },
  { id: 'plumbing-disconnect-reconnect', label: 'Plumbing Disconnect/Reconnect', unit: 'SET', rate: 175.0, group: 'perUnit' },
  // Cutouts & Openings
  { id: 'undermount-sink-cutout', label: 'Undermount Sink Cutout & Finish', unit: 'EACH', rate: 187.5, group: 'perUnit' },
  { id: 'dropin-sink-cutout', label: 'Drop-in Sink Cutout', unit: 'EACH', rate: 112.5, group: 'perUnit' },
  { id: 'cooktop-cutout', label: 'Cooktop Cutout', unit: 'EACH', rate: 150.0, group: 'perUnit' },
  { id: 'faucet-holes', label: 'Faucet / Accessory Holes', unit: 'EACH', rate: 22.5, group: 'perUnit' },
  { id: 'outlet-switch-cutouts', label: 'Outlet / Switch Cutouts (backsplash)', unit: 'EACH', rate: 15.0, group: 'perUnit' },
  // Bars & Tables (custom pieces)
  { id: 'bar-top-flat', label: 'Bar Top (flat)', unit: 'SF', rate: 35.0, group: 'perUnit' },
  { id: 'tabletop', label: 'Tabletop', unit: 'SF', rate: 35.0, group: 'perUnit' },
  { id: 'live-edge-build-fill', label: 'Live-Edge Build/Fill', unit: 'LF', rate: 30.0, group: 'perUnit' },
  { id: 'logo-inlay', label: 'Logo/Inlay Work', unit: 'EACH', rate: 137.5, group: 'perUnit' },
  { id: 'edge-damming-forming', label: 'Edge Damming/Forming', unit: 'LF', rate: 11.5, group: 'perUnit' },
  { id: 'high-build-thickness', label: 'High-Build (extra thickness)', unit: 'SF', rate: 3.0, group: 'perUnit' },
  // Showers & Vertical Surfaces
  { id: 'shower-walls', label: 'Shower Walls (vertical epoxy finish)', unit: 'SF', rate: 22.5, group: 'perUnit' },
  { id: 'shower-pan', label: 'Shower Pan (epoxy finish)', unit: 'SF', rate: 15.0, group: 'perUnit' },
  { id: 'niches', label: 'Niches / Recessed Shelves', unit: 'EACH', rate: 85.0, group: 'perUnit' },
  { id: 'corner-shelves', label: 'Corner Shelves', unit: 'EACH', rate: 45.0, group: 'perUnit' },
  { id: 'corners-detailing', label: 'Outside/Inside Corners Detailing', unit: 'LF', rate: 15.0, group: 'perUnit' },
  { id: 'waterproofing-taping', label: 'Waterproofing/Taping Prep', unit: 'SF', rate: 3.0, group: 'perUnit' },
  // Misc / Access & Logistics
  { id: 'stairs-difficult-access', label: 'Stairs or Difficult Access', unit: 'FLIGHT', rate: 100.0, group: 'perUnit' },
  { id: 'highrise-elevator-move', label: 'High-Rise / Elevator Move', unit: 'TRIP', rate: 100.0, group: 'perUnit' },
  { id: 'minimum-trip-small-job', label: 'Minimum Trip/Small Job', unit: 'flat', rate: 250.0, group: 'flat' },
];

// Mapping from internal group key to Services UI group labels
export const serviceGroupLabel: Record<LaborAddOn['group'], AddonGroup> = {
  quick: 'Quick Add-ons',
  hourly: 'Hourly / Time-Based Labor',
  distance: 'Distance / Travel',
  perUnit: 'Per-Unit Tasks (Prep / Repair)',
  flat: 'Flat Surcharges / Admin',
};

// Convert add-on definitions to ServiceDto entries for the Services catalog UI
export function toServiceDtos(defs: LaborAddOn[], opts?: { countertop?: boolean }): ServiceDto[] {
  const unitMap: Record<string, string> = {
    hr: 'HR', mi: 'MI', flat: 'Flat', percent: '%',
    lf: 'LF', sf: 'SF', test: 'Test', each: 'EACH', set: 'SET', seam: 'SEAM', color: 'COLOR', trip: 'TRIP', flight: 'FLIGHT',
  };
  const normalizeUnit = (u: string) => unitMap[u.toLowerCase()] || u.toUpperCase();

  return defs.map((d) => ({
    id: `labor-def-${d.id}`,
    name: d.label,
    category: 'Addon',
    price: d.rate,
    unit: opts?.countertop ? (d.group === 'perUnit' ? 'CT' : normalizeUnit(d.unit)) : normalizeUnit(d.unit),
    description: '',
    group: serviceGroupLabel[d.group],
    locked: false,
    active: true,
    meta: { laborId: d.id, use: opts?.countertop ? 'countertop' : undefined },
  }));
}

// Resolve a labor add-on id from a human label
export function findLaborIdByLabel(label: string): string | undefined {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[–—]/g, '-');
  const stripParen = (s: string) => s.replace(/\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  const target = norm(label || '');
  const targetStripped = norm(stripParen(label || ''));
  const all = [...flooringLaborAddOns, ...countertopLaborAddOns];
  // 1) Exact match
  let found = all.find(d => norm(d.label) === target);
  if (found) return found.id;
  // 2) Exact match after stripping parentheses
  found = all.find(d => norm(stripParen(d.label)) === targetStripped);
  if (found) return found.id;
  // 3) Starts with or contains (robust to wording)
  found = all.find(d => {
    const n = norm(stripParen(d.label));
    return targetStripped.startsWith(n) || n.startsWith(targetStripped) || n.includes(targetStripped) || targetStripped.includes(n);
  });
  return found?.id;
}

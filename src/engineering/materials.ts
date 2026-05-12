// Aluminium alloy material data per EN 755-2 / typical mill spec.
// E and density are mechanical, well-bracketed; yield (Rp0.2) varies with
// section thickness so we use the most common value for tube/rod sections.

export interface Material {
  id: string;
  name: string;
  E: number;       // Young's modulus, N/mm²
  yield: number;   // Yield strength Rp0.2, N/mm²
  density: number; // g/cm³
  note?: string;   // short marketing line for the settings UI
}

export const MATERIALS: Record<string, Material> = {
  '6060-T6': {
    id: '6060-T6',
    name: '6060-T6',
    E: 69500,
    yield: 150,
    density: 2.70,
    note: 'Architectural; lower strength, easy extrusion',
  },
  '6061-T6': {
    id: '6061-T6',
    name: '6061-T6',
    E: 70000,
    yield: 255,
    density: 2.71,
    note: 'General structural; the film-set standard',
  },
  '6082-T6': {
    id: '6082-T6',
    name: '6082-T6',
    E: 70000,
    yield: 260,
    density: 2.70,
    note: 'High-strength structural; common in EU',
  },
};

export const DEFAULT_MATERIAL_ID = '6061-T6';
export const MATERIAL_IDS = Object.keys(MATERIALS);

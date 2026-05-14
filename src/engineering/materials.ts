// Material data per EN 755-2 / EN 10219 / ASTM standards.
// E and density are well-bracketed mechanical constants.
// Yield (Rp0.2 or Fy) uses the most common value for tube/pipe sections.

export interface Material {
  id: string;
  name: string;
  category: 'aluminium' | 'steel';
  E: number;       // Young's modulus, N/mm²
  yield: number;   // Yield strength, N/mm²
  density: number; // g/cm³
  note?: string;
}

export const MATERIALS: Record<string, Material> = {
  // ── Aluminium ────────────────────────────────────────────────────────────
  '6060-T6': {
    id: '6060-T6',
    name: '6060-T6',
    category: 'aluminium',
    E: 69500,
    yield: 150,
    density: 2.70,
    note: 'EU architectural; lower strength, easy extrusion',
  },
  '6061-T6': {
    id: '6061-T6',
    name: '6061-T6',
    category: 'aluminium',
    E: 70000,
    yield: 255,
    density: 2.71,
    note: 'General structural; the film-set standard',
  },
  '6063-T6': {
    id: '6063-T6',
    name: '6063-T6',
    category: 'aluminium',
    E: 69000,
    yield: 214,
    density: 2.70,
    note: 'US architectural; equivalent of 6060 in North America',
  },
  '6082-T6': {
    id: '6082-T6',
    name: '6082-T6',
    category: 'aluminium',
    E: 70000,
    yield: 260,
    density: 2.70,
    note: 'EU high-strength structural; common in Scandinavia',
  },

  // ── Steel (EU) ───────────────────────────────────────────────────────────
  'S235': {
    id: 'S235',
    name: 'S235',
    category: 'steel',
    E: 210000,
    yield: 235,
    density: 7.85,
    note: 'EU mild structural tube (EN 10219); most common in EU scaffolding',
  },
  'S355': {
    id: 'S355',
    name: 'S355',
    category: 'steel',
    E: 210000,
    yield: 355,
    density: 7.85,
    note: 'EU high-strength structural (EN 10219); rigging and trussing standard',
  },

  // ── Steel (US) ───────────────────────────────────────────────────────────
  'A500-B': {
    id: 'A500-B',
    name: 'A500 Gr. B',
    category: 'steel',
    E: 200000,
    yield: 317,
    density: 7.85,
    note: 'US standard structural HSS, 46 ksi (ASTM A500)',
  },
  'A500-C': {
    id: 'A500-C',
    name: 'A500 Gr. C',
    category: 'steel',
    E: 200000,
    yield: 345,
    density: 7.85,
    note: 'US high-strength structural HSS, 50 ksi (ASTM A500)',
  },
  'A53-B': {
    id: 'A53-B',
    name: 'A53 Gr. B',
    category: 'steel',
    E: 200000,
    yield: 241,
    density: 7.85,
    note: 'US standard pipe, 35 ksi (ASTM A53); entertainment rigging',
  },
};

export const DEFAULT_MATERIAL_ID = '6061-T6';
export const MATERIAL_IDS = Object.keys(MATERIALS);
export const ALUMINIUM_IDS = MATERIAL_IDS.filter((id) => MATERIALS[id].category === 'aluminium');
export const STEEL_IDS = MATERIAL_IDS.filter((id) => MATERIALS[id].category === 'steel');

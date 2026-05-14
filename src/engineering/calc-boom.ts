import { Material } from './materials';
import { calcTubeProperties, calcSelfWeight, TubeProperties, SelfWeightEffects } from './calculations';

const G = 9.81;

export interface BoomInputs {
  d_o: number;     // mm
  t: number;       // mm
  L: number;       // mm
  P_kg: number;    // kg — load fixed at right end (x = L)
  a: number;       // mm from left — support position (clamped to 0.08L–0.92L)
  DF: number;
  material: Material;
}

export interface BoomLimits {
  maxTension: number;         // N/mm²
  maxTorque: number;          // Nmm
  maxDeflection: number;      // mm (L/120)
  maxPointLoad: number;       // kg — max P before stress limit
  maxPointLoadDefl: number;   // kg — max P before deflection limit (governing tip)
  maxCombinedLoad: number;    // kg — max (P + CW) at governing limit
}

export interface BoomResults {
  props: TubeProperties;
  self: SelfWeightEffects;
  CW_kg: number;              // counterweight needed, kg
  CW_N: number;               // counterweight, N (for samplers)
  R_kg: number;               // support reaction, kg
  momentAtSupport: number;    // |M| at support, Nmm
  limits: BoomLimits;
  tension: number;            // N/mm²
  tubeWeight: number;         // kg
  combinedLoad: number;       // kg — P + CW (current)
  deflectionRightTip: number; // mm — droop at load end (x = L)
  deflectionLeftTip: number;  // mm — droop at CW end (x = 0)
  maxTipDeflection: number;   // mm — larger of the two tips
  isMomentOver: boolean;
  isTensionOver: boolean;
  isDeflectionOver: boolean;
  isLoadCapacityOver: boolean;
  momentRatio: number;
  tensionRatio: number;
  deflectionRatio: number;
  loadCapacityRatio: number;
}

export function calcResultsBoom(inputs: BoomInputs): BoomResults {
  const { d_o, t, L, P_kg, a, DF, material } = inputs;
  const b = L - a;
  const E = material.E;
  const props = calcTubeProperties(d_o, t, material.density);
  const self = calcSelfWeight(props, L, E);
  const { w, I, Z } = { w: self.w, I: props.I, Z: props.Z };
  const P_N = P_kg * G;

  // Moment balance about support → CW (self-weight included):
  // CW*a = P*b + w*(b² − a²)/2
  const CW_N = Math.max(0, (P_N * b + w * (b * b - a * a) / 2) / a);
  const CW_kg = CW_N / G;

  // Support reaction
  const R_N = CW_N + P_N + w * L;
  const R_kg = R_N / G;

  // Maximum hogging bending moment at support:
  // |M| = P*b + w*b²/2  (from substituting CW formula)
  const momentAtSupport = P_N * b + w * b * b / 2;

  // ── Limits ────────────────────────────────────────────────────────────────
  const maxTension = material.yield / DF;
  const maxTorque = maxTension * Z;
  const maxDeflection = L / 120;

  // Stress-limited max P:
  const P_max_stress_N = b > 0 ? Math.max(0, (maxTorque - w * b * b / 2) / b) : 0;
  const maxPointLoad = P_max_stress_N / G;

  // Deflection-limited max P (check both tips, take the smaller):
  //   Right tip: δ_R = P*b³/(3EI) + w*b⁴/(8EI)  ≤ L/120
  const P_max_defl_right_N =
    b > 0
      ? Math.max(0, (maxDeflection - (w * b * b * b * b) / (8 * E * I)) * (3 * E * I) / (b * b * b))
      : 0;
  //   Left tip: δ_L = P*b*a²/(3EI) + w*(b²−a²)*a²/(6EI) + w*a⁴/(8EI)  ≤ L/120
  const leftSelfDefl = (w * (b * b - a * a) * a * a) / (6 * E * I) + (w * a * a * a * a) / (8 * E * I);
  const P_max_defl_left_N =
    b > 0 && a > 0
      ? Math.max(0, (maxDeflection - leftSelfDefl) * (3 * E * I) / (b * a * a))
      : 0;
  const P_max_defl_N = Math.min(P_max_defl_right_N, P_max_defl_left_N);
  const maxPointLoadDefl = P_max_defl_N / G;

  // Max combined (P + CW) at governing limit:
  //   At stress limit: CW_max = maxTorque/a − w*a/2  (derived from CW formula)
  const P_max_gov_N = Math.min(P_max_stress_N, P_max_defl_N);
  const CW_at_max_N = Math.max(0, (P_max_gov_N * b + w * (b * b - a * a) / 2) / a);
  const maxCombinedLoad = (P_max_gov_N + CW_at_max_N) / G;

  // ── Current values ────────────────────────────────────────────────────────
  const tension = (momentAtSupport * (d_o / 2)) / I;
  const tubeWeight = (props.massPerMeter / 1000) * (L / 1000);
  const combinedLoad = P_kg + CW_kg;

  // Tip deflections (cantilever formulas from pivot outward):
  const deflectionRightTip = (P_N * b * b * b) / (3 * E * I) + (w * b * b * b * b) / (8 * E * I);
  const deflectionLeftTip = (CW_N * a * a * a) / (3 * E * I) + (w * a * a * a * a) / (8 * E * I);
  const maxTipDeflection = Math.max(deflectionRightTip, deflectionLeftTip);

  const deflectionRatio = maxTipDeflection / maxDeflection;
  const loadCapacityRatio = maxCombinedLoad > 0 ? combinedLoad / maxCombinedLoad : 1;

  return {
    props,
    self,
    CW_kg,
    CW_N,
    R_kg,
    momentAtSupport,
    limits: { maxTension, maxTorque, maxDeflection, maxPointLoad, maxPointLoadDefl, maxCombinedLoad },
    tension,
    tubeWeight,
    combinedLoad,
    deflectionRightTip,
    deflectionLeftTip,
    maxTipDeflection,
    isMomentOver: momentAtSupport > maxTorque,
    isTensionOver: tension > maxTension,
    isDeflectionOver: maxTipDeflection > maxDeflection,
    isLoadCapacityOver: loadCapacityRatio > 1,
    momentRatio: momentAtSupport / maxTorque,
    tensionRatio: tension / maxTension,
    deflectionRatio,
    loadCapacityRatio,
  };
}

// V/M/δ samplers for ForceDiagram ─────────────────────────────────────────────

export function shearAtBoom(
  x: number,
  L: number,
  P_N: number,
  a: number,
  CW_N: number,
  w: number
): number {
  const R_N = CW_N + P_N + w * L;
  return x <= a ? -CW_N - w * x : -CW_N + R_N - w * x;
}

export function momentAtBoom(
  x: number,
  L: number,
  P_N: number,
  a: number,
  CW_N: number,
  w: number
): number {
  const R_N = CW_N + P_N + w * L;
  const base = -CW_N * x - (w * x * x) / 2;
  return x <= a ? base : base + R_N * (x - a);
}

/**
 * Deflection at x along a boom: both ends droop away from the pivot at `a`.
 * Models each side as an independent cantilever fixed at the support.
 * Returns positive = downward.
 */
export function deflectionAtBoom(
  x: number,
  L: number,
  I: number,
  P_N: number,
  a: number,
  CW_N: number,
  w: number,
  E: number
): number {
  const b = L - a;
  if (x <= a) {
    const xi = a - x;
    const d_cw = (CW_N / (6 * E * I)) * xi * xi * (3 * a - xi);
    const d_w = (w / (24 * E * I)) * xi * xi * (6 * a * a - 4 * a * xi + xi * xi);
    return d_cw + d_w;
  } else {
    const xi = x - a;
    const d_p = (P_N / (6 * E * I)) * xi * xi * (3 * b - xi);
    const d_w = (w / (24 * E * I)) * xi * xi * (6 * b * b - 4 * b * xi + xi * xi);
    return d_p + d_w;
  }
}

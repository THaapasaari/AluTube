/**
 * Simply supported beam with TWO point loads P1 (at a1) and P2 (at a2) from the
 * left support, plus self-weight UDL w. Distances are measured from the left
 * support; a1 and a2 can be in any order.
 */
import { calcTubeProperties, calcSelfWeight, deflectionAt, TubeProperties, SelfWeightEffects, Limits } from './calculations';
import { Material } from './materials';

const G = 9.81;
const N_SAMPLES = 100;

export interface TwoLoadsInputs {
  d_o: number;
  t: number;
  L: number;
  P1_kg: number;
  a1: number;     // mm from left
  P2_kg: number;
  a2: number;     // mm from left
  DF: number;
  material: Material;
}

export interface TwoLoadsResults {
  props: TubeProperties;
  self: SelfWeightEffects;
  maxDeflection: number;     // mm, magnitude of largest deflection along beam
  xOfMaxDeflection: number;  // mm, position where it occurs
  maxMoment: number;         // Nmm
  xOfMaxMoment: number;      // mm
  tension: number;           // N/mm² at max moment section
  limits: Limits;
  /** Multiplier k such that scaling BOTH loads by k reaches the first limit. */
  scaleAtFirstLimit: number;
  tubeWeight: number;
  totalLoad: number;
  isDeflectionOver: boolean;
  isTensionOver: boolean;
  isTorqueOver: boolean;
  deflectionRatio: number;
  tensionRatio: number;
  torqueRatio: number;
}

/** Deflection at x with two point loads and a UDL, by superposition. */
export function deflectionAtTwoLoads(
  x: number,
  L: number,
  I: number,
  P1: number, a1: number,
  P2: number, a2: number,
  w: number,
  E: number
): number {
  // δ from UDL (already correct in deflectionAt with P=0)
  const dW = deflectionAt(x, L, I, 0, L / 2, w, E);
  // δ from each point load (with w=0 to isolate the load contribution)
  const d1 = deflectionAt(x, L, I, P1, a1, 0, E);
  const d2 = deflectionAt(x, L, I, P2, a2, 0, E);
  return dW + d1 + d2;
}

/** Bending moment at x for the two-load simply supported beam. */
export function momentAtTwoLoads(
  x: number,
  L: number,
  P1: number, a1: number,
  P2: number, a2: number,
  w: number
): number {
  const R_A = (P1 * (L - a1) + P2 * (L - a2) + w * L * L / 2) / L;
  let M = R_A * x - (w * x * x) / 2;
  if (x > a1) M -= P1 * (x - a1);
  if (x > a2) M -= P2 * (x - a2);
  return M;
}

/** Shear at x. */
export function shearAtTwoLoads(
  x: number,
  L: number,
  P1: number, a1: number,
  P2: number, a2: number,
  w: number
): number {
  const R_A = (P1 * (L - a1) + P2 * (L - a2) + w * L * L / 2) / L;
  let V = R_A - w * x;
  if (x > a1) V -= P1;
  if (x > a2) V -= P2;
  return V;
}

export function calcResultsTwoLoads(inputs: TwoLoadsInputs): TwoLoadsResults {
  const { d_o, t, L, P1_kg, a1, P2_kg, a2, DF, material } = inputs;
  const props = calcTubeProperties(d_o, t, material.density);
  const self = calcSelfWeight(props, L, material.E);
  const P1 = P1_kg * G;
  const P2 = P2_kg * G;

  // Sample deflection and moment to find maxima
  let maxDefl = 0;
  let xOfMaxDefl = 0;
  let maxMoment = 0;
  let xOfMaxMoment = 0;

  for (let i = 0; i <= N_SAMPLES; i++) {
    const x = (i / N_SAMPLES) * L;
    const δ = deflectionAtTwoLoads(x, L, props.I, P1, a1, P2, a2, self.w, material.E);
    if (Math.abs(δ) > Math.abs(maxDefl)) {
      maxDefl = δ;
      xOfMaxDefl = x;
    }
    const M = momentAtTwoLoads(x, L, P1, a1, P2, a2, self.w);
    if (Math.abs(M) > Math.abs(maxMoment)) {
      maxMoment = M;
      xOfMaxMoment = x;
    }
  }

  const tension = (Math.abs(maxMoment) * (d_o / 2)) / props.I;

  // Limits
  const maxDeflLimit = L / 120;
  const maxTension = material.yield / DF;
  const maxTorque = (material.yield / DF) * props.Z;

  // Find the scale factor k where BOTH loads are scaled by k that first reaches
  // a limit. Iterate ratios for each limit.
  // 1) δ scales linearly with k for point-load part. With self-weight constant.
  //    Define δ(k) = δ_self_at_xmax + k * δ_point_at_xmax. The δ_point part is
  //    Δp = maxDefl − δ_self_only_at_xmax_position. Compute by removing self.
  // Easier: numerical bisection or analytic linear.
  const dSelfAtMax = deflectionAt(xOfMaxDefl, L, props.I, 0, L / 2, self.w, material.E);
  const dPointPartAtMax = maxDefl - dSelfAtMax;
  // δ_self + k·dPointPart = maxDeflLimit  ⇒  k = (limit − dSelf) / dPointPart
  const kDefl =
    dPointPartAtMax > 0 ? (maxDeflLimit - dSelfAtMax) / dPointPartAtMax : Infinity;

  // 2) M = M_self_at_xmax + k * M_point_part_at_xmax
  const Mself_at_xM = momentAtTwoLoads(xOfMaxMoment, L, 0, a1, 0, a2, self.w);
  const Mpoint_part = Math.abs(maxMoment) - Mself_at_xM;
  const kMoment = Mpoint_part > 0 ? (maxTorque - Mself_at_xM) / Mpoint_part : Infinity;

  const scaleAtFirstLimit = Math.min(kDefl, kMoment);

  const tubeWeight = (props.massPerMeter / 1000) * (L / 1000);
  const totalLoad = tubeWeight + P1_kg + P2_kg;

  return {
    props,
    self,
    maxDeflection: maxDefl,
    xOfMaxDeflection: xOfMaxDefl,
    maxMoment: maxMoment,
    xOfMaxMoment,
    tension,
    limits: {
      maxDeflection: maxDeflLimit,
      maxTension,
      maxTorque,
      maxPointLoad: 0,        // unused for two-loads
      maxPointLoadStress: 0,  // unused for two-loads
    },
    scaleAtFirstLimit,
    tubeWeight,
    totalLoad,
    isDeflectionOver: Math.abs(maxDefl) > maxDeflLimit,
    isTensionOver: tension > maxTension,
    isTorqueOver: Math.abs(maxMoment) > maxTorque,
    deflectionRatio: Math.abs(maxDefl) / maxDeflLimit,
    tensionRatio: tension / maxTension,
    torqueRatio: Math.abs(maxMoment) / maxTorque,
  };
}

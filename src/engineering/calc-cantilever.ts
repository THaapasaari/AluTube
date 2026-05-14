/**
 * Cantilever beam — fixed at x=0, free at x=L. Single point load P at distance `a`
 * from the fixed end (0 ≤ a ≤ L), plus self-weight UDL w along the full length.
 */
import { calcTubeProperties, calcSelfWeight, TubeProperties, SelfWeightEffects, Limits } from './calculations';
import { Material } from './materials';

const G = 9.81;

export interface CantileverInputs {
  d_o: number;
  t: number;
  L: number;
  P_kg: number;
  a: number;         // distance from fixed end, mm. Use L for load at tip.
  DF: number;
  material: Material;
}

export interface CantileverResults {
  props: TubeProperties;
  self: SelfWeightEffects;     // δ_self at tip; M_self at fixed end
  pointDeflectionTip: number;  // mm  (deflection at tip due to point load)
  pointMomentFixed: number;    // Nmm (moment at fixed end due to point load)
  totalDeflectionTip: number;  // mm
  totalMomentFixed: number;    // Nmm
  tension: number;             // N/mm² at fixed end
  limits: Limits;
  tubeWeight: number;
  totalLoad: number;
  isDeflectionOver: boolean;
  isTensionOver: boolean;
  isTorqueOver: boolean;
  deflectionRatio: number;
  tensionRatio: number;
  torqueRatio: number;
}

/** Self-weight effects for a cantilever (tip deflection, fixed-end moment). */
function cantileverSelf(props: TubeProperties, L: number, E: number): SelfWeightEffects {
  const w = (props.massPerMeter / 1000) * G / 1000; // N/mm
  // Max deflection at tip: w·L⁴ / (8·E·I)
  const deltaS = (w * L ** 4) / (8 * E * props.I);
  // Max moment at fixed end: w·L² / 2
  const Mself = (w * L ** 2) / 2;
  return { w, deltaS, Mself };
}

/** Tip deflection of a cantilever under a single point load at distance `a` from fixed end.
 *  δ_tip = P·a²·(3L − a) / (6·E·I)
 */
function cantileverPointTipDeflection(P_N: number, L: number, a: number, I: number, E: number): number {
  return (P_N * a ** 2 * (3 * L - a)) / (6 * E * I);
}

/** Deflection along a cantilever at position x, due to a point load at `a` and UDL w.
 *  Uses the standard 4th-order Euler-Bernoulli result split at x=a.
 */
export function deflectionAtCantilever(
  x: number,
  L: number,
  I: number,
  P: number,
  a: number,
  w: number,
  E: number
): number {
  // UDL contribution: y_w(x) = (w·x²/(24·E·I)) · (x² − 4·L·x + 6·L²)
  const yW = (w * x * x * (x ** 2 - 4 * L * x + 6 * L * L)) / (24 * E * I);
  // Point load contribution
  let yP = 0;
  if (x <= a) {
    yP = (P * x * x * (3 * a - x)) / (6 * E * I);
  } else {
    yP = (P * a * a * (3 * x - a)) / (6 * E * I);
  }
  return yW + yP;
}

export function calcResultsCantilever(inputs: CantileverInputs): CantileverResults {
  const { d_o, t, L, P_kg, a, DF, material } = inputs;
  const props = calcTubeProperties(d_o, t, material.density);
  const self = cantileverSelf(props, L, material.E);
  const P_N = P_kg * G;

  const pointDeflectionTip = cantileverPointTipDeflection(P_N, L, a, props.I, material.E);
  const pointMomentFixed = P_N * a; // moment at fixed end due to point load
  const totalDeflectionTip = self.deltaS + pointDeflectionTip;
  const totalMomentFixed = self.Mself + pointMomentFixed;
  const tension = (totalMomentFixed * (d_o / 2)) / props.I;

  // Limits
  const maxDeflection = L / 120;
  const maxTension = material.yield / DF;
  const maxTorque = (material.yield / DF) * props.Z;

  // Max safe point load — deflection-limited
  const availDefl = maxDeflection - self.deltaS;
  const refDefl = a > 0 ? (1 * G * a ** 2 * (3 * L - a)) / (6 * material.E * props.I) : 0;
  const maxPointLoad =
    availDefl > 0 && refDefl > 0 ? availDefl / refDefl : 0;

  // Max safe point load — stress-limited (moment at fixed end)
  const availMoment = maxTorque - self.Mself;
  const refMoment = a > 0 ? 1 * G * a : 0;
  const maxPointLoadStress =
    availMoment > 0 && refMoment > 0 ? availMoment / refMoment : 0;

  const limits: Limits = {
    maxDeflection,
    maxTension,
    maxTorque,
    maxPointLoad,
    maxPointLoadStress,
  };

  const tubeWeight = (props.massPerMeter / 1000) * (L / 1000);
  const totalLoad = tubeWeight + P_kg;

  return {
    props,
    self,
    pointDeflectionTip,
    pointMomentFixed,
    totalDeflectionTip,
    totalMomentFixed,
    tension,
    limits,
    tubeWeight,
    totalLoad,
    isDeflectionOver: totalDeflectionTip > maxDeflection,
    isTensionOver: tension > maxTension,
    isTorqueOver: totalMomentFixed > maxTorque,
    deflectionRatio: totalDeflectionTip / maxDeflection,
    tensionRatio: tension / maxTension,
    torqueRatio: totalMomentFixed / maxTorque,
  };
}

// 6061-T6 aluminium material constants
const E = 70000;        // N/mm²  Young's modulus
const RHO = 2.71;       // g/cm³  density
const SIGMA_YIELD = 255; // N/mm²  yield strength
const G = 9.81;          // m/s²

export interface TubeProperties {
  d_o: number;   // outer diameter mm
  d_i: number;   // inner diameter mm
  t: number;     // wall thickness mm
  A: number;     // cross-sectional area mm²
  I: number;     // second moment of area mm⁴
  Z: number;     // section modulus mm³
  massPerMeter: number; // g/m
}

export interface SelfWeightEffects {
  w: number;       // distributed load N/mm
  deltaS: number;  // self-weight mid-span deflection mm
  Mself: number;   // self-weight bending moment Nmm
}

export interface PointLoadEffects {
  deltaPoint: number; // deflection at load point (or max) mm
  Mpoint: number;     // bending moment at load point Nmm
}

export interface Limits {
  maxDeflection: number;  // mm  (L/120)
  maxTension: number;     // N/mm²
  maxTorque: number;      // Nmm
  maxPointLoad: number;   // kg  (deflection-limited)
  maxPointLoadStress: number; // kg (stress-limited)
}

export interface CalcResults {
  props: TubeProperties;
  self: SelfWeightEffects;
  point: PointLoadEffects;
  limits: Limits;
  totalDelta: number;   // mm
  totalMoment: number;  // Nmm
  tension: number;      // N/mm²
  tubeWeight: number;   // kg
  totalLoad: number;    // kg (tube weight + point load)
  isDeflectionOver: boolean;
  isTensionOver: boolean;
  isTorqueOver: boolean;
  deflectionRatio: number;  // 0–1+
  tensionRatio: number;
  torqueRatio: number;
}

export function calcTubeProperties(d_o: number, t: number): TubeProperties {
  const d_i = d_o - 2 * t;
  const A = (Math.PI / 4) * (d_o ** 2 - d_i ** 2);
  const I = (Math.PI / 64) * (d_o ** 4 - d_i ** 4);
  const Z = I / (d_o / 2);
  const massPerMeter = A * RHO; // g/m
  return { d_o, d_i, t, A, I, Z, massPerMeter };
}

export function calcSelfWeight(props: TubeProperties, L: number): SelfWeightEffects {
  // w in N/mm: massPerMeter [g/m] → [kg/m] → [N/m] → [N/mm]
  const w = (props.massPerMeter / 1000) * G / 1000;
  const deltaS = (5 * w * L ** 4) / (384 * E * props.I);
  const Mself = (w * L ** 2) / 8;
  return { w, deltaS, Mself };
}

export function calcPointLoad(
  P_kg: number,
  L: number,
  I: number,
  isCenter: boolean,
  a?: number  // distance from near end, mm — ignored when isCenter
): PointLoadEffects {
  const P = P_kg * G; // N
  let deltaPoint: number;
  let Mpoint: number;

  if (isCenter) {
    deltaPoint = (P * L ** 3) / (48 * E * I);
    Mpoint = (P * L) / 4;
  } else {
    const aVal = a ?? L / 2;
    const b = L - aVal;
    // Roark — max deflection always occurs in the LONGER segment
    const longer = Math.max(aVal, b);
    deltaPoint =
      (P * longer * (L ** 2 - longer ** 2) ** 1.5) /
      (9 * Math.sqrt(3) * E * I * L);
    Mpoint = (P * aVal * b) / L;
  }

  return { deltaPoint, Mpoint };
}

export function calcLimits(
  L: number,
  props: TubeProperties,
  self: SelfWeightEffects,
  DF: number,
  isCenter: boolean,
  a?: number
): Limits {
  const maxDeflection = L / 120;
  const maxTension = SIGMA_YIELD / DF;
  const maxTorque = (SIGMA_YIELD / DF) * props.Z; // Nmm

  // Use a 1 kg reference load to get the per-kg deflection and moment for
  // *this exact position*. Then scale up to find the load that reaches each limit.
  const ref = calcPointLoad(1, L, props.I, isCenter, a);

  const availDefl = maxDeflection - self.deltaS;
  const maxPointLoad =
    availDefl > 0 && ref.deltaPoint > 0 ? availDefl / ref.deltaPoint : 0;

  const availMoment = maxTorque - self.Mself;
  const maxPointLoadStress =
    availMoment > 0 && ref.Mpoint > 0 ? availMoment / ref.Mpoint : 0;

  return { maxDeflection, maxTension, maxTorque, maxPointLoad, maxPointLoadStress };
}

export interface CalcInputs {
  d_o: number;      // mm
  t: number;        // mm
  L: number;        // mm
  P_kg: number;     // kg
  isCenter: boolean;
  a?: number;       // mm from near end (off-centre only)
  DF: number;
}

export function calcResults(inputs: CalcInputs): CalcResults {
  const { d_o, t, L, P_kg, isCenter, a, DF } = inputs;
  const props = calcTubeProperties(d_o, t);
  const self = calcSelfWeight(props, L);
  const point = calcPointLoad(P_kg, L, props.I, isCenter, a);
  const limits = calcLimits(L, props, self, DF, isCenter, a);

  const totalDelta = self.deltaS + point.deltaPoint;
  const totalMoment = self.Mself + point.Mpoint;
  const tension = (totalMoment * (d_o / 2)) / props.I;
  const tubeWeight = (props.massPerMeter / 1000) * (L / 1000); // kg
  const totalLoad = tubeWeight + P_kg;

  return {
    props,
    self,
    point,
    limits,
    totalDelta,
    totalMoment,
    tension,
    tubeWeight,
    totalLoad,
    isDeflectionOver: totalDelta > limits.maxDeflection,
    isTensionOver: tension > limits.maxTension,
    isTorqueOver: totalMoment > limits.maxTorque,
    deflectionRatio: totalDelta / limits.maxDeflection,
    tensionRatio: tension / limits.maxTension,
    torqueRatio: totalMoment / limits.maxTorque,
  };
}

// ── Unit conversions ──────────────────────────────────────────────────────────

export const mmToIn = (mm: number) => mm / 25.4;
export const inToMm = (inches: number) => inches * 25.4;
export const mToFt = (m: number) => m * 3.28084;
export const ftToM = (ft: number) => ft / 3.28084;
export const kgToLbs = (kg: number) => kg * 2.20462;
export const lbsToKg = (lbs: number) => lbs / 2.20462;
export const NmToFtLb = (Nm: number) => Nm * 0.737562;

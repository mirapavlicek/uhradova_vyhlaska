import type { AcuteCommon, CasePaymentInputs, PuInputs, SeparatedInputs, Under50Inputs } from './acute'
import type { AmbInputs } from './ambulance'
import type { CentreDrugInputs } from './centreDrugs'
import { DEFAULT_CL_GROUPS, DEFAULT_PARAMS, type DecreeParams } from './params'

export const SCENARIO_VERSION = 1

export interface Scenario {
  version: number
  name: string
  params: DecreeParams
  common: AcuteCommon
  pu: PuInputs
  separated: SeparatedInputs
  casePayment: CasePaymentInputs
  under50: Under50Inputs
  amb: AmbInputs
  cl: CentreDrugInputs
}

/** Modelový okresní poskytovatel akutní péče (ilustrační data, nikoli skutečný subjekt). */
export function defaultScenario(): Scenario {
  return {
    version: SCENARIO_VERSION,
    name: 'Modelová nemocnice – výchozí scénář',
    params: structuredClone(DEFAULT_PARAMS),
    common: {
      providerType: 'urg',
      vaccinationMet: false,
      cmAllInsurers2025: 30_000,
      casesAllInsurers2025: 24_000,
      insurerDistrictShare: 0.55,
    },
    pu: {
      cm2025A: 9_000,
      cm2025AtoD: 14_000,
      cm2025D: 3_000,
      uhrPu2025: 1_000_000_000,
      uhrEu2025: 60_000_000,
      uhrIsu2025: 40_000_000,
      em2025: 20_000_000,
      cm2027AD: 12_400,
      cm2027Transfer: 600,
      cases2025: 9_000,
      cases2027: 9_300,
      transfers2025: 500,
      transfers2027: 560,
      em2027: 21_000_000,
    },
    separated: {
      rows: [
        { id: 'c1', name: 'Kardiochirurgie / intervence (C)', cmDrg: 300, cmJpl: 280, kc: 1 },
        { id: 'e1', name: 'Cévní mozkové příhody (E)', cmDrg: 250, cmJpl: 200, kc: 1 },
      ],
      cmPovinneJpl: 50,
      nmCeTier: 'none',
      cmCmp: 200,
      mrsMet: true,
      em: 3_000_000,
    },
    casePayment: {
      rows: [
        { id: 'b1', name: 'Skupina B', cmDrg: 800, cmJpl: 750, kc: 1 },
        { id: 'f1', name: 'Skupina F', cmDrg: 400, cmJpl: 420, kc: 1 },
        { id: 'g1', name: 'Skupina G', cmDrg: 200, cmJpl: 150, kc: 1 },
      ],
      cmPovinneJpl: 120,
      cmDeti: 0,
      cmH2027: 350,
      losMedian2025: 21,
      losMedian2027: 19,
      kdz: { kpKritMet: true, cdz: 'standard', ds: '00043', plnlp2018: 300, plnlp2027: 220, plnlp2030: 180 },
      em: 5_000_000,
    },
    under50: {
      cmAD: 30,
      cmH: 0,
      kdz: { kpKritMet: false, cdz: 'none', ds: 'none', plnlp2018: 0, plnlp2027: 0, plnlp2030: 0 },
      rows: [{ id: 'u1', name: 'Skupiny B–G', cmDrg: 8, cmJpl: 6, kc: 1 }],
      cmPovinneJpl: 2,
      em: 0,
    },
    amb: {
      uhrAmb2025: 180_000_000,
      hpRefTotal: 210_000_000,
      segments: {
        lab: { hpRef: 60_000_000, base2025: 62_000_000, base2027: 65_000_000, bon2025: 0.02, bon2027: 0.03 },
        rad: { hpRef: 40_000_000, base2025: 42_000_000, base2027: 45_000_000, bon2025: 0.02, bon2027: 0.02 },
        ost: { hpRef: 90_000_000, base2025: 95_000_000, base2027: 103_000_000, bon2025: 0.03, bon2027: 0.05 },
      },
      gaup2025: 48_000,
      gaup2027: 50_500,
    },
    cl: {
      rows: DEFAULT_CL_GROUPS.map((g) => {
        const sample: Record<string, [number, number]> = {
          m: [120_000_000, 135_000_000],
          n: [40_000_000, 44_000_000],
          j: [60_000_000, 62_000_000],
          o: [30_000_000, 36_000_000],
          e: [25_000_000, 27_000_000],
        }
        const [p25, p27] = sample[g.id] ?? [0, 0]
        return { groupId: g.id, prod2025: p25, prod2027: p27 }
      }),
    },
  }
}

/** Doplní chybějící klíče (např. po přidání parametrů do nové verze aplikace). */
export function normalizeScenario(raw: unknown): Scenario {
  const base = defaultScenario()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<Scenario>
  const merged: Scenario = {
    ...base,
    ...r,
    version: SCENARIO_VERSION,
    params: { ...base.params, ...(r.params ?? {}) },
    common: { ...base.common, ...(r.common ?? {}) },
    pu: { ...base.pu, ...(r.pu ?? {}) },
    separated: { ...base.separated, ...(r.separated ?? {}) },
    casePayment: { ...base.casePayment, ...(r.casePayment ?? {}) },
    under50: { ...base.under50, ...(r.under50 ?? {}) },
    amb: { ...base.amb, ...(r.amb ?? {}) },
    cl: { ...base.cl, ...(r.cl ?? {}) },
  }
  merged.params.zsMin = { ...base.params.zsMin, ...(r.params?.zsMin ?? {}) }
  merged.params.nm = { ...base.params.nm, ...(r.params?.nm ?? {}) }
  merged.params.izp = { ...base.params.izp, ...(r.params?.izp ?? {}) }
  merged.params.izpAmb = { ...base.params.izpAmb, ...(r.params?.izpAmb ?? {}) }
  merged.params.izpCl = { ...base.params.izpCl, ...(r.params?.izpCl ?? {}) }
  merged.params.kn = { ...base.params.kn, ...(r.params?.kn ?? {}) }
  merged.params.kdz = { ...base.params.kdz, ...(r.params?.kdz ?? {}) }
  merged.amb.segments = {
    lab: { ...base.amb.segments.lab, ...(r.amb?.segments?.lab ?? {}) },
    rad: { ...base.amb.segments.rad, ...(r.amb?.segments?.rad ?? {}) },
    ost: { ...base.amb.segments.ost, ...(r.amb?.segments?.ost ?? {}) },
  }
  merged.casePayment.kdz = { ...base.casePayment.kdz, ...(r.casePayment?.kdz ?? {}) }
  merged.under50.kdz = { ...base.under50.kdz, ...(r.under50?.kdz ?? {}) }
  return merged
}

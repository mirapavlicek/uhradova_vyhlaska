import type { AcuteCommon, CasePaymentInputs, PuInputs, SeparatedInputs, Under50Inputs } from './acute'
import type { AftercareInputs } from './aftercare'
import type { AmbInputs } from './ambulance'
import type { CentreDrugInputs } from './centreDrugs'
import type { DentalInputs } from './dental'
import type { DialysisInputs } from './dialysis'
import type { GpInputs } from './gp'
import type { GynInputs } from './gyn'
import type { HomecareInputs, Odb913Inputs, PalliativeInputs } from './homecare'
import type { HospitalRegulationInputs } from './hospitalRegulation'
import { DEFAULT_RDG_GROUPS, type LabsInputs } from './labs'
import { DEFAULT_ONE_DAY_ROWS, type OneDayInputs } from './oneDay'
import { DEFAULT_CL_GROUPS, DEFAULT_PARAMS, GP_AGE_GROUPS, type DecreeParams } from './params'
import type { OtherInputs } from './other'
import type { PhysioInputs } from './physio'
import type { PuroInputs } from './puro'
import { SEGMENT_IDS, scopeOf, type Scope, type SegmentId } from './segments'
import type { SpecialistsInputs } from './specialists'
import type { UrgentInputs } from './urgent'

export const SCENARIO_VERSION = 3

export interface ProviderInfo {
  name: string
  ico: string
  /** zkratka zdravotní pojišťovny podle přílohy č. 9 */
  insurer: string
  district: string
  region: string
  /** statusy center vysoce specializované péče (příl. 10) – určují koeficient centralizace KC */
  centres: string[]
  /** podíl úhrady za služby vykázané po 31. 3. 2028 (§ 2 odst. 4 – koeficient 0,95) */
  lateShare: number
}

export interface AdvanceInputs {
  /** úhrada za referenční období 2025 po segmentech (0 = odvodit ze vstupů segmentu) */
  refUhr: Record<SegmentId, number>
  /** změny v rozsahu a struktuře služeb zahrnuté do předběžné úhrady (Kč za rok) */
  adjust: Record<SegmentId, number>
  /** úhrada radiodiagnostiky (příl. 5 bod 3) za referenční období */
  refRdg: number
}

const zeroBySegment = () => Object.fromEntries(SEGMENT_IDS.map((id) => [id, 0])) as Record<SegmentId, number>

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
  urgent: UrgentInputs
  aftercare: AftercareInputs
  hospitalReg: HospitalRegulationInputs
  oneDay: OneDayInputs
  gp: GpInputs
  gyn: GynInputs
  specialists: SpecialistsInputs
  physio: PhysioInputs
  homecare: HomecareInputs
  palliative: PalliativeInputs
  odb913: Odb913Inputs
  labs: LabsInputs
  dialysis: DialysisInputs
  dental: DentalInputs
  other: OtherInputs
  provider: ProviderInfo
  scope: Scope
  advances: AdvanceInputs
}

function puro(partial: Partial<PuroInputs> = {}): PuroInputs {
  return {
    uhrRef: 6_000_000,
    popRef: 3_000,
    pbRef: 5_500_000,
    kpRef: 400_000,
    popZ: 3_050,
    popMh: 40,
    uhrMh: 900_000,
    uhrMr: 800_000,
    pbHo: 5_900_000,
    kpHo: 430_000,
    newServices: 0,
    ...partial,
  }
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
    urgent: {
      k: 0.55,
      kRegion: 0.5,
      tier: 'III',
      outage: false,
      lpsAdults: true,
      lpsChildren: true,
      ckp: 'none',
      pbUrg: 30_000_000,
      pbLps: 6_000_000,
      pbKv: 9_000_000,
      kpUrg: 2_000_000,
      count09564: 4_500,
      count78890: 0,
      palliativeTeam: 'reduced',
      oncoCentre: false,
      count51887: 0,
      centrumProvazeni: false,
      provazeniChildren: 0,
      ernMember: false,
      ern: [{ id: 'ern1', name: 'ERN 1', uop: 40 }],
      od3132Days: 400,
      points005: 0,
    },
    aftercare: {
      rows: [
        { id: 'n1', od: '00005', name: 'Následná péče (LDN)', ps2026: 2_950, days: 28_000, pediatric: false },
        { id: 'n2', od: '00024', name: 'Rehabilitační lůžka', ps2026: 3_400, days: 9_000, pediatric: false },
        { id: 'n3', od: '00030', name: 'Lůžkový hospic', ps2026: 3_900, days: 3_000, pediatric: false },
      ],
      personnel: { woundNurse: true, nutrition: true, ergo: false, logo: false, psycho: false },
      technical: { beds25: true, electricBeds: true },
      transformationPlan: false,
      kTransNlp: 1,
      accreditation: false,
      palliativeDoctor: true,
      geriatrician: false,
      geriatristFte: 0.5,
      bedsOd24: 60,
      msShareOver65: false,
      u572ShareOver50: false,
      u572Days: 0,
      pointsOd00015: 0,
      pointsOd00017: 3_000_000,
      pointsOd00020: 0,
      pointsOd00033: 0,
      pointsOd00018: 0,
      contractDays: 0,
      contractRate2026: 0,
      od9091Days: { od00090: [0, 0, 0], od00091: [0, 0, 0] },
      fees: { v09535: 1_200, v09536: 800, v09537: 300 },
      em: 1_500_000,
    },
    hospitalReg: {
      revisions: [
        { id: 'r1', name: 'Jednotlivý případ', type: 'single', cmOriginal: 4.2, cmRevised: 2.8, cmBase: 0 },
        { id: 'r2', name: 'DRG báze – náhodný vzorek', type: 'minor', cmOriginal: 60, cmRevised: 56, cmBase: 900 },
      ],
      gaup: 48_000,
      ambPerformanceBase: 160_000_000,
      exempt: false,
      drugs: { avgRef: 4_200, avgHo: 4_600 },
      requested: { avgRef: 1_800, avgHo: 1_900 },
    },
    oneDay: { rows: structuredClone(DEFAULT_ONE_DAY_ROWS), em: 150_000 },
    gp: {
      specialty: '001',
      regime: 'a',
      ages: Object.fromEntries(GP_AGE_GROUPS.map((g) => [g.id, g.id === 'a0' || g.id === 'a5' || g.id === 'a10' || g.id === 'a15' ? 10 : g.id === 'a85' ? 40 : 60])),
      bonusEducation: true,
      bonusPrevention: true,
      bonusAccreditation: false,
      pbPrevention: 180_000,
      pbSelected: 120_000,
      pbOther: 350_000,
      hbEducation: true,
      hbExtendedHours: true,
      episodes18: 4_500,
      zumZulp: 60_000,
      kpp: 0.55,
      pocusMonths: 12,
      pocusCount: 160,
      teamMonths: 0,
      teamFte: 1.5,
      nurseMonths: 12,
      nurseEpisodesShort: 80,
      nurseEpisodesLong: 60,
      nurseEpisodes: 140,
      regulation: {
        exempt: false,
        drugsNational: 5_200,
        drugsProvider: 5_600,
        incontNational: 300,
        incontProvider: 280,
        requestedNational: 1_900,
        requestedProvider: 2_300,
        physioNational: 250,
        physioProvider: 240,
      },
    },
    gyn: {
      registeredWomen: 2_400,
      months: 12,
      education: true,
      hours: true,
      accreditation: 'none',
      iso: false,
      prevention45: true,
      team: false,
      teamMidwife: false,
      ultrasoundOk: true,
      pregnancies: [95, 90, 88],
      geneticShare: 0.15,
      ultrasoundShare: 0.35,
      pregnantCount: 95,
      infertilityCount: 30,
      episodes18: 3_100,
      nonRegisteredPoints: 60_000,
      zumZulp: 90_000,
      upHo: 2_900,
      regulation: { exempt: false, drugs: { avgRef: 1_100, avgHo: 1_150 }, requested: { avgRef: 900, avgHo: 1_050 } },
    },
    specialists: {
      hbBase: 0.98,
      education: true,
      hours: true,
      newPatients: 'partial',
      ordering: true,
      odb903: false,
      odbGroup: 'g6',
      hoursPerWeek: 40,
      puro: puro(),
      regulation: {
        exempt: false,
        zulp: { avgRef: 300, avgHo: 320 },
        drugs: { avgRef: 3_800, avgHo: 4_500 },
        requested: { avgRef: 1_500, avgHo: 1_600 },
      },
    },
    physio: {
      neuroTraumaShare: false,
      lowBasicShare: true,
      highIndividualShare: false,
      education: true,
      exemptPoints: 300_000,
      exemptKp: 0,
      earlyStarts: [
        { id: 'e1', days: 5, count: 30 },
        { id: 'e2', days: 10, count: 20 },
      ],
      puro: puro({ uhrRef: 4_200_000, popRef: 1_800, pbRef: 5_600_000, kpRef: 20_000, popZ: 1_850, popMh: 15, uhrMh: 250_000, uhrMr: 220_000, pbHo: 6_100_000, kpHo: 25_000 }),
    },
    homecare: {
      odb: '925',
      telemetryShare: true,
      specialisedShare: false,
      severeDgShare: false,
      exemptPoints: 400_000,
      exemptKp: 0,
      puro: puro({ uhrRef: 3_600_000, popRef: 420, pbRef: 3_500_000, kpRef: 50_000, popZ: 430, popMh: 6, uhrMh: 300_000, uhrMr: 280_000, pbHo: 3_900_000, kpHo: 55_000 }),
      other: { points914: 0, points921: 0, kp: 0, transportPoints: 150_000 },
    },
    palliative: {
      psychologist: true,
      socialWorker: true,
      popAdults: 120,
      popChildren: 2,
      pb80091: 1_200,
      pointsDays: 4_600_000,
      pointsOther: 300_000,
      deductions: 20_000,
    },
    odb913: {
      severeDgShare: true,
      uhrRef: 1_500_000,
      patientMonthsRef: 900,
      patientMonthsHo: 960,
      pbHo: 1_350_000,
      kpHo: 10_000,
      popRef: 110,
      popHo: 118,
    },
    labs: {
      rdg: structuredClone(DEFAULT_RDG_GROUPS),
      rdgHoursBonus: true,
      lab: {
        accredited: true,
        hbRefWeighted: 0.84,
        hbHo: 0.84,
        uhrRef: 40_000_000,
        pbRef: 52_000_000,
        popRef: 60_000,
        popHo: 62_000,
        pbHo: 55_000_000,
        kpHo: 200_000,
        newServices: 0,
      },
      gen: {
        uhrRef: 12_000_000,
        pbRef: 15_000_000,
        kpRef: 100_000,
        popRef: 2_500,
        hbRef: 0.8,
        popHo: 2_600,
        pbHo: 16_000_000,
        kpHo: 110_000,
      },
    },
    dialysis: {
      points: 40_000_000,
      pointsLow: 1_500_000,
      zumZulp: 9_000_000,
      quality: 'l2',
      patientsReported: 140,
      patientsPd: 6,
      patientsHomeHd: 1,
      txp: 3,
      txo: 5,
      wlp: 4,
      wlo: 6,
      pcelk: 120,
      signals: { c76661: 12, c76662: 6, c76663: 9, c76664: 4, c76667: 1 },
      upHo: 220,
      regulation: {
        exempt: false,
        zulp: { avgRef: 40_000, avgHo: 42_000 },
        drugs: { avgRef: 25_000, avgHo: 26_000 },
        requested: { avgRef: 8_000, avgHo: 8_200 },
      },
    },
    dental: {
      educated: true,
      registered: { under6: 120, from6to12: 180, from12to18: 160, adults: 1_540 },
      months: 12,
      rows: [
        { id: 'z1', code: '00900', count: 150, priceOverride: 0 },
        { id: 'z2', code: '00901', count: 1_700, priceOverride: 0 },
        { id: 'z3', code: '00908', count: 900, priceOverride: 0 },
        { id: 'z4', code: '00940', count: 400, priceOverride: 0 },
      ],
    },
    other: {
      zzs: { points: 0, pointsTransport: 0, points06714: 0, episodes: 0 },
      zds: { nonstop: true, points: 0, points40: 0, points69: 0 },
      dentalEmergency: { days: 0, k: 0.55 },
      spa: { complexDays: 0, complexRate2026: 0, contribDays: 0, contribRate2026: 0, points09543Spa: 0, ozdravovnaDays: 0 },
      flat: { points09543: 20_000, points09555: 0, points09580: 0, count09990: 0, count09552: 0, eRecipes: 0 },
      pharmacyEmergency: { days: 0, k: 0.55 },
    },
    provider: { name: 'Modelová nemocnice', ico: '', insurer: 'VZP', district: '', region: '', centres: [], lateShare: 0 },
    scope: scopeOf(SEGMENT_IDS.filter((id) => id !== 'under50')),
    advances: { refUhr: zeroBySegment(), adjust: zeroBySegment(), refRdg: 0 },
  }
}

type PlainObject = Record<string, unknown>
const isPlain = (v: unknown): v is PlainObject => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Rekurzivně doplní chybějící klíče z výchozího scénáře; pole se přebírají celá. */
function deepMerge<T>(base: T, raw: unknown): T {
  if (!isPlain(base) || !isPlain(raw)) return (raw === undefined ? base : (raw as T))
  const out: PlainObject = { ...base }
  for (const key of Object.keys(base)) {
    if (key in raw) out[key] = deepMerge((base as PlainObject)[key], raw[key])
  }
  return out as T
}

/** Doplní chybějící klíče (např. po přidání parametrů či modulů do nové verze aplikace). */
export function normalizeScenario(raw: unknown): Scenario {
  const base = defaultScenario()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<Scenario>
  const merged = deepMerge(base, r)
  merged.version = SCENARIO_VERSION
  merged.name = typeof r.name === 'string' && r.name ? r.name : base.name
  return merged
}

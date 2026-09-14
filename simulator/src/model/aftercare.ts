/**
 * Následná, dlouhodobá, sociálně-zdravotní a hospicová lůžková péče – příloha č. 1, část B, bod 1.
 * PS_OD,HO = (ZKN + KN) · PS_OD,2026, KN = součet bonifikačních kritérií platných pro daný typ OD.
 */
import type { DecreeParams } from './params'
import { StepRecorder, safeDiv, type Step } from './steps'

export const AFTERCARE_OD = ['00005', '00021', '00022', '00023', '00024', '00026', '00027', '00028', '00030', '00037', 'other'] as const
export type AftercareOd = (typeof AFTERCARE_OD)[number]

export const OD_LABELS: Record<AftercareOd, string> = {
  '00005': 'OD 00005',
  '00021': 'OD 00021 (psychiatrie)',
  '00022': 'OD 00022',
  '00023': 'OD 00023',
  '00024': 'OD 00024 (rehabilitace)',
  '00026': 'OD 00026 (psychiatrie)',
  '00027': 'OD 00027',
  '00028': 'OD 00028',
  '00030': 'OD 00030 (hospic)',
  '00037': 'OD 00037',
  other: 'jiný OD',
}

/** OD se základním koeficientem navýšení 1,035 (ostatní 1,02) */
const ZKN_HIGH: AftercareOd[] = ['00005', '00024', '00030', '00037']

export type PersonnelCriterion = 'woundNurse' | 'nutrition' | 'ergo' | 'logo' | 'psycho'
export type TechnicalCriterion = 'beds25' | 'electricBeds'

export const PERSONNEL_LABELS: Record<PersonnelCriterion, string> = {
  woundNurse: 'Sestra specialistka na hojení ran (0,4 úv./120 lůžek)',
  nutrition: 'Nutriční terapeut (0,4 úv./120 lůžek)',
  ergo: 'Ergoterapeut (1 úv./120 lůžek)',
  logo: 'Logoped (1 úv./120 lůžek)',
  psycho: 'Psycholog ve zdravotnictví (0,4 úv./120 lůžek)',
}
export const TECHNICAL_LABELS: Record<TechnicalCriterion, string> = {
  beds25: 'Průměrně nejvýše 2,5 lůžka na pokoj',
  electricBeds: 'Alespoň 75 % elektricky polohovatelných lůžek',
}

const CRITERION_OD: Record<PersonnelCriterion | TechnicalCriterion, AftercareOd[]> = {
  woundNurse: ['00005', '00022', '00023', '00024', '00030', '00037'],
  nutrition: ['00005', '00022', '00024', '00027', '00028', '00030', '00037'],
  ergo: ['00005', '00024', '00030', '00037'],
  logo: ['00024'],
  psycho: ['00005', '00022', '00024', '00030', '00037'],
  beds25: ['00005', '00022', '00023', '00024', '00030', '00037'],
  electricBeds: ['00005', '00022', '00023', '00024', '00030', '00037'],
}

export interface AftercareRow {
  id: string
  od: AftercareOd
  name: string
  /** paušální sazba za OD v roce 2026 bez kvalitativních navýšení */
  ps2026: number
  days: number
  /** dny dětských pacientů (< 12 let u OD 00005/00037, < 6 let u OD 00024) */
  pediatric: boolean
}

export interface AftercareInputs {
  rows: AftercareRow[]
  personnel: Record<PersonnelCriterion, boolean>
  technical: Record<TechnicalCriterion, boolean>
  /** psychiatrie – schválený transformační plán */
  transformationPlan: boolean
  kTransNlp: number
  accreditation: boolean
  palliativeDoctor: boolean
  geriatrician: boolean
  geriatristFte: number
  bedsOd24: number
  msShareOver65: boolean
  u572ShareOver50: boolean
  u572Days: number
  /** výkonově hrazené OD (NIP, DIOP, …): body × hodnota bodu */
  pointsOd00015: number
  pointsOd00017: number
  pointsOd00020: number
  pointsOd00033: number
  em: number
}

export interface AftercareRowResult {
  row: AftercareRow
  zkn: number
  kn: number
  knParts: { label: string; value: number }[]
  psHo: number
  uhr: number
}

export interface AftercareResult {
  steps: Step[]
  rows: AftercareRowResult[]
  bonGeri: number
  lumpTotal: number
  u572Extra: number
  performanceTotal: number
  total: number
}

export function computeAftercare(inp: AftercareInputs, p: DecreeParams): AftercareResult {
  const rec = new StepRecorder()
  const a = p.aftercare

  const bonGeri = Math.min(a.geriCap, a.geriMultiplier * safeDiv(inp.geriatristFte, inp.bedsOd24))
  const bonGeriRounded = Math.round(bonGeri * 1000) / 1000
  rec.add({
    symbol: 'BON_Geri',
    label: 'Koeficient kvality geriatrické péče (OD 00024)',
    formula: `min{ ${a.geriCap} ; ${a.geriMultiplier} · PočetGeriatrů / PočetLůžek_OD24 }`,
    substitution: `min{ ${a.geriCap} ; ${a.geriMultiplier} · ${inp.geriatristFte} / ${inp.bedsOd24} }`,
    value: bonGeriRounded,
    unit: 'index',
  })

  const rows: AftercareRowResult[] = inp.rows.map((row) => {
    const parts: { label: string; value: number }[] = []
    const has = (od: AftercareOd[]) => od.includes(row.od)
    for (const key of Object.keys(PERSONNEL_LABELS) as PersonnelCriterion[]) {
      if (inp.personnel[key] && has(CRITERION_OD[key])) parts.push({ label: PERSONNEL_LABELS[key], value: a.criterion })
    }
    for (const key of Object.keys(TECHNICAL_LABELS) as TechnicalCriterion[]) {
      if (inp.technical[key] && has(CRITERION_OD[key])) parts.push({ label: TECHNICAL_LABELS[key], value: a.criterion })
    }
    if (inp.transformationPlan && has(['00021', '00026'])) {
      parts.push({ label: `0,35 · K_TransNLP (${inp.kTransNlp})`, value: a.transShare * inp.kTransNlp })
      if (inp.accreditation) parts.push({ label: 'BON_Akreditace', value: a.accreditation })
    }
    if (inp.palliativeDoctor && row.od === '00030') parts.push({ label: 'Lékař paliativní medicíny 0,4 úv./120 lůžek', value: a.palliativeDoctor })
    if (inp.geriatrician && row.od === '00037') parts.push({ label: 'Geriatr 0,4 úv./120 lůžek', value: a.geriatrician })
    if (row.pediatric && has(['00005', '00037'])) parts.push({ label: 'Pojištěnci do 12 let', value: a.children12 })
    if (row.pediatric && row.od === '00024') parts.push({ label: 'Pojištěnci do 6 let', value: a.children6 })
    if (row.od === '00024' && bonGeriRounded > 0) parts.push({ label: 'BON_Geri', value: bonGeriRounded })
    if (inp.msShareOver65 && has(['00005', '00037'])) parts.push({ label: 'Podíl G35–G37 > 65 %', value: a.msShare })
    if (inp.u572ShareOver50 && has(['00024', '00037'])) parts.push({ label: 'Podíl U57.2 > 50 %', value: a.u572 })

    const kn = parts.reduce((s, x) => s + x.value, 0)
    const zkn = ZKN_HIGH.includes(row.od) ? a.zknHigh : a.zknBase
    const psHo = (zkn + kn) * row.ps2026
    const uhr = psHo * row.days
    rec.add({
      symbol: `PS_${row.od},HO`,
      label: `${row.name || OD_LABELS[row.od]}: paušální sazba 2027 za den`,
      formula: '(ZKN + KN) · PS_OD,2026',
      substitution: `(${zkn} + ${kn.toFixed(3)}) · ${row.ps2026}${parts.length ? `   [KN: ${parts.map((x) => `${x.label} ${x.value}`).join('; ')}]` : ''}`,
      value: psHo,
      unit: 'czk',
    })
    rec.add({
      symbol: `Úhrada_${row.od}`,
      label: `${row.days} dnů × sazba`,
      substitution: `${row.days} · ${psHo.toFixed(2)}`,
      value: uhr,
      unit: 'czk',
    })
    return { row, zkn, kn, knParts: parts, psHo, uhr }
  })

  const lumpTotal = rows.reduce((s, r) => s + r.uhr, 0)
  const u572Extra = inp.u572Days * a.u572PerDay
  if (u572Extra) {
    rec.add({ symbol: 'Příplatek U57.2', label: '20 Kč za den OD 00024/00037 s doplňkovým kódem U57.2', substitution: `${inp.u572Days} · ${a.u572PerDay}`, value: u572Extra, unit: 'czk' })
  }

  const perf =
    inp.pointsOd00015 * a.hb.od00015 + inp.pointsOd00017 * a.hb.od00017 + inp.pointsOd00020 * a.hb.od00020 + inp.pointsOd00033 * a.hb.od00033
  if (perf) {
    rec.add({
      symbol: 'NIP / DIOP / OD 00033',
      label: 'Výkonově hrazené OD (hodnoty bodu 1,63 / 1,59 / 1,57 / 1,37 Kč)',
      substitution: `${inp.pointsOd00015} · ${a.hb.od00015} + ${inp.pointsOd00017} · ${a.hb.od00017} + ${inp.pointsOd00020} · ${a.hb.od00020} + ${inp.pointsOd00033} · ${a.hb.od00033}`,
      value: perf,
      unit: 'czk',
    })
  }

  const total = lumpTotal + u572Extra + perf - inp.em
  rec.add({
    symbol: 'Úhrada následné péče',
    label: 'Σ paušálních sazeb + příplatky + výkonové OD − extramurální péče',
    substitution: `${lumpTotal.toFixed(0)} + ${u572Extra} + ${perf.toFixed(0)} − ${inp.em}`,
    value: total,
    unit: 'czk',
    emphasis: 'result',
  })

  return { steps: rec.steps, rows, bonGeri: bonGeriRounded, lumpTotal, u572Extra, performanceTotal: perf, total }
}

/**
 * Ambulantní specializovaná péče – příloha č. 3 (hodnota bodu 0,98 Kč + bonifikace, maximum PURO, regulace).
 */
import type { DecreeParams } from './params'
import { computePuro, type PuroInputs, type PuroResult } from './puro'
import { computeRegulation, type RegulationItemInputs, type RegulationResult } from './regulation'
import { StepRecorder, type Step } from './steps'

export type NewPatients = 'none' | 'partial' | 'full'
export type OdbGroup = 'g0' | 'g2' | 'g4' | 'g6'

export const ODB_GROUP_LABELS: Record<OdbGroup, string> = {
  g0: '107, 302, 780 – KN +0,00',
  g2: '108, 205, 403, 501, 601, 708 – KN +0,02',
  g4: '102, 202, 207, 209, 402, 606, 701, 705, 706 – KN +0,04',
  g6: 'ostatní odbornosti – KN +0,06',
}

export interface SpecialistsInputs {
  /** základní hodnota bodu (0,98 Kč; některé odbornosti mají zvláštní hodnoty podle bodu 1) */
  hbBase: number
  education: boolean
  hours: boolean
  newPatients: NewPatients
  ordering: boolean
  odb903: boolean
  odbGroup: OdbGroup
  /** nasmlouvaná kapacita ordinačních hodin týdně (přepočet limitu 100 UP) */
  hoursPerWeek: number
  puro: PuroInputs
  regulation: {
    exempt: boolean
    zulp: RegulationItemInputs
    drugs: RegulationItemInputs
    requested: RegulationItemInputs
  }
}

export interface SpecialistsResult {
  steps: Step[]
  hb: number
  kn: number
  puro: PuroResult
  regulation: RegulationResult
  total: number
}

export function computeSpecialists(inp: SpecialistsInputs, p: DecreeParams): SpecialistsResult {
  const rec = new StepRecorder()
  const c = p.specialists

  const hbParts: string[] = [`${inp.hbBase}`]
  const knParts: string[] = []
  let hb = inp.hbBase
  let kn = 0
  if (inp.education) {
    hb += 0.03
    kn += 0.02
    hbParts.push('+0,03 vzdělávání')
    knParts.push('0,02 vzdělávání')
  }
  if (inp.hours) {
    hb += 0.02
    kn += 0.02
    hbParts.push('+0,02 ordinační hodiny')
    knParts.push('0,02 ordinační hodiny')
  }
  if (inp.newPatients === 'full') {
    hb += 0.04
    kn += 0.04
    hbParts.push('+0,04 noví pacienti ≥ 10 %')
    knParts.push('0,04 noví pacienti')
  } else if (inp.newPatients === 'partial') {
    hb += 0.02
    kn += 0.02
    hbParts.push('+0,02 noví pacienti ≥ 5 %')
    knParts.push('0,02 noví pacienti')
  }
  if (inp.ordering) {
    hb += 0.01
    kn += 0.01
    hbParts.push('+0,01 objednávkový systém')
    knParts.push('0,01 objednávkový systém')
  }
  if (inp.odb903) {
    kn += 0.08
    knParts.push('0,08 odb. 903 (dg. F84…)')
  }
  const groupKn = inp.odbGroup === 'g0' ? 0 : inp.odbGroup === 'g2' ? 0.02 : inp.odbGroup === 'g4' ? 0.04 : 0.06
  kn += groupKn
  knParts.push(`${groupKn.toFixed(2)} skupina odborností`)

  rec.add({ symbol: 'HB_2027', label: 'Hodnota bodu včetně navýšení (bod 2)', substitution: hbParts.join(' '), value: hb, unit: 'czk' })
  rec.add({ symbol: 'KN', label: 'Koeficient navýšení maxima (bod 3)', substitution: knParts.join(' + '), value: kn, unit: 'index' })

  const exemptUp = c.exemptUp * Math.min(1, inp.hoursPerWeek / 30)
  const puro = computePuro(inp.puro, { baseCoef: c.baseCoef, kn, hbMin: c.hbMin, knMultipliesMax: false, exemptUp, hb, advanceShare: 1.06 })
  rec.steps.push(...puro.steps)

  const regulation = computeRegulation(
    {
      upHo: inp.puro.popZ + inp.puro.popMh,
      performanceBase: puro.uhr - inp.puro.kpHo,
      exempt: inp.regulation.exempt || inp.puro.popRef <= exemptUp || inp.puro.popZ + inp.puro.popMh <= exemptUp,
      items: { zulp: inp.regulation.zulp, drugs: inp.regulation.drugs, requested: inp.regulation.requested },
    },
    p,
    ['zulp', 'drugs', 'requested'],
  )
  rec.steps.push(...regulation.steps)

  const total = puro.uhr - regulation.penalty
  rec.add({ symbol: 'Úhrada po regulaci', label: 'Úhrada − regulační srážka', substitution: `${puro.uhr.toFixed(0)} − ${regulation.penalty.toFixed(0)}`, value: total, unit: 'czk', emphasis: 'result' })

  return { steps: rec.steps, hb, kn, puro, regulation, total }
}

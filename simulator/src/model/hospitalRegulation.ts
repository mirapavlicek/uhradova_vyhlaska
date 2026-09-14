/**
 * Regulační omezení poskytovatelů akutní lůžkové péče – příloha č. 1, část C:
 *  1. snížení casemixu při revizi kódování (jednotlivý případ ×2; vzorek báze ×0,2 / ×0,8),
 *  2. regulace předepsaných léčiv a vyžádané péče ambulantních odborností (115 % / 110 %).
 */
import type { DecreeParams } from './params'
import { computeRegulation, type RegulationItemInputs, type RegulationResult } from './regulation'
import { StepRecorder, safeDiv, type Step } from './steps'

export type RevisionType = 'single' | 'minor' | 'major'
export const REVISION_LABELS: Record<RevisionType, string> = {
  single: 'a) revize jednotlivého případu – (CM_pův − CM_rev) × 2',
  minor: 'b) statisticky méně významné množství – podíl × Σ CM báze × 0,2',
  major: 'c) statisticky významné množství – podíl × Σ CM báze × 0,8',
}

export interface RevisionRow {
  id: string
  name: string
  type: RevisionType
  cmOriginal: number
  cmRevised: number
  /** součet relativních vah příslušné DRG báze (jen pro b, c) */
  cmBase: number
}

export interface HospitalRegulationInputs {
  revisions: RevisionRow[]
  /** globální unikátní pojištěnci ambulantních odborností 7.15, 7.16, 7.18 */
  gaup: number
  ambPerformanceBase: number
  exempt: boolean
  drugs: RegulationItemInputs
  requested: RegulationItemInputs
}

export interface HospitalRegulationResult {
  steps: Step[]
  revisions: { row: RevisionRow; reduction: number; czk: number }[]
  cmReduction: number
  cmReductionCzk: number
  regulation: RegulationResult
  total: number
}

export function revisionReduction(row: RevisionRow): number {
  const diff = Math.max(0, row.cmOriginal - row.cmRevised)
  if (row.type === 'single') return diff * 2
  const share = safeDiv(diff, row.cmOriginal)
  return share * row.cmBase * (row.type === 'minor' ? 0.2 : 0.8)
}

export function computeHospitalRegulation(inp: HospitalRegulationInputs, czs: number, p: DecreeParams): HospitalRegulationResult {
  const rec = new StepRecorder()
  const revisions = inp.revisions.map((row) => {
    const reduction = revisionReduction(row)
    const czk = reduction * czs
    rec.add({
      symbol: `ΔCM – ${row.name || row.id}`,
      label: REVISION_LABELS[row.type],
      substitution:
        row.type === 'single'
          ? `(${row.cmOriginal} − ${row.cmRevised}) · 2`
          : `((${row.cmOriginal} − ${row.cmRevised}) / ${row.cmOriginal}) · ${row.cmBase} · ${row.type === 'minor' ? 0.2 : 0.8}`,
      value: reduction,
      unit: 'cm',
      emphasis: reduction > 0 ? 'warning' : undefined,
    })
    return { row, reduction, czk }
  })
  const cmReduction = revisions.reduce((s, r) => s + r.reduction, 0)
  const cmReductionCzk = cmReduction * czs
  rec.add({
    symbol: 'Snížení CM × CZS',
    label: 'Orientační finanční dopad snížení casemixu (CM × centrální sazba)',
    substitution: `${cmReduction.toFixed(2)} · ${czs}`,
    value: cmReductionCzk,
    unit: 'czk',
    emphasis: 'result',
    note: 'Skutečný dopad závisí na tom, do které úhradové formy případy spadají (paušál přes I_ZP, případový paušál přímo).',
  })

  const regulation = computeRegulation(
    { upHo: inp.gaup, performanceBase: inp.ambPerformanceBase, exempt: inp.exempt || inp.gaup <= 100, items: { drugs: inp.drugs, requested: inp.requested } },
    p,
    ['drugs', 'requested'],
  )
  rec.steps.push(...regulation.steps)
  const total = cmReductionCzk + regulation.penalty
  rec.add({ symbol: 'Regulace celkem', label: 'Snížení CM (v Kč) + srážka za léčiva a vyžádanou péči', substitution: `${cmReductionCzk.toFixed(0)} + ${regulation.penalty.toFixed(0)}`, value: total, unit: 'czk', emphasis: 'result' })
  return { steps: rec.steps, revisions, cmReduction, cmReductionCzk, regulation, total }
}

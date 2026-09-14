/**
 * Centrové léčivé přípravky – příloha č. 1 bod 1.4 a příloha č. 15.
 */
import { indexIzpCl } from './indexes'
import type { DecreeParams } from './params'
import { StepRecorder, safeDiv, type Step } from './steps'

export interface CentreDrugProduction {
  /** id skupiny z params.clGroups */
  groupId: string
  /** Produkce_i,CL,2025 – vykázaná hodnota LP v referenčním období (Kč) */
  prod2025: number
  /** Produkce_i,CL,2027 */
  prod2027: number
}

export interface CentreDrugInputs {
  rows: CentreDrugProduction[]
}

export interface CentreDrugGroupResult {
  groupId: string
  name: string
  inu: number
  ics: number
  prod2025: number
  prod2027: number
  refValued: number
  actualValued: number
}

export interface CentreDrugResult {
  steps: Step[]
  groups: CentreDrugGroupResult[]
  refSum: number
  actualSum: number
  ratio: number
  izpCl: number
  uhr: number
  /** která větev min{} byla použita */
  binding: 'reference' | 'actual'
}

export function computeCentreDrugs(inp: CentreDrugInputs, p: DecreeParams): CentreDrugResult {
  const rec = new StepRecorder()
  const groups: CentreDrugGroupResult[] = []
  let refSum = 0
  let actualSum = 0
  for (const row of inp.rows) {
    const g = p.clGroups.find((x) => x.id === row.groupId)
    if (!g) continue
    const refValued = row.prod2025 * g.inu * g.ics
    const actualValued = row.prod2027 * g.ics
    refSum += refValued
    actualSum += actualValued
    groups.push({ groupId: g.id, name: g.name, inu: g.inu, ics: g.ics, prod2025: row.prod2025, prod2027: row.prod2027, refValued, actualValued })
  }
  rec.add({
    symbol: 'Σ Produkce_2025 · INU · ICS',
    label: 'Referenční produkce navýšená indexem INU a snížená indexem cenové slevy',
    value: refSum,
    unit: 'czk',
  })
  rec.add({
    symbol: 'Σ Produkce_2027 · ICS',
    label: 'Skutečná produkce 2027 snížená indexem cenové slevy',
    value: actualSum,
    unit: 'czk',
  })
  const ratio = safeDiv(actualSum, refSum, 1)
  rec.add({
    symbol: 'r',
    label: 'Poměr skutečné a referenční navýšené produkce',
    formula: 'r = Σ Produkce_2027·ICS / Σ Produkce_2025·INU·ICS',
    substitution: `${actualSum.toFixed(0)} / ${refSum.toFixed(0)}`,
    value: ratio,
    unit: 'ratio',
  })
  const izpCl = indexIzpCl(ratio, p)
  rec.add({
    symbol: 'IZP_CL',
    label: 'Index změny produkce centrových léků',
    formula: `IZP_CL = min{${p.izpCl.cap}; max[1; ARCTG(${p.izpCl.a}·r − ${p.izpCl.b})]}`,
    substitution: `min{${p.izpCl.cap}; max[1; ARCTG(${p.izpCl.a} · ${ratio.toFixed(4)} − ${p.izpCl.b})]}`,
    value: izpCl,
    unit: 'index',
    note: izpCl === p.izpCl.cap ? 'Dosažen strop indexu.' : undefined,
  })
  const base = Math.min(refSum, actualSum)
  const binding = actualSum < refSum ? 'actual' : 'reference'
  const uhr = base * izpCl
  rec.add({
    symbol: 'ÚHR_CL,2027',
    label: 'Úhrada centrových léků 2027',
    formula: 'ÚHR_CL = min{Σ Produkce_2025·INU·ICS; Σ Produkce_2027·ICS} · IZP_CL',
    substitution: `min{${refSum.toFixed(0)}; ${actualSum.toFixed(0)}} · ${izpCl.toFixed(4)}`,
    value: uhr,
    unit: 'czk',
    emphasis: 'result',
    note:
      binding === 'actual'
        ? 'Skutečná produkce je pod referenčním limitem – hradí se skutečnost (× index ≥ 1 se neuplatní, protože r < 1).'
        : 'Skutečná produkce překročila referenční limit – hradí se limit navýšený degresivním indexem IZP_CL.',
  })
  return { steps: rec.steps, groups, refSum, actualSum, ratio, izpCl, uhr, binding }
}

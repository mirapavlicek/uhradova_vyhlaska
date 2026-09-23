/**
 * Výpočet casemixu z počtů případů po skupinách CZ-DRG podle přílohy č. 10
 * (relativní váhy, části A–I, koeficient centralizace KC podle statusů center).
 */
import type { CaseGroupRow } from './acute'
import type { Scenario } from './scenario'

/** [kód skupiny, část, název, relativní váha, statusy center, KC pozitivní, KC negativní] */
export type DrgRecord = [string, string, string, number, string, number | null, number | null]

export interface DrgCatalog {
  byCode: Map<string, DrgRecord>
}

export function buildCatalog(records: DrgRecord[]): DrgCatalog {
  return { byCode: new Map(records.map((r) => [r[0], r])) }
}

export interface CaseRow {
  drg: string
  year: 2025 | 2027
  cases: number
  /** případy ukončené překladem (kód ukončení 5) */
  transfers: number
  /** ocenění podle jednotlivých položek přepočtené na CM (volitelné) */
  cmJpl: number
  /** případy s výkonem 09563/09564 nebo odbornosti 719 den před přijetím (KC = 1) */
  urgentCases: number
}

export interface PartTotals {
  cases: number
  transfers: number
  cm: number
  cmTransfers: number
  cmJpl: number
  /** Σ CM · KC */
  cmKc: number
}

export interface CasemixSummary {
  byPart: Record<'2025' | '2027', Record<string, PartTotals>>
  unknown: string[]
  cmCmp2027: number
  rows: number
}

const PARTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
const STROKE = /^01-K10-0[1-6]$/

export function normalizeDrg(code: string): string {
  const c = code.trim().toUpperCase().replace(/\s+/g, '')
  const m = c.match(/^(\d{2})-?([A-Z]\d{2})-?(\d{2})$/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : c
}

export function kcFor(rec: DrgRecord, centres: string[]): number {
  const listed = rec[4] ? rec[4].split(',').map((x) => x.trim()) : []
  if (!listed.length) return 1
  const has = listed.some((c) => centres.includes(c))
  return (has ? rec[5] : rec[6]) ?? 1
}

export function summarizeCases(rows: CaseRow[], catalog: DrgCatalog, centres: string[]): CasemixSummary {
  const empty = (): PartTotals => ({ cases: 0, transfers: 0, cm: 0, cmTransfers: 0, cmJpl: 0, cmKc: 0 })
  const byPart = {
    '2025': Object.fromEntries(PARTS.map((p) => [p, empty()])),
    '2027': Object.fromEntries(PARTS.map((p) => [p, empty()])),
  } as CasemixSummary['byPart']
  const unknown = new Set<string>()
  let cmCmp2027 = 0
  for (const r of rows) {
    const code = normalizeDrg(r.drg)
    const rec = catalog.byCode.get(code)
    if (!rec) {
      if (r.cases) unknown.add(r.drg)
      continue
    }
    const [, part, , weight] = rec
    const t = byPart[r.year === 2025 ? '2025' : '2027'][part]
    const kc = kcFor(rec, centres)
    const cm = weight * r.cases
    t.cases += r.cases
    t.transfers += r.transfers
    t.cm += cm
    t.cmTransfers += weight * r.transfers
    t.cmJpl += r.cmJpl
    t.cmKc += weight * (r.cases - r.urgentCases) * kc + weight * r.urgentCases
    if (r.year === 2027 && STROKE.test(code)) cmCmp2027 += cm
  }
  return { byPart, unknown: [...unknown], cmCmp2027, rows: rows.length }
}

const PART_NAMES: Record<string, string> = {
  B: 'Skupina B',
  C: 'Skupina C',
  E: 'Skupina E',
  F: 'Skupina F',
  G: 'Skupina G',
}

function groupRow(part: string, t: PartTotals): CaseGroupRow {
  return {
    id: `imp-${part}`,
    name: `${PART_NAMES[part]} (import CZ-DRG, ${t.cases} případů)`,
    cmDrg: round(t.cm),
    cmJpl: round(t.cmJpl),
    kc: t.cm > 0 ? round(t.cmKc / t.cm, 4) : 1,
  }
}

const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d

/** Přenese souhrn casemixu do vstupů akutní péče (paušál, vyčleněná úhrada, případový paušál). */
export function applyCasemix(s: Scenario, sum: CasemixSummary): Scenario {
  const r25 = sum.byPart['2025']
  const r27 = sum.byPart['2027']
  const has2025 = PARTS.some((p) => r25[p].cases > 0)
  const has2027 = PARTS.some((p) => r27[p].cases > 0)
  const next = structuredClone(s)
  if (has2025) {
    next.pu.cm2025A = round(r25.A.cm)
    next.pu.cm2025D = round(r25.D.cm)
    next.pu.cm2025AtoD = round(r25.A.cm + r25.B.cm + r25.C.cm + r25.D.cm)
    next.pu.cases2025 = r25.A.cases + r25.D.cases
    next.pu.transfers2025 = r25.A.transfers + r25.D.transfers
  }
  if (has2027) {
    next.pu.cm2027AD = round(r27.A.cm + r27.D.cm)
    next.pu.cm2027Transfer = round(r27.A.cmTransfers + r27.D.cmTransfers)
    next.pu.cases2027 = r27.A.cases + r27.D.cases
    next.pu.transfers2027 = r27.A.transfers + r27.D.transfers
    next.separated.rows = ['C', 'E'].filter((p) => r27[p].cases > 0).map((p) => groupRow(p, r27[p]))
    next.separated.cmCmp = round(sum.cmCmp2027)
    next.casePayment.rows = ['B', 'F', 'G'].filter((p) => r27[p].cases > 0).map((p) => groupRow(p, r27[p]))
    next.casePayment.cmH2027 = round(r27.H.cm)
  }
  return next
}

/**
 * Regulační omezení na předepsané léčivé přípravky / ZUM a ZULP / vyžádanou péči.
 * Společný vzorec příloh č. 1 (část C), 3, 4 a 8: při překročení prahu (115 %, resp. 110 %)
 * průměrné úhrady na unikátního pojištěnce se úhrada sníží o 2,5 % z překročení za každé
 * započaté 0,5 % překročení, nejvýše však o 40 % z překročení. Součet srážek je omezen 15 %
 * úhrady za výkony. Praktičtí lékaři (příloha č. 2) mají plochou sazbu do 25 % z překročení.
 */
import type { DecreeParams } from './params'
import { StepRecorder, safeDiv, type Step } from './steps'

export interface RegulationItemInputs {
  /** průměrná úhrada na unikátního pojištěnce v referenčním období */
  avgRef: number
  /** průměrná úhrada na unikátního pojištěnce v hodnoceném období */
  avgHo: number
}

export interface RegulationItemResult {
  thresholdAvg: number
  overrunPerUp: number
  overrunTotal: number
  /** relativní překročení prahu (0,02 = o 2 % nad prahem) */
  overrunPct: number
  steps: number
  rate: number
  penalty: number
}

export interface RegulationConfig {
  threshold: number
  /** velikost kroku (0,005) – pokud je undefined, použije se plochá sazba `flatRate` */
  stepPct?: number
  ratePerStep?: number
  maxShare: number
}

export function regulationItem(inp: RegulationItemInputs, upCount: number, cfg: RegulationConfig): RegulationItemResult {
  const thresholdAvg = cfg.threshold * inp.avgRef
  const overrunPerUp = Math.max(0, inp.avgHo - thresholdAvg)
  const overrunTotal = overrunPerUp * upCount
  const overrunPct = thresholdAvg > 0 ? Math.max(0, inp.avgHo / thresholdAvg - 1) : 0
  let steps = 0
  let rate = 0
  if (overrunPerUp > 0) {
    if (cfg.stepPct && cfg.ratePerStep) {
      steps = Math.ceil(overrunPct / cfg.stepPct - 1e-12)
      rate = Math.min(cfg.maxShare, steps * cfg.ratePerStep)
    } else {
      rate = cfg.maxShare
    }
  }
  return { thresholdAvg, overrunPerUp, overrunTotal, overrunPct, steps, rate, penalty: rate * overrunTotal }
}

export type RegulationKind = 'drugs' | 'requested' | 'zulp'

export const REGULATION_LABELS: Record<RegulationKind, string> = {
  drugs: 'Předepsané léčivé přípravky a zdravotnické prostředky',
  requested: 'Vyžádaná péče ve vyjmenovaných odbornostech',
  zulp: 'ZULP (mimo „S“) a ZUM',
}

export interface RegulationInputs {
  /** počet unikátních pojištěnců v hodnoceném období */
  upHo: number
  /** úhrada za výkony (bez ZUM/ZULP) v hodnoceném období – základ 15 % stropu */
  performanceBase: number
  /** regulace se neuplatní (nezbytná péče, malý počet UP, nesdělení referenčních hodnot) */
  exempt: boolean
  items: Partial<Record<RegulationKind, RegulationItemInputs>>
}

export interface RegulationResult {
  steps: Step[]
  items: Partial<Record<RegulationKind, RegulationItemResult>>
  rawPenalty: number
  cap: number
  penalty: number
  capped: boolean
}

export function computeRegulation(inp: RegulationInputs, p: DecreeParams, kinds: RegulationKind[] = ['drugs', 'requested']): RegulationResult {
  const rec = new StepRecorder()
  const r = p.regulation
  const items: RegulationResult['items'] = {}
  let raw = 0
  for (const kind of kinds) {
    const item = inp.items[kind]
    if (!item) continue
    const threshold = kind === 'drugs' ? r.drugsThreshold : kind === 'requested' ? r.requestedThreshold : r.zulpThreshold
    const res = regulationItem(item, inp.upHo, { threshold, stepPct: r.stepPct, ratePerStep: r.ratePerStep, maxShare: r.maxShare })
    items[kind] = res
    rec.add({
      symbol: `Překročení – ${kind}`,
      label: `${REGULATION_LABELS[kind]}: průměr 2027 vs. ${Math.round(threshold * 100)} % průměru 2025`,
      formula: `(Ø_2027 − ${threshold}·Ø_2025) · UP_2027`,
      substitution: `(${item.avgHo.toFixed(0)} − ${threshold} · ${item.avgRef.toFixed(0)} = ${res.thresholdAvg.toFixed(0)}) · ${inp.upHo}`,
      value: res.overrunTotal,
      unit: 'czk',
      emphasis: res.overrunTotal > 0 ? 'warning' : undefined,
      note: res.overrunTotal > 0 ? `Překročení prahu o ${(res.overrunPct * 100).toFixed(2)} % → ${res.steps} započatých kroků po ${r.stepPct * 100} %` : 'Práh nepřekročen.',
    })
    rec.add({
      symbol: `Srážka – ${kind}`,
      label: 'Srážka = min[40 %; 2,5 % · počet započatých 0,5 % kroků] · překročení',
      substitution: `min[${r.maxShare}; ${r.ratePerStep} · ${res.steps}] = ${res.rate.toFixed(3)} · ${res.overrunTotal.toFixed(0)}`,
      value: res.penalty,
      unit: 'czk',
    })
    raw += res.penalty
  }
  const cap = r.capShare * inp.performanceBase
  const penalty = inp.exempt ? 0 : Math.min(raw, cap)
  rec.add({
    symbol: 'Regulační srážka celkem',
    label: inp.exempt ? 'Regulace se neuplatní (výjimka)' : `Součet srážek, nejvýše ${Math.round(r.capShare * 100)} % úhrady za výkony`,
    substitution: inp.exempt ? '0' : `min[${raw.toFixed(0)}; ${r.capShare} · ${inp.performanceBase.toFixed(0)} = ${cap.toFixed(0)}]`,
    value: penalty,
    unit: 'czk',
    emphasis: 'result',
    note: !inp.exempt && raw > cap ? 'Uplatnil se strop 15 % úhrady za výkony.' : undefined,
  })
  return { steps: rec.steps, items, rawPenalty: raw, cap, penalty, capped: !inp.exempt && raw > cap }
}

/** Praktičtí lékaři: srážka do 25 % z překročení nad 120 % (resp. 115 %) celostátního průměru na přepočteného pojištěnce. */
export interface GpRegulationInputs {
  weightedInsured: number
  exempt: boolean
  base: number
  items: { label: string; avgNational: number; avgProvider: number; requested?: boolean }[]
}

export function computeGpRegulation(inp: GpRegulationInputs, p: DecreeParams): { steps: Step[]; penalty: number; raw: number; cap: number } {
  const rec = new StepRecorder()
  const r = p.regulation
  let raw = 0
  for (const it of inp.items) {
    const threshold = it.requested ? r.gpRequestedThreshold : r.gpThreshold
    const res = regulationItem({ avgRef: it.avgNational, avgHo: it.avgProvider }, inp.weightedInsured, { threshold, maxShare: r.gpRate })
    rec.add({
      symbol: it.label,
      label: `Překročení ${Math.round((threshold - 1) * 100)} % nad celostátní průměr → srážka až ${Math.round(r.gpRate * 100)} % z překročení`,
      substitution: `max[0; ${it.avgProvider.toFixed(0)} − ${threshold} · ${it.avgNational.toFixed(0)}] · ${inp.weightedInsured.toFixed(0)} · ${r.gpRate}`,
      value: res.penalty,
      unit: 'czk',
      emphasis: res.penalty > 0 ? 'warning' : undefined,
    })
    raw += res.penalty
  }
  const cap = r.capShare * inp.base
  const penalty = inp.exempt ? 0 : Math.min(raw, cap)
  rec.add({
    symbol: 'Regulační srážka celkem',
    label: inp.exempt ? 'Regulace se neuplatní (≤ 50 registrovaných / nezbytná péče / ZPP nepřekročen)' : 'Nejvýše 15 % z kapitace a výkonů bez ZUM/ZULP',
    substitution: inp.exempt ? '0' : `min[${raw.toFixed(0)}; ${cap.toFixed(0)}]`,
    value: penalty,
    unit: 'czk',
    emphasis: 'result',
  })
  return { steps: rec.steps, penalty, raw, cap }
}

export const avgPerUp = (total: number, up: number) => safeDiv(total, up)

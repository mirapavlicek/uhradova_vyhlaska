/**
 * Příloha č. 6: domácí péče 925 / 916 (část A), mobilní paliativní péče 926 (část B), odbornost 913 (část C).
 */
import type { DecreeParams } from './params'
import { computePuro, type PuroInputs, type PuroResult } from './puro'
import { StepRecorder, safeDiv, type Step } from './steps'

// ---------------------------------------------------------------- 925 / 916

export type HomecareOdb = '925' | '916'

export interface HomecareInputs {
  odb: HomecareOdb
  /** podíl výkonů 06135/06137 na 06313–06318 ≥ 10 % → HB +0,02 (jen 925) a KN +0,03 */
  telemetryShare: boolean
  /** podíl pojištěnců s výkony 06325–06334 ≥ 35 % → KN +0,03 */
  specialisedShare: boolean
  /** podíl pojištěnců s dg. C00–C97, G09–G99, F00–F99, I60–I69… > 35 % → HB +0,05 (jen 925) a KN +0,15 */
  severeDgShare: boolean
  /** pojištěnci s výkonem 06349/06360 (paliativní) – výkonově mimo maximum */
  exemptPoints: number
  exemptKp: number
  puro: PuroInputs
}

export interface HomecareResult {
  steps: Step[]
  hb: number
  kn: number
  puro: PuroResult
  exemptUhr: number
  total: number
}

export function computeHomecare(inp: HomecareInputs, p: DecreeParams): HomecareResult {
  const rec = new StepRecorder()
  const c = p.homecare
  let hb = inp.odb === '925' ? c.hb925 : c.hb916
  let kn = 0
  const hbParts = [`${hb}`]
  const knParts: string[] = []
  if (inp.telemetryShare) {
    if (inp.odb === '925') {
      hb += 0.02
      hbParts.push('+0,02 výkony 06135/06137 ≥ 10 %')
    }
    kn += 0.03
    knParts.push('0,03 výkony 06135/06137')
  }
  if (inp.specialisedShare) {
    kn += 0.03
    knParts.push('0,03 výkony 06325–06334 ≥ 35 %')
  }
  if (inp.severeDgShare) {
    if (inp.odb === '925') {
      hb += 0.05
      hbParts.push('+0,05 závažné dg. > 35 %')
    }
    kn += 0.15
    knParts.push('0,15 závažné dg. > 35 %')
  }
  rec.add({ symbol: `HB_${inp.odb}`, label: 'Hodnota bodu', substitution: hbParts.join(' '), value: hb, unit: 'czk' })
  rec.add({ symbol: 'KN', label: 'Koeficient navýšení', substitution: knParts.length ? knParts.join(' + ') : '0', value: kn, unit: 'index' })

  const puro = computePuro(inp.puro, { baseCoef: c.baseCoef, kn, hbMin: 0, knMultipliesMax: true, exemptUp: c.exemptUp, hb })
  rec.steps.push(...puro.steps)

  const exemptUhr = inp.exemptPoints * hb + inp.exemptKp
  if (exemptUhr) {
    rec.add({ symbol: 'Péče mimo maximum', label: 'Pojištěnci s výkonem 06349 / 06360 – výkonově', substitution: `${inp.exemptPoints} · ${hb.toFixed(2)} + ${inp.exemptKp}`, value: exemptUhr, unit: 'czk' })
  }
  const total = puro.uhr + exemptUhr
  rec.add({ symbol: `Úhrada ${inp.odb} celkem`, label: 'Limitovaná úhrada + péče mimo maximum', substitution: `${puro.uhr.toFixed(0)} + ${exemptUhr.toFixed(0)}`, value: total, unit: 'czk', emphasis: 'result' })
  return { steps: rec.steps, hb, kn, puro, exemptUhr, total }
}

// ---------------------------------------------------------------- 926

export interface PalliativeInputs {
  psychologist: boolean
  socialWorker: boolean
  popAdults: number
  popChildren: number
  /** jednotkový počet bodů výkonu 80091 */
  pb80091: number
  /** body za výkony 80090 a 80091 */
  pointsDays: number
  /** body za výkony 80088, 80089, 09527 */
  pointsOther: number
  /** odečet jiných služeb poskytnutých v den 80090/80091 (nad rámec výjimek) */
  deductions: number
}

export interface PalliativeResult {
  steps: Step[]
  hb: number
  cap: number
  daysUhr: number
  otherUhr: number
  total: number
}

export function computePalliative(inp: PalliativeInputs, p: DecreeParams): PalliativeResult {
  const rec = new StepRecorder()
  const c = p.homecare
  let hb = c.hb926
  const parts = [`${c.hb926}`]
  if (inp.psychologist) {
    hb += 0.02
    parts.push('+0,02 psycholog 0,1 úv.')
  }
  if (inp.socialWorker) {
    hb += 0.02
    parts.push('+0,02 zdravotně-sociální pracovník 0,3 úv.')
  }
  rec.add({ symbol: 'HB_926', label: 'Hodnota bodu', substitution: parts.join(' '), value: hb, unit: 'czk' })

  const capA = inp.popAdults * c.days926Adult * inp.pb80091 * hb
  const capC = inp.popChildren * c.days926Child * inp.pb80091 * hb
  const actual = inp.pointsDays * hb
  const applies = inp.popAdults + inp.popChildren > 5
  const daysUhr = applies ? Math.min(capA + capC, actual) : actual
  rec.add({
    symbol: 'Úhrada 80090/80091',
    label: applies ? 'min{ POP_dosp·30·PB_80091·HB + POP_dět·180·PB_80091·HB ; Body_h·HB }' : 'Maximum se nepoužije (≤ 5 unikátních pojištěnců)',
    substitution: `min{ ${inp.popAdults}·${c.days926Adult}·${inp.pb80091}·${hb.toFixed(2)} + ${inp.popChildren}·${c.days926Child}·${inp.pb80091}·${hb.toFixed(2)} = ${(capA + capC).toFixed(0)} ; ${inp.pointsDays}·${hb.toFixed(2)} = ${actual.toFixed(0)} }`,
    value: daysUhr,
    unit: 'czk',
    note: applies && actual > capA + capC ? 'Strop: v průměru více než 30 dní (180 u dětí) péče na pacienta.' : undefined,
  })
  const otherUhr = inp.pointsOther * hb
  rec.add({ symbol: 'Úhrada 80088/80089/09527', label: 'Výkonově bez limitu', substitution: `${inp.pointsOther} · ${hb.toFixed(2)}`, value: otherUhr, unit: 'czk' })
  const total = daysUhr + otherUhr - inp.deductions
  rec.add({ symbol: 'Úhrada 926 celkem', label: 'Dny péče + ostatní výkony − odečty souběžné péče', substitution: `${daysUhr.toFixed(0)} + ${otherUhr.toFixed(0)} − ${inp.deductions}`, value: total, unit: 'czk', emphasis: 'result' })
  return { steps: rec.steps, hb, cap: capA + capC, daysUhr, otherUhr, total }
}

// ---------------------------------------------------------------- 913

export interface Odb913Inputs {
  severeDgShare: boolean
  uhrRef: number
  /** Σ pacient-měsíců v referenčním období */
  patientMonthsRef: number
  /** Σ pacient-měsíců v hodnoceném období */
  patientMonthsHo: number
  pbHo: number
  kpHo: number
  popRef: number
  popHo: number
}

export interface Odb913Result {
  steps: Step[]
  hb: number
  pmup: number
  cap: number
  performance: number
  total: number
}

export function computeOdb913(inp: Odb913Inputs, p: DecreeParams): Odb913Result {
  const rec = new StepRecorder()
  const c = p.homecare
  const hb = c.hb913 + (inp.severeDgShare ? 0.02 : 0)
  const kn = inp.severeDgShare ? 1.02 : 1
  rec.add({ symbol: 'HB_913', label: 'Hodnota bodu (1,23 + 0,02 při podílu závažných dg. > 25 %)', substitution: inp.severeDgShare ? '1,23 + 0,02' : '1,23', value: hb, unit: 'czk' })
  const pmup = safeDiv(inp.uhrRef, inp.patientMonthsRef)
  rec.add({ symbol: 'PMUP_ref', label: 'Průměrná měsíční úhrada za unikátního pojištěnce v ref. období', formula: 'Uhr_ref / Σ PUM_ref', substitution: `${inp.uhrRef} / ${inp.patientMonthsRef}`, value: pmup, unit: 'czk' })
  const performance = inp.pbHo * hb + inp.kpHo
  rec.add({ symbol: 'Výkonová úhrada', label: 'Body × HB + KP', substitution: `${inp.pbHo} · ${hb.toFixed(2)} + ${inp.kpHo}`, value: performance, unit: 'czk' })
  const capA = pmup * inp.patientMonthsHo * c.growth913 * kn
  const capB = inp.pbHo * c.hbMin913 + inp.kpHo
  const cap = Math.max(capA, capB)
  rec.add({
    symbol: 'Max_913',
    label: 'max{ PMUP_ref · Σ PUM_ho · 1,05 · KN ; PB_ho · HB_min + KP_ho }',
    substitution: `max{ ${pmup.toFixed(0)} · ${inp.patientMonthsHo} · ${c.growth913} · ${kn} = ${capA.toFixed(0)} ; ${inp.pbHo} · ${c.hbMin913} + ${inp.kpHo} = ${capB.toFixed(0)} }`,
    value: cap,
    unit: 'czk',
    note: capB > capA ? 'Uplatnila se minimální hodnota bodu 1,03 Kč.' : undefined,
  })
  const applies = inp.popRef > 30 && inp.popHo > 30
  const total = applies ? Math.min(performance, cap) : performance
  rec.add({
    symbol: 'Úhrada 913',
    label: applies ? 'min{ výkonová úhrada ; maximum }' : 'Maximum se nepoužije (≤ 30 pojištěnců)',
    substitution: applies ? `min{ ${performance.toFixed(0)} ; ${cap.toFixed(0)} }` : `${performance.toFixed(0)}`,
    value: total,
    unit: 'czk',
    emphasis: 'result',
    note: applies && performance > cap ? 'Strop maximální úhrady.' : undefined,
  })
  return { steps: rec.steps, hb, pmup, cap, performance, total }
}

/**
 * Fyzioterapie – odbornost 902, příloha č. 7.
 */
import type { DecreeParams } from './params'
import { computePuro, type PuroInputs, type PuroResult } from './puro'
import { StepRecorder, type Step } from './steps'

export interface EarlyStartRow {
  id: string
  /** dny od ukončení hospitalizace / jednodenní péče do zahájení fyzioterapie */
  days: number
  count: number
}

export interface PhysioInputs {
  /** podíl pojištěnců s dg. G10–G14, I60–I69, S42… > 5 % → HB +0,07 a KN +0,10 */
  neuroTraumaShare: boolean
  /** podíl výkonů 21113/21115/21315 < 50 % → HB +0,01 a KN +0,02 */
  lowBasicShare: boolean
  /** podíl výkonů 21221/21415 > 14 % → KN +0,02 */
  highIndividualShare: boolean
  education: boolean
  /** výkonově hrazená péče vyňatá z maxima (dg. C50, G20, G35…): body */
  exemptPoints: number
  exemptKp: number
  earlyStarts: EarlyStartRow[]
  puro: PuroInputs
}

export interface PhysioResult {
  steps: Step[]
  hb: number
  kn: number
  puro: PuroResult
  exemptUhr: number
  earlyBonus: number
  total: number
}

/** Bonus za včasné zahájení péče: 400 + 400·min[1; (14 − dny)/7] Kč (do 14 dnů). */
export function earlyStartBonus(days: number, p: DecreeParams): number {
  const c = p.physio
  if (days > c.earlyMaxDays || days < 0) return 0
  return c.earlyBase + c.earlyBase * Math.min(1, (c.earlyMaxDays - days) / c.earlyWindow)
}

export function computePhysio(inp: PhysioInputs, p: DecreeParams): PhysioResult {
  const rec = new StepRecorder()
  const c = p.physio

  let hb = c.hbBase
  let kn = 0
  const hbParts = [`${c.hbBase}`]
  const knParts: string[] = []
  if (inp.neuroTraumaShare) {
    hb += 0.07
    kn += 0.1
    hbParts.push('+0,07 neurologické/traumatologické dg. > 5 %')
    knParts.push('0,10 neuro/trauma dg.')
  }
  if (inp.lowBasicShare) {
    hb += 0.01
    kn += 0.02
    hbParts.push('+0,01 podíl základních výkonů < 50 %')
    knParts.push('0,02 základní výkony < 50 %')
  }
  if (inp.highIndividualShare) {
    kn += 0.02
    knParts.push('0,02 výkony 21221/21415 > 14 %')
  }
  if (inp.education) {
    kn += 0.02
    knParts.push('0,02 celoživotní vzdělávání')
  }
  rec.add({ symbol: 'HB_902', label: 'Hodnota bodu', substitution: hbParts.join(' '), value: hb, unit: 'czk' })
  rec.add({ symbol: 'KN', label: 'Koeficient navýšení', substitution: knParts.length ? knParts.join(' + ') : '0', value: kn, unit: 'index' })

  const puro = computePuro(inp.puro, { baseCoef: c.baseCoef, kn, hbMin: c.hbMin, knMultipliesMax: false, exemptUp: c.exemptUp, hb, advanceShare: 1.07 })
  rec.steps.push(...puro.steps)

  const exemptUhr = inp.exemptPoints * hb + inp.exemptKp
  if (exemptUhr) {
    rec.add({
      symbol: 'Péče mimo maximum',
      label: 'Pojištěnci s dg. C50, E83, F84, G20–G23, G35, G51–G83, P07… – výkonově bez limitu',
      substitution: `${inp.exemptPoints} · ${hb.toFixed(2)} + ${inp.exemptKp}`,
      value: exemptUhr,
      unit: 'czk',
    })
  }

  const earlyBonus = inp.earlyStarts.reduce((s, r) => s + earlyStartBonus(r.days, p) * r.count, 0)
  rec.add({
    symbol: 'Bonus včasného zahájení',
    label: 'Σ (400 + 400·min[1; (14 − dny)/7]) × počet pojištěnců',
    substitution: inp.earlyStarts.map((r) => `${r.count} × ${earlyStartBonus(r.days, p).toFixed(0)} Kč (${r.days} dní)`).join(' + ') || '0',
    value: earlyBonus,
    unit: 'czk',
  })

  const total = puro.uhr + exemptUhr + earlyBonus
  rec.add({ symbol: 'Úhrada 902 celkem', label: 'Limitovaná úhrada + péče mimo maximum + bonus včasného zahájení', substitution: `${puro.uhr.toFixed(0)} + ${exemptUhr.toFixed(0)} + ${earlyBonus.toFixed(0)}`, value: total, unit: 'czk', emphasis: 'result' })

  return { steps: rec.steps, hb, kn, puro, exemptUhr, earlyBonus, total }
}

/**
 * Společný "PURO" mechanismus maximální úhrady výkonově hrazených segmentů:
 * ambulantní specialisté (příloha č. 3), fyzioterapie 902 (příloha č. 7) a domácí péče 925/916 (příloha č. 6).
 *
 *   Max = (c + KN)·POPzpoZ·PURO_O + max[(c + KN)·PURO_O·POPzpoMh ; UHRMh − UHRMr]        (specialisté, 902)
 *   Max = (c + KN)·POPzpoZ·PURO_O + (c + KN)·max[PURO_O·POPzpoMh ; UHRMh − UHRMr]        (925/916)
 *   PURO_O = max{ UHR_ref / POP_ref ; (PB_ref·HB_min + KP_ref) / POP_ref }
 */
import { StepRecorder, safeDiv, type Step } from './steps'

export interface PuroInputs {
  /** celková úhrada v referenčním období vč. ZUM/ZULP (KP) */
  uhrRef: number
  /** unikátní pojištěnci v referenčním období */
  popRef: number
  /** body v referenčním období */
  pbRef: number
  /** korunové položky / ZUM + ZULP v referenčním období */
  kpRef: number
  /** základní unikátní pojištěnci 2027 */
  popZ: number
  /** mimořádně nákladní unikátní pojištěnci 2027 (> 5× průměr) */
  popMh: number
  /** úhrada za mimořádně nákladné pojištěnce 2027 */
  uhrMh: number
  /** úhrada za mimořádně nákladné pojištěnce v referenčním období */
  uhrMr: number
  /** body vykázané v hodnoceném období */
  pbHo: number
  /** korunové položky / ZUM + ZULP v hodnoceném období */
  kpHo: number
  /** úhrada za nově nasmlouvané výkony (navyšuje maximum) */
  newServices: number
}

export interface PuroConfig {
  baseCoef: number
  kn: number
  hbMin: number
  /** (c + KN) násobí celý výraz max[…] (domácí péče) */
  knMultipliesMax: boolean
  /** hranice počtu unikátních pojištěnců, pod kterou se maximum nepoužije */
  exemptUp: number
  /** hodnota bodu v hodnoceném období včetně navýšení */
  hb: number
  /** předběžná úhrada – podíl referenční úhrady (1,06 apod.) */
  advanceShare?: number
}

export interface PuroResult {
  steps: Step[]
  puro: number
  puroFloorApplied: boolean
  performance: number
  cap: number
  capApplies: boolean
  capped: boolean
  uhr: number
  advanceMonthly?: number
}

export function computePuro(inp: PuroInputs, cfg: PuroConfig, symbolPrefix = ''): PuroResult {
  const rec = new StepRecorder()
  const s = (x: string) => (symbolPrefix ? `${symbolPrefix} ${x}` : x)

  const puroActual = safeDiv(inp.uhrRef, inp.popRef)
  const puroFloor = cfg.hbMin > 0 ? safeDiv(inp.pbRef * cfg.hbMin + inp.kpRef, inp.popRef) : 0
  const puro = Math.max(puroActual, puroFloor)
  rec.add({
    symbol: s('PURO_O'),
    label: cfg.hbMin > 0 ? 'Průměrná úhrada na unikátního pojištěnce v referenčním období (s minimální hodnotou bodu)' : 'Průměrná úhrada na unikátního pojištěnce v referenčním období',
    formula: cfg.hbMin > 0 ? `max{ UHR_ref / POP_ref ; (PB_ref · ${cfg.hbMin} + KP_ref) / POP_ref }` : 'UHR_ref / POP_ref',
    substitution:
      cfg.hbMin > 0
        ? `max{ ${inp.uhrRef} / ${inp.popRef} = ${puroActual.toFixed(2)} ; (${inp.pbRef} · ${cfg.hbMin} + ${inp.kpRef}) / ${inp.popRef} = ${puroFloor.toFixed(2)} }`
        : `${inp.uhrRef} / ${inp.popRef}`,
    value: puro,
    unit: 'czk',
    note: puroFloor > puroActual ? `Skutečná referenční hodnota bodu byla pod ${cfg.hbMin} Kč – použije se minimální hodnota bodu.` : undefined,
  })

  const performance = inp.pbHo * cfg.hb + inp.kpHo
  rec.add({
    symbol: s('Výkonová úhrada 2027'),
    label: 'Body × hodnota bodu + ZUM/ZULP (KP)',
    substitution: `${inp.pbHo} · ${cfg.hb.toFixed(2)} + ${inp.kpHo}`,
    value: performance,
    unit: 'czk',
  })

  const coef = cfg.baseCoef + cfg.kn
  const basePart = coef * inp.popZ * puro
  const mhInner = cfg.knMultipliesMax ? Math.max(puro * inp.popMh, inp.uhrMh - inp.uhrMr) : Math.max(coef * puro * inp.popMh, inp.uhrMh - inp.uhrMr)
  const mhPart = cfg.knMultipliesMax ? coef * mhInner : mhInner
  const cap = basePart + mhPart + inp.newServices
  rec.add({
    symbol: s('(c + KN)'),
    label: 'Koeficient růstu maxima',
    substitution: `${cfg.baseCoef} + ${cfg.kn.toFixed(2)}`,
    value: coef,
    unit: 'index',
  })
  rec.add({
    symbol: s('Max_2027'),
    label: 'Maximální celková úhrada',
    formula: cfg.knMultipliesMax
      ? '(c + KN)·POPzpoZ·PURO_O + (c + KN)·max[PURO_O·POPzpoMh ; UHRMh − UHRMr] + nové výkony'
      : '(c + KN)·POPzpoZ·PURO_O + max[(c + KN)·PURO_O·POPzpoMh ; UHRMh − UHRMr] + nové výkony',
    substitution: `${coef.toFixed(2)} · ${inp.popZ} · ${puro.toFixed(2)} = ${basePart.toFixed(0)}  +  ${mhPart.toFixed(0)}  +  ${inp.newServices}`,
    value: cap,
    unit: 'czk',
  })

  const popHo = inp.popZ + inp.popMh
  const capApplies = inp.popRef > cfg.exemptUp && popHo > cfg.exemptUp
  const uhr = capApplies ? Math.min(performance, cap) : performance
  rec.add({
    symbol: s('Úhrada 2027'),
    label: capApplies ? 'min{ výkonová úhrada ; maximum }' : `Maximum se nepoužije (≤ ${cfg.exemptUp} unikátních pojištěnců v referenčním nebo hodnoceném období)`,
    substitution: capApplies ? `min{ ${performance.toFixed(0)} ; ${cap.toFixed(0)} }` : `${performance.toFixed(0)}`,
    value: uhr,
    unit: 'czk',
    emphasis: 'result',
    note: capApplies && performance > cap ? `Strop: výkonová úhrada převyšuje maximum o ${(performance - cap).toFixed(0)} Kč.` : undefined,
  })

  let advanceMonthly: number | undefined
  if (cfg.advanceShare) {
    advanceMonthly = (cfg.advanceShare * inp.uhrRef) / 12
    rec.add({
      symbol: s('Měsíční předběžná úhrada'),
      label: `1/12 z ${Math.round(cfg.advanceShare * 100)} % referenční úhrady`,
      substitution: `${cfg.advanceShare} · ${inp.uhrRef} / 12`,
      value: advanceMonthly,
      unit: 'czk',
    })
  }

  return { steps: rec.steps, puro, puroFloorApplied: puroFloor > puroActual, performance, cap, capApplies, capped: capApplies && performance > cap, uhr, advanceMonthly }
}

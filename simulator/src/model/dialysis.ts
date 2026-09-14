/**
 * Dialyzační péče – příloha č. 8: hodnota bodu 1,18 Kč, kvalitativní bonifikace, domácí dialýza,
 * transplantační bonifikace BON_TR a signální výkony včasného zařazení na čekací listinu.
 */
import type { DecreeParams } from './params'
import { computeRegulation, type RegulationItemInputs, type RegulationResult } from './regulation'
import { StepRecorder, safeDiv, type Step } from './steps'

export type QualityLevel = 'none' | 'l1' | 'l2'
export const QUALITY_LABELS: Record<QualityLevel, string> = {
  none: 'kritéria nesplněna',
  l1: '1. úroveň – všechna 4 kritéria (+0,05 Kč)',
  l2: '2. úroveň – alespoň 3 kritéria (+0,07 Kč)',
}

export interface DialysisInputs {
  points: number
  pointsLow: number
  zumZulp: number
  quality: QualityLevel
  /** referovaní pacienti celkem, z toho peritoneální dialýza a domácí HD */
  patientsReported: number
  patientsPd: number
  patientsHomeHd: number
  txp: number
  txo: number
  wlp: number
  wlo: number
  pcelk: number
  signals: { c76661: number; c76662: number; c76663: number; c76664: number; c76667: number }
  upHo: number
  regulation: { exempt: boolean; zulp: RegulationItemInputs; drugs: RegulationItemInputs; requested: RegulationItemInputs }
}

export interface DialysisResult {
  steps: Step[]
  hb: number
  homeShare: number
  ktr: number
  score: number
  bonTr: number
  performance: number
  signals: number
  regulation: RegulationResult
  total: number
}

export function transplantBonus(ktr: number, p: DecreeParams): { score: number; bon: number } {
  const d = p.dialysis
  const score = ktr < d.lt ? 0 : Math.min(1, (ktr - d.lt) / (d.ht - d.lt))
  const bon = score > 0 ? d.nMin + score * (d.nMax - d.nMin) : 0
  return { score, bon }
}

export function computeDialysis(inp: DialysisInputs, p: DecreeParams): DialysisResult {
  const rec = new StepRecorder()
  const d = p.dialysis
  let hb = d.hb
  const parts = [`${d.hb}`]
  if (inp.quality === 'l2') {
    hb += d.qualityL2
    parts.push(`+${d.qualityL2} kvalita 2. úroveň`)
  } else if (inp.quality === 'l1') {
    hb += d.qualityL1
    parts.push(`+${d.qualityL1} kvalita 1. úroveň`)
  }
  const homeShare = safeDiv(inp.patientsPd * 1.5 + inp.patientsHomeHd, inp.patientsReported)
  if (homeShare >= d.homeShare) {
    hb += d.homeBonus
    parts.push(`+${d.homeBonus} domácí dialýza`)
  }
  rec.add({
    symbol: 'Podíl domácí dialýzy',
    label: '(PD · 1,5 + domácí HD) / referovaní pacienti ≥ 6 % → +0,02 Kč',
    substitution: `(${inp.patientsPd} · 1,5 + ${inp.patientsHomeHd}) / ${inp.patientsReported}`,
    value: homeShare,
    unit: 'pct',
  })
  const ktr = safeDiv(inp.txp * 2 + inp.txo + inp.wlp * 2 + inp.wlo, inp.pcelk)
  const { score, bon } = transplantBonus(ktr, p)
  hb += bon
  if (bon) parts.push(`+${bon.toFixed(4)} BON_TR`)
  rec.add({
    symbol: 'K_TR',
    label: 'Podíl pacientů < 80 let transplantovaných / na čekací listině (preemptivní s vahou 2)',
    formula: '(PP_TXP·2 + PP_TXO + PP_WLP·2 + PP_WLO) / PP_CELK',
    substitution: `(${inp.txp}·2 + ${inp.txo} + ${inp.wlp}·2 + ${inp.wlo}) / ${inp.pcelk}`,
    value: ktr,
    unit: 'pct',
  })
  rec.add({
    symbol: 'S',
    label: `Skóre: 0 pod LT = ${d.lt}; min(1; (K_TR − LT)/(HT − LT)) nad ním`,
    substitution: ktr < d.lt ? `${ktr.toFixed(3)} < ${d.lt}` : `min(1; (${ktr.toFixed(3)} − ${d.lt}) / (${d.ht} − ${d.lt}))`,
    value: score,
    unit: 'index',
  })
  rec.add({
    symbol: 'BON_TR',
    label: 'Navýšení hodnoty bodu: 0 při S = 0, jinak N_min + S·(N_max − N_min)',
    substitution: score > 0 ? `${d.nMin} + ${score.toFixed(3)} · (${d.nMax} − ${d.nMin})` : '0',
    value: bon,
    unit: 'czk',
    note: score === 0 && ktr >= d.lt ? 'K_TR přesně na LT → S = 0 → BON_TR = 0 (těsně nad LT skokově N_min).' : undefined,
  })
  rec.add({ symbol: 'HB_dialýza', label: 'Výsledná hodnota bodu', substitution: parts.join(' '), value: hb, unit: 'czk' })

  const performance = inp.points * hb + inp.pointsLow * d.hbLow + inp.zumZulp
  rec.add({
    symbol: 'Výkonová úhrada',
    label: 'Body × HB + body 18530/18550 × 0,92 + ZUM/ZULP',
    substitution: `${inp.points} · ${hb.toFixed(4)} + ${inp.pointsLow} · ${d.hbLow} + ${inp.zumZulp}`,
    value: performance,
    unit: 'czk',
    emphasis: 'result',
  })
  const s = inp.signals
  const signals = s.c76661 * 3_000 + s.c76662 * 4_500 + s.c76663 * 7_000 + s.c76664 * 10_500 + s.c76667 * 20_000
  rec.add({
    symbol: 'Čekací listina',
    label: 'Signální výkony 76661 (3 000), 76662 (4 500), 76663 (7 000), 76664 (10 500), 76667 (20 000)',
    substitution: `${s.c76661}·3000 + ${s.c76662}·4500 + ${s.c76663}·7000 + ${s.c76664}·10500 + ${s.c76667}·20000`,
    value: signals,
    unit: 'czk',
  })
  const regulation = computeRegulation(
    {
      upHo: inp.upHo,
      performanceBase: performance - inp.zumZulp,
      exempt: inp.regulation.exempt || inp.upHo <= 50,
      items: { zulp: inp.regulation.zulp, drugs: inp.regulation.drugs, requested: inp.regulation.requested },
    },
    { ...p, regulation: { ...p.regulation, drugsThreshold: 1.1 } },
    ['zulp', 'drugs', 'requested'],
  )
  rec.steps.push(...regulation.steps)
  const total = performance + signals - regulation.penalty
  rec.add({ symbol: 'Úhrada celkem', label: 'Výkony + signální výkony − regulace', substitution: `${performance.toFixed(0)} + ${signals} − ${regulation.penalty.toFixed(0)}`, value: total, unit: 'czk', emphasis: 'result' })
  return { steps: rec.steps, hb, homeShare, ktr, score, bonTr: bon, performance, signals, regulation, total }
}

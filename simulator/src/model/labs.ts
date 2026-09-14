/**
 * Příloha č. 5: radiodiagnostika 809/810 (výsledná hodnota bodu HBred = FS + VS) a laboratoře
 * 222, 801, 802, 807, 808, 812–818, 823 (maximum POP_icz · PURO_icz · KN s korekcí minimální hodnoty bodu).
 */
import type { DecreeParams } from './params'
import { StepRecorder, safeDiv, type Step } from './steps'

export interface RdgGroup {
  id: string
  name: string
  hb: number
  fs: number
  pbRef: number
  uopRef: number
  pbHo: number
  uopHo: number
}

export interface LabsInputs {
  /** RDG skupiny a)–d) podle bodu 3 části A */
  rdg: RdgGroup[]
  /** bonifikace +0,02 Kč za ordinační dobu (35 h / 70 h) */
  rdgHoursBonus: boolean
  /** laboratoře skupiny b) – odbornosti 222, 801, 802, 807, 808, 812–815, 817, 818, 823 */
  lab: {
    accredited: boolean
    /** vážená hodnota bodu referenčního období Σ PB_i·HB_i / PB_ref */
    hbRefWeighted: number
    hbHo: number
    uhrRef: number
    pbRef: number
    popRef: number
    popHo: number
    pbHo: number
    kpHo: number
    newServices: number
  }
  /** odbornost 816 – skupina c) */
  gen: {
    uhrRef: number
    pbRef: number
    kpRef: number
    popRef: number
    hbRef: number
    popHo: number
    pbHo: number
    kpHo: number
  }
}

export interface LabsResult {
  steps: Step[]
  rdg: { group: RdgGroup; vs: number; hbRed: number; uhr: number; reduced: boolean }[]
  rdgTotal: number
  lab: { hbSkut: number; hbMin: number; puro: number; puroAdjusted: boolean; cap: number; performance: number; uhr: number; capped: boolean }
  gen: { hbSkut: number; hbMin: number; puro: number; puroAdjusted: boolean; cap: number; performance: number; uhr: number; capped: boolean }
  total: number
}

export function computeLabs(inp: LabsInputs, p: DecreeParams): LabsResult {
  const rec = new StepRecorder()
  const c = p.labs

  // --- radiodiagnostika
  const rdg = inp.rdg.map((g) => {
    const hb = g.hb + (inp.rdgHoursBonus ? 0.02 : 0)
    const ratio = safeDiv(c.kn809 * safeDiv(g.pbRef, g.uopRef), safeDiv(g.pbHo, g.uopHo), 1)
    const vs = (hb - g.fs) * Math.min(1, ratio)
    const hbRed = g.fs + vs
    const uhr = g.pbHo * hbRed
    rec.add({
      symbol: `HBred – ${g.name}`,
      label: 'Výsledná hodnota bodu = FS + (HB − FS)·min{1; KN·(PB_ref/UOP_ref)/(PB_ho/UOP_ho)}',
      substitution: `${g.fs} + (${hb.toFixed(2)} − ${g.fs}) · min{1; ${c.kn809} · (${g.pbRef}/${g.uopRef}) / (${g.pbHo}/${g.uopHo}) = ${ratio.toFixed(4)}}`,
      value: hbRed,
      unit: 'czk',
      emphasis: ratio < 1 ? 'warning' : undefined,
      note: ratio < 1 ? `Počet bodů na unikátního pojištěnce vzrostl o ${((1 / ratio - 1) * 100).toFixed(1)} % – variabilní složka se krátí.` : undefined,
    })
    rec.add({ symbol: `Úhrada – ${g.name}`, label: 'PB_ho × HBred', substitution: `${g.pbHo} · ${hbRed.toFixed(4)}`, value: uhr, unit: 'czk' })
    return { group: g, vs, hbRed, uhr, reduced: ratio < 1 }
  })
  const rdgTotal = rdg.reduce((s, x) => s + x.uhr, 0)

  // --- laboratoře b)
  const L = inp.lab
  const hbSkut = safeDiv(L.uhrRef, L.pbRef)
  const hbMin = L.hbRefWeighted * c.hbMinShare
  const puroBase = safeDiv(L.uhrRef, L.popRef)
  const labAdjusted = hbSkut > 0 && hbSkut < hbMin
  const puroLab = labAdjusted ? (hbMin / hbSkut) * puroBase : puroBase
  rec.add({
    symbol: 'HB_skut,a / HB_min,a',
    label: 'Skutečná hodnota bodu ref. období vs. minimální (91 % vážené HB)',
    substitution: `${L.uhrRef} / ${L.pbRef} = ${hbSkut.toFixed(4)}  vs.  ${L.hbRefWeighted} · ${c.hbMinShare} = ${hbMin.toFixed(4)}`,
    value: hbSkut,
    unit: 'czk',
    note: labAdjusted ? 'HB_skut je pod minimem – PURO_icz se navýší poměrem HB_min / HB_skut.' : undefined,
  })
  rec.add({
    symbol: 'PURO_icz (lab)',
    label: labAdjusted ? 'PURO_icznové,a = HB_min,a / HB_skut,a · PURO_icz' : 'Průměrná úhrada na unikátního pojištěnce v ref. období',
    substitution: labAdjusted ? `${hbMin.toFixed(4)} / ${hbSkut.toFixed(4)} · ${puroBase.toFixed(2)}` : `${L.uhrRef} / ${L.popRef}`,
    value: puroLab,
    unit: 'czk',
  })
  const labCap = L.popHo * puroLab * c.knLabs + L.newServices
  const labPerf = L.pbHo * L.hbHo + L.kpHo
  const labApplies = L.popRef > 50 && L.popHo > 50
  const labUhr = labApplies ? Math.min(labPerf, labCap) : labPerf
  rec.add({
    symbol: 'Max (lab)',
    label: `POP_icz · PURO_icz · KN (${c.knLabs}) + nové výkony`,
    substitution: `${L.popHo} · ${puroLab.toFixed(2)} · ${c.knLabs} + ${L.newServices}`,
    value: labCap,
    unit: 'czk',
  })
  rec.add({
    symbol: 'Úhrada laboratoří',
    label: labApplies ? `min{ PB_ho · HB (${L.hbHo}${inp.lab.accredited ? ', akreditace' : ', bez akreditace'}) + KP ; Max }` : 'Maximum se nepoužije (≤ 50 UP)',
    substitution: labApplies ? `min{ ${L.pbHo} · ${L.hbHo} + ${L.kpHo} = ${labPerf.toFixed(0)} ; ${labCap.toFixed(0)} }` : `${labPerf.toFixed(0)}`,
    value: labUhr,
    unit: 'czk',
    emphasis: 'result',
    note: labApplies && labPerf > labCap ? 'Strop maximální úhrady.' : undefined,
  })

  // --- odbornost 816 c)
  const G = inp.gen
  const genHbSkut = safeDiv(G.uhrRef - G.kpRef, G.pbRef)
  const genHbMin = G.hbRef * c.hbMinShare816
  const genPuroBase = safeDiv(G.uhrRef, G.popRef)
  const genAdjusted = genHbSkut > 0 && genHbSkut < genHbMin
  const genPuro = genAdjusted ? safeDiv(G.pbRef * genHbMin + G.kpRef, G.popRef) : genPuroBase
  rec.add({
    symbol: 'HB_skut,b / HB_min,b (816)',
    label: 'Skutečná hodnota bodu (UHR − KP)/PB vs. 60 % referenční HB',
    substitution: `(${G.uhrRef} − ${G.kpRef}) / ${G.pbRef} = ${genHbSkut.toFixed(4)}  vs.  ${G.hbRef} · ${c.hbMinShare816} = ${genHbMin.toFixed(4)}`,
    value: genHbSkut,
    unit: 'czk',
    note: genAdjusted ? 'HB_skut je pod minimem – PURO_icznové,b = (PB_ref·HB_min + KP_ref)/UOP_ref.' : undefined,
  })
  const genCap = G.popHo * genPuro * c.kn816
  const genPerf = G.pbHo * 0.8 + G.kpHo
  const genApplies = G.popRef > 50 && G.popHo > 50
  const genUhr = genApplies ? Math.min(genPerf, genCap) : genPerf
  rec.add({
    symbol: 'Úhrada 816',
    label: genApplies ? `min{ PB_ho · 0,80 + KP ; POP · PURO_icz (${genPuro.toFixed(2)}) · ${c.kn816} }` : 'Maximum se nepoužije (≤ 50 UP)',
    substitution: genApplies ? `min{ ${genPerf.toFixed(0)} ; ${genCap.toFixed(0)} }` : `${genPerf.toFixed(0)}`,
    value: genUhr,
    unit: 'czk',
    emphasis: 'result',
    note: genApplies && genPerf > genCap ? 'Strop maximální úhrady.' : undefined,
  })

  const total = rdgTotal + labUhr + genUhr
  rec.add({ symbol: 'Příloha č. 5 celkem', label: 'RDG + laboratoře + lékařská genetika', substitution: `${rdgTotal.toFixed(0)} + ${labUhr.toFixed(0)} + ${genUhr.toFixed(0)}`, value: total, unit: 'czk', emphasis: 'result' })

  return {
    steps: rec.steps,
    rdg,
    rdgTotal,
    lab: { hbSkut, hbMin, puro: puroLab, puroAdjusted: labAdjusted, cap: labCap, performance: labPerf, uhr: labUhr, capped: labApplies && labPerf > labCap },
    gen: { hbSkut: genHbSkut, hbMin: genHbMin, puro: genPuro, puroAdjusted: genAdjusted, cap: genCap, performance: genPerf, uhr: genUhr, capped: genApplies && genPerf > genCap },
    total,
  }
}

export const DEFAULT_RDG_GROUPS: RdgGroup[] = [
  { id: 'a', name: 'a) 809/810 – běžné výkony (HB 1,36 / FS 0,51)', hb: 1.36, fs: 0.51, pbRef: 40_000_000, uopRef: 20_000, pbHo: 43_000_000, uopHo: 20_800 },
  { id: 'b', name: 'b) 89611–89619 screening (HB 0,64 / FS 0,45)', hb: 0.64, fs: 0.45, pbRef: 6_000_000, uopRef: 5_000, pbHo: 6_300_000, uopHo: 5_200 },
  { id: 'c', name: 'c) 89711–89725 (HB 0,67 / FS 0,45)', hb: 0.67, fs: 0.45, pbRef: 3_000_000, uopRef: 2_500, pbHo: 3_200_000, uopHo: 2_600 },
  { id: 'd', name: 'd) 89312 (HB 0,95 / FS 0,43)', hb: 0.95, fs: 0.43, pbRef: 1_000_000, uopRef: 900, pbHo: 1_050_000, uopHo: 950 },
]

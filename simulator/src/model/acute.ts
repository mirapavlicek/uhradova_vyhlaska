/**
 * Akutní lůžková péče – příloha č. 1, část A návrhu ÚV 2027.
 * Paušální úhrada (skupiny A, D), vyčleněná úhrada (C, E), případový paušál (B, F, G, H),
 * poskytovatelé pod 50 případů.
 */
import { indexIzp } from './indexes'
import type { DecreeParams, ProviderType } from './params'
import { StepRecorder, safeDiv, type Step } from './steps'

/** Společné charakteristiky poskytovatele a pojišťovny. */
export interface AcuteCommon {
  providerType: ProviderType
  /** celostátní podmínka proočkovanosti splněna → CZS 85 000 */
  vaccinationMet: boolean
  /** CM_2025 za všechny ZP (relativní váhy 2027) */
  cmAllInsurers2025: number
  /** počet případů 2025 za všechny ZP */
  casesAllInsurers2025: number
  /** koeficient poměru počtu pojištěnců ZP v okrese (příl. 9, bod 1) */
  insurerDistrictShare: number
}

export function effectiveCzs(c: AcuteCommon, p: DecreeParams): number {
  return c.vaccinationMet ? p.czsVaccinated : p.czs
}

export function cmi(c: AcuteCommon): number {
  return safeDiv(c.cmAllInsurers2025, c.casesAllInsurers2025)
}

export function variableX(c: AcuteCommon, p: DecreeParams): number {
  return c.insurerDistrictShare > p.xInsurerThreshold ? p.xLargeInsurer : p.xSmallInsurer
}

// ---------------------------------------------------------------------------
// Paušální úhrada (bod 3)
// ---------------------------------------------------------------------------

export interface PuInputs {
  /** CM_2025,CZ-DRG,A – casemix skupiny A v referenčním období */
  cm2025A: number
  /** CM_2025,CZ-DRG,A-D – casemix skupin A až D v referenčním období */
  cm2025AtoD: number
  /** CM_2025,CZ-DRG,D – casemix skupiny D (homogenní složka) */
  cm2025D: number
  /** referenční úhrady 2025 */
  uhrPu2025: number
  uhrEu2025: number
  uhrIsu2025: number
  em2025: number
  /** CM_2027,CZ-DRG,AD – casemix skupin A a D v hodnoceném období (před redukcí) */
  cm2027AD: number
  /** z toho casemix případů ukončených překladem (kód ukončení 5) */
  cm2027Transfer: number
  /** počty případů pro test podílu překladů */
  cases2025: number
  cases2027: number
  transfers2025: number
  transfers2027: number
  /** EM_2027,AD – vyžádaná extramurální péče */
  em2027: number
}

export interface PuResult {
  steps: Step[]
  uhr: number
  ipu: number
  izp: number
  ratio: number
  cmRed: number
  pu2025A: number
  zsMax: number
  izs: number
}

/** Redukce casemixu za překlady (bod 3.2) – sdílená paušálem i pod50. */
export function reducedCasemixTransfers(
  inp: Pick<PuInputs, 'cm2027AD' | 'cm2027Transfer' | 'cases2025' | 'cases2027' | 'transfers2025' | 'transfers2027'>,
  common: AcuteCommon,
  p: DecreeParams,
  rec: StepRecorder,
): number {
  const X = variableX(common, p)
  rec.add({
    symbol: 'X',
    label: 'Proměnná X podle podílu pojištěnců ZP v okrese',
    formula: `X = ${p.xLargeInsurer} pokud koeficient > ${p.xInsurerThreshold}, jinak ${p.xSmallInsurer}`,
    substitution: `koeficient = ${common.insurerDistrictShare}`,
    value: X,
    unit: 'index',
  })

  const share2027 = safeDiv(inp.transfers2027, inp.cases2027)
  const share2025 = safeDiv(inp.transfers2025, inp.cases2025)
  rec.add({
    symbol: 'PPR_2027,5 / PP_2027',
    label: 'Podíl případů ukončených překladem v hodnoceném období',
    substitution: `${inp.transfers2027} / ${inp.cases2027}`,
    value: share2027,
    unit: 'pct',
    note: `Redukce se uplatní pouze, je-li podíl > ${p.transferShareThreshold * 100} % v roce 2027 i 2025.`,
  })

  const cm1 = inp.cm2027AD - inp.cm2027Transfer
  const applies = share2027 > p.transferShareThreshold && share2025 > p.transferShareThreshold
  let reductionFactor = 1
  if (applies) {
    const raw = X * safeDiv(inp.transfers2025, inp.transfers2027, 1) * safeDiv(inp.cases2027, inp.cases2025, 1)
    reductionFactor = Math.min(1, raw)
    rec.add({
      symbol: 'min[1; X·(PPR_2025/PPR_2027)·(PP_2027/PP_2025)]',
      label: 'Koeficient redukce casemixu překladů',
      substitution: `min[1; ${X} · (${inp.transfers2025}/${inp.transfers2027}) · (${inp.cases2027}/${inp.cases2025})] = min[1; ${raw.toFixed(4)}]`,
      value: reductionFactor,
      unit: 'index',
      emphasis: reductionFactor < 1 ? 'warning' : undefined,
    })
  }
  const cmRed5 = inp.cm2027Transfer * reductionFactor
  const cmRed = cm1 + cmRed5
  rec.add({
    symbol: 'CM_red,2027,CZ-DRG,AD',
    label: applies ? 'Redukovaný casemix = CM_1 + CM_red,5' : 'Redukovaný casemix (redukce se neuplatní, CM_red = CM_2027)',
    formula: 'CM_red = CM_1,2027 + CM_2027,5 · min[1; X·(PPR_2025/PPR_2027)·(PP_2027/PP_2025)]',
    substitution: applies ? `${cm1.toFixed(2)} + ${inp.cm2027Transfer} · ${reductionFactor.toFixed(4)}` : `${inp.cm2027AD}`,
    value: cmRed,
    unit: 'cm',
  })
  return cmRed
}

export function computePu(inp: PuInputs, common: AcuteCommon, p: DecreeParams): PuResult {
  const rec = new StepRecorder()
  const czs = effectiveCzs(common, p)
  const providerCmi = cmi(common)

  rec.add({
    symbol: 'CZS_CZ-DRG,2027',
    label: 'Centrální základní sazba',
    formula: `${p.czs} Kč; ${p.czsVaccinated} Kč při splnění celostátní podmínky proočkovanosti`,
    value: czs,
    unit: 'czk',
  })
  rec.add({
    symbol: 'CMI',
    label: 'Casemix-index referenčního období (všechny ZP)',
    formula: 'CMI = CM_2025,všechnyZP / PP_drg,2025,všechnyZP',
    substitution: `${common.cmAllInsurers2025} / ${common.casesAllInsurers2025}`,
    value: providerCmi,
    unit: 'index',
  })

  // --- referenční paušál a koridor základních sazeb (bod 3.1)
  const refTotal = inp.uhrPu2025 + inp.uhrEu2025 + inp.uhrIsu2025 + inp.em2025
  const izs = safeDiv(refTotal, inp.cm2025AtoD)
  rec.add({
    symbol: 'IZS_2025,PU',
    label: 'Referenční individuální základní sazba',
    formula: 'IZS = (ÚHR_PU,2025 + ÚHR_EU + ÚHR_ISU + EM_2025) / CM_2025,A-D',
    substitution: `(${inp.uhrPu2025} + ${inp.uhrEu2025} + ${inp.uhrIsu2025} + ${inp.em2025}) / ${inp.cm2025AtoD}`,
    value: izs,
    unit: 'czk',
  })
  const zsMax = p.zsMaxCapWeight * p.zsMaxCap + (1 - p.zsMaxCapWeight) * izs
  rec.add({
    symbol: 'ZS_max,2025,PU',
    label: 'Maximální základní sazba',
    formula: `ZS_max = ${p.zsMaxCapWeight}·MAX + ${(1 - p.zsMaxCapWeight).toFixed(2)}·IZS`,
    substitution: `${p.zsMaxCapWeight} · ${p.zsMaxCap} + ${(1 - p.zsMaxCapWeight).toFixed(2)} · ${izs.toFixed(0)}`,
    value: zsMax,
    unit: 'czk',
  })
  const zsMin = p.zsMin[common.providerType]
  rec.add({
    symbol: 'ZS_min,2025,PU',
    label: 'Minimální základní sazba podle typu poskytovatele',
    value: zsMin,
    unit: 'czk',
  })
  const upper = inp.cm2025AtoD * zsMax
  const lower = inp.cm2025AtoD * zsMin
  const corridor = Math.min(upper, Math.max(lower, refTotal))
  let corridorNote = 'Referenční úhrada leží v koridoru – beze změny.'
  if (refTotal > upper) corridorNote = 'Referenční úhrada převyšuje horní hranici koridoru – sražena na CM·ZS_max.'
  if (refTotal < lower) corridorNote = 'Referenční úhrada je pod dolní hranicí koridoru – navýšena na CM·ZS_min.'
  rec.add({
    symbol: 'koridor',
    label: 'Referenční úhrada A–D po aplikaci koridoru sazeb',
    formula: 'min{CM_A-D·ZS_max; max[CM_A-D·ZS_min; ÚHR_PU + ÚHR_EU + ÚHR_ISU + EM]}',
    substitution: `min{${upper.toFixed(0)}; max[${lower.toFixed(0)}; ${refTotal.toFixed(0)}]}`,
    value: corridor,
    unit: 'czk',
    note: corridorNote,
    emphasis: corridor !== refTotal ? 'warning' : undefined,
  })
  const shareA = safeDiv(inp.cm2025A, inp.cm2025AtoD)
  const pu2025A = corridor * shareA
  rec.add({
    symbol: 'PU_2025,CZ-DRG,A',
    label: 'Referenční paušál připadající na skupinu A',
    formula: 'PU_2025,A = koridor · CM_2025,A / CM_2025,A-D',
    substitution: `${corridor.toFixed(0)} · ${inp.cm2025A} / ${inp.cm2025AtoD}`,
    value: pu2025A,
    unit: 'czk',
  })

  // --- IPU
  const nmPuD = providerCmi > p.cmiThreshold ? p.nm.puD : 1
  rec.add({
    symbol: 'NM_PU,D',
    label: 'Nákladový modifikátor homogenní složky',
    formula: `${p.nm.puD} pro CMI > ${p.cmiThreshold}, jinak 1`,
    value: nmPuD,
    unit: 'index',
  })
  const pu2027D = inp.cm2025D * czs * nmPuD
  rec.add({
    symbol: 'PU_2027,CZ-DRG,D',
    label: 'Homogenní složka na centrální sazbě',
    formula: 'PU_2027,D = CM_2025,D · CZS · NM_PU,D',
    substitution: `${inp.cm2025D} · ${czs} · ${nmPuD}`,
    value: pu2027D,
    unit: 'czk',
  })
  const ipu = pu2025A * p.puGrowth + pu2027D
  rec.add({
    symbol: 'IPU',
    label: 'Individuální paušální úhrada',
    formula: `IPU = PU_2025,A · ${p.puGrowth} + PU_2027,D`,
    substitution: `${pu2025A.toFixed(0)} · ${p.puGrowth} + ${pu2027D.toFixed(0)}`,
    value: ipu,
    unit: 'czk',
    emphasis: 'result',
  })

  // --- redukovaný casemix a indexy
  const cmRed = reducedCasemixTransfers(inp, common, p, rec)
  const cm2025AD = inp.cm2025A + inp.cm2025D
  const ratio = safeDiv(cmRed, cm2025AD, 1)
  rec.add({
    symbol: 'r',
    label: 'Poměr redukovaného casemixu 2027 k referenčnímu casemixu A+D',
    formula: 'r = CM_red,2027,AD / CM_2025,AD',
    substitution: `${cmRed.toFixed(2)} / ${cm2025AD}`,
    value: ratio,
    unit: 'ratio',
  })
  const declineFactor = Math.min(1, ratio / p.declineTolerance)
  rec.add({
    symbol: 'min{1; r/0,98}',
    label: 'Krácení při poklesu produkce',
    formula: `min{1; CM_red / (${p.declineTolerance} · CM_2025)}`,
    substitution: `min{1; ${ratio.toFixed(4)} / ${p.declineTolerance}}`,
    value: declineFactor,
    unit: 'index',
    emphasis: declineFactor < 1 ? 'warning' : undefined,
    note: declineFactor < 1 ? 'Produkce klesla o více než toleranci – paušál se krátí lineárně.' : undefined,
  })
  const izp = indexIzp(ratio, p)
  rec.add({
    symbol: 'I_ZP',
    label: 'Index změny produkce (degresivní úhrada nadprodukce)',
    formula: `I_ZP = max[1; ARCTG(${p.izp.a}·r − ${p.izp.b})]`,
    substitution: `max[1; ARCTG(${p.izp.a} · ${ratio.toFixed(4)} − ${p.izp.b})]`,
    value: izp,
    unit: 'index',
  })
  const uhr = declineFactor * ipu * izp - inp.em2027
  rec.add({
    symbol: 'ÚHR_PU,CZ-DRG,2027',
    label: 'Paušální úhrada 2027',
    formula: 'ÚHR_PU = min{1; r/0,98} · IPU · I_ZP − EM_2027,AD',
    substitution: `${declineFactor.toFixed(4)} · ${ipu.toFixed(0)} · ${izp.toFixed(4)} − ${inp.em2027}`,
    value: uhr,
    unit: 'czk',
    emphasis: 'result',
  })

  return { steps: rec.steps, uhr, ipu, izp, ratio, cmRed, pu2025A, zsMax, izs }
}

// ---------------------------------------------------------------------------
// Koeficient duševního zdraví K_DZ (bod 5.2)
// ---------------------------------------------------------------------------

export type CdzOption = 'none' | 'standard' | 'odb355'
export type DsOption = 'none' | '00043' | 'other'

export interface KdzInputs {
  kpKritMet: boolean
  cdz: CdzOption
  ds: DsOption
  /** počty lůžek následné lůžkové psychiatrické péče */
  plnlp2018: number
  plnlp2027: number
  plnlp2030: number
}

export function computeKdz(inp: KdzInputs, p: DecreeParams, rec: StepRecorder): number {
  const kp = inp.kpKritMet ? p.kdz.kpKritOk : p.kdz.kpKritFail
  rec.add({
    symbol: 'KP_krit',
    label: 'Plnění kritérií akutní psychiatrické péče',
    formula: `${p.kdz.kpKritOk} při splnění všech podmínek bodu 5.3, jinak ${p.kdz.kpKritFail}`,
    value: kp,
    unit: 'index',
    emphasis: kp < 0 ? 'warning' : undefined,
  })
  const cdz = inp.cdz === 'odb355' ? p.kdz.cdzOdb355 : inp.cdz === 'standard' ? p.kdz.cdzStandard : 0
  rec.add({ symbol: 'K_CDZ', label: 'Bonifikace za centrum duševního zdraví', value: cdz, unit: 'index' })
  const ds = inp.ds === '00043' ? p.kdz.ds00043 : inp.ds === 'other' ? p.kdz.dsOther : 0
  rec.add({ symbol: 'K_DS', label: 'Bonifikace za denní stacionář', value: ds, unit: 'index' })

  let trans = 0
  const plannedReduction = inp.plnlp2018 - inp.plnlp2030
  if (inp.plnlp2030 > 0 && plannedReduction > 0) {
    const root = Math.sqrt((p.kdz.transRootShare * inp.plnlp2018) / inp.plnlp2030)
    const progress = (inp.plnlp2018 - inp.plnlp2027) / (p.kdz.transDenominator * plannedReduction)
    trans = p.kdz.transBase * root * Math.min(p.kdz.transCap, progress)
    rec.add({
      symbol: 'K_TransNLP',
      label: 'Bonifikace za tempo transformace lůžek následné psychiatrické péče',
      formula: `${p.kdz.transBase}·√(${p.kdz.transRootShare}·PLNLP_2018/PLNLP_2030)·min[${p.kdz.transCap}; (PLNLP_2018−PLNLP_2027)/(${p.kdz.transDenominator}·(PLNLP_2018−PLNLP_2030))]`,
      substitution: `${p.kdz.transBase} · ${root.toFixed(4)} · min[${p.kdz.transCap}; ${progress.toFixed(4)}]`,
      value: trans,
      unit: 'index',
    })
  } else {
    rec.add({
      symbol: 'K_TransNLP',
      label: 'Bonifikace za transformaci (bez platného plánu redukce lůžek → 0)',
      value: 0,
      unit: 'index',
    })
  }
  const kdz = 1 + kp + cdz + ds + trans
  rec.add({
    symbol: 'K_DZ',
    label: 'Koeficient duševního zdraví',
    formula: 'K_DZ = 1 + KP_krit + K_CDZ + K_DS + K_TransNLP',
    substitution: `1 + ${kp} + ${cdz} + ${ds} + ${trans.toFixed(4)}`,
    value: kdz,
    unit: 'index',
    emphasis: 'result',
  })
  return kdz
}

// ---------------------------------------------------------------------------
// Skupiny případů – společný výpočet Σ max(JPL; DRG·NM)·CZS·KC
// ---------------------------------------------------------------------------

export interface CaseGroupRow {
  id: string
  name: string
  /** casemix podle CZ-DRG (relativní váhy 2027) */
  cmDrg: number
  /** ocenění podle jednotlivých položek (JPL) přepočtené na jednotky casemixu */
  cmJpl: number
  /** koeficient centralizace KC pro skupinu */
  kc: number
}

function sumGroups(rows: CaseGroupRow[], nm: number, czs: number, rec: StepRecorder, symbolPrefix: string): number {
  let total = 0
  for (const row of rows) {
    const drgValued = row.cmDrg * nm
    const chosen = Math.max(row.cmJpl, drgValued)
    const amount = chosen * czs * row.kc
    total += amount
    rec.add({
      symbol: `${symbolPrefix} – ${row.name || row.id}`,
      label: `max(CM_JPL; CM_DRG·NM) · CZS · KC`,
      substitution: `max(${row.cmJpl}; ${row.cmDrg} · ${nm}) · ${czs} · ${row.kc} = ${chosen.toFixed(3)} · ${czs} · ${row.kc}`,
      value: amount,
      unit: 'czk',
      note: row.cmJpl > drgValued ? 'Použito ocenění podle JPL (vyšší).' : 'Použito ocenění CZ-DRG × NM.',
    })
  }
  return total
}

// ---------------------------------------------------------------------------
// Vyčleněná úhrada (bod 4, skupiny C, E)
// ---------------------------------------------------------------------------

export type NmCeTier = 'auto' | 'refNet6' | 'trauma4' | 'none'

export interface SeparatedInputs {
  rows: CaseGroupRow[]
  cmPovinneJpl: number
  /** stupeň NM_CE pro poskytovatele s CMI ≤ prahu */
  nmCeTier: NmCeTier
  /** casemix iktových případů (01-K10-01 až 06) */
  cmCmp: number
  /** splněna podmínka vykázání mRS u ≥ 90 % pacientů */
  mrsMet: boolean
  em: number
}

export interface SeparatedResult {
  steps: Step[]
  uhr: number
  nmCe: number
}

export function computeSeparated(inp: SeparatedInputs, common: AcuteCommon, p: DecreeParams): SeparatedResult {
  const rec = new StepRecorder()
  const czs = effectiveCzs(common, p)
  const providerCmi = cmi(common)
  let nmCe = 1
  let nmLabel = 'ostatní poskytovatelé'
  if (providerCmi > p.cmiThreshold) {
    nmCe = p.nm.ceHighCmi
    nmLabel = `CMI ${providerCmi.toFixed(2)} > ${p.cmiThreshold}`
  } else if (inp.nmCeTier === 'refNet6') {
    nmCe = p.nm.ceRefNet6
    nmLabel = 'referenční síť + ≥ 6 statusů centra'
  } else if (inp.nmCeTier === 'trauma4') {
    nmCe = p.nm.ceTrauma4
    nmLabel = 'traumacentrum + ≥ 4 další statusy'
  }
  rec.add({
    symbol: 'NM_CE',
    label: `Nákladový modifikátor vyčleněné úhrady (${nmLabel})`,
    formula: `${p.nm.ceHighCmi} (CMI > ${p.cmiThreshold}) / ${p.nm.ceRefNet6} / ${p.nm.ceTrauma4} / 1`,
    value: nmCe,
    unit: 'index',
  })
  const groups = sumGroups(inp.rows, nmCe, czs, rec, 'C,E')
  rec.add({
    symbol: 'Σ max(...)·CZS·KC',
    label: 'Součet za skupiny C, E (nepovinné JPL)',
    value: groups,
    unit: 'czk',
  })
  const povinne = inp.cmPovinneJpl * czs
  rec.add({
    symbol: 'CM_CE,povinnéJPL · CZS',
    label: 'Případy s povinným oceněním podle JPL',
    substitution: `${inp.cmPovinneJpl} · ${czs}`,
    value: povinne,
    unit: 'czk',
  })
  const bon = inp.mrsMet ? p.bonMrs * czs * inp.cmCmp : 0
  rec.add({
    symbol: 'BON_mRS-90',
    label: inp.mrsMet ? 'Bonifikace za sledování výsledku iktů (mRS)' : 'Bonifikace mRS – podmínka nesplněna',
    formula: `BON = ${p.bonMrs} · CZS · CM_CMP`,
    substitution: inp.mrsMet ? `${p.bonMrs} · ${czs} · ${inp.cmCmp}` : undefined,
    value: bon,
    unit: 'czk',
  })
  const uhr = groups + povinne + bon - inp.em
  rec.add({
    symbol: 'ÚHR_vyčl,CZ-DRG,2027',
    label: 'Vyčleněná úhrada 2027',
    formula: 'Σ max(CM_JPL; CM_DRG·NM_CE)·CZS·KC + CM_povJPL·CZS + BON_mRS-90 − EM_CE',
    substitution: `${groups.toFixed(0)} + ${povinne.toFixed(0)} + ${bon.toFixed(0)} − ${inp.em}`,
    value: uhr,
    unit: 'czk',
    emphasis: 'result',
  })
  return { steps: rec.steps, uhr, nmCe }
}

// ---------------------------------------------------------------------------
// Případový paušál (bod 5, skupiny B, F, G, H)
// ---------------------------------------------------------------------------

export interface CasePaymentInputs {
  rows: CaseGroupRow[]
  cmPovinneJpl: number
  /** dětské onkologické případy (KOC) */
  cmDeti: number
  /** psychiatrie – skupina H */
  cmH2027: number
  /** medián LOS 2025 (0 = nový poskytovatel → výchozí hodnota) */
  losMedian2025: number
  losMedian2027: number
  kdz: KdzInputs
  em: number
}

export interface CasePaymentResult {
  steps: Step[]
  uhr: number
  kdz: number
  cmRedH: number
}

export function reducedCasemixPsychiatry(
  cmH: number,
  los2025: number,
  los2027: number,
  common: AcuteCommon,
  p: DecreeParams,
  rec: StepRecorder,
): number {
  const X = variableX(common, p)
  const losRef = los2025 > 0 ? los2025 : p.losDefault
  const factor = los2027 > 0 ? Math.min(1, (X * Math.max(p.losFloor, losRef)) / los2027) : 1
  rec.add({
    symbol: 'CM_red,2027,CZ-DRG,H',
    label: 'Redukovaný casemix psychiatrie podle mediánu ošetřovací doby',
    formula: `CM_red,H = CM_H · min{1; X · max(${p.losFloor}; LOS_2025) / LOS_2027}`,
    substitution: `${cmH} · min{1; ${X} · max(${p.losFloor}; ${losRef}) / ${los2027}} = ${cmH} · ${factor.toFixed(4)}`,
    value: cmH * factor,
    unit: 'cm',
    emphasis: factor < 1 ? 'warning' : undefined,
    note: factor < 1 ? 'Medián LOS klesl rychleji než tolerance X – casemix krácen.' : undefined,
  })
  return cmH * factor
}

export function computeCasePayment(inp: CasePaymentInputs, common: AcuteCommon, p: DecreeParams): CasePaymentResult {
  const rec = new StepRecorder()
  const czs = effectiveCzs(common, p)
  const providerCmi = cmi(common)
  const nmPp = providerCmi > p.cmiThreshold ? p.nm.pp : 1
  rec.add({
    symbol: 'NM_PP',
    label: 'Nákladový modifikátor případového paušálu',
    formula: `${p.nm.pp} pro CMI > ${p.cmiThreshold}, jinak 1`,
    substitution: `CMI = ${providerCmi.toFixed(3)}`,
    value: nmPp,
    unit: 'index',
  })
  const groups = sumGroups(inp.rows, nmPp, czs, rec, 'B,F,G')
  rec.add({ symbol: 'Σ max(...)·CZS·KC', label: 'Součet za skupiny B, F, G (nepovinné JPL)', value: groups, unit: 'czk' })

  const kdz = computeKdz(inp.kdz, p, rec)
  const cmRedH = reducedCasemixPsychiatry(inp.cmH2027, inp.losMedian2025, inp.losMedian2027, common, p, rec)

  const central = czs * (inp.cmPovinneJpl + p.childrenBonus * inp.cmDeti + cmRedH * kdz)
  rec.add({
    symbol: 'CZS · (CM_povJPL + 0,5·CM_děti + CM_red,H·K_DZ)',
    label: 'Složka na centrální sazbě (povinné JPL, dětská onkologie, psychiatrie)',
    substitution: `${czs} · (${inp.cmPovinneJpl} + ${p.childrenBonus} · ${inp.cmDeti} + ${cmRedH.toFixed(3)} · ${kdz.toFixed(4)})`,
    value: central,
    unit: 'czk',
  })
  const uhr = groups + central - inp.em
  rec.add({
    symbol: 'ÚHR_PP,CZ-DRG,2027',
    label: 'Případový paušál 2027',
    formula: 'Σ max(CM_JPL; CM_DRG·NM_PP)·CZS·KC + CZS·(CM_povJPL + 0,5·CM_děti + CM_red,H·K_DZ) − EM_BFGH',
    substitution: `${groups.toFixed(0)} + ${central.toFixed(0)} − ${inp.em}`,
    value: uhr,
    unit: 'czk',
    emphasis: 'result',
  })
  return { steps: rec.steps, uhr, kdz, cmRedH }
}

// ---------------------------------------------------------------------------
// Poskytovatelé pod 50 případů (bod 6)
// ---------------------------------------------------------------------------

export interface Under50Inputs {
  cmAD: number
  cmH: number
  kdz: KdzInputs
  rows: CaseGroupRow[]
  cmPovinneJpl: number
  em: number
}

export interface Under50Result {
  steps: Step[]
  uhr: number
  zsPod50: number
}

export function computeUnder50(inp: Under50Inputs, common: AcuteCommon, p: DecreeParams): Under50Result {
  const rec = new StepRecorder()
  const czs = effectiveCzs(common, p)
  const nmPp = cmi(common) > p.cmiThreshold ? p.nm.pp : 1
  const zsPod50 = czs * nmPp
  rec.add({
    symbol: 'ZS_pod50',
    label: 'Základní sazba pro poskytovatele pod 50 případů',
    formula: 'ZS_pod50 = CZS · NM_PP',
    substitution: `${czs} · ${nmPp}`,
    value: zsPod50,
    unit: 'czk',
  })
  const kdz = computeKdz(inp.kdz, p, rec)
  const flat = (inp.cmAD + inp.cmH * kdz) * zsPod50
  rec.add({
    symbol: '(CM_AD + CM_H·K_DZ) · ZS_pod50',
    label: 'Skupiny A, D, H na sazbě ZS_pod50',
    substitution: `(${inp.cmAD} + ${inp.cmH} · ${kdz.toFixed(4)}) · ${zsPod50}`,
    value: flat,
    unit: 'czk',
  })
  let groups = 0
  for (const row of inp.rows) {
    const jpl = row.cmJpl * czs
    const drg = row.cmDrg * zsPod50
    const amount = Math.max(jpl, drg) * row.kc
    groups += amount
    rec.add({
      symbol: `B,C,E,F,G – ${row.name || row.id}`,
      label: 'max(CM_JPL·CZS; CM_DRG·ZS_pod50) · KC',
      substitution: `max(${jpl.toFixed(0)}; ${drg.toFixed(0)}) · ${row.kc}`,
      value: amount,
      unit: 'czk',
    })
  }
  const povinne = inp.cmPovinneJpl * czs
  const uhr = flat + groups + povinne - inp.em
  rec.add({
    symbol: 'Úhr_pod50,CZ-DRG,2027',
    label: 'Úhrada poskytovatele pod 50 případů',
    formula: '(CM_AD + CM_H·K_DZ)·ZS_pod50 + Σ max(CM_JPL·CZS; CM_DRG·ZS_pod50)·KC + CM_povJPL·CZS − EM',
    substitution: `${flat.toFixed(0)} + ${groups.toFixed(0)} + ${povinne.toFixed(0)} − ${inp.em}`,
    value: uhr,
    unit: 'czk',
    emphasis: 'result',
  })
  return { steps: rec.steps, uhr, zsPod50 }
}

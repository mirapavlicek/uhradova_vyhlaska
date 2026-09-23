/**
 * Urgentní příjem, lékařská pohotovostní služba, příjem od ZZS a ostatní paušální úhrady nemocnic
 * – příloha č. 1, část A, body 8 a 9.
 */
import type { DecreeParams } from './params'
import { StepRecorder, safeDiv, type Step } from './steps'

export type UrgTier = 'I' | 'II' | 'III' | 'none'
export type CkpVariant = 'none' | 'room' | 'workplace'
export type PalliativeTeam = 'none' | 'reduced' | 'full'

export const URG_TIER_LABELS: Record<UrgTier, string> = {
  I: 'I. traumacentrum dospělí + děti, dva urgentní příjmy (300 mil.)',
  II: 'II. traumacentrum s urgentním příjmem (65 mil.)',
  III: 'III. ostatní urgentní příjem (12,5 mil.)',
  none: 'IV. bez paušální složky (nesplňuje podmínky / malý objem)',
}

export const CKP_LABELS: Record<CkpVariant, string> = {
  none: 'bez psychiatrické krizové péče',
  room: 'samostatná ambulance (1 mil.)',
  workplace: 'samostatné pracoviště (2,5 mil.)',
}

export const PALLIATIVE_LABELS: Record<PalliativeTeam, string> = {
  none: 'bez konziliárního týmu',
  reduced: 'menší tým (0,3 + 0,2 lékaře…) – 1,025 mil.',
  full: 'plný tým (0,5 + 0,5 lékaře…) – 2,05 mil.',
}

export interface ErnNetwork {
  id: string
  name: string
  uop: number
}

export interface UrgentInputs {
  /** K podle přílohy č. 9 (okres, resp. region u traumacenter) */
  k: number
  /** K pro regionální paušály (ERN, centrum provázení, LPS traumacenter) */
  kRegion: number
  tier: UrgTier
  /** výpadek provozu > 72 h → krácení paušálu o 50 % */
  outage: boolean
  lpsAdults: boolean
  lpsChildren: boolean
  ckp: CkpVariant
  pbUrg: number
  pbLps: number
  pbKv: number
  kpUrg: number
  count09564: number
  count78890: number
  palliativeTeam: PalliativeTeam
  oncoCentre: boolean
  count51887: number
  centrumProvazeni: boolean
  provazeniChildren: number
  ernMember: boolean
  ern: ErnNetwork[]
  /** dny OD 00031 a 00032 (582 Kč za den, bod 1.3) */
  od3132Days: number
  /** body odbornosti 005 (HB 1,04, bod 9.2) */
  points005: number
}

export interface UrgentResult {
  steps: Step[]
  prijemZzs: number
  pausalLps: number
  pausalUrg: number
  ckp: number
  vykonyUrg: number
  limitUrg: number
  vykonyCapped: boolean
  uhrUrg: number
  uhrUrgTotal: number
  ern: number
  otherTotal: number
  total: number
}

export function computeUrgent(inp: UrgentInputs, p: DecreeParams): UrgentResult {
  const rec = new StepRecorder()
  const u = p.urgent
  const o = p.other

  const prijemZzs = inp.count09564 * u.prijemZzs
  rec.add({
    symbol: 'Úhrada_PříjemZZS',
    label: 'Převzetí pacienta od ZZS (výkon 09564)',
    substitution: `${inp.count09564} · ${u.prijemZzs} Kč`,
    value: prijemZzs,
    unit: 'czk',
  })

  const pausalLps = inp.k * ((inp.lpsAdults ? u.lpsAdults : 0) + (inp.lpsChildren ? u.lpsChildren : 0))
  rec.add({
    symbol: 'Paušál_LPS',
    label: 'Lékařská pohotovostní služba (dospělí + děti)',
    formula: 'K · (Paušál_LPS,dospělí + Paušál_LPS,děti)',
    substitution: `${inp.k} · (${inp.lpsAdults ? u.lpsAdults : 0} + ${inp.lpsChildren ? u.lpsChildren : 0})`,
    value: pausalLps,
    unit: 'czk',
  })

  const pausalBase = inp.tier === 'none' ? 0 : u.pausal[inp.tier]
  const pausalUrg = pausalBase * (inp.outage ? 1 - u.outageCut : 1)
  rec.add({
    symbol: 'Paušál_Urg',
    label: `Paušální složka urgentního příjmu – ${URG_TIER_LABELS[inp.tier]}`,
    substitution: inp.outage ? `${pausalBase} · (1 − ${u.outageCut})` : `${pausalBase}`,
    value: pausalUrg,
    unit: 'czk',
    emphasis: inp.outage ? 'warning' : undefined,
    note: inp.outage ? 'Výpadek nepřetržitého provozu nad 72 h – paušál krácen o 50 %.' : undefined,
  })

  const ckp = inp.ckp === 'room' ? u.ckpRoom : inp.ckp === 'workplace' ? u.ckpWorkplace : 0
  if (ckp) {
    rec.add({ symbol: 'CKP_bonifikace', label: `Psychiatrická krizová péče – ${CKP_LABELS[inp.ckp]}`, value: ckp, unit: 'czk' })
  }

  const limitKey: keyof typeof u.limit = inp.tier === 'none' ? 'IV' : inp.tier
  const limitUrg = inp.k * u.limit[limitKey]
  const vykonyRaw = u.vykonyShare * (inp.pbUrg + inp.pbLps + inp.pbKv + inp.kpUrg)
  const vykonyUrg = Math.min(vykonyRaw, limitUrg)
  rec.add({
    symbol: 'Výkony_Urg',
    label: 'Výkonová složka urgentního příjmu',
    formula: `min[ ${u.vykonyShare} · (PB_urg + PB_LPS + PB_KV + KP) ; K · Limit_urg ]`,
    substitution: `min[ ${u.vykonyShare} · (${inp.pbUrg} + ${inp.pbLps} + ${inp.pbKv} + ${inp.kpUrg}) = ${vykonyRaw.toFixed(0)} ; ${inp.k} · ${u.limit[limitKey]} = ${limitUrg.toFixed(0)} ]`,
    value: vykonyUrg,
    unit: 'czk',
    emphasis: vykonyRaw > limitUrg ? 'warning' : undefined,
    note: vykonyRaw > limitUrg ? 'Výkonová složka dosáhla horní hranice.' : 'Body se hradí ve výši 0,60 Kč/bod (60 % hodnoty).',
  })

  const uhrUrg = inp.k * (pausalUrg + ckp) + vykonyUrg
  rec.add({
    symbol: 'Úhrada_Urg',
    label: 'Úhrada urgentního příjmu',
    formula: 'K · (Paušál_Urg + CKP) + Výkony_Urg',
    substitution: `${inp.k} · (${pausalUrg.toFixed(0)} + ${ckp}) + ${vykonyUrg.toFixed(0)}`,
    value: uhrUrg,
    unit: 'czk',
  })
  const uhrUrgTotal = prijemZzs + pausalLps + uhrUrg
  rec.add({
    symbol: 'Úhr_Urg,ZZS,LPS',
    label: 'Urgentní příjem + LPS + příjem od ZZS celkem',
    substitution: `${prijemZzs.toFixed(0)} + ${pausalLps.toFixed(0)} + ${uhrUrg.toFixed(0)}`,
    value: uhrUrgTotal,
    unit: 'czk',
    emphasis: 'result',
  })

  // --- ostatní úhrady (bod 9)
  let otherTotal = 0
  const v78890 = inp.count78890 * o.vykon78890
  if (v78890) {
    rec.add({ symbol: 'Výkon 78890', label: 'Úhrada 12 500 Kč za výkon', substitution: `${inp.count78890} · ${o.vykon78890}`, value: v78890, unit: 'czk' })
    otherTotal += v78890
  }
  const pall = inp.palliativeTeam === 'full' ? inp.k * o.palliativeTeamFull : inp.palliativeTeam === 'reduced' ? inp.k * o.palliativeTeamReduced : 0
  if (pall) {
    rec.add({ symbol: 'Paliativní tým', label: PALLIATIVE_LABELS[inp.palliativeTeam], substitution: `${inp.k} · ${inp.palliativeTeam === 'full' ? o.palliativeTeamFull : o.palliativeTeamReduced}`, value: pall, unit: 'czk' })
    otherTotal += pall
  }
  const onco = inp.oncoCentre ? inp.count51887 * o.onco51887 : 0
  if (onco) {
    rec.add({ symbol: 'Výkon 51887', label: 'Komplexní onkologické centrum – 250 Kč za výkon', substitution: `${inp.count51887} · ${o.onco51887}`, value: onco, unit: 'czk' })
    otherTotal += onco
  }
  const provazeni = inp.centrumProvazeni ? inp.kRegion * o.centrumProvazeni + inp.provazeniChildren * o.provazeniPerChild : 0
  if (provazeni) {
    rec.add({
      symbol: 'Centrum provázení',
      label: 'K_region · 1,6 mil. + 3 000 Kč za ukončené provázení dítěte',
      substitution: `${inp.kRegion} · ${o.centrumProvazeni} + ${inp.provazeniChildren} · ${o.provazeniPerChild}`,
      value: provazeni,
      unit: 'czk',
    })
    otherTotal += provazeni
  }

  const od3132 = inp.od3132Days * o.od3132Rate
  if (od3132) {
    rec.add({ symbol: 'OD 00031 / 00032', label: 'Paušální sazba 582 Kč za ošetřovací den (mimo paušál a případový paušál)', substitution: `${inp.od3132Days} · ${o.od3132Rate}`, value: od3132, unit: 'czk' })
    otherTotal += od3132
  }
  const odb005 = inp.points005 * o.hb005
  if (odb005) {
    rec.add({ symbol: 'Odbornost 005', label: 'Body × 1,04 Kč', substitution: `${inp.points005} · ${o.hb005}`, value: odb005, unit: 'czk' })
    otherTotal += odb005
  }

  let ern = 0
  if (inp.ernMember && inp.ern.length > 0) {
    const n = inp.ern.length
    const uopTotal = inp.ern.reduce((a, x) => a + x.uop, 0)
    const sum = inp.ern.reduce((a, x) => a + (o.ern.perNetwork + o.ern.perNetworkVariable * n * safeDiv(x.uop, uopTotal)), 0)
    ern = inp.kRegion * sum + o.ern.perUop * uopTotal
    rec.add({
      symbol: 'ERN_2027',
      label: `Evropské referenční sítě – ${n} sítí, ${uopTotal} unikátních pojištěnců (výkon 99976)`,
      formula: 'K · Σ_i [8 500 000 + 1 500 000 · n · UOP_i / UOP] + 126 · UOP',
      substitution: `${inp.kRegion} · ${sum.toFixed(0)} + ${o.ern.perUop} · ${uopTotal}`,
      value: ern,
      unit: 'czk',
      note: 'Součet fixní části je vždy n · 8,5 mil. + n · 1,5 mil.; rozdělení mezi sítě je jen podle podílu pacientů.',
    })
    otherTotal += ern
  }

  const total = uhrUrgTotal + otherTotal
  rec.add({
    symbol: 'Celkem',
    label: 'Urgentní příjem, LPS, ZZS a ostatní paušály (bod 8 a 9)',
    substitution: `${uhrUrgTotal.toFixed(0)} + ${otherTotal.toFixed(0)}`,
    value: total,
    unit: 'czk',
    emphasis: 'result',
  })

  return { steps: rec.steps, prijemZzs, pausalLps, pausalUrg, ckp, vykonyUrg, limitUrg, vykonyCapped: vykonyRaw > limitUrg, uhrUrg, uhrUrgTotal, ern, otherTotal, total }
}

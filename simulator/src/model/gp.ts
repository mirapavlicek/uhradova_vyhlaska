/**
 * Všeobecní praktičtí lékaři a praktičtí lékaři pro děti a dorost – příloha č. 2.
 * Kombinovaná kapitačně výkonová platba, bonifikace, POCUS, týmová praxe, terénní sestra, regulace.
 */
import { GP_AGE_GROUPS, type DecreeParams } from './params'
import { computeGpRegulation } from './regulation'
import { StepRecorder, type Step } from './steps'

export type GpSpecialty = '001' | '002'
export type GpRegime = 'a' | 'b' | 'c'

export const GP_REGIME_LABELS: Record<GpRegime, string> = {
  a: 'a) ≥ 30 ord. hodin / 5 dnů, 1× do 18 h, 2× objednávání – 78 Kč',
  b: 'b) ≥ 25 ord. hodin / 5 dnů, 1× do 18 h – 69 Kč',
  c: 'c)/d) základní rozsah – 60 Kč (001) / 66 Kč (002)',
}

export interface GpInputs {
  specialty: GpSpecialty
  regime: GpRegime
  /** počty registrovaných pojištěnců ZP podle věkových skupin */
  ages: Record<string, number>
  bonusEducation: boolean
  bonusPrevention: boolean
  bonusAccreditation: boolean
  pbPrevention: number
  pbSelected: number
  pbOther: number
  hbEducation: boolean
  hbExtendedHours: boolean
  episodes18: number
  zumZulp: number
  kpp: number
  pocusMonths: number
  pocusCount: number
  teamMonths: number
  teamFte: number
  nurseMonths: number
  nurseEpisodesShort: number
  nurseEpisodesLong: number
  nurseEpisodes: number
  regulation: {
    exempt: boolean
    drugsNational: number
    drugsProvider: number
    incontNational: number
    incontProvider: number
    requestedNational: number
    requestedProvider: number
    physioNational: number
    physioProvider: number
  }
}

export interface GpResult {
  steps: Step[]
  weightedInsured: number
  rate: number
  capitation: number
  performance: number
  episodes: number
  pocus: number
  team: number
  nurse: number
  penalty: number
  total: number
}

export function computeGp(inp: GpInputs, p: DecreeParams): GpResult {
  const rec = new StepRecorder()
  const g = p.gp

  const weighted = GP_AGE_GROUPS.reduce((s, ag) => s + (inp.ages[ag.id] ?? 0) * ag.index, 0)
  const raw = GP_AGE_GROUPS.reduce((s, ag) => s + (inp.ages[ag.id] ?? 0), 0)
  rec.add({
    symbol: 'Přepočtení pojištěnci',
    label: 'Σ registrovaní pojištěnci × věkový index',
    substitution: `${raw} registrovaných → ${weighted.toFixed(1)} přepočtených`,
    value: weighted,
    unit: 'count',
  })

  let rate = inp.regime === 'a' ? g.rate.a : inp.regime === 'b' ? g.rate.b : inp.specialty === '001' ? g.rate.c001 : g.rate.c002
  const parts = [`${rate}`]
  if (inp.bonusEducation) {
    rate += g.bonusEducation
    parts.push(`+${g.bonusEducation} vzdělávání`)
  }
  if (inp.bonusPrevention) {
    rate += g.bonusPrevention
    parts.push(`+${g.bonusPrevention} prevence`)
  }
  if (inp.bonusAccreditation) {
    rate += g.bonusAccreditation
    parts.push(`+${g.bonusAccreditation} akreditace`)
  }
  rec.add({ symbol: 'Kapitační sazba', label: 'Základní sazba + bonifikace (Kč / přepočtený pojištěnec / měsíc)', substitution: parts.join(' '), value: rate, unit: 'czk' })

  const capitation = weighted * rate * 12
  rec.add({ symbol: 'Kapitace 2027', label: 'Přepočtení pojištěnci × sazba × 12', substitution: `${weighted.toFixed(1)} · ${rate} · 12`, value: capitation, unit: 'czk', emphasis: 'result' })

  const hbAdd = (inp.hbEducation ? g.hbEducation : 0) + (inp.hbExtendedHours ? g.hbExtendedHours : 0)
  const hbPrev = (inp.specialty === '001' ? g.hbPrevention001 : g.hbPrevention002) + hbAdd
  const hbSel = g.hbSelected + hbAdd
  const hbOth = g.hbOther + hbAdd
  const performance = inp.pbPrevention * hbPrev + inp.pbSelected * hbSel + inp.pbOther * hbOth + inp.zumZulp
  rec.add({
    symbol: 'Výkony mimo kapitaci',
    label: `Prevence ${hbPrev.toFixed(2)} Kč, vybrané výkony ${hbSel.toFixed(2)} Kč, ostatní ${hbOth.toFixed(2)} Kč${hbAdd ? ` (navýšení +${hbAdd.toFixed(2)})` : ''} + ZUM/ZULP`,
    substitution: `${inp.pbPrevention} · ${hbPrev.toFixed(2)} + ${inp.pbSelected} · ${hbSel.toFixed(2)} + ${inp.pbOther} · ${hbOth.toFixed(2)} + ${inp.zumZulp}`,
    value: performance,
    unit: 'czk',
  })

  const episodes = inp.episodes18 * g.episode
  rec.add({ symbol: 'Epizody péče 18+', label: '90 Kč za epizodu / kontakt s klinickým vyšetřením', substitution: `${inp.episodes18} · ${g.episode}`, value: episodes, unit: 'czk' })

  const pocusN = (g.pocusMin / 12) * inp.pocusMonths * inp.kpp
  const pocusOk = inp.pocusMonths > 0 && inp.pocusCount >= pocusN
  const pocus = pocusOk ? g.pocusBonus * inp.pocusMonths * inp.kpp : 0
  rec.add({
    symbol: 'POCUS',
    label: `Bonus 5 000 Kč · měsíce · KPP při ≥ n výkonů 01050 (n = ${pocusN.toFixed(1)})`,
    formula: 'n = 250/12 · PM_POCUS · KPP;  bonus = 5 000 · PM_POCUS · KPP',
    substitution: pocusOk ? `${g.pocusBonus} · ${inp.pocusMonths} · ${inp.kpp}` : `${inp.pocusCount} výkonů < ${pocusN.toFixed(1)} → 0`,
    value: pocus,
    unit: 'czk',
    emphasis: inp.pocusMonths > 0 && !pocusOk ? 'warning' : undefined,
  })

  const uvPlus = Math.max(0, (inp.teamFte - 1) * 10)
  const team = inp.teamMonths * inp.kpp * uvPlus * g.teamPerTenth
  rec.add({
    symbol: 'Úhr_týmová praxe',
    label: 'Měsíčně KPP · Úv+ · 10 800 Kč, Úv+ = (Úv_Σ − 1) · 10',
    substitution: `${inp.teamMonths} měs. · ${inp.kpp} · ${uvPlus.toFixed(1)} · ${g.teamPerTenth}`,
    value: team,
    unit: 'czk',
  })

  const nurseN = (g.nurseMin / 12) * inp.nurseMonths * inp.kpp
  const nurseOk = inp.nurseMonths > 0 && inp.nurseEpisodes >= nurseN
  const nurseEpisodesUhr = inp.nurseEpisodesShort * g.nurseShort + inp.nurseEpisodesLong * g.nurseLong
  const nurseMonthly = nurseOk ? inp.nurseMonths * g.nurseMonthly * inp.kpp : 0
  const nurse = nurseEpisodesUhr + nurseMonthly
  rec.add({
    symbol: 'Terénní sestra',
    label: `Epizody (151 / 303 Kč) + měsíční úhrada 25 000 · KPP při ≥ n epizod (n = ${nurseN.toFixed(1)})`,
    substitution: `${inp.nurseEpisodesShort} · ${g.nurseShort} + ${inp.nurseEpisodesLong} · ${g.nurseLong} + ${nurseOk ? `${inp.nurseMonths} · ${g.nurseMonthly} · ${inp.kpp}` : '0'}`,
    value: nurse,
    unit: 'czk',
    emphasis: inp.nurseMonths > 0 && !nurseOk ? 'warning' : undefined,
  })

  const r = inp.regulation
  const reg = computeGpRegulation(
    {
      weightedInsured: weighted,
      exempt: r.exempt || raw <= 50,
      base: capitation + performance - inp.zumZulp,
      items: [
        { label: 'Léčivé přípravky a ZP (bez inkontinence)', avgNational: r.drugsNational, avgProvider: r.drugsProvider },
        { label: 'ZP pro inkontinentní', avgNational: r.incontNational, avgProvider: r.incontProvider },
        { label: 'Vyžádaná péče (vyjmenované odbornosti)', avgNational: r.requestedNational, avgProvider: r.requestedProvider, requested: true },
        { label: 'Vyžádaná péče odb. 902', avgNational: r.physioNational, avgProvider: r.physioProvider },
      ],
    },
    p,
  )
  rec.steps.push(...reg.steps)

  const total = capitation + performance + episodes + pocus + team + nurse - reg.penalty
  rec.add({
    symbol: 'Úhrada celkem',
    label: 'Kapitace + výkony + epizody + POCUS + týmová praxe + terénní sestra − regulace',
    substitution: `${capitation.toFixed(0)} + ${performance.toFixed(0)} + ${episodes} + ${pocus.toFixed(0)} + ${team.toFixed(0)} + ${nurse.toFixed(0)} − ${reg.penalty.toFixed(0)}`,
    value: total,
    unit: 'czk',
    emphasis: 'result',
  })

  return { steps: rec.steps, weightedInsured: weighted, rate, capitation, performance, episodes, pocus, team, nurse, penalty: reg.penalty, total }
}

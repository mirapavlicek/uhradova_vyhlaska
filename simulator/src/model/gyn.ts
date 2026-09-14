/**
 * Ambulantní gynekologie – příloha č. 4: měsíční agregovaná úhrada za registrovanou pojištěnku,
 * úhrada péče o těhotné, léčba neplodnosti, epizody, regulace.
 */
import type { DecreeParams } from './params'
import { computeRegulation, type RegulationItemInputs, type RegulationResult } from './regulation'
import { StepRecorder, type Step } from './steps'

export type GynAccreditation = 'none' | 'accredited' | 'active'

export interface GynInputs {
  /** průměrný měsíční počet registrovaných pojištěnek s preventivní prohlídkou v posledních 24 měsících */
  registeredWomen: number
  months: number
  education: boolean
  hours: boolean
  accreditation: GynAccreditation
  iso: boolean
  prevention45: boolean
  team: boolean
  teamMidwife: boolean
  ultrasoundOk: boolean
  pregnancies: [number, number, number]
  /** podíl geneticky testovaných těhotných (0–1) */
  geneticShare: number
  /** podíl těhotných s konziliárním UZ (0–1) */
  ultrasoundShare: number
  pregnantCount: number
  infertilityCount: number
  episodes18: number
  /** body za nepravidelnou péči o neregistrované pojištěnky (HB 1,00) */
  nonRegisteredPoints: number
  zumZulp: number
  upHo: number
  regulation: { exempt: boolean; drugs: RegulationItemInputs; requested: RegulationItemInputs }
}

export interface GynResult {
  steps: Step[]
  monthlyRate: number
  aggregated: number
  pregnancyCoef: number
  pregnancy: number
  infertility: number
  episodes: number
  nonRegistered: number
  regulation: RegulationResult
  total: number
}

export function computeGyn(inp: GynInputs, p: DecreeParams): GynResult {
  const rec = new StepRecorder()
  const g = p.gyn
  const parts: string[] = [`${g.monthly}`]
  let bonus = 0
  const add = (v: number, label: string) => {
    bonus += v
    parts.push(`+${v} ${label}`)
  }
  if (inp.education) add(g.bonusEducation, 'vzdělávání')
  if (inp.hours) add(g.bonusHours, 'ordinační hodiny')
  if (inp.accreditation === 'accredited') add(g.bonusAccreditation, 'akreditace')
  if (inp.accreditation === 'active') add(g.bonusAccreditationActive, 'akreditace + školení')
  if (inp.iso) add(g.bonusIso, 'ISO 9001')
  if (inp.prevention45) add(g.bonusPrevention, 'prevence ≥ 45 %')
  if (inp.team) add(g.bonusTeam, 'týmová praxe')
  if (inp.team && inp.teamMidwife) add(g.bonusMidwife, 'porodní asistentka')
  const monthlyRate = inp.ultrasoundOk ? g.monthly + bonus : g.monthly * g.noUltrasoundFactor
  rec.add({
    symbol: 'Měsíční agregovaná úhrada / pojištěnka',
    label: inp.ultrasoundOk ? 'Základ 122 Kč + bonifikace' : 'Nesplněna podmínka UZ přístroje → 122 · 0,50 bez bonifikací',
    substitution: inp.ultrasoundOk ? parts.join(' ') : `${g.monthly} · ${g.noUltrasoundFactor}`,
    value: monthlyRate,
    unit: 'czk',
    emphasis: inp.ultrasoundOk ? undefined : 'warning',
  })
  const aggregated = inp.registeredWomen * monthlyRate * inp.months
  rec.add({ symbol: 'Agregovaná úhrada', label: 'Registrované pojištěnky × sazba × měsíce', substitution: `${inp.registeredWomen} · ${monthlyRate} · ${inp.months}`, value: aggregated, unit: 'czk', emphasis: 'result' })

  const genCoef = inp.geneticShare <= 0.2 ? 0.05 : inp.geneticShare > 0.6 ? -0.1 : inp.geneticShare > 0.4 ? -0.05 : 0
  const usCoef = inp.ultrasoundShare <= 0.3 ? 0.05 : inp.ultrasoundShare > 0.6 ? -0.1 : inp.ultrasoundShare > 0.4 ? -0.05 : 0
  const coefApplies = inp.pregnantCount >= 10
  const pregnancyCoef = coefApplies ? 1 + genCoef + usCoef : 1
  const pregnancyBase = inp.pregnancies[0] * g.trimester[0] + inp.pregnancies[1] * g.trimester[1] + inp.pregnancies[2] * g.trimester[2]
  const pregnancy = pregnancyBase * pregnancyCoef
  rec.add({
    symbol: 'Koeficient těhotenské péče',
    label: coefApplies ? `1 + genetika (${genCoef}) + konziliární UZ (${usCoef})` : 'Méně než 10 těhotných – koeficienty se nepoužijí',
    substitution: coefApplies ? `1 + ${genCoef} + ${usCoef}   [podíl genetiky ${(inp.geneticShare * 100).toFixed(0)} %, UZ ${(inp.ultrasoundShare * 100).toFixed(0)} %]` : '1',
    value: pregnancyCoef,
    unit: 'index',
    emphasis: pregnancyCoef < 1 ? 'warning' : undefined,
  })
  rec.add({
    symbol: 'Úhrada těhotných',
    label: `Trimestry ${g.trimester.join(' / ')} Kč × koeficient`,
    substitution: `(${inp.pregnancies[0]} · ${g.trimester[0]} + ${inp.pregnancies[1]} · ${g.trimester[1]} + ${inp.pregnancies[2]} · ${g.trimester[2]}) · ${pregnancyCoef.toFixed(2)}`,
    value: pregnancy,
    unit: 'czk',
  })
  const infertility = inp.infertilityCount * g.infertility
  rec.add({ symbol: 'Léčba neplodnosti', label: '848 Kč za vyšetření (max. 2× ročně)', substitution: `${inp.infertilityCount} · ${g.infertility}`, value: infertility, unit: 'czk' })
  const episodes = inp.episodes18 * g.episode
  rec.add({ symbol: 'Epizody péče 18+', label: '90 Kč za epizodu s klinickým vyšetřením / 63050 / 63053 / 63055', substitution: `${inp.episodes18} · ${g.episode}`, value: episodes, unit: 'czk' })
  const nonRegistered = inp.nonRegisteredPoints * 1.0
  rec.add({ symbol: 'Nepravidelná péče', label: 'Neregistrované pojištěnky – výkony 63022/63023/63417 s HB 1,00 Kč', substitution: `${inp.nonRegisteredPoints} · 1,00`, value: nonRegistered, unit: 'czk' })

  const subtotal = aggregated + pregnancy + infertility + episodes + nonRegistered + inp.zumZulp
  const regulation = computeRegulation(
    { upHo: inp.upHo, performanceBase: subtotal, exempt: inp.regulation.exempt || inp.upHo <= 50, items: { drugs: inp.regulation.drugs, requested: inp.regulation.requested } },
    p,
    ['drugs', 'requested'],
  )
  rec.steps.push(...regulation.steps)
  const total = subtotal - regulation.penalty
  rec.add({
    symbol: 'Úhrada celkem',
    label: 'Agregovaná + těhotné + neplodnost + epizody + nepravidelná péče + ZUM/ZULP − regulace',
    substitution: `${subtotal.toFixed(0)} − ${regulation.penalty.toFixed(0)}`,
    value: total,
    unit: 'czk',
    emphasis: 'result',
  })
  return { steps: rec.steps, monthlyRate, aggregated, pregnancyCoef, pregnancy, infertility, episodes, nonRegistered, regulation, total }
}

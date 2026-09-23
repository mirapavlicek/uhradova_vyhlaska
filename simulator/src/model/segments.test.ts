import { describe, expect, it } from 'vitest'
import { computeAftercare } from './aftercare'
import { computeAll } from './all'
import { computeDialysis, transplantBonus } from './dialysis'
import { computeGp } from './gp'
import { computeGyn } from './gyn'
import { computeHomecare, computeOdb913, computePalliative } from './homecare'
import { computeHospitalRegulation, revisionReduction } from './hospitalRegulation'
import { computeLabs } from './labs'
import { computeOneDay } from './oneDay'
import { DEFAULT_PARAMS } from './params'
import { earlyStartBonus, computePhysio } from './physio'
import { computePuro } from './puro'
import { computeRegulation, regulationItem } from './regulation'
import { defaultScenario, normalizeScenario, SCENARIO_VERSION } from './scenario'
import { computeSpecialists } from './specialists'
import { computeUrgent } from './urgent'

const p = DEFAULT_PARAMS
const base = defaultScenario()

describe('Regulace léčiv a vyžádané péče', () => {
  it('pod prahem není srážka', () => {
    const r = regulationItem({ avgRef: 1000, avgHo: 1100 }, 500, { threshold: 1.15, stepPct: 0.005, ratePerStep: 0.025, maxShare: 0.4 })
    expect(r.penalty).toBe(0)
  })
  it('odstupňovaná srážka: překročení o 1,2 % nad práh = 3 kroky = 7,5 %', () => {
    const r = regulationItem({ avgRef: 1000, avgHo: 1150 * 1.012 }, 500, { threshold: 1.15, stepPct: 0.005, ratePerStep: 0.025, maxShare: 0.4 })
    expect(r.steps).toBe(3)
    expect(r.rate).toBeCloseTo(0.075, 9)
    expect(r.penalty).toBeCloseTo(0.075 * (1150 * 0.012) * 500, 6)
  })
  it('sazba je omezena 40 % (od 8 % nad prahem)', () => {
    const r = regulationItem({ avgRef: 1000, avgHo: 1150 * 1.2 }, 100, { threshold: 1.15, stepPct: 0.005, ratePerStep: 0.025, maxShare: 0.4 })
    expect(r.rate).toBe(0.4)
  })
  it('celková srážka nejvýše 15 % úhrady za výkony', () => {
    const r = computeRegulation({ upHo: 1000, performanceBase: 100_000, exempt: false, items: { drugs: { avgRef: 1000, avgHo: 3000 } } }, p)
    expect(r.rawPenalty).toBeGreaterThan(15_000)
    expect(r.penalty).toBe(15_000)
    expect(r.capped).toBe(true)
  })
})

describe('PURO maximum', () => {
  const inp = { uhrRef: 1_000_000, popRef: 1000, pbRef: 900_000, kpRef: 50_000, popZ: 1000, popMh: 0, uhrMh: 0, uhrMr: 0, pbHo: 1_100_000, kpHo: 55_000, newServices: 0 }
  it('minimální hodnota bodu zvedne PURO, pokud byla skutečná HB nízká', () => {
    const r = computePuro({ ...inp, uhrRef: 700_000 }, { baseCoef: 1.06, kn: 0, hbMin: 0.9, knMultipliesMax: false, exemptUp: 100, hb: 1 })
    expect(r.puroFloorApplied).toBe(true)
    expect(r.puro).toBeCloseTo((900_000 * 0.9 + 50_000) / 1000, 6)
  })
  it('strop = (c + KN)·POP·PURO, výkonová úhrada nad ním se krátí', () => {
    const r = computePuro(inp, { baseCoef: 1.06, kn: 0.06, hbMin: 0.9, knMultipliesMax: false, exemptUp: 100, hb: 1.1 })
    expect(r.cap).toBeCloseTo(1.12 * 1000 * 1000, 6)
    expect(r.performance).toBeCloseTo(1_265_000, 6)
    expect(r.capped).toBe(true)
    expect(r.uhr).toBeCloseTo(1_120_000, 6)
  })
  it('u malého poskytovatele se maximum nepoužije', () => {
    const r = computePuro({ ...inp, popRef: 80, popZ: 80 }, { baseCoef: 1.06, kn: 0, hbMin: 0.9, knMultipliesMax: false, exemptUp: 100, hb: 1.1 })
    expect(r.capApplies).toBe(false)
    expect(r.uhr).toBe(r.performance)
  })
  it('domácí péče násobí (c + KN) i mimořádně nákladné pojištěnce', () => {
    const a = computePuro({ ...inp, popMh: 10, uhrMh: 500_000, uhrMr: 100_000 }, { baseCoef: 1.06, kn: 0.1, hbMin: 0, knMultipliesMax: true, exemptUp: 30, hb: 1 })
    const b = computePuro({ ...inp, popMh: 10, uhrMh: 500_000, uhrMr: 100_000 }, { baseCoef: 1.06, kn: 0.1, hbMin: 0, knMultipliesMax: false, exemptUp: 30, hb: 1 })
    expect(a.cap - b.cap).toBeCloseTo(0.16 * 400_000, 6)
  })
})

describe('Ambulantní specialisté', () => {
  it('hodnota bodu a KN se skládají z bonifikací', () => {
    const r = computeSpecialists(base.specialists, p)
    expect(r.hb).toBeCloseTo(0.98 + 0.03 + 0.02 + 0.02 + 0.01, 9)
    expect(r.kn).toBeCloseTo(0.02 + 0.02 + 0.02 + 0.01 + 0.06, 9)
  })
  it('limit 100 UP se přepočítává kapacitou n/30', () => {
    const r = computeSpecialists({ ...base.specialists, hoursPerWeek: 15, puro: { ...base.specialists.puro, popRef: 60, popZ: 60, popMh: 0 } }, p)
    expect(r.puro.capApplies).toBe(true)
  })
})

describe('Fyzioterapie 902', () => {
  it('bonus včasného zahájení: 800 Kč do 7 dnů, 400 Kč ve 14. den, 0 po 14 dnech', () => {
    expect(earlyStartBonus(3, p)).toBe(800)
    expect(earlyStartBonus(7, p)).toBe(800)
    expect(earlyStartBonus(10.5, p)).toBe(600)
    expect(earlyStartBonus(14, p)).toBe(400)
    expect(earlyStartBonus(15, p)).toBe(0)
  })
  it('HB 0,73 + 0,01 a KN 0,02 + 0,02 ve výchozím scénáři', () => {
    const r = computePhysio(base.physio, p)
    expect(r.hb).toBeCloseTo(0.74, 9)
    expect(r.kn).toBeCloseTo(0.04, 9)
    expect(r.earlyBonus).toBe(30 * 800 + 20 * (400 + 400 * (4 / 7)))
  })
})

describe('Domácí a paliativní péče, odb. 913', () => {
  it('925: telemetrie zvyšuje HB i KN, 916 jen KN', () => {
    const a = computeHomecare(base.homecare, p)
    const b = computeHomecare({ ...base.homecare, odb: '916' }, p)
    expect(a.hb).toBeCloseTo(1.02, 9)
    expect(a.kn).toBeCloseTo(0.03, 9)
    expect(b.hb).toBeCloseTo(0.91, 9)
    expect(b.kn).toBeCloseTo(0.03, 9)
  })
  it('926: strop 30 dnů na dospělého a 180 dnů na dítě', () => {
    const r = computePalliative({ ...base.palliative, pointsDays: 100_000_000 }, p)
    expect(r.cap).toBeCloseTo((120 * 30 + 2 * 180) * 1200 * 1.27, 3)
    expect(r.daysUhr).toBeCloseTo(r.cap, 6)
  })
  it('913: maximum je max z růstu 5 % a minimální HB 1,03', () => {
    const r = computeOdb913(base.odb913, p)
    const capA = (1_500_000 / 900) * 960 * 1.05 * 1.02
    const capB = 1_350_000 * 1.03 + 10_000
    expect(r.cap).toBeCloseTo(Math.max(capA, capB), 3)
  })
})

describe('Urgentní příjem a ERN', () => {
  it('výkonová složka je omezena limitem K × 60 mil. u III. typu', () => {
    const r = computeUrgent({ ...base.urgent, pbUrg: 200_000_000 }, p)
    expect(r.vykonyCapped).toBe(true)
    expect(r.vykonyUrg).toBeCloseTo(0.55 * 60_000_000, 6)
  })
  it('výpadek provozu krátí paušál o 50 %', () => {
    const a = computeUrgent(base.urgent, p)
    const b = computeUrgent({ ...base.urgent, outage: true }, p)
    expect(a.pausalUrg - b.pausalUrg).toBe(6_250_000)
  })
  it('ERN: fixní část je n·(8,5 + 1,5) mil. nezávisle na rozdělení pacientů', () => {
    const r = computeUrgent({ ...base.urgent, ernMember: true, kRegion: 1, ern: [{ id: 'a', name: 'A', uop: 10 }, { id: 'b', name: 'B', uop: 90 }] }, p)
    expect(r.ern).toBeCloseTo(2 * 10_000_000 + 126 * 100, 6)
  })
})

describe('Následná péče', () => {
  it('ZKN 1,035 u OD 00005 a kritéria po 0,003', () => {
    const r = computeAftercare(base.aftercare, p)
    const ldn = r.rows[0]
    expect(ldn.zkn).toBe(1.035)
    expect(ldn.kn).toBeCloseTo(4 * 0.003, 9)
    expect(ldn.psHo).toBeCloseTo((1.035 + 0.012) * 2950, 6)
  })
  it('BON_Geri je omezen 0,1 a zaokrouhlen na 3 místa', () => {
    expect(computeAftercare({ ...base.aftercare, geriatristFte: 2, bedsOd24: 60 }, p).bonGeri).toBe(0.1)
    expect(computeAftercare({ ...base.aftercare, geriatristFte: 0.5, bedsOd24: 60 }, p).bonGeri).toBeCloseTo(0.083, 9)
  })
  it('psychiatrie s transformačním plánem: 0,35·K_TransNLP + akreditace', () => {
    const r = computeAftercare(
      { ...base.aftercare, transformationPlan: true, kTransNlp: 1.1, accreditation: true, rows: [{ id: 'x', od: '00021', name: '', ps2026: 3000, days: 100, pediatric: false }] },
      p,
    )
    expect(r.rows[0].kn).toBeCloseTo(0.35 * 1.1 + 0.015, 9)
  })
})

describe('Praktičtí lékaři', () => {
  it('kapitace = přepočtení pojištěnci × sazba × 12', () => {
    const r = computeGp(base.gp, p)
    expect(r.rate).toBe(78 + 1 + 2)
    expect(r.capitation).toBeCloseTo(r.weightedInsured * 81 * 12, 6)
  })
  it('POCUS bonus jen při dosažení n = 250/12 · PM · KPP', () => {
    const n = (250 / 12) * 12 * 0.55
    expect(computeGp({ ...base.gp, pocusCount: Math.floor(n) }, p).pocus).toBe(0)
    expect(computeGp({ ...base.gp, pocusCount: Math.ceil(n) }, p).pocus).toBeCloseTo(5000 * 12 * 0.55, 6)
  })
  it('týmová praxe: 1,5 úvazku = 5 desetin × 10 800 × KPP měsíčně', () => {
    const r = computeGp({ ...base.gp, teamMonths: 12, teamFte: 1.5 }, p)
    expect(r.team).toBeCloseTo(12 * 0.55 * 5 * 10_800, 6)
  })
})

describe('Gynekologie', () => {
  it('bez UZ přístroje se sazba krátí na 61 Kč bez bonifikací', () => {
    expect(computeGyn({ ...base.gyn, ultrasoundOk: false }, p).monthlyRate).toBe(61)
    expect(computeGyn(base.gyn, p).monthlyRate).toBe(122 + 9 + 9 + 6)
  })
  it('koeficient těhotenské péče: +0,05 při nízké genetice, −0,10 při vysokém UZ', () => {
    expect(computeGyn({ ...base.gyn, geneticShare: 0.1, ultrasoundShare: 0.7 }, p).pregnancyCoef).toBeCloseTo(0.95, 9)
    expect(computeGyn({ ...base.gyn, pregnantCount: 5 }, p).pregnancyCoef).toBe(1)
  })
})

describe('Dialýza', () => {
  it('BON_TR: 0 pod 10 %, N_min těsně nad, N_max od 18 %', () => {
    expect(transplantBonus(0.09, p).bon).toBe(0)
    expect(transplantBonus(0.1001, p).bon).toBeCloseTo(0.02, 3)
    expect(transplantBonus(0.14, p).bon).toBeCloseTo(0.03, 9)
    expect(transplantBonus(0.25, p).bon).toBe(0.04)
  })
  it('výchozí scénář: kvalita 2. úroveň + domácí dialýza + BON_TR', () => {
    const r = computeDialysis(base.dialysis, p)
    expect(r.ktr).toBeCloseTo((3 * 2 + 5 + 4 * 2 + 6) / 120, 9)
    expect(r.homeShare).toBeCloseTo((6 * 1.5 + 1) / 140, 9)
    expect(r.hb).toBeCloseTo(1.18 + 0.07 + 0.02 + r.bonTr, 9)
  })
})

describe('Laboratoře a RDG', () => {
  it('variabilní složka se krátí při růstu bodů na pojištěnce', () => {
    const r = computeLabs(base.labs, p)
    const a = r.rdg[0]
    expect(a.reduced).toBe(true)
    expect(a.hbRed).toBeLessThan(1.38)
    expect(a.hbRed).toBeGreaterThan(0.51)
  })
  it('PURO_icz se navýší, je-li skutečná HB pod 91 % vážené HB', () => {
    const r = computeLabs({ ...base.labs, lab: { ...base.labs.lab, uhrRef: 30_000_000 } }, p)
    expect(r.lab.puroAdjusted).toBe(true)
    expect(r.lab.puro).toBeCloseTo((r.lab.hbMin / r.lab.hbSkut) * (30_000_000 / 60_000), 6)
  })
})

describe('Jednodenní péče a regulace nemocnic', () => {
  it('JP = Σ cena × počet − EM', () => {
    const r = computeOneDay(base.oneDay)
    expect(r.total).toBe(10 * 327_226 + 12 * 281_418 - 150_000)
  })
  it('revize kódování: jednotlivý případ ×2, vzorek ×0,2 / ×0,8', () => {
    expect(revisionReduction({ id: 'a', name: '', type: 'single', cmOriginal: 4, cmRevised: 3, cmBase: 0 })).toBe(2)
    expect(revisionReduction({ id: 'b', name: '', type: 'minor', cmOriginal: 100, cmRevised: 90, cmBase: 500 })).toBeCloseTo(10, 9)
    expect(revisionReduction({ id: 'c', name: '', type: 'major', cmOriginal: 100, cmRevised: 90, cmBase: 500 })).toBeCloseTo(40, 9)
    const r = computeHospitalRegulation(base.hospitalReg, 84_000, p)
    expect(r.cmReductionCzk).toBeCloseTo(r.cmReduction * 84_000, 6)
  })
})

describe('Scénář', () => {
  it('normalizace doplní nové moduly do starého scénáře (verze 1)', () => {
    const old = { version: 1, name: 'Starý', pu: { cm2025A: 1 } }
    const s = normalizeScenario(old)
    expect(s.version).toBe(SCENARIO_VERSION)
    expect(s.name).toBe('Starý')
    expect(s.pu.cm2025A).toBe(1)
    expect(s.pu.cm2025D).toBe(base.pu.cm2025D)
    expect(s.gp.regime).toBe('a')
    expect(s.params.urgent.pausal.III).toBe(12_500_000)
  })
  it('computeAll vrací konečné součty za všechny moduly', () => {
    const all = computeAll(base)
    expect(Number.isFinite(all.total)).toBe(true)
    expect(all.total).toBeCloseTo(all.hospital + all.primary + all.ambulatory + all.otherGroup, 6)
    expect(all.hospital).toBeGreaterThan(1_000_000_000)
  })
})

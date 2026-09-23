/**
 * Měsíční předběžné úhrady (zálohy) a vyúčtování podle pravidel jednotlivých příloh.
 *
 * - příl. 1 část A bod 11: 1/12 předpokládané úhrady za hodnocené období (vč. změn rozsahu),
 * - příl. 3: 1/12 ze 106 % úhrady referenčního období, příl. 5: 104 % (RDG) a 103 % (laboratoře),
 * - příl. 6 A a B: hodnota vykázaných služeb za měsíc, příl. 6 C: 105 %, příl. 7: 107 %.
 * Segmenty bez výslovného pravidla (kapitace, výkony) se modelují hodnotou vykázaných služeb.
 */
import type { AllResults } from './all'
import type { Scenario } from './scenario'
import { SEGMENTS, type SegmentId } from './segments'

export type AdvanceRule = 'expected' | 'refPct' | 'reported' | 'none'

export interface AdvanceRow {
  id: SegmentId
  label: string
  annex: string
  rule: AdvanceRule
  ruleText: string
  /** zákonné pravidlo vs. předpoklad modelu tam, kde vyhláška pravidlo neuvádí */
  assumption: boolean
  ref2025: number | null
  expected: number
  monthly: number
  advancesTotal: number
  settlement: number
  settlementDays: number
  note?: string
}

export interface AdvanceSummary {
  rows: AdvanceRow[]
  ref2025: number
  expected: number
  monthly: number
  advancesTotal: number
  settlement: number
  lateFactor: number
}

export function computeAdvances(s: Scenario, all: AllResults): AdvanceSummary {
  const a = s.params.advances
  const adv = s.advances
  const ref = (id: SegmentId, fallback: number | null): number | null => (adv.refUhr[id] > 0 ? adv.refUhr[id] : fallback)
  const adj = (id: SegmentId) => adv.adjust[id] ?? 0

  const rdgFallback = s.labs.rdg.reduce((sum, g) => sum + g.pbRef * g.hb, 0)
  const rdgRef = adv.refRdg > 0 ? adv.refRdg : rdgFallback
  const labsRef = s.labs.lab.uhrRef + s.labs.gen.uhrRef

  const dialysisBaseHb = all.dialysis.hb - all.dialysis.bonTr - (s.dialysis.quality === 'l2' ? s.params.dialysis.qualityL2 : s.dialysis.quality === 'l1' ? s.params.dialysis.qualityL1 : 0)
  const dialysisReported = s.dialysis.points * dialysisBaseHb + s.dialysis.pointsLow * s.params.dialysis.hbLow + s.dialysis.zumZulp + all.dialysis.signals

  interface Spec {
    rule: AdvanceRule
    ruleText: string
    assumption?: boolean
    ref2025: number | null
    annual: number
    days: number
    note?: string
  }
  const expected = (id: SegmentId, days = 180, assumption = false): Spec => ({
    rule: 'expected',
    ruleText: '1/12 předpokládané úhrady za hodnocené období',
    assumption,
    ref2025: ref(id, null),
    annual: all.bySegment[id] + adj(id),
    days,
  })
  const reported = (id: SegmentId, annual: number, note?: string, assumption = true): Spec => ({
    rule: 'reported',
    ruleText: 'hodnota vykázaných a uznaných služeb za měsíc',
    assumption,
    ref2025: ref(id, null),
    annual: annual + adj(id),
    days: 150,
    note,
  })
  const refPct = (id: SegmentId, pct: number, base: number | null, days = 150): Spec => ({
    rule: 'refPct',
    ruleText: `1/12 ze ${Math.round(pct * 100)} % úhrady referenčního období`,
    ref2025: ref(id, base),
    annual: (ref(id, base) ?? 0) * pct + adj(id),
    days,
  })

  const specs: Record<SegmentId, Spec> = {
    acute: { ...expected('acute'), ref2025: ref('acute', s.pu.uhrPu2025 + s.pu.uhrEu2025 + s.pu.uhrIsu2025 || null) },
    under50: expected('under50'),
    urgent: expected('urgent'),
    aftercare: expected('aftercare', 180, true),
    oneDay: reported('oneDay', all.oneDay.total),
    amb: { ...expected('amb'), ref2025: ref('amb', s.amb.uhrAmb2025 || null) },
    cl: expected('cl'),
    hospitalReg: {
      rule: 'none',
      ruleText: 'uplatní se až při vyúčtování',
      ref2025: null,
      annual: 0,
      days: 180,
    },
    gp: reported(
      'gp',
      all.gp.capitation + all.gp.performance + all.gp.episodes + all.gp.team + all.gp.nurse,
      'Kapitace, výkony a epizody měsíčně podle vykázání; týmová praxe a terénní sestra jako měsíční předběžná úhrada (příl. 2); POCUS a regulace při vyúčtování.',
    ),
    gyn: reported('gyn', all.gyn.total + all.gyn.regulation.penalty, 'Měsíční agregovaná úhrada za registrované pojištěnky a výkony podle vykázání; regulace při vyúčtování.'),
    dental: reported('dental', all.dental.total, 'Agregovaná úhrada za registrované pojištěnce a výkony podle vykázání.'),
    specialists: refPct('specialists', a.specialists, s.specialists.puro.uhrRef),
    physio: refPct('physio', a.physio, s.physio.puro.uhrRef),
    homecare: reported(
      'homecare',
      all.homecare.puro.performance + all.homecare.exemptUhr + all.homecare.otherUhr,
      'Výkony v hodnotě bodu bez uplatnění maxima; maximum se uplatní při vyúčtování.',
      false,
    ),
    palliative: reported('palliative', s.palliative.pointsDays * all.palliative.hb + all.palliative.otherUhr, 'Výkony bez uplatnění limitu dnů; limit se uplatní při vyúčtování.', false),
    odb913: { ...refPct('odb913', a.odb913, s.odb913.uhrRef, 180) },
    labs: {
      rule: 'refPct',
      ruleText: `1/12 ze ${Math.round(a.rdg * 100)} % (RDG) a ${Math.round(a.labs * 100)} % (laboratoře) úhrady referenčního období`,
      ref2025: ref('labs', rdgRef + labsRef),
      annual: adv.refUhr.labs > 0 ? adv.refUhr.labs * a.labs + adj('labs') : rdgRef * a.rdg + labsRef * a.labs + adj('labs'),
      days: 150,
      note: adv.refRdg > 0 ? undefined : 'Úhrada RDG za rok 2025 odhadnuta jako body 2025 × HB 2027 – pro přesnost zadejte skutečnou hodnotu.',
    },
    dialysis: reported('dialysis', dialysisReported, 'Výkony se základní HB 1,18 Kč; kvalitativní a transplantační navýšení uhradí pojišťovna do 150 dnů po skončení období.'),
    other: reported('other', all.other.total),
  }

  const rows: AdvanceRow[] = SEGMENTS.filter((m) => s.scope[m.id]).map((m) => {
    const spec = specs[m.id]
    const monthly = spec.annual / 12
    const expectedFinal = all.bySegment[m.id] * all.lateFactor
    const advancesTotal = monthly * 12
    return {
      id: m.id,
      label: m.label,
      annex: m.annex,
      rule: spec.rule,
      ruleText: spec.ruleText,
      assumption: spec.assumption ?? false,
      ref2025: spec.ref2025,
      expected: expectedFinal,
      monthly,
      advancesTotal,
      settlement: expectedFinal - advancesTotal,
      settlementDays: spec.days,
      note: spec.note,
    }
  })
  const sum = (f: (r: AdvanceRow) => number) => rows.reduce((acc, r) => acc + f(r), 0)
  return {
    rows,
    ref2025: sum((r) => r.ref2025 ?? 0),
    expected: sum((r) => r.expected),
    monthly: sum((r) => r.monthly),
    advancesTotal: sum((r) => r.advancesTotal),
    settlement: sum((r) => r.settlement),
    lateFactor: all.lateFactor,
  }
}

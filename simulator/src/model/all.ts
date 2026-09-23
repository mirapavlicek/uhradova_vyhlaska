import { computeCasePayment, computePu, computeSeparated, computeUnder50 } from './acute'
import { computeAftercare } from './aftercare'
import { computeAmb } from './ambulance'
import { computeCentreDrugs } from './centreDrugs'
import { computeDental } from './dental'
import { computeDialysis } from './dialysis'
import { computeGp } from './gp'
import { computeGyn } from './gyn'
import { computeHomecare, computeOdb913, computePalliative } from './homecare'
import { computeHospitalRegulation } from './hospitalRegulation'
import { computeLabs } from './labs'
import { computeOneDay } from './oneDay'
import { computeOther } from './other'
import { computePhysio } from './physio'
import type { Scenario } from './scenario'
import { SEGMENT_BY_ID, SEGMENT_IDS, type SegmentGroup, type SegmentId } from './segments'
import { computeSpecialists } from './specialists'
import { computeUrgent } from './urgent'

/** Přepočet všech modulů scénáře pro přehled a porovnání. */
export function computeAll(s: Scenario) {
  const czs = s.common.vaccinationMet ? s.params.czsVaccinated : s.params.czs
  const pu = computePu(s.pu, s.common, s.params)
  const sep = computeSeparated(s.separated, s.common, s.params)
  const pp = computeCasePayment(s.casePayment, s.common, s.params)
  const under50 = computeUnder50(s.under50, s.common, s.params)
  const amb = computeAmb(s.amb, s.params)
  const cl = computeCentreDrugs(s.cl, s.params)
  const urgent = computeUrgent(s.urgent, s.params)
  const aftercare = computeAftercare(s.aftercare, s.params)
  const hospitalReg = computeHospitalRegulation(s.hospitalReg, czs, s.params)
  const oneDay = computeOneDay(s.oneDay)
  const gp = computeGp(s.gp, s.params)
  const gyn = computeGyn(s.gyn, s.params)
  const dental = computeDental(s.dental, s.params)
  const specialists = computeSpecialists(s.specialists, s.params)
  const physio = computePhysio(s.physio, s.params)
  const homecare = computeHomecare(s.homecare, s.params)
  const palliative = computePalliative(s.palliative, s.params)
  const odb913 = computeOdb913(s.odb913, s.params)
  const labs = computeLabs(s.labs, s.params)
  const dialysis = computeDialysis(s.dialysis, s.params)
  const other = computeOther(s.other, s.params)

  /** úhrada segmentu za hodnocené období (regulace nemocnic jako záporná položka) */
  const bySegment: Record<SegmentId, number> = {
    acute: pu.uhr + sep.uhr + pp.uhr,
    under50: under50.uhr,
    urgent: urgent.total,
    aftercare: aftercare.total,
    oneDay: oneDay.total,
    amb: amb.total,
    cl: cl.uhr,
    hospitalReg: -hospitalReg.total,
    gp: gp.total,
    gyn: gyn.total,
    dental: dental.total,
    specialists: specialists.total,
    physio: physio.total,
    homecare: homecare.total,
    palliative: palliative.total,
    odb913: odb913.total,
    labs: labs.total,
    dialysis: dialysis.total,
    other: other.total,
  }
  const inScope = (id: SegmentId) => s.scope[id] !== false
  const groupSum = (g: SegmentGroup) => SEGMENT_IDS.filter((id) => SEGMENT_BY_ID[id].group === g && inScope(id)).reduce((a, id) => a + bySegment[id], 0)
  const hospital = groupSum('hospital')
  const primary = groupSum('primary')
  const ambulatory = groupSum('ambulatory')
  const otherGroup = groupSum('other')
  const gross = hospital + primary + ambulatory + otherGroup
  /** § 2 odst. 4: služby vykázané po 31. 3. 2028 se hradí koeficientem 0,95 */
  const lateFactor = 1 - s.provider.lateShare * (1 - s.params.misc.lateCoef)
  const total = gross * lateFactor
  return {
    pu,
    sep,
    pp,
    under50,
    amb,
    cl,
    urgent,
    aftercare,
    hospitalReg,
    oneDay,
    gp,
    gyn,
    dental,
    specialists,
    physio,
    homecare,
    palliative,
    odb913,
    labs,
    dialysis,
    other,
    bySegment,
    hospital,
    primary,
    ambulatory,
    otherGroup,
    gross,
    lateFactor,
    total,
  }
}

export type AllResults = ReturnType<typeof computeAll>

/** Rovnoměrná řada hodnot x od from do to (včetně). */
export function range(from: number, to: number, steps: number): number[] {
  const out: number[] = []
  for (let i = 0; i <= steps; i++) out.push(from + ((to - from) * i) / steps)
  return out
}

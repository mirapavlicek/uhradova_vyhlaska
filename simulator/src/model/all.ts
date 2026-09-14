import { computeCasePayment, computePu, computeSeparated } from './acute'
import { computeAftercare } from './aftercare'
import { computeAmb } from './ambulance'
import { computeCentreDrugs } from './centreDrugs'
import { computeDialysis } from './dialysis'
import { computeGp } from './gp'
import { computeGyn } from './gyn'
import { computeHomecare, computeOdb913, computePalliative } from './homecare'
import { computeHospitalRegulation } from './hospitalRegulation'
import { computeLabs } from './labs'
import { computeOneDay } from './oneDay'
import { computePhysio } from './physio'
import type { Scenario } from './scenario'
import { computeSpecialists } from './specialists'
import { computeUrgent } from './urgent'

/** Přepočet všech modulů scénáře pro přehled a porovnání. */
export function computeAll(s: Scenario) {
  const czs = s.common.vaccinationMet ? s.params.czsVaccinated : s.params.czs
  const pu = computePu(s.pu, s.common, s.params)
  const sep = computeSeparated(s.separated, s.common, s.params)
  const pp = computeCasePayment(s.casePayment, s.common, s.params)
  const amb = computeAmb(s.amb, s.params)
  const cl = computeCentreDrugs(s.cl, s.params)
  const urgent = computeUrgent(s.urgent, s.params)
  const aftercare = computeAftercare(s.aftercare, s.params)
  const hospitalReg = computeHospitalRegulation(s.hospitalReg, czs, s.params)
  const oneDay = computeOneDay(s.oneDay)
  const gp = computeGp(s.gp, s.params)
  const gyn = computeGyn(s.gyn, s.params)
  const specialists = computeSpecialists(s.specialists, s.params)
  const physio = computePhysio(s.physio, s.params)
  const homecare = computeHomecare(s.homecare, s.params)
  const palliative = computePalliative(s.palliative, s.params)
  const odb913 = computeOdb913(s.odb913, s.params)
  const labs = computeLabs(s.labs, s.params)
  const dialysis = computeDialysis(s.dialysis, s.params)

  const hospital = pu.uhr + sep.uhr + pp.uhr + amb.total + cl.uhr + urgent.total + aftercare.total + oneDay.total - hospitalReg.total
  const primary = gp.total + gyn.total
  const ambulatory = specialists.total + physio.total + homecare.total + palliative.total + odb913.total + labs.total + dialysis.total
  const total = hospital + primary + ambulatory
  return { pu, sep, pp, amb, cl, urgent, aftercare, hospitalReg, oneDay, gp, gyn, specialists, physio, homecare, palliative, odb913, labs, dialysis, hospital, primary, ambulatory, total }
}

export type AllResults = ReturnType<typeof computeAll>

/** Rovnoměrná řada hodnot x od from do to (včetně). */
export function range(from: number, to: number, steps: number): number[] {
  const out: number[] = []
  for (let i = 0; i <= steps; i++) out.push(from + ((to - from) * i) / steps)
  return out
}

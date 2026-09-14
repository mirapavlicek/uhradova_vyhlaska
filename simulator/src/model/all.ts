import { computeCasePayment, computePu, computeSeparated } from './acute'
import { computeAmb } from './ambulance'
import { computeCentreDrugs } from './centreDrugs'
import type { Scenario } from './scenario'

/** Přepočet všech modulů scénáře pro přehled a porovnání. */
export function computeAll(s: Scenario) {
  const pu = computePu(s.pu, s.common, s.params)
  const sep = computeSeparated(s.separated, s.common, s.params)
  const pp = computeCasePayment(s.casePayment, s.common, s.params)
  const amb = computeAmb(s.amb, s.params)
  const cl = computeCentreDrugs(s.cl, s.params)
  const total = pu.uhr + sep.uhr + pp.uhr + amb.total + cl.uhr
  return { pu, sep, pp, amb, cl, total }
}

/** Rovnoměrná řada hodnot x od from do to (včetně). */
export function range(from: number, to: number, steps: number): number[] {
  const out: number[] = []
  for (let i = 0; i <= steps; i++) out.push(from + ((to - from) * i) / steps)
  return out
}

/**
 * Příloha č. 9 – koeficienty poměru počtu pojištěnců zdravotní pojišťovny v okrese (bod 1)
 * a v regionu (bod 2). Promítají se do K u LPS, ERN, paliativních týmů, pohotovostí a X u redukce casemixu.
 */
import data from '../data/kpp.json'
import type { Scenario } from './scenario'

export const INSURERS: string[] = data.insurers
export const DISTRICTS: string[] = data.districts.map((d) => d.name)
export const REGIONS: string[] = data.regions.map((r) => r.name)

const lookup = (list: { name: string; k: number[] }[], name: string, insurer: string): number | null => {
  const i = INSURERS.indexOf(insurer)
  const row = list.find((r) => r.name === name)
  return i >= 0 && row ? row.k[i] : null
}

export const districtK = (district: string, insurer: string) => lookup(data.districts, district, insurer)
export const regionK = (region: string, insurer: string) => lookup(data.regions, region, insurer)

/** Doplní koeficienty K podle pojišťovny, okresu a regionu poskytovatele. */
export function applyKpp(s: Scenario): { scenario: Scenario; applied: string[] } {
  const next = structuredClone(s)
  const applied: string[] = []
  const kd = districtK(s.provider.district, s.provider.insurer)
  const kr = regionK(s.provider.region, s.provider.insurer)
  if (kd !== null) {
    next.common.insurerDistrictShare = kd
    next.urgent.k = kd
    next.gp.kpp = kd
    applied.push(`okres ${s.provider.district}: K = ${kd} (redukce casemixu, LPS, paliativní tým, KPP praktiků)`)
  }
  if (kr !== null) {
    next.urgent.kRegion = kr
    next.other.dentalEmergency.k = kr
    next.other.pharmacyEmergency.k = kr
    applied.push(`region ${s.provider.region}: K = ${kr} (ERN, centrum provázení, pohotovosti)`)
  }
  return { scenario: next, applied }
}

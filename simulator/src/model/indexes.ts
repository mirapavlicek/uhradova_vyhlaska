import type { DecreeParams } from './params'

/** ARCTG podle vyhlášky = arkus tangens v radiánech. */
export const arctg = Math.atan

/** I_ZP – index změny produkce akutní lůžkové péče (příl. 1, bod 3.3). */
export function indexIzp(r: number, p: DecreeParams): number {
  return Math.max(1, arctg(p.izp.a * r - p.izp.b))
}

/** IZ_GAUP – míra, v jaké růst hodnoty péče doprovází růst unikátních pojištěnců (bod 7.x). */
export function indexIzGaup(rHp: number, rGaup: number, p: DecreeParams): number {
  if (rHp === 1) return 1
  const ratio = (rGaup - 1) / (p.izpAmb.gaupShare * (rHp - 1))
  return Math.max(0, Math.min(1, ratio))
}

/** I_zp_amb – index změny produkce ambulantní složky (radiodiagnostika + ostatní). */
export function indexIzpAmb(rHp: number, izGaup: number, p: DecreeParams): number {
  return Math.max(1, 1 + izGaup * (arctg(p.izpAmb.a * rHp - p.izpAmb.b) - 1))
}

/** IZP_CL – index změny produkce centrových léků (příl. 15). */
export function indexIzpCl(r: number, p: DecreeParams): number {
  return Math.min(p.izpCl.cap, Math.max(1, arctg(p.izpCl.a * r - p.izpCl.b)))
}

/** Poměr r, při kterém ARCTG(a·r − b) = 1, tj. index se odlepí od hodnoty 1. */
export function detachmentPoint(a: number, b: number): number {
  return (Math.tan(1) + b) / a
}

/** Poměr r, při kterém ARCTG(a·r − b) dosáhne stropu cap. */
export function capPoint(a: number, b: number, cap: number): number {
  return (Math.tan(cap) + b) / a
}

/** Sklon d/dr ARCTG(a·r − b). */
export function slope(a: number, b: number, r: number): number {
  const x = a * r - b
  return a / (1 + x * x)
}

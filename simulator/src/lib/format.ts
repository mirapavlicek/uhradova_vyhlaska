import type { StepUnit } from '../model/steps'

const czk = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
const num0 = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 })
const num2 = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num4 = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const pct = new Intl.NumberFormat('cs-CZ', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 })

export const fmtCzk = (v: number) => czk.format(v)
export const fmtNum = (v: number, digits: 0 | 2 | 4 = 0) => (digits === 0 ? num0 : digits === 2 ? num2 : num4).format(v)
export const fmtPct = (v: number) => pct.format(v)
export const fmtIndex = (v: number) => num4.format(v)

/** Kompaktní zápis v mil. Kč pro grafy a souhrny. */
export function fmtMio(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${num2.format(v / 1e9)} mld. Kč`
  if (abs >= 1e6) return `${num2.format(v / 1e6)} mil. Kč`
  if (abs >= 1e3) return `${num0.format(v / 1e3)} tis. Kč`
  return czk.format(v)
}

export function fmtByUnit(v: number, unit: StepUnit): string {
  switch (unit) {
    case 'czk':
      return fmtCzk(v)
    case 'cm':
      return `${fmtNum(v, 2)} CM`
    case 'ratio':
    case 'index':
      return fmtIndex(v)
    case 'pct':
      return fmtPct(v)
    case 'count':
      return fmtNum(v)
    case 'days':
      return `${fmtNum(v, 2)} dní`
    default:
      return String(v)
  }
}

export function signed(v: number, formatter: (x: number) => string): string {
  const s = formatter(Math.abs(v))
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s
}

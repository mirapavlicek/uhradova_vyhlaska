/**
 * Krokový záznam výpočtu – každý modul vrací seznam kroků, které UI zobrazí
 * jako "průchod vyhláškou": symbol, vzorec, dosazené hodnoty a výsledek.
 */

export type StepUnit = 'czk' | 'cm' | 'ratio' | 'index' | 'count' | 'days' | 'pct' | 'text'

export interface Step {
  /** symbol proměnné, např. "I_ZP" */
  symbol: string
  /** slovní popis */
  label: string
  /** obecný vzorec podle vyhlášky */
  formula?: string
  /** dosazení konkrétních hodnot */
  substitution?: string
  value: number
  unit: StepUnit
  /** zvýraznit jako mezivýsledek / výsledek */
  emphasis?: 'result' | 'warning'
  /** poznámka k interpretaci */
  note?: string
}

export class StepRecorder {
  readonly steps: Step[] = []

  add(step: Step): number {
    this.steps.push(step)
    return step.value
  }
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export const safeDiv = (num: number, den: number, fallback = 0) => (den === 0 ? fallback : num / den)

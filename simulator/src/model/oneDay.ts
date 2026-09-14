/**
 * Jednodenní péče – příloha č. 13: Úhrada_JP = Σ Úhrada_JP,i · Počet_výkonů_JP,i − EM_JP.
 */
import { StepRecorder, type Step } from './steps'

export interface OneDayRow {
  id: string
  code: string
  name: string
  price: number
  count: number
}

export interface OneDayInputs {
  rows: OneDayRow[]
  em: number
}

export interface OneDayResult {
  steps: Step[]
  gross: number
  total: number
}

export function computeOneDay(inp: OneDayInputs): OneDayResult {
  const rec = new StepRecorder()
  let gross = 0
  for (const r of inp.rows) {
    const v = r.price * r.count
    gross += v
    rec.add({ symbol: r.code || r.name, label: r.name, substitution: `${r.count} · ${r.price}`, value: v, unit: 'czk' })
  }
  rec.add({ symbol: 'Σ Úhrada_JP,i · Počet', label: 'Součet za výkony jednodenní péče (včetně všech výkonů, ZUM a ZULP v ceně)', value: gross, unit: 'czk' })
  const total = gross - inp.em
  rec.add({ symbol: 'Úhrada_JP,2027', label: 'Σ − vyžádaná extramurální péče', substitution: `${gross} − ${inp.em}`, value: total, unit: 'czk', emphasis: 'result' })
  return { steps: rec.steps, gross, total }
}

export const DEFAULT_ONE_DAY_ROWS: OneDayRow[] = [
  { id: 'j1', code: '10818', name: 'Implantace dvoukomorového / subkutánního ICD (05-I14-03)', price: 327_226, count: 10 },
  { id: 'j2', code: '10455', name: 'Implantace jedno-/dvoudutinového ICD, CC 0–3 (05-I14-04)', price: 281_418, count: 12 },
]

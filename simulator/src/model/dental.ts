/**
 * Zubní lékařství – příloha č. 11: agregovaná úhrada za registrovaného pojištěnce (24 / 22 Kč měsíčně
 * + věkové příplatky) a úhrady výkonů, protetických a ortodontických výrobků pevnou částkou.
 */
import catalog from '../data/dental.json'
import type { DecreeParams } from './params'
import { StepRecorder, type Step } from './steps'

export interface DentalCatalogItem {
  code: string
  name: string
  price: number
  kind: 'service' | 'product'
  group?: string
}

export const DENTAL_CATALOG: DentalCatalogItem[] = [
  ...catalog.services.filter((s) => s.price !== null).map((s) => ({ code: s.code, name: s.name, price: s.price as number, kind: 'service' as const })),
  ...catalog.products.filter((s) => s.price !== null).map((s) => ({ code: s.code, name: s.name, price: s.price as number, kind: 'product' as const, group: s.group })),
]
const BY_CODE = new Map(DENTAL_CATALOG.map((c) => [c.code, c]))

export function dentalPrice(code: string): number | undefined {
  return BY_CODE.get(code.trim())?.price
}

export interface DentalRow {
  id: string
  code: string
  count: number
  /** ruční cena (Kč) – použije se, pokud kód není v příloze nebo má částečnou úhradu */
  priceOverride: number
}

export interface DentalInputs {
  /** registrující lékař je držitelem dokladu celoživotního vzdělávání */
  educated: boolean
  /** průměrný měsíční počet registrovaných pojištěnců podle věku */
  registered: { under6: number; from6to12: number; from12to18: number; adults: number }
  months: number
  rows: DentalRow[]
}

export interface DentalResult {
  steps: Step[]
  capRate: number
  capitation: number
  services: number
  unknownCodes: string[]
  total: number
}

export function computeDental(inp: DentalInputs, p: DecreeParams): DentalResult {
  const rec = new StepRecorder()
  const d = p.dental
  const base = inp.educated ? d.capEducated : d.capOther
  const r = inp.registered
  const monthly = (r.under6 + r.from6to12 + r.from12to18 + r.adults) * base + r.under6 * d.addUnder6 + r.from6to12 * d.add6to12 + r.from12to18 * d.add12to18
  const capitation = monthly * inp.months
  rec.add({
    symbol: 'Agregovaná úhrada',
    label: `${base} Kč za registrovaného pojištěnce měsíčně (${inp.educated ? 'doklad celoživotního vzdělávání' : 'bez dokladu'}) + 3 / 2 / 1 Kč za pojištěnce do 6 / 12 / 18 let`,
    formula: '[Σ reg · základ + reg<6 · 3 + reg6–12 · 2 + reg12–18 · 1] · měsíce',
    substitution: `[(${r.under6} + ${r.from6to12} + ${r.from12to18} + ${r.adults}) · ${base} + ${r.under6} · ${d.addUnder6} + ${r.from6to12} · ${d.add6to12} + ${r.from12to18} · ${d.add12to18}] · ${inp.months}`,
    value: capitation,
    unit: 'czk',
  })

  let services = 0
  const unknownCodes: string[] = []
  for (const row of inp.rows) {
    const item = BY_CODE.get(row.code.trim())
    const price = row.priceOverride > 0 ? row.priceOverride : (item?.price ?? 0)
    if (!item && row.priceOverride <= 0 && row.count > 0) unknownCodes.push(row.code)
    const v = price * row.count
    services += v
    rec.add({ symbol: row.code || '—', label: item?.name ?? 'kód není v příloze č. 11 – zadejte cenu ručně', substitution: `${row.count} · ${price}`, value: v, unit: 'czk' })
  }
  rec.add({ symbol: 'Výkony a výrobky', label: 'Σ počet × úhrada podle přílohy č. 11', value: services, unit: 'czk' })

  const total = capitation + services
  rec.add({ symbol: 'Úhrada zubní péče', label: 'Agregovaná úhrada + výkony a výrobky', substitution: `${capitation.toFixed(0)} + ${services.toFixed(0)}`, value: total, unit: 'czk', emphasis: 'result' })
  return { steps: rec.steps, capRate: base, capitation, services, unknownCodes, total }
}

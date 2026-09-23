/**
 * Šablona vstupních dat a import (XLSX, XLS, ODS, CSV) pro modelační nástroj.
 *
 * Formát:
 *  - list „Vstupy“: sloupce Klíč | Popis | Hodnota | Povolené hodnoty – jednotlivé vstupy scénáře,
 *    klíč je cesta ve scénáři (např. `pu.cm2025A`, `gyn.pregnancies[0]`),
 *  - listy s názvem tabulky (např. `separated.rows`): 1. řádek klíče sloupců, 2. řádek popisy, dále data,
 *  - list „Případy CZ-DRG“: drg | rok | pripady | preklady | cm_jpl | urgentni.
 * CSV obsahuje buď dvojice klíč–hodnota (tabulky jako `oneDay.rows[3].count`), nebo případy CZ-DRG.
 */
import type { WorkBook, WorkSheet } from 'xlsx'
import type { AdvanceSummary } from '../model/advances'
import type { AllResults } from '../model/all'
import type { CaseRow } from '../model/casemix'
import type { Step } from '../model/steps'
import { defaultScenario, normalizeScenario, type Scenario } from '../model/scenario'
import { SEGMENT_IDS, type SegmentId } from '../model/segments'
import { enumOptionsFor, labelFor, TABLE_COLUMNS } from './fieldLabels'

export const SHEET_INPUTS = 'Vstupy'
export const SHEET_CASES = 'Případy CZ-DRG'
export const SHEET_README = 'Návod'

type Primitive = number | boolean | string
type Plain = Record<string, unknown>

const TOP_SEGMENT: Record<string, SegmentId | 'always' | 'acuteCommon'> = {
  name: 'always',
  provider: 'always',
  common: 'acuteCommon',
  pu: 'acute',
  separated: 'acute',
  casePayment: 'acute',
  under50: 'under50',
  amb: 'amb',
  cl: 'cl',
  urgent: 'urgent',
  aftercare: 'aftercare',
  hospitalReg: 'hospitalReg',
  oneDay: 'oneDay',
  gp: 'gp',
  gyn: 'gyn',
  dental: 'dental',
  specialists: 'specialists',
  physio: 'physio',
  homecare: 'homecare',
  palliative: 'palliative',
  odb913: 'odb913',
  labs: 'labs',
  dialysis: 'dialysis',
  other: 'other',
}

function included(top: string, s: Scenario): boolean {
  const seg = TOP_SEGMENT[top]
  if (!seg) return false
  if (seg === 'always') return true
  if (seg === 'acuteCommon') return s.scope.acute || s.scope.under50
  return s.scope[seg]
}

export interface FlatField {
  path: string
  value: Primitive
  label: string
  options?: Record<string, string>
}

/** Rozloží scénář na jednotlivé vstupy (bez parametrů vyhlášky a tabulek). */
export function flattenScenario(s: Scenario, opts: { includeTables?: boolean; allSegments?: boolean } = {}): FlatField[] {
  const out: FlatField[] = []
  const walk = (v: unknown, path: string) => {
    if (!opts.includeTables && TABLE_COLUMNS[path]) return
    if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${path}[${i}]`))
      return
    }
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v as Plain)) if (k !== 'id') walk(x, `${path}.${k}`)
      return
    }
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') out.push({ path, value: v, label: labelFor(path), options: enumOptionsFor(path) })
  }
  for (const top of Object.keys(TOP_SEGMENT)) {
    if (!opts.allSegments && !included(top, s)) continue
    const v = (s as unknown as Plain)[top]
    if (top === 'name') out.push({ path: 'name', value: s.name, label: labelFor('name') })
    else walk(v, top)
  }
  for (const id of SEGMENT_IDS) {
    if (!opts.allSegments && !s.scope[id]) continue
    out.push({ path: `advances.refUhr.${id}`, value: s.advances.refUhr[id], label: labelFor(`advances.refUhr.${id}`) })
    out.push({ path: `advances.adjust.${id}`, value: s.advances.adjust[id], label: labelFor(`advances.adjust.${id}`) })
  }
  if (opts.allSegments || s.scope.labs) out.push({ path: 'advances.refRdg', value: s.advances.refRdg, label: labelFor('advances.refRdg') })
  return out
}

const cellValue = (v: Primitive) => (typeof v === 'boolean' ? (v ? 'ano' : 'ne') : v)

function tablesFor(s: Scenario): string[] {
  return Object.keys(TABLE_COLUMNS).filter((p) => included(p.split('.')[0], s))
}

function getPath(obj: unknown, path: string): unknown {
  return tokenize(path).reduce<unknown>((o, k) => (o == null ? undefined : (o as Plain)[k as string]), obj)
}

function tokenize(path: string): (string | number)[] {
  const out: (string | number)[] = []
  for (const part of path.split('.')) {
    const m = part.match(/^([^[]+)((?:\[\d+\])*)$/)
    if (!m) return [path]
    out.push(m[1])
    for (const idx of m[2].matchAll(/\[(\d+)\]/g)) out.push(Number(idx[1]))
  }
  return out
}

const README_ROWS = [
  ['Šablona vstupních dat – Simulátor úhradové vyhlášky 2027'],
  [''],
  ['1. Na listu „Vstupy“ vyplňte sloupec Hodnota. Klíč neměňte; řádky, které nevyplníte, převezmou hodnotu ze simulátoru.'],
  ['2. Ano/ne pole zadejte slovy „ano“ nebo „ne“; u výběrových polí použijte kód ze sloupce Povolené hodnoty.'],
  ['3. Tabulkové listy (např. separated.rows) mají v 1. řádku klíče sloupců a ve 2. popisy – data pište od 3. řádku, počet řádků je libovolný.'],
  ['4. List „Případy CZ-DRG“: jeden řádek = skupina CZ-DRG a rok (2025 = referenční, 2027 = hodnocené). Casemix, KC a rozdělení do částí A–I dopočítá simulátor podle přílohy č. 10.'],
  ['   Sloupce: drg (např. 05-I14-03), rok, pripady, preklady (kód ukončení 5), cm_jpl (volitelně), urgentni (případy přijaté přes UP – KC = 1).'],
  ['5. Hodnoty referenčního období sděluje zdravotní pojišťovna (do 30. 4., resp. 31. 5. hodnoceného roku); hodnoty 2027 jsou vaše plánovaná produkce.'],
  ['6. Soubor nahrajte v simulátoru na stránce „Modelace předběžné úhrady“. Podporováno: XLSX, XLS, ODS, CSV (oddělovač ; nebo ,).'],
]

/** Sestaví sešit šablony z aktuálního scénáře (jen segmenty v rozsahu poskytovatele). */
export async function buildTemplate(s: Scenario): Promise<WorkBook> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(README_ROWS), SHEET_README)

  const fields = flattenScenario(s)
  const rows: Primitive[][] = [['Klíč', 'Popis', 'Hodnota', 'Povolené hodnoty']]
  for (const f of fields) {
    const allowed = f.options ? Object.entries(f.options).map(([k, v]) => `${k} = ${v}`).join('; ') : typeof f.value === 'boolean' ? 'ano; ne' : ''
    rows.push([f.path, f.label, cellValue(f.value), allowed])
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 34 }, { wch: 70 }, { wch: 16 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, ws, SHEET_INPUTS)

  for (const table of tablesFor(s)) {
    const cols = TABLE_COLUMNS[table]
    const keys = Object.keys(cols)
    const data = (getPath(s, table) as Plain[]) ?? []
    const aoa: Primitive[][] = [keys, keys.map((k) => cols[k])]
    for (const r of data) aoa.push(keys.map((k) => cellValue((r[k] ?? '') as Primitive)))
    const t = XLSX.utils.aoa_to_sheet(aoa)
    t['!cols'] = keys.map(() => ({ wch: 22 }))
    XLSX.utils.book_append_sheet(wb, t, table)
  }

  if (s.scope.acute || s.scope.under50) {
    const cases = XLSX.utils.aoa_to_sheet([
      ['drg', 'rok', 'pripady', 'preklady', 'cm_jpl', 'urgentni'],
      ['05-I14-03', 2025, 8, 0, 0, 0],
      ['05-I14-03', 2027, 10, 0, 0, 0],
    ])
    cases['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, cases, SHEET_CASES)
  }
  return wb
}

export async function downloadTemplate(s: Scenario, format: 'xlsx' | 'csv') {
  const XLSX = await import('xlsx')
  const base = `sablona_uv2027_${slug(s.provider.name || s.name)}`
  if (format === 'xlsx') {
    XLSX.writeFile(await buildTemplate(s), `${base}.xlsx`)
    return
  }
  const rows: Primitive[][] = [['Klíč', 'Popis', 'Hodnota']]
  for (const f of flattenScenario(s, { includeTables: true })) rows.push([f.path, f.label, cellValue(f.value)])
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows), { FS: ';' })
  downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `${base}.csv`)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'poskytovatel'

// ------------------------------------------------------------------ výsledky

/** Kroky výpočtu po segmentech pro export. */
export function stepsBySegment(all: AllResults): Record<SegmentId, Step[]> {
  return {
    acute: [...all.pu.steps, ...all.sep.steps, ...all.pp.steps],
    under50: all.under50.steps,
    urgent: all.urgent.steps,
    aftercare: all.aftercare.steps,
    oneDay: all.oneDay.steps,
    amb: all.amb.steps,
    cl: all.cl.steps,
    hospitalReg: all.hospitalReg.steps,
    gp: all.gp.steps,
    gyn: all.gyn.steps,
    dental: all.dental.steps,
    specialists: all.specialists.steps,
    physio: all.physio.steps,
    homecare: all.homecare.steps,
    palliative: all.palliative.steps,
    odb913: all.odb913.steps,
    labs: all.labs.steps,
    dialysis: all.dialysis.steps,
    other: all.other.steps,
  }
}

export async function downloadResults(s: Scenario, all: AllResults, adv: AdvanceSummary) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const round = (v: number) => Math.round(v)
  const head: Primitive[][] = [
    ['Předběžná úhrada 2027 – orientační výpočet podle návrhu úhradové vyhlášky'],
    ['Poskytovatel', s.provider.name, 'IČO', s.provider.ico],
    ['Zdravotní pojišťovna', s.provider.insurer, 'Okres / region', `${s.provider.district || '–'} / ${s.provider.region || '–'}`],
    ['Vytvořeno', new Date().toLocaleString('cs-CZ')],
    [],
    ['Segment', 'Příloha', 'Úhrada 2025', 'Předpokládaná úhrada 2027', 'Pravidlo předběžné úhrady', 'Měsíční předběžná úhrada', 'Předběžné úhrady za rok', 'Vyúčtování (+ doplatek / − přeplatek)', 'Splatnost vyúčtování (dny)', 'Poznámka'],
  ]
  for (const r of adv.rows) {
    head.push([r.label, r.annex, r.ref2025 === null ? '' : round(r.ref2025), round(r.expected), r.ruleText + (r.assumption ? ' (předpoklad modelu)' : ''), round(r.monthly), round(r.advancesTotal), round(r.settlement), r.settlementDays, r.note ?? ''])
  }
  head.push(['Celkem', '', round(adv.ref2025), round(adv.expected), '', round(adv.monthly), round(adv.advancesTotal), round(adv.settlement)])
  const ws = XLSX.utils.aoa_to_sheet(head)
  ws['!cols'] = [{ wch: 48 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 44 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Předběžná úhrada')

  const steps: Primitive[][] = [['Segment', 'Symbol', 'Popis', 'Vzorec', 'Dosazení', 'Hodnota', 'Jednotka', 'Poznámka']]
  const bySeg = stepsBySegment(all)
  for (const r of adv.rows) for (const st of bySeg[r.id]) steps.push([r.label, st.symbol, st.label, st.formula ?? '', st.substitution ?? '', st.value, st.unit, st.note ?? ''])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(steps), 'Průchod výpočtem')

  const inputs: Primitive[][] = [['Klíč', 'Popis', 'Hodnota']]
  for (const f of flattenScenario(s, { includeTables: true })) inputs.push([f.path, f.label, cellValue(f.value)])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inputs), 'Vstupy')
  XLSX.writeFile(wb, `predbezna_uhrada_2027_${slug(s.provider.name || s.name)}.xlsx`)
}

// ------------------------------------------------------------------ import

export interface ImportReport {
  scenario: Scenario
  applied: number
  tables: string[]
  cases: CaseRow[]
  warnings: string[]
  errors: string[]
}

export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const t = v.replace(/\u00a0|\s/g, '').replace(/Kč$/i, '')
  if (!t) return null
  const pct = t.endsWith('%')
  const core = pct ? t.slice(0, -1) : t
  const normalized = /,\d+$/.test(core) && core.includes('.') ? core.replace(/\./g, '').replace(',', '.') : core.replace(',', '.')
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return pct ? n / 100 : n
}

export function parseBoolean(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const t = String(v ?? '').trim().toLowerCase()
  if (['ano', 'a', 'yes', 'y', 'true', 'x', '1', 'pravda'].includes(t)) return true
  if (['ne', 'n', 'no', 'false', '0', 'nepravda', ''].includes(t)) return t === '' ? null : false
  return null
}

function coerce(path: string, raw: unknown, template: unknown): { value?: Primitive; error?: string } {
  if (raw === undefined || raw === null || raw === '') return {}
  if (typeof template === 'number') {
    const n = parseNumber(raw)
    return n === null ? { error: `${path}: „${raw}“ není číslo` } : { value: n }
  }
  if (typeof template === 'boolean') {
    const b = parseBoolean(raw)
    return b === null ? { error: `${path}: „${raw}“ – očekáváno ano/ne` } : { value: b }
  }
  const opts = enumOptionsFor(path)
  const t = String(raw).trim()
  if (opts) {
    const code = String(t.split('=')[0]).trim()
    if (code in opts) return { value: code }
    const byLabel = Object.entries(opts).find(([, label]) => label.toLowerCase() === t.toLowerCase())
    return byLabel ? { value: byLabel[0] } : { error: `${path}: „${t}“ není povolená hodnota (${Object.keys(opts).join(', ')})` }
  }
  return { value: t }
}

function setPath(obj: unknown, tokens: (string | number)[], value: Primitive) {
  let o = obj as Plain
  for (let i = 0; i < tokens.length - 1; i++) o = o[tokens[i] as string] as Plain
  ;(o as Plain)[tokens[tokens.length - 1] as string] = value
}

function normHeader(h: unknown) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const CASE_ALIASES: Record<keyof CaseRow, string[]> = {
  drg: ['drg', 'cz-drg', 'skupina', 'drg skupina', 'cz-drg skupina', 'kod drg'],
  year: ['rok', 'obdobi', 'year'],
  cases: ['pripady', 'pocet', 'pocet pripadu', 'cases', 'n'],
  transfers: ['preklady', 'kod 5', 'kod5', 'transfers', 'pocet prekladu'],
  cmJpl: ['cm_jpl', 'jpl', 'cm jpl'],
  urgentCases: ['urgentni', 'urgent', 'up'],
}

function caseColumns(header: unknown[]): Partial<Record<keyof CaseRow, number>> | null {
  const h = header.map(normHeader)
  const cols: Partial<Record<keyof CaseRow, number>> = {}
  for (const [key, aliases] of Object.entries(CASE_ALIASES) as [keyof CaseRow, string[]][]) {
    const idx = h.findIndex((x) => aliases.includes(x))
    if (idx >= 0) cols[key] = idx
  }
  return cols.drg !== undefined && cols.year !== undefined ? cols : null
}

function parseCases(aoa: unknown[][], cols: Partial<Record<keyof CaseRow, number>>, warnings: string[]): CaseRow[] {
  const out: CaseRow[] = []
  for (const row of aoa.slice(1)) {
    const drg = String(row[cols.drg!] ?? '').trim()
    if (!drg) continue
    const yRaw = normHeader(row[cols.year!])
    const year = yRaw.startsWith('2025') || yRaw === 'ref' || yRaw === 'referencni' ? 2025 : yRaw.startsWith('2027') || yRaw === 'ho' || yRaw === 'hodnocene' ? 2027 : null
    if (!year) {
      warnings.push(`Případy CZ-DRG: řádek ${drg} má neznámý rok „${row[cols.year!]}“ – přeskočeno.`)
      continue
    }
    const num = (k: keyof CaseRow, fallback: number) => (cols[k] === undefined ? fallback : (parseNumber(row[cols[k]!]) ?? fallback))
    out.push({ drg, year: year as 2025 | 2027, cases: num('cases', 1), transfers: num('transfers', 0), cmJpl: num('cmJpl', 0), urgentCases: num('urgentCases', 0) })
  }
  return out
}

/** Načte vyplněnou šablonu a aplikuje ji na scénář. */
export async function importWorkbook(data: ArrayBuffer, fileName: string, base: Scenario): Promise<ImportReport> {
  const XLSX = await import('xlsx')
  const isCsv = /\.(csv|txt)$/i.test(fileName)
  let wb: WorkBook
  if (isCsv) {
    let text = new TextDecoder('utf-8').decode(data)
    if (text.includes('\ufffd')) text = new TextDecoder('windows-1250').decode(data)
    wb = XLSX.read(text.replace(/^\ufeff/, ''), { type: 'string', raw: true })
  } else {
    wb = XLSX.read(data, { type: 'array' })
  }
  const template = defaultScenario()
  const next = structuredClone(base)
  const warnings: string[] = []
  const errors: string[] = []
  const tables: string[] = []
  let cases: CaseRow[] = []
  let applied = 0

  const applyKey = (path: string, raw: unknown) => {
    const tokens = tokenize(path)
    const tableHead = Object.keys(TABLE_COLUMNS).find((t) => path.startsWith(`${t}[`))
    if (tableHead) {
      const idx = tokens[tableHead.split('.').length] as number
      const arr = getPath(next, tableHead) as Plain[]
      const proto = ((getPath(template, tableHead) as Plain[])[0] ?? {}) as Plain
      while (arr.length <= idx) arr.push({ ...structuredClone(proto), id: `imp-${Date.now()}-${arr.length}` })
    }
    const tmplValue = getPath(template, path) ?? getPath(next, path)
    if (tmplValue === undefined || (typeof tmplValue === 'object' && tmplValue !== null)) {
      warnings.push(`Neznámý klíč „${path}“ – přeskočeno.`)
      return
    }
    const { value, error } = coerce(path, raw, tmplValue)
    if (error) errors.push(error)
    else if (value !== undefined) {
      setPath(next, tokens, value)
      applied++
    }
  }

  for (const sheetName of wb.SheetNames) {
    const ws: WorkSheet = wb.Sheets[sheetName]
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' })
    if (!aoa.length) continue
    const header = aoa[0].map(normHeader)
    const caseCols = caseColumns(aoa[0])
    if (caseCols) {
      cases = cases.concat(parseCases(aoa, caseCols, warnings))
      continue
    }
    const keyIdx = header.findIndex((h) => h === 'klic' || h === 'key')
    const valIdx = header.findIndex((h) => h === 'hodnota' || h === 'value')
    if (keyIdx >= 0 && valIdx >= 0) {
      for (const row of aoa.slice(1)) {
        const path = String(row[keyIdx] ?? '').trim()
        if (path) applyKey(path, row[valIdx])
      }
      continue
    }
    if (TABLE_COLUMNS[sheetName]) {
      const cols = TABLE_COLUMNS[sheetName]
      const keys = aoa[0].map((h) => String(h).trim())
      const unknownCols = keys.filter((k) => k && !(k in cols))
      if (unknownCols.length) warnings.push(`${sheetName}: neznámé sloupce ${unknownCols.join(', ')} – ignorováno.`)
      const proto = ((getPath(template, sheetName) as Plain[])[0] ?? {}) as Plain
      const dataRows = aoa.slice(1).filter((r, i) => !(i === 0 && keys.every((k, j) => !k || String(r[j]) === cols[k])) && r.some((c) => c !== ''))
      const rowsOut: Plain[] = []
      dataRows.forEach((r, i) => {
        const obj: Plain = { ...structuredClone(proto), id: `imp-${sheetName}-${i}` }
        keys.forEach((k, j) => {
          if (!(k in cols)) return
          const { value, error } = coerce(`${sheetName}[${i}].${k}`, r[j], proto[k])
          if (error) errors.push(error)
          else if (value !== undefined) obj[k] = value
        })
        rowsOut.push(obj)
      })
      setPath(next, tokenize(sheetName), rowsOut as unknown as Primitive)
      tables.push(`${sheetName} (${rowsOut.length} řádků)`)
      applied += rowsOut.length
      continue
    }
    if (sheetName !== SHEET_README) warnings.push(`List „${sheetName}“ nemá rozpoznatelnou strukturu – přeskočeno.`)
  }

  return { scenario: normalizeScenario(next), applied, tables, cases, warnings, errors }
}

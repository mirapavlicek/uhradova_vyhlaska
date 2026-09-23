import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import drg from '../data/drg.json'
import { buildTemplate, flattenScenario, importWorkbook, parseBoolean, parseNumber } from '../lib/io'
import { computeAdvances } from './advances'
import { computeAftercare } from './aftercare'
import { computeAll } from './all'
import { applyCasemix, buildCatalog, kcFor, normalizeDrg, summarizeCases, type DrgRecord } from './casemix'
import { computeDental, dentalPrice } from './dental'
import { applyKpp, districtK, regionK } from './kpp'
import { computeOther } from './other'
import { DEFAULT_PARAMS } from './params'
import { defaultScenario, normalizeScenario } from './scenario'
import { scopeOf } from './segments'

const p = DEFAULT_PARAMS
const catalog = buildCatalog(drg as DrgRecord[])

describe('§ 14–19', () => {
  it('ZZS, ZDS, pohotovosti, lázně a výkony s pevnou úhradou', () => {
    const s = defaultScenario().other
    const r = computeOther(
      {
        ...s,
        zzs: { points: 1_000, pointsTransport: 100, points06714: 10, episodes: 2 },
        zds: { nonstop: false, points: 1_000, points40: 100, points69: 10 },
        dentalEmergency: { days: 10, k: 0.5 },
        pharmacyEmergency: { days: 5, k: 0.4 },
        spa: { complexDays: 10, complexRate2026: 2_000, contribDays: 0, contribRate2026: 0, points09543Spa: 100, ozdravovnaDays: 2 },
        flat: { points09543: 100, points09555: 0, points09580: 0, count09990: 3, count09552: 2, eRecipes: 10 },
      },
      p,
    )
    expect(r.zzs).toBeCloseTo(1_000 * 1.34 + 100 * 1.53 + 10 * 1.37 + 2 * 1_550, 6)
    expect(r.zds).toBeCloseTo(1_000 * 1.26 + 100 * 1.36 + 10 * 1.34, 6)
    expect(r.dentalEmergency).toBeCloseTo(10 * 9_600 * 0.5, 6)
    expect(r.pharmacy).toBeCloseTo(5 * 3_600 * 0.4, 6)
    expect(r.spa).toBeCloseTo(10 * 2_000 * 1.02 + 100 * 0.78 + 2 * 1_336, 6)
    expect(r.flat).toBeCloseTo(100 * 1.16 + 3 * 36 + 2 * 33 + 10 * 17, 6)
    expect(r.total).toBeCloseTo(r.zzs + r.zds + r.dentalEmergency + r.pharmacy + r.spa + r.flat, 6)
  })
})

describe('zubní lékařství (příl. 11)', () => {
  it('ceník je převzat z přílohy', () => {
    expect(dentalPrice('00900')).toBe(724)
    expect(dentalPrice('00901')).toBe(607)
    expect(dentalPrice('7010101')).toBe(481)
  })
  it('agregovaná úhrada s věkovými příplatky a výkony', () => {
    const r = computeDental(
      { educated: true, registered: { under6: 10, from6to12: 10, from12to18: 10, adults: 70 }, months: 12, rows: [{ id: 'a', code: '00900', count: 2, priceOverride: 0 }, { id: 'b', code: 'XYZ', count: 1, priceOverride: 0 }] },
      p,
    )
    expect(r.capitation).toBe((100 * 24 + 10 * 3 + 10 * 2 + 10 * 1) * 12)
    expect(r.services).toBe(2 * 724)
    expect(r.unknownCodes).toEqual(['XYZ'])
    const other = computeDental({ educated: false, registered: { under6: 0, from6to12: 0, from12to18: 0, adults: 1 }, months: 1, rows: [] }, p)
    expect(other.capitation).toBe(22)
  })
})

describe('následná péče – pevné sazby', () => {
  it('OD 00090/00091, sazba 2026 × 1,02 a výkony 09535–09537', () => {
    const base = defaultScenario().aftercare
    const zero = computeAftercare({ ...base, contractDays: 0, od9091Days: { od00090: [0, 0, 0], od00091: [0, 0, 0] }, fees: { v09535: 0, v09536: 0, v09537: 0 } }, p)
    const r = computeAftercare({ ...base, contractDays: 100, contractRate2026: 1_000, od9091Days: { od00090: [1, 0, 0], od00091: [0, 0, 2] }, fees: { v09535: 1, v09536: 1, v09537: 1 } }, p)
    expect(r.lumpOther).toBeCloseTo(100 * 1_000 * 1.02 + 4_819 + 2 * 5_349 + 400, 6)
    expect(r.total - zero.total).toBeCloseTo(r.lumpOther, 6)
  })
})

describe('příloha č. 9 – KPP', () => {
  it('vyhledá koeficienty okresu a regionu', () => {
    expect(districtK('BENEŠOV', 'VZP')).toBe(0.633)
    expect(regionK('Jihočeský kraj', 'VoZP')).toBe(0.127)
    expect(districtK('NEEXISTUJE', 'VZP')).toBeNull()
  })
  it('promítne K do scénáře', () => {
    const s = defaultScenario()
    s.provider = { ...s.provider, insurer: 'VZP', district: 'BENEŠOV', region: 'Jihočeský kraj' }
    const { scenario, applied } = applyKpp(s)
    expect(scenario.common.insurerDistrictShare).toBe(0.633)
    expect(scenario.gp.kpp).toBe(0.633)
    expect(scenario.urgent.kRegion).toBe(0.621)
    expect(applied).toHaveLength(2)
  })
})

describe('casemix z případů CZ-DRG (příl. 10)', () => {
  it('katalog obsahuje všechny části A–I', () => {
    const parts = new Set((drg as DrgRecord[]).map((r) => r[1]))
    expect([...parts].sort().join('')).toBe('ABCDEFGHI')
    expect(catalog.byCode.get('00-M01-01')?.[3]).toBe(11.429)
  })
  it('normalizuje kódy a volí KC podle statusu centra', () => {
    expect(normalizeDrg(' 03i0701 ')).toBe('03-I07-01')
    const rec = catalog.byCode.get('03-I07-01')!
    expect(rec[1]).toBe('E')
    expect(kcFor(rec, ['OnkoDosp'])).toBe(1.05)
    expect(kcFor(rec, [])).toBe(0.5)
    expect(kcFor(catalog.byCode.get('00-M01-01')!, [])).toBe(1)
  })
  it('sečte casemix po částech a přenese ho do vstupů', () => {
    const a = catalog.byCode.get('00-M01-01')!
    const e = catalog.byCode.get('03-I07-01')!
    const sum = summarizeCases(
      [
        { drg: '00-M01-01', year: 2025, cases: 10, transfers: 1, cmJpl: 0, urgentCases: 0 },
        { drg: '00-M01-01', year: 2027, cases: 12, transfers: 2, cmJpl: 0, urgentCases: 0 },
        { drg: '03-I07-01', year: 2027, cases: 4, transfers: 0, cmJpl: 0, urgentCases: 2 },
        { drg: '99-X99-99', year: 2027, cases: 1, transfers: 0, cmJpl: 0, urgentCases: 0 },
      ],
      catalog,
      [],
    )
    expect(sum.byPart['2025'].A.cm).toBeCloseTo(10 * a[3], 6)
    expect(sum.byPart['2027'].A.cmTransfers).toBeCloseTo(2 * a[3], 6)
    expect(sum.byPart['2027'].E.cmKc).toBeCloseTo(2 * e[3] * 0.5 + 2 * e[3], 6)
    expect(sum.unknown).toEqual(['99-X99-99'])
    const s = applyCasemix(defaultScenario(), sum)
    expect(s.pu.cm2025A).toBeCloseTo(10 * a[3], 3)
    expect(s.pu.cm2027AD).toBeCloseTo(12 * a[3], 3)
    expect(s.pu.cases2027).toBe(12)
    expect(s.separated.rows).toHaveLength(1)
    expect(s.separated.rows[0].kc).toBeCloseTo(0.75, 4)
  })
})

describe('předběžné úhrady', () => {
  it('pravidla podle příloh a vyúčtování', () => {
    const s = defaultScenario()
    const all = computeAll(s)
    const adv = computeAdvances(s, all)
    const row = (id: string) => adv.rows.find((r) => r.id === id)!
    expect(row('specialists').monthly).toBeCloseTo((s.specialists.puro.uhrRef * 1.06) / 12, 6)
    expect(row('physio').monthly).toBeCloseTo((s.physio.puro.uhrRef * 1.07) / 12, 6)
    expect(row('odb913').monthly).toBeCloseTo((s.odb913.uhrRef * 1.05) / 12, 6)
    expect(row('acute').monthly).toBeCloseTo(all.bySegment.acute / 12, 6)
    expect(row('hospitalReg').monthly).toBe(0)
    expect(row('acute').settlement).toBeCloseTo(0, 6)
    expect(adv.settlement).toBeCloseTo(adv.expected - adv.advancesTotal, 6)
    expect(adv.rows.some((r) => r.id === 'under50')).toBe(false)
  })
  it('ruční úhrada 2025 a změna rozsahu', () => {
    const s = defaultScenario()
    s.advances.refUhr.specialists = 1_200_000
    s.advances.adjust.specialists = 120_000
    const adv = computeAdvances(s, computeAll(s))
    expect(adv.rows.find((r) => r.id === 'specialists')!.monthly).toBeCloseTo((1_200_000 * 1.06 + 120_000) / 12, 6)
  })
  it('rozsah poskytovatele a koeficient 0,95', () => {
    const s = defaultScenario()
    s.scope = scopeOf(['gp'])
    s.provider.lateShare = 0.2
    const all = computeAll(s)
    expect(all.gross).toBeCloseTo(all.gp.total, 6)
    expect(all.total).toBeCloseTo(all.gp.total * (1 - 0.2 * 0.05), 6)
    expect(computeAdvances(s, all).rows.map((r) => r.id)).toEqual(['gp'])
  })
})

describe('šablona a import dat', () => {
  it('parsuje česká čísla a ano/ne', () => {
    expect(parseNumber('1 234,5')).toBe(1234.5)
    expect(parseNumber('1.234,5')).toBe(1234.5)
    expect(parseNumber('12,5 %')).toBe(0.125)
    expect(parseNumber('7 000 Kč')).toBe(7000)
    expect(parseNumber('abc')).toBeNull()
    expect(parseBoolean('ano')).toBe(true)
    expect(parseBoolean('NE')).toBe(false)
  })

  it('šablona XLSX se načte zpět beze změny a přijme úpravy', async () => {
    const s = defaultScenario()
    const wb = await buildTemplate(s)
    const inputs = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['Vstupy'], { header: 1 })
    const idx = inputs.findIndex((r) => r[0] === 'pu.cm2025A')
    inputs[idx][2] = '9 500,5'
    const tier = inputs.findIndex((r) => r[0] === 'urgent.tier')
    inputs[tier][2] = 'II'
    const bool = inputs.findIndex((r) => r[0] === 'separated.mrsMet')
    inputs[bool][2] = 'ne'
    wb.Sheets['Vstupy'] = XLSX.utils.aoa_to_sheet(inputs)
    wb.Sheets['oneDay.rows'] = XLSX.utils.aoa_to_sheet([
      ['code', 'name', 'price', 'count'],
      ['Kód výkonu', 'Název', 'Úhrada (Kč)', 'Počet 2027'],
      ['10818', 'ICD', 327_226, 3],
    ])
    wb.Sheets['Případy CZ-DRG'] = XLSX.utils.aoa_to_sheet([
      ['DRG', 'Rok', 'Případy', 'Překlady'],
      ['00-M01-01', 2027, 5, 0],
    ])
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const report = await importWorkbook(buf, 'test.xlsx', s)
    expect(report.errors).toEqual([])
    expect(report.scenario.pu.cm2025A).toBe(9500.5)
    expect(report.scenario.urgent.tier).toBe('II')
    expect(report.scenario.separated.mrsMet).toBe(false)
    expect(report.scenario.oneDay.rows).toHaveLength(1)
    expect(report.scenario.oneDay.rows[0].count).toBe(3)
    expect(report.cases).toEqual([{ drg: '00-M01-01', year: 2027, cases: 5, transfers: 0, cmJpl: 0, urgentCases: 0 }])
    expect(report.scenario.pu.cm2025AtoD).toBe(s.pu.cm2025AtoD)
  })

  it('CSV se středníkem, chybné a neznámé klíče', async () => {
    const csv = 'Klíč;Popis;Hodnota\npu.cm2025A;;8 000\ngyn.pregnancies[1];;77\nfoo.bar;;1\npu.cases2025;;xx\noneDay.rows[4].count;;9\n'
    const report = await importWorkbook(new TextEncoder().encode(csv).buffer as ArrayBuffer, 'data.csv', defaultScenario())
    expect(report.scenario.pu.cm2025A).toBe(8000)
    expect(report.scenario.gyn.pregnancies[1]).toBe(77)
    expect(report.scenario.oneDay.rows[4].count).toBe(9)
    expect(report.warnings.some((w) => w.includes('foo.bar'))).toBe(true)
    expect(report.errors.some((e) => e.includes('pu.cases2025'))).toBe(true)
  })

  it('šablona pokrývá jen segmenty v rozsahu a všechny klíče mají popisek', () => {
    const s = defaultScenario()
    s.scope = scopeOf(['gp'])
    const fields = flattenScenario(s)
    expect(fields.some((f) => f.path.startsWith('pu.'))).toBe(false)
    expect(fields.some((f) => f.path.startsWith('gp.'))).toBe(true)
    const unlabeled = flattenScenario(defaultScenario(), { includeTables: true, allSegments: true }).filter((f) => f.label === f.path && !/\[\d+\]\./.test(f.path))
    expect(unlabeled.map((f) => f.path)).toEqual([])
  })

  it('normalizace doplní nové sekce do starších scénářů', () => {
    const old = defaultScenario() as unknown as Record<string, unknown>
    delete old.dental
    delete old.other
    delete old.scope
    delete old.advances
    const s = normalizeScenario(old)
    expect(s.dental.months).toBe(12)
    expect(s.scope.acute).toBe(true)
    expect(s.advances.refUhr.gp).toBe(0)
  })
})

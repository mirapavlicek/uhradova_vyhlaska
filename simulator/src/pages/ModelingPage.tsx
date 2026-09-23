import { useMemo, useRef, useState } from 'react'
import centresData from '../data/centres.json'
import { Callout, Card, FieldGrid, NumberField, SelectField } from '../components/fields'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtMio, fmtPct, signed } from '../lib/format'
import { downloadBlob, downloadResults, downloadTemplate, importWorkbook, type ImportReport } from '../lib/io'
import { computeAdvances } from '../model/advances'
import { computeAll } from '../model/all'
import { applyCasemix, buildCatalog, summarizeCases, type CasemixSummary, type DrgRecord } from '../model/casemix'
import { applyKpp, DISTRICTS, districtK, INSURERS, REGIONS, regionK } from '../model/kpp'
import type { Scenario } from '../model/scenario'
import { GROUP_TITLES, PROVIDER_PROFILES, scopeOf, SEGMENTS, type SegmentGroup } from '../model/segments'
import type { PageId } from '../routes'
import { useScenario } from '../state/ScenarioContext'

const CENTRE_CODES = [...new Set(centresData.map((c) => c.code))].sort((a, b) => a.localeCompare(b, 'cs'))
const PARTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
const PART_TARGET: Record<string, string> = {
  A: 'paušál (heterogenní)',
  B: 'případový paušál',
  C: 'vyčleněná úhrada',
  D: 'paušál (homogenní)',
  E: 'vyčleněná úhrada',
  F: 'případový paušál',
  G: 'případový paušál',
  H: 'psychiatrie (K_DZ)',
  I: 'individuální smlouva – mimo výpočet',
}

interface Pending {
  report: ImportReport
  fileName: string
  casemix: CasemixSummary | null
}

export function ModelingPage({ go }: { go: (p: PageId) => void }) {
  const { scenario, replace, update } = useScenario()
  const all = useMemo(() => computeAll(scenario), [scenario])
  const adv = useMemo(() => computeAdvances(scenario, all), [scenario, all])
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'warning'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const p = scenario.provider
  const setProvider = (partial: Partial<Scenario['provider']>) => update((s) => ({ ...s, provider: { ...s.provider, ...partial } }))
  const setAdvance = (kind: 'refUhr' | 'adjust', id: string, v: number) =>
    update((s) => ({ ...s, advances: { ...s.advances, [kind]: { ...s.advances[kind], [id]: v } } }))
  const kd = districtK(p.district, p.insurer)
  const kr = regionK(p.region, p.insurer)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setMessage(null)
    try {
      const report = await importWorkbook(await file.arrayBuffer(), file.name, scenario)
      let casemix: CasemixSummary | null = null
      if (report.cases.length) {
        const { default: drg } = await import('../data/drg.json')
        casemix = summarizeCases(report.cases, buildCatalog(drg as DrgRecord[]), report.scenario.provider.centres)
      }
      setPending({ report, fileName: file.name, casemix })
    } catch (e) {
      setMessage({ kind: 'warning', text: `Soubor se nepodařilo načíst: ${(e as Error).message}` })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const applyPending = () => {
    if (!pending) return
    let next = pending.report.scenario
    if (pending.casemix) next = applyCasemix(next, pending.casemix)
    const kpp = applyKpp(next)
    replace(kpp.scenario)
    setPending(null)
    setMessage({
      kind: 'success',
      text: `Načteno ${pending.report.applied} hodnot ze souboru ${pending.fileName}${pending.casemix ? `, casemix z ${pending.report.cases.length} řádků CZ-DRG` : ''}${kpp.applied.length ? `; ${kpp.applied.join('; ')}` : ''}.`,
    })
  }

  const downloadCasesSample = () => {
    const csv = ['drg;rok;pripady;preklady;cm_jpl;urgentni', '01-K10-03;2025;120;4;0;60', '01-K10-03;2027;128;5;0;64', '05-I14-03;2027;10;0;0;0', '08-I13-02;2025;210;6;0;0', '08-I13-02;2027;225;7;0;0'].join('\r\n')
    downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), 'pripady_cz-drg_vzor.csv')
  }

  const groups: SegmentGroup[] = ['hospital', 'primary', 'ambulatory', 'other']
  const change = adv.ref2025 > 0 ? adv.expected / adv.ref2025 - 1 : null

  return (
    <>
      <PageHeader
        title="Modelace předběžné úhrady"
        lead="Nahrajte údaje poskytovatele (referenční rok 2025 od pojišťovny a plán produkce 2027) a simulátor vypočte předpokládanou úhradu za rok 2027 a měsíční předběžnou úhradu podle pravidel jednotlivých příloh vyhlášky, včetně očekávaného vyúčtování."
      />

      <Card title="1. Poskytovatel a rozsah úhrad" subtitle="Rozsah určuje, které segmenty se promítnou do šablony, součtů i předběžné úhrady.">
        <FieldGrid columns={4}>
          <label className="field">
            <span className="field__label">Název poskytovatele</span>
            <input type="text" value={p.name} onChange={(e) => setProvider({ name: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">IČO</span>
            <input type="text" value={p.ico} onChange={(e) => setProvider({ ico: e.target.value })} />
          </label>
          <SelectField label="Zdravotní pojišťovna" value={p.insurer} onChange={(v) => setProvider({ insurer: v })} options={INSURERS.map((i) => ({ value: i, label: i }))} />
          <NumberField label="Podíl služeb vykázaných po 31. 3. 2028" value={p.lateShare} onChange={(v) => setProvider({ lateShare: v })} step={0.01} min={0} max={1} help="§ 2 odst. 4: úhrada za tyto služby × 0,95." />
          <SelectField label="Okres (příl. 9, bod 1)" value={p.district} onChange={(v) => setProvider({ district: v })} options={[{ value: '', label: '– nevybráno –' }, ...DISTRICTS.map((d) => ({ value: d, label: d }))]} help={kd !== null ? `K okres = ${kd}` : undefined} />
          <SelectField label="Region (příl. 9, bod 2)" value={p.region} onChange={(v) => setProvider({ region: v })} options={[{ value: '', label: '– nevybráno –' }, ...REGIONS.map((r) => ({ value: r, label: r }))]} help={kr !== null ? `K region = ${kr}` : undefined} />
          <SelectField
            label="Typ poskytovatele (předvolba rozsahu)"
            value=""
            onChange={(id) => {
              const prof = PROVIDER_PROFILES.find((x) => x.id === id)
              if (prof) update((s) => ({ ...s, scope: scopeOf(prof.segments) }))
            }}
            options={[{ value: '', label: '– vyberte předvolbu –' }, ...PROVIDER_PROFILES.map((x) => ({ value: x.id, label: x.label }))]}
          />
          <div className="field">
            <span className="field__label">Koeficienty K</span>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={kd === null && kr === null}
              onClick={() => {
                const r = applyKpp(scenario)
                replace(r.scenario)
                setMessage({ kind: 'success', text: `Doplněno z přílohy č. 9: ${r.applied.join('; ')}.` })
              }}
            >
              Doplnit K z přílohy č. 9
            </button>
          </div>
        </FieldGrid>
        <div className="scope-grid">
          {groups.map((g) => (
            <fieldset key={g} className="scope-group">
              <legend>{GROUP_TITLES[g]}</legend>
              {SEGMENTS.filter((m) => m.group === g).map((m) => (
                <label key={m.id} className="check">
                  <input type="checkbox" checked={scenario.scope[m.id]} onChange={(e) => update((s) => ({ ...s, scope: { ...s.scope, [m.id]: e.target.checked } }))} />
                  <span>
                    {m.label} <span className="muted small">({m.annex})</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        {(scenario.scope.acute || scenario.scope.under50) && (
          <details className="details">
            <summary>Statusy center vysoce specializované péče ({p.centres.length}) – koeficient centralizace KC pro import CZ-DRG</summary>
            <div className="chips">
              {CENTRE_CODES.map((c) => (
                <label key={c} className={`chip ${p.centres.includes(c) ? 'chip--on' : ''}`}>
                  <input type="checkbox" checked={p.centres.includes(c)} onChange={(e) => setProvider({ centres: e.target.checked ? [...p.centres, c] : p.centres.filter((x) => x !== c) })} />
                  {c}
                </label>
              ))}
            </div>
          </details>
        )}
      </Card>

      <Card title="2. Data poskytovatele" subtitle="Stáhněte šablonu předvyplněnou aktuálními hodnotami, doplňte údaje a nahrajte ji zpět. Nevyplněné hodnoty zůstanou beze změny.">
        <div className="toolbar">
          <button type="button" className="btn btn--primary" onClick={() => downloadTemplate(scenario, 'xlsx')}>
            Stáhnout šablonu XLSX
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => downloadTemplate(scenario, 'csv')}>
            Šablona CSV
          </button>
          {(scenario.scope.acute || scenario.scope.under50) && (
            <button type="button" className="btn btn--secondary" onClick={downloadCasesSample}>
              Vzor případů CZ-DRG (CSV)
            </button>
          )}
        </div>
        <label
          className={`dropzone ${busy ? 'dropzone--busy' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            onFile(e.dataTransfer.files?.[0])
          }}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.ods,.csv,.txt" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <strong>{busy ? 'Načítám…' : 'Přetáhněte vyplněný soubor sem nebo klikněte pro výběr'}</strong>
          <span className="muted small">XLSX, XLS, ODS nebo CSV · šablona simulátoru nebo samostatný seznam případů CZ-DRG (drg; rok; pripady; preklady)</span>
        </label>
        {message && <Callout kind={message.kind}>{message.text}</Callout>}

        {pending && (
          <div className="import-preview">
            <h3>Kontrola importu – {pending.fileName}</h3>
            <ul className="notes">
              <li>
                Hodnot k načtení: <strong>{pending.report.applied}</strong>
                {pending.report.tables.length > 0 && <> · tabulky: {pending.report.tables.join(', ')}</>}
              </li>
              {pending.report.cases.length > 0 && <li>Řádků případů CZ-DRG: {pending.report.cases.length}</li>}
            </ul>
            {pending.casemix && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Část příl. 10</th>
                      <th>Úhradový mechanismus</th>
                      <th>Případy 2025</th>
                      <th>CM 2025</th>
                      <th>Případy 2027</th>
                      <th>CM 2027</th>
                      <th>z toho překlady (CM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PARTS.filter((x) => pending.casemix!.byPart['2025'][x].cases || pending.casemix!.byPart['2027'][x].cases).map((x) => {
                      const a = pending.casemix!.byPart['2025'][x]
                      const b = pending.casemix!.byPart['2027'][x]
                      return (
                        <tr key={x}>
                          <td>{x}</td>
                          <td>{PART_TARGET[x]}</td>
                          <td className="num">{a.cases}</td>
                          <td className="num">{a.cm.toFixed(3)}</td>
                          <td className="num">{b.cases}</td>
                          <td className="num">{b.cm.toFixed(3)}</td>
                          <td className="num">{b.cmTransfers.toFixed(3)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {pending.casemix && pending.casemix.unknown.length > 0 && (
              <Callout kind="warning">
                Skupiny CZ-DRG, které nejsou v příloze č. 10 (přeskočeno): {pending.casemix.unknown.slice(0, 20).join(', ')}
                {pending.casemix.unknown.length > 20 ? ` a dalších ${pending.casemix.unknown.length - 20}` : ''}.
              </Callout>
            )}
            {pending.report.errors.length > 0 && (
              <Callout kind="warning">
                <strong>Chybné hodnoty ({pending.report.errors.length}) – nebudou načteny:</strong>
                <ul className="notes">
                  {pending.report.errors.slice(0, 15).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Callout>
            )}
            {pending.report.warnings.length > 0 && (
              <Callout kind="info">
                <ul className="notes">
                  {pending.report.warnings.slice(0, 15).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </Callout>
            )}
            <div className="toolbar">
              <button type="button" className="btn btn--primary" onClick={applyPending}>
                Použít data ve scénáři
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setPending(null)}>
                Zrušit
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card
        title="3. Předběžná úhrada 2027"
        subtitle="Orientační výpočet podle návrhu vyhlášky. Úhradu 2025 lze u každého segmentu přepsat (0 = odvodit ze vstupů) a doplnit sjednané změny rozsahu."
        actions={
          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={() => downloadResults(scenario, all, adv)}>
              Export XLSX
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => window.print()}>
              Tisk / PDF
            </button>
          </div>
        }
      >
        <Summary
          items={[
            { label: 'Předpokládaná úhrada 2027', value: fmtCzk(adv.expected), tone: 'result', hint: all.lateFactor < 1 ? `vč. koeficientu 0,95 (faktor ${all.lateFactor.toFixed(4)})` : undefined },
            { label: 'Měsíční předběžná úhrada', value: fmtCzk(adv.monthly), hint: `${fmtMio(adv.advancesTotal)} za rok` },
            {
              label: adv.settlement >= 0 ? 'Očekávaný doplatek při vyúčtování' : 'Očekávaný přeplatek při vyúčtování',
              value: fmtCzk(Math.abs(adv.settlement)),
              tone: adv.settlement < 0 ? 'warning' : 'neutral',
              hint: 'do 150–180 dnů po skončení roku',
            },
            { label: 'Úhrada 2025', value: adv.ref2025 ? fmtCzk(adv.ref2025) : '–', hint: change === null ? 'doplňte v tabulce' : `změna ${signed(change, fmtPct)}` },
          ]}
        />
        <div className="table-wrap">
          <table className="table table--editable advances-table">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Úhrada 2025</th>
                <th>Předpokládaná úhrada 2027</th>
                <th>Pravidlo předběžné úhrady</th>
                <th>Změna rozsahu (Kč/rok)</th>
                <th>Měsíční předběžná úhrada</th>
                <th>Vyúčtování</th>
              </tr>
            </thead>
            <tbody>
              {adv.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button type="button" className="link" onClick={() => go(SEGMENTS.find((m) => m.id === r.id)!.page)}>
                      {r.label}
                    </button>
                    <div className="muted small">{r.annex}</div>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={10_000}
                      value={scenario.advances.refUhr[r.id] || ''}
                      placeholder={r.ref2025 !== null ? String(Math.round(r.ref2025)) : 'neuvedeno'}
                      onChange={(e) => setAdvance('refUhr', r.id, parseFloat(e.target.value) || 0)}
                      aria-label={`Úhrada 2025 – ${r.label}`}
                    />
                  </td>
                  <td className="num">
                    {fmtCzk(r.expected)}
                    {r.ref2025 ? <div className="muted small">{signed(r.expected / r.ref2025 - 1, fmtPct)}</div> : null}
                  </td>
                  <td>
                    {r.ruleText}
                    {r.assumption && <span title="Vyhláška pro tento segment pravidlo výslovně neuvádí – předpoklad modelu."> *</span>}
                    {r.note && <div className="muted small">{r.note}</div>}
                  </td>
                  <td>
                    {r.rule === 'none' ? (
                      '–'
                    ) : (
                      <input type="number" step={10_000} value={scenario.advances.adjust[r.id] || ''} placeholder="0" onChange={(e) => setAdvance('adjust', r.id, parseFloat(e.target.value) || 0)} aria-label={`Změna rozsahu – ${r.label}`} />
                    )}
                  </td>
                  <td className="num">{r.rule === 'none' ? '–' : fmtCzk(r.monthly)}</td>
                  <td className={`num ${r.settlement < 0 ? 'text-warning' : ''}`}>
                    {signed(r.settlement, fmtCzk)}
                    <div className="muted small">do {r.settlementDays} dnů</div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Celkem</td>
                <td className="num">{adv.ref2025 ? fmtCzk(adv.ref2025) : '–'}</td>
                <td className="num">{fmtCzk(adv.expected)}</td>
                <td />
                <td />
                <td className="num">{fmtCzk(adv.monthly)}</td>
                <td className="num">{signed(adv.settlement, fmtCzk)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {scenario.scope.labs && scenario.advances.refRdg === 0 && (
          <FieldGrid columns={3}>
            <NumberField label="Úhrada radiodiagnostiky 2025 (příl. 5 bod 3)" value={scenario.advances.refRdg} onChange={(v) => update((s) => ({ ...s, advances: { ...s.advances, refRdg: v } }))} unit="Kč" step={100_000} help="Základ předběžné úhrady 104 %; 0 = odhad z bodů." />
          </FieldGrid>
        )}
        <p className="muted small">
          * Vyhláška pro segment výslovné pravidlo předběžné úhrady neuvádí; model použije hodnotu vykázaných služeb, resp. 1/12 předpokládané úhrady. Vyúčtování = předpokládaná úhrada (po maximech a regulacích) − součet předběžných úhrad.
        </p>
      </Card>
    </>
  )
}

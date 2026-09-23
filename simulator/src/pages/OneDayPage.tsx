import { useMemo, useState } from 'react'
import oneDayCatalog from '../data/oneDay.json'
import { Callout, Card, FieldGrid, NumberField } from '../components/fields'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk } from '../lib/format'
import { computeOneDay, type OneDayRow } from '../model/oneDay'
import { useScenario } from '../state/ScenarioContext'

export function OneDayPage() {
  const { scenario, patch } = useScenario()
  const { oneDay } = scenario
  const result = useMemo(() => computeOneDay(oneDay), [oneDay])
  const set = (partial: Partial<typeof oneDay>) => patch('oneDay', partial)
  const rows = oneDay.rows
  const setRow = (i: number, partial: Partial<OneDayRow>) => set({ rows: rows.map((r, j) => (j === i ? { ...r, ...partial } : r)) })
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return oneDayCatalog.filter((c) => c.code.includes(q) || c.drg.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 12)
  }, [query])

  return (
    <>
      <PageHeader
        title="Jednodenní péče"
        lead="Příloha č. 13. Úhrada_JP,2027 = Σ Úhrada_JP,i · Počet_výkonů_JP,i − EM_JP. Pevná cena výkonu zahrnuje všechny související výkony, ZUM i ZULP; vyžádaná extramurální péče se odečítá."
      />
      <Summary
        items={[
          { label: 'Úhrada_JP,2027', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Σ výkony', value: fmtCzk(result.gross) },
          { label: 'EM_JP', value: fmtCzk(oneDay.em) },
        ]}
      />
      <Card
        title="Výkony jednodenní péče"
        subtitle={`Ceník ${oneDayCatalog.length} výkonů převzatý z přílohy č. 13, bod 5 – vyhledejte a přidejte výkon.`}
        actions={
          <button type="button" className="btn btn--secondary" onClick={() => set({ rows: [...rows, { id: `j${Date.now()}`, code: '', name: '', price: 0, count: 0 }] })}>
            Přidat výkon
          </button>
        }
      >
        <div className="toolbar">
          <label className="field field--inline">
            <span className="field__label">Hledat v příloze č. 13</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="kód výkonu, CZ-DRG nebo název" />
          </label>
        </div>
        {matches.length > 0 && (
          <ul className="picker">
            {matches.map((c) => (
              <li key={c.code + c.drg}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    set({ rows: [...rows, { id: `j${Date.now()}`, code: c.code, name: c.name, price: c.price, count: 0 }] })
                    setQuery('')
                  }}
                >
                  <strong>{c.code}</strong> {c.name} <span className="muted">({c.drg})</span> – {fmtCzk(c.price)}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="table-wrap">
          <table className="table table--editable">
            <thead>
              <tr>
                <th>Kód</th>
                <th>Název</th>
                <th>Úhrada za výkon (Kč)</th>
                <th>Počet</th>
                <th>Celkem</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <input type="text" value={r.code} onChange={(e) => setRow(i, { code: e.target.value })} style={{ width: 90 }} />
                  </td>
                  <td>
                    <input type="text" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" min={0} value={r.price} onChange={(e) => setRow(i, { price: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <input type="number" min={0} value={r.count} onChange={(e) => setRow(i, { count: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td className="num">{fmtCzk(r.price * r.count)}</td>
                  <td>
                    <button type="button" className="btn btn--ghost" onClick={() => set({ rows: rows.filter((_, j) => j !== i) })} aria-label="Odebrat">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FieldGrid columns={3}>
          <NumberField label="EM_JP – vyžádaná extramurální péče" value={oneDay.em} onChange={(v) => set({ em: v })} unit="Kč" step={10_000} />
        </FieldGrid>
        <Callout kind="info">Úhrada náleží jen za výkony na operačním sále u pojištěnců s doplňkovým kódem U54.1 nebo U54.2; skupiny přílohy č. 14 části A mají jednodenní úhradu stanovenou relativní vahou v rámci CZ-DRG.</Callout>
      </Card>
      <StepsTable steps={result.steps} />
    </>
  )
}

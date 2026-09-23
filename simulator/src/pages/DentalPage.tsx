import { useMemo, useState } from 'react'
import { Callout, Card, FieldGrid, NumberField, ToggleField } from '../components/fields'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk } from '../lib/format'
import { computeDental, DENTAL_CATALOG, type DentalRow } from '../model/dental'
import { useScenario } from '../state/ScenarioContext'

export function DentalPage() {
  const { scenario, patch } = useScenario()
  const { dental, params } = scenario
  const result = useMemo(() => computeDental(dental, params), [dental, params])
  const set = (partial: Partial<typeof dental>) => patch('dental', partial)
  const setRow = (i: number, partial: Partial<DentalRow>) => set({ rows: dental.rows.map((r, j) => (j === i ? { ...r, ...partial } : r)) })
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return DENTAL_CATALOG.filter((c) => c.code.includes(q) || c.name.toLowerCase().includes(q)).slice(0, 12)
  }, [query])

  const byCode = useMemo(() => new Map(DENTAL_CATALOG.map((c) => [c.code, c])), [])

  return (
    <>
      <PageHeader
        title="Zubní lékařství"
        lead="Příloha č. 11. Agregovaná úhrada 24 Kč (s dokladem celoživotního vzdělávání registrujícího lékaře) nebo 22 Kč za registrovaného pojištěnce měsíčně, navýšená o 3 / 2 / 1 Kč za pojištěnce do 6 / 12 / 18 let. Výkony, protetické a ortodontické výrobky se hradí pevnou částkou podle přílohy – ceník je převzat přímo z návrhu (196 položek)."
      />
      <Summary
        items={[
          { label: 'Úhrada celkem', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Agregovaná úhrada', value: fmtCzk(result.capitation), hint: `${result.capRate} Kč / pojištěnec / měsíc + věkové příplatky` },
          { label: 'Výkony a výrobky', value: fmtCzk(result.services) },
          { label: 'Kódy mimo ceník', value: String(result.unknownCodes.length), tone: result.unknownCodes.length ? 'warning' : 'neutral' },
        ]}
      />

      <Card title="Agregovaná úhrada za registrované pojištěnce">
        <FieldGrid columns={3}>
          <ToggleField label="Registrující lékař má doklad celoživotního vzdělávání (24 Kč místo 22 Kč)" checked={dental.educated} onChange={(v) => set({ educated: v })} />
          <NumberField label="Počet měsíců" value={dental.months} onChange={(v) => set({ months: v })} min={0} max={12} />
        </FieldGrid>
        <FieldGrid columns={4}>
          <NumberField label="Registrovaní do 6 let (+3 Kč)" value={dental.registered.under6} onChange={(v) => set({ registered: { ...dental.registered, under6: v } })} help="Průměrný měsíční počet." />
          <NumberField label="6 až 12 let (+2 Kč)" value={dental.registered.from6to12} onChange={(v) => set({ registered: { ...dental.registered, from6to12: v } })} />
          <NumberField label="12 až 18 let (+1 Kč)" value={dental.registered.from12to18} onChange={(v) => set({ registered: { ...dental.registered, from12to18: v } })} />
          <NumberField label="Od 18 let" value={dental.registered.adults} onChange={(v) => set({ registered: { ...dental.registered, adults: v } })} />
        </FieldGrid>
      </Card>

      <Card title="Výkony a výrobky podle přílohy č. 11" subtitle="Vyhledejte kód nebo název a přidejte položku; cena se doplní z přílohy. Ruční cenu použijte u částečných úhrad (např. 00835, 00842).">
        <div className="toolbar">
          <label className="field field--inline">
            <span className="field__label">Hledat v ceníku</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="např. 00908 nebo výplň" />
          </label>
        </div>
        {matches.length > 0 && (
          <ul className="picker">
            {matches.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    set({ rows: [...dental.rows, { id: `z${Date.now()}`, code: c.code, count: 0, priceOverride: 0 }] })
                    setQuery('')
                  }}
                >
                  <strong>{c.code}</strong> {c.name} – {fmtCzk(c.price)}
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
                <th>Úhrada podle přílohy</th>
                <th>Ruční cena</th>
                <th>Počet</th>
                <th>Celkem</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dental.rows.map((r, i) => {
                const item = byCode.get(r.code.trim())
                const price = r.priceOverride > 0 ? r.priceOverride : (item?.price ?? 0)
                return (
                  <tr key={r.id}>
                    <td>
                      <input type="text" value={r.code} onChange={(e) => setRow(i, { code: e.target.value })} aria-label="Kód" />
                    </td>
                    <td>{item?.name ?? <span className="text-warning">není v příloze č. 11</span>}</td>
                    <td className="num">{item ? fmtCzk(item.price) : '–'}</td>
                    <td>
                      <input type="number" min={0} value={r.priceOverride} onChange={(e) => setRow(i, { priceOverride: parseFloat(e.target.value) || 0 })} aria-label="Ruční cena" />
                    </td>
                    <td>
                      <input type="number" min={0} value={r.count} onChange={(e) => setRow(i, { count: parseFloat(e.target.value) || 0 })} aria-label="Počet" />
                    </td>
                    <td className="num">{fmtCzk(price * r.count)}</td>
                    <td>
                      <button type="button" className="btn btn--ghost" onClick={() => set({ rows: dental.rows.filter((_, j) => j !== i) })} aria-label="Odebrat">
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {result.unknownCodes.length > 0 && <Callout kind="warning">Kódy {result.unknownCodes.join(', ')} nejsou v příloze č. 11 – doplňte ruční cenu.</Callout>}
        <Callout kind="info">Regulační omezení přílohy č. 11 jsou frekvenční (počty výkonů na pojištěnce a období) – simulátor je nekontroluje, počítá s uznanými výkony.</Callout>
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

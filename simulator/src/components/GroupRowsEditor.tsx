import type { CaseGroupRow } from '../model/acute'

interface Props {
  rows: CaseGroupRow[]
  onChange: (rows: CaseGroupRow[]) => void
  idPrefix: string
}

/** Editor skupin případů: casemix CZ-DRG, ocenění JPL, koeficient centralizace. */
export function GroupRowsEditor({ rows, onChange, idPrefix }: Props) {
  const set = (i: number, partial: Partial<CaseGroupRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...partial } : r)))
  const num = (v: string) => {
    const n = parseFloat(v)
    return Number.isNaN(n) ? 0 : n
  }
  return (
    <div className="table-wrap">
      <table className="table table--editable">
        <thead>
          <tr>
            <th>Skupina (DRG báze / diagnóza)</th>
            <th>CM podle CZ-DRG</th>
            <th>Ocenění JPL (v CM)</th>
            <th>KC</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td>
                <input type="text" value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="název skupiny" />
              </td>
              <td>
                <input type="number" step="any" min={0} value={r.cmDrg} onChange={(e) => set(i, { cmDrg: num(e.target.value) })} />
              </td>
              <td>
                <input type="number" step="any" min={0} value={r.cmJpl} onChange={(e) => set(i, { cmJpl: num(e.target.value) })} />
              </td>
              <td>
                <input type="number" step="0.01" min={0} value={r.kc} onChange={(e) => set(i, { kc: num(e.target.value) })} />
              </td>
              <td>
                <button type="button" className="btn btn--ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Odebrat">
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => onChange([...rows, { id: `${idPrefix}${Date.now()}`, name: '', cmDrg: 0, cmJpl: 0, kc: 1 }])}
      >
        Přidat skupinu
      </button>
    </div>
  )
}

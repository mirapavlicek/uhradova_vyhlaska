import { useMemo, useRef, useState } from 'react'
import { Callout, Card } from '../components/fields'
import { PageHeader } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtPct, signed } from '../lib/format'
import { useScenario } from '../state/ScenarioContext'
import { computeAll } from '../model/all'

export function ScenariosPage() {
  const { scenario, update, saved, saveAs, load, remove, exportJson, importJson, reset } = useScenario()
  const [name, setName] = useState(scenario.name)
  const [compareId, setCompareId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const current = useMemo(() => computeAll(scenario), [scenario])
  const compareTo = saved.find((s) => s.id === compareId)
  const other = useMemo(() => (compareTo ? computeAll(compareTo.scenario) : null), [compareTo])

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${scenario.name.replace(/[^\w\dá-žÁ-Ž-]+/g, '_') || 'scenar'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      importJson(await file.text())
      setError(null)
    } catch (e) {
      setError(`Soubor se nepodařilo načíst: ${(e as Error).message}`)
    }
  }

  const rows: { label: string; a: number; b?: number; fmt: (v: number) => string; pctDiff?: boolean }[] = [
    { label: 'Celkem', a: current.total, b: other?.total, fmt: fmtCzk, pctDiff: true },
    { label: 'Paušální úhrada', a: current.pu.uhr, b: other?.pu.uhr, fmt: fmtCzk, pctDiff: true },
    { label: '  IPU', a: current.pu.ipu, b: other?.pu.ipu, fmt: fmtCzk, pctDiff: true },
    { label: '  r (změna produkce)', a: current.pu.ratio, b: other?.pu.ratio, fmt: fmtIndex },
    { label: '  I_ZP', a: current.pu.izp, b: other?.pu.izp, fmt: fmtIndex },
    { label: 'Vyčleněná úhrada', a: current.sep.uhr, b: other?.sep.uhr, fmt: fmtCzk, pctDiff: true },
    { label: 'Případový paušál', a: current.pp.uhr, b: other?.pp.uhr, fmt: fmtCzk, pctDiff: true },
    { label: '  K_DZ', a: current.pp.kdz, b: other?.pp.kdz, fmt: fmtIndex },
    { label: 'Ambulantní složka', a: current.amb.total, b: other?.amb.total, fmt: fmtCzk, pctDiff: true },
    { label: '  I_zp_amb', a: current.amb.radost.izpAmb, b: other?.amb.radost.izpAmb, fmt: fmtIndex },
    { label: 'Centrové léky', a: current.cl.uhr, b: other?.cl.uhr, fmt: fmtCzk, pctDiff: true },
    { label: '  IZP_CL', a: current.cl.izpCl, b: other?.cl.izpCl, fmt: fmtIndex },
  ]

  return (
    <>
      <PageHeader title="Scénáře a porovnání" lead="Uložte aktuální zadání pod názvem, vraťte se k němu později nebo porovnejte dva scénáře vedle sebe. Data zůstávají v prohlížeči." />

      <Card title="Aktuální scénář">
        <div className="toolbar">
          <label className="field field--inline">
            <span className="field__label">Název</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                update((s) => ({ ...s, name: e.target.value }))
              }}
            />
          </label>
          <button type="button" className="btn btn--primary" onClick={() => saveAs(name || 'Bez názvu')}>
            Uložit jako scénář
          </button>
          <button type="button" className="btn btn--secondary" onClick={download}>
            Exportovat JSON
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
            Importovat JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              if (confirm('Obnovit výchozí modelový scénář? Neuložené změny budou ztraceny.')) {
                reset()
                setName('Modelová nemocnice – výchozí scénář')
              }
            }}
          >
            Obnovit výchozí
          </button>
        </div>
        {error && <Callout kind="warning">{error}</Callout>}
      </Card>

      <Card title="Uložené scénáře">
        {saved.length === 0 ? (
          <p className="muted">Zatím žádné uložené scénáře.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Název</th>
                  <th>Uloženo</th>
                  <th>Celkem</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {saved.map((s) => (
                  <tr key={s.id}>
                    <td>{s.scenario.name}</td>
                    <td>{new Date(s.savedAt).toLocaleString('cs-CZ')}</td>
                    <td className="num">{fmtMio(computeAll(s.scenario).total)}</td>
                    <td className="actions">
                      <button type="button" className="btn btn--secondary" onClick={() => { load(s.id); setName(s.scenario.name) }}>
                        Načíst
                      </button>
                      <button type="button" className="btn btn--secondary" onClick={() => setCompareId(s.id)}>
                        Porovnat
                      </button>
                      <button type="button" className="btn btn--ghost" onClick={() => remove(s.id)}>
                        Smazat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Porovnání" subtitle={compareTo ? `Aktuální scénář „${scenario.name}“ vs. uložený „${compareTo.scenario.name}“` : 'Vyberte uložený scénář tlačítkem Porovnat.'}>
        {other && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ukazatel</th>
                  <th>Aktuální</th>
                  <th>{compareTo?.scenario.name}</th>
                  <th>Rozdíl (aktuální − uložený)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const diff = r.b === undefined ? 0 : r.a - r.b
                  return (
                    <tr key={r.label} className={r.label.startsWith('  ') ? 'row--sub' : undefined}>
                      <td>{r.label.trim()}</td>
                      <td className="num">{r.fmt(r.a)}</td>
                      <td className="num">{r.b === undefined ? '–' : r.fmt(r.b)}</td>
                      <td className={`num ${diff > 0 ? 'text-success' : diff < 0 ? 'text-warning' : ''}`}>
                        {signed(diff, r.fmt)}
                        {r.pctDiff && r.b ? ` (${signed(diff / r.b, fmtPct)})` : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

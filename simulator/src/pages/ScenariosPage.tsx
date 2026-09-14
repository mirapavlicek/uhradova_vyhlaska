import { useMemo, useRef, useState } from 'react'
import { Callout, Card } from '../components/fields'
import { PageHeader } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtPct, signed } from '../lib/format'
import { useScenario } from '../state/ScenarioContext'
import { computeAll, type AllResults } from '../model/all'

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

  type Row = { label: string; a: number; b?: number; fmt: (v: number) => string; pctDiff?: boolean; heading?: boolean }
  const money = (label: string, pick: (r: AllResults) => number): Row => ({ label, a: pick(current), b: other ? pick(other) : undefined, fmt: fmtCzk, pctDiff: true })
  const index = (label: string, pick: (r: AllResults) => number): Row => ({ label: `  ${label}`, a: pick(current), b: other ? pick(other) : undefined, fmt: fmtIndex })
  const heading = (label: string, pick: (r: AllResults) => number): Row => ({ ...money(label, pick), heading: true })

  const rows: Row[] = [
    heading('Celkem', (r) => r.total),
    heading('Nemocnice celkem', (r) => r.hospital),
    money('Paušální úhrada', (r) => r.pu.uhr),
    { ...money('IPU', (r) => r.pu.ipu), label: '  IPU' },
    index('r (změna produkce)', (r) => r.pu.ratio),
    index('I_ZP', (r) => r.pu.izp),
    money('Vyčleněná úhrada', (r) => r.sep.uhr),
    money('Případový paušál', (r) => r.pp.uhr),
    index('K_DZ', (r) => r.pp.kdz),
    money('Urgentní příjem, LPS, ERN a paušály', (r) => r.urgent.total),
    money('Následná lůžková péče', (r) => r.aftercare.total),
    index('BON_Geri', (r) => r.aftercare.bonGeri),
    money('Jednodenní péče', (r) => r.oneDay.total),
    money('Ambulantní složka', (r) => r.amb.total),
    index('I_zp_amb', (r) => r.amb.radost.izpAmb),
    money('Centrové léky', (r) => r.cl.uhr),
    index('IZP_CL', (r) => r.cl.izpCl),
    money('Regulace nemocnic (srážka)', (r) => -r.hospitalReg.total),
    heading('Primární péče celkem', (r) => r.primary),
    money('Praktičtí lékaři', (r) => r.gp.total),
    { ...money('Kapitace', (r) => r.gp.capitation), label: '  Kapitace' },
    money('Gynekologie', (r) => r.gyn.total),
    heading('Ambulantní segmenty celkem', (r) => r.ambulatory),
    money('Ambulantní specialisté', (r) => r.specialists.total),
    index('HB specialisté', (r) => r.specialists.hb),
    money('Fyzioterapie (902)', (r) => r.physio.total),
    money('Domácí péče (925/916)', (r) => r.homecare.total),
    money('Mobilní paliativní péče (926)', (r) => r.palliative.total),
    money('Odbornost 913', (r) => r.odb913.total),
    money('Laboratoře a radiodiagnostika', (r) => r.labs.total),
    money('Dialýza', (r) => r.dialysis.total),
    index('HB dialýza', (r) => r.dialysis.hb),
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
                    <tr key={r.label} className={r.label.startsWith('  ') ? 'row--sub' : r.heading ? 'row--heading' : undefined}>
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

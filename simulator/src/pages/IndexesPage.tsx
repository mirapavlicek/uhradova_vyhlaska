import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField } from '../components/fields'
import { SensitivityChart } from '../components/SensitivityChart'
import { range } from '../model/all'
import { PageHeader } from '../components/Summary'
import { fmtNum } from '../lib/format'
import { arctg, capPoint, detachmentPoint, indexIzp, indexIzpAmb, indexIzpCl, slope } from '../model/indexes'
import { useScenario } from '../state/ScenarioContext'

export function IndexesPage() {
  const { scenario, update } = useScenario()
  const p = scenario.params

  const data = useMemo(
    () =>
      range(0.8, 1.6, 160).map((r) => ({
        r,
        izp: indexIzp(r, p),
        amb: indexIzpAmb(r, 1, p),
        cl: indexIzpCl(r, p),
        rawIzp: arctg(p.izp.a * r - p.izp.b),
      })),
    [p],
  )

  const rows = [
    { name: 'I_ZP (akutní lůžková péče)', a: p.izp.a, b: p.izp.b, cap: undefined as number | undefined },
    { name: 'I_zp_amb (ambulance nemocnic, IZ_GAUP = 1)', a: p.izpAmb.a, b: p.izpAmb.b, cap: undefined },
    { name: 'IZP_CL (centrové léky)', a: p.izpCl.a, b: p.izpCl.b, cap: p.izpCl.cap },
  ]

  const setIzp = (k: 'a' | 'b', v: number) => update((s) => ({ ...s, params: { ...s.params, izp: { ...s.params.izp, [k]: v } } }))
  const setAmb = (k: 'a' | 'b', v: number) => update((s) => ({ ...s, params: { ...s.params, izpAmb: { ...s.params.izpAmb, [k]: v } } }))
  const setCl = (k: 'a' | 'b' | 'cap', v: number) => update((s) => ({ ...s, params: { ...s.params, izpCl: { ...s.params.izpCl, [k]: v } } }))

  return (
    <>
      <PageHeader
        title="Indexy změny produkce (ARCTG)"
        lead="Všechny tři degresivní indexy mají tvar max[1; ARCTG(a·r − b)]. Konstanta b určuje, kde se index odlepí od 1 (b = a − tan 1 ≈ a − 1,557 dává spojité napojení); a určuje sklon. Změny se okamžitě promítají do všech modulů."
      />
      <Card title="Průběh indexů">
        <SensitivityChart
          data={data}
          xKey="r"
          xLabel="r (hodnocené / referenční období)"
          series={[
            { key: 'izp', name: 'I_ZP' },
            { key: 'amb', name: 'I_zp_amb' },
            { key: 'cl', name: 'IZP_CL' },
            { key: 'rawIzp', name: 'ARCTG(3r − 1,443) bez max', dashed: true },
          ]}
          yFormatter={(v) => v.toFixed(3)}
          height={360}
          yDomain={[0.9, 'auto']}
        />
      </Card>

      <Card title="Vlastnosti">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Index</th>
                <th>a</th>
                <th>b</th>
                <th>ARCTG v r = 1</th>
                <th>Odlepení od 1 při r</th>
                <th>Sklon v r = 1</th>
                <th>Strop</th>
                <th>r pro strop</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const at1 = arctg(row.a - row.b)
                const det = detachmentPoint(row.a, row.b)
                return (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td className="num">{fmtNum(row.a, 4)}</td>
                    <td className="num">{fmtNum(row.b, 4)}</td>
                    <td className={`num ${Math.abs(at1 - 1) > 0.002 ? 'text-warning' : ''}`}>{fmtNum(at1, 4)}</td>
                    <td className={`num ${Math.abs(det - 1) > 0.002 ? 'text-warning' : ''}`}>{fmtNum(det, 4)}</td>
                    <td className="num">{fmtNum(slope(row.a, row.b, Math.max(1, det)), 4)}</td>
                    <td className="num">{row.cap ? fmtNum(row.cap, 4) : 'π/2 ≈ 1,5708'}</td>
                    <td className="num">{row.cap ? fmtNum(capPoint(row.a, row.b, row.cap), 4) : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Callout kind="warning">
          I_zp_amb s konstantou 1,069 dává v r = 1 hodnotu 0,992 – index se odlepí od 1 až při r ≈ 1,0102, takže první procento růstu není hrazeno. Pro spojitost by
          konstanta musela být 2,6 − tan 1 ≈ 1,0426. Ostatní dva indexy jsou v r = 1 spojité.
        </Callout>
      </Card>

      <Card title="Modelace konstant" subtitle="Změny se ukládají do parametrů aktuálního scénáře.">
        <div className="grid-3">
          <div>
            <h3 className="subheading">I_ZP</h3>
            <FieldGrid columns={2}>
              <NumberField label="a" value={p.izp.a} onChange={(v) => setIzp('a', v)} step={0.05} />
              <NumberField label="b" value={p.izp.b} onChange={(v) => setIzp('b', v)} step={0.001} />
            </FieldGrid>
          </div>
          <div>
            <h3 className="subheading">I_zp_amb</h3>
            <FieldGrid columns={2}>
              <NumberField label="a" value={p.izpAmb.a} onChange={(v) => setAmb('a', v)} step={0.05} />
              <NumberField label="b" value={p.izpAmb.b} onChange={(v) => setAmb('b', v)} step={0.001} />
            </FieldGrid>
          </div>
          <div>
            <h3 className="subheading">IZP_CL</h3>
            <FieldGrid columns={3}>
              <NumberField label="a" value={p.izpCl.a} onChange={(v) => setCl('a', v)} step={0.05} />
              <NumberField label="b" value={p.izpCl.b} onChange={(v) => setCl('b', v)} step={0.001} />
              <NumberField label="strop" value={p.izpCl.cap} onChange={(v) => setCl('cap', v)} step={0.005} />
            </FieldGrid>
          </div>
        </div>
      </Card>
    </>
  )
}

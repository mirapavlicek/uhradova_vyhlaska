import { useMemo } from 'react'
import { Callout, Card } from '../components/fields'
import { SensitivityChart } from '../components/SensitivityChart'
import { range } from '../model/all'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtNum, fmtPct } from '../lib/format'
import { computeCentreDrugs } from '../model/centreDrugs'
import { useScenario } from '../state/ScenarioContext'

export function CentreDrugsPage() {
  const { scenario, patch } = useScenario()
  const { cl, params } = scenario
  const result = useMemo(() => computeCentreDrugs(cl, params), [cl, params])

  const setRow = (groupId: string, partial: { prod2025?: number; prod2027?: number }) =>
    patch('cl', { rows: cl.rows.map((r) => (r.groupId === groupId ? { ...r, ...partial } : r)) })
  const num = (v: string) => {
    const n = parseFloat(v)
    return Number.isNaN(n) ? 0 : n
  }

  const chart = useMemo(
    () =>
      range(0.8, 1.6, 80).map((g) => {
        const rows = cl.rows.map((r) => ({ ...r, prod2027: r.prod2025 * g }))
        const res = computeCentreDrugs({ rows }, params)
        return { g, uhr: res.uhr, actual: res.actualSum, izp: res.izpCl }
      }),
    [cl, params],
  )
  const growth = result.groups.reduce((a, g) => a + g.prod2025, 0) > 0 ? result.groups.reduce((a, g) => a + g.prod2027, 0) / result.groups.reduce((a, g) => a + g.prod2025, 0) : 1

  return (
    <>
      <PageHeader
        title="Centrové léčivé přípravky"
        lead="Příloha č. 1 bod 1.4 a příloha č. 15. Pro každou diagnostickou skupinu se referenční produkce navýší indexem INU a sníží indexem cenové slevy ICS; hradí se nižší z (referenční · INU · ICS) a (skutečná · ICS), násobeno degresivním indexem IZP_CL se stropem 1,075."
      />
      <Summary
        items={[
          { label: 'ÚHR_CL,2027', value: fmtCzk(result.uhr), tone: 'result' },
          { label: 'Referenční limit', value: fmtCzk(result.refSum), hint: 'Σ Produkce_2025 · INU · ICS', tone: result.binding === 'reference' ? 'warning' : 'neutral' },
          { label: 'Skutečnost · ICS', value: fmtCzk(result.actualSum), hint: 'Σ Produkce_2027 · ICS' },
          { label: 'r a IZP_CL', value: `${fmtIndex(result.ratio)} → ${fmtIndex(result.izpCl)}`, hint: result.izpCl === params.izpCl.cap ? 'strop indexu' : undefined },
        ]}
      />

      <Card title="Produkce podle diagnostických skupin" subtitle="Vykázaná hodnota léčivých přípravků (Kč) podaných pojištěncům od 18 let. INU a ICS lze měnit v Parametrech vyhlášky.">
        <div className="table-wrap">
          <table className="table table--editable">
            <thead>
              <tr>
                <th>Skupina</th>
                <th>INU</th>
                <th>ICS</th>
                <th>Produkce 2025</th>
                <th>Produkce 2027</th>
                <th>Ref. · INU · ICS</th>
                <th>Skut. · ICS</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              {result.groups.map((g) => (
                <tr key={g.groupId} className={g.prod2025 === 0 && g.prod2027 === 0 ? 'row--muted' : undefined}>
                  <td>
                    {g.groupId}) {g.name}
                  </td>
                  <td className="num">{fmtNum(g.inu, 2)}</td>
                  <td className="num">{fmtNum(g.ics, 2)}</td>
                  <td>
                    <input type="number" step={100_000} min={0} value={g.prod2025} onChange={(e) => setRow(g.groupId, { prod2025: num(e.target.value) })} />
                  </td>
                  <td>
                    <input type="number" step={100_000} min={0} value={g.prod2027} onChange={(e) => setRow(g.groupId, { prod2027: num(e.target.value) })} />
                  </td>
                  <td className="num">{fmtMio(g.refValued)}</td>
                  <td className="num">{fmtMio(g.actualValued)}</td>
                  <td className={`num ${g.actualValued > g.refValued ? 'text-warning' : ''}`}>{g.refValued > 0 ? fmtPct(g.actualValued / g.refValued - 1) : '–'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={5}>Celkem</th>
                <th className="num">{fmtMio(result.refSum)}</th>
                <th className="num">{fmtMio(result.actualSum)}</th>
                <th className="num">{fmtPct(result.ratio - 1)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
        <Callout kind="info">
          Porovnání se provádí za všechny skupiny dohromady, nikoli po skupinách – pokles v jedné skupině tak může kompenzovat nadprodukci v jiné. Pozor: důvodová
          zpráva uvádí pro revmatologii index 88 %, návrh vyhlášky 0,90.
        </Callout>
      </Card>

      <Card title="Citlivost na růst produkce" subtitle="Vodorovná osa: jednotný násobek produkce 2027 oproti 2025 ve všech skupinách. Čárkovaně skutečná produkce × ICS bez limitu.">
        <SensitivityChart
          data={chart}
          xKey="g"
          xLabel="růst produkce (2027 / 2025)"
          series={[
            { key: 'uhr', name: 'ÚHR_CL,2027' },
            { key: 'actual', name: 'skutečnost · ICS (bez limitu)', dashed: true },
          ]}
          yFormatter={fmtMio}
          marker={growth}
        />
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

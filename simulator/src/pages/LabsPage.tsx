import { useMemo } from 'react'
import { Callout, Card, NumberField, ToggleField } from '../components/fields'
import { SensitivityChart } from '../components/SensitivityChart'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtMio, fmtNum } from '../lib/format'
import { range } from '../model/all'
import { computeLabs, type RdgGroup } from '../model/labs'
import { useScenario } from '../state/ScenarioContext'

export function LabsPage() {
  const { scenario, patch } = useScenario()
  const { labs, params } = scenario
  const result = useMemo(() => computeLabs(labs, params), [labs, params])
  const set = (partial: Partial<typeof labs>) => patch('labs', partial)
  const setRdg = (i: number, partial: Partial<RdgGroup>) => set({ rdg: labs.rdg.map((g, j) => (j === i ? { ...g, ...partial } : g)) })
  const setLab = (partial: Partial<typeof labs.lab>) => set({ lab: { ...labs.lab, ...partial } })
  const setGen = (partial: Partial<typeof labs.gen>) => set({ gen: { ...labs.gen, ...partial } })

  const chart = useMemo(() => {
    const g = labs.rdg[0]
    if (!g) return []
    return range(0.8, 1.4, 60).map((r) => {
      const res = computeLabs({ ...labs, rdg: [{ ...g, pbHo: g.pbRef * r, uopHo: g.uopRef }] }, params)
      return { r, hbRed: res.rdg[0].hbRed }
    })
  }, [labs, params])

  return (
    <>
      <PageHeader
        title="Laboratoře a radiodiagnostika"
        lead="Příloha č. 5. Radiodiagnostika 809/810: výsledná hodnota bodu HBred = FS + (HB − FS)·min{1; KN·(PB_ref/UOP_ref)/(PB_ho/UOP_ho)} – růst bodů na pojištěnce krátí variabilní složku. Laboratoře: hodnota bodu podle akreditace (0,84 / 0,94 / 0,72 Kč; bez akreditace 0,40 Kč) a maximum POP_icz·PURO_icz·1,03 s korekcí minimální hodnoty bodu (91 % vážené HB). Lékařská genetika 816: HB 0,80 Kč, maximum s KN 1,00 a HB_min 60 %."
      />
      <Summary
        items={[
          { label: 'Příloha č. 5 celkem', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Radiodiagnostika', value: fmtCzk(result.rdgTotal), hint: result.rdg.some((x) => x.reduced) ? 'variabilní složka krácena' : undefined, tone: result.rdg.some((x) => x.reduced) ? 'warning' : 'neutral' },
          { label: 'Laboratoře', value: fmtCzk(result.lab.uhr), hint: `${result.lab.capped ? 'strop' : 'pod maximem'} · PURO ${fmtCzk(result.lab.puro)}`, tone: result.lab.capped ? 'warning' : 'neutral' },
          { label: 'Genetika 816', value: fmtCzk(result.gen.uhr), hint: result.gen.capped ? 'strop' : undefined, tone: result.gen.capped ? 'warning' : 'neutral' },
        ]}
      />

      <Card title="Radiodiagnostika 809/810 – část A">
        <ToggleField label="Ordinační doba ≥ 35 h / 5 dnů (resp. 70 h u screeningu) – HB +0,02" checked={labs.rdgHoursBonus} onChange={(v) => set({ rdgHoursBonus: v })} />
        <div className="table-wrap">
          <table className="table table--editable">
            <thead>
              <tr>
                <th>Skupina výkonů</th>
                <th>HB</th>
                <th>FS</th>
                <th>PB_ref</th>
                <th>UOP_ref</th>
                <th>PB_ho</th>
                <th>UOP_ho</th>
                <th>HBred</th>
                <th>Úhrada</th>
              </tr>
            </thead>
            <tbody>
              {labs.rdg.map((g, i) => (
                <tr key={g.id}>
                  <td>
                    <input type="text" value={g.name} onChange={(e) => setRdg(i, { name: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" step={0.01} value={g.hb} onChange={(e) => setRdg(i, { hb: parseFloat(e.target.value) || 0 })} style={{ width: 70 }} />
                  </td>
                  <td>
                    <input type="number" step={0.01} value={g.fs} onChange={(e) => setRdg(i, { fs: parseFloat(e.target.value) || 0 })} style={{ width: 70 }} />
                  </td>
                  <td>
                    <input type="number" value={g.pbRef} onChange={(e) => setRdg(i, { pbRef: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <input type="number" value={g.uopRef} onChange={(e) => setRdg(i, { uopRef: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <input type="number" value={g.pbHo} onChange={(e) => setRdg(i, { pbHo: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <input type="number" value={g.uopHo} onChange={(e) => setRdg(i, { uopHo: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td className={`num ${result.rdg[i]?.reduced ? 'text-warning' : ''}`}>{fmtNum(result.rdg[i]?.hbRed ?? 0, 4)}</td>
                  <td className="num">{fmtMio(result.rdg[i]?.uhr ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="info">HB 1,36 Kč platí pro poskytovatele, kteří v referenčním období vykázali screeningové výkony 89111–89131; ostatní 1,20 Kč. E-distribuce obrazových dat zvyšuje HB screeningu na 0,65 / 0,69 Kč. Poskytovatelé s ≤ 50 UP se hradí bez výpočtu HBred.</Callout>
      </Card>

      <div className="grid-3">
        <Card title="Laboratoře – skupina b)">
          <ToggleField label="Akreditace ČSN ISO 15189 / NASKL R3" checked={labs.lab.accredited} onChange={(v) => setLab({ accredited: v, hbHo: v ? 0.84 : 0.4 })} help="Bez akreditace HB 0,40 Kč." />
          <NumberField label="Hodnota bodu 2027" value={labs.lab.hbHo} onChange={(v) => setLab({ hbHo: v })} step={0.01} help="0,84 (222, 801, 808, 812–815) / 0,94 (802, 818) / 0,72 (807, 817, 823)." />
          <NumberField label="Vážená HB ref. období Σ PB_i·HB_i / PB_ref" value={labs.lab.hbRefWeighted} onChange={(v) => setLab({ hbRefWeighted: v })} step={0.01} />
          <NumberField label="UHR_ref" value={labs.lab.uhrRef} onChange={(v) => setLab({ uhrRef: v })} unit="Kč" step={100_000} />
          <NumberField label="PB_ref" value={labs.lab.pbRef} onChange={(v) => setLab({ pbRef: v })} step={100_000} />
          <NumberField label="POP_ref" value={labs.lab.popRef} onChange={(v) => setLab({ popRef: v })} />
          <NumberField label="POP_icz 2027" value={labs.lab.popHo} onChange={(v) => setLab({ popHo: v })} />
          <NumberField label="PB_ho" value={labs.lab.pbHo} onChange={(v) => setLab({ pbHo: v })} step={100_000} />
          <NumberField label="ZUM + ZULP 2027" value={labs.lab.kpHo} onChange={(v) => setLab({ kpHo: v })} unit="Kč" />
          <NumberField label="Nově nasmlouvané výkony" value={labs.lab.newServices} onChange={(v) => setLab({ newServices: v })} unit="Kč" />
        </Card>
        <Card title="Lékařská genetika 816 – skupina c)">
          <NumberField label="UHR_ref" value={labs.gen.uhrRef} onChange={(v) => setGen({ uhrRef: v })} unit="Kč" step={100_000} />
          <NumberField label="PB_ref" value={labs.gen.pbRef} onChange={(v) => setGen({ pbRef: v })} step={100_000} />
          <NumberField label="KP_ref" value={labs.gen.kpRef} onChange={(v) => setGen({ kpRef: v })} unit="Kč" />
          <NumberField label="HB ref. období" value={labs.gen.hbRef} onChange={(v) => setGen({ hbRef: v })} step={0.01} />
          <NumberField label="UOP_ref" value={labs.gen.popRef} onChange={(v) => setGen({ popRef: v })} />
          <NumberField label="POP 2027" value={labs.gen.popHo} onChange={(v) => setGen({ popHo: v })} />
          <NumberField label="PB_ho" value={labs.gen.pbHo} onChange={(v) => setGen({ pbHo: v })} step={100_000} />
          <NumberField label="KP_ho" value={labs.gen.kpHo} onChange={(v) => setGen({ kpHo: v })} unit="Kč" />
        </Card>
        <Card title="Citlivost: HBred skupiny a) podle růstu bodů na pojištěnce" subtitle="UOP beze změny, PB_ho = PB_ref × r.">
          <SensitivityChart data={chart} xKey="r" xLabel="r (body 2027 / 2025)" series={[{ key: 'hbRed', name: 'HBred' }]} yFormatter={(v) => v.toFixed(3)} marker={labs.rdg[0]?.pbRef ? labs.rdg[0].pbHo / labs.rdg[0].pbRef : undefined} height={260} />
        </Card>
      </div>

      <StepsTable steps={result.steps} />
    </>
  )
}

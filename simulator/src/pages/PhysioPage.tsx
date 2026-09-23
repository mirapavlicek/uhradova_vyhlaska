import { useMemo } from 'react'
import { Card, FieldGrid, NumberField, ToggleField } from '../components/fields'
import { PuroFields } from '../components/segmentFields'
import { SensitivityChart } from '../components/SensitivityChart'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtNum } from '../lib/format'
import { range } from '../model/all'
import { computePhysio, earlyStartBonus, type EarlyStartRow } from '../model/physio'
import { useScenario } from '../state/ScenarioContext'

export function PhysioPage() {
  const { scenario, patch } = useScenario()
  const { physio, params } = scenario
  const result = useMemo(() => computePhysio(physio, params), [physio, params])
  const set = (partial: Partial<typeof physio>) => patch('physio', partial)
  const rows = physio.earlyStarts
  const setRow = (i: number, partial: Partial<EarlyStartRow>) => set({ earlyStarts: rows.map((r, j) => (j === i ? { ...r, ...partial } : r)) })

  const chart = useMemo(() => range(0, 16, 64).map((days) => ({ days, bonus: earlyStartBonus(days, params) })), [params])

  return (
    <>
      <PageHeader
        title="Fyzioterapie a ergoterapie (902, 917)"
        lead="Příloha č. 7. Hodnota bodu 0,73 Kč (+0,07 při > 5 % neurologických/traumatologických dg., +0,01 při nízkém podílu základních výkonů), maximum (1,02 + KN)·POPzpoZ·PURO_O + max[…] s minimální HB 0,60 Kč; pojištěnci s vybranými diagnózami se hradí bez limitu; bonus 400–800 Kč za zahájení do 14 dnů po hospitalizaci."
      />
      <Summary
        items={[
          { label: 'Úhrada 902 celkem', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Limitovaná úhrada', value: fmtCzk(result.puro.uhr), hint: `${result.puro.capped ? 'strop' : 'pod maximem'} · HB ${fmtNum(result.hb, 2)} · KN ${fmtIndex(result.kn)}`, tone: result.puro.capped ? 'warning' : 'neutral' },
          { label: 'Péče mimo maximum', value: fmtCzk(result.exemptUhr) },
          { label: 'Bonus včasného zahájení', value: fmtCzk(result.earlyBonus) },
        ]}
      />

      <Card title="Bonifikace">
        <FieldGrid columns={2}>
          <ToggleField label="Podíl pojištěnců s dg. G10–G14, I60–I69, S42… > 5 % (HB +0,07, KN +0,10)" checked={physio.neuroTraumaShare} onChange={(v) => set({ neuroTraumaShare: v })} />
          <ToggleField label="Podíl výkonů 21113/21115/21315 < 50 % (HB +0,01, KN +0,02)" checked={physio.lowBasicShare} onChange={(v) => set({ lowBasicShare: v })} />
          <ToggleField label="Podíl výkonů 21221/21415 > 14 % (KN +0,02)" checked={physio.highIndividualShare} onChange={(v) => set({ highIndividualShare: v })} />
          <ToggleField label="≥ 50 % nositelů s dokladem vzdělávání (KN +0,02)" checked={physio.education} onChange={(v) => set({ education: v })} />
        </FieldGrid>
      </Card>

      <PuroFields value={physio.puro} onChange={(v) => set({ puro: v })} kpLabel="KP (ZUM + ZULP)" />

      <Card title="Péče mimo maximum a včasné zahájení">
        <FieldGrid columns={3}>
          <NumberField label="Body – pojištěnci s dg. C50, E83, F84, G20–G23, G35, G51–G83, P07…" value={physio.exemptPoints} onChange={(v) => set({ exemptPoints: v })} step={10_000} />
          <NumberField label="KP k těmto pojištěncům" value={physio.exemptKp} onChange={(v) => set({ exemptKp: v })} unit="Kč" />
        </FieldGrid>
        <div className="table-wrap">
          <table className="table table--editable">
            <thead>
              <tr>
                <th>Dny od ukončení hospitalizace / JP</th>
                <th>Počet pojištěnců</th>
                <th>Bonus / pojištěnce</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <input type="number" min={0} value={r.days} onChange={(e) => setRow(i, { days: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <input type="number" min={0} value={r.count} onChange={(e) => setRow(i, { count: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td className="num">{fmtCzk(earlyStartBonus(r.days, params))}</td>
                  <td>
                    <button type="button" className="btn btn--ghost" onClick={() => set({ earlyStarts: rows.filter((_, j) => j !== i) })} aria-label="Odebrat">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn btn--secondary" onClick={() => set({ earlyStarts: [...rows, { id: `e${Date.now()}`, days: 7, count: 0 }] })}>
            Přidat skupinu
          </button>
        </div>
      </Card>

      <Card title="Bonus včasného zahájení podle počtu dnů" subtitle="400 + 400 · min[1; (14 − dny) / 7] Kč; po 14 dnech nárok zaniká.">
        <SensitivityChart data={chart} xKey="days" xLabel="dny do zahájení péče" series={[{ key: 'bonus', name: 'bonus (Kč)' }]} yFormatter={(v) => fmtNum(v)} xFormatter={(v) => v.toFixed(0)} yDomain={[0, 900]} />
      </Card>
      <p className="muted small">Celkem za včasné zahájení: {fmtMio(result.earlyBonus)}.</p>

      <StepsTable steps={result.steps} />
    </>
  )
}

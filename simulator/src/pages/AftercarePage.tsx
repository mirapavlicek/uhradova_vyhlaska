import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField, ToggleField } from '../components/fields'
import { SensitivityChart } from '../components/SensitivityChart'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio } from '../lib/format'
import { AFTERCARE_OD, computeAftercare, OD_LABELS, PERSONNEL_LABELS, TECHNICAL_LABELS, type AftercareOd, type AftercareRow, type PersonnelCriterion, type TechnicalCriterion } from '../model/aftercare'
import { range } from '../model/all'
import { useScenario } from '../state/ScenarioContext'

export function AftercarePage() {
  const { scenario, patch } = useScenario()
  const { aftercare, params } = scenario
  const result = useMemo(() => computeAftercare(aftercare, params), [aftercare, params])
  const set = (partial: Partial<typeof aftercare>) => patch('aftercare', partial)
  const rows = aftercare.rows
  const setRow = (i: number, partial: Partial<AftercareRow>) => set({ rows: rows.map((r, j) => (j === i ? { ...r, ...partial } : r)) })

  const chart = useMemo(
    () =>
      range(0, 2, 40).map((fte) => ({
        fte,
        bon: computeAftercare({ ...aftercare, geriatristFte: fte }, params).bonGeri,
      })),
    [aftercare, params],
  )

  return (
    <>
      <PageHeader
        title="Následná lůžková péče"
        lead="Příloha č. 1, část B. Paušální sazba za ošetřovací den PS_OD,HO = (ZKN + KN) · PS_OD,2026; ZKN je 1,035 pro OD 00005, 00024, 00030 a 00037, jinak 1,02. KN skládá bonifikace za personální a technická kritéria (po 0,003), paliativní / geriatrickou péči, dětské pacienty, BON_Geri, psychiatrickou transformaci a další."
      />
      <Summary
        items={[
          { label: 'Úhrada následné péče', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Paušální sazby × dny', value: fmtCzk(result.lumpTotal) },
          { label: 'Výkonové OD (NIP/DIOP…)', value: fmtCzk(result.performanceTotal) },
          { label: 'BON_Geri', value: fmtIndex(result.bonGeri), hint: 'OD 00024' },
        ]}
      />

      <Card
        title="Ošetřovací dny a sazby 2026"
        subtitle="Každý řádek = typ OD (případně oddělený řádek pro dětské pacienty)."
        actions={
          <button type="button" className="btn btn--secondary" onClick={() => set({ rows: [...rows, { id: `n${Date.now()}`, od: '00005', name: '', ps2026: 3000, days: 0, pediatric: false }] })}>
            Přidat řádek
          </button>
        }
      >
        <div className="table-wrap">
          <table className="table table--editable">
            <thead>
              <tr>
                <th>Typ OD</th>
                <th>Popis</th>
                <th>PS_OD,2026 (Kč/den)</th>
                <th>Dny 2027</th>
                <th>Dětští pacienti</th>
                <th>ZKN + KN</th>
                <th>PS_OD,HO</th>
                <th>Úhrada</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const res = result.rows[i]
                return (
                  <tr key={r.id}>
                    <td>
                      <select value={r.od} onChange={(e) => setRow(i, { od: e.target.value as AftercareOd })}>
                        {AFTERCARE_OD.map((od) => (
                          <option key={od} value={od}>
                            {OD_LABELS[od]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input type="text" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
                    </td>
                    <td>
                      <input type="number" min={0} value={r.ps2026} onChange={(e) => setRow(i, { ps2026: parseFloat(e.target.value) || 0 })} />
                    </td>
                    <td>
                      <input type="number" min={0} value={r.days} onChange={(e) => setRow(i, { days: parseFloat(e.target.value) || 0 })} />
                    </td>
                    <td>
                      <input type="checkbox" checked={r.pediatric} onChange={(e) => setRow(i, { pediatric: e.target.checked })} />
                    </td>
                    <td className="num">{res ? fmtIndex(res.zkn + res.kn) : ''}</td>
                    <td className="num">{res ? fmtCzk(res.psHo) : ''}</td>
                    <td className="num">{res ? fmtMio(res.uhr) : ''}</td>
                    <td>
                      <button type="button" className="btn btn--ghost" onClick={() => set({ rows: rows.filter((_, j) => j !== i) })} aria-label="Odebrat">
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid-3">
        <Card title="Personální kritéria (+0,003 každé)">
          {(Object.keys(PERSONNEL_LABELS) as PersonnelCriterion[]).map((k) => (
            <ToggleField key={k} label={PERSONNEL_LABELS[k]} checked={aftercare.personnel[k]} onChange={(v) => set({ personnel: { ...aftercare.personnel, [k]: v } })} />
          ))}
        </Card>
        <Card title="Technická kritéria (+0,003 každé)">
          {(Object.keys(TECHNICAL_LABELS) as TechnicalCriterion[]).map((k) => (
            <ToggleField key={k} label={TECHNICAL_LABELS[k]} checked={aftercare.technical[k]} onChange={(v) => set({ technical: { ...aftercare.technical, [k]: v } })} />
          ))}
          <ToggleField label="Lékař paliativní medicíny 0,4 úv./120 lůžek (OD 00030, +0,04)" checked={aftercare.palliativeDoctor} onChange={(v) => set({ palliativeDoctor: v })} />
          <ToggleField label="Geriatr 0,4 úv./120 lůžek (OD 00037, +0,04)" checked={aftercare.geriatrician} onChange={(v) => set({ geriatrician: v })} />
        </Card>
        <Card title="Psychiatrie a speciální populace">
          <ToggleField label="Schválený transformační plán (OD 00021, 00026)" checked={aftercare.transformationPlan} onChange={(v) => set({ transformationPlan: v })} help="KN += 0,35 · K_TransNLP + BON_Akreditace" />
          <NumberField label="K_TransNLP" value={aftercare.kTransNlp} onChange={(v) => set({ kTransNlp: v })} step={0.01} help="Koeficient plnění transformačního plánu (část A, bod 5.2)." />
          <ToggleField label="Akreditace kvality a bezpečí (+0,015)" checked={aftercare.accreditation} onChange={(v) => set({ accreditation: v })} />
          <ToggleField label="Podíl dg. G35–G37 > 65 % (OD 00005/00037, +0,15)" checked={aftercare.msShareOver65} onChange={(v) => set({ msShareOver65: v })} />
          <ToggleField label="Podíl U57.2 > 50 % (OD 00024/00037, +0,03)" checked={aftercare.u572ShareOver50} onChange={(v) => set({ u572ShareOver50: v })} />
          <NumberField label="Dny s kódem U57.2 (+20 Kč/den)" value={aftercare.u572Days} onChange={(v) => set({ u572Days: v })} />
        </Card>
      </div>

      <Card title="Geriatrická kvalita, výkonové OD a extramurální péče">
        <FieldGrid columns={4}>
          <NumberField label="Úvazky geriatrů" value={aftercare.geriatristFte} onChange={(v) => set({ geriatristFte: v })} step={0.1} />
          <NumberField label="Počet lůžek OD 00024" value={aftercare.bedsOd24} onChange={(v) => set({ bedsOd24: v })} />
          <NumberField label="Body OD 00015 (1,63 Kč)" value={aftercare.pointsOd00015} onChange={(v) => set({ pointsOd00015: v })} step={10_000} />
          <NumberField label="Body OD 00017 – NIP (1,59 Kč)" value={aftercare.pointsOd00017} onChange={(v) => set({ pointsOd00017: v })} step={10_000} />
          <NumberField label="Body OD 00020 – DIOP (1,57 Kč)" value={aftercare.pointsOd00020} onChange={(v) => set({ pointsOd00020: v })} step={10_000} />
          <NumberField label="Body OD 00033/00035 (1,37 Kč)" value={aftercare.pointsOd00033} onChange={(v) => set({ pointsOd00033: v })} step={10_000} />
          <NumberField label="Vyžádaná extramurální péče" value={aftercare.em} onChange={(v) => set({ em: v })} unit="Kč" step={100_000} />
        </FieldGrid>
        <Callout kind="info">
          OD 00031, 00032, 00098 a 00099 se hradí sazbou 2026 navýšenou o 2 %; OD 00090/00091 mají pevné sazby podle kategorie pacienta (4 819–5 349 Kč). Limity: 90 OD 00017 na pojištěnce nad 18 let, 190 OD 00020.
        </Callout>
      </Card>

      <Card title="Citlivost: BON_Geri podle úvazků geriatrů" subtitle={`min{0,1; 10 · úvazky / ${aftercare.bedsOd24} lůžek}`}>
        <SensitivityChart data={chart} xKey="fte" xLabel="úvazky geriatrů" series={[{ key: 'bon', name: 'BON_Geri' }]} yFormatter={(v) => v.toFixed(3)} marker={aftercare.geriatristFte} yDomain={[0, 0.12]} />
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

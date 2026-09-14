import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField } from '../components/fields'
import { ExemptToggle, RegulationItemFields } from '../components/segmentFields'
import { SensitivityChart } from '../components/SensitivityChart'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtMio, fmtNum } from '../lib/format'
import { range } from '../model/all'
import { computeHospitalRegulation, REVISION_LABELS, type RevisionRow, type RevisionType } from '../model/hospitalRegulation'
import { useScenario } from '../state/ScenarioContext'

export function HospitalRegulationPage() {
  const { scenario, patch } = useScenario()
  const { hospitalReg, params, common } = scenario
  const czs = common.vaccinationMet ? params.czsVaccinated : params.czs
  const result = useMemo(() => computeHospitalRegulation(hospitalReg, czs, params), [hospitalReg, czs, params])
  const set = (partial: Partial<typeof hospitalReg>) => patch('hospitalReg', partial)
  const rows = hospitalReg.revisions
  const setRow = (i: number, partial: Partial<RevisionRow>) => set({ revisions: rows.map((r, j) => (j === i ? { ...r, ...partial } : r)) })

  const chart = useMemo(
    () =>
      range(1, 1.3, 60).map((r) => {
        const avgHo = hospitalReg.drugs.avgRef * r
        const res = computeHospitalRegulation({ ...hospitalReg, drugs: { ...hospitalReg.drugs, avgHo }, requested: { avgRef: 1, avgHo: 0 } }, czs, params)
        return { r, penalty: res.regulation.penalty, overrun: res.regulation.items.drugs?.overrunTotal ?? 0 }
      }),
    [hospitalReg, czs, params],
  )

  return (
    <>
      <PageHeader
        title="Regulační omezení nemocnic"
        lead="Příloha č. 1, část C. Při revizi kódování se snižuje casemix (jednotlivý případ dvojnásobkem rozdílu, u vzorku DRG báze podílem × Σ CM báze × 0,2 nebo 0,8). Ambulantní odbornosti nemocnice podléhají regulaci předepsaných léčiv (115 %) a vyžádané péče (110 %) s odstupňovanou srážkou až 40 % z překročení, nejvýše 15 % úhrady za výkony."
      />
      <Summary
        items={[
          { label: 'Regulace celkem (orientačně)', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Snížení CM', value: `${fmtNum(result.cmReduction, 2)} CM`, hint: `× CZS ${fmtCzk(czs)} = ${fmtMio(result.cmReductionCzk)}` },
          { label: 'Srážka léčiva + vyžádaná péče', value: fmtCzk(result.regulation.penalty), hint: result.regulation.capped ? 'strop 15 %' : undefined, tone: result.regulation.penalty > 0 ? 'warning' : 'neutral' },
        ]}
      />

      <Card
        title="Revize kódování (bod 1.4)"
        actions={
          <button type="button" className="btn btn--secondary" onClick={() => set({ revisions: [...rows, { id: `r${Date.now()}`, name: '', type: 'single', cmOriginal: 0, cmRevised: 0, cmBase: 0 }] })}>
            Přidat revizi
          </button>
        }
      >
        <div className="table-wrap">
          <table className="table table--editable">
            <thead>
              <tr>
                <th>Případ / DRG báze</th>
                <th>Typ revize</th>
                <th>CM původní</th>
                <th>CM revidovaný</th>
                <th>Σ CM báze</th>
                <th>Snížení CM</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <input type="text" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
                  </td>
                  <td>
                    <select value={r.type} onChange={(e) => setRow(i, { type: e.target.value as RevisionType })}>
                      {(Object.keys(REVISION_LABELS) as RevisionType[]).map((t) => (
                        <option key={t} value={t}>
                          {REVISION_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="number" step="any" min={0} value={r.cmOriginal} onChange={(e) => setRow(i, { cmOriginal: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <input type="number" step="any" min={0} value={r.cmRevised} onChange={(e) => setRow(i, { cmRevised: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <input type="number" step="any" min={0} value={r.cmBase} disabled={r.type === 'single'} onChange={(e) => setRow(i, { cmBase: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td className="num">{fmtNum(result.revisions[i]?.reduction ?? 0, 2)}</td>
                  <td>
                    <button type="button" className="btn btn--ghost" onClick={() => set({ revisions: rows.filter((_, j) => j !== i) })} aria-label="Odebrat">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="info">
          Statisticky významný počet = více než 5 % případů ze vzorku, nejméně 30 případů v bázi; méně významný = méně než 5 %, nejméně 10 případů. Revize jednotlivých případů jen v bázích s ≤ 10 případy nebo do X = 10 + 10 % případů.
        </Callout>
      </Card>

      <Card title="Regulace ambulantních odborností nemocnice (bod 2)">
        <FieldGrid columns={4}>
          <NumberField label="Globální unikátní pojištěnci 2027" value={hospitalReg.gaup} onChange={(v) => set({ gaup: v })} help="Odbornosti podle bodů 7.15, 7.16 a 7.18; ≤ 100 → regulace se neuplatní." />
          <NumberField label="Úhrada za ambulantní výkony bez ZUM/ZULP" value={hospitalReg.ambPerformanceBase} onChange={(v) => set({ ambPerformanceBase: v })} unit="Kč" step={1_000_000} help="Základ 15 % stropu srážky." />
          <RegulationItemFields label="Léčiva a ZP" value={hospitalReg.drugs} onChange={(v) => set({ drugs: v })} />
          <RegulationItemFields label="Vyžádaná péče" value={hospitalReg.requested} onChange={(v) => set({ requested: v })} />
          <ExemptToggle checked={hospitalReg.exempt} onChange={(v) => set({ exempt: v })} />
        </FieldGrid>
      </Card>

      <Card title="Citlivost: srážka za léčiva podle růstu průměrné úhrady na pojištěnce" subtitle="Odstupňovaná sazba 2,5 % za každé započaté 0,5 % nad 115 % → plných 40 % od 8 % nad prahem (tj. Ø 2027 ≥ 124,2 % Ø 2025).">
        <SensitivityChart
          data={chart}
          xKey="r"
          xLabel="Ø 2027 / Ø 2025 (léčiva a ZP)"
          series={[
            { key: 'overrun', name: 'Překročení celkem', dashed: true },
            { key: 'penalty', name: 'Srážka' },
          ]}
          yFormatter={fmtMio}
          marker={hospitalReg.drugs.avgRef ? hospitalReg.drugs.avgHo / hospitalReg.drugs.avgRef : undefined}
        />
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

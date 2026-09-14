import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField, SelectField } from '../components/fields'
import { ExemptToggle, RegulationItemFields } from '../components/segmentFields'
import { SensitivityChart } from '../components/SensitivityChart'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtNum, fmtPct } from '../lib/format'
import { range } from '../model/all'
import { computeDialysis, QUALITY_LABELS, transplantBonus, type QualityLevel } from '../model/dialysis'
import { useScenario } from '../state/ScenarioContext'

export function DialysisPage() {
  const { scenario, patch } = useScenario()
  const { dialysis: d, params } = scenario
  const result = useMemo(() => computeDialysis(d, params), [d, params])
  const set = (partial: Partial<typeof d>) => patch('dialysis', partial)
  const setSig = (partial: Partial<typeof d.signals>) => set({ signals: { ...d.signals, ...partial } })
  const setReg = (partial: Partial<typeof d.regulation>) => set({ regulation: { ...d.regulation, ...partial } })

  const chart = useMemo(
    () =>
      range(0, 0.3, 60).map((ktr) => {
        const { bon } = transplantBonus(ktr, params)
        return { ktr, bon }
      }),
    [params],
  )

  return (
    <>
      <PageHeader
        title="Dialyzační péče"
        lead="Příloha č. 8. Hodnota bodu 1,18 Kč (výkony 18530 a 18550 0,92 Kč) se navyšuje o kvalitativní bonifikaci (+0,05 / +0,07 Kč), o +0,02 Kč při podílu domácí dialýzy ≥ 6 % a o transplantační bonifikaci BON_TR = N_min + S·(N_max − N_min) podle podílu pacientů transplantovaných či zařazených na čekací listinu. Signální výkony včasného zařazení na čekací listinu se hradí pevnou částkou; následuje regulace ZULP, léčiv (110 %) a vyžádané péče."
      />
      <Summary
        items={[
          { label: 'Úhrada celkem', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Hodnota bodu', value: `${fmtNum(result.hb, 4)} Kč`, hint: `BON_TR ${fmtNum(result.bonTr, 4)} Kč` },
          { label: 'K_TR', value: fmtPct(result.ktr), hint: `skóre S = ${fmtNum(result.score, 2)}` },
          { label: 'Domácí dialýza', value: fmtPct(result.homeShare), hint: result.homeShare >= params.dialysis.homeShare ? 'bonifikace +0,02 Kč' : 'pod 6 %' },
          { label: 'Signální výkony', value: fmtCzk(result.signals) },
          { label: 'Regulace', value: fmtCzk(result.regulation.penalty), tone: result.regulation.penalty > 0 ? 'warning' : 'neutral' },
        ]}
      />

      <Card title="Produkce 2027">
        <FieldGrid columns={3}>
          <NumberField label="Body (HB 1,18 + bonifikace)" value={d.points} onChange={(v) => set({ points: v })} step={100_000} />
          <NumberField label="Body výkonů 18530, 18550 (HB 0,92)" value={d.pointsLow} onChange={(v) => set({ pointsLow: v })} step={10_000} />
          <NumberField label="ZUM + ZULP" value={d.zumZulp} onChange={(v) => set({ zumZulp: v })} unit="Kč" step={100_000} />
          <NumberField label="Unikátní pojištěnci 2027" value={d.upHo} onChange={(v) => set({ upHo: v })} help="Regulace se neuplatní při ≤ 50 pojištěncích." />
        </FieldGrid>
      </Card>

      <Card title="Kvalitativní bonifikace a domácí dialýza">
        <FieldGrid columns={3}>
          <SelectField<QualityLevel>
            label="Kvalitativní kritéria (Kt/V, hemoglobin, fosfor, cévní přístup)"
            value={d.quality}
            onChange={(v) => set({ quality: v })}
            options={(Object.keys(QUALITY_LABELS) as QualityLevel[]).map((k) => ({ value: k, label: QUALITY_LABELS[k] }))}
          />
          <NumberField label="Referovaní pacienti celkem" value={d.patientsReported} onChange={(v) => set({ patientsReported: v })} />
          <NumberField label="Peritoneální dialýza (váha 1,5)" value={d.patientsPd} onChange={(v) => set({ patientsPd: v })} />
          <NumberField label="Domácí hemodialýza" value={d.patientsHomeHd} onChange={(v) => set({ patientsHomeHd: v })} />
        </FieldGrid>
      </Card>

      <Card title="Transplantační bonifikace BON_TR" subtitle="K_TR = (PP_TXP·2 + PP_TXO + PP_WLP·2 + PP_WLO) / PP_CELK; pacienti mladší 80 let.">
        <FieldGrid columns={3}>
          <NumberField label="PP_TXP – preemptivně transplantovaní" value={d.txp} onChange={(v) => set({ txp: v })} />
          <NumberField label="PP_TXO – ostatní transplantovaní" value={d.txo} onChange={(v) => set({ txo: v })} />
          <NumberField label="PP_WLP – preemptivně na čekací listině" value={d.wlp} onChange={(v) => set({ wlp: v })} />
          <NumberField label="PP_WLO – ostatní na čekací listině" value={d.wlo} onChange={(v) => set({ wlo: v })} />
          <NumberField label="PP_CELK – pacienti do 80 let celkem" value={d.pcelk} onChange={(v) => set({ pcelk: v })} />
        </FieldGrid>
        <Callout kind="info">
          Pod dolním prahem LT = {fmtPct(params.dialysis.lt)} je bonifikace nulová; nad ním skokově N_min = {params.dialysis.nMin} Kč a lineárně roste až na N_max = {params.dialysis.nMax} Kč při horním prahu HT = {fmtPct(params.dialysis.ht)}.
        </Callout>
        <SensitivityChart
          data={chart}
          xKey="ktr"
          xLabel="K_TR"
          series={[{ key: 'bon', name: 'BON_TR (Kč / bod)' }]}
          xFormatter={(v) => fmtPct(v)}
          yFormatter={(v) => fmtNum(v, 4)}
          yDomain={[0, params.dialysis.nMax * 1.2]}
          marker={result.ktr}
        />
      </Card>

      <Card title="Signální výkony včasného zařazení na čekací listinu" subtitle="Počty výkonů; úhrada 3 000 / 4 500 / 7 000 / 10 500 / 20 000 Kč.">
        <FieldGrid columns={3}>
          <NumberField label="76661 (3 000 Kč)" value={d.signals.c76661} onChange={(v) => setSig({ c76661: v })} />
          <NumberField label="76662 (4 500 Kč)" value={d.signals.c76662} onChange={(v) => setSig({ c76662: v })} />
          <NumberField label="76663 (7 000 Kč)" value={d.signals.c76663} onChange={(v) => setSig({ c76663: v })} />
          <NumberField label="76664 (10 500 Kč)" value={d.signals.c76664} onChange={(v) => setSig({ c76664: v })} />
          <NumberField label="76667 (20 000 Kč)" value={d.signals.c76667} onChange={(v) => setSig({ c76667: v })} />
        </FieldGrid>
      </Card>

      <Card title="Regulační omezení">
        <FieldGrid columns={4}>
          <RegulationItemFields label="ZULP + ZUM" value={d.regulation.zulp} onChange={(v) => setReg({ zulp: v })} />
          <RegulationItemFields label="Léčiva a ZP" value={d.regulation.drugs} onChange={(v) => setReg({ drugs: v })} />
          <RegulationItemFields label="Vyžádaná péče" value={d.regulation.requested} onChange={(v) => setReg({ requested: v })} />
          <ExemptToggle checked={d.regulation.exempt} onChange={(v) => setReg({ exempt: v })} />
        </FieldGrid>
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

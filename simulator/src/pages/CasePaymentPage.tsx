import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField, SelectField, ToggleField } from '../components/fields'
import { GroupRowsEditor } from '../components/GroupRowsEditor'
import { SensitivityChart } from '../components/SensitivityChart'
import { range } from '../model/all'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtNum } from '../lib/format'
import { computeCasePayment, type CdzOption, type DsOption, type KdzInputs } from '../model/acute'
import { useScenario } from '../state/ScenarioContext'
import { CommonPanel } from './CommonPanel'

export function KdzFields({ value, onChange }: { value: KdzInputs; onChange: (v: KdzInputs) => void }) {
  const set = (partial: Partial<KdzInputs>) => onChange({ ...value, ...partial })
  return (
    <FieldGrid columns={3}>
      <ToggleField
        label="Splněna všechna kritéria akutní psychiatrické péče (bod 5.3)"
        checked={value.kpKritMet}
        onChange={(v) => set({ kpKritMet: v })}
        help="KP_krit = +0,04 při splnění, −0,06 při nesplnění."
      />
      <SelectField<CdzOption>
        label="Centrum duševního zdraví"
        value={value.cdz}
        onChange={(v) => set({ cdz: v })}
        options={[
          { value: 'none', label: 'Neprovozuje (0)' },
          { value: 'standard', label: 'Odb. 350/360/370/922 (+0,03)' },
          { value: 'odb355', label: 'Odb. 355 (+0,04)' },
        ]}
      />
      <SelectField<DsOption>
        label="Denní stacionář"
        value={value.ds}
        onChange={(v) => set({ ds: v })}
        options={[
          { value: 'none', label: 'Neprovozuje (0)' },
          { value: '00043', label: 'Výkon 00043 (+0,03)' },
          { value: 'other', label: 'Výkony 00041/00042 (+0,02)' },
        ]}
      />
      <NumberField label="Lůžka následné psychiatrické péče 2018" value={value.plnlp2018} onChange={(v) => set({ plnlp2018: v })} help="PLNLP_2018 – výchozí stav." />
      <NumberField label="Lůžka 2027" value={value.plnlp2027} onChange={(v) => set({ plnlp2027: v })} help="PLNLP_2027 – skutečný stav." />
      <NumberField label="Cílový stav lůžek 2030" value={value.plnlp2030} onChange={(v) => set({ plnlp2030: v })} help="PLNLP_2030 podle transformačního plánu; 0 = bez plánu." />
    </FieldGrid>
  )
}

export function CasePaymentPage() {
  const { scenario, patch } = useScenario()
  const { casePayment: cp, common, params } = scenario
  const result = useMemo(() => computeCasePayment(cp, common, params), [cp, common, params])
  const set = (partial: Partial<typeof cp>) => patch('casePayment', partial)

  const losChart = useMemo(
    () =>
      range(8, 40, 64).map((los) => {
        const r = computeCasePayment({ ...cp, losMedian2027: los }, common, params)
        return { los, cmRedH: r.cmRedH, uhr: r.uhr }
      }),
    [cp, common, params],
  )

  return (
    <>
      <PageHeader
        title="Případový paušál"
        lead="Příloha č. 1, část A, bod 5 – skupiny B, F, G, H. Výkonová úhrada CZ-DRG na centrální sazbě: u každé skupiny se hradí vyšší z ocenění podle jednotlivých položek (JPL) a casemixu × nákladový modifikátor, násobeno koeficientem centralizace. Psychiatrie (H) s koeficientem duševního zdraví K_DZ a redukcí za zkrácení ošetřovací doby."
      />
      <Summary
        items={[
          { label: 'ÚHR_PP,2027', value: fmtCzk(result.uhr), tone: 'result' },
          { label: 'K_DZ', value: fmtIndex(result.kdz), hint: 'koeficient duševního zdraví', tone: result.kdz < 1 ? 'warning' : 'neutral' },
          { label: 'CM_red,H', value: `${fmtNum(result.cmRedH, 2)} CM`, hint: `z ${fmtNum(cp.cmH2027, 2)} CM psychiatrie`, tone: result.cmRedH < cp.cmH2027 ? 'warning' : 'neutral' },
        ]}
      />

      <CommonPanel />

      <Card title="Skupiny B, F, G – nepovinné JPL" subtitle="Za každou skupinu: max(CM_JPL; CM_DRG · NM_PP) · CZS · KC. Ocenění JPL zadejte přepočtené na jednotky casemixu (Kč / CZS).">
        <GroupRowsEditor rows={cp.rows} onChange={(rows) => set({ rows })} idPrefix="pp" />
        <FieldGrid columns={3}>
          <NumberField label="CM případů s povinným JPL" value={cp.cmPovinneJpl} onChange={(v) => set({ cmPovinneJpl: v })} unit="CM" help="Hradí se vždy CZS · CM (bez NM a KC)." />
          <NumberField label="CM_děti (dětská onkologie v KOC)" value={cp.cmDeti} onChange={(v) => set({ cmDeti: v })} unit="CM" help="Příplatek 0,5 · CM_děti · CZS." />
          <NumberField label="EM_2027,BFGH" value={cp.em} onChange={(v) => set({ em: v })} unit="Kč" step={100_000} />
        </FieldGrid>
      </Card>

      <Card title="Psychiatrie – skupina H" subtitle="CM_red,H = CM_H · min{1; X · max(14; LOS_2025) / LOS_2027}; hradí se CZS · CM_red,H · K_DZ.">
        <FieldGrid columns={3}>
          <NumberField label="CM_2027 skupina H" value={cp.cmH2027} onChange={(v) => set({ cmH2027: v })} unit="CM" />
          <NumberField label="Medián ošetřovací doby 2025" value={cp.losMedian2025} onChange={(v) => set({ losMedian2025: v })} unit="dní" help="0 = poskytovatel bez reference → použije se 18 dní." />
          <NumberField label="Medián ošetřovací doby 2027" value={cp.losMedian2027} onChange={(v) => set({ losMedian2027: v })} unit="dní" />
        </FieldGrid>
        <h3 className="subheading">Koeficient duševního zdraví K_DZ</h3>
        <KdzFields value={cp.kdz} onChange={(kdz) => set({ kdz })} />
        <Callout kind="info">
          K_DZ je asymetrický: nesplnění kritérií kvality stojí 6 %, splnění přináší 4 %. Bonifikace za CDZ, stacionář a tempo transformace lůžek se sčítají;
          maximum K_TransNLP při plánu redukce na 60 % lůžek je cca +0,07.
        </Callout>
      </Card>

      <Card title="Citlivost na medián ošetřovací doby 2027" subtitle="Jak se mění redukovaný casemix psychiatrie a celý případový paušál při zkracování / prodlužování hospitalizací.">
        <SensitivityChart
          data={losChart}
          xKey="los"
          xLabel="medián LOS 2027 (dny)"
          series={[{ key: 'uhr', name: 'ÚHR_PP,2027' }]}
          yFormatter={fmtMio}
          xFormatter={(v) => v.toFixed(0)}
          marker={cp.losMedian2027}
        />
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

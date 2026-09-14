import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField } from '../components/fields'
import { SensitivityChart } from '../components/SensitivityChart'
import { range } from '../model/all'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtPct } from '../lib/format'
import { computePu } from '../model/acute'
import { useScenario } from '../state/ScenarioContext'
import { CommonPanel } from './CommonPanel'

export function PuPage() {
  const { scenario, patch } = useScenario()
  const { pu, common, params } = scenario
  const result = useMemo(() => computePu(pu, common, params), [pu, common, params])

  const cm2025AD = pu.cm2025A + pu.cm2025D
  const chart = useMemo(() => {
    return range(0.8, 1.5, 70).map((r) => {
      const scaled = computePu({ ...pu, cm2027AD: r * cm2025AD, cm2027Transfer: pu.cm2027Transfer * r }, common, params)
      return {
        r,
        uhr: scaled.uhr,
        linear: r * scaled.ipu - pu.em2027,
        izp: scaled.izp,
      }
    })
  }, [pu, common, params, cm2025AD])

  const set = (partial: Partial<typeof pu>) => patch('pu', partial)

  return (
    <>
      <PageHeader
        title="Paušální úhrada akutní lůžkové péče"
        lead="Příloha č. 1, část A, bod 3 – skupiny A a D podle přílohy č. 10. Individuální paušál navázaný na referenční rok 2025, koridor základních sazeb, krácení při poklesu produkce a degresivní úhrada nadprodukce indexem I_ZP."
      />
      <Summary
        items={[
          { label: 'ÚHR_PU,2027', value: fmtCzk(result.uhr), tone: 'result' },
          { label: 'IPU', value: fmtCzk(result.ipu), hint: 'individuální paušální úhrada' },
          { label: 'r = CM_red / CM_2025', value: fmtIndex(result.ratio), hint: `změna produkce ${fmtPct(result.ratio - 1)}`, tone: result.ratio < params.declineTolerance ? 'warning' : 'neutral' },
          { label: 'I_ZP', value: fmtIndex(result.izp), hint: 'index změny produkce' },
          { label: 'IZS → ZS_max', value: `${fmtCzk(result.izs)} → ${fmtCzk(result.zsMax)}`, hint: 'individuální sazba a strop koridoru' },
        ]}
      />

      <CommonPanel />

      <Card title="Referenční období 2025" subtitle="Vstupy pro PU_2025,A a koridor základních sazeb (bod 3.1).">
        <FieldGrid columns={4}>
          <NumberField label="CM_2025 skupina A" value={pu.cm2025A} onChange={(v) => set({ cm2025A: v })} unit="CM" />
          <NumberField label="CM_2025 skupina D" value={pu.cm2025D} onChange={(v) => set({ cm2025D: v })} unit="CM" help="Homogenní složka hrazená centrální sazbou." />
          <NumberField label="CM_2025 skupiny A až D" value={pu.cm2025AtoD} onChange={(v) => set({ cm2025AtoD: v })} unit="CM" help="Jmenovatel IZS a základ koridoru." />
          <NumberField label="ÚHR_PU,2025" value={pu.uhrPu2025} onChange={(v) => set({ uhrPu2025: v })} unit="Kč" step={1_000_000} />
          <NumberField label="ÚHR_EU,2025" value={pu.uhrEu2025} onChange={(v) => set({ uhrEu2025: v })} unit="Kč" step={1_000_000} />
          <NumberField label="ÚHR_ISU,2025" value={pu.uhrIsu2025} onChange={(v) => set({ uhrIsu2025: v })} unit="Kč" step={1_000_000} />
          <NumberField label="EM_2025" value={pu.em2025} onChange={(v) => set({ em2025: v })} unit="Kč" step={1_000_000} help="Extramurální péče v referenčním období." />
        </FieldGrid>
      </Card>

      <Card title="Hodnocené období 2027" subtitle="Produkce, překlady (kód ukončení léčení 5) a extramurální péče.">
        <FieldGrid columns={4}>
          <NumberField label="CM_2027 skupiny A+D" value={pu.cm2027AD} onChange={(v) => set({ cm2027AD: v })} unit="CM" help="Casemix hodnoceného období před redukcí." />
          <NumberField label="z toho CM případů ukončených překladem" value={pu.cm2027Transfer} onChange={(v) => set({ cm2027Transfer: v })} unit="CM" />
          <NumberField label="EM_2027" value={pu.em2027} onChange={(v) => set({ em2027: v })} unit="Kč" step={1_000_000} />
          <NumberField label="Počet případů 2025" value={pu.cases2025} onChange={(v) => set({ cases2025: v })} />
          <NumberField label="Počet případů 2027" value={pu.cases2027} onChange={(v) => set({ cases2027: v })} />
          <NumberField label="Překlady 2025 (PPR)" value={pu.transfers2025} onChange={(v) => set({ transfers2025: v })} />
          <NumberField label="Překlady 2027 (PPR)" value={pu.transfers2027} onChange={(v) => set({ transfers2027: v })} />
        </FieldGrid>
        <Callout kind="info">
          Redukce casemixu za překlady se uplatní jen tehdy, přesáhne-li podíl překladů {fmtPct(params.transferShareThreshold)} případů v obou obdobích. Casemix
          nepřeložených případů (CM_1) se nikdy nekrátí.
        </Callout>
      </Card>

      <Card
        title="Citlivost úhrady na změnu produkce"
        subtitle="Vodorovná osa: poměr r = CM_red,2027 / CM_2025,AD. Plná čára = úhrada podle vyhlášky, čárkovaná = lineární úhrada (IPU · r) pro srovnání."
      >
        <SensitivityChart
          data={chart}
          xKey="r"
          xLabel="r (změna produkce)"
          series={[
            { key: 'uhr', name: 'ÚHR_PU,2027' },
            { key: 'linear', name: 'lineární úhrada IPU · r', dashed: true },
          ]}
          yFormatter={fmtMio}
          marker={result.ratio}
        />
        <SensitivityChart
          data={chart}
          xKey="r"
          xLabel="r (změna produkce)"
          series={[{ key: 'izp', name: 'I_ZP' }]}
          yFormatter={(v) => v.toFixed(3)}
          marker={result.ratio}
          height={220}
          yDomain={[0.95, 'auto']}
        />
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

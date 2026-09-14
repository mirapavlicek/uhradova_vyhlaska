import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField } from '../components/fields'
import { SensitivityChart } from '../components/SensitivityChart'
import { range } from '../model/all'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtPct } from '../lib/format'
import { AMB_SEGMENT_LABELS, computeAmb, type AmbSegment, type AmbSegmentInputs } from '../model/ambulance'
import { useScenario } from '../state/ScenarioContext'

function SegmentFields({ seg, value, onChange }: { seg: AmbSegment; value: AmbSegmentInputs; onChange: (v: AmbSegmentInputs) => void }) {
  const set = (partial: Partial<AmbSegmentInputs>) => onChange({ ...value, ...partial })
  return (
    <Card title={AMB_SEGMENT_LABELS[seg]}>
      <FieldGrid columns={3}>
        <NumberField label="HP_ref (cenami 2025)" value={value.hpRef} onChange={(v) => set({ hpRef: v })} unit="Kč" step={1_000_000} help="Hodnota péče segmentu v referenčním období oceněná hodnotami bodu a bonifikacemi 2025 – určuje podíl segmentu na Úhr_amb_ref." />
        <NumberField label="Σ PB_2025 · HB_2027 + KP_2025" value={value.base2025} onChange={(v) => set({ base2025: v })} unit="Kč" step={1_000_000} help="Referenční produkce oceněná hodnotami bodu 2027 (bez bonifikací)." />
        <NumberField label="Σ PB_2027 · HB_2027 + KP_2027" value={value.base2027} onChange={(v) => set({ base2027: v })} unit="Kč" step={1_000_000} help="Produkce hodnoceného období (bez bonifikací)." />
        <NumberField label="Bonifikace 2025 (součet)" value={value.bon2025} onChange={(v) => set({ bon2025: v })} step={0.01} help="Např. prodloužený režim + akreditace; BON = 1 + součet." />
        <NumberField label="Bonifikace 2027 (součet)" value={value.bon2027} onChange={(v) => set({ bon2027: v })} step={0.01} help="Rozdíl proti 2025 se promítá do KN (změnaBON)." />
      </FieldGrid>
    </Card>
  )
}

export function AmbPage() {
  const { scenario, patch } = useScenario()
  const { amb, params } = scenario
  const result = useMemo(() => computeAmb(amb, params), [amb, params])
  const set = (partial: Partial<typeof amb>) => patch('amb', partial)
  const setSeg = (seg: AmbSegment, v: AmbSegmentInputs) => set({ segments: { ...amb.segments, [seg]: v } })

  const chart = useMemo(() => {
    const s = amb.segments
    return range(0.85, 1.35, 50).map((r) => {
      const scaled = {
        ...amb,
        segments: {
          ...s,
          rad: { ...s.rad, base2027: s.rad.base2025 * r },
          ost: { ...s.ost, base2027: s.ost.base2025 * r },
        },
      }
      const withGaup = computeAmb({ ...scaled, gaup2027: amb.gaup2025 * (1 + (r - 1) * 0.5) }, params)
      const fullGaup = computeAmb({ ...scaled, gaup2027: amb.gaup2025 * r }, params)
      const noGaup = computeAmb({ ...scaled, gaup2027: amb.gaup2025 }, params)
      return { r, full: fullGaup.radost.uhr, half: withGaup.radost.uhr, none: noGaup.radost.uhr }
    })
  }, [amb, params])

  return (
    <>
      <PageHeader
        title="Ambulantní složka nemocnic"
        lead="Příloha č. 1, body 7.15–7.20. Referenční úhrada se z poloviny narovnává k hodnotě péče, dělí se na laboratoře a radiodiagnostiku + ostatní ambulance, násobí koeficienty navýšení a u nelaboratorních segmentů indexem I_zp_amb vázaným na růst počtu unikátních pojištěnců. Strop je vždy skutečná hodnota péče 2027."
      />
      <Summary
        items={[
          { label: 'Úhr_amb_2027', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Laboratoře', value: fmtCzk(result.lab.uhr), hint: `${fmtPct(result.lab.ratio - 1)} produkce, KN ${fmtIndex(result.lab.kn)}${result.lab.capped ? ', strop' : ''}` },
          { label: 'Rad + ostatní', value: fmtCzk(result.radost.uhr), hint: `${fmtPct(result.radost.ratio - 1)} produkce, KN ${fmtIndex(result.radost.kn)}${result.radost.capped ? ', strop' : ''}` },
          { label: 'I_zp_amb', value: fmtIndex(result.radost.izpAmb), hint: `IZ_GAUP = ${fmtIndex(result.radost.izGaup)}`, tone: result.radost.izGaup < 1 && result.radost.ratio > 1 ? 'warning' : 'neutral' },
          { label: 'Úhr_amb_ref', value: fmtCzk(result.uhrAmbRef), hint: 'narovnaný referenční základ' },
        ]}
      />

      <Card title="Referenční úhrada a unikátní pojištěnci">
        <FieldGrid columns={4}>
          <NumberField label="Úhr_amb_2025" value={amb.uhrAmb2025} onChange={(v) => set({ uhrAmb2025: v })} unit="Kč" step={1_000_000} help="Skutečná úhrada za ambulantní péči v referenčním období." />
          <NumberField label="HP_ref (celkem)" value={amb.hpRefTotal} onChange={(v) => set({ hpRefTotal: v })} unit="Kč" step={1_000_000} help="Hodnota veškeré ambulantní péče 2025 včetně odborností mimo regulovanou složku." />
          <NumberField label="GAUP_2025" value={amb.gaup2025} onChange={(v) => set({ gaup2025: v })} help="Globální unikátní ambulantní pojištěnci v referenčním období." />
          <NumberField label="GAUP_2027" value={amb.gaup2027} onChange={(v) => set({ gaup2027: v })} />
        </FieldGrid>
        <Callout kind="info">
          Úhr_amb_ref = (HP_ref^red / HP_ref) · min[HP_ref; {params.ambRefBlend}·Úhr_amb_2025 + {(1 - params.ambRefBlend).toFixed(2)}·HP_ref]. Poskytovatel s historicky
          nízkou úhradou se posune o polovinu rozdílu k hodnotě péče; poskytovatel nad hodnotou péče je sražen na ni.
        </Callout>
      </Card>

      <div className="grid-3">
        <SegmentFields seg="lab" value={amb.segments.lab} onChange={(v) => setSeg('lab', v)} />
        <SegmentFields seg="rad" value={amb.segments.rad} onChange={(v) => setSeg('rad', v)} />
        <SegmentFields seg="ost" value={amb.segments.ost} onChange={(v) => setSeg('ost', v)} />
      </div>

      <Card
        title="Citlivost: růst produkce rad + ost vs. růst unikátních pojištěnců"
        subtitle="Úhrada segmentu radiodiagnostika + ostatní při změně produkce r, pokud počet unikátních pojištěnců roste stejně (plně uznáno), polovičním tempem (IZ_GAUP = 1) nebo vůbec (IZ_GAUP = 0)."
      >
        <SensitivityChart
          data={chart}
          xKey="r"
          xLabel="r (změna hodnoty péče rad + ost)"
          series={[
            { key: 'full', name: 'GAUP roste stejně jako produkce' },
            { key: 'half', name: 'GAUP roste polovičním tempem' },
            { key: 'none', name: 'GAUP beze změny', dashed: true },
          ]}
          yFormatter={fmtMio}
          marker={result.radost.ratio}
        />
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

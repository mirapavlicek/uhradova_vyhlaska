import { useMemo } from 'react'
import { Card, FieldGrid, NumberField, SelectField, ToggleField } from '../components/fields'
import { PuroFields } from '../components/segmentFields'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtNum } from '../lib/format'
import { computeHomecare, computeOdb913, computePalliative, type HomecareOdb } from '../model/homecare'
import { useScenario } from '../state/ScenarioContext'

export function HomecarePage() {
  const { scenario, patch } = useScenario()
  const { homecare, palliative, odb913, params } = scenario
  const hc = useMemo(() => computeHomecare(homecare, params), [homecare, params])
  const pal = useMemo(() => computePalliative(palliative, params), [palliative, params])
  const o913 = useMemo(() => computeOdb913(odb913, params), [odb913, params])
  const setHc = (partial: Partial<typeof homecare>) => patch('homecare', partial)
  const setPal = (partial: Partial<typeof palliative>) => patch('palliative', partial)
  const set913 = (partial: Partial<typeof odb913>) => patch('odb913', partial)

  return (
    <>
      <PageHeader
        title="Domácí, paliativní a zvláštní ambulantní péče (914, 916, 921, 925, 926, 913)"
        lead="Příloha č. 6. Domácí péče: HB 1,00 (925) / 0,91 (916) + bonifikace, maximum (1,06 + KN)·[POPzpoZ·PURO_O + max(PURO_O·POPzpoMh; UHRMh − UHRMr)]. Mobilní paliativní péče 926: HB 1,23 Kč, dny péče omezené 30 dny na dospělého a 180 na dítě. Odbornost 913: HB 1,23 Kč, maximum max{PMUP_ref · pacient-měsíce · 1,05 · KN; PB · 1,03 + KP}."
      />
      <Summary
        items={[
          { label: `Domácí péče ${homecare.odb}`, value: fmtCzk(hc.total), hint: `HB ${fmtNum(hc.hb, 2)} · KN ${fmtIndex(hc.kn)}${hc.puro.capped ? ' · strop' : ''}`, tone: hc.puro.capped ? 'warning' : 'result' },
          { label: 'Paliativní péče 926', value: fmtCzk(pal.total), hint: `HB ${fmtNum(pal.hb, 2)}`, tone: 'result' },
          { label: 'Odbornost 913', value: fmtCzk(o913.total), hint: `PMUP_ref ${fmtCzk(o913.pmup)}`, tone: 'result' },
        ]}
      />

      <Card title="Domácí péče – část A">
        <FieldGrid columns={2}>
          <SelectField<HomecareOdb> label="Odbornost" value={homecare.odb} onChange={(v) => setHc({ odb: v })} options={[{ value: '925', label: '925 – domácí péče (HB 1,00)' }, { value: '916', label: '916 – domácí péče odborné sestry (HB 0,91)' }]} />
          <ToggleField label="Podíl výkonů 06135/06137 na 06313–06318 ≥ 10 % (HB +0,02 u 925; KN +0,03)" checked={homecare.telemetryShare} onChange={(v) => setHc({ telemetryShare: v })} />
          <ToggleField label="Podíl pojištěnců s výkony 06325–06334 ≥ 35 % (KN +0,03)" checked={homecare.specialisedShare} onChange={(v) => setHc({ specialisedShare: v })} />
          <ToggleField label="Podíl pojištěnců s dg. C00–C97, G09–G99, F00–F99, I60–I69… > 35 % (HB +0,05 u 925; KN +0,15)" checked={homecare.severeDgShare} onChange={(v) => setHc({ severeDgShare: v })} />
        </FieldGrid>
        <FieldGrid columns={3}>
          <NumberField label="Body – pojištěnci s výkonem 06349/06360 (mimo maximum)" value={homecare.exemptPoints} onChange={(v) => setHc({ exemptPoints: v })} step={10_000} />
          <NumberField label="KP k těmto pojištěncům" value={homecare.exemptKp} onChange={(v) => setHc({ exemptKp: v })} unit="Kč" />
        </FieldGrid>
      </Card>
      <PuroFields value={homecare.puro} onChange={(v) => setHc({ puro: v })} kpLabel="ZUM + ZULP" />
      <Card title="Odbornosti 914 a 921, přeprava v návštěvní službě" subtitle="Hradí se výkonově bez maxima; maximum 925/916 se nepoužije při ≤ 30 unikátních pojištěncích.">
        <FieldGrid columns={4}>
          <NumberField label="Body odbornosti 914 (HB 0,99)" value={homecare.other.points914} onChange={(v) => setHc({ other: { ...homecare.other, points914: v } })} step={10_000} />
          <NumberField label="Body odbornosti 921 (HB 0,99)" value={homecare.other.points921} onChange={(v) => setHc({ other: { ...homecare.other, points921: v } })} step={10_000} />
          <NumberField label="ZUM + ZULP 914/921" value={homecare.other.kp} onChange={(v) => setHc({ other: { ...homecare.other, kp: v } })} unit="Kč" />
          <NumberField label="Body přepravy v návštěvní službě (HB 1,32)" value={homecare.other.transportPoints} onChange={(v) => setHc({ other: { ...homecare.other, transportPoints: v } })} step={10_000} />
        </FieldGrid>
      </Card>
      <StepsTable steps={hc.steps} title={`Průchod výpočtem – domácí péče ${homecare.odb}`} />

      <Card title="Mobilní specializovaná paliativní péče 926 – část B">
        <FieldGrid columns={4}>
          <ToggleField label="Psycholog ≥ 0,1 úv. na 1,0 lékaře (+0,02)" checked={palliative.psychologist} onChange={(v) => setPal({ psychologist: v })} />
          <ToggleField label="Zdravotně-sociální pracovník ≥ 0,3 úv. (+0,02)" checked={palliative.socialWorker} onChange={(v) => setPal({ socialWorker: v })} />
          <NumberField label="Unikátní dospělí pojištěnci" value={palliative.popAdults} onChange={(v) => setPal({ popAdults: v })} />
          <NumberField label="Unikátní dětští pojištěnci" value={palliative.popChildren} onChange={(v) => setPal({ popChildren: v })} />
          <NumberField label="Body za výkon 80091 (jednotkově)" value={palliative.pb80091} onChange={(v) => setPal({ pb80091: v })} />
          <NumberField label="Body za výkony 80090 + 80091" value={palliative.pointsDays} onChange={(v) => setPal({ pointsDays: v })} step={10_000} />
          <NumberField label="Body za 80088, 80089, 09527" value={palliative.pointsOther} onChange={(v) => setPal({ pointsOther: v })} step={10_000} />
          <NumberField label="Odečet souběžné péče" value={palliative.deductions} onChange={(v) => setPal({ deductions: v })} unit="Kč" help="Jiné služby v den 80090/80091 nad rámec výjimek (kapitace, stomatologie, prohlídka zemřelého…)." />
        </FieldGrid>
      </Card>
      <StepsTable steps={pal.steps} title="Průchod výpočtem – 926" />

      <Card title="Odbornost 913 – část C">
        <FieldGrid columns={4}>
          <ToggleField label="Podíl pojištěnců s dg. C00–C97, E10.3–E11.7, F, G09–G99, I60–I69 > 25 % (HB +0,02, KN 1,02)" checked={odb913.severeDgShare} onChange={(v) => set913({ severeDgShare: v })} />
          <NumberField label="Uhr_ref" value={odb913.uhrRef} onChange={(v) => set913({ uhrRef: v })} unit="Kč" step={10_000} />
          <NumberField label="Σ pacient-měsíců 2025" value={odb913.patientMonthsRef} onChange={(v) => set913({ patientMonthsRef: v })} />
          <NumberField label="Σ pacient-měsíců 2027" value={odb913.patientMonthsHo} onChange={(v) => set913({ patientMonthsHo: v })} />
          <NumberField label="PB_ho" value={odb913.pbHo} onChange={(v) => set913({ pbHo: v })} step={10_000} />
          <NumberField label="KP_ho" value={odb913.kpHo} onChange={(v) => set913({ kpHo: v })} unit="Kč" />
          <NumberField label="Unikátní pojištěnci 2025" value={odb913.popRef} onChange={(v) => set913({ popRef: v })} help="≤ 30 → maximum se nepoužije." />
          <NumberField label="Unikátní pojištěnci 2027" value={odb913.popHo} onChange={(v) => set913({ popHo: v })} />
        </FieldGrid>
      </Card>
      <StepsTable steps={o913.steps} title="Průchod výpočtem – 913" />
    </>
  )
}

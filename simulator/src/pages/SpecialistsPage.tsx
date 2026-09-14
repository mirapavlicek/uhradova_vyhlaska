import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField, SelectField, ToggleField } from '../components/fields'
import { ExemptToggle, PuroFields, RegulationItemFields } from '../components/segmentFields'
import { SensitivityChart } from '../components/SensitivityChart'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtNum } from '../lib/format'
import { range } from '../model/all'
import { computeSpecialists, ODB_GROUP_LABELS, type NewPatients, type OdbGroup } from '../model/specialists'
import { useScenario } from '../state/ScenarioContext'

export function SpecialistsPage() {
  const { scenario, patch } = useScenario()
  const { specialists: sp, params } = scenario
  const result = useMemo(() => computeSpecialists(sp, params), [sp, params])
  const set = (partial: Partial<typeof sp>) => patch('specialists', partial)
  const setReg = (partial: Partial<typeof sp.regulation>) => set({ regulation: { ...sp.regulation, ...partial } })

  const chart = useMemo(
    () =>
      range(0.8, 1.4, 60).map((r) => {
        const res = computeSpecialists({ ...sp, puro: { ...sp.puro, pbHo: sp.puro.pbRef * r, kpHo: sp.puro.kpRef * r } }, params)
        return { r, performance: res.puro.performance, cap: res.puro.cap, uhr: res.puro.uhr }
      }),
    [sp, params],
  )

  return (
    <>
      <PageHeader
        title="Ambulantní specialisté"
        lead="Příloha č. 3. Výkonová úhrada s hodnotou bodu 0,98 Kč + bonifikace (až +0,10 Kč) je omezena maximem (1,06 + KN)·POPzpoZ·PURO_O + max[(1,06 + KN)·PURO_O·POPzpoMh; UHRMh − UHRMr]; PURO_O má minimální hodnotu bodu 0,90 Kč. Následuje regulace ZULP/ZUM (115 %), léčiv (115 %) a vyžádané péče (110 %)."
      />
      <Summary
        items={[
          { label: 'Úhrada po regulaci', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Výkonová úhrada', value: fmtCzk(result.puro.performance), hint: `HB ${fmtNum(result.hb, 2)} Kč` },
          { label: 'Maximum', value: fmtCzk(result.puro.cap), hint: `KN ${fmtIndex(result.kn)}${result.puro.capped ? ' · strop' : ''}${result.puro.capApplies ? '' : ' · neuplatní se'}`, tone: result.puro.capped ? 'warning' : 'neutral' },
          { label: 'PURO_O', value: fmtCzk(result.puro.puro), hint: result.puro.puroFloorApplied ? 'minimální HB 0,90' : 'skutečný průměr' },
          { label: 'Regulace', value: fmtCzk(result.regulation.penalty), tone: result.regulation.penalty > 0 ? 'warning' : 'neutral' },
        ]}
      />

      <Card title="Hodnota bodu a koeficient navýšení">
        <FieldGrid columns={3}>
          <NumberField label="Základní hodnota bodu" value={sp.hbBase} onChange={(v) => set({ hbBase: v })} step={0.01} help="0,98 Kč; odbornosti podle bodu 1 mají zvláštní hodnoty (např. 1,05 / 1,15 / 0,94)." />
          <SelectField<OdbGroup> label="Skupina odborností (KN)" value={sp.odbGroup} onChange={(v) => set({ odbGroup: v })} options={(Object.keys(ODB_GROUP_LABELS) as OdbGroup[]).map((k) => ({ value: k, label: ODB_GROUP_LABELS[k] }))} />
          <SelectField<NewPatients> label="Noví pacienti (3 roky bez výkonu)" value={sp.newPatients} onChange={(v) => set({ newPatients: v })} options={[{ value: 'none', label: 'pod 5 %' }, { value: 'partial', label: '≥ 5 % (operační ≥ 7,5 %): +0,02 / KN 0,02' }, { value: 'full', label: '≥ 10 % (operační ≥ 15 %) + hodiny: +0,04 / KN 0,04' }]} />
          <ToggleField label="≥ 50 % nositelů s dokladem vzdělávání (+0,03 / KN 0,02)" checked={sp.education} onChange={(v) => set({ education: v })} />
          <ToggleField label="Ordinační hodiny 30 h / 5 dnů (operační 24 h / 4 dny) (+0,02 / KN 0,02)" checked={sp.hours} onChange={(v) => set({ hours: v })} />
          <ToggleField label="Objednávkový systém s přednostním ošetřením (+0,01 / KN 0,01)" checked={sp.ordering} onChange={(v) => set({ ordering: v })} />
          <ToggleField label="Odb. 903 – podíl dg. F84, R47, Q35… > 10 % (KN 0,08)" checked={sp.odb903} onChange={(v) => set({ odb903: v })} />
          <NumberField label="Nasmlouvaná kapacita (hodin týdně)" value={sp.hoursPerWeek} onChange={(v) => set({ hoursPerWeek: v })} help="Limit 100 UP pro použití maxima se přepočítává n/30." />
        </FieldGrid>
      </Card>

      <PuroFields value={sp.puro} onChange={(v) => set({ puro: v })} />

      <Card title="Regulační omezení (část B)">
        <FieldGrid columns={4}>
          <RegulationItemFields label="ZULP + ZUM" value={sp.regulation.zulp} onChange={(v) => setReg({ zulp: v })} />
          <RegulationItemFields label="Léčiva a ZP" value={sp.regulation.drugs} onChange={(v) => setReg({ drugs: v })} />
          <RegulationItemFields label="Vyžádaná péče" value={sp.regulation.requested} onChange={(v) => setReg({ requested: v })} />
          <ExemptToggle checked={sp.regulation.exempt} onChange={(v) => setReg({ exempt: v })} />
        </FieldGrid>
        <Callout kind="info">Psychiatrické a související odbornosti (305–370, 920–935) regulaci léčiv a vyžádané péče nepodléhají; regulace ZULP se u nich týká jen individuálně připravovaných léčiv. Regulace se počítá za každou odbornost zvlášť.</Callout>
      </Card>

      <Card title="Citlivost: výkonová úhrada vs. maximum podle změny produkce" subtitle="Body i ZUM/ZULP 2027 = referenční × r, ostatní vstupy beze změny.">
        <SensitivityChart
          data={chart}
          xKey="r"
          xLabel="r (produkce 2027 / 2025)"
          series={[
            { key: 'performance', name: 'Výkonová úhrada', dashed: true },
            { key: 'cap', name: 'Maximum', dashed: true },
            { key: 'uhr', name: 'Úhrada' },
          ]}
          yFormatter={fmtMio}
          marker={sp.puro.pbRef ? sp.puro.pbHo / sp.puro.pbRef : undefined}
        />
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField, SelectField, ToggleField } from '../components/fields'
import { ExemptToggle, RegulationItemFields } from '../components/segmentFields'
import { SensitivityChart } from '../components/SensitivityChart'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio } from '../lib/format'
import { range } from '../model/all'
import { computeGyn, type GynAccreditation } from '../model/gyn'
import { useScenario } from '../state/ScenarioContext'

export function GynPage() {
  const { scenario, patch } = useScenario()
  const { gyn, params } = scenario
  const result = useMemo(() => computeGyn(gyn, params), [gyn, params])
  const set = (partial: Partial<typeof gyn>) => patch('gyn', partial)
  const setPreg = (i: 0 | 1 | 2, v: number) => {
    const next: [number, number, number] = [...gyn.pregnancies] as [number, number, number]
    next[i] = v
    set({ pregnancies: next })
  }

  const chart = useMemo(
    () =>
      range(0, 0.8, 80).map((share) => ({
        share,
        genetics: computeGyn({ ...gyn, geneticShare: share, ultrasoundShare: 0.35 }, params).pregnancyCoef,
        ultrasound: computeGyn({ ...gyn, ultrasoundShare: share, geneticShare: 0.3 }, params).pregnancyCoef,
      })),
    [gyn, params],
  )

  return (
    <>
      <PageHeader
        title="Ambulantní gynekologie (603, 604)"
        lead="Příloha č. 4. Měsíční agregovaná úhrada 122 Kč za registrovanou pojištěnku s preventivní prohlídkou v posledních 24 měsících + bonifikace (vzdělávání, ordinační hodiny, akreditace, ISO, prevence, týmová praxe); bez UZ přístroje se základ krátí na polovinu. Těhotné: 2 489 / 3 801 / 5 322 Kč za trimestr × koeficient genetických a UZ vyšetření."
      />
      <Summary
        items={[
          { label: 'Úhrada celkem', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Agregovaná úhrada', value: fmtCzk(result.aggregated), hint: `${result.monthlyRate} Kč / pojištěnku / měsíc` },
          { label: 'Těhotné', value: fmtCzk(result.pregnancy), hint: `koeficient ${fmtIndex(result.pregnancyCoef)}`, tone: result.pregnancyCoef < 1 ? 'warning' : 'neutral' },
          { label: 'Regulační srážka', value: fmtCzk(result.regulation.penalty), tone: result.regulation.penalty > 0 ? 'warning' : 'neutral' },
        ]}
      />

      <Card title="Měsíční agregovaná úhrada (část A)">
        <FieldGrid columns={3}>
          <NumberField label="Registrované pojištěnky s nárokem" value={gyn.registeredWomen} onChange={(v) => set({ registeredWomen: v })} help="Průměrný měsíční počet pojištěnek ZP s preventivní prohlídkou (63021/63050) v předchozích 24 měsících." />
          <NumberField label="Počet měsíců" value={gyn.months} onChange={(v) => set({ months: v })} min={0} max={12} />
          <SelectField<GynAccreditation> label="Akreditace" value={gyn.accreditation} onChange={(v) => set({ accreditation: v })} options={[{ value: 'none', label: 'bez akreditace' }, { value: 'accredited', label: 'akreditace (+3 Kč)' }, { value: 'active', label: 'akreditace + aktivní školení (+9 Kč)' }]} />
          <ToggleField label="UZ přístroj po r. 2012 s kontrolou (jinak ×0,50)" checked={gyn.ultrasoundOk} onChange={(v) => set({ ultrasoundOk: v })} />
          <ToggleField label="≥ 50 % lékařů s dokladem vzdělávání (+9 Kč)" checked={gyn.education} onChange={(v) => set({ education: v })} />
          <ToggleField label="Ordinační hodiny 30 h / 5 dnů nebo 24 h / 4 dny (+9 Kč)" checked={gyn.hours} onChange={(v) => set({ hours: v })} />
          <ToggleField label="ISO 9001 (+9 Kč)" checked={gyn.iso} onChange={(v) => set({ iso: v })} />
          <ToggleField label="Prevence ≥ 45 % registrovaných do 70 let (+6 Kč)" checked={gyn.prevention45} onChange={(v) => set({ prevention45: v })} />
          <ToggleField label="Týmová praxe 2,0 úv. L3, 50 h týdně (+6 Kč)" checked={gyn.team} onChange={(v) => set({ team: v })} />
          <ToggleField label="Porodní asistentka ≥ 20 h týdně (+5 Kč)" checked={gyn.teamMidwife} onChange={(v) => set({ teamMidwife: v })} help="Jen společně s týmovou praxí." />
        </FieldGrid>
      </Card>

      <Card title="Těhotné pojištěnky (část B), neplodnost (část C), specializované služby (část D)">
        <FieldGrid columns={4}>
          <NumberField label="1. trimestr (2 489 Kč)" value={gyn.pregnancies[0]} onChange={(v) => setPreg(0, v)} />
          <NumberField label="2. trimestr (3 801 Kč)" value={gyn.pregnancies[1]} onChange={(v) => setPreg(1, v)} />
          <NumberField label="3. trimestr (5 322 Kč)" value={gyn.pregnancies[2]} onChange={(v) => setPreg(2, v)} />
          <NumberField label="Počet těhotných pojištěnek ZP" value={gyn.pregnantCount} onChange={(v) => set({ pregnantCount: v })} help="< 10 → koeficienty se nepoužijí." />
          <NumberField label="Podíl geneticky testovaných" value={gyn.geneticShare} onChange={(v) => set({ geneticShare: v })} step={0.01} min={0} max={1} help="≤ 20 % → +0,05; 40–60 % → −0,05; > 60 % → −0,10." />
          <NumberField label="Podíl s konziliárním UZ (32410/32420/63415)" value={gyn.ultrasoundShare} onChange={(v) => set({ ultrasoundShare: v })} step={0.01} min={0} max={1} help="≤ 30 % → +0,05; 40–60 % → −0,05; > 60 % → −0,10." />
          <NumberField label="Vyšetření neplodnosti (848 Kč)" value={gyn.infertilityCount} onChange={(v) => set({ infertilityCount: v })} />
          <NumberField label="Epizody péče 18+ (90 Kč)" value={gyn.episodes18} onChange={(v) => set({ episodes18: v })} />
          <NumberField label="Body nepravidelné péče (HB 1,00)" value={gyn.nonRegisteredPoints} onChange={(v) => set({ nonRegisteredPoints: v })} step={1_000} />
          <NumberField label="ZUM + ZULP" value={gyn.zumZulp} onChange={(v) => set({ zumZulp: v })} unit="Kč" step={1_000} />
        </FieldGrid>
      </Card>

      <Card title="Regulace (část E)">
        <FieldGrid columns={4}>
          <NumberField label="Unikátní pojištěnci 2027" value={gyn.upHo} onChange={(v) => set({ upHo: v })} help="≤ 50 → regulace se neuplatní." />
          <RegulationItemFields label="Léčiva a ZP" value={gyn.regulation.drugs} onChange={(v) => set({ regulation: { ...gyn.regulation, drugs: v } })} />
          <RegulationItemFields label="Vyžádaná péče" value={gyn.regulation.requested} onChange={(v) => set({ regulation: { ...gyn.regulation, requested: v } })} />
          <ExemptToggle checked={gyn.regulation.exempt} onChange={(v) => set({ regulation: { ...gyn.regulation, exempt: v } })} />
        </FieldGrid>
        <Callout kind="info">Srážka max. 15 % celkové úhrady částí A–D; ZP nad 15 000 Kč schválené revizním lékařem se do regulace nezahrnují.</Callout>
      </Card>

      <Card title="Citlivost: koeficient těhotenské péče podle podílu vyšetření" subtitle="Skokové prahy 20 % / 40 % / 60 % (genetika) a 30 % / 40 % / 60 % (konziliární UZ).">
        <SensitivityChart
          data={chart}
          xKey="share"
          xLabel="podíl těhotných s vyšetřením"
          series={[
            { key: 'genetics', name: 'genetická vyšetření (UZ 35 %)' },
            { key: 'ultrasound', name: 'konziliární UZ (genetika 30 %)', dashed: true },
          ]}
          yFormatter={(v) => v.toFixed(2)}
          xFormatter={(v) => `${Math.round(v * 100)} %`}
          yDomain={[0.85, 1.15]}
        />
      </Card>

      <p className="muted small">Ilustrační graf: {fmtMio(result.pregnancy)} za těhotné při aktuálním koeficientu.</p>
      <StepsTable steps={result.steps} />
    </>
  )
}

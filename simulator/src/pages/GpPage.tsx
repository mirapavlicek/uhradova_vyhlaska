import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField, SelectField, ToggleField } from '../components/fields'
import { SensitivityChart } from '../components/SensitivityChart'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtMio, fmtNum } from '../lib/format'
import { range } from '../model/all'
import { computeGp, GP_REGIME_LABELS, type GpRegime, type GpSpecialty } from '../model/gp'
import { GP_AGE_GROUPS } from '../model/params'
import { useScenario } from '../state/ScenarioContext'

export function GpPage() {
  const { scenario, patch } = useScenario()
  const { gp, params } = scenario
  const result = useMemo(() => computeGp(gp, params), [gp, params])
  const set = (partial: Partial<typeof gp>) => patch('gp', partial)
  const setReg = (partial: Partial<typeof gp.regulation>) => set({ regulation: { ...gp.regulation, ...partial } })

  const chart = useMemo(
    () =>
      range(1, 1.6, 60).map((r) => {
        const res = computeGp({ ...gp, regulation: { ...gp.regulation, drugsProvider: gp.regulation.drugsNational * r, incontProvider: 0, requestedProvider: 0, physioProvider: 0 } }, params)
        return { r, penalty: res.penalty }
      }),
    [gp, params],
  )

  return (
    <>
      <PageHeader
        title="Praktičtí lékaři (001, 002)"
        lead="Příloha č. 2. Kombinovaná kapitačně výkonová platba: kapitační sazba 60–78 Kč podle rozsahu ordinačních hodin plus bonifikace, výkony mimo kapitaci s hodnotou bodu 1,19–1,44 Kč, 90 Kč za epizodu péče, bonus POCUS, úhrada za týmovou praxi a terénní sestru, regulace nad celostátní průměr."
      />
      <Summary
        items={[
          { label: 'Úhrada celkem', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Kapitace', value: fmtCzk(result.capitation), hint: `${fmtNum(result.weightedInsured, 0)} přepočtených × ${result.rate} Kč × 12` },
          { label: 'Výkony + epizody', value: fmtCzk(result.performance + result.episodes) },
          { label: 'Týmová praxe + terénní sestra + POCUS', value: fmtCzk(result.team + result.nurse + result.pocus) },
          { label: 'Regulační srážka', value: fmtCzk(result.penalty), tone: result.penalty > 0 ? 'warning' : 'neutral' },
        ]}
      />

      <Card title="Kapitace">
        <FieldGrid columns={3}>
          <SelectField<GpSpecialty> label="Odbornost" value={gp.specialty} onChange={(v) => set({ specialty: v })} options={[{ value: '001', label: '001 – všeobecné praktické lékařství' }, { value: '002', label: '002 – PL pro děti a dorost' }]} />
          <SelectField<GpRegime> label="Rozsah ordinačních hodin" value={gp.regime} onChange={(v) => set({ regime: v })} options={(Object.keys(GP_REGIME_LABELS) as GpRegime[]).map((k) => ({ value: k, label: GP_REGIME_LABELS[k] }))} />
          <NumberField label="KPP_okres" value={gp.kpp} onChange={(v) => set({ kpp: v })} step={0.01} min={0} max={1} help="Koeficient podílu pojištěnců ZP v okrese (příloha č. 9)." />
          <ToggleField label="≥ 50 % lékařů s dokladem celoživotního vzdělávání (+1 Kč, HB +0,04)" checked={gp.bonusEducation} onChange={(v) => set({ bonusEducation: v, hbEducation: v })} />
          <ToggleField label="Preventivní prohlídky ≥ 30 % (40–80 let) / ≥ 40 % (6–19 let) (+2 Kč)" checked={gp.bonusPrevention} onChange={(v) => set({ bonusPrevention: v })} />
          <ToggleField label="Akreditace vzdělávacího programu (+1 Kč)" checked={gp.bonusAccreditation} onChange={(v) => set({ bonusAccreditation: v })} />
        </FieldGrid>
        <h3 className="subheading">Registrovaní pojištěnci ZP podle věku</h3>
        <div className="field-grid field-grid--4">
          {GP_AGE_GROUPS.map((g) => (
            <NumberField key={g.id} label={`${g.label} (index ${g.index})`} value={gp.ages[g.id] ?? 0} onChange={(v) => set({ ages: { ...gp.ages, [g.id]: v } })} compact />
          ))}
        </div>
      </Card>

      <Card title="Výkony mimo kapitaci a epizody péče">
        <FieldGrid columns={4}>
          <NumberField label="Body – preventivní prohlídky" value={gp.pbPrevention} onChange={(v) => set({ pbPrevention: v })} step={1_000} help="01021/01022 (1,44 Kč) resp. 02021–02032 (1,31 Kč)." />
          <NumberField label="Body – vybrané výkony (1,30 Kč)" value={gp.pbSelected} onChange={(v) => set({ pbSelected: v })} step={1_000} help="01130, 01135, 01186, 01188, 02035…, 09532, 15118, 15119." />
          <NumberField label="Body – ostatní a neregistrovaní (1,19 Kč)" value={gp.pbOther} onChange={(v) => set({ pbOther: v })} step={1_000} />
          <NumberField label="ZUM + ZULP" value={gp.zumZulp} onChange={(v) => set({ zumZulp: v })} unit="Kč" step={1_000} />
          <ToggleField label="Rozšířené ordinační hodiny (HB +0,06)" checked={gp.hbExtendedHours} onChange={(v) => set({ hbExtendedHours: v })} help="≥ 30 hodin / 5 dnů, do 18 h, objednávání." />
          <NumberField label="Epizody péče / kontakty 18+ (90 Kč)" value={gp.episodes18} onChange={(v) => set({ episodes18: v })} />
          <NumberField label="Měsíce s nasmlouvaným 01050 (POCUS)" value={gp.pocusMonths} onChange={(v) => set({ pocusMonths: v })} min={0} max={12} />
          <NumberField label="Počet výkonů 01050" value={gp.pocusCount} onChange={(v) => set({ pocusCount: v })} />
        </FieldGrid>
      </Card>

      <div className="grid-3">
        <Card title="Týmová praxe (část D)">
          <NumberField label="Měsíce plnění podmínek" value={gp.teamMonths} onChange={(v) => set({ teamMonths: v })} min={0} max={12} />
          <NumberField label="Úv_Σ – celkové úvazky lékařů" value={gp.teamFte} onChange={(v) => set({ teamFte: v })} step={0.1} min={1} max={3} help="1,0 + max. 2,0; Úv+ = (Úv_Σ − 1) · 10 desetin." />
          <p className="muted small">Měsíčně KPP × Úv+ × 10 800 Kč. Podmínky: akreditace, ≥ 30 ord. hodin, e-objednávání, ≥ 1 800 (1 700) přepočtených pojištěnců, registrace nových pojištěnců.</p>
        </Card>
        <Card title="Terénní sestra (část E)">
          <NumberField label="Měsíce se sestrou S2/S3 ≥ 40 h týdně" value={gp.nurseMonths} onChange={(v) => set({ nurseMonths: v })} min={0} max={12} />
          <NumberField label="Epizody sestry < 30 min (151 Kč)" value={gp.nurseEpisodesShort} onChange={(v) => set({ nurseEpisodesShort: v, nurseEpisodes: v + gp.nurseEpisodesLong })} />
          <NumberField label="Epizody sestry ≥ 30 min (303 Kč)" value={gp.nurseEpisodesLong} onChange={(v) => set({ nurseEpisodesLong: v, nurseEpisodes: gp.nurseEpisodesShort + v })} />
          <p className="muted small">Měsíční úhrada 25 000 × KPP náleží, je-li epizod alespoň n = 200/12 · měsíce · KPP.</p>
        </Card>
        <Card title="Regulace (část C)">
          <NumberField label="Léčiva a ZP – celostátní Ø / přepočtený poj." value={gp.regulation.drugsNational} onChange={(v) => setReg({ drugsNational: v })} unit="Kč" compact />
          <NumberField label="Léčiva a ZP – poskytovatel" value={gp.regulation.drugsProvider} onChange={(v) => setReg({ drugsProvider: v })} unit="Kč" compact />
          <NumberField label="Inkontinence – celostátní Ø" value={gp.regulation.incontNational} onChange={(v) => setReg({ incontNational: v })} unit="Kč" compact />
          <NumberField label="Inkontinence – poskytovatel" value={gp.regulation.incontProvider} onChange={(v) => setReg({ incontProvider: v })} unit="Kč" compact />
          <NumberField label="Vyžádaná péče – celostátní Ø" value={gp.regulation.requestedNational} onChange={(v) => setReg({ requestedNational: v })} unit="Kč" compact />
          <NumberField label="Vyžádaná péče – poskytovatel" value={gp.regulation.requestedProvider} onChange={(v) => setReg({ requestedProvider: v })} unit="Kč" compact />
          <NumberField label="Fyzioterapie 902 – celostátní Ø" value={gp.regulation.physioNational} onChange={(v) => setReg({ physioNational: v })} unit="Kč" compact />
          <NumberField label="Fyzioterapie 902 – poskytovatel" value={gp.regulation.physioProvider} onChange={(v) => setReg({ physioProvider: v })} unit="Kč" compact />
          <ToggleField label="Regulace se neuplatní (ZPP nepřekročen / nezbytná péče)" checked={gp.regulation.exempt} onChange={(v) => setReg({ exempt: v })} />
        </Card>
      </div>
      <Callout kind="info">Prahy: léčiva a inkontinence +20 %, vyžádaná péče +15 %, odb. 902 +20 % nad celostátní průměr na přepočteného pojištěnce; srážka do 25 % z překročení, celkem nejvýše 15 % kapitace a výkonů. Poskytovatel s ≤ 50 registrovanými pojištěnci ZP regulaci nepodléhá.</Callout>

      <Card title="Citlivost: regulační srážka podle poměru předepsaných léčiv k celostátnímu průměru">
        <SensitivityChart data={chart} xKey="r" xLabel="Ø léčiva poskytovatel / celostátní Ø" series={[{ key: 'penalty', name: 'Srážka (jen léčiva)' }]} yFormatter={fmtMio} marker={gp.regulation.drugsNational ? gp.regulation.drugsProvider / gp.regulation.drugsNational : undefined} />
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

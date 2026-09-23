import { useMemo } from 'react'
import { Card, FieldGrid, NumberField, ToggleField } from '../components/fields'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk } from '../lib/format'
import { computeOther, type OtherInputs } from '../model/other'
import { useScenario } from '../state/ScenarioContext'

export function OtherPage() {
  const { scenario, patch } = useScenario()
  const { other, params } = scenario
  const m = params.misc
  const result = useMemo(() => computeOther(other, params), [other, params])
  const set = <K extends keyof OtherInputs>(key: K, partial: Partial<OtherInputs[K]>) => patch('other', { [key]: { ...other[key], ...partial } } as Partial<OtherInputs>)

  return (
    <>
      <PageHeader
        title="ZZS, dopravní služba, pohotovosti, lázně a lékárny"
        lead="Segmenty hrazené přímo paragrafovým zněním vyhlášky (§ 14–19): pevné hodnoty bodu, paušály za den služby násobené koeficientem K z přílohy č. 9 a úhrady za den lázeňského pobytu."
      />
      <Summary
        items={[
          { label: 'Celkem § 14–19', value: fmtCzk(result.total), tone: 'result' },
          { label: 'ZZS + PPNP', value: fmtCzk(result.zzs) },
          { label: 'Dopravní služba', value: fmtCzk(result.zds) },
          { label: 'Lázně a ozdravovny', value: fmtCzk(result.spa) },
          { label: 'Pohotovosti', value: fmtCzk(result.dentalEmergency + result.pharmacy) },
          { label: 'Výkony § 18–19', value: fmtCzk(result.flat) },
        ]}
      />

      <Card title="Zdravotnická záchranná služba a PPNP (§ 14)">
        <FieldGrid columns={4}>
          <NumberField label={`Body výkonů (HB ${m.zzsHb})`} value={other.zzs.points} onChange={(v) => set('zzs', { points: v })} step={10_000} />
          <NumberField label={`Body výkonů přepravy (HB ${m.zzsTransportHb})`} value={other.zzs.pointsTransport} onChange={(v) => set('zzs', { pointsTransport: v })} step={10_000} />
          <NumberField label={`Body výkonu 06714 (HB ${m.zzs06714Hb})`} value={other.zzs.points06714} onChange={(v) => set('zzs', { points06714: v })} step={10_000} />
          <NumberField label={`Epizody tísňová výzva + výjezd (${m.zzsEpisode} Kč)`} value={other.zzs.episodes} onChange={(v) => set('zzs', { episodes: v })} help="Jen poskytovatel ZZS." />
        </FieldGrid>
      </Card>

      <Card title="Zdravotnická dopravní služba (§ 15)">
        <FieldGrid columns={4}>
          <ToggleField label="Nepřetržitý provoz (HB 1,53 / 1,65 místo 1,26 / 1,36)" checked={other.zds.nonstop} onChange={(v) => set('zds', { nonstop: v })} />
          <NumberField label="Body výkonů přepravy" value={other.zds.points} onChange={(v) => set('zds', { points: v })} step={10_000} />
          <NumberField label="Body výkonu přepravy č. 40" value={other.zds.points40} onChange={(v) => set('zds', { points40: v })} step={10_000} />
          <NumberField label={`Body výkonu přepravy č. 69 (HB ${m.zds69Hb})`} value={other.zds.points69} onChange={(v) => set('zds', { points69: v })} step={10_000} />
        </FieldGrid>
      </Card>

      <Card title="Pohotovostní služby (§ 16 a § 19 odst. 3)" subtitle="K = koeficient poměru počtu pojištěnců pojišťovny v regionu (příloha č. 9); lze doplnit automaticky na stránce Modelace.">
        <FieldGrid columns={4}>
          <NumberField label={`Zubní pohotovost – dny (${m.dentalEmergencyDay} Kč × K)`} value={other.dentalEmergency.days} onChange={(v) => set('dentalEmergency', { days: v })} />
          <NumberField label="Zubní pohotovost – K" value={other.dentalEmergency.k} onChange={(v) => set('dentalEmergency', { k: v })} step={0.001} min={0} max={1} />
          <NumberField label={`Lékárenská pohotovost – dny (${m.pharmacyEmergencyDay} Kč × K)`} value={other.pharmacyEmergency.days} onChange={(v) => set('pharmacyEmergency', { days: v })} />
          <NumberField label="Lékárenská pohotovost – K" value={other.pharmacyEmergency.k} onChange={(v) => set('pharmacyEmergency', { k: v })} step={0.001} min={0} max={1} />
        </FieldGrid>
      </Card>

      <Card title="Lázeňská léčebně rehabilitační péče a ozdravovny (§ 17)">
        <FieldGrid columns={3}>
          <NumberField label="Komplexní péče – dny pobytu" value={other.spa.complexDays} onChange={(v) => set('spa', { complexDays: v })} />
          <NumberField label="Komplexní péče – sazba za den 2026" value={other.spa.complexRate2026} onChange={(v) => set('spa', { complexRate2026: v })} unit="Kč" help="Hradí se 102 % smluvní sazby 2026." />
          <NumberField label="Příspěvková péče – dny pobytu" value={other.spa.contribDays} onChange={(v) => set('spa', { contribDays: v })} />
          <NumberField label="Příspěvková péče – sazba za den 2026" value={other.spa.contribRate2026} onChange={(v) => set('spa', { contribRate2026: v })} unit="Kč" />
          <NumberField label={`Body výkonu 09543 v lázních (HB ${m.spa09543Hb})`} value={other.spa.points09543Spa} onChange={(v) => set('spa', { points09543Spa: v })} help="Nejvýše 3× za pobyt." />
          <NumberField label={`Ozdravovna – dny (${m.ozdravovnaDay} Kč)`} value={other.spa.ozdravovnaDays} onChange={(v) => set('spa', { ozdravovnaDays: v })} />
        </FieldGrid>
      </Card>

      <Card title="Výkony s pevnou hodnotou bodu nebo úhradou (§ 18 a § 19)" subtitle="Nevstupují do maximální ani celkové výše úhrady; nepoužijí se pro jednodenní a lůžkovou péči.">
        <FieldGrid columns={3}>
          <NumberField label={`Body výkonu 09543 (HB ${m.hb09543})`} value={other.flat.points09543} onChange={(v) => set('flat', { points09543: v })} step={1_000} />
          <NumberField label={`Body výkonů 09555–09557 (HB ${m.hb09555})`} value={other.flat.points09555} onChange={(v) => set('flat', { points09555: v })} step={1_000} />
          <NumberField label={`Body výkonů 09580, 09581 (HB ${m.hb09580})`} value={other.flat.points09580} onChange={(v) => set('flat', { points09580: v })} step={1_000} />
          <NumberField label={`Počet výkonů 09990 (${m.fee09990} Kč)`} value={other.flat.count09990} onChange={(v) => set('flat', { count09990: v })} />
          <NumberField label={`Počet výkonů 09552 (${m.fee09552} Kč)`} value={other.flat.count09552} onChange={(v) => set('flat', { count09552: v })} />
          <NumberField label={`Převody listinných receptů (${m.eRecipe} Kč)`} value={other.flat.eRecipes} onChange={(v) => set('flat', { eRecipes: v })} help="Lékárny; hradí se do 150 dnů po skončení období." />
        </FieldGrid>
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

import { Card, FieldGrid, NumberField, SelectField, ToggleField } from '../components/fields'
import { fmtNum } from '../lib/format'
import { cmi } from '../model/acute'
import { PROVIDER_TYPE_LABELS, type ProviderType } from '../model/params'
import { useScenario } from '../state/ScenarioContext'

/** Společné charakteristiky poskytovatele sdílené všemi moduly akutní péče. */
export function CommonPanel() {
  const { scenario, patch } = useScenario()
  const c = scenario.common
  const providerCmi = cmi(c)
  return (
    <Card
      title="Poskytovatel a pojišťovna"
      subtitle={`CMI referenčního období = ${fmtNum(providerCmi, 4)} (${providerCmi > scenario.params.cmiThreshold ? 'nad' : 'pod'} prahem ${scenario.params.cmiThreshold} → nákladové modifikátory ${providerCmi > scenario.params.cmiThreshold ? 'se uplatní' : 'se neuplatní'})`}
    >
      <FieldGrid columns={3}>
        <SelectField<ProviderType>
          label="Typ poskytovatele (ZS_min)"
          value={c.providerType}
          onChange={(v) => patch('common', { providerType: v })}
          options={(Object.keys(PROVIDER_TYPE_LABELS) as ProviderType[]).map((k) => ({ value: k, label: PROVIDER_TYPE_LABELS[k] }))}
        />
        <NumberField
          label="CM_2025 za všechny ZP"
          value={c.cmAllInsurers2025}
          onChange={(v) => patch('common', { cmAllInsurers2025: v })}
          unit="CM"
          help="Casemix všech hospitalizací 2025 (relativní váhy 2027) za všechny pojišťovny – čitatel CMI."
        />
        <NumberField
          label="Počet případů 2025 za všechny ZP"
          value={c.casesAllInsurers2025}
          onChange={(v) => patch('common', { casesAllInsurers2025: v })}
          help="Jmenovatel CMI."
        />
        <NumberField
          label="Koeficient podílu pojištěnců ZP v okrese"
          value={c.insurerDistrictShare}
          onChange={(v) => patch('common', { insurerDistrictShare: v })}
          step={0.01}
          min={0}
          max={1}
          help="Příloha č. 9, bod 1. Určuje proměnnou X (1,10 nad 0,1; 1,15 pod)."
        />
        <ToggleField
          label="Celostátní podmínka proočkovanosti splněna"
          checked={c.vaccinationMet}
          onChange={(v) => patch('common', { vaccinationMet: v })}
          help="≥ 33 % lékařů a ≥ 15 % nelékařů očkováno proti chřipce → CZS 85 000 Kč."
        />
      </FieldGrid>
    </Card>
  )
}

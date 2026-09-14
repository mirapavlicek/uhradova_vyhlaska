import { Card, FieldGrid, NumberField, ToggleField } from './fields'
import type { PuroInputs } from '../model/puro'
import type { RegulationItemInputs } from '../model/regulation'

/** Editor vstupů společného PURO mechanismu (referenční a hodnocené období). */
export function PuroFields({ value, onChange, kpLabel = 'ZUM + ZULP' }: { value: PuroInputs; onChange: (v: PuroInputs) => void; kpLabel?: string }) {
  const set = (partial: Partial<PuroInputs>) => onChange({ ...value, ...partial })
  return (
    <>
      <Card title="Referenční období 2025" subtitle="Vstupy PURO_O – průměrné úhrady na unikátního pojištěnce.">
        <FieldGrid columns={4}>
          <NumberField label="UHR_ref" value={value.uhrRef} onChange={(v) => set({ uhrRef: v })} unit="Kč" step={10_000} help="Celková úhrada v odbornosti vč. ZUM/ZULP." />
          <NumberField label="POP_ref" value={value.popRef} onChange={(v) => set({ popRef: v })} help="Unikátní pojištěnci (bez těch jen s výkonem 09513)." />
          <NumberField label="PB_ref" value={value.pbRef} onChange={(v) => set({ pbRef: v })} unit="bodů" step={10_000} />
          <NumberField label={`${kpLabel} ref.`} value={value.kpRef} onChange={(v) => set({ kpRef: v })} unit="Kč" step={1_000} />
          <NumberField label="UHRMr" value={value.uhrMr} onChange={(v) => set({ uhrMr: v })} unit="Kč" step={1_000} help="Úhrada za mimořádně nákladné pojištěnce (> 5× průměr) v ref. období." />
        </FieldGrid>
      </Card>
      <Card title="Hodnocené období 2027">
        <FieldGrid columns={4}>
          <NumberField label="POPzpoZ" value={value.popZ} onChange={(v) => set({ popZ: v })} help="Základní unikátní pojištěnci." />
          <NumberField label="POPzpoMh" value={value.popMh} onChange={(v) => set({ popMh: v })} help="Mimořádně nákladní unikátní pojištěnci." />
          <NumberField label="UHRMh" value={value.uhrMh} onChange={(v) => set({ uhrMh: v })} unit="Kč" step={1_000} help="Úhrada za mimořádně nákladné pojištěnce 2027." />
          <NumberField label="PB_ho" value={value.pbHo} onChange={(v) => set({ pbHo: v })} unit="bodů" step={10_000} help="Vykázané a uznané body 2027." />
          <NumberField label={`${kpLabel} 2027`} value={value.kpHo} onChange={(v) => set({ kpHo: v })} unit="Kč" step={1_000} />
          <NumberField label="Nově nasmlouvané výkony" value={value.newServices} onChange={(v) => set({ newServices: v })} unit="Kč" step={1_000} help="Navyšují maximum o svou hodnotu." />
        </FieldGrid>
      </Card>
    </>
  )
}

export function RegulationItemFields({ label, value, onChange }: { label: string; value: RegulationItemInputs; onChange: (v: RegulationItemInputs) => void }) {
  return (
    <>
      <NumberField label={`${label} – Ø 2025 / UP`} value={value.avgRef} onChange={(v) => onChange({ ...value, avgRef: v })} unit="Kč" step={10} />
      <NumberField label={`${label} – Ø 2027 / UP`} value={value.avgHo} onChange={(v) => onChange({ ...value, avgHo: v })} unit="Kč" step={10} />
    </>
  )
}

export function ExemptToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <ToggleField label="Regulace se neuplatní" checked={checked} onChange={onChange} help="Nezbytná péče, nesdělení referenčních hodnot do 30. 4., nebo malý poskytovatel." />
}

import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField, SelectField, ToggleField } from '../components/fields'
import { GroupRowsEditor } from '../components/GroupRowsEditor'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex } from '../lib/format'
import { computeSeparated, computeUnder50, type NmCeTier } from '../model/acute'
import { useScenario } from '../state/ScenarioContext'
import { KdzFields } from './CasePaymentPage'
import { CommonPanel } from './CommonPanel'

export function SeparatedPage() {
  const { scenario, patch } = useScenario()
  const { separated: sep, common, params } = scenario
  const result = useMemo(() => computeSeparated(sep, common, params), [sep, common, params])
  const set = (partial: Partial<typeof sep>) => patch('separated', partial)

  return (
    <>
      <PageHeader
        title="Vyčleněná úhrada"
        lead="Příloha č. 1, část A, bod 4 – skupiny C a E (vysoce specializovaná péče). Výkonová úhrada CZ-DRG s nákladovým modifikátorem NM_CE, koeficientem centralizace a bonifikací za sledování výsledků u cévních mozkových příhod (mRS po 90 dnech)."
      />
      <Summary
        items={[
          { label: 'ÚHR_vyčl,2027', value: fmtCzk(result.uhr), tone: 'result' },
          { label: 'NM_CE', value: fmtIndex(result.nmCe), hint: 'nákladový modifikátor' },
        ]}
      />
      <CommonPanel />
      <Card title="Skupiny C, E – nepovinné JPL" subtitle="Za každou skupinu: max(CM_JPL; CM_DRG · NM_CE) · CZS · KC.">
        <GroupRowsEditor rows={sep.rows} onChange={(rows) => set({ rows })} idPrefix="ce" />
        <FieldGrid columns={3}>
          <NumberField label="CM případů s povinným JPL" value={sep.cmPovinneJpl} onChange={(v) => set({ cmPovinneJpl: v })} unit="CM" />
          <SelectField<NmCeTier>
            label="Stupeň NM_CE (pokud CMI ≤ prahu)"
            value={sep.nmCeTier}
            onChange={(v) => set({ nmCeTier: v })}
            options={[
              { value: 'none', label: 'Ostatní poskytovatelé (1,00)' },
              { value: 'trauma4', label: 'Traumacentrum + ≥ 4 další statusy (1,10)' },
              { value: 'refNet6', label: 'Referenční síť + ≥ 6 statusů centra (1,20)' },
            ]}
            help="Při CMI > 2,7 platí automaticky 1,25."
          />
          <NumberField label="EM_2027,CE" value={sep.em} onChange={(v) => set({ em: v })} unit="Kč" step={100_000} />
        </FieldGrid>
      </Card>
      <Card title="Bonifikace mRS-90 (ikty)" subtitle="BON = 0,05 · CZS · CM_CMP, pokud je u ≥ 90 % pacientů s CMP (DRG 01-K10-01 až 06) vykázán kód mRS při propuštění i po 90 dnech.">
        <FieldGrid columns={3}>
          <NumberField label="CM_CMP,2027 (iktové případy)" value={sep.cmCmp} onChange={(v) => set({ cmCmp: v })} unit="CM" />
          <ToggleField label="Podmínka vykázání mRS splněna" checked={sep.mrsMet} onChange={(v) => set({ mrsMet: v })} />
        </FieldGrid>
      </Card>
      <StepsTable steps={result.steps} />
    </>
  )
}

export function Under50Page() {
  const { scenario, patch } = useScenario()
  const { under50: u, common, params } = scenario
  const result = useMemo(() => computeUnder50(u, common, params), [u, common, params])
  const set = (partial: Partial<typeof u>) => patch('under50', partial)

  return (
    <>
      <PageHeader
        title="Poskytovatelé s méně než 50 případy"
        lead="Příloha č. 1, část A, bod 6. Bez individuálního paušálu a bez indexu I_ZP – veškerá péče se hradí na sazbě ZS_pod50 = CZS · NM_PP, u skupin B–G opět s výběrem vyššího z ocenění JPL a CZ-DRG."
      />
      <Summary
        items={[
          { label: 'Úhr_pod50,2027', value: fmtCzk(result.uhr), tone: 'result' },
          { label: 'ZS_pod50', value: fmtCzk(result.zsPod50), hint: 'CZS · NM_PP' },
        ]}
      />
      <CommonPanel />
      <Card title="Produkce hodnoceného období">
        <FieldGrid columns={3}>
          <NumberField label="CM skupin A, D" value={u.cmAD} onChange={(v) => set({ cmAD: v })} unit="CM" />
          <NumberField label="CM skupiny H (psychiatrie)" value={u.cmH} onChange={(v) => set({ cmH: v })} unit="CM" />
          <NumberField label="CM případů s povinným JPL" value={u.cmPovinneJpl} onChange={(v) => set({ cmPovinneJpl: v })} unit="CM" />
          <NumberField label="EM_pod50,2027" value={u.em} onChange={(v) => set({ em: v })} unit="Kč" step={10_000} />
        </FieldGrid>
        <h3 className="subheading">Skupiny B, C, E, F, G – nepovinné JPL</h3>
        <GroupRowsEditor rows={u.rows} onChange={(rows) => set({ rows })} idPrefix="u50" />
        {u.cmH > 0 && (
          <>
            <h3 className="subheading">Koeficient duševního zdraví K_DZ</h3>
            <KdzFields value={u.kdz} onChange={(kdz) => set({ kdz })} />
          </>
        )}
        <Callout kind="info">Pro malé poskytovatele se u skupin B–G porovnává JPL oceněné centrální sazbou proti CZ-DRG oceněnému sazbou ZS_pod50.</Callout>
      </Card>
      <StepsTable steps={result.steps} />
    </>
  )
}

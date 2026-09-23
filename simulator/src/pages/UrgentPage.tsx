import { useMemo } from 'react'
import { Callout, Card, FieldGrid, NumberField, SelectField, ToggleField } from '../components/fields'
import { SensitivityChart } from '../components/SensitivityChart'
import { StepsTable } from '../components/StepsTable'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtMio } from '../lib/format'
import { range } from '../model/all'
import { CKP_LABELS, computeUrgent, PALLIATIVE_LABELS, URG_TIER_LABELS, type CkpVariant, type PalliativeTeam, type UrgTier } from '../model/urgent'
import { useScenario } from '../state/ScenarioContext'

export function UrgentPage() {
  const { scenario, patch } = useScenario()
  const { urgent, params } = scenario
  const result = useMemo(() => computeUrgent(urgent, params), [urgent, params])
  const set = (partial: Partial<typeof urgent>) => patch('urgent', partial)

  const chart = useMemo(() => {
    const total = urgent.pbUrg + urgent.pbLps + urgent.pbKv + urgent.kpUrg
    return range(0.5, 3, 50).map((r) => {
      const scaled = { ...urgent, pbUrg: urgent.pbUrg * r, pbLps: urgent.pbLps * r, pbKv: urgent.pbKv * r, kpUrg: urgent.kpUrg * r }
      const out: Record<string, number> = { r: total * r }
      for (const tier of ['I', 'II', 'III', 'none'] as UrgTier[]) out[tier] = computeUrgent({ ...scaled, tier }, params).vykonyUrg
      return out
    })
  }, [urgent, params])

  const ernRows = urgent.ern
  const setErn = (i: number, partial: Partial<(typeof ernRows)[number]>) => set({ ern: ernRows.map((x, j) => (j === i ? { ...x, ...partial } : x)) })

  return (
    <>
      <PageHeader
        title="Urgentní příjem, LPS, ZZS a ostatní paušály"
        lead="Příloha č. 1, část A, body 8 a 9. Úhrada urgentního příjmu = K·(paušál podle typu + bonifikace psychiatrické krizové péče) + výkonová složka 0,60 Kč/bod s horní hranicí; k tomu 1 000 Kč za převzetí od ZZS, paušály LPS, ERN, paliativní tým, centrum provázení."
      />
      <Summary
        items={[
          { label: 'Celkem body 8 + 9', value: fmtCzk(result.total), tone: 'result' },
          { label: 'Úhrada urgentního příjmu', value: fmtCzk(result.uhrUrg), hint: `paušál ${fmtMio(result.pausalUrg)} · výkony ${fmtMio(result.vykonyUrg)}${result.vykonyCapped ? ' (limit)' : ''}`, tone: result.vykonyCapped ? 'warning' : 'neutral' },
          { label: 'LPS + příjem od ZZS', value: fmtCzk(result.pausalLps + result.prijemZzs) },
          { label: 'Ostatní (ERN, paliativa…)', value: fmtCzk(result.otherTotal) },
        ]}
      />

      <Card title="Urgentní příjem">
        <FieldGrid columns={3}>
          <SelectField<UrgTier> label="Typ urgentního příjmu (paušál)" value={urgent.tier} onChange={(v) => set({ tier: v })} options={(Object.keys(URG_TIER_LABELS) as UrgTier[]).map((k) => ({ value: k, label: URG_TIER_LABELS[k] }))} />
          <NumberField label="K – podíl pojištěnců ZP (okres/region)" value={urgent.k} onChange={(v) => set({ k: v })} step={0.01} min={0} max={1} help="Příloha č. 9; násobí paušály i limit výkonové složky." />
          <SelectField<CkpVariant> label="Psychiatrická krizová péče" value={urgent.ckp} onChange={(v) => set({ ckp: v })} options={(Object.keys(CKP_LABELS) as CkpVariant[]).map((k) => ({ value: k, label: CKP_LABELS[k] }))} help="Jen traumacentra s akutní psychiatrickou lůžkovou péčí." />
          <ToggleField label="Výpadek provozu > 72 h (krácení 50 %)" checked={urgent.outage} onChange={(v) => set({ outage: v })} />
          <ToggleField label="LPS pro dospělé (2 mil. × K)" checked={urgent.lpsAdults} onChange={(v) => set({ lpsAdults: v })} />
          <ToggleField label="LPS pro děti a dorost (2 mil. × K)" checked={urgent.lpsChildren} onChange={(v) => set({ lpsChildren: v })} help="Jen poskytovatel s dětským oddělením akutní lůžkové péče." />
        </FieldGrid>
        <FieldGrid columns={4}>
          <NumberField label="PB_urg (06720–06729)" value={urgent.pbUrg} onChange={(v) => set({ pbUrg: v })} unit="bodů" step={100_000} />
          <NumberField label="PB_LPS" value={urgent.pbLps} onChange={(v) => set({ pbLps: v })} unit="bodů" step={100_000} />
          <NumberField label="PB_KV (klinická vyšetření v den UP)" value={urgent.pbKv} onChange={(v) => set({ pbKv: v })} unit="bodů" step={100_000} />
          <NumberField label="KP_urg (korunové položky)" value={urgent.kpUrg} onChange={(v) => set({ kpUrg: v })} unit="Kč" step={100_000} />
          <NumberField label="Počet výkonů 09564 (převzetí od ZZS)" value={urgent.count09564} onChange={(v) => set({ count09564: v })} />
        </FieldGrid>
        <Callout kind="info">
          Limit výkonové složky: K × 165 / 100 / 60 mil. Kč podle typu I–III; poskytovatel bez paušální složky má K × 10 mil. Kč. Typ IV nastává i při méně než 3 650 výkonech 06720 a zároveň méně než 5 000 výkonech 09564 za všechny pojišťovny (pokud smlouva pro UP nebyla uzavřena od 1. 1. 2026).
        </Callout>
      </Card>

      <Card title="Ostatní úhrady (bod 9)">
        <FieldGrid columns={3}>
          <NumberField label="K_region (ERN, provázení)" value={urgent.kRegion} onChange={(v) => set({ kRegion: v })} step={0.01} min={0} max={1} help="Příloha č. 9, bod 2 – podíl pojištěnců ZP v regionu." />
          <SelectField<PalliativeTeam> label="Konziliární tým paliativní péče" value={urgent.palliativeTeam} onChange={(v) => set({ palliativeTeam: v })} options={(Object.keys(PALLIATIVE_LABELS) as PalliativeTeam[]).map((k) => ({ value: k, label: PALLIATIVE_LABELS[k] }))} />
          <NumberField label="Počet výkonů 78890 (12 500 Kč)" value={urgent.count78890} onChange={(v) => set({ count78890: v })} />
          <ToggleField label="Komplexní onkologické centrum" checked={urgent.oncoCentre} onChange={(v) => set({ oncoCentre: v })} help="250 Kč za výkon 51887." />
          <NumberField label="Počet výkonů 51887" value={urgent.count51887} onChange={(v) => set({ count51887: v })} />
          <ToggleField label="Centrum provázení (2,0 úv. ZS pracovníka)" checked={urgent.centrumProvazeni} onChange={(v) => set({ centrumProvazeni: v })} />
          <NumberField label="Ukončená provázení dětí < 19 let" value={urgent.provazeniChildren} onChange={(v) => set({ provazeniChildren: v })} help="+3 000 Kč za každé." />
          <NumberField label="Dny OD 00031 a 00032" value={urgent.od3132Days} onChange={(v) => set({ od3132Days: v })} help="582 Kč za ošetřovací den, mimo paušál (bod 1.3)." />
          <NumberField label="Body odbornosti 005" value={urgent.points005} onChange={(v) => set({ points005: v })} step={10_000} help="Hodnota bodu 1,04 Kč (bod 9.2)." />
        </FieldGrid>
      </Card>

      <Card
        title="Evropské referenční sítě (ERN)"
        actions={
          <button type="button" className="btn btn--secondary" onClick={() => set({ ern: [...ernRows, { id: `ern${Date.now()}`, name: `ERN ${ernRows.length + 1}`, uop: 0 }] })}>
            Přidat síť
          </button>
        }
      >
        <ToggleField label="Poskytovatel je členem ERN" checked={urgent.ernMember} onChange={(v) => set({ ernMember: v })} />
        <div className="table-wrap">
          <table className="table table--editable">
            <thead>
              <tr>
                <th>Referenční síť</th>
                <th>UOP_i (unikátní pojištěnci s výkonem 99976)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ernRows.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <input type="text" value={r.name} onChange={(e) => setErn(i, { name: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" min={0} value={r.uop} onChange={(e) => setErn(i, { uop: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <button type="button" className="btn btn--ghost" onClick={() => set({ ern: ernRows.filter((_, j) => j !== i) })} aria-label="Odebrat">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">ERN = K · Σ_i [8,5 mil. + 1,5 mil. · n · UOP_i / UOP] + 126 Kč · UOP. Vážený člen se v součtu vždy sečte na n · 1,5 mil. – rozdělení mezi sítě nemění celkovou částku.</p>
      </Card>

      <Card title="Citlivost: výkonová složka podle objemu bodů a typu urgentního příjmu" subtitle="Výkonová složka = min[0,6 · (body + KP); K · limit]. Osa x = celkový objem bodů a korunových položek.">
        <SensitivityChart
          data={chart}
          xKey="r"
          xLabel="PB_urg + PB_LPS + PB_KV + KP"
          xFormatter={fmtMio}
          series={[
            { key: 'I', name: 'Typ I (limit 165 mil.)' },
            { key: 'II', name: 'Typ II (100 mil.)' },
            { key: 'III', name: 'Typ III (60 mil.)' },
            { key: 'none', name: 'Bez paušálu (10 mil.)', dashed: true },
          ]}
          yFormatter={fmtMio}
          marker={urgent.pbUrg + urgent.pbLps + urgent.pbKv + urgent.kpUrg}
        />
      </Card>

      <StepsTable steps={result.steps} />
    </>
  )
}

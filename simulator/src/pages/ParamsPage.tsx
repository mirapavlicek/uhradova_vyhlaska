import { Callout, Card, FieldGrid, NumberField } from '../components/fields'
import { PageHeader } from '../components/Summary'
import { DEFAULT_PARAMS, type DecreeParams } from '../model/params'
import { useScenario } from '../state/ScenarioContext'

export function ParamsPage() {
  const { scenario, update } = useScenario()
  const p = scenario.params

  const setP = (partial: Partial<DecreeParams>) => update((s) => ({ ...s, params: { ...s.params, ...partial } }))
  const setNested = <K extends 'zsMin' | 'nm' | 'kn' | 'kdz' | 'izpAmb'>(key: K, partial: Partial<DecreeParams[K]>) =>
    update((s) => ({ ...s, params: { ...s.params, [key]: { ...s.params[key], ...partial } } }))
  const setGroup = (id: string, partial: { inu?: number; ics?: number }) =>
    setP({ clGroups: p.clGroups.map((g) => (g.id === id ? { ...g, ...partial } : g)) })
  const resetParams = () => setP(structuredClone(DEFAULT_PARAMS))

  const changed = JSON.stringify(p) !== JSON.stringify(DEFAULT_PARAMS)

  return (
    <>
      <PageHeader
        title="Parametry vyhlášky"
        lead="Číselné konstanty návrhu ÚV 2027. Úpravou lze modelovat alternativní nastavení vyhlášky (např. jinou centrální sazbu nebo toleranci poklesu) – všechny moduly se přepočítají okamžitě."
      >
        <button type="button" className="btn btn--secondary" onClick={resetParams} disabled={!changed}>
          Obnovit hodnoty z návrhu
        </button>
      </PageHeader>
      {changed && <Callout kind="warning">Parametry se liší od návrhu vyhlášky – výsledky odpovídají vaší modelaci, nikoli předloženému textu.</Callout>}

      <Card title="Akutní lůžková péče – sazby a koridor">
        <FieldGrid columns={4}>
          <NumberField label="CZS_CZ-DRG,2027" value={p.czs} onChange={(v) => setP({ czs: v })} unit="Kč" step={500} />
          <NumberField label="CZS při proočkovanosti" value={p.czsVaccinated} onChange={(v) => setP({ czsVaccinated: v })} unit="Kč" step={500} />
          <NumberField label="Růst individuálního paušálu" value={p.puGrowth} onChange={(v) => setP({ puGrowth: v })} step={0.005} help="IPU = PU_2025,A · růst + PU_2027,D" />
          <NumberField label="Tolerance poklesu" value={p.declineTolerance} onChange={(v) => setP({ declineTolerance: v })} step={0.005} help="min{1; r / tolerance}" />
          <NumberField label="MAX_2025,PU" value={p.zsMaxCap} onChange={(v) => setP({ zsMaxCap: v })} unit="Kč" step={1000} />
          <NumberField label="Váha MAX v ZS_max" value={p.zsMaxCapWeight} onChange={(v) => setP({ zsMaxCapWeight: v })} step={0.05} min={0} max={1} />
          <NumberField label="ZS_min – ref. síť + urgent" value={p.zsMin.refNetUrg} onChange={(v) => setNested('zsMin', { refNetUrg: v })} unit="Kč" step={500} />
          <NumberField label="ZS_min – urgentní příjem" value={p.zsMin.urg} onChange={(v) => setNested('zsMin', { urg: v })} unit="Kč" step={500} />
          <NumberField label="ZS_min – ostatní" value={p.zsMin.other} onChange={(v) => setNested('zsMin', { other: v })} unit="Kč" step={500} />
        </FieldGrid>
      </Card>

      <Card title="Nákladové modifikátory a redukce casemixu">
        <FieldGrid columns={4}>
          <NumberField label="Prah CMI" value={p.cmiThreshold} onChange={(v) => setP({ cmiThreshold: v })} step={0.1} />
          <NumberField label="NM_PU,D" value={p.nm.puD} onChange={(v) => setNested('nm', { puD: v })} step={0.01} />
          <NumberField label="NM_PP" value={p.nm.pp} onChange={(v) => setNested('nm', { pp: v })} step={0.01} />
          <NumberField label="NM_CE (CMI > prah)" value={p.nm.ceHighCmi} onChange={(v) => setNested('nm', { ceHighCmi: v })} step={0.01} />
          <NumberField label="NM_CE (ref. síť, ≥ 6 statusů)" value={p.nm.ceRefNet6} onChange={(v) => setNested('nm', { ceRefNet6: v })} step={0.01} />
          <NumberField label="NM_CE (trauma + ≥ 4 statusy)" value={p.nm.ceTrauma4} onChange={(v) => setNested('nm', { ceTrauma4: v })} step={0.01} />
          <NumberField label="X – větší pojišťovna" value={p.xLargeInsurer} onChange={(v) => setP({ xLargeInsurer: v })} step={0.01} />
          <NumberField label="X – menší pojišťovna" value={p.xSmallInsurer} onChange={(v) => setP({ xSmallInsurer: v })} step={0.01} />
          <NumberField label="Prah podílu pojištěnců pro X" value={p.xInsurerThreshold} onChange={(v) => setP({ xInsurerThreshold: v })} step={0.01} />
          <NumberField label="Prah podílu překladů" value={p.transferShareThreshold} onChange={(v) => setP({ transferShareThreshold: v })} step={0.005} />
          <NumberField label="Floor mediánu LOS (psychiatrie)" value={p.losFloor} onChange={(v) => setP({ losFloor: v })} unit="dní" />
          <NumberField label="Výchozí LOS nového poskytovatele" value={p.losDefault} onChange={(v) => setP({ losDefault: v })} unit="dní" />
          <NumberField label="BON_mRS-90 (podíl)" value={p.bonMrs} onChange={(v) => setP({ bonMrs: v })} step={0.01} />
          <NumberField label="Příplatek dětská onkologie" value={p.childrenBonus} onChange={(v) => setP({ childrenBonus: v })} step={0.05} />
        </FieldGrid>
      </Card>

      <Card title="Koeficient duševního zdraví K_DZ">
        <FieldGrid columns={4}>
          <NumberField label="KP_krit – splněno" value={p.kdz.kpKritOk} onChange={(v) => setNested('kdz', { kpKritOk: v })} step={0.01} />
          <NumberField label="KP_krit – nesplněno" value={p.kdz.kpKritFail} onChange={(v) => setNested('kdz', { kpKritFail: v })} step={0.01} />
          <NumberField label="K_CDZ (odb. 350/360/370/922)" value={p.kdz.cdzStandard} onChange={(v) => setNested('kdz', { cdzStandard: v })} step={0.01} />
          <NumberField label="K_CDZ (odb. 355)" value={p.kdz.cdzOdb355} onChange={(v) => setNested('kdz', { cdzOdb355: v })} step={0.01} />
          <NumberField label="K_DS (výkon 00043)" value={p.kdz.ds00043} onChange={(v) => setNested('kdz', { ds00043: v })} step={0.01} />
          <NumberField label="K_DS (00041/00042)" value={p.kdz.dsOther} onChange={(v) => setNested('kdz', { dsOther: v })} step={0.01} />
          <NumberField label="K_TransNLP – základ" value={p.kdz.transBase} onChange={(v) => setNested('kdz', { transBase: v })} step={0.01} />
          <NumberField label="K_TransNLP – podíl pod odmocninou" value={p.kdz.transRootShare} onChange={(v) => setNested('kdz', { transRootShare: v })} step={0.05} />
          <NumberField label="K_TransNLP – strop min[…]" value={p.kdz.transCap} onChange={(v) => setNested('kdz', { transCap: v })} step={0.05} />
          <NumberField label="K_TransNLP – jmenovatel" value={p.kdz.transDenominator} onChange={(v) => setNested('kdz', { transDenominator: v })} step={0.05} />
        </FieldGrid>
      </Card>

      <Card title="Ambulantní složka nemocnic">
        <FieldGrid columns={4}>
          <NumberField label="KN laboratoře" value={p.kn.lab} onChange={(v) => setNested('kn', { lab: v })} step={0.005} />
          <NumberField label="KN radiodiagnostika" value={p.kn.rad} onChange={(v) => setNested('kn', { rad: v })} step={0.005} />
          <NumberField label="KN ostatní ambulance" value={p.kn.ost} onChange={(v) => setNested('kn', { ost: v })} step={0.005} />
          <NumberField label="Váha Úhr_amb_2025 v ref. základu" value={p.ambRefBlend} onChange={(v) => setP({ ambRefBlend: v })} step={0.05} min={0} max={1} />
          <NumberField label="Požadovaný podíl růstu GAUP" value={p.izpAmb.gaupShare} onChange={(v) => setNested('izpAmb', { gaupShare: v })} step={0.05} help="IZ_GAUP = (ΔGAUP) / (podíl · ΔHP)" />
        </FieldGrid>
        <p className="muted">Konstanty ARCTG indexů se editují na stránce Indexy.</p>
      </Card>

      <Card title="Centrové léky – indexy INU a ICS podle skupin (příloha č. 15, bod 5)">
        <div className="table-wrap">
          <table className="table table--editable">
            <thead>
              <tr>
                <th>Skupina</th>
                <th>Index navýšení úhrady (INU)</th>
                <th>Index cenové slevy (ICS)</th>
              </tr>
            </thead>
            <tbody>
              {p.clGroups.map((g) => (
                <tr key={g.id}>
                  <td>
                    {g.id}) {g.name}
                  </td>
                  <td>
                    <input type="number" step={0.01} min={0} value={g.inu} onChange={(e) => setGroup(g.id, { inu: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td>
                    <input type="number" step={0.01} min={0} value={g.ics} onChange={(e) => setGroup(g.id, { ics: parseFloat(e.target.value) || 0 })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

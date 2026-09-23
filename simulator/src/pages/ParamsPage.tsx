import { Callout, Card, FieldGrid, NumberField } from '../components/fields'
import { PageHeader } from '../components/Summary'
import { DEFAULT_PARAMS, type DecreeParams } from '../model/params'
import { useScenario } from '../state/ScenarioContext'

type ObjectKeys = { [K in keyof DecreeParams]: DecreeParams[K] extends object ? K : never }[keyof DecreeParams]
type NumericKeys<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T]

interface FieldDef<T> {
  key: NumericKeys<T>
  label: string
  step?: number
  unit?: string
  help?: string
}

export function ParamsPage() {
  const { scenario, update } = useScenario()
  const p = scenario.params

  const setP = (partial: Partial<DecreeParams>) => update((s) => ({ ...s, params: { ...s.params, ...partial } }))
  const setNested = <K extends ObjectKeys>(key: K, partial: Partial<DecreeParams[K]>) =>
    update((s) => ({ ...s, params: { ...s.params, [key]: { ...s.params[key], ...partial } } }))
  const setDeep = <K extends ObjectKeys, S extends keyof DecreeParams[K]>(key: K, sub: S, partial: Partial<DecreeParams[K][S]>) =>
    update((s) => ({ ...s, params: { ...s.params, [key]: { ...s.params[key], [sub]: { ...(s.params[key][sub] as object), ...partial } } } }))

  /** Karta s číselnými poli jednoho vnořeného objektu parametrů. */
  function section<K extends ObjectKeys>(key: K, fields: FieldDef<DecreeParams[K]>[]) {
    const obj = p[key]
    return fields.map((f) => (
      <NumberField
        key={String(f.key)}
        label={f.label}
        value={obj[f.key] as number}
        onChange={(v) => setNested(key, { [f.key]: v } as Partial<DecreeParams[K]>)}
        step={f.step ?? 1}
        unit={f.unit}
        help={f.help}
      />
    ))
  }
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

      <Card title="Urgentní příjem, LPS a příjem od ZZS (příloha č. 1, bod 8)">
        <FieldGrid columns={4}>
          {section('urgent', [
            { key: 'prijemZzs', label: 'Výkon 09564 – příjem od ZZS', unit: 'Kč', step: 50 },
            { key: 'lpsAdults', label: 'LPS pro dospělé', unit: 'Kč', step: 100_000 },
            { key: 'lpsChildren', label: 'LPS pro děti', unit: 'Kč', step: 100_000 },
            { key: 'vykonyShare', label: 'Podíl výkonů UP do limitu', step: 0.05, help: 'Podíl výkonové úhrady UP započítávaný proti limitu.' },
            { key: 'outageCut', label: 'Krácení paušálu při výpadku provozu', step: 0.05 },
            { key: 'ckpRoom', label: 'CKP – místnost', unit: 'Kč', step: 100_000 },
            { key: 'ckpWorkplace', label: 'CKP – pracoviště', unit: 'Kč', step: 100_000 },
          ])}
          <NumberField label="Paušál UP I. typu" value={p.urgent.pausal.I} onChange={(v) => setDeep('urgent', 'pausal', { I: v })} unit="Kč" step={1_000_000} />
          <NumberField label="Paušál UP II. typu" value={p.urgent.pausal.II} onChange={(v) => setDeep('urgent', 'pausal', { II: v })} unit="Kč" step={1_000_000} />
          <NumberField label="Paušál UP III. typu" value={p.urgent.pausal.III} onChange={(v) => setDeep('urgent', 'pausal', { III: v })} unit="Kč" step={500_000} />
          <NumberField label="Limit výkonů UP I." value={p.urgent.limit.I} onChange={(v) => setDeep('urgent', 'limit', { I: v })} unit="Kč" step={1_000_000} />
          <NumberField label="Limit výkonů UP II." value={p.urgent.limit.II} onChange={(v) => setDeep('urgent', 'limit', { II: v })} unit="Kč" step={1_000_000} />
          <NumberField label="Limit výkonů UP III." value={p.urgent.limit.III} onChange={(v) => setDeep('urgent', 'limit', { III: v })} unit="Kč" step={1_000_000} />
          <NumberField label="Limit výkonů UP IV." value={p.urgent.limit.IV} onChange={(v) => setDeep('urgent', 'limit', { IV: v })} unit="Kč" step={500_000} />
        </FieldGrid>
      </Card>

      <Card title="ERN a další pevné úhrady nemocnic (bod 9)">
        <FieldGrid columns={4}>
          <NumberField label="ERN – za síť" value={p.other.ern.perNetwork} onChange={(v) => setDeep('other', 'ern', { perNetwork: v })} unit="Kč" step={100_000} />
          <NumberField label="ERN – variabilní část za síť" value={p.other.ern.perNetworkVariable} onChange={(v) => setDeep('other', 'ern', { perNetworkVariable: v })} unit="Kč" step={100_000} />
          <NumberField label="ERN – za unikátního pojištěnce" value={p.other.ern.perUop} onChange={(v) => setDeep('other', 'ern', { perUop: v })} unit="Kč" />
          {section('other', [
            { key: 'palliativeTeamFull', label: 'Paliativní tým – plný', unit: 'Kč', step: 50_000 },
            { key: 'palliativeTeamReduced', label: 'Paliativní tým – redukovaný', unit: 'Kč', step: 50_000 },
            { key: 'onco51887', label: 'Výkon 51887 (onkologie)', unit: 'Kč', step: 10 },
            { key: 'centrumProvazeni', label: 'Centrum provázení', unit: 'Kč', step: 100_000 },
            { key: 'provazeniPerChild', label: 'Provázení – za dítě', unit: 'Kč', step: 100 },
            { key: 'vykon78890', label: 'Výkon 78890', unit: 'Kč', step: 500 },
          ])}
        </FieldGrid>
      </Card>

      <Card title="Následná lůžková péče (příloha č. 1, část B)">
        <FieldGrid columns={4}>
          {section('aftercare', [
            { key: 'zknHigh', label: 'ZKN při splnění kritéria', step: 0.005 },
            { key: 'zknBase', label: 'ZKN základní', step: 0.005 },
            { key: 'criterion', label: 'Kritérium (podíl)', step: 0.001 },
            { key: 'transShare', label: 'Podíl transformačního plánu', step: 0.05 },
            { key: 'accreditation', label: 'KN akreditace', step: 0.005 },
            { key: 'palliativeDoctor', label: 'KN paliativní lékař', step: 0.005 },
            { key: 'geriatrician', label: 'KN geriatr', step: 0.005 },
            { key: 'children12', label: 'KN děti do 12 let', step: 0.05 },
            { key: 'children6', label: 'KN děti do 6 let', step: 0.05 },
            { key: 'geriCap', label: 'BON_Geri – strop', step: 0.01 },
            { key: 'geriMultiplier', label: 'BON_Geri – násobitel', step: 1 },
            { key: 'msShare', label: 'Podíl mimořádně nákladných', step: 0.01 },
            { key: 'u572', label: 'Navýšení OD 00005 (U572)', step: 0.005 },
            { key: 'u572PerDay', label: 'Příplatek U572 za den', unit: 'Kč' },
          ])}
          <NumberField label="HB OD 00015" value={p.aftercare.hb.od00015} onChange={(v) => setDeep('aftercare', 'hb', { od00015: v })} step={0.01} />
          <NumberField label="HB OD 00017" value={p.aftercare.hb.od00017} onChange={(v) => setDeep('aftercare', 'hb', { od00017: v })} step={0.01} />
          <NumberField label="HB OD 00020" value={p.aftercare.hb.od00020} onChange={(v) => setDeep('aftercare', 'hb', { od00020: v })} step={0.01} />
          <NumberField label="HB OD 00033" value={p.aftercare.hb.od00033} onChange={(v) => setDeep('aftercare', 'hb', { od00033: v })} step={0.01} />
          <NumberField label="HB OD 00018" value={p.aftercare.hb.od00018} onChange={(v) => setDeep('aftercare', 'hb', { od00018: v })} step={0.01} />
        </FieldGrid>
      </Card>

      <Card title="Regulační omezení – léčiva, ZULP, vyžádaná péče">
        <FieldGrid columns={4}>
          {section('regulation', [
            { key: 'drugsThreshold', label: 'Prah léčiv a ZP', step: 0.01, help: '1,15 = 115 % referenčního průměru' },
            { key: 'requestedThreshold', label: 'Prah vyžádané péče', step: 0.01 },
            { key: 'zulpThreshold', label: 'Prah ZULP/ZUM', step: 0.01 },
            { key: 'stepPct', label: 'Krok překročení', step: 0.001, help: '0,005 = 0,5 procentního bodu' },
            { key: 'ratePerStep', label: 'Srážka za krok', step: 0.005 },
            { key: 'maxShare', label: 'Max. podíl srážky z překročení', step: 0.05 },
            { key: 'capShare', label: 'Strop srážky z úhrady', step: 0.01 },
            { key: 'gpThreshold', label: 'Praktici – prah léčiv', step: 0.01 },
            { key: 'gpRequestedThreshold', label: 'Praktici – prah vyžádané péče', step: 0.01 },
            { key: 'gpRate', label: 'Praktici – sazba srážky', step: 0.05 },
          ])}
        </FieldGrid>
      </Card>

      <Card title="Ambulantní specialisté, fyzioterapie, domácí a paliativní péče (přílohy č. 3, 6, 7)">
        <FieldGrid columns={4}>
          {section('specialists', [
            { key: 'hbBase', label: 'Specialisté – základní HB', step: 0.01, unit: 'Kč' },
            { key: 'baseCoef', label: 'Specialisté – koeficient růstu maxima', step: 0.01 },
            { key: 'hbMin', label: 'Specialisté – min. HB pro PURO', step: 0.01, unit: 'Kč' },
            { key: 'exemptUp', label: 'Specialisté – max. se neuplatní do UP', help: 'Přepočítává se podle úvazku n/30.' },
          ])}
          {section('physio', [
            { key: 'hbBase', label: '902 – základní HB', step: 0.01, unit: 'Kč' },
            { key: 'baseCoef', label: '902 – koeficient růstu maxima', step: 0.01 },
            { key: 'hbMin', label: '902 – min. HB pro PURO', step: 0.01, unit: 'Kč' },
            { key: 'exemptUp', label: '902 – max. se neuplatní do UP' },
            { key: 'earlyBase', label: '902 – bonus včasného zahájení', unit: 'Kč', step: 50 },
            { key: 'earlyWindow', label: '902 – okno bonusu', unit: 'dní' },
            { key: 'earlyMaxDays', label: '902 – max. dnů pro bonus', unit: 'dní' },
          ])}
          {section('homecare', [
            { key: 'hb925', label: '925 – HB', step: 0.01, unit: 'Kč' },
            { key: 'hb916', label: '916 – HB', step: 0.01, unit: 'Kč' },
            { key: 'baseCoef', label: '925/916 – koeficient růstu maxima', step: 0.01 },
            { key: 'exemptUp', label: '925/916 – max. se neuplatní do UP' },
            { key: 'hb926', label: '926 – HB', step: 0.01, unit: 'Kč' },
            { key: 'days926Adult', label: '926 – limit dnů dospělí', unit: 'dní' },
            { key: 'days926Child', label: '926 – limit dnů děti', unit: 'dní' },
            { key: 'hb913', label: '913 – HB', step: 0.01, unit: 'Kč' },
            { key: 'growth913', label: '913 – růst PMUP', step: 0.01 },
            { key: 'hbMin913', label: '913 – min. HB', step: 0.01, unit: 'Kč' },
          ])}
        </FieldGrid>
      </Card>

      <Card title="Praktičtí lékaři (příloha č. 2)">
        <FieldGrid columns={4}>
          <NumberField label="Kapitační sazba a) 35 h" value={p.gp.rate.a} onChange={(v) => setDeep('gp', 'rate', { a: v })} unit="Kč" />
          <NumberField label="Kapitační sazba b) 30 h" value={p.gp.rate.b} onChange={(v) => setDeep('gp', 'rate', { b: v })} unit="Kč" />
          <NumberField label="Kapitační sazba c) odb. 001" value={p.gp.rate.c001} onChange={(v) => setDeep('gp', 'rate', { c001: v })} unit="Kč" />
          <NumberField label="Kapitační sazba c) odb. 002" value={p.gp.rate.c002} onChange={(v) => setDeep('gp', 'rate', { c002: v })} unit="Kč" />
          {section('gp', [
            { key: 'bonusEducation', label: 'Bonus vzdělávání', unit: 'Kč', step: 0.5 },
            { key: 'bonusPrevention', label: 'Bonus prevence', unit: 'Kč', step: 0.5 },
            { key: 'bonusAccreditation', label: 'Bonus akreditace', unit: 'Kč', step: 0.5 },
            { key: 'hbPrevention001', label: 'HB prevence 001', step: 0.01, unit: 'Kč' },
            { key: 'hbPrevention002', label: 'HB prevence 002', step: 0.01, unit: 'Kč' },
            { key: 'hbSelected', label: 'HB vybrané výkony', step: 0.01, unit: 'Kč' },
            { key: 'hbOther', label: 'HB ostatní výkony', step: 0.01, unit: 'Kč' },
            { key: 'hbEducation', label: 'HB navýšení vzdělávání', step: 0.01, unit: 'Kč' },
            { key: 'hbExtendedHours', label: 'HB navýšení rozšířené hodiny', step: 0.01, unit: 'Kč' },
            { key: 'episode', label: 'Epizoda péče', unit: 'Kč', step: 5 },
            { key: 'pocusBonus', label: 'POCUS – bonus', unit: 'Kč', step: 500 },
            { key: 'pocusMin', label: 'POCUS – min. výkonů' },
            { key: 'teamPerTenth', label: 'Týmová praxe za 0,1 úvazku', unit: 'Kč', step: 100 },
            { key: 'nurseShort', label: 'Sestra – krátká návštěva', unit: 'Kč' },
            { key: 'nurseLong', label: 'Sestra – dlouhá návštěva', unit: 'Kč' },
            { key: 'nurseMonthly', label: 'Sestra – měsíční paušál', unit: 'Kč', step: 500 },
            { key: 'nurseMin', label: 'Sestra – min. výkonů' },
          ])}
        </FieldGrid>
      </Card>

      <Card title="Gynekologie (příloha č. 4)">
        <FieldGrid columns={4}>
          {section('gyn', [
            { key: 'monthly', label: 'Měsíční sazba za pojištěnku', unit: 'Kč' },
            { key: 'bonusEducation', label: 'Bonus vzdělávání', unit: 'Kč' },
            { key: 'bonusHours', label: 'Bonus ordinační hodiny', unit: 'Kč' },
            { key: 'bonusAccreditation', label: 'Bonus akreditace', unit: 'Kč' },
            { key: 'bonusAccreditationActive', label: 'Bonus akreditace se školencem', unit: 'Kč' },
            { key: 'bonusIso', label: 'Bonus ISO / kvalita', unit: 'Kč' },
            { key: 'bonusPrevention', label: 'Bonus prevence', unit: 'Kč' },
            { key: 'bonusTeam', label: 'Bonus týmová praxe', unit: 'Kč' },
            { key: 'bonusMidwife', label: 'Bonus porodní asistentka', unit: 'Kč' },
            { key: 'noUltrasoundFactor', label: 'Koeficient bez UZ', step: 0.05 },
            { key: 'infertility', label: 'Léčba neplodnosti', unit: 'Kč' },
            { key: 'episode', label: 'Epizoda péče', unit: 'Kč', step: 5 },
          ])}
          {p.gyn.trimester.map((v, i) => (
            <NumberField
              key={i}
              label={`${i + 1}. trimestr`}
              value={v}
              onChange={(nv) => setNested('gyn', { trimester: p.gyn.trimester.map((t, j) => (j === i ? nv : t)) as [number, number, number] })}
              unit="Kč"
              step={10}
            />
          ))}
        </FieldGrid>
      </Card>

      <Card title="Následná péče – pevné sazby, ostatní úhrady nemocnic">
        <FieldGrid columns={4}>
          <NumberField label="Růst sazeb OD 00031/32/98/99" value={p.aftercare.contractGrowth} onChange={(v) => setNested('aftercare', { contractGrowth: v })} step={0.005} />
          {(['v09535', 'v09536', 'v09537'] as const).map((k) => (
            <NumberField key={k} label={`Výkon ${k.slice(1)}`} value={p.aftercare.fees[k]} onChange={(v) => setDeep('aftercare', 'fees', { [k]: v })} unit="Kč" />
          ))}
          {(['od00090', 'od00091'] as const).flatMap((od) =>
            p.aftercare.od9091[od].map((v, i) => (
              <NumberField
                key={od + i}
                label={`OD ${od.slice(2)} – kategorie ${i + 3}`}
                value={v}
                onChange={(nv) => setDeep('aftercare', 'od9091', { [od]: p.aftercare.od9091[od].map((x, j) => (j === i ? nv : x)) as [number, number, number] })}
                unit="Kč"
              />
            )),
          )}
          {section('other', [
            { key: 'od3132Rate', label: 'OD 00031/00032 u akutní péče', unit: 'Kč' },
            { key: 'hb005', label: 'HB odbornosti 005', step: 0.01, unit: 'Kč' },
          ])}
          {section('homecare', [
            { key: 'hb914', label: 'HB odbornosti 914', step: 0.01, unit: 'Kč' },
            { key: 'hb921', label: 'HB odbornosti 921', step: 0.01, unit: 'Kč' },
            { key: 'transportHb', label: 'HB přepravy v návštěvní službě', step: 0.01, unit: 'Kč' },
          ])}
        </FieldGrid>
      </Card>

      <Card title="Zubní lékařství (příloha č. 11) a § 14–19">
        <FieldGrid columns={4}>
          {section('dental', [
            { key: 'capEducated', label: 'Agregovaná úhrada s dokladem vzdělávání', unit: 'Kč' },
            { key: 'capOther', label: 'Agregovaná úhrada ostatní', unit: 'Kč' },
            { key: 'addUnder6', label: 'Příplatek do 6 let', unit: 'Kč' },
            { key: 'add6to12', label: 'Příplatek 6–12 let', unit: 'Kč' },
            { key: 'add12to18', label: 'Příplatek 12–18 let', unit: 'Kč' },
          ])}
          {section('misc', [
            { key: 'zzsHb', label: 'ZZS/PPNP – HB', step: 0.01, unit: 'Kč' },
            { key: 'zzsTransportHb', label: 'ZZS – HB přepravy', step: 0.01, unit: 'Kč' },
            { key: 'zzs06714Hb', label: 'ZZS – HB výkonu 06714', step: 0.01, unit: 'Kč' },
            { key: 'zzsEpisode', label: 'ZZS – úhrada za epizodu', unit: 'Kč', step: 50 },
            { key: 'zdsNonstopHb', label: 'ZDS nonstop – HB', step: 0.01, unit: 'Kč' },
            { key: 'zdsNonstop40Hb', label: 'ZDS nonstop – HB výkonu 40', step: 0.01, unit: 'Kč' },
            { key: 'zdsHb', label: 'ZDS – HB', step: 0.01, unit: 'Kč' },
            { key: 'zds40Hb', label: 'ZDS – HB výkonu 40', step: 0.01, unit: 'Kč' },
            { key: 'zds69Hb', label: 'ZDS – HB výkonu 69', step: 0.01, unit: 'Kč' },
            { key: 'dentalEmergencyDay', label: 'Zubní pohotovost za den', unit: 'Kč', step: 100 },
            { key: 'pharmacyEmergencyDay', label: 'Lékárenská pohotovost za den', unit: 'Kč', step: 100 },
            { key: 'spaGrowth', label: 'Lázně – růst sazby 2026', step: 0.01 },
            { key: 'spa09543Hb', label: 'Lázně – HB výkonu 09543', step: 0.01, unit: 'Kč' },
            { key: 'ozdravovnaDay', label: 'Ozdravovna za den', unit: 'Kč', step: 10 },
            { key: 'hb09543', label: 'HB výkonu 09543', step: 0.01, unit: 'Kč' },
            { key: 'hb09555', label: 'HB výkonů 09555–09557', step: 0.01, unit: 'Kč' },
            { key: 'hb09580', label: 'HB výkonů 09580–09581', step: 0.01, unit: 'Kč' },
            { key: 'fee09990', label: 'Výkon 09990', unit: 'Kč' },
            { key: 'fee09552', label: 'Výkon 09552', unit: 'Kč' },
            { key: 'eRecipe', label: 'Převod receptu', unit: 'Kč' },
            { key: 'lateCoef', label: 'Koeficient pozdního vykázání (§ 2 odst. 4)', step: 0.01 },
          ])}
        </FieldGrid>
      </Card>

      <Card title="Měsíční předběžné úhrady – násobek úhrady referenčního období">
        <FieldGrid columns={4}>
          {section('advances', [
            { key: 'specialists', label: 'Ambulantní specialisté (příl. 3)', step: 0.01 },
            { key: 'rdg', label: 'Radiodiagnostika (příl. 5 bod 3)', step: 0.01 },
            { key: 'labs', label: 'Laboratoře (příl. 5 bod 1–2)', step: 0.01 },
            { key: 'odb913', label: 'Odbornost 913 (příl. 6 C)', step: 0.01 },
            { key: 'physio', label: 'Fyzioterapie (příl. 7)', step: 0.01 },
          ])}
        </FieldGrid>
      </Card>

      <Card title="Dialýza, laboratoře a radiodiagnostika (přílohy č. 5 a 8)">
        <FieldGrid columns={4}>
          {section('dialysis', [
            { key: 'hb', label: 'Dialýza – HB', step: 0.01, unit: 'Kč' },
            { key: 'hbLow', label: 'Dialýza – HB 18530/18550', step: 0.01, unit: 'Kč' },
            { key: 'qualityL1', label: 'Kvalita 1. úroveň', step: 0.01, unit: 'Kč' },
            { key: 'qualityL2', label: 'Kvalita 2. úroveň', step: 0.01, unit: 'Kč' },
            { key: 'homeBonus', label: 'Bonus domácí dialýza', step: 0.01, unit: 'Kč' },
            { key: 'homeShare', label: 'Prah podílu domácí dialýzy', step: 0.01 },
            { key: 'nMin', label: 'BON_TR – N_min', step: 0.005, unit: 'Kč' },
            { key: 'nMax', label: 'BON_TR – N_max', step: 0.005, unit: 'Kč' },
            { key: 'lt', label: 'BON_TR – dolní prah LT', step: 0.01 },
            { key: 'ht', label: 'BON_TR – horní prah HT', step: 0.01 },
          ])}
          {section('labs', [
            { key: 'kn809', label: 'RDG – KN 809', step: 0.01 },
            { key: 'knLabs', label: 'Laboratoře – KN', step: 0.01 },
            { key: 'kn816', label: 'Genetika 816 – KN', step: 0.01 },
            { key: 'hbMinShare', label: 'Laboratoře – min. podíl HB', step: 0.01 },
            { key: 'hbMinShare816', label: 'Genetika – min. podíl HB', step: 0.01 },
          ])}
        </FieldGrid>
      </Card>
    </>
  )
}

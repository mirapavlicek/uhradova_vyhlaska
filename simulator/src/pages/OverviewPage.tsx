import { useMemo } from 'react'
import { Card } from '../components/fields'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtNum, fmtPct } from '../lib/format'
import { computeAll } from '../model/all'
import type { SegmentId } from '../model/segments'
import { useScenario } from '../state/ScenarioContext'
import type { PageId } from '../routes'

interface ModuleCard {
  id: PageId
  segment?: SegmentId
  title: string
  value: number
  detail: string
  description: string
  negative?: boolean
}

export function OverviewPage({ go }: { go: (p: PageId) => void }) {
  const { scenario } = useScenario()
  const all = useMemo(() => computeAll(scenario), [scenario])

  const acute: ModuleCard[] = [
    {
      id: 'pu',
      title: 'Paušální úhrada (A, D)',
      value: all.pu.uhr,
      detail: `r = ${fmtIndex(all.pu.ratio)}, I_ZP = ${fmtIndex(all.pu.izp)}`,
      description: 'Individuální paušál z roku 2025 v koridoru sazeb, růst 3,5 %, degresivní úhrada nadprodukce.',
    },
    {
      id: 'separated',
      title: 'Vyčleněná úhrada (C, E)',
      value: all.sep.uhr,
      detail: `NM_CE = ${fmtIndex(all.sep.nmCe)}`,
      description: 'Vysoce specializovaná péče výkonově na centrální sazbě, koeficient centralizace, bonifikace mRS.',
    },
    {
      id: 'casePayment',
      title: 'Případový paušál (B, F, G, H)',
      value: all.pp.uhr,
      detail: `K_DZ = ${fmtIndex(all.pp.kdz)}`,
      description: 'Výkonová úhrada CZ-DRG, psychiatrie s koeficientem duševního zdraví a redukcí za zkrácení LOS.',
    },
  ]

  const hospital: ModuleCard[] = [
    {
      id: 'urgent',
      title: 'Urgentní příjem, LPS, ERN a paušály',
      value: all.urgent.total,
      detail: `urgent ${fmtMio(all.urgent.uhrUrgTotal)} · ERN ${fmtMio(all.urgent.ern)}${all.urgent.vykonyCapped ? ' · limit výkonů' : ''}`,
      description: 'Paušál podle typu UP, limit výkonové úhrady, příjem od ZZS, LPS, ERN, paliativní týmy a další pevné úhrady.',
    },
    {
      id: 'aftercare',
      title: 'Následná lůžková péče',
      value: all.aftercare.total,
      detail: `paušál ${fmtMio(all.aftercare.lumpTotal)} · BON_Geri ${fmtIndex(all.aftercare.bonGeri)}`,
      description: 'Paušální sazba za OD × ZKN × KN (personál, akreditace, děti, geriatrie), transformační plán, výkonová část.',
    },
    {
      id: 'oneDay',
      title: 'Jednodenní péče',
      value: all.oneDay.total,
      detail: `${scenario.oneDay.rows.length} položek`,
      description: 'Úhrada za výkon jednodenní péče pevnou částkou podle přílohy; odečet vyžádané extramurální péče.',
    },
    {
      id: 'amb',
      title: 'Ambulantní složka nemocnice',
      value: all.amb.total,
      detail: `I_zp_amb = ${fmtIndex(all.amb.radost.izpAmb)}`,
      description: 'Narovnání referenční úhrady k hodnotě péče, KN 4,5–7 %, růst vázaný na unikátní pojištěnce.',
    },
    {
      id: 'cl',
      title: 'Centrové léky',
      value: all.cl.uhr,
      detail: `r = ${fmtIndex(all.cl.ratio)}, IZP_CL = ${fmtIndex(all.cl.izpCl)}`,
      description: 'Referenční limit × INU × ICS vs. skutečnost × ICS, degresivní index se stropem 7,5 %.',
    },
    {
      id: 'hospitalReg',
      title: 'Regulace nemocnic',
      value: -all.hospitalReg.total,
      negative: true,
      detail: `revize ${fmtMio(all.hospitalReg.cmReductionCzk)} · ambulance ${fmtMio(all.hospitalReg.regulation.penalty)}`,
      description: 'Snížení casemixu po revizi (jednotlivé případy, vzorek 20 %/80 %), regulace léčiv a vyžádané péče ambulancí.',
    },
  ]

  const primary: ModuleCard[] = [
    {
      id: 'gp',
      title: 'Praktičtí lékaři',
      value: all.gp.total,
      detail: `kapitace ${fmtMio(all.gp.capitation)} · sazba ${fmtNum(all.gp.rate, 2)} Kč`,
      description: 'Kapitace podle věkových indexů s bonifikacemi, výkony, epizody, POCUS, týmová praxe, sestra v ordinaci, regulace.',
    },
    {
      id: 'gyn',
      title: 'Gynekologie',
      value: all.gyn.total,
      detail: `měsíční sazba ${fmtNum(all.gyn.monthlyRate, 2)} Kč · těhotenství ${fmtMio(all.gyn.pregnancy)}`,
      description: 'Agregovaná úhrada za registrované pojištěnky, trimestrální úhrady, léčba neplodnosti, epizody, regulace.',
    },
    {
      id: 'dental',
      title: 'Zubní lékařství',
      value: all.dental.total,
      detail: `agregovaná ${fmtMio(all.dental.capitation)} · výkony ${fmtMio(all.dental.services)}`,
      description: 'Agregovaná úhrada 24 / 22 Kč za registrovaného pojištěnce, ceník výkonů a výrobků přílohy č. 11.',
    },
  ]

  const misc: ModuleCard[] = [
    {
      id: 'other',
      title: 'ZZS, doprava, pohotovosti, lázně, lékárny',
      value: all.other.total,
      detail: `ZZS ${fmtMio(all.other.zzs)} · ZDS ${fmtMio(all.other.zds)} · lázně ${fmtMio(all.other.spa)}`,
      description: 'Pevné hodnoty bodu a paušály § 14–19, pohotovosti násobené K z přílohy č. 9, výkony 09543–09990.',
    },
  ]

  const ambulatory: ModuleCard[] = [
    {
      id: 'specialists',
      title: 'Ambulantní specialisté',
      value: all.specialists.total,
      detail: `HB ${fmtNum(all.specialists.hb, 2)} · KN ${fmtIndex(all.specialists.kn)}${all.specialists.puro.capped ? ' · strop' : ''}`,
      description: 'Výkonová úhrada s maximem (1,06 + KN)·POP·PURO_O a odstupňovanou regulací léčiv a vyžádané péče.',
    },
    {
      id: 'physio',
      title: 'Fyzioterapie (902)',
      value: all.physio.total,
      detail: `HB ${fmtNum(all.physio.hb, 2)} · včasné zahájení ${fmtMio(all.physio.earlyBonus)}`,
      description: 'Maximum úhrady, péče vybraných diagnóz bez limitu, bonus za včasné zahájení po hospitalizaci.',
    },
    {
      id: 'homecare',
      title: 'Domácí a paliativní péče',
      value: all.homecare.total + all.palliative.total + all.odb913.total,
      detail: `925/916 ${fmtMio(all.homecare.total)} · 926 ${fmtMio(all.palliative.total)} · 913 ${fmtMio(all.odb913.total)}`,
      description: 'Domácí péče s maximem, mobilní paliativní péče s limitem dnů, ošetřovatelská péče v pobytových službách.',
    },
    {
      id: 'labs',
      title: 'Laboratoře a radiodiagnostika',
      value: all.labs.total,
      detail: `RDG ${fmtMio(all.labs.rdgTotal)} · lab. HBred ${fmtNum(all.labs.lab.hbSkut, 2)}`,
      description: 'Redukovaná hodnota bodu podle růstu bodů na pojištěnce, laboratoře a genetika s maximem PURO.',
    },
    {
      id: 'dialysis',
      title: 'Dialýza',
      value: all.dialysis.total,
      detail: `HB ${fmtNum(all.dialysis.hb, 4)} · K_TR ${fmtPct(all.dialysis.ktr)}`,
      description: 'Kvalitativní bonifikace, domácí dialýza, transplantační bonifikace BON_TR a signální výkony čekací listiny.',
    },
  ]

  const SEG: Partial<Record<PageId, SegmentId>> = { pu: 'acute', separated: 'acute', casePayment: 'acute', homecare: 'homecare' }
  const inScope = (m: ModuleCard) => {
    const seg = m.segment ?? SEG[m.id] ?? (m.id as SegmentId)
    return m.id === 'homecare' ? scenario.scope.homecare || scenario.scope.palliative || scenario.scope.odb913 : scenario.scope[seg] !== false
  }
  const renderCards = (cards: ModuleCard[]) =>
    cards.map((m) => (
      <button
        key={m.id}
        type="button"
        className={`module-card ${m.negative ? 'module-card--negative' : ''} ${inScope(m) ? '' : 'module-card--off'}`}
        onClick={() => go(m.id)}
        title={inScope(m) ? undefined : 'Segment není v rozsahu poskytovatele – nezapočítává se do součtu.'}
      >
        <div className="module-card__title">{m.title}</div>
        <div className="module-card__value">{fmtMio(m.value)}</div>
        <div className="module-card__detail">{m.detail}</div>
        <p className="module-card__desc">{m.description}</p>
        <span className="module-card__cta">Otevřít modul →</span>
      </button>
    ))

  return (
    <>
      <PageHeader
        title="Simulátor úhradové vyhlášky 2027"
        lead={
          <>
            Interaktivní průchod výpočty návrhu vyhlášky o stanovení hodnot bodu a výše úhrad pro rok 2027 ve všech segmentech. Zadejte referenční (2025) a hodnocené (2027)
            údaje poskytovatele, sledujte každý krok výpočtu podle vzorců vyhlášky a modelujte dopady změn produkce i parametrů vyhlášky. Aktuální scénář:{' '}
            <strong>{scenario.name}</strong>.
          </>
        }
      />
      <Summary
        items={[
          { label: 'Celkem za modelované segmenty', value: fmtCzk(all.total), tone: 'result' },
          { label: 'Nemocnice', value: fmtMio(all.hospital), hint: 'akutní + následná + ambulance + CL + paušály − regulace' },
          { label: 'Akutní lůžková péče', value: fmtMio(all.pu.uhr + all.sep.uhr + all.pp.uhr), hint: 'paušál + vyčleněná + případový paušál' },
          { label: 'Primární péče', value: fmtMio(all.primary), hint: 'praktici, gynekologie, zubní' },
          { label: 'Ambulantní segmenty', value: fmtMio(all.ambulatory), hint: 'specialisté, 902, domácí péče, laboratoře, dialýza' },
          { label: 'Ostatní § 14–19', value: fmtMio(all.otherGroup), hint: 'ZZS, doprava, pohotovosti, lázně' },
          {
            label: 'CZS',
            value: fmtCzk(scenario.common.vaccinationMet ? scenario.params.czsVaccinated : scenario.params.czs),
            hint: scenario.common.vaccinationMet ? 'podmínka proočkovanosti splněna' : 'základní sazba',
          },
        ]}
      />

      <button type="button" className="cta-banner" onClick={() => go('modeling')}>
        <span>
          <strong>Modelace předběžné úhrady</strong>
          <span className="muted"> – nahrajte data poskytovatele (XLSX/CSV, případy CZ-DRG) a získejte předpokládanou úhradu 2027, měsíční předběžnou úhradu a vyúčtování.</span>
        </span>
        <span className="module-card__cta">Otevřít →</span>
      </button>

      <h2 className="section-title">Akutní lůžková péče (příloha č. 1, část A)</h2>
      <div className="module-grid">
        {renderCards(acute)}
        <button type="button" className="module-card module-card--alt" onClick={() => go('under50')}>
          <div className="module-card__title">Poskytovatelé pod 50 případů</div>
          <div className="module-card__value">výkonově</div>
          <div className="module-card__detail">CM × CZS × NM bez paušálu</div>
          <p className="module-card__desc">Malí poskytovatelé a nově vzniklé subjekty hrazené případovým paušálem bez referenčního období.</p>
          <span className="module-card__cta">Otevřít →</span>
        </button>
      </div>

      <h2 className="section-title">Další úhrady nemocnic</h2>
      <div className="module-grid">{renderCards(hospital)}</div>

      <h2 className="section-title">Primární péče (přílohy č. 2, 4 a 11)</h2>
      <div className="module-grid">{renderCards(primary)}</div>

      <h2 className="section-title">Ambulantní segmenty (přílohy č. 3, 5–8)</h2>
      <div className="module-grid">
        {renderCards(ambulatory)}
        <button type="button" className="module-card module-card--alt" onClick={() => go('indexes')}>
          <div className="module-card__title">Indexy ARCTG</div>
          <div className="module-card__value">3 křivky</div>
          <div className="module-card__detail">I_ZP · I_zp_amb · IZP_CL</div>
          <p className="module-card__desc">Průběh, spojitost, sklon a stropy degresivních indexů; modelace konstant.</p>
          <span className="module-card__cta">Otevřít →</span>
        </button>
      </div>

      <h2 className="section-title">Ostatní segmenty (§ 14–19)</h2>
      <div className="module-grid">{renderCards(misc)}</div>

      <Card title="Jak vyhláška počítá paušální úhradu" subtitle="Zjednodušený tok výpočtu pro skupiny A a D; každý krok najdete v modulu Paušální úhrada.">
        <ol className="flow">
          <li>
            <strong>Referenční úhrada 2025</strong> (ÚHR_PU + ÚHR_EU + ÚHR_ISU + EM) se přepočte na individuální základní sazbu IZS a vtěsná do koridoru ⟨ZS_min; 0,75·MAX +
            0,25·IZS⟩.
          </li>
          <li>
            <strong>IPU</strong> = část připadající na skupinu A × {scenario.params.puGrowth} + casemix skupiny D × CZS × NM.
          </li>
          <li>
            <strong>Casemix 2027</strong> se redukuje za překlady (kód 5) a porovná s referencí: r = CM_red / CM_2025.
          </li>
          <li>
            Pokles pod {fmtPct(scenario.params.declineTolerance)} krátí paušál lineárně; růst se hradí degresivně indexem <strong>I_ZP</strong> = max[1; ARCTG(3r − 1,443)].
          </li>
          <li>
            <strong>ÚHR_PU,2027</strong> = min{'{'}1; r/0,98{'}'} · IPU · I_ZP − extramurální péče.
          </li>
        </ol>
      </Card>

      <Card title="Společný mechanismus ambulantních segmentů (PURO)" subtitle="Ambulantní specialisté, fyzioterapie, domácí péče, laboratoře – příloha č. 3, 5, 6, 7.">
        <ol className="flow">
          <li>
            <strong>PURO_O</strong> = UHR_ref / POP_ref – průměrná úhrada na unikátního pojištěnce v referenčním období, s minimální hodnotou bodu (např. 0,90 Kč u specialistů).
          </li>
          <li>
            <strong>Maximum</strong> = (koef. růstu + KN) · POPzpoZ · PURO_O + max[(koef. růstu + KN) · PURO_O · POPzpoMh; UHRMh − UHRMr] + nově nasmlouvané výkony.
          </li>
          <li>
            <strong>Výkonová úhrada</strong> = body × hodnota bodu (základ + bonifikace) + ZUM/ZULP; hradí se min(výkonová úhrada; maximum), maximum se neuplatní u malých poskytovatelů.
          </li>
          <li>
            <strong>Regulace</strong>: překročení průměrných nákladů na pojištěnce (léčiva 115 %, vyžádaná péče 110 %) se sráží odstupňovaně po 2,5 % za každých 0,5 p. b., nejvýše 40 % překročení a 15 % úhrady.
          </li>
        </ol>
      </Card>

      <Card title="Poznámky k modelu">
        <ul className="notes">
          <li>Výpočty vychází z návrhu vyhlášky a důvodové zprávy (viz analýza v repozitáři). Součty Σ_i Σ_j max(JPL; DRG·NM) jsou modelovány po skupinách zadaných uživatelem.</li>
          <li>Hodnota péče ambulancí se zadává jako body × hodnota bodu 2027 + korunové položky; bonifikace se zadávají jako součet koeficientů.</li>
          <li>Segmenty jsou modelovány na úrovni jedné odbornosti/jednoho poskytovatele; vyhláška počítá regulace a maxima za každou odbornost a pojišťovnu zvlášť.</li>
          <li>Údaje jsou uloženy pouze v prohlížeči (localStorage). Scénáře lze exportovat a importovat jako JSON.</li>
          <li>Aplikace není oficiálním nástrojem Ministerstva zdravotnictví ani zdravotních pojišťoven; slouží k orientačním simulacím.</li>
        </ul>
      </Card>
    </>
  )
}

import { useMemo } from 'react'
import { Card } from '../components/fields'
import { PageHeader, Summary } from '../components/Summary'
import { fmtCzk, fmtIndex, fmtMio, fmtPct } from '../lib/format'
import { computeAll } from '../model/all'
import { useScenario } from '../state/ScenarioContext'
import type { PageId } from '../routes'

export function OverviewPage({ go }: { go: (p: PageId) => void }) {
  const { scenario } = useScenario()
  const all = useMemo(() => computeAll(scenario), [scenario])

  const modules: { id: PageId; title: string; value: number; detail: string; description: string }[] = [
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
  ]

  return (
    <>
      <PageHeader
        title="Simulátor úhradové vyhlášky 2027"
        lead={
          <>
            Interaktivní průchod výpočty návrhu vyhlášky o stanovení hodnot bodu a výše úhrad pro rok 2027. Zadejte referenční (2025) a hodnocené (2027) údaje
            poskytovatele, sledujte každý krok výpočtu podle vzorců vyhlášky a modelujte dopady změn produkce i parametrů vyhlášky. Aktuální scénář:{' '}
            <strong>{scenario.name}</strong>.
          </>
        }
      />
      <Summary
        items={[
          { label: 'Celkem za modelované segmenty', value: fmtCzk(all.total), tone: 'result' },
          { label: 'Akutní lůžková péče', value: fmtMio(all.pu.uhr + all.sep.uhr + all.pp.uhr), hint: 'paušál + vyčleněná + případový paušál' },
          { label: 'Ambulance', value: fmtMio(all.amb.total) },
          { label: 'Centrové léky', value: fmtMio(all.cl.uhr) },
          { label: 'CZS', value: fmtCzk(scenario.common.vaccinationMet ? scenario.params.czsVaccinated : scenario.params.czs), hint: scenario.common.vaccinationMet ? 'podmínka proočkovanosti splněna' : 'základní sazba' },
        ]}
      />

      <div className="module-grid">
        {modules.map((m) => (
          <button key={m.id} type="button" className="module-card" onClick={() => go(m.id)}>
            <div className="module-card__title">{m.title}</div>
            <div className="module-card__value">{fmtMio(m.value)}</div>
            <div className="module-card__detail">{m.detail}</div>
            <p className="module-card__desc">{m.description}</p>
            <span className="module-card__cta">Otevřít modul →</span>
          </button>
        ))}
        <button type="button" className="module-card module-card--alt" onClick={() => go('indexes')}>
          <div className="module-card__title">Indexy ARCTG</div>
          <div className="module-card__value">3 křivky</div>
          <div className="module-card__detail">I_ZP · I_zp_amb · IZP_CL</div>
          <p className="module-card__desc">Průběh, spojitost, sklon a stropy degresivních indexů; modelace konstant.</p>
          <span className="module-card__cta">Otevřít →</span>
        </button>
      </div>

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

      <Card title="Poznámky k modelu">
        <ul className="notes">
          <li>Výpočty vychází z návrhu vyhlášky a důvodové zprávy (viz analýza v repozitáři). Součty Σ_i Σ_j max(JPL; DRG·NM) jsou modelovány po skupinách zadaných uživatelem.</li>
          <li>Hodnota péče ambulancí se zadává jako body × hodnota bodu 2027 + korunové položky; bonifikace se zadávají jako součet koeficientů.</li>
          <li>Údaje jsou uloženy pouze v prohlížeči (localStorage). Scénáře lze exportovat a importovat jako JSON.</li>
          <li>Aplikace není oficiálním nástrojem Ministerstva zdravotnictví ani zdravotních pojišťoven; slouží k orientačním simulacím.</li>
        </ul>
      </Card>
    </>
  )
}

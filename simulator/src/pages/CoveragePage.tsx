import { Card } from '../components/fields'
import { PageHeader } from '../components/Summary'
import type { PageId } from '../routes'

type Status = 'full' | 'simplified' | 'out'

interface Item {
  part: string
  title: string
  status: Status
  note: string
  page?: PageId
}

const ITEMS: Item[] = [
  { part: '§ 2 odst. 4', title: 'Koeficient 0,95 za služby vykázané po 31. 3. 2028', status: 'full', note: 'Podíl pozdě vykázaných služeb na stránce Modelace.', page: 'modeling' },
  { part: 'příl. 1 A, bod 1.3–1.5', title: 'OD 00031/00032 (582 Kč), robotická operativa, CVSP', status: 'simplified', note: 'OD 00031/00032 modelováno; robotický materiál a výkon 09539 se promítá jen přes casemix.', page: 'urgent' },
  { part: 'příl. 1 A, bod 2', title: 'Individuálně sjednaná složka (část I přílohy 10)', status: 'out', note: 'Sjednává se smluvně; import CZ-DRG část I vyčlení a do výpočtu nezahrne.' },
  { part: 'příl. 1 A, bod 3', title: 'Paušální úhrada (A, D), IZS, koridor ZS, I_ZP, redukce za překlady', status: 'full', note: 'Casemix lze dopočítat z importu případů CZ-DRG.', page: 'pu' },
  { part: 'příl. 1 A, bod 4', title: 'Vyčleněná úhrada (C, E), NM_CE, KC, BON_mRS-90', status: 'full', note: 'KC podle statusů center z přílohy č. 10 při importu.', page: 'separated' },
  { part: 'příl. 1 A, bod 5', title: 'Případový paušál (B, F, G, H), K_DZ, redukce LOS', status: 'full', note: 'Dětská onkologie a JPL zadávané agregovaně.', page: 'casePayment' },
  { part: 'příl. 1 A, bod 6', title: 'Poskytovatelé do 50 případů', status: 'full', note: '', page: 'under50' },
  { part: 'příl. 1 A, bod 7', title: 'Ambulantní složka nemocnic (7.1–7.20), I_zp_amb, tabulky ΔBON', status: 'simplified', note: 'Hodnota péče se zadává souhrnně po segmentech lab / RDG / ostatní; změny bonifikací jako rozdíl koeficientů.', page: 'amb' },
  { part: 'příl. 1 A, bod 8', title: 'Urgentní příjem, LPS, příjem od ZZS, psychiatrická krizová péče', status: 'full', note: '', page: 'urgent' },
  { part: 'příl. 1 A, bod 9', title: 'Výkon 78890, odb. 005, paliativní týmy, ERN, 51887, centrum provázení', status: 'full', note: '', page: 'urgent' },
  { part: 'příl. 1 A, bod 11', title: 'Měsíční předběžná úhrada nemocnic', status: 'full', note: '1/12 předpokládané úhrady.', page: 'modeling' },
  { part: 'příl. 1 B', title: 'Následná, dlouhodobá a hospicová péče, NIP/DIOP, OD 00090/00091, 09535–09537', status: 'full', note: 'Limity 90 / 190 OD na pojištěnce se nekontrolují.', page: 'aftercare' },
  { part: 'příl. 1 C', title: 'Regulace – revize casemixu, léčiva a vyžádaná péče ambulancí', status: 'full', note: '', page: 'hospitalReg' },
  { part: 'příl. 2', title: 'Praktičtí lékaři – kapitace, výkony, epizody, POCUS, týmová praxe, terénní sestra, regulace', status: 'full', note: 'Celostátní průměry pro regulaci se zadávají ručně.', page: 'gp' },
  { part: 'příl. 3', title: 'Ambulantní specialisté – HB, KN, PURO, regulace', status: 'simplified', note: 'Jedna odbornost na výpočet; zvláštní HB odborností (bod 1) zadáte jako základní HB; koeficient výkonu 47355 není modelován.', page: 'specialists' },
  { part: 'příl. 4', title: 'Gynekologie – agregovaná úhrada, těhotenství, neplodnost, regulace', status: 'full', note: '', page: 'gyn' },
  { part: 'příl. 5', title: 'Laboratoře, genetika, radiodiagnostika (HBred, PURO_icz)', status: 'simplified', note: 'Výkony s pevnou HB mimo celkovou úhradu (bod 1 části B, 89111–89131…) zadejte jako korunové položky.', page: 'labs' },
  { part: 'příl. 6 A', title: 'Domácí péče 925/916, 914, 921, přeprava v návštěvní službě', status: 'full', note: '', page: 'homecare' },
  { part: 'příl. 6 B, C', title: 'Mobilní paliativní péče 926, odbornost 913', status: 'full', note: '', page: 'homecare' },
  { part: 'příl. 7', title: 'Fyzioterapie a ergoterapie 902 / 917', status: 'full', note: '', page: 'physio' },
  { part: 'příl. 8', title: 'Dialýza – kvalita, domácí dialýza, BON_TR, čekací listina, regulace', status: 'full', note: '', page: 'dialysis' },
  { part: 'příl. 9', title: 'Koeficienty poměru počtu pojištěnců (okresy, regiony)', status: 'full', note: 'Převzato z návrhu; doplňuje se automaticky podle pojišťovny a okresu.', page: 'modeling' },
  { part: 'příl. 10', title: 'Katalog CZ-DRG (části A–I), relativní váhy, KC, statusy center', status: 'full', note: '1 787 skupin převzato z návrhu – použito při importu případů.', page: 'modeling' },
  { part: 'příl. 11', title: 'Zubní lékařství – agregovaná úhrada, výkony, protetika, ortodoncie', status: 'full', note: 'Ceník 196 položek převzat z návrhu; frekvenční omezení se nekontrolují.', page: 'dental' },
  { part: 'příl. 12', title: 'Léčiva a ZP hrazené podle bodu 1.4 (mimo paušál)', status: 'simplified', note: 'Seznam ATC; v modelu se nepočítají – hradí se podle vykázání.' },
  { part: 'příl. 13', title: 'Jednodenní péče', status: 'full', note: 'Ceník 102 výkonů převzat z návrhu.', page: 'oneDay' },
  { part: 'příl. 14', title: 'Jednodenní relativní váhy CZ-DRG', status: 'simplified', note: 'Promítnou se, pokud je zohlední případy v importu (relativní váha zadaná přes CM JPL).' },
  { part: 'příl. 15', title: 'Centrové léčivé přípravky – INU, ICS, IZP_CL', status: 'full', note: '', page: 'cl' },
  { part: '§ 14–19', title: 'ZZS, PPNP, ZDS, zubní a lékárenská pohotovost, lázně, ozdravovny, výkony 09543–09990, e-recepty', status: 'full', note: '', page: 'other' },
  { part: 'předběžné úhrady', title: 'Měsíční předběžné úhrady a vyúčtování podle příloh 1, 2, 3, 5, 6, 7', status: 'full', note: 'U příloh bez výslovného pravidla (4, 8, 11, 13, § 14–19) model použije hodnotu vykázaných služeb.', page: 'modeling' },
]

const STATUS_LABEL: Record<Status, string> = { full: 'modelováno', simplified: 'zjednodušeno', out: 'mimo výpočet' }

export function CoveragePage({ go }: { go: (p: PageId) => void }) {
  const counts = ITEMS.reduce((acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }), {} as Record<Status, number>)
  return (
    <>
      <PageHeader
        title="Pokrytí vyhlášky"
        lead={`Přehled, které části návrhu vyhlášky simulátor počítá. Modelováno ${counts.full ?? 0}, zjednodušeno ${counts.simplified ?? 0}, mimo výpočet ${counts.out ?? 0} oblastí.`}
      />
      <Card>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Ustanovení</th>
                <th>Oblast</th>
                <th>Stav</th>
                <th>Poznámka</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((i) => (
                <tr key={i.part + i.title}>
                  <td className="nowrap">{i.part}</td>
                  <td>
                    {i.page ? (
                      <button type="button" className="link" onClick={() => go(i.page!)}>
                        {i.title}
                      </button>
                    ) : (
                      i.title
                    )}
                  </td>
                  <td>
                    <span className={`badge badge--${i.status}`}>{STATUS_LABEL[i.status]}</span>
                  </td>
                  <td className="muted">{i.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

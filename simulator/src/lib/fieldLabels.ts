/**
 * Popisky, jednotky a povolené hodnoty vstupů scénáře pro šablonu dat (XLSX/CSV).
 */
import { OD_LABELS, PERSONNEL_LABELS, TECHNICAL_LABELS } from '../model/aftercare'
import { AMB_SEGMENT_LABELS } from '../model/ambulance'
import { QUALITY_LABELS } from '../model/dialysis'
import { GP_REGIME_LABELS } from '../model/gp'
import { REVISION_LABELS } from '../model/hospitalRegulation'
import { GP_AGE_GROUPS, PROVIDER_TYPE_LABELS } from '../model/params'
import { SEGMENT_BY_ID, type SegmentId } from '../model/segments'
import { ODB_GROUP_LABELS } from '../model/specialists'
import { CKP_LABELS, PALLIATIVE_LABELS, URG_TIER_LABELS } from '../model/urgent'
import { SCRAPED_LABELS } from './scrapedLabels'

const PURO: Record<string, string> = {
  uhrRef: 'UHR_ref – úhrada v referenčním období vč. ZUM/ZULP',
  popRef: 'POP_ref – unikátní pojištěnci v referenčním období',
  pbRef: 'PB_ref – body v referenčním období',
  kpRef: 'Korunové položky (ZUM + ZULP) v referenčním období',
  uhrMr: 'UHRMr – úhrada za mimořádně nákladné pojištěnce 2025',
  popZ: 'POPzpoZ – základní unikátní pojištěnci 2027',
  popMh: 'POPzpoMh – mimořádně nákladní pojištěnci 2027',
  uhrMh: 'UHRMh – úhrada za mimořádně nákladné pojištěnce 2027',
  pbHo: 'PB_ho – body 2027',
  kpHo: 'Korunové položky (ZUM + ZULP) 2027',
  newServices: 'Nově nasmlouvané výkony (navyšují maximum)',
}

const REG_ITEM: Record<string, string> = { zulp: 'ZULP + ZUM', drugs: 'Předepsaná léčiva a ZP', requested: 'Vyžádaná péče' }

const KDZ: Record<string, string> = {
  kpKritMet: 'Kritéria akutní psychiatrické péče splněna (KP_krit)',
  cdz: 'Centrum duševního zdraví (K_CDZ)',
  ds: 'Denní stacionář (K_DS)',
  plnlp2018: 'Lůžka následné psychiatrické péče 2018',
  plnlp2027: 'Lůžka následné psychiatrické péče 2027',
  plnlp2030: 'Cílový počet lůžek 2030',
}

const EXTRA: Record<string, string> = {
  name: 'Název scénáře',
  'common.providerType': 'Typ poskytovatele (ZS_min)',
  'separated.nmCeTier': 'Stupeň NM_CE (poskytovatel s CMI ≤ 2,7)',
  'specialists.newPatients': 'Noví pacienti (3 roky bez výkonu)',
  'specialists.odbGroup': 'Skupina odborností pro KN',
  'homecare.odb': 'Odbornost domácí péče',
  'dialysis.quality': 'Kvalitativní kritéria dialýzy',
  'gp.regime': 'Rozsah ordinačních hodin',
  'gp.specialty': 'Odbornost (001 / 002)',
  'gp.hbEducation': 'Doklad vzdělávání – navýšení HB výkonů +0,04',
  'gp.nurseEpisodes': 'Epizody terénní sestry celkem',
  'gyn.accreditation': 'Akreditace vzdělávacího programu',
  'urgent.tier': 'Typ urgentního příjmu',
  'urgent.ckp': 'Psychiatrická krizová péče na UP',
  'urgent.palliativeTeam': 'Konziliární paliativní tým',
  'urgent.od3132Days': 'Dny OD 00031 a 00032 (582 Kč)',
  'urgent.points005': 'Body odbornosti 005 (HB 1,04)',
  'hospitalReg.exempt': 'Regulace se neuplatní',
  'aftercare.pointsOd00018': 'Body OD 00018, 00019, 00038 (HB 1,00)',
  'aftercare.contractDays': 'Dny OD 00031/00032/00098/00099',
  'aftercare.contractRate2026': 'Průměrná sazba těchto OD sjednaná na 2026',
  'aftercare.fees.v09535': 'Počet výkonů 09535 (150 Kč)',
  'aftercare.fees.v09536': 'Počet výkonů 09536 (50 Kč)',
  'aftercare.fees.v09537': 'Počet výkonů 09537 (200 Kč)',
  'homecare.other.points914': 'Body odbornosti 914 (HB 0,99)',
  'homecare.other.points921': 'Body odbornosti 921 (HB 0,99)',
  'homecare.other.kp': 'ZUM + ZULP odborností 914/921',
  'homecare.other.transportPoints': 'Body přepravy v návštěvní službě (HB 1,32)',
  'dental.educated': 'Registrující lékař má doklad celoživotního vzdělávání (24 Kč)',
  'dental.registered.under6': 'Registrovaní do 6 let (průměr za měsíc)',
  'dental.registered.from6to12': 'Registrovaní 6–12 let',
  'dental.registered.from12to18': 'Registrovaní 12–18 let',
  'dental.registered.adults': 'Registrovaní od 18 let',
  'dental.months': 'Počet měsíců',
  'other.zzs.points': 'ZZS/PPNP – body výkonů (HB 1,34)',
  'other.zzs.pointsTransport': 'ZZS/PPNP – body výkonů přepravy (HB 1,53)',
  'other.zzs.points06714': 'ZZS – body výkonu 06714 (HB 1,37)',
  'other.zzs.episodes': 'ZZS – epizody tísňová výzva + výjezd (1 550 Kč)',
  'other.zds.nonstop': 'ZDS v nepřetržitém provozu',
  'other.zds.points': 'ZDS – body výkonů přepravy',
  'other.zds.points40': 'ZDS – body výkonu přepravy č. 40',
  'other.zds.points69': 'ZDS – body výkonu přepravy č. 69',
  'other.dentalEmergency.days': 'Zubní pohotovost – dny služby',
  'other.dentalEmergency.k': 'Zubní pohotovost – K regionu (příl. 9)',
  'other.spa.complexDays': 'Komplexní lázeňská péče – dny',
  'other.spa.complexRate2026': 'Komplexní lázeňská péče – sazba za den 2026',
  'other.spa.contribDays': 'Příspěvková lázeňská péče – dny',
  'other.spa.contribRate2026': 'Příspěvková lázeňská péče – sazba za den 2026',
  'other.spa.points09543Spa': 'Lázně – body výkonu 09543 (HB 0,78)',
  'other.spa.ozdravovnaDays': 'Ozdravovna – dny pobytu (1 336 Kč)',
  'other.flat.points09543': 'Body výkonu 09543 (HB 1,16)',
  'other.flat.points09555': 'Body výkonů 09555–09557 (HB 1,12)',
  'other.flat.points09580': 'Body výkonů 09580–09581 (HB 1,04)',
  'other.flat.count09990': 'Počet výkonů 09990 (36 Kč)',
  'other.flat.count09552': 'Počet výkonů 09552 (33 Kč)',
  'other.flat.eRecipes': 'Převody listinných receptů do elektronické podoby (17 Kč)',
  'other.pharmacyEmergency.days': 'Lékárenská pohotovost – dny',
  'other.pharmacyEmergency.k': 'Lékárenská pohotovost – K regionu',
  'provider.name': 'Název poskytovatele',
  'provider.ico': 'IČO',
  'provider.insurer': 'Zdravotní pojišťovna (VZP, VoZP, ČPZP, OZP, ZPŠ, ZPMV, RBP)',
  'provider.district': 'Okres (příl. 9, bod 1)',
  'provider.region': 'Region (příl. 9, bod 2)',
  'provider.lateShare': 'Podíl služeb vykázaných po 31. 3. 2028 (koef. 0,95)',
  'advances.refRdg': 'Úhrada radiodiagnostiky 2025 (pro předběžnou úhradu 104 %)',
}

export const ENUM_OPTIONS: Record<string, Record<string, string>> = {
  'common.providerType': PROVIDER_TYPE_LABELS,
  'separated.nmCeTier': { auto: 'automaticky podle CMI', refNet6: 'ref. síť + ≥ 6 statusů (1,2)', trauma4: 'traumacentrum + ≥ 4 statusy (1,1)', none: 'ostatní (1,0)' },
  'specialists.newPatients': { none: 'pod 5 %', partial: '≥ 5 %', full: '≥ 10 % + hodiny' },
  'specialists.odbGroup': ODB_GROUP_LABELS,
  'homecare.odb': { '925': '925', '916': '916' },
  'dialysis.quality': QUALITY_LABELS,
  'gp.regime': GP_REGIME_LABELS,
  'gp.specialty': { '001': '001 všeobecné praktické lékařství', '002': '002 praktické lékařství pro děti a dorost' },
  'gyn.accreditation': { none: 'bez akreditace', accredited: 'akreditace', active: 'akreditace se školencem' },
  'urgent.tier': URG_TIER_LABELS,
  'urgent.ckp': CKP_LABELS,
  'urgent.palliativeTeam': PALLIATIVE_LABELS,
  'kdz.cdz': { none: 'bez CDZ', standard: 'odb. 350/360/370/922', odb355: 'odb. 355' },
  'kdz.ds': { none: 'bez stacionáře', '00043': 'výkon 00043', other: 'výkony 00041/00042' },
  'aftercare.rows[].od': OD_LABELS,
  'hospitalReg.revisions[].type': REVISION_LABELS,
}

export function enumOptionsFor(path: string): Record<string, string> | undefined {
  const generic = path.replace(/\[\d+\]/g, '[]')
  if (ENUM_OPTIONS[generic]) return ENUM_OPTIONS[generic]
  const m = generic.match(/\.kdz\.(cdz|ds)$/)
  return m ? ENUM_OPTIONS[`kdz.${m[1]}`] : undefined
}

export function segmentOfPath(path: string): SegmentId | 'provider' | 'common' | 'advances' | null {
  const head = path.split(/[.[]/)[0]
  if (head === 'pu' || head === 'separated' || head === 'casePayment') return 'acute'
  if (head === 'provider' || head === 'common' || head === 'advances') return head
  return head in SEGMENT_BY_ID ? (head as SegmentId) : null
}

export function labelFor(path: string): string {
  if (SCRAPED_LABELS[path]) return SCRAPED_LABELS[path]
  if (EXTRA[path]) return EXTRA[path]
  let m = path.match(/^\w+\.puro\.(\w+)$/)
  if (m && PURO[m[1]]) return PURO[m[1]]
  m = path.match(/^\w+\.regulation\.(zulp|drugs|requested)\.(avgRef|avgHo)$/) ?? path.match(/^hospitalReg\.(drugs|requested)\.(avgRef|avgHo)$/)
  if (m) return `${REG_ITEM[m[1]]} – průměr na unikátního pojištěnce ${m[2] === 'avgRef' ? '2025' : '2027'}`
  if (/\.regulation\.exempt$/.test(path)) return 'Regulace se neuplatní'
  m = path.match(/^\w+\.kdz\.(\w+)$/)
  if (m && KDZ[m[1]]) return KDZ[m[1]]
  m = path.match(/^gp\.ages\.(\w+)$/)
  if (m) return `Registrovaní pojištěnci ${GP_AGE_GROUPS.find((g) => g.id === m![1])?.label ?? m[1]}`
  m = path.match(/^aftercare\.personnel\.(\w+)$/)
  if (m) return PERSONNEL_LABELS[m[1] as keyof typeof PERSONNEL_LABELS] ?? m[1]
  m = path.match(/^aftercare\.technical\.(\w+)$/)
  if (m) return TECHNICAL_LABELS[m[1] as keyof typeof TECHNICAL_LABELS] ?? m[1]
  m = path.match(/^aftercare\.od9091Days\.od(\d+)\[(\d)\]$/)
  if (m) return `Dny OD ${m[1]} – kategorie pacienta ${Number(m[2]) + 3}`
  m = path.match(/^amb\.segments\.(\w+)\.(\w+)$/)
  if (m) {
    const what: Record<string, string> = { hpRef: 'hodnota péče 2025 v cenách 2027', base2025: 'základ 2025', base2027: 'hodnota péče 2027', bon2025: 'bonifikace 2025', bon2027: 'bonifikace 2027' }
    return `${AMB_SEGMENT_LABELS[m[1] as keyof typeof AMB_SEGMENT_LABELS] ?? m[1]} – ${what[m[2]] ?? m[2]}`
  }
  m = path.match(/^gyn\.pregnancies\[(\d)\]$/)
  if (m) return `Těhotné v ${Number(m[1]) + 1}. trimestru`
  m = path.match(/^advances\.(refUhr|adjust)\.(\w+)$/)
  if (m) {
    const seg = SEGMENT_BY_ID[m[2] as SegmentId]?.label ?? m[2]
    return m[1] === 'refUhr' ? `Úhrada 2025 – ${seg} (0 = odvodit)` : `Změna rozsahu zahrnutá do předběžné úhrady – ${seg}`
  }
  m = path.match(/^scope\.(\w+)$/)
  if (m) return `Segment se u poskytovatele uplatní – ${SEGMENT_BY_ID[m[1] as SegmentId]?.label ?? m[1]}`
  return path
}

/** Popisky sloupců tabulkových vstupů. */
export const TABLE_COLUMNS: Record<string, Record<string, string>> = {
  'separated.rows': { name: 'Název skupiny', cmDrg: 'CM podle CZ-DRG', cmJpl: 'CM ocenění JPL', kc: 'Koeficient centralizace KC' },
  'casePayment.rows': { name: 'Název skupiny', cmDrg: 'CM podle CZ-DRG', cmJpl: 'CM ocenění JPL', kc: 'Koeficient centralizace KC' },
  'under50.rows': { name: 'Název skupiny', cmDrg: 'CM podle CZ-DRG', cmJpl: 'CM ocenění JPL', kc: 'Koeficient centralizace KC' },
  'cl.rows': { groupId: 'Skupina CL (a–q)', prod2025: 'Úhrada 2025 (Kč)', prod2027: 'Produkce 2027 (Kč)' },
  'urgent.ern': { name: 'Referenční síť', uop: 'Unikátní pojištěnci (výkon 99976)' },
  'aftercare.rows': { od: 'Typ OD', name: 'Popis', ps2026: 'Paušální sazba 2026 (Kč/den)', days: 'Počet dnů 2027', pediatric: 'Dětští pacienti (ano/ne)' },
  'hospitalReg.revisions': { name: 'Popis revize', type: 'Typ revize', cmOriginal: 'CM původní', cmRevised: 'CM revidovaný', cmBase: 'Σ CM báze' },
  'oneDay.rows': { code: 'Kód výkonu', name: 'Název', price: 'Úhrada (Kč)', count: 'Počet 2027' },
  'physio.earlyStarts': { days: 'Dny od hospitalizace', count: 'Počet pojištěnců' },
  'labs.rdg': { name: 'Skupina RDG', hb: 'HB (Kč)', fs: 'Fixní složka FS', pbRef: 'Body 2025', uopRef: 'UOP 2025', pbHo: 'Body 2027', uopHo: 'UOP 2027' },
  'dental.rows': { code: 'Kód výkonu / výrobku', count: 'Počet', priceOverride: 'Ruční cena (0 = podle přílohy)' },
}

/**
 * Segmenty hrazené přímo paragrafovým znění vyhlášky – § 14 až 19:
 * zdravotnická záchranná služba a PPNP, zdravotnická dopravní služba, pohotovostní služba v oboru
 * zubní lékařství, lázeňská péče a ozdravovny, výkony s pevnou hodnotou bodu či úhradou a lékárny.
 */
import type { DecreeParams } from './params'
import { StepRecorder, type Step } from './steps'

export interface OtherInputs {
  zzs: {
    /** body výkonů ZZS a PPNP mimo přepravu a výkon 06714 */
    points: number
    pointsTransport: number
    points06714: number
    /** epizody péče: příjem tísňové výzvy + výjezd (jen ZZS) */
    episodes: number
  }
  zds: {
    nonstop: boolean
    points: number
    points40: number
    points69: number
  }
  dentalEmergency: { days: number; k: number }
  spa: {
    complexDays: number
    complexRate2026: number
    contribDays: number
    contribRate2026: number
    points09543Spa: number
    ozdravovnaDays: number
  }
  flat: {
    points09543: number
    points09555: number
    points09580: number
    count09990: number
    count09552: number
    eRecipes: number
  }
  pharmacyEmergency: { days: number; k: number }
}

export interface OtherResult {
  steps: Step[]
  zzs: number
  zds: number
  dentalEmergency: number
  spa: number
  flat: number
  pharmacy: number
  total: number
}

export function computeOther(inp: OtherInputs, p: DecreeParams): OtherResult {
  const rec = new StepRecorder()
  const m = p.misc

  const zzs = inp.zzs.points * m.zzsHb + inp.zzs.pointsTransport * m.zzsTransportHb + inp.zzs.points06714 * m.zzs06714Hb + inp.zzs.episodes * m.zzsEpisode
  rec.add({
    symbol: 'ZZS + PPNP (§ 14)',
    label: 'Body × 1,34 + přeprava × 1,53 + výkon 06714 × 1,37 + 1 550 Kč za epizodu (tísňová výzva + výjezd)',
    substitution: `${inp.zzs.points} · ${m.zzsHb} + ${inp.zzs.pointsTransport} · ${m.zzsTransportHb} + ${inp.zzs.points06714} · ${m.zzs06714Hb} + ${inp.zzs.episodes} · ${m.zzsEpisode}`,
    value: zzs,
    unit: 'czk',
  })

  const [hbZds, hbZds40] = inp.zds.nonstop ? [m.zdsNonstopHb, m.zdsNonstop40Hb] : [m.zdsHb, m.zds40Hb]
  const zds = inp.zds.points * hbZds + inp.zds.points40 * hbZds40 + inp.zds.points69 * m.zds69Hb
  rec.add({
    symbol: 'ZDS (§ 15)',
    label: inp.zds.nonstop ? 'Nepřetržitý provoz: body × 1,53, výkon 40 × 1,65, výkon 69 × 1,34' : 'Bez nepřetržitého provozu: body × 1,26, výkon 40 × 1,36, výkon 69 × 1,34',
    substitution: `${inp.zds.points} · ${hbZds} + ${inp.zds.points40} · ${hbZds40} + ${inp.zds.points69} · ${m.zds69Hb}`,
    value: zds,
    unit: 'czk',
  })

  const dentalEmergency = inp.dentalEmergency.days * m.dentalEmergencyDay * inp.dentalEmergency.k
  rec.add({
    symbol: 'Zubní pohotovost (§ 16)',
    label: 'Paušální složka 9 600 Kč × K (příl. 9) za den; výkonová složka se hradí podle přílohy č. 11',
    substitution: `${inp.dentalEmergency.days} · ${m.dentalEmergencyDay} · ${inp.dentalEmergency.k}`,
    value: dentalEmergency,
    unit: 'czk',
  })

  const s = inp.spa
  const spaComplex = s.complexDays * s.complexRate2026 * m.spaGrowth
  const spaContrib = s.contribDays * s.contribRate2026 * m.spaGrowth + s.points09543Spa * m.spa09543Hb
  const ozdravovna = s.ozdravovnaDays * m.ozdravovnaDay
  const spa = spaComplex + spaContrib + ozdravovna
  rec.add({
    symbol: 'Lázně a ozdravovny (§ 17)',
    label: 'Dny × sazba 2026 × 102 % (komplexní i příspěvková péče) + výkon 09543 × 0,78 + ozdravovna 1 336 Kč/den',
    substitution: `${s.complexDays} · ${s.complexRate2026} · ${m.spaGrowth} + ${s.contribDays} · ${s.contribRate2026} · ${m.spaGrowth} + ${s.points09543Spa} · ${m.spa09543Hb} + ${s.ozdravovnaDays} · ${m.ozdravovnaDay}`,
    value: spa,
    unit: 'czk',
  })

  const f = inp.flat
  const flat = f.points09543 * m.hb09543 + f.points09555 * m.hb09555 + f.points09580 * m.hb09580 + f.count09990 * m.fee09990 + f.count09552 * m.fee09552 + f.eRecipes * m.eRecipe
  rec.add({
    symbol: 'Výkony § 18 a § 19',
    label: '09543 × 1,16 + 09555–09557 × 1,12 + 09580–09581 × 1,04 (body) + 09990 × 36 Kč + 09552 × 33 Kč + převod receptu 17 Kč',
    substitution: `${f.points09543} · ${m.hb09543} + ${f.points09555} · ${m.hb09555} + ${f.points09580} · ${m.hb09580} + ${f.count09990} · ${m.fee09990} + ${f.count09552} · ${m.fee09552} + ${f.eRecipes} · ${m.eRecipe}`,
    value: flat,
    unit: 'czk',
    note: 'Úhrada podle § 18 nevstupuje do maximální ani celkové výše úhrady ostatních segmentů.',
  })

  const pharmacy = inp.pharmacyEmergency.days * m.pharmacyEmergencyDay * inp.pharmacyEmergency.k
  rec.add({
    symbol: 'Lékárenská pohotovost (§ 19)',
    label: '3 600 Kč × K (příl. 9) za den pohotovostní služby',
    substitution: `${inp.pharmacyEmergency.days} · ${m.pharmacyEmergencyDay} · ${inp.pharmacyEmergency.k}`,
    value: pharmacy,
    unit: 'czk',
  })

  const total = zzs + zds + dentalEmergency + spa + flat + pharmacy
  rec.add({ symbol: 'Celkem § 14–19', label: 'Součet segmentů', value: total, unit: 'czk', emphasis: 'result' })
  return { steps: rec.steps, zzs, zds, dentalEmergency, spa, flat, pharmacy, total }
}

/**
 * Parametry návrhu úhradové vyhlášky pro rok 2027 (příloha č. 1, 15).
 * Vše je editovatelné v UI ("modelace"), zde jsou výchozí hodnoty z návrhu.
 */

export type ProviderType = 'refNetUrg' | 'urg' | 'other'

export interface ArctgIndexParams {
  /** násobitel poměru r ve výrazu ARCTG(a·r − b) */
  a: number
  /** posun ve výrazu ARCTG(a·r − b) */
  b: number
}

export interface CentreDrugGroup {
  id: string
  name: string
  /** index navýšení úhrady */
  inu: number
  /** index cenové slevy */
  ics: number
}

export interface DecreeParams {
  /** centrální základní sazba CZ-DRG (Kč za jednotku casemixu) */
  czs: number
  /** CZS při splnění celostátní podmínky proočkovanosti */
  czsVaccinated: number
  /** růst individuální paušální úhrady (IPU = PU_2025,A · puGrowth + …) */
  puGrowth: number
  /** tolerance poklesu produkce (min{1; r / declineTolerance}) */
  declineTolerance: number
  /** MAX_2025,PU */
  zsMaxCap: number
  /** váha MAX v ZS_max = w · MAX + (1 − w) · IZS */
  zsMaxCapWeight: number
  /** ZS_min podle typu poskytovatele */
  zsMin: Record<ProviderType, number>
  /** prahová hodnota CMI pro nákladové modifikátory */
  cmiThreshold: number
  /** nákladové modifikátory */
  nm: {
    puD: number
    pp: number
    ceHighCmi: number
    ceRefNet6: number
    ceTrauma4: number
  }
  /** proměnná X pro redukci casemixu (podle koeficientu podílu pojištěnců v okrese) */
  xLargeInsurer: number
  xSmallInsurer: number
  xInsurerThreshold: number
  /** podíl překladů (kód ukončení 5), nad který se uplatní redukce */
  transferShareThreshold: number
  /** floor mediánu LOS v psychiatrii a výchozí LOS pro nové poskytovatele */
  losFloor: number
  losDefault: number
  /** I_ZP = max[1; ARCTG(a·r − b)] */
  izp: ArctgIndexParams
  /** I_zp_amb = max{1; 1 + IZ_GAUP·[ARCTG(a·r − b) − 1]}, gaupShare = 0,5 */
  izpAmb: ArctgIndexParams & { gaupShare: number }
  /** IZP_CL = min{cap; max[1; ARCTG(a·r − b)]} */
  izpCl: ArctgIndexParams & { cap: number }
  /** koeficienty navýšení ambulantní složky nemocnic */
  kn: { lab: number; rad: number; ost: number }
  /** váha skutečné úhrady 2025 v Úhr_amb_ref (0,5 = narovnání z poloviny) */
  ambRefBlend: number
  /** BON_mRS-90 jako podíl CZS·CM_CMP */
  bonMrs: number
  /** příplatek za dětské onkologické případy (0,5·CM_děti) */
  childrenBonus: number
  /** koeficient duševního zdraví K_DZ */
  kdz: {
    kpKritOk: number
    kpKritFail: number
    cdzStandard: number
    cdzOdb355: number
    ds00043: number
    dsOther: number
    transBase: number
    transRootShare: number
    transCap: number
    transDenominator: number
  }
  /** skupiny centrových léků (příloha č. 15, bod 5) */
  clGroups: CentreDrugGroup[]
}

export const DEFAULT_CL_GROUPS: CentreDrugGroup[] = [
  { id: 'a', name: 'Dermatologie', inu: 1.36, ics: 0.93 },
  { id: 'b', name: 'Dýchací soustava 1', inu: 1.44, ics: 0.98 },
  { id: 'c', name: 'Dýchací soustava 2', inu: 1.37, ics: 0.87 },
  { id: 'd', name: 'Endokrinologie', inu: 1.28, ics: 1.0 },
  { id: 'e', name: 'Hematoonkologie', inu: 1.2, ics: 0.95 },
  { id: 'f', name: 'Imunitní systém', inu: 1.2, ics: 0.98 },
  { id: 'g', name: 'Infekce', inu: 1.04, ics: 0.98 },
  { id: 'h', name: 'Metabolické vady', inu: 1.35, ics: 0.98 },
  { id: 'i', name: 'Neurologie 1', inu: 1.35, ics: 0.98 },
  { id: 'j', name: 'Neurologie 2', inu: 1.08, ics: 0.95 },
  { id: 'k', name: 'Oběhový systém', inu: 1.36, ics: 0.97 },
  { id: 'l', name: 'Oftalmologie', inu: 1.15, ics: 0.98 },
  { id: 'm', name: 'Onkologie – solidní nádory', inu: 1.25, ics: 0.97 },
  { id: 'n', name: 'Revmatologie', inu: 1.14, ics: 0.9 },
  { id: 'o', name: 'Trávicí soustava', inu: 1.16, ics: 0.92 },
  { id: 'p', name: 'Vyjmuté z Klasifikace', inu: 1.25, ics: 1.0 },
  { id: 'q', name: 'Ostatní', inu: 1.4, ics: 0.97 },
]

export const DEFAULT_PARAMS: DecreeParams = {
  czs: 84_000,
  czsVaccinated: 85_000,
  puGrowth: 1.035,
  declineTolerance: 0.98,
  zsMaxCap: 110_000,
  zsMaxCapWeight: 0.75,
  zsMin: { refNetUrg: 77_500, urg: 75_000, other: 70_000 },
  cmiThreshold: 2.7,
  nm: { puD: 1.1, pp: 1.1, ceHighCmi: 1.25, ceRefNet6: 1.2, ceTrauma4: 1.1 },
  xLargeInsurer: 1.1,
  xSmallInsurer: 1.15,
  xInsurerThreshold: 0.1,
  transferShareThreshold: 0.075,
  losFloor: 14,
  losDefault: 18,
  izp: { a: 3, b: 1.443 },
  izpAmb: { a: 2.6, b: 1.069, gaupShare: 0.5 },
  izpCl: { a: 2.75, b: 1.1926, cap: 1.075 },
  kn: { lab: 1.045, rad: 1.05, ost: 1.07 },
  ambRefBlend: 0.5,
  bonMrs: 0.05,
  childrenBonus: 0.5,
  kdz: {
    kpKritOk: 0.04,
    kpKritFail: -0.06,
    cdzStandard: 0.03,
    cdzOdb355: 0.04,
    ds00043: 0.03,
    dsOther: 0.02,
    transBase: 0.1,
    transRootShare: 0.25,
    transCap: 1.1,
    transDenominator: 0.85,
  },
  clGroups: DEFAULT_CL_GROUPS,
}

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  refNetUrg: 'Referenční síť (§ 41a) + urgentní příjem',
  urg: 'Urgentní příjem, mimo referenční síť',
  other: 'Ostatní poskytovatelé',
}

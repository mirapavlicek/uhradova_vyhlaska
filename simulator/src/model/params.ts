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
  /** urgentní příjem, LPS a příjem od ZZS (příloha č. 1, bod 8) */
  urgent: {
    prijemZzs: number
    lpsAdults: number
    lpsChildren: number
    pausal: { I: number; II: number; III: number }
    limit: { I: number; II: number; III: number; IV: number }
    ckpRoom: number
    ckpWorkplace: number
    vykonyShare: number
    outageCut: number
  }
  /** ostatní paušály nemocnic (bod 9) */
  other: {
    ern: { perNetwork: number; perNetworkVariable: number; perUop: number }
    palliativeTeamFull: number
    palliativeTeamReduced: number
    onco51887: number
    centrumProvazeni: number
    provazeniPerChild: number
    vykon78890: number
    /** OD 00031 a 00032 u poskytovatelů akutní péče (bod 1.3) */
    od3132Rate: number
    /** odbornost 005 (bod 9.2) */
    hb005: number
  }
  /** následná lůžková péče (příloha č. 1, část B) */
  aftercare: {
    zknHigh: number
    zknBase: number
    criterion: number
    transShare: number
    accreditation: number
    palliativeDoctor: number
    geriatrician: number
    children12: number
    children6: number
    geriCap: number
    geriMultiplier: number
    msShare: number
    u572: number
    u572PerDay: number
    hb: { od00015: number; od00017: number; od00020: number; od00033: number; od00018: number }
    /** OD 00031, 00032, 00098, 00099: sazba 2026 × růst */
    contractGrowth: number
    /** OD 00090 a 00091 podle kategorie pacienta 3, 4, 5 */
    od9091: { od00090: [number, number, number]; od00091: [number, number, number] }
    /** výkony 09535, 09536, 09537 vykázané s OD 00005/00024/00030/00037 */
    fees: { v09535: number; v09536: number; v09537: number }
  }
  /** regulace předepsaných léčiv a vyžádané péče – odstupňovaná srážka */
  regulation: {
    drugsThreshold: number
    requestedThreshold: number
    zulpThreshold: number
    stepPct: number
    ratePerStep: number
    maxShare: number
    capShare: number
    gpThreshold: number
    gpRequestedThreshold: number
    gpRate: number
  }
  /** ambulantní specialisté (příloha č. 3) */
  specialists: { hbBase: number; baseCoef: number; hbMin: number; exemptUp: number }
  /** fyzioterapie 902 (příloha č. 7) */
  physio: { hbBase: number; baseCoef: number; hbMin: number; exemptUp: number; earlyBase: number; earlyWindow: number; earlyMaxDays: number }
  /** domácí péče 925/916, paliativní 926, odb. 913 (příloha č. 6) */
  homecare: {
    hb925: number
    hb916: number
    baseCoef: number
    exemptUp: number
    hb926: number
    days926Adult: number
    days926Child: number
    hb913: number
    growth913: number
    hbMin913: number
    /** odbornosti 914 a 921 – bez maxima úhrady */
    hb914: number
    hb921: number
    /** výkony přepravy v návštěvní službě (příl. 6 bod 1, příl. 7 bod 1) */
    transportHb: number
  }
  /** zubní lékařství – agregovaná úhrada (příloha č. 11, bod 1 a 2) */
  dental: { capEducated: number; capOther: number; addUnder6: number; add6to12: number; add12to18: number }
  /** § 14–19 a § 2 odst. 4 */
  misc: {
    zzsHb: number
    zzsTransportHb: number
    zzs06714Hb: number
    zzsEpisode: number
    zdsNonstopHb: number
    zdsNonstop40Hb: number
    zdsHb: number
    zds40Hb: number
    zds69Hb: number
    dentalEmergencyDay: number
    pharmacyEmergencyDay: number
    spaGrowth: number
    spa09543Hb: number
    ozdravovnaDay: number
    hb09543: number
    hb09555: number
    hb09580: number
    fee09990: number
    fee09552: number
    eRecipe: number
    /** úhrada za služby vykázané po 31. 3. 2028 se násobí koeficientem */
    lateCoef: number
  }
  /** měsíční předběžné úhrady – násobitel úhrady referenčního období */
  advances: { specialists: number; rdg: number; labs: number; odb913: number; physio: number }
  /** praktičtí lékaři (příloha č. 2) */
  gp: {
    rate: { a: number; b: number; c001: number; c002: number }
    bonusEducation: number
    bonusPrevention: number
    bonusAccreditation: number
    hbPrevention001: number
    hbPrevention002: number
    hbSelected: number
    hbOther: number
    hbEducation: number
    hbExtendedHours: number
    episode: number
    pocusBonus: number
    pocusMin: number
    teamPerTenth: number
    nurseShort: number
    nurseLong: number
    nurseMonthly: number
    nurseMin: number
  }
  /** gynekologie (příloha č. 4) */
  gyn: {
    monthly: number
    bonusEducation: number
    bonusHours: number
    bonusAccreditation: number
    bonusAccreditationActive: number
    bonusIso: number
    bonusPrevention: number
    bonusTeam: number
    bonusMidwife: number
    noUltrasoundFactor: number
    trimester: [number, number, number]
    infertility: number
    episode: number
  }
  /** dialýza (příloha č. 8) */
  dialysis: { hb: number; hbLow: number; qualityL1: number; qualityL2: number; homeBonus: number; homeShare: number; nMin: number; nMax: number; lt: number; ht: number }
  /** laboratoře a radiodiagnostika (příloha č. 5) */
  labs: { kn809: number; knLabs: number; kn816: number; hbMinShare: number; hbMinShare816: number }
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
  urgent: {
    prijemZzs: 1_000,
    lpsAdults: 2_000_000,
    lpsChildren: 2_000_000,
    pausal: { I: 300_000_000, II: 65_000_000, III: 12_500_000 },
    limit: { I: 165_000_000, II: 100_000_000, III: 60_000_000, IV: 10_000_000 },
    ckpRoom: 1_000_000,
    ckpWorkplace: 2_500_000,
    vykonyShare: 0.6,
    outageCut: 0.5,
  },
  other: {
    ern: { perNetwork: 8_500_000, perNetworkVariable: 1_500_000, perUop: 126 },
    palliativeTeamFull: 2_050_000,
    palliativeTeamReduced: 1_025_000,
    onco51887: 250,
    centrumProvazeni: 1_600_000,
    provazeniPerChild: 3_000,
    vykon78890: 12_500,
    od3132Rate: 582,
    hb005: 1.04,
  },
  aftercare: {
    zknHigh: 1.035,
    zknBase: 1.02,
    criterion: 0.003,
    transShare: 0.35,
    accreditation: 0.015,
    palliativeDoctor: 0.04,
    geriatrician: 0.04,
    children12: 0.25,
    children6: 0.75,
    geriCap: 0.1,
    geriMultiplier: 10,
    msShare: 0.15,
    u572: 0.03,
    u572PerDay: 20,
    hb: { od00015: 1.63, od00017: 1.59, od00020: 1.57, od00033: 1.37, od00018: 1.0 },
    contractGrowth: 1.02,
    od9091: { od00090: [4_819, 5_069, 5_249], od00091: [4_919, 5_169, 5_349] },
    fees: { v09535: 150, v09536: 50, v09537: 200 },
  },
  regulation: {
    drugsThreshold: 1.15,
    requestedThreshold: 1.1,
    zulpThreshold: 1.15,
    stepPct: 0.005,
    ratePerStep: 0.025,
    maxShare: 0.4,
    capShare: 0.15,
    gpThreshold: 1.2,
    gpRequestedThreshold: 1.15,
    gpRate: 0.25,
  },
  specialists: { hbBase: 0.98, baseCoef: 1.06, hbMin: 0.9, exemptUp: 100 },
  physio: { hbBase: 0.73, baseCoef: 1.02, hbMin: 0.6, exemptUp: 30, earlyBase: 400, earlyWindow: 7, earlyMaxDays: 14 },
  homecare: {
    hb925: 1.0,
    hb916: 0.91,
    baseCoef: 1.06,
    exemptUp: 30,
    hb926: 1.23,
    days926Adult: 30,
    days926Child: 180,
    hb913: 1.23,
    growth913: 1.05,
    hbMin913: 1.03,
    hb914: 0.99,
    hb921: 0.99,
    transportHb: 1.32,
  },
  dental: { capEducated: 24, capOther: 22, addUnder6: 3, add6to12: 2, add12to18: 1 },
  misc: {
    zzsHb: 1.34,
    zzsTransportHb: 1.53,
    zzs06714Hb: 1.37,
    zzsEpisode: 1_550,
    zdsNonstopHb: 1.53,
    zdsNonstop40Hb: 1.65,
    zdsHb: 1.26,
    zds40Hb: 1.36,
    zds69Hb: 1.34,
    dentalEmergencyDay: 9_600,
    pharmacyEmergencyDay: 3_600,
    spaGrowth: 1.02,
    spa09543Hb: 0.78,
    ozdravovnaDay: 1_336,
    hb09543: 1.16,
    hb09555: 1.12,
    hb09580: 1.04,
    fee09990: 36,
    fee09552: 33,
    eRecipe: 17,
    lateCoef: 0.95,
  },
  advances: { specialists: 1.06, rdg: 1.04, labs: 1.03, odb913: 1.05, physio: 1.07 },
  gp: {
    rate: { a: 78, b: 69, c001: 60, c002: 66 },
    bonusEducation: 1,
    bonusPrevention: 2,
    bonusAccreditation: 1,
    hbPrevention001: 1.44,
    hbPrevention002: 1.31,
    hbSelected: 1.3,
    hbOther: 1.19,
    hbEducation: 0.04,
    hbExtendedHours: 0.06,
    episode: 90,
    pocusBonus: 5_000,
    pocusMin: 250,
    teamPerTenth: 10_800,
    nurseShort: 151,
    nurseLong: 303,
    nurseMonthly: 25_000,
    nurseMin: 200,
  },
  gyn: {
    monthly: 122,
    bonusEducation: 9,
    bonusHours: 9,
    bonusAccreditation: 3,
    bonusAccreditationActive: 9,
    bonusIso: 9,
    bonusPrevention: 6,
    bonusTeam: 6,
    bonusMidwife: 5,
    noUltrasoundFactor: 0.5,
    trimester: [2_489, 3_801, 5_322],
    infertility: 848,
    episode: 90,
  },
  dialysis: { hb: 1.18, hbLow: 0.92, qualityL1: 0.05, qualityL2: 0.07, homeBonus: 0.02, homeShare: 0.06, nMin: 0.02, nMax: 0.04, lt: 0.1, ht: 0.18 },
  labs: { kn809: 1, knLabs: 1.03, kn816: 1.0, hbMinShare: 0.91, hbMinShare816: 0.6 },
}

/** Věkové skupiny a indexy kapitace (příloha č. 2, bod 10). */
export const GP_AGE_GROUPS: { id: string; label: string; index: number }[] = [
  { id: 'a0', label: '0–4 roky', index: 4.57 },
  { id: 'a5', label: '5–9 let', index: 2.11 },
  { id: 'a10', label: '10–14 let', index: 1.62 },
  { id: 'a15', label: '15–19 let', index: 1.06 },
  { id: 'a20', label: '20–24 let', index: 0.9 },
  { id: 'a25', label: '25–29 let', index: 0.95 },
  { id: 'a30', label: '30–34 let', index: 1.0 },
  { id: 'a35', label: '35–39 let', index: 1.05 },
  { id: 'a40', label: '40–44 let', index: 1.05 },
  { id: 'a45', label: '45–49 let', index: 1.1 },
  { id: 'a50', label: '50–54 let', index: 1.43 },
  { id: 'a55', label: '55–59 let', index: 1.54 },
  { id: 'a60', label: '60–64 let', index: 1.59 },
  { id: 'a65', label: '65–69 let', index: 1.8 },
  { id: 'a70', label: '70–74 let', index: 2.12 },
  { id: 'a75', label: '75–79 let', index: 2.67 },
  { id: 'a80', label: '80–84 let', index: 3.22 },
  { id: 'a85', label: '85 a více let', index: 4.41 },
]

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  refNetUrg: 'Referenční síť (§ 41a) + urgentní příjem',
  urg: 'Urgentní příjem, mimo referenční síť',
  other: 'Ostatní poskytovatelé',
}

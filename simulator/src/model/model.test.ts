import { describe, expect, it } from 'vitest'
import { computeCasePayment, computeKdz, computePu, computeSeparated, computeUnder50 } from './acute'
import { computeAmb } from './ambulance'
import { computeCentreDrugs } from './centreDrugs'
import { capPoint, detachmentPoint, indexIzGaup, indexIzp, indexIzpAmb, indexIzpCl, slope } from './indexes'
import { DEFAULT_PARAMS } from './params'
import { defaultScenario, normalizeScenario } from './scenario'
import { StepRecorder } from './steps'

const p = DEFAULT_PARAMS

describe('ARCTG indexy', () => {
  it('I_ZP je spojitý v r = 1 a roven 1 pod ním', () => {
    expect(indexIzp(0.9, p)).toBe(1)
    expect(indexIzp(1, p)).toBeCloseTo(1, 3)
    expect(indexIzp(1.1, p)).toBeCloseTo(1.0768, 3)
    expect(indexIzp(1.2, p)).toBeCloseTo(1.1367, 3)
    expect(slope(p.izp.a, p.izp.b, 1)).toBeCloseTo(0.876, 2)
  })

  it('I_zp_amb se odlepí od 1 až při r ≈ 1,0102 (nespojitost konstanty 1,069)', () => {
    expect(indexIzpAmb(1.0, 1, p)).toBe(1)
    expect(indexIzpAmb(1.01, 1, p)).toBe(1)
    expect(indexIzpAmb(1.02, 1, p)).toBeCloseTo(1.0074, 3)
    expect(detachmentPoint(p.izpAmb.a, p.izpAmb.b)).toBeCloseTo(1.0102, 3)
    expect(detachmentPoint(p.izp.a, p.izp.b)).toBeCloseTo(1.0, 3)
  })

  it('IZ_GAUP uznává růst jen při dostatečném růstu unikátních pojištěnců', () => {
    expect(indexIzGaup(1.1, 1.05, p)).toBe(1)
    expect(indexIzGaup(1.1, 1.025, p)).toBeCloseTo(0.5, 6)
    expect(indexIzGaup(1.1, 1.0, p)).toBe(0)
    expect(indexIzGaup(1.1, 0.95, p)).toBe(0)
    expect(indexIzpAmb(1.1, 0, p)).toBe(1)
  })

  it('IZP_CL má strop 1,075 dosažený při r ≈ 1,106', () => {
    expect(indexIzpCl(1, p)).toBeCloseTo(1, 4)
    expect(indexIzpCl(1.1, p)).toBeCloseTo(1.0712, 3)
    expect(indexIzpCl(1.2, p)).toBe(1.075)
    expect(capPoint(p.izpCl.a, p.izpCl.b, p.izpCl.cap)).toBeCloseTo(1.106, 3)
  })
})

describe('Paušální úhrada', () => {
  const s = defaultScenario()

  it('koridor: IZS 80 000 → ZS_max 102 500, referenční úhrada beze změny', () => {
    const r = computePu(s.pu, s.common, s.params)
    expect(r.izs).toBeCloseTo(80_000, 0)
    expect(r.zsMax).toBeCloseTo(102_500, 0)
    expect(r.pu2025A).toBeCloseTo(1_120_000_000 * (9_000 / 14_000), 0)
  })

  it('IPU = PU_2025,A · 1,035 + CM_D · CZS (NM = 1 pro CMI 1,25)', () => {
    const r = computePu(s.pu, s.common, s.params)
    expect(r.ipu).toBeCloseTo(r.pu2025A * 1.035 + 3_000 * 84_000, 0)
  })

  it('bez redukce překladů (podíl < 7,5 %) je CM_red = CM_2027', () => {
    const r = computePu(s.pu, s.common, s.params)
    expect(r.cmRed).toBe(s.pu.cm2027AD)
    expect(r.ratio).toBeCloseTo(12_400 / 12_000, 6)
    expect(r.izp).toBeGreaterThan(1)
    expect(r.uhr).toBeCloseTo(r.ipu * r.izp - s.pu.em2027, 0)
  })

  it('pokles pod 98 % krátí paušál lineárně', () => {
    const r = computePu({ ...s.pu, cm2027AD: 11_400, cm2027Transfer: 0 }, s.common, s.params)
    const ratio = 11_400 / 12_000
    expect(r.izp).toBe(1)
    expect(r.uhr).toBeCloseTo((ratio / 0.98) * r.ipu - s.pu.em2027, 0)
  })

  it('redukce překladů se uplatní při podílu > 7,5 % v obou obdobích', () => {
    const r = computePu(
      { ...s.pu, transfers2025: 800, transfers2027: 1_200, cases2025: 9_000, cases2027: 9_000 },
      s.common,
      s.params,
    )
    // X = 1,1 (podíl pojištěnců 0,55 > 0,1); faktor = 1,1 · 800/1200 · 1 = 0,7333
    expect(r.cmRed).toBeCloseTo(12_400 - 600 + 600 * (1.1 * (800 / 1200)), 3)
  })

  it('CZS 85 000 při splnění proočkovanosti, NM 1,10 při CMI > 2,7', () => {
    const r = computePu(s.pu, { ...s.common, vaccinationMet: true, cmAllInsurers2025: 70_000 }, s.params)
    expect(r.ipu).toBeCloseTo(r.pu2025A * 1.035 + 3_000 * 85_000 * 1.1, 0)
  })

  it('ZS_min podle typu poskytovatele zvedá nízkou referenční úhradu', () => {
    const r = computePu({ ...s.pu, uhrPu2025: 800_000_000, uhrEu2025: 0, uhrIsu2025: 0, em2025: 0 }, { ...s.common, providerType: 'refNetUrg' }, s.params)
    // 800 mil / 14 000 = 57 143 < 77 500 → koridor = 14 000 · 77 500
    expect(r.pu2025A).toBeCloseTo(14_000 * 77_500 * (9_000 / 14_000), 0)
  })
})

describe('K_DZ a případový paušál', () => {
  const s = defaultScenario()

  it('K_DZ = 1 + 0,04 + 0,03 + 0,03 + K_TransNLP', () => {
    const rec = new StepRecorder()
    const kdz = computeKdz(s.casePayment.kdz, s.params, rec)
    const root = Math.sqrt((0.25 * 300) / 180)
    const progress = (300 - 220) / (0.85 * (300 - 180))
    expect(kdz).toBeCloseTo(1 + 0.04 + 0.03 + 0.03 + 0.1 * root * Math.min(1.1, progress), 6)
  })

  it('nesplnění kritérií dává −0,06', () => {
    const rec = new StepRecorder()
    const kdz = computeKdz({ kpKritMet: false, cdz: 'none', ds: 'none', plnlp2018: 0, plnlp2027: 0, plnlp2030: 0 }, s.params, rec)
    expect(kdz).toBeCloseTo(0.94, 6)
  })

  it('max(JPL; DRG·NM) vybírá vyšší ocenění po skupinách', () => {
    const r = computeCasePayment(s.casePayment, s.common, s.params)
    const czs = 84_000
    const groups = (Math.max(750, 800) + Math.max(420, 400) + Math.max(150, 200)) * czs
    // LOS 21 → 19: 1,1·21/19 > 1 → bez redukce
    const central = czs * (120 + 0 + 350 * r.kdz)
    expect(r.cmRedH).toBe(350)
    expect(r.uhr).toBeCloseTo(groups + central - 5_000_000, 0)
  })

  it('psychiatrie: prudké zkrácení LOS krátí casemix', () => {
    const r = computeCasePayment({ ...s.casePayment, losMedian2025: 30, losMedian2027: 20 }, s.common, s.params)
    expect(r.cmRedH).toBeCloseTo(350 * Math.min(1, (1.1 * 30) / 20), 6)
    const r2 = computeCasePayment({ ...s.casePayment, losMedian2025: 30, losMedian2027: 40 }, s.common, s.params)
    expect(r2.cmRedH).toBeCloseTo(350 * Math.min(1, (1.1 * 30) / 40), 6)
  })
})

describe('Vyčleněná úhrada a pod 50', () => {
  const s = defaultScenario()

  it('BON_mRS-90 = 0,05 · CZS · CM_CMP', () => {
    const r = computeSeparated(s.separated, s.common, s.params)
    const groups = (Math.max(280, 300) + Math.max(200, 250)) * 84_000
    expect(r.nmCe).toBe(1)
    expect(r.uhr).toBeCloseTo(groups + 50 * 84_000 + 0.05 * 84_000 * 200 - 3_000_000, 0)
  })

  it('NM_CE stupně', () => {
    expect(computeSeparated({ ...s.separated, nmCeTier: 'refNet6' }, s.common, s.params).nmCe).toBe(1.2)
    expect(computeSeparated({ ...s.separated, nmCeTier: 'trauma4' }, s.common, s.params).nmCe).toBe(1.1)
    expect(computeSeparated(s.separated, { ...s.common, cmAllInsurers2025: 70_000 }, s.params).nmCe).toBe(1.25)
  })

  it('pod 50: ZS_pod50 = CZS · NM_PP', () => {
    const r = computeUnder50(s.under50, s.common, s.params)
    expect(r.zsPod50).toBe(84_000)
    expect(r.uhr).toBeCloseTo(30 * 84_000 + Math.max(6 * 84_000, 8 * 84_000) + 2 * 84_000, 0)
  })
})

describe('Ambulantní složka', () => {
  const s = defaultScenario()

  it('Úhr_amb_ref narovnává z poloviny k hodnotě péče', () => {
    const r = computeAmb(s.amb, s.params)
    expect(r.hpRefRed).toBe(190_000_000)
    const blended = 0.5 * 180_000_000 + 0.5 * 210_000_000
    expect(r.uhrAmbRef).toBeCloseTo((190_000_000 / 210_000_000) * blended, 0)
  })

  it('laboratoře: růst produkce se nehradí, KN zahrnuje změnu bonifikací', () => {
    const r = computeAmb(s.amb, s.params)
    expect(r.lab.kn).toBeCloseTo(1.045 + 0.01, 6)
    const expected = Math.min(1, r.lab.ratio) * r.lab.kn * r.uhrAmbRef * (60 / 190)
    expect(r.lab.uhr).toBeCloseTo(Math.min(expected, r.lab.hp2027), 0)
  })

  it('strop skutečnou hodnotou péče', () => {
    // vysoká historická úhrada laboratoří: 80/190 · 190 mil · 1,055 ≈ 84 mil > HP_2027,lab ≈ 67 mil
    const segments = { ...s.amb.segments, lab: { ...s.amb.segments.lab, hpRef: 80_000_000 } }
    const r = computeAmb({ ...s.amb, segments, uhrAmb2025: 210_000_000 }, s.params)
    expect(r.lab.capped).toBe(true)
    expect(r.lab.uhr).toBeCloseTo(r.lab.hp2027, 0)
  })

  it('bez růstu unikátních pojištěnců je I_zp_amb = 1', () => {
    const r = computeAmb({ ...s.amb, gaup2027: 48_000 }, s.params)
    expect(r.radost.izGaup).toBe(0)
    expect(r.radost.izpAmb).toBe(1)
  })
})

describe('Centrové léky', () => {
  const s = defaultScenario()

  it('hradí se min{referenční·INU·ICS; skutečná·ICS} · IZP_CL', () => {
    const r = computeCentreDrugs(s.cl, s.params)
    const onk = r.groups.find((g) => g.groupId === 'm')!
    expect(onk.refValued).toBeCloseTo(120_000_000 * 1.25 * 0.97, 0)
    expect(onk.actualValued).toBeCloseTo(135_000_000 * 0.97, 0)
    expect(r.binding).toBe('actual')
    expect(r.uhr).toBeCloseTo(r.actualSum * 1, 0)
  })

  it('nadprodukce nad referenční limit → limit × IZP_CL ≤ 1,075', () => {
    const rows = s.cl.rows.map((x) => ({ ...x, prod2027: x.prod2025 * 1.6 }))
    const r = computeCentreDrugs({ rows }, s.params)
    expect(r.binding).toBe('reference')
    expect(r.izpCl).toBe(1.075)
    expect(r.uhr).toBeCloseTo(r.refSum * 1.075, 0)
  })
})

describe('Scénář', () => {
  it('normalizace doplní chybějící klíče', () => {
    const n = normalizeScenario({ name: 'x', params: { czs: 90_000 } })
    expect(n.name).toBe('x')
    expect(n.params.czs).toBe(90_000)
    expect(n.params.izp.a).toBe(3)
    expect(n.amb.segments.lab.hpRef).toBeGreaterThan(0)
  })
})

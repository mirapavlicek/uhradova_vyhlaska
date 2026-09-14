/**
 * Ambulantní složka úhrady poskytovatelů akutní lůžkové péče – příloha č. 1, body 7.15–7.20.
 * Laboratoře (lab), radiodiagnostika (rad) a ostatní ambulance (ost).
 */
import { indexIzGaup, indexIzpAmb } from './indexes'
import type { DecreeParams } from './params'
import { StepRecorder, safeDiv, type Step } from './steps'

export type AmbSegment = 'lab' | 'rad' | 'ost'

export const AMB_SEGMENT_LABELS: Record<AmbSegment, string> = {
  lab: 'Laboratoře',
  rad: 'Radiodiagnostika',
  ost: 'Ostatní ambulance',
}

export interface AmbSegmentInputs {
  /** hodnota péče ref. období bez bonifikací: Σ PB_2025 · HB_2027 + KP_2025 */
  base2025: number
  /** hodnota péče hodnoceného období bez bonifikací: Σ PB_2027 · HB_2027 + KP_2027 */
  base2027: number
  /** součet bonifikačních koeficientů platných v ref. období (BON = 1 + bon) */
  bon2025: number
  /** součet bonifikačních koeficientů v hodnoceném období */
  bon2027: number
  /** hodnota péče segmentu v referenčním období oceněná cenami 2025 (HP_ref,seg) */
  hpRef: number
}

export interface AmbInputs {
  /** Úhr_amb_2025 – skutečná úhrada za ambulantní péči v referenčním období */
  uhrAmb2025: number
  /** HP_ref – hodnota veškeré ambulantní péče ref. období (včetně neregulovaných odborností) */
  hpRefTotal: number
  segments: Record<AmbSegment, AmbSegmentInputs>
  gaup2025: number
  gaup2027: number
}

export interface AmbSegmentResult {
  hp2025: number
  hp2027: number
  kn: number
  ratio: number
  uhr: number
  capped: boolean
}

export interface AmbResult {
  steps: Step[]
  uhrAmbRef: number
  hpRefRed: number
  lab: AmbSegmentResult
  radost: AmbSegmentResult & { izpAmb: number; izGaup: number }
  total: number
}

function hodnotaPece(seg: AmbSegmentInputs, year: 2025 | 2027): number {
  const base = year === 2025 ? seg.base2025 : seg.base2027
  const bon = year === 2025 ? seg.bon2025 : seg.bon2027
  return base * (1 + bon)
}

export function computeAmb(inp: AmbInputs, p: DecreeParams): AmbResult {
  const rec = new StepRecorder()
  const s = inp.segments

  const hpRefRed = s.lab.hpRef + s.rad.hpRef + s.ost.hpRef
  rec.add({
    symbol: 'Hodnota_péče_ref^red',
    label: 'Hodnota regulované ambulantní péče v referenčním období (body 7.15–7.20)',
    substitution: `${s.lab.hpRef} + ${s.rad.hpRef} + ${s.ost.hpRef}`,
    value: hpRefRed,
    unit: 'czk',
  })
  const blended = p.ambRefBlend * inp.uhrAmb2025 + (1 - p.ambRefBlend) * inp.hpRefTotal
  const uhrAmbRef = safeDiv(hpRefRed, inp.hpRefTotal) * Math.min(inp.hpRefTotal, blended)
  rec.add({
    symbol: 'Úhr_amb_ref',
    label: 'Narovnaná referenční úhrada (z poloviny přiblížená k hodnotě péče)',
    formula: `Úhr_amb_ref = (HP_ref^red / HP_ref) · min[HP_ref; ${p.ambRefBlend}·Úhr_amb_2025 + ${(1 - p.ambRefBlend).toFixed(2)}·HP_ref]`,
    substitution: `(${hpRefRed} / ${inp.hpRefTotal}) · min[${inp.hpRefTotal}; ${blended.toFixed(0)}]`,
    value: uhrAmbRef,
    unit: 'czk',
    note:
      inp.uhrAmb2025 > inp.hpRefTotal
        ? 'Historická úhrada převyšuje hodnotu péče – referenční základ sražen na hodnotu péče.'
        : 'Historická úhrada je pod hodnotou péče – referenční základ posunut o polovinu rozdílu nahoru.',
  })

  // --- laboratoře
  const hpLab2025 = hodnotaPece(s.lab, 2025)
  const hpLab2027 = hodnotaPece(s.lab, 2027)
  const knLab = p.kn.lab + (s.lab.bon2027 - s.lab.bon2025)
  const rLab = safeDiv(hpLab2027, hpLab2025, 1)
  rec.add({
    symbol: 'Hodnota_péče_2025,lab / 2027,lab',
    label: 'Hodnota laboratorní péče (body × HB_2027 + KP) × BON_lab',
    substitution: `${s.lab.base2025} · (1 + ${s.lab.bon2025}) = ${hpLab2025.toFixed(0)};  ${s.lab.base2027} · (1 + ${s.lab.bon2027}) = ${hpLab2027.toFixed(0)}`,
    value: rLab,
    unit: 'ratio',
    note: 'Hodnota ve sloupci = poměr 2027 / 2025.',
  })
  rec.add({
    symbol: 'KN_amb^lab',
    label: 'Koeficient navýšení laboratoří',
    formula: `KN = ${p.kn.lab} + změnaBON_lab`,
    substitution: `${p.kn.lab} + (${s.lab.bon2027} − ${s.lab.bon2025})`,
    value: knLab,
    unit: 'index',
  })
  const labRegulated = Math.min(1, rLab) * knLab * uhrAmbRef * safeDiv(s.lab.hpRef, hpRefRed)
  const labUhr = Math.min(labRegulated, hpLab2027)
  rec.add({
    symbol: 'Úhr_amb_2027,lab',
    label: 'Úhrada laboratoří 2027',
    formula: 'min{ min[1; HP_2027/HP_2025] · KN_lab · Úhr_amb_ref · HP_ref,lab/HP_ref^red ; HP_2027,lab }',
    substitution: `min{ ${Math.min(1, rLab).toFixed(4)} · ${knLab.toFixed(4)} · ${uhrAmbRef.toFixed(0)} · ${safeDiv(s.lab.hpRef, hpRefRed).toFixed(4)} = ${labRegulated.toFixed(0)} ; ${hpLab2027.toFixed(0)} }`,
    value: labUhr,
    unit: 'czk',
    emphasis: 'result',
    note: labUhr === hpLab2027 && labRegulated > hpLab2027 ? 'Strop: úhrada omezena skutečnou hodnotou péče 2027.' : undefined,
  })

  // --- radiodiagnostika + ostatní
  const hpRad2025 = hodnotaPece(s.rad, 2025)
  const hpOst2025 = hodnotaPece(s.ost, 2025)
  const hpRad2027 = hodnotaPece(s.rad, 2027)
  const hpOst2027 = hodnotaPece(s.ost, 2027)
  const hpRadost2025 = hpRad2025 + hpOst2025
  const hpRadost2027 = hpRad2027 + hpOst2027
  const rRadost = safeDiv(hpRadost2027, hpRadost2025, 1)
  rec.add({
    symbol: 'Hodnota_péče_2025,radost / 2027,radost',
    label: 'Hodnota péče radiodiagnostiky a ostatních ambulancí',
    substitution: `2025: ${hpRad2025.toFixed(0)} + ${hpOst2025.toFixed(0)} = ${hpRadost2025.toFixed(0)};  2027: ${hpRad2027.toFixed(0)} + ${hpOst2027.toFixed(0)} = ${hpRadost2027.toFixed(0)}`,
    value: rRadost,
    unit: 'ratio',
    note: 'Hodnota ve sloupci = poměr 2027 / 2025.',
  })
  const knOst = p.kn.ost + (s.ost.bon2027 - s.ost.bon2025)
  const knRad = p.kn.rad + (s.rad.bon2027 - s.rad.bon2025)
  const hpRefRadost = s.rad.hpRef + s.ost.hpRef
  const knRadost = safeDiv(knRad * s.rad.hpRef + knOst * s.ost.hpRef, hpRefRadost, (knRad + knOst) / 2)
  rec.add({
    symbol: 'KN_amb^radost',
    label: 'Vážený koeficient navýšení (rad + ost)',
    formula: `(KN_rad·HP_ref,rad + KN_ost·HP_ref,ost) / HP_ref,radost;  KN_rad = ${p.kn.rad} + změnaBON, KN_ost = ${p.kn.ost} + změnaBON`,
    substitution: `(${knRad.toFixed(4)} · ${s.rad.hpRef} + ${knOst.toFixed(4)} · ${s.ost.hpRef}) / ${hpRefRadost}`,
    value: knRadost,
    unit: 'index',
  })
  const rGaup = safeDiv(inp.gaup2027, inp.gaup2025, 1)
  const izGaup = indexIzGaup(rRadost, rGaup, p)
  rec.add({
    symbol: 'IZ_GAUP',
    label: 'Podíl růstu produkce doprovázený růstem unikátních pojištěnců',
    formula: `IZ_GAUP = max[0; min(1; (GAUP_2027/GAUP_2025 − 1) / (${p.izpAmb.gaupShare}·(HP_2027/HP_2025 − 1)))]`,
    substitution: `GAUP: ${inp.gaup2027}/${inp.gaup2025} = ${rGaup.toFixed(4)};  HP: ${rRadost.toFixed(4)}`,
    value: izGaup,
    unit: 'index',
    emphasis: izGaup < 1 && rRadost > 1 ? 'warning' : undefined,
    note: izGaup < 1 && rRadost > 1 ? 'Růst objemu péče není plně doprovázen růstem počtu pacientů – index růstu se krátí.' : undefined,
  })
  const izpAmb = indexIzpAmb(rRadost, izGaup, p)
  rec.add({
    symbol: 'I_zp_amb',
    label: 'Index změny produkce ambulancí',
    formula: `max{1; 1 + IZ_GAUP · [ARCTG(${p.izpAmb.a}·r − ${p.izpAmb.b}) − 1]}`,
    substitution: `max{1; 1 + ${izGaup.toFixed(4)} · [ARCTG(${p.izpAmb.a} · ${rRadost.toFixed(4)} − ${p.izpAmb.b}) − 1]}`,
    value: izpAmb,
    unit: 'index',
  })
  const radostRegulated = Math.min(1, rRadost) * izpAmb * knRadost * uhrAmbRef * safeDiv(hpRefRadost, hpRefRed)
  const radostUhr = Math.min(radostRegulated, hpRadost2027)
  rec.add({
    symbol: 'Úhr_amb_2027,radost',
    label: 'Úhrada radiodiagnostiky a ostatních ambulancí 2027',
    formula: 'min{ min[1; HP_2027/HP_2025] · I_zp_amb · KN_radost · Úhr_amb_ref · HP_ref,radost/HP_ref^red ; HP_2027,radost }',
    substitution: `min{ ${Math.min(1, rRadost).toFixed(4)} · ${izpAmb.toFixed(4)} · ${knRadost.toFixed(4)} · ${uhrAmbRef.toFixed(0)} · ${safeDiv(hpRefRadost, hpRefRed).toFixed(4)} = ${radostRegulated.toFixed(0)} ; ${hpRadost2027.toFixed(0)} }`,
    value: radostUhr,
    unit: 'czk',
    emphasis: 'result',
    note: radostUhr === hpRadost2027 && radostRegulated > hpRadost2027 ? 'Strop: úhrada omezena skutečnou hodnotou péče 2027.' : undefined,
  })

  const total = labUhr + radostUhr
  rec.add({
    symbol: 'Úhr_amb_2027',
    label: 'Ambulantní složka celkem',
    formula: 'Úhr_amb_2027 = Úhr_amb_2027,lab + Úhr_amb_2027,radost',
    substitution: `${labUhr.toFixed(0)} + ${radostUhr.toFixed(0)}`,
    value: total,
    unit: 'czk',
    emphasis: 'result',
  })

  return {
    steps: rec.steps,
    uhrAmbRef,
    hpRefRed,
    lab: { hp2025: hpLab2025, hp2027: hpLab2027, kn: knLab, ratio: rLab, uhr: labUhr, capped: labRegulated > hpLab2027 },
    radost: {
      hp2025: hpRadost2025,
      hp2027: hpRadost2027,
      kn: knRadost,
      ratio: rRadost,
      uhr: radostUhr,
      capped: radostRegulated > hpRadost2027,
      izpAmb,
      izGaup,
    },
    total,
  }
}

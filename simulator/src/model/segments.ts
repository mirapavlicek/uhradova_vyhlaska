/**
 * Přehled segmentů vyhlášky: zařazení do skupin, příloha a pravidlo měsíční předběžné úhrady.
 */
import type { PageId } from '../routes'

export const SEGMENT_IDS = [
  'acute',
  'under50',
  'urgent',
  'aftercare',
  'oneDay',
  'amb',
  'cl',
  'hospitalReg',
  'gp',
  'gyn',
  'dental',
  'specialists',
  'physio',
  'homecare',
  'palliative',
  'odb913',
  'labs',
  'dialysis',
  'other',
] as const
export type SegmentId = (typeof SEGMENT_IDS)[number]

export type SegmentGroup = 'hospital' | 'primary' | 'ambulatory' | 'other'

export interface SegmentMeta {
  id: SegmentId
  label: string
  group: SegmentGroup
  annex: string
  page: PageId
}

export const SEGMENTS: SegmentMeta[] = [
  { id: 'acute', label: 'Akutní lůžková péče (paušál, vyčleněná, případový paušál)', group: 'hospital', annex: 'příl. 1 A, body 3–5', page: 'pu' },
  { id: 'under50', label: 'Akutní péče – poskytovatel do 50 případů', group: 'hospital', annex: 'příl. 1 A, bod 6', page: 'under50' },
  { id: 'urgent', label: 'Urgentní příjem, LPS, ERN a ostatní úhrady nemocnic', group: 'hospital', annex: 'příl. 1 A, body 1.3, 8, 9', page: 'urgent' },
  { id: 'aftercare', label: 'Následná, dlouhodobá a hospicová lůžková péče', group: 'hospital', annex: 'příl. 1 B', page: 'aftercare' },
  { id: 'oneDay', label: 'Jednodenní péče', group: 'hospital', annex: '§ 20, příl. 13', page: 'oneDay' },
  { id: 'amb', label: 'Ambulantní složka nemocnic', group: 'hospital', annex: 'příl. 1 A, bod 7', page: 'amb' },
  { id: 'cl', label: 'Centrové léčivé přípravky', group: 'hospital', annex: 'příl. 15', page: 'cl' },
  { id: 'hospitalReg', label: 'Regulační omezení nemocnic', group: 'hospital', annex: 'příl. 1 C', page: 'hospitalReg' },
  { id: 'gp', label: 'Praktičtí lékaři (001, 002)', group: 'primary', annex: 'příl. 2', page: 'gp' },
  { id: 'gyn', label: 'Ambulantní gynekologie (603, 604)', group: 'primary', annex: 'příl. 4', page: 'gyn' },
  { id: 'dental', label: 'Zubní lékařství (014, 015)', group: 'primary', annex: 'příl. 11', page: 'dental' },
  { id: 'specialists', label: 'Ambulantní specialisté', group: 'ambulatory', annex: 'příl. 3', page: 'specialists' },
  { id: 'physio', label: 'Fyzioterapie a ergoterapie (902, 917)', group: 'ambulatory', annex: 'příl. 7', page: 'physio' },
  { id: 'homecare', label: 'Domácí péče a 914/916/921/925', group: 'ambulatory', annex: 'příl. 6 A', page: 'homecare' },
  { id: 'palliative', label: 'Mobilní specializovaná paliativní péče (926)', group: 'ambulatory', annex: 'příl. 6 B', page: 'homecare' },
  { id: 'odb913', label: 'Ošetřovatelská péče v sociálních službách (913)', group: 'ambulatory', annex: 'příl. 6 C', page: 'homecare' },
  { id: 'labs', label: 'Laboratoře, genetika a radiodiagnostika', group: 'ambulatory', annex: 'příl. 5', page: 'labs' },
  { id: 'dialysis', label: 'Dialyzační péče', group: 'ambulatory', annex: 'příl. 8', page: 'dialysis' },
  { id: 'other', label: 'ZZS, dopravní služba, pohotovosti, lázně, lékárny', group: 'other', annex: '§ 14–19', page: 'other' },
]

export const SEGMENT_BY_ID = Object.fromEntries(SEGMENTS.map((s) => [s.id, s])) as Record<SegmentId, SegmentMeta>

export const GROUP_TITLES: Record<SegmentGroup, string> = {
  hospital: 'Nemocnice',
  primary: 'Primární péče',
  ambulatory: 'Ambulantní segmenty',
  other: 'Ostatní (§ 14–19)',
}

export type Scope = Record<SegmentId, boolean>

export function scopeOf(ids: SegmentId[]): Scope {
  return Object.fromEntries(SEGMENT_IDS.map((id) => [id, ids.includes(id)])) as Scope
}

/** Typové profily poskytovatelů pro rychlé nastavení rozsahu. */
export const PROVIDER_PROFILES: { id: string; label: string; segments: SegmentId[] }[] = [
  { id: 'hospital', label: 'Nemocnice s akutní péčí', segments: ['acute', 'urgent', 'aftercare', 'oneDay', 'amb', 'cl', 'hospitalReg'] },
  { id: 'hospitalSmall', label: 'Nemocnice do 50 případů', segments: ['under50', 'aftercare', 'amb', 'hospitalReg'] },
  { id: 'aftercare', label: 'Poskytovatel následné / hospicové péče', segments: ['aftercare'] },
  { id: 'gp', label: 'Praktický lékař', segments: ['gp'] },
  { id: 'gyn', label: 'Ambulantní gynekolog', segments: ['gyn'] },
  { id: 'dental', label: 'Zubní lékař', segments: ['dental'] },
  { id: 'specialists', label: 'Ambulantní specialista', segments: ['specialists'] },
  { id: 'physio', label: 'Fyzioterapeut', segments: ['physio'] },
  { id: 'homecare', label: 'Domácí / paliativní péče', segments: ['homecare', 'palliative', 'odb913'] },
  { id: 'labs', label: 'Laboratoř / radiodiagnostika', segments: ['labs'] },
  { id: 'dialysis', label: 'Dialyzační středisko', segments: ['dialysis'] },
  { id: 'other', label: 'ZZS, dopravní služba, lázně, lékárna', segments: ['other'] },
  { id: 'all', label: 'Všechny segmenty (modelový scénář)', segments: SEGMENT_IDS.filter((id) => id !== 'under50') },
]

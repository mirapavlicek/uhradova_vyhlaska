export type PageId =
  | 'overview'
  | 'modeling'
  | 'pu'
  | 'separated'
  | 'casePayment'
  | 'under50'
  | 'urgent'
  | 'aftercare'
  | 'oneDay'
  | 'amb'
  | 'cl'
  | 'hospitalReg'
  | 'gp'
  | 'gyn'
  | 'specialists'
  | 'physio'
  | 'homecare'
  | 'labs'
  | 'dialysis'
  | 'dental'
  | 'other'
  | 'coverage'
  | 'indexes'
  | 'params'
  | 'scenarios'

export type RouteGroup = 'start' | 'acute' | 'hospital' | 'primary' | 'ambulatory' | 'misc' | 'tools'

export interface RouteDef {
  id: PageId
  label: string
  group: RouteGroup
}

export const ROUTES: RouteDef[] = [
  { id: 'overview', label: 'Přehled', group: 'start' },
  { id: 'modeling', label: 'Modelace předběžné úhrady', group: 'start' },
  { id: 'pu', label: 'Paušální úhrada (A, D)', group: 'acute' },
  { id: 'separated', label: 'Vyčleněná úhrada (C, E)', group: 'acute' },
  { id: 'casePayment', label: 'Případový paušál (B, F, G, H)', group: 'acute' },
  { id: 'under50', label: 'Poskytovatelé pod 50 případů', group: 'acute' },
  { id: 'urgent', label: 'Urgentní příjem, LPS, ERN a paušály', group: 'hospital' },
  { id: 'aftercare', label: 'Následná lůžková péče', group: 'hospital' },
  { id: 'oneDay', label: 'Jednodenní péče', group: 'hospital' },
  { id: 'amb', label: 'Ambulantní složka nemocnic', group: 'hospital' },
  { id: 'cl', label: 'Centrové léky', group: 'hospital' },
  { id: 'hospitalReg', label: 'Regulace nemocnic', group: 'hospital' },
  { id: 'gp', label: 'Praktičtí lékaři', group: 'primary' },
  { id: 'gyn', label: 'Gynekologie', group: 'primary' },
  { id: 'dental', label: 'Zubní lékařství', group: 'primary' },
  { id: 'specialists', label: 'Ambulantní specialisté', group: 'ambulatory' },
  { id: 'physio', label: 'Fyzioterapie (902, 917)', group: 'ambulatory' },
  { id: 'homecare', label: 'Domácí a paliativní péče (914–926, 913)', group: 'ambulatory' },
  { id: 'labs', label: 'Laboratoře a radiodiagnostika', group: 'ambulatory' },
  { id: 'dialysis', label: 'Dialýza', group: 'ambulatory' },
  { id: 'other', label: 'ZZS, doprava, pohotovosti, lázně, lékárny', group: 'misc' },
  { id: 'indexes', label: 'Indexy ARCTG', group: 'tools' },
  { id: 'params', label: 'Parametry vyhlášky', group: 'tools' },
  { id: 'scenarios', label: 'Scénáře a porovnání', group: 'tools' },
  { id: 'coverage', label: 'Pokrytí vyhlášky', group: 'tools' },
]

export const GROUP_ORDER: RouteGroup[] = ['start', 'acute', 'hospital', 'primary', 'ambulatory', 'misc', 'tools']

export const GROUP_LABELS: Record<RouteGroup, string> = {
  start: '',
  acute: 'Akutní lůžková péče',
  hospital: 'Další úhrady nemocnic',
  primary: 'Primární péče',
  ambulatory: 'Ambulantní segmenty',
  misc: 'Ostatní segmenty (§ 14–19)',
  tools: 'Nástroje',
}

export function parseHash(hash: string): PageId {
  const id = hash.replace(/^#\/?/, '') as PageId
  return ROUTES.some((r) => r.id === id) ? id : 'overview'
}

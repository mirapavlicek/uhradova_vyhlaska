export type PageId = 'overview' | 'pu' | 'separated' | 'casePayment' | 'under50' | 'amb' | 'cl' | 'indexes' | 'params' | 'scenarios'

export interface RouteDef {
  id: PageId
  label: string
  group: 'start' | 'acute' | 'other' | 'tools'
}

export const ROUTES: RouteDef[] = [
  { id: 'overview', label: 'Přehled', group: 'start' },
  { id: 'pu', label: 'Paušální úhrada (A, D)', group: 'acute' },
  { id: 'separated', label: 'Vyčleněná úhrada (C, E)', group: 'acute' },
  { id: 'casePayment', label: 'Případový paušál (B, F, G, H)', group: 'acute' },
  { id: 'under50', label: 'Poskytovatelé pod 50 případů', group: 'acute' },
  { id: 'amb', label: 'Ambulantní složka nemocnic', group: 'other' },
  { id: 'cl', label: 'Centrové léky', group: 'other' },
  { id: 'indexes', label: 'Indexy ARCTG', group: 'tools' },
  { id: 'params', label: 'Parametry vyhlášky', group: 'tools' },
  { id: 'scenarios', label: 'Scénáře a porovnání', group: 'tools' },
]

export const GROUP_LABELS: Record<RouteDef['group'], string> = {
  start: '',
  acute: 'Akutní lůžková péče',
  other: 'Další segmenty',
  tools: 'Nástroje',
}

export function parseHash(hash: string): PageId {
  const id = hash.replace(/^#\/?/, '') as PageId
  return ROUTES.some((r) => r.id === id) ? id : 'overview'
}

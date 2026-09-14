import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultScenario, normalizeScenario, type Scenario } from '../model/scenario'

const CURRENT_KEY = 'uv2027.simulator.current'
const SAVED_KEY = 'uv2027.simulator.saved'

export interface SavedScenario {
  id: string
  savedAt: string
  scenario: Scenario
}

type Updater = (s: Scenario) => Scenario

interface ScenarioContextValue {
  scenario: Scenario
  update: (fn: Updater) => void
  /** mělká aktualizace jedné sekce scénáře */
  patch: <K extends keyof Scenario>(key: K, partial: Partial<Scenario[K]>) => void
  reset: () => void
  replace: (s: Scenario) => void
  saved: SavedScenario[]
  saveAs: (name: string) => void
  load: (id: string) => void
  remove: (id: string) => void
  exportJson: () => string
  importJson: (json: string) => void
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null)

function readCurrent(): Scenario {
  try {
    const raw = localStorage.getItem(CURRENT_KEY)
    return raw ? normalizeScenario(JSON.parse(raw)) : defaultScenario()
  } catch {
    return defaultScenario()
  }
}

function readSaved(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as SavedScenario[]
    return list.map((x) => ({ ...x, scenario: normalizeScenario(x.scenario) }))
  } catch {
    return []
  }
}

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<Scenario>(readCurrent)
  const [saved, setSaved] = useState<SavedScenario[]>(readSaved)

  useEffect(() => {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(scenario))
  }, [scenario])
  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved))
  }, [saved])

  const update = useCallback((fn: Updater) => setScenario((prev) => fn(prev)), [])
  const patch = useCallback<ScenarioContextValue['patch']>((key, partial) => {
    setScenario((prev) => ({ ...prev, [key]: { ...(prev[key] as object), ...partial } }))
  }, [])
  const reset = useCallback(() => setScenario(defaultScenario()), [])
  const replace = useCallback((s: Scenario) => setScenario(normalizeScenario(s)), [])

  const saveAs = useCallback(
    (name: string) => {
      const copy = { ...scenario, name }
      setSaved((prev) => [
        ...prev.filter((x) => x.scenario.name !== name),
        { id: `${Date.now()}`, savedAt: new Date().toISOString(), scenario: copy },
      ])
      setScenario(copy)
    },
    [scenario],
  )
  const load = useCallback(
    (id: string) => {
      const found = saved.find((x) => x.id === id)
      if (found) setScenario(structuredClone(found.scenario))
    },
    [saved],
  )
  const remove = useCallback((id: string) => setSaved((prev) => prev.filter((x) => x.id !== id)), [])
  const exportJson = useCallback(() => JSON.stringify(scenario, null, 2), [scenario])
  const importJson = useCallback((json: string) => setScenario(normalizeScenario(JSON.parse(json))), [])

  const value = useMemo<ScenarioContextValue>(
    () => ({ scenario, update, patch, reset, replace, saved, saveAs, load, remove, exportJson, importJson }),
    [scenario, update, patch, reset, replace, saved, saveAs, load, remove, exportJson, importJson],
  )
  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>
}

export function useScenario(): ScenarioContextValue {
  const ctx = useContext(ScenarioContext)
  if (!ctx) throw new Error('useScenario musí být použit uvnitř ScenarioProvider')
  return ctx
}

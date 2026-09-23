import { useEffect, useState } from 'react'
import { AftercarePage } from './pages/AftercarePage'
import { AmbPage } from './pages/AmbPage'
import { CasePaymentPage } from './pages/CasePaymentPage'
import { CentreDrugsPage } from './pages/CentreDrugsPage'
import { CoveragePage } from './pages/CoveragePage'
import { DentalPage } from './pages/DentalPage'
import { DialysisPage } from './pages/DialysisPage'
import { GpPage } from './pages/GpPage'
import { GynPage } from './pages/GynPage'
import { HomecarePage } from './pages/HomecarePage'
import { HospitalRegulationPage } from './pages/HospitalRegulationPage'
import { IndexesPage } from './pages/IndexesPage'
import { LabsPage } from './pages/LabsPage'
import { ModelingPage } from './pages/ModelingPage'
import { OneDayPage } from './pages/OneDayPage'
import { OtherPage } from './pages/OtherPage'
import { OverviewPage } from './pages/OverviewPage'
import { ParamsPage } from './pages/ParamsPage'
import { PhysioPage } from './pages/PhysioPage'
import { PuPage } from './pages/PuPage'
import { ScenariosPage } from './pages/ScenariosPage'
import { SeparatedPage, Under50Page } from './pages/SeparatedPage'
import { SpecialistsPage } from './pages/SpecialistsPage'
import { UrgentPage } from './pages/UrgentPage'
import { GROUP_LABELS, GROUP_ORDER, parseHash, ROUTES, type PageId } from './routes'
import { ScenarioProvider, useScenario } from './state/ScenarioContext'

function Sidebar({ page, go }: { page: PageId; go: (p: PageId) => void }) {
  const { scenario } = useScenario()
  const groups = GROUP_ORDER
  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => go('overview')} role="button" tabIndex={0}>
        <span className="brand__mark">ÚV</span>
        <span>
          <span className="brand__title">Simulátor 2027</span>
          <span className="brand__sub">úhradová vyhláška – návrh</span>
        </span>
      </div>
      <nav>
        {groups.map((g) => (
          <div key={g} className="nav-group">
            {GROUP_LABELS[g] && <div className="nav-group__label">{GROUP_LABELS[g]}</div>}
            {ROUTES.filter((r) => r.group === g).map((r) => (
              <a key={r.id} href={`#/${r.id}`} className={`nav-link ${page === r.id ? 'nav-link--active' : ''}`} onClick={() => go(r.id)}>
                {r.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar__footer">
        <div className="sidebar__scenario" title={scenario.name}>
          Scénář: <strong>{scenario.name}</strong>
        </div>
        <div className="muted small">Data zůstávají v prohlížeči.</div>
      </div>
    </aside>
  )
}

function Router({ page, go }: { page: PageId; go: (p: PageId) => void }) {
  switch (page) {
    case 'pu':
      return <PuPage />
    case 'separated':
      return <SeparatedPage />
    case 'casePayment':
      return <CasePaymentPage />
    case 'under50':
      return <Under50Page />
    case 'urgent':
      return <UrgentPage />
    case 'aftercare':
      return <AftercarePage />
    case 'oneDay':
      return <OneDayPage />
    case 'amb':
      return <AmbPage />
    case 'cl':
      return <CentreDrugsPage />
    case 'hospitalReg':
      return <HospitalRegulationPage />
    case 'gp':
      return <GpPage />
    case 'gyn':
      return <GynPage />
    case 'specialists':
      return <SpecialistsPage />
    case 'physio':
      return <PhysioPage />
    case 'homecare':
      return <HomecarePage />
    case 'labs':
      return <LabsPage />
    case 'dialysis':
      return <DialysisPage />
    case 'dental':
      return <DentalPage />
    case 'other':
      return <OtherPage />
    case 'modeling':
      return <ModelingPage go={go} />
    case 'coverage':
      return <CoveragePage go={go} />
    case 'indexes':
      return <IndexesPage />
    case 'params':
      return <ParamsPage />
    case 'scenarios':
      return <ScenariosPage />
    default:
      return <OverviewPage go={go} />
  }
}

export default function App() {
  const [page, setPage] = useState<PageId>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHash = () => setPage(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (p: PageId) => {
    window.location.hash = `/${p}`
    setPage(p)
    window.scrollTo({ top: 0 })
  }

  return (
    <ScenarioProvider>
      <div className="layout">
        <Sidebar page={page} go={go} />
        <main className="content">
          <Router page={page} go={go} />
        </main>
      </div>
    </ScenarioProvider>
  )
}

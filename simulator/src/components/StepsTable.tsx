import { useState } from 'react'
import { fmtByUnit } from '../lib/format'
import type { Step } from '../model/steps'

/** Krokový průchod výpočtem: symbol, vzorec, dosazení, hodnota. */
export function StepsTable({ steps, title = 'Průchod výpočtem' }: { steps: Step[]; title?: string }) {
  const [showFormulas, setShowFormulas] = useState(true)
  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">{title}</h2>
        <label className="field field--toggle field--inline">
          <input type="checkbox" checked={showFormulas} onChange={(e) => setShowFormulas(e.target.checked)} />
          <span className="field__label">Zobrazit vzorce a dosazení</span>
        </label>
      </header>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={i} className={`step ${s.emphasis ? `step--${s.emphasis}` : ''}`}>
            <div className="step__index">{i + 1}</div>
            <div className="step__body">
              <div className="step__head">
                <code className="step__symbol">{s.symbol}</code>
                <span className="step__label">{s.label}</span>
              </div>
              {showFormulas && s.formula && <code className="step__formula">{s.formula}</code>}
              {showFormulas && s.substitution && <code className="step__subst">= {s.substitution}</code>}
              {s.note && <p className="step__note">{s.note}</p>}
            </div>
            <div className="step__value">{fmtByUnit(s.value, s.unit)}</div>
          </li>
        ))}
      </ol>
    </section>
  )
}

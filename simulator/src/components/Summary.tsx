import type { ReactNode } from 'react'

export interface SummaryItem {
  label: string
  value: string
  hint?: string
  tone?: 'result' | 'warning' | 'neutral'
}

/** Řada klíčových výsledků nad krokovým průchodem. */
export function Summary({ items }: { items: SummaryItem[] }) {
  return (
    <div className="summary">
      {items.map((it) => (
        <div key={it.label} className={`summary__item summary__item--${it.tone ?? 'neutral'}`}>
          <div className="summary__label">{it.label}</div>
          <div className="summary__value">{it.value}</div>
          {it.hint && <div className="summary__hint">{it.hint}</div>}
        </div>
      ))}
    </div>
  )
}

export function PageHeader({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children}
    </header>
  )
}

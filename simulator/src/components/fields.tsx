import type { ReactNode } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  step?: number
  min?: number
  max?: number
  help?: string
  /** zobrazit jako kompaktní řádek (např. v tabulce) */
  compact?: boolean
}

export function NumberField({ label, value, onChange, unit, step = 1, min, max, help, compact }: NumberFieldProps) {
  return (
    <label className={compact ? 'field field--compact' : 'field'} title={help}>
      <span className="field__label">{label}</span>
      <span className="field__control">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const v = e.target.valueAsNumber
            onChange(Number.isNaN(v) ? 0 : v)
          }}
        />
        {unit && <span className="field__unit">{unit}</span>}
      </span>
      {help && !compact && <span className="field__help">{help}</span>}
    </label>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  help?: string
}

export function SelectField<T extends string>({ label, value, onChange, options, help }: SelectFieldProps<T>) {
  return (
    <label className="field" title={help}>
      <span className="field__label">{label}</span>
      <span className="field__control">
        <select value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
      {help && <span className="field__help">{help}</span>}
    </label>
  )
}

interface ToggleFieldProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  help?: string
}

export function ToggleField({ label, checked, onChange, help }: ToggleFieldProps) {
  return (
    <label className="field field--toggle" title={help}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="field__label">{label}</span>
        {help && <span className="field__help">{help}</span>}
      </span>
    </label>
  )
}

export function FieldGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return <div className={`field-grid field-grid--${columns}`}>{children}</div>
}

export function Card({ title, subtitle, children, actions }: { title?: string; subtitle?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card__header">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Callout({ kind = 'info', children }: { kind?: 'info' | 'warning' | 'success'; children: ReactNode }) {
  return <div className={`callout callout--${kind}`}>{children}</div>
}

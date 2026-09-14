import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface SeriesDef {
  key: string
  name: string
  dashed?: boolean
}

interface SensitivityChartProps {
  data: Record<string, number>[]
  xKey: string
  xLabel: string
  series: SeriesDef[]
  yFormatter: (v: number) => string
  xFormatter?: (v: number) => string
  /** svislá čára pro aktuální hodnotu scénáře */
  marker?: number
  markerLabel?: string
  height?: number
  yDomain?: [number | 'auto', number | 'auto']
}

const PALETTE = ['#0f6e8c', '#d9822b', '#5b8c3a', '#8c3a6e']

export function SensitivityChart({
  data,
  xKey,
  xLabel,
  series,
  yFormatter,
  xFormatter = (v) => v.toFixed(2),
  marker,
  markerLabel = 'scénář',
  height = 300,
  yDomain,
}: SensitivityChartProps) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 24, bottom: 24, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey={xKey}
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={xFormatter}
            label={{ value: xLabel, position: 'insideBottom', offset: -12, fill: 'var(--muted)', fontSize: 12 }}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
          />
          <YAxis tickFormatter={yFormatter} width={90} tick={{ fontSize: 12, fill: 'var(--muted)' }} domain={yDomain} />
          <Tooltip
            formatter={(value) => yFormatter(Number(value))}
            labelFormatter={(label) => `${xLabel}: ${xFormatter(Number(label))}`}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
          {marker !== undefined && (
            <ReferenceLine x={marker} stroke="var(--accent)" strokeDasharray="4 4" label={{ value: markerLabel, fill: 'var(--accent)', fontSize: 12, position: 'top' }} />
          )}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '6 4' : undefined}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

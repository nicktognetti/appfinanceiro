'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899',
]

interface DataItem {
  name: string
  value: number
}

interface Props {
  data: DataItem[]
  title: string
  height?: number
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, dark }: any) {
  if (active && payload && payload.length) {
    return (
      <div className={`px-3 py-2 rounded-lg shadow border text-sm ${
        dark
          ? 'bg-slate-800 border-slate-700 text-slate-100'
          : 'bg-white border-slate-100 text-slate-700'
      }`}>
        <p className="font-medium">{payload[0].name}</p>
        <p className={dark ? 'text-slate-300' : 'text-slate-600'}>{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function CategoryChart({ data, title, height = 280 }: Props) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const legendTextColor = dark ? '#94a3b8' : '#64748b'

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-sm">
        Sem dados para exibir
      </div>
    )
  }

  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip dark={dark} />} />
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: '12px', color: legendTextColor }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

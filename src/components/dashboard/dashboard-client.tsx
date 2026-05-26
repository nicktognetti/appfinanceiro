'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, ChevronDown,
  TrendingUp, TrendingDown, Wallet, X, Maximize2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import TransactionDialog from '@/components/transactions/transaction-dialog'
import CategoryChart from './category-chart'
import type { Transaction } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  Legend, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { useTheme } from 'next-themes'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const EXPENSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4']

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatCompact(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$${(v / 1_000).toFixed(0)}K`
  return `R$${v.toFixed(0)}`
}
function setter(fn: (v: string) => void) {
  return (v: string | null) => { if (v !== null) fn(v) }
}

interface Props { transactions: Transaction[] }

export default function DashboardClient({ transactions }: Props) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const now = new Date()

  const [month, setMonth]           = useState(MONTHS[now.getMonth()])
  const [year, setYear]             = useState(String(now.getFullYear()))
  const [expandedCard, setExpanded] = useState<'income' | 'expense' | null>(null)
  const [zoomedChart, setZoomedChart] = useState<string | null>(null)
  const [barSeries, setBarSeries]   = useState({ Receitas: true, Despesas: true, Investimentos: true })

  const years = useMemo(() => {
    const s = new Set(transactions.map(t => t.date.slice(0, 4)))
    s.add(String(now.getFullYear()))
    return [...s].sort((a, b) => Number(b) - Number(a))
  }, [transactions])

  /* ── Current period ─────────────────────────────── */
  const filtered = useMemo(() => {
    const mi = MONTHS.indexOf(month)
    return transactions.filter(t => {
      const d = parseISO(t.date)
      if (month !== 'all' && d.getMonth() !== mi)        return false
      if (year  !== 'all' && d.getFullYear() !== Number(year)) return false
      return true
    })
  }, [transactions, month, year])

  /* ── Previous period (for % comparison) ─────────── */
  const prevPeriod = useMemo(() => {
    const mi = MONTHS.indexOf(month)
    if (month !== 'all' && year !== 'all') {
      const pmi   = mi === 0 ? 11 : mi - 1
      const pYear = mi === 0 ? Number(year) - 1 : Number(year)
      return transactions.filter(t => {
        const d = parseISO(t.date)
        return d.getMonth() === pmi && d.getFullYear() === pYear
      })
    }
    if (month === 'all' && year !== 'all') {
      return transactions.filter(t => parseISO(t.date).getFullYear() === Number(year) - 1)
    }
    return []
  }, [transactions, month, year])

  const sum = (arr: Transaction[], type: string) =>
    arr.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0)

  const totalIncome     = sum(filtered, 'income')
  const totalExpense    = sum(filtered, 'expense')
  const totalInvestment = sum(filtered, 'investment')
  const balance         = totalIncome - totalExpense - totalInvestment

  const prevIncome     = sum(prevPeriod, 'income')
  const prevExpense    = sum(prevPeriod, 'expense')
  const prevInvestment = sum(prevPeriod, 'investment')

  function pct(cur: number, prev: number) {
    return prev === 0 ? null : ((cur - prev) / prev) * 100
  }

  /* ── Category breakdowns ────────────────────────── */
  function byCategory(type: string) {
    const m: Record<string, number> = {}
    filtered.filter(t => t.type === type).forEach(t => {
      m[t.category] = (m[t.category] ?? 0) + Number(t.amount)
    })
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }
  const expenseCats = useMemo(() => byCategory('expense'), [filtered])
  const incomeCats  = useMemo(() => byCategory('income'),  [filtered])

  /* ── Monthly chart data ─────────────────────────── */
  const monthlyData = useMemo(() => {
    const yr = year !== 'all' ? Number(year) : now.getFullYear()
    const yearly = transactions.filter(t => parseISO(t.date).getFullYear() === yr)
    let running = 0
    return MONTHS_SHORT.map((label, idx) => {
      const m   = yearly.filter(t => parseISO(t.date).getMonth() === idx)
      const inc = sum(m, 'income')
      const exp = sum(m, 'expense')
      const inv = sum(m, 'investment')
      running  += inc - exp - inv
      return { mes: label, Receitas: inc, Despesas: exp, Investimentos: inv, Saldo: running }
    })
  }, [transactions, year])

  const recentTxs = [...filtered]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  const isThisMonth = month === MONTHS[now.getMonth()] && year === String(now.getFullYear())
  const isThisYear  = month === 'all' && year === String(now.getFullYear())
  const isAllTime   = month === 'all' && year === 'all'
  const chartYear   = year !== 'all' ? year : String(now.getFullYear())

  const ttStyle = {
    backgroundColor: dark ? '#1e293b' : '#fff',
    border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
    color: dark ? '#f1f5f9' : '#334155',
    borderRadius: '8px', fontSize: '12px', padding: '8px 12px',
  }

  /* ── Mini components ────────────────────────────── */
  function PctBadge({ change }: { change: number | null }) {
    if (change === null) return null
    const up = change >= 0
    return (
      <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-500' : 'text-red-400'}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    )
  }

  function MiniBar({ ratio, color }: { ratio: number; color: string }) {
    return (
      <div className="mt-3 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(ratio * 100, 100)}%`, backgroundColor: color }} />
      </div>
    )
  }

  const grandTotal = totalIncome + totalExpense + totalInvestment || 1

  /* ── Chart zoom handlers ─────────────────────────────── */
  function openZoom(id: string) { setZoomedChart(id) }
  function closeZoom() { setZoomedChart(null) }

  useEffect(() => {
    if (!zoomedChart) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomedChart(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomedChart])

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Visão geral das suas finanças</p>
        </div>
        <TransactionDialog />
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {[
            { label: 'Este mês',     active: isThisMonth, fn: () => { setMonth(MONTHS[now.getMonth()]); setYear(String(now.getFullYear())) } },
            { label: 'Este ano',     active: isThisYear,  fn: () => { setMonth('all'); setYear(String(now.getFullYear())) } },
            { label: 'Todo período', active: isAllTime,   fn: () => { setMonth('all'); setYear('all') } },
          ].map(({ label, active, fn }) => (
            <Button
              key={label}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={fn}
              className={`text-xs h-8 ${active ? 'bg-blue-600 hover:bg-blue-700 border-blue-600' : 'dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <Select value={month} onValueChange={setter(setMonth)}>
            <SelectTrigger className="w-40 bg-white dark:bg-slate-800 dark:border-slate-700">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setter(setYear)}>
            <SelectTrigger className="w-32 bg-white dark:bg-slate-800 dark:border-slate-700">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Receitas */}
        <Card
          onClick={() => setExpanded(expandedCard === 'income' ? null : 'income')}
          className={`border-0 shadow-sm bg-white dark:bg-slate-800 cursor-pointer transition-all hover:shadow-md select-none ${expandedCard === 'income' ? 'ring-2 ring-green-500/40' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Receitas</p>
              <div className="flex items-center gap-1">
                <div className="bg-green-50 dark:bg-green-950/40 p-1.5 rounded-lg">
                  <ArrowUpCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                </div>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${expandedCard === 'income' ? 'rotate-180' : ''}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(totalIncome)}</p>
            <div className="flex items-center justify-between mt-1.5">
              <PctBadge change={pct(totalIncome, prevIncome)} />
              {prevPeriod.length > 0 && <p className="text-xs text-slate-400 dark:text-slate-500">vs anterior</p>}
            </div>
            <MiniBar ratio={totalIncome / grandTotal} color="#22c55e" />
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card
          onClick={() => setExpanded(expandedCard === 'expense' ? null : 'expense')}
          className={`border-0 shadow-sm bg-white dark:bg-slate-800 cursor-pointer transition-all hover:shadow-md select-none ${expandedCard === 'expense' ? 'ring-2 ring-red-500/40' : ''}`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Despesas</p>
              <div className="flex items-center gap-1">
                <div className="bg-red-50 dark:bg-red-950/40 p-1.5 rounded-lg">
                  <ArrowDownCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                </div>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${expandedCard === 'expense' ? 'rotate-180' : ''}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-red-500 dark:text-red-400 tabular-nums">{formatCurrency(totalExpense)}</p>
            <div className="flex items-center justify-between mt-1.5">
              <PctBadge change={pct(totalExpense, prevExpense)} />
              {prevPeriod.length > 0 && <p className="text-xs text-slate-400 dark:text-slate-500">vs anterior</p>}
            </div>
            <MiniBar ratio={totalExpense / (totalIncome || 1)} color="#ef4444" />
          </CardContent>
        </Card>

        {/* Investimentos */}
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Investimentos</p>
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-1.5 rounded-lg">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(totalInvestment)}</p>
            <div className="flex items-center justify-between mt-1.5">
              <PctBadge change={pct(totalInvestment, prevInvestment)} />
              {prevPeriod.length > 0 && <p className="text-xs text-slate-400 dark:text-slate-500">vs anterior</p>}
            </div>
            <MiniBar ratio={totalInvestment / grandTotal} color="#6366f1" />
          </CardContent>
        </Card>

        {/* Saldo */}
        <Card className={`border-0 shadow-sm col-span-2 lg:col-span-1 ${balance >= 0 ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-red-600 to-red-700'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Saldo Líquido</p>
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Wallet className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(balance)}</p>
            <p className="text-xs text-white/50 mt-1.5">receitas − despesas − invest.</p>
            <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full"
                style={{ width: `${Math.min(Math.max(balance / (totalIncome || 1) * 100, 0), 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Expanded category breakdown ──────────────── */}
      {expandedCard && (
        <Card className={`border-0 shadow-sm bg-white dark:bg-slate-800 ${expandedCard === 'income' ? 'ring-1 ring-green-500/30' : 'ring-1 ring-red-500/30'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {expandedCard === 'income' ? 'Receitas por categoria' : 'Despesas por categoria'}
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400" onClick={() => setExpanded(null)}>
              Fechar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <CategoryChart data={expandedCard === 'income' ? incomeCats : expenseCats} title="" />
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detalhamento</p>
                {(expandedCard === 'income' ? incomeCats : expenseCats).slice(0, 6).map((item, i) => {
                  const total = (expandedCard === 'income' ? incomeCats : expenseCats).reduce((s, x) => s + x.value, 0)
                  const p = total ? item.value / total * 100 : 0
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{item.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-400">{p.toFixed(1)}%</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(item.value)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Monthly bar + Accumulated area ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 relative group cursor-pointer" onClick={() => openZoom('bar')}>
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800 transition-shadow hover:shadow-md h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Evolução mensal — {chartYear}
              </CardTitle>
              <Maximize2 className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={monthlyData} barCategoryGap="22%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)'} vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} width={52} />
                  <ReTooltip contentStyle={ttStyle} formatter={(v) => [typeof v === 'number' ? formatCurrency(v) : v, '']} />
                  <Legend formatter={(v) => <span style={{ fontSize: 11, color: dark ? '#94a3b8' : '#64748b' }}>{v}</span>} />
                  <Bar dataKey="Receitas"     fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Despesas"     fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Investimentos" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 relative group cursor-pointer" onClick={() => openZoom('area')}>
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800 transition-shadow hover:shadow-md h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Saldo acumulado — {chartYear}
              </CardTitle>
              <Maximize2 className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)'} vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} width={50} />
                  <ReTooltip contentStyle={ttStyle} formatter={(v) => [typeof v === 'number' ? formatCurrency(v) : v, 'Saldo']} />
                  <Area type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={2} fill="url(#balGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Pie charts + Top gastos ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative group cursor-pointer" onClick={() => openZoom('pie-expense')}>
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800 transition-shadow hover:shadow-md h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">Despesas / categoria</CardTitle>
              <Maximize2 className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardHeader>
            <CardContent><CategoryChart data={expenseCats} title="" /></CardContent>
          </Card>
        </div>

        <div className="relative group cursor-pointer" onClick={() => openZoom('pie-income')}>
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800 transition-shadow hover:shadow-md h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">Receitas / categoria</CardTitle>
              <Maximize2 className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardHeader>
            <CardContent><CategoryChart data={incomeCats} title="" /></CardContent>
          </Card>
        </div>

        {/* Top 5 expenses */}
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">Top gastos</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseCats.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Sem dados</p>
            ) : (
              <div className="space-y-3.5">
                {expenseCats.slice(0, 5).map((item, i) => {
                  const p = (item.value / (expenseCats[0]?.value || 1)) * 100
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-4 tabular-nums">{i + 1}</span>
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{item.name}</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums text-xs">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: EXPENSE_COLORS[i] }} />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs">
                  <span className="text-slate-500">Total despesas</span>
                  <span className="font-bold text-red-500 tabular-nums">{formatCurrency(totalExpense)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Chart zoom overlay ───────────────────────── */}
      {zoomedChart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeZoom() }}
        >
          <Card className="w-full max-w-5xl bg-white dark:bg-slate-800 shadow-2xl border-0 max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-3 sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-slate-100 dark:border-slate-700">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {zoomedChart === 'bar' && `Evolução mensal — ${chartYear}`}
                {zoomedChart === 'area' && `Saldo acumulado — ${chartYear}`}
                {zoomedChart === 'pie-expense' && 'Despesas por categoria'}
                {zoomedChart === 'pie-income' && 'Receitas por categoria'}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {zoomedChart === 'bar' && (
                  <div className="flex gap-1.5">
                    {(['Receitas', 'Despesas', 'Investimentos'] as const).map(k => (
                      <button
                        key={k}
                        onClick={() => setBarSeries(p => ({ ...p, [k]: !p[k] }))}
                        className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${
                          barSeries[k]
                            ? k === 'Receitas'
                              ? 'bg-green-50 border-green-400 text-green-700 dark:bg-green-950/40 dark:border-green-700 dark:text-green-400'
                              : k === 'Despesas'
                              ? 'bg-red-50 border-red-400 text-red-700 dark:bg-red-950/40 dark:border-red-700 dark:text-red-400'
                              : 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-700 dark:text-indigo-400'
                            : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={closeZoom}
                  className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {zoomedChart === 'bar' && (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={monthlyData} barCategoryGap="22%" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)'} vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatCompact} tick={{ fontSize: 12, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} width={56} />
                    <ReTooltip contentStyle={ttStyle} formatter={(v) => [typeof v === 'number' ? formatCurrency(v) : v, '']} />
                    <Legend formatter={(v) => <span style={{ fontSize: 12, color: dark ? '#94a3b8' : '#64748b' }}>{v}</span>} />
                    {barSeries.Receitas     && <Bar dataKey="Receitas"      fill="#22c55e" radius={[4, 4, 0, 0]} />}
                    {barSeries.Despesas     && <Bar dataKey="Despesas"      fill="#ef4444" radius={[4, 4, 0, 0]} />}
                    {barSeries.Investimentos && <Bar dataKey="Investimentos" fill="#6366f1" radius={[4, 4, 0, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              )}
              {zoomedChart === 'area' && (
                <ResponsiveContainer width="100%" height={420}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="balGradZoom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)'} vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatCompact} tick={{ fontSize: 12, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} width={56} />
                    <ReTooltip contentStyle={ttStyle} formatter={(v) => [typeof v === 'number' ? formatCurrency(v) : v, 'Saldo']} />
                    <Area type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={2.5} fill="url(#balGradZoom)" dot={{ r: 3, fill: '#3b82f6' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {(zoomedChart === 'pie-expense' || zoomedChart === 'pie-income') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <CategoryChart
                    data={zoomedChart === 'pie-expense' ? expenseCats : incomeCats}
                    title=""
                    height={360}
                  />
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-800 pb-1">
                      Detalhamento completo
                    </p>
                    {(zoomedChart === 'pie-expense' ? expenseCats : incomeCats).map((item, i) => {
                      const cats = zoomedChart === 'pie-expense' ? expenseCats : incomeCats
                      const total = cats.reduce((s, x) => s + x.value, 0)
                      const p = total ? item.value / total * 100 : 0
                      return (
                        <div key={item.name}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{item.name}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-slate-400">{p.toFixed(1)}%</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums text-xs">{formatCurrency(item.value)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Recent transactions ──────────────────────── */}
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Transações recentes</CardTitle>
          <span className="text-xs text-slate-400 dark:text-slate-500">{recentTxs.length} de {filtered.length}</span>
        </CardHeader>
        <CardContent>
          {recentTxs.length === 0 ? (
            <p className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">Nenhuma transação no período</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentTxs.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    t.type === 'income'     ? 'bg-green-50 dark:bg-green-950/40'
                    : t.type === 'investment' ? 'bg-indigo-50 dark:bg-indigo-950/40'
                    : 'bg-red-50 dark:bg-red-950/40'
                  }`}>
                    {t.type === 'income'
                      ? <ArrowUpCircle  className="h-4 w-4 text-green-600 dark:text-green-400" />
                      : t.type === 'investment'
                      ? <TrendingUp     className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      : <ArrowDownCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{t.description}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t.category} · {format(parseISO(t.date), 'dd MMM', { locale: ptBR })}
                    </p>
                  </div>
                  <p className={`font-semibold text-sm flex-shrink-0 tabular-nums ${
                    t.type === 'income'     ? 'text-green-600 dark:text-green-400'
                    : t.type === 'investment' ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-red-500 dark:text-red-400'
                  }`}>
                    {t.type === 'income' ? '+' : ''}{formatCurrency(Number(t.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

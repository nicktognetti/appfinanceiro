'use client'

import { useState, useMemo } from 'react'
import { updateCurrentValue, updatePriceForTicker } from '@/app/actions/transactions'
import { createDividend, deleteDividend } from '@/app/actions/dividends'
import {
  BarChart2, Check, Loader2, Pencil, Trash2, TrendingDown, TrendingUp, X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import CategoryChart from '@/components/dashboard/category-chart'
import type { Dividend, Transaction } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface StockPosition {
  ticker: string
  quantity: number
  invested: number
  currentValue: number
  avgCost: number
  currentPrice: number
  transactions: Transaction[]
}

interface Props {
  investments: Transaction[]
  dividends: Dividend[]
}

type Tab = 'portfolio' | 'acoes' | 'dividendos'

export default function InvestmentsClient({ investments, dividends }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('portfolio')

  // ── Summary numbers ──────────────────────────────────────────────
  const totalInvested = investments.reduce((s, t) => s + Number(t.amount), 0)
  const totalCurrentValue = investments.reduce((s, t) => s + Number(t.current_value ?? t.amount), 0)
  const totalReturn = totalCurrentValue - totalInvested
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0
  const totalDividends = dividends.reduce((s, d) => s + Number(d.amount), 0)

  // ── Portfólio tab state ──────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  async function handleSaveCurrentValue(id: string) {
    const val = parseFloat(editValue)
    if (isNaN(val) || val <= 0) return
    setSavingId(id)
    await updateCurrentValue(id, val)
    setSavingId(null)
    setEditingId(null)
    setEditValue('')
  }

  // ── Ações tab state ──────────────────────────────────────────────
  const [tickerEditing, setTickerEditing] = useState<string | null>(null)
  const [tickerPrice, setTickerPrice] = useState('')
  const [tickerSaving, setTickerSaving] = useState<string | null>(null)
  const [tickerError, setTickerError] = useState<string | null>(null)

  async function handleSaveTickerPrice(ticker: string) {
    const price = parseFloat(tickerPrice)
    if (isNaN(price) || price <= 0) return
    setTickerSaving(ticker)
    setTickerError(null)
    const result = await updatePriceForTicker(ticker, price)
    if (result?.error) setTickerError(result.error)
    setTickerSaving(null)
    setTickerEditing(null)
    setTickerPrice('')
  }

  // ── Stock positions ──────────────────────────────────────────────
  const stockPositions = useMemo<StockPosition[]>(() => {
    const map: Record<string, StockPosition> = {}
    investments.filter(t => t.ticker).forEach(t => {
      const ticker = t.ticker!
      if (!map[ticker]) {
        map[ticker] = { ticker, quantity: 0, invested: 0, currentValue: 0, avgCost: 0, currentPrice: 0, transactions: [] }
      }
      const pos = map[ticker]
      pos.transactions.push(t)
      pos.quantity += Number(t.quantity ?? 0)
      pos.invested += Number(t.amount)
      pos.currentValue += Number(t.current_value ?? t.amount)
    })
    Object.values(map).forEach(pos => {
      pos.avgCost = pos.quantity > 0 ? pos.invested / pos.quantity : 0
      pos.currentPrice = pos.quantity > 0 ? pos.currentValue / pos.quantity : 0
    })
    return Object.values(map).sort((a, b) => b.currentValue - a.currentValue)
  }, [investments])

  const dividendsByTicker = useMemo(() => {
    const map: Record<string, number> = {}
    dividends.forEach(d => { map[d.ticker] = (map[d.ticker] ?? 0) + Number(d.amount) })
    return map
  }, [dividends])

  const portfolioTickers = [...new Set(investments.filter(t => t.ticker).map(t => t.ticker!))]

  // ── Chart data ───────────────────────────────────────────────────
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    investments.forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.current_value ?? t.amount)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [investments])

  // ── Dividends tab state ──────────────────────────────────────────
  const [divTicker, setDivTicker] = useState('')
  const [divAmount, setDivAmount] = useState('')
  const [divDate, setDivDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [divPeriod, setDivPeriod] = useState('')
  const [divLoading, setDivLoading] = useState(false)
  const [divError, setDivError] = useState<string | null>(null)
  const [deletingDivId, setDeletingDivId] = useState<string | null>(null)

  async function handleAddDividend(e: React.FormEvent) {
    e.preventDefault()
    setDivLoading(true)
    setDivError(null)
    const fd = new FormData()
    fd.set('ticker', divTicker)
    fd.set('amount', divAmount)
    fd.set('date', divDate)
    fd.set('period', divPeriod)
    const result = await createDividend(fd)
    if (result?.error) { setDivError(result.error); setDivLoading(false); return }
    setDivAmount('')
    setDivPeriod('')
    setDivLoading(false)
  }

  async function handleDeleteDividend(id: string) {
    setDeletingDivId(id)
    await deleteDividend(id)
    setDeletingDivId(null)
  }

  // ── Tab button style helper ──────────────────────────────────────
  function tabCls(tab: Tab) {
    return `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      activeTab === tab
        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
    }`
  }

  // ── Empty state ──────────────────────────────────────────────────
  if (investments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Investimentos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Acompanhe seu patrimônio</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center py-16 text-slate-400 dark:text-slate-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhum investimento cadastrado</p>
          <p className="text-sm mt-1">Adicione uma transação do tipo 📈 Investimento.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Investimentos</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Acompanhe seu patrimônio</p>
      </div>

      {/* Summary cards (always visible) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Investido</p>
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg">
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{fmt(totalInvested)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Valor Atual</p>
              <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg">
                <BarChart2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{fmt(totalCurrentValue)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rendimento</p>
              <div className={`p-2 rounded-lg ${totalReturn >= 0 ? 'bg-green-50 dark:bg-green-950/40' : 'bg-red-50 dark:bg-red-950/40'}`}>
                {totalReturn >= 0
                  ? <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  : <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400" />
                }
              </div>
            </div>
            <p className={`text-xl font-bold ${totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {totalReturn >= 0 ? '+' : ''}{fmt(totalReturn)}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm col-span-2 lg:col-span-1 ${returnPct >= 0 ? 'bg-indigo-600' : 'bg-red-600'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/80">% Rendimento</p>
              <div className="bg-white/20 p-2 rounded-lg">
                {returnPct >= 0
                  ? <TrendingUp className="h-4 w-4 text-white" />
                  : <TrendingDown className="h-4 w-4 text-white" />
                }
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
        <button onClick={() => setActiveTab('portfolio')} className={tabCls('portfolio')}>
          Portfólio
        </button>
        {stockPositions.length > 0 && (
          <button onClick={() => setActiveTab('acoes')} className={tabCls('acoes')}>
            Ações ({stockPositions.length})
          </button>
        )}
        <button onClick={() => setActiveTab('dividendos')} className={tabCls('dividendos')}>
          Dividendos {totalDividends > 0 && <span className="ml-1 text-xs opacity-70">{fmt(totalDividends)}</span>}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════
          TAB: PORTFÓLIO
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'portfolio' && (
        <>
          {/* Gráfico por categoria */}
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Distribuição por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryChart data={byCategory} title="" />
            </CardContent>
          </Card>

          {/* Lista de todos os investimentos */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Todos os investimentos</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {investments.map(t => {
                const currentVal = Number(t.current_value ?? t.amount)
                const ret = currentVal - Number(t.amount)
                const retPct = Number(t.amount) > 0 ? (ret / Number(t.amount)) * 100 : 0
                const isEditing = editingId === t.id

                return (
                  <div key={t.id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg flex-shrink-0 mt-0.5">
                        <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{t.description}</p>
                          {t.ticker && (
                            <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                              {t.ticker}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs py-0">{t.category}</Badge>
                          {t.quantity && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">{Number(t.quantity).toLocaleString('pt-BR')} cotas</span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {format(parseISO(t.date), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Investido</span>
                            <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{fmt(Number(t.amount))}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Valor atual</span>
                            {/* For stock positions, direct value update is disabled — use Ações tab */}
                            {t.ticker ? (
                              <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5 text-xs">{fmt(currentVal)}</p>
                            ) : isEditing ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Input
                                  type="number" step="0.01" min="0.01"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveCurrentValue(t.id)
                                    if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                                  }}
                                  className="h-6 text-xs px-1.5 w-24" autoFocus
                                />
                                <Button type="button" size="icon" onClick={() => handleSaveCurrentValue(t.id)} disabled={savingId === t.id} className="h-6 w-6">
                                  {savingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button type="button" variant="outline" size="icon" onClick={() => { setEditingId(null); setEditValue('') }} className="h-6 w-6">
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 mt-0.5">
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{fmt(currentVal)}</p>
                                <button type="button" onClick={() => { setEditingId(t.id); setEditValue(String(currentVal)) }} className="text-slate-400 hover:text-blue-500 transition-colors" title="Atualizar valor">
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Rendimento</span>
                            <p className={`font-semibold mt-0.5 ${ret >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {ret >= 0 ? '+' : ''}{fmt(ret)}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">% Rend.</span>
                            <p className={`font-semibold mt-0.5 ${retPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {retPct >= 0 ? '+' : ''}{retPct.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                        {t.ticker && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                            Atualize o preço na aba <button className="underline text-blue-500" onClick={() => setActiveTab('acoes')}>Ações</button>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB: AÇÕES
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'acoes' && (
        <>
          {tickerError && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">
              {tickerError}
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Posições por ticker</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Clique no lápis para atualizar o preço</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {stockPositions.map(pos => {
                const ret = pos.currentValue - pos.invested
                const retPct = pos.invested > 0 ? (ret / pos.invested) * 100 : 0
                const divReceived = dividendsByTicker[pos.ticker] ?? 0
                const totalWithDiv = ret + divReceived
                const isEditing = tickerEditing === pos.ticker

                return (
                  <div key={pos.ticker} className="px-4 py-5">
                    <div className="flex items-start gap-4">
                      {/* Ticker badge */}
                      <div className="bg-indigo-600 text-white text-sm font-bold px-3 py-2 rounded-lg flex-shrink-0 min-w-[60px] text-center">
                        {pos.ticker}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Row 1: Qtd, preço médio, preço atual */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-3">
                          <span className="text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{pos.quantity.toLocaleString('pt-BR')}</span> cotas
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Custo médio: <span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(pos.avgCost)}</span>
                          </span>
                          {/* Preço atual (editable) */}
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            Preço atual:
                            {isEditing ? (
                              <>
                                <Input
                                  type="number" step="0.01" min="0.01"
                                  value={tickerPrice}
                                  onChange={e => setTickerPrice(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveTickerPrice(pos.ticker)
                                    if (e.key === 'Escape') { setTickerEditing(null); setTickerPrice('') }
                                  }}
                                  placeholder={String(pos.currentPrice.toFixed(2))}
                                  className="h-6 text-xs px-1.5 w-24 ml-1 inline-flex" autoFocus
                                />
                                <Button type="button" size="icon" onClick={() => handleSaveTickerPrice(pos.ticker)} disabled={tickerSaving === pos.ticker} className="h-6 w-6 ml-1">
                                  {tickerSaving === pos.ticker ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button type="button" variant="outline" size="icon" onClick={() => { setTickerEditing(null); setTickerPrice('') }} className="h-6 w-6">
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-slate-700 dark:text-slate-200 ml-1">{fmt(pos.currentPrice)}</span>
                                <button type="button" onClick={() => { setTickerEditing(pos.ticker); setTickerPrice(pos.currentPrice.toFixed(2)) }} className="text-slate-400 hover:text-blue-500 transition-colors ml-1" title="Atualizar preço">
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Row 2: Invested, Current, P&L, Dividends */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Investido</span>
                            <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{fmt(pos.invested)}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Valor atual</span>
                            <p className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{fmt(pos.currentValue)}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">P&L (ação)</span>
                            <p className={`font-semibold mt-0.5 ${ret >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {ret >= 0 ? '+' : ''}{fmt(ret)} ({retPct >= 0 ? '+' : ''}{retPct.toFixed(2)}%)
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Dividendos recebidos</span>
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{fmt(divReceived)}</p>
                          </div>
                        </div>

                        {/* Total return including dividends */}
                        {divReceived > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Retorno total (P&L + Dividendos):{' '}
                            <span className={`font-semibold ${totalWithDiv >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {totalWithDiv >= 0 ? '+' : ''}{fmt(totalWithDiv)}
                            </span>
                          </p>
                        )}

                        {/* Purchases breakdown */}
                        {pos.transactions.length > 1 && (
                          <details className="mt-2">
                            <summary className="text-xs text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">
                              {pos.transactions.length} compras
                            </summary>
                            <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-100 dark:border-slate-700">
                              {pos.transactions.map(t => (
                                <div key={t.id} className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                                  <span>{format(parseISO(t.date), 'dd/MM/yyyy')}</span>
                                  <span>{t.quantity ? `${Number(t.quantity).toLocaleString('pt-BR')} × ` : ''}{fmt(Number(t.amount) / (Number(t.quantity) || 1))}</span>
                                  <span>= {fmt(Number(t.amount))}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB: DIVIDENDOS
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'dividendos' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-white dark:bg-slate-800 col-span-2 sm:col-span-1">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Total Dividendos</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalDividends)}</p>
              </CardContent>
            </Card>
            {Object.entries(dividendsByTicker).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([ticker, val]) => (
              <Card key={ticker} className="border-0 shadow-sm bg-white dark:bg-slate-800">
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{ticker}</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(val)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add dividend form */}
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Registrar dividendo</CardTitle>
            </CardHeader>
            <CardContent>
              {divError && (
                <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 mb-4">
                  {divError}
                </div>
              )}
              <form onSubmit={handleAddDividend} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="div-ticker">Ticker</Label>
                  {portfolioTickers.length > 0 ? (
                    <select
                      id="div-ticker"
                      value={divTicker}
                      onChange={e => setDivTicker(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {portfolioTickers.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <Input
                      id="div-ticker"
                      value={divTicker}
                      onChange={e => setDivTicker(e.target.value.toUpperCase())}
                      placeholder="BBSE3"
                      maxLength={10}
                      required
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="div-amount">Valor (R$)</Label>
                  <Input
                    id="div-amount"
                    type="number" step="0.01" min="0.01"
                    value={divAmount}
                    onChange={e => setDivAmount(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="div-date">Data</Label>
                  <Input
                    id="div-date"
                    type="date"
                    value={divDate}
                    onChange={e => setDivDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="div-period">Período <span className="text-xs font-normal text-slate-400">(opcional)</span></Label>
                  <Input
                    id="div-period"
                    value={divPeriod}
                    onChange={e => setDivPeriod(e.target.value)}
                    placeholder="Ex: Jun/2025"
                    maxLength={30}
                  />
                </div>
                <div className="col-span-2 sm:col-span-4 flex justify-end">
                  <Button type="submit" disabled={divLoading} className="gap-2">
                    {divLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Registrar dividendo
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Dividend history */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Histórico de dividendos</h2>
            </div>
            {dividends.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
                Nenhum dividendo registrado ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {dividends.map(d => (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                          {d.ticker}
                        </span>
                        {d.period && (
                          <Badge variant="secondary" className="text-xs py-0">{d.period}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {format(parseISO(d.date), "dd MMM yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm flex-shrink-0">
                      +{fmt(Number(d.amount))}
                    </p>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                      onClick={() => handleDeleteDividend(d.id)}
                      disabled={deletingDivId === d.id}
                    >
                      {deletingDivId === d.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

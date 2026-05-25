'use client'

import { useState, useMemo } from 'react'
import { updateCurrentValue } from '@/app/actions/transactions'
import { BarChart2, Check, Loader2, Pencil, TrendingDown, TrendingUp, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import CategoryChart from '@/components/dashboard/category-chart'
import type { Transaction } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  investments: Transaction[]
}

export default function InvestmentsClient({ investments }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const totalInvested = investments.reduce((s, t) => s + Number(t.amount), 0)
  const totalCurrentValue = investments.reduce((s, t) => s + Number(t.current_value ?? t.amount), 0)
  const totalReturn = totalCurrentValue - totalInvested
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    investments.forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.current_value ?? t.amount)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [investments])

  async function handleSaveCurrentValue(id: string) {
    const val = parseFloat(editValue)
    if (isNaN(val) || val <= 0) return
    setSavingId(id)
    await updateCurrentValue(id, val)
    setSavingId(null)
    setEditingId(null)
    setEditValue('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Investimentos</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Acompanhe seu patrimônio</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Investido</p>
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg">
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalInvested)}</p>
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
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalCurrentValue)}</p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${totalReturn >= 0 ? 'bg-white dark:bg-slate-800' : 'bg-white dark:bg-slate-800'}`}>
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
              {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
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

      {investments.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center py-16 text-slate-400 dark:text-slate-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhum investimento cadastrado</p>
          <p className="text-sm mt-1">Adicione uma transação do tipo 📈 Investimento.</p>
        </div>
      ) : (
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

          {/* Carteira */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Carteira de Investimentos</h2>
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
                        <p className="font-medium text-slate-800 dark:text-slate-100">{t.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs py-0">{t.category}</Badge>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {format(parseISO(t.date), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Investido</span>
                            <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{formatCurrency(Number(t.amount))}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Valor atual</span>
                            {isEditing ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveCurrentValue(t.id)
                                    if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                                  }}
                                  className="h-6 text-xs px-1.5 w-24"
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  onClick={() => handleSaveCurrentValue(t.id)}
                                  disabled={savingId === t.id}
                                  className="h-6 w-6"
                                >
                                  {savingId === t.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Check className="h-3 w-3" />
                                  }
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => { setEditingId(null); setEditValue('') }}
                                  className="h-6 w-6"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 mt-0.5">
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(currentVal)}</p>
                                <button
                                  type="button"
                                  onClick={() => { setEditingId(t.id); setEditValue(String(currentVal)) }}
                                  className="text-slate-400 hover:text-blue-500 transition-colors"
                                  title="Atualizar valor"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">Rendimento</span>
                            <p className={`font-semibold mt-0.5 ${ret >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {ret >= 0 ? '+' : ''}{formatCurrency(ret)}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-slate-500">% Rend.</span>
                            <p className={`font-semibold mt-0.5 ${retPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {retPct >= 0 ? '+' : ''}{retPct.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

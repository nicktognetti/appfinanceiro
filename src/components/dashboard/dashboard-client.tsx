'use client'

import { useState, useMemo } from 'react'
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import TransactionDialog from '@/components/transactions/transaction-dialog'
import CategoryChart from './category-chart'
import type { Transaction } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function setter(fn: (v: string) => void) {
  return (v: string | null) => { if (v !== null) fn(v) }
}

interface Props {
  transactions: Transaction[]
}

export default function DashboardClient({ transactions }: Props) {
  const currentDate = new Date()
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1))
  const [year, setYear] = useState(String(currentDate.getFullYear()))

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => t.date.slice(0, 4)))
    set.add(String(currentDate.getFullYear()))
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [transactions, currentDate])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const d = parseISO(t.date)
      if (month !== 'all' && d.getMonth() + 1 !== Number(month)) return false
      if (year !== 'all' && d.getFullYear() !== Number(year)) return false
      return true
    })
  }, [transactions, month, year])

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalInvestment = filtered.filter(t => t.type === 'investment').reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalIncome - totalExpense - totalInvestment

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.filter(t => t.type === 'income').forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const recentTransactions = [...filtered]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Visão geral das suas finanças</p>
        </div>
        <TransactionDialog />
      </div>

      {/* Filtro de período */}
      <div className="flex gap-3">
        <Select value={month} onValueChange={setter(setMonth)}>
          <SelectTrigger className="w-40 bg-white dark:bg-slate-800 dark:border-slate-700">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
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

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Receitas</p>
              <div className="bg-green-50 dark:bg-green-950/40 p-2 rounded-lg">
                <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Despesas</p>
              <div className="bg-red-50 dark:bg-red-950/40 p-2 rounded-lg">
                <ArrowDownCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-red-500 dark:text-red-400">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Investimentos</p>
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg">
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalInvestment)}</p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm col-span-2 lg:col-span-1 ${balance >= 0 ? 'bg-blue-600' : 'bg-red-600'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/80">Saldo Líquido</p>
              <div className="bg-white/20 p-2 rounded-lg">
                <Wallet className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{formatCurrency(balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={expenseByCategory} title="" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Receitas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={incomeByCategory} title="" />
          </CardContent>
        </Card>
      </div>

      {/* Transações recentes */}
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Transações recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              Nenhuma transação no período selecionado
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentTransactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    t.type === 'income'
                      ? 'bg-green-50 dark:bg-green-950/40'
                      : t.type === 'investment'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40'
                      : 'bg-red-50 dark:bg-red-950/40'
                  }`}>
                    {t.type === 'income'
                      ? <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      : t.type === 'investment'
                      ? <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      : <ArrowDownCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{t.description}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t.category} · {format(parseISO(t.date), "dd MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <p className={`font-semibold text-sm flex-shrink-0 ${
                    t.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : t.type === 'investment'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}>
                    {t.type === 'income' ? '+' : t.type === 'investment' ? '📈' : '-'}{formatCurrency(Number(t.amount))}
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

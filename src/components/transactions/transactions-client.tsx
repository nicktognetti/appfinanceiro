'use client'

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDownCircle, ArrowUpCircle, Download, Pencil, Search } from 'lucide-react'
import type { Transaction } from '@/types/database'
import { CATEGORIES } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import TransactionDialog from './transaction-dialog'
import DeleteButton from './delete-button'

interface Props {
  transactions: Transaction[]
}

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

export default function TransactionsClient({ transactions }: Props) {
  const currentDate = new Date()
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1))
  const [year, setYear] = useState(String(currentDate.getFullYear()))
  const [category, setCategory] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => t.date.slice(0, 4)))
    set.add(String(currentDate.getFullYear()))
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [transactions, currentDate])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseISO(t.date)
      if (month !== 'all' && tDate.getMonth() + 1 !== Number(month)) return false
      if (year !== 'all' && tDate.getFullYear() !== Number(year)) return false
      if (category !== 'all' && t.category !== category) return false
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transactions, month, year, category, typeFilter, search])

  function exportCSV() {
    const header = 'Data,Descrição,Tipo,Categoria,Valor\n'
    const rows = filtered.map(t =>
      `${t.date},"${t.description}",${t.type === 'income' ? 'Receita' : 'Despesa'},"${t.category}",${t.amount}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transacoes-${year}-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transações</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} transação(ões) encontrada(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <TransactionDialog />
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={month} onValueChange={setter(setMonth)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={setter(setYear)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setter(setTypeFilter)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3">
          <Select value={category} onValueChange={setter(setCategory)}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumo filtrado */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <p className="text-xs text-green-600 font-medium mb-1">Receitas filtradas</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <p className="text-xs text-red-600 font-medium mb-1">Despesas filtradas</p>
          <p className="text-lg font-bold text-red-700">{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      {/* Lista de transações */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">Nenhuma transação encontrada</p>
            <p className="text-sm mt-1">Ajuste os filtros ou adicione uma nova transação.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  t.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {t.type === 'income'
                    ? <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    : <ArrowDownCircle className="h-4 w-4 text-red-500" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs py-0">
                      {t.category}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {format(parseISO(t.date), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className={`font-semibold ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                  </p>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <TransactionDialog
                    transaction={t}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-500 hover:bg-blue-50">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DeleteButton id={t.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

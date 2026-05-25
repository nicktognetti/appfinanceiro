'use client'

import { useState } from 'react'
import { createTransaction, updateTransaction } from '@/app/actions/transactions'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Transaction } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'

interface Props {
  transaction?: Transaction
  onSuccess: () => void
  onCancel: () => void
}

export default function TransactionForm({ transaction, onSuccess, onCancel }: Props) {
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? 'expense')
  const [category, setCategory] = useState(transaction?.category ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('type', type)
    formData.set('category', category)

    const result = transaction
      ? await updateTransaction(transaction.id, formData)
      : await createTransaction(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setType('income'); setCategory('') }}
            className={`py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
              type === 'income'
                ? 'bg-green-50 dark:bg-green-950/40 border-green-500 text-green-700 dark:text-green-400'
                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
          >
            Receita
          </button>
          <button
            type="button"
            onClick={() => { setType('expense'); setCategory('') }}
            className={`py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
              type === 'expense'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-400'
                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
          >
            Despesa
          </button>
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          placeholder="Ex: Supermercado, Salário..."
          defaultValue={transaction?.description}
          required
        />
      </div>

      {/* Valor */}
      <div className="space-y-2">
        <Label htmlFor="amount">Valor (R$)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          defaultValue={transaction?.amount}
          required
        />
      </div>

      {/* Data */}
      <div className="space-y-2">
        <Label htmlFor="date">Data</Label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={transaction?.date ?? format(new Date(), 'yyyy-MM-dd')}
          required
        />
      </div>

      {/* Categoria */}
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select value={category} onValueChange={(v) => v !== null && setCategory(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !category} className="flex-1">
          {loading ? 'Salvando...' : transaction ? 'Salvar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  )
}

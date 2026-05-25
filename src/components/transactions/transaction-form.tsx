'use client'

import { useState, useEffect, useRef } from 'react'
import { createTransaction, updateTransaction } from '@/app/actions/transactions'
import { createCategory } from '@/app/actions/categories'
import { createClient } from '@/lib/supabase/client'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INVESTMENT_CATEGORIES,
  type Transaction,
  type TransactionType,
} from '@/types/database'
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
import { Plus, X, Check, Loader2 } from 'lucide-react'

interface Props {
  transaction?: Transaction
  onSuccess: () => void
  onCancel: () => void
}

export default function TransactionForm({ transaction, onSuccess, onCancel }: Props) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense')
  const [category, setCategory] = useState(transaction?.category ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const newCategoryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const dbType = type === 'investment' ? 'both' : type
    supabase
      .from('user_categories')
      .select('name')
      .or(`type.eq.${dbType},type.eq.both`)
      .order('name')
      .then(({ data }) => {
        if (data) setCustomCategories(data.map(c => c.name))
      })
  }, [type])

  useEffect(() => {
    if (showNewCategory) {
      setTimeout(() => newCategoryInputRef.current?.focus(), 50)
    }
  }, [showNewCategory])

  const defaultCategories =
    type === 'income'
      ? INCOME_CATEGORIES
      : type === 'investment'
      ? INVESTMENT_CATEGORIES
      : EXPENSE_CATEGORIES

  function handleTypeChange(newType: TransactionType) {
    setType(newType)
    setCategory('')
    setShowNewCategory(false)
    setNewCategoryName('')
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim()
    if (!name) return

    setSavingCategory(true)
    setCategoryError(null)

    const categoryType = type === 'investment' ? 'both' : type
    const result = await createCategory(name, categoryType)

    if (result?.error) {
      setCategoryError(result.error)
      setSavingCategory(false)
      return
    }

    setCustomCategories(prev => [...prev.filter(c => c !== name), name].sort())
    setCategory(name)
    setShowNewCategory(false)
    setNewCategoryName('')
    setSavingCategory(false)
  }

  function handleCancelNewCategory() {
    setShowNewCategory(false)
    setNewCategoryName('')
    setCategoryError(null)
  }

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

  const categoryTypeName =
    type === 'income' ? 'receita' : type === 'investment' ? 'investimento' : 'despesa'

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
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              type === 'income'
                ? 'bg-green-50 dark:bg-green-950/40 border-green-500 text-green-700 dark:text-green-400'
                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
          >
            💰 Receita
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              type === 'expense'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-400'
                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
          >
            💸 Despesa
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('investment')}
            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              type === 'investment'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
          >
            📈 Investimento
          </button>
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          placeholder={type === 'investment' ? 'Ex: XPTO3, Tesouro Selic...' : 'Ex: Supermercado, Salário...'}
          defaultValue={transaction?.description}
          required
        />
      </div>

      {/* Valor investido */}
      <div className="space-y-2">
        <Label htmlFor="amount">{type === 'investment' ? 'Valor Investido (R$)' : 'Valor (R$)'}</Label>
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

      {/* Ticker + Quantidade (somente Renda Variável) */}
      {type === 'investment' && category === 'Renda Variável' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ticker">Código (ticker)</Label>
            <Input
              id="ticker"
              name="ticker"
              placeholder="Ex: BBSE3"
              defaultValue={transaction?.ticker ?? ''}
              style={{ textTransform: 'uppercase' }}
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade de cotas</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="1"
              min="1"
              placeholder="Ex: 100"
              defaultValue={transaction?.quantity ?? ''}
            />
          </div>
        </div>
      )}

      {/* Valor atual (somente investimentos não-ação) */}
      {type === 'investment' && category !== 'Renda Variável' && (
        <div className="space-y-2">
          <Label htmlFor="current_value">
            Valor Atual (R$)
            <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">— opcional</span>
          </Label>
          <Input
            id="current_value"
            name="current_value"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Deixe em branco para usar o valor investido"
            defaultValue={transaction?.current_value ?? ''}
          />
        </div>
      )}

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
        <div className="flex items-center justify-between">
          <Label>Categoria</Label>
          {!showNewCategory && (
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <Plus className="h-3 w-3" />
              Nova categoria
            </button>
          )}
        </div>

        <Select value={category} onValueChange={(v) => v !== null && setCategory(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {defaultCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
            {customCategories.filter(c => !defaultCategories.includes(c)).length > 0 && (
              <>
                <div className="px-2 py-1 mt-1 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Personalizadas</p>
                </div>
                {customCategories
                  .filter(c => !defaultCategories.includes(c))
                  .map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
              </>
            )}
          </SelectContent>
        </Select>

        {showNewCategory && (
          <div className="mt-2 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 space-y-2">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Nova categoria de {categoryTypeName}
            </p>
            <div className="flex gap-2">
              <Input
                ref={newCategoryInputRef}
                placeholder="Nome da categoria..."
                value={newCategoryName}
                onChange={e => { setNewCategoryName(e.target.value); setCategoryError(null) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory() }
                  if (e.key === 'Escape') handleCancelNewCategory()
                }}
                className="flex-1 h-8 text-sm"
              />
              <Button
                type="button"
                size="icon"
                onClick={handleCreateCategory}
                disabled={savingCategory || !newCategoryName.trim()}
                className="h-8 w-8 flex-shrink-0"
                title="Criar categoria"
              >
                {savingCategory
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Check className="h-3.5 w-3.5" />
                }
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCancelNewCategory}
                className="h-8 w-8 flex-shrink-0"
                title="Cancelar"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {categoryError && (
              <p className="text-xs text-red-600 dark:text-red-400">{categoryError}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pressione Enter para criar · Esc para cancelar
            </p>
          </div>
        )}
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

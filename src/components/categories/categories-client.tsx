'use client'

import { useState } from 'react'
import { Trash2, Plus, Loader2, Tag } from 'lucide-react'
import { createCategory, deleteCategory } from '@/app/actions/categories'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, type UserCategory } from '@/types/database'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  userCategories: UserCategory[]
}

const TYPE_LABELS = {
  income: 'Receita',
  expense: 'Despesa',
  both: 'Ambos',
}

const TYPE_COLORS = {
  income: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  expense: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  both: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
}

export default function CategoriesClient({ userCategories: initial }: Props) {
  const [customCategories, setCustomCategories] = useState<UserCategory[]>(initial)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'income' | 'expense' | 'both'>('expense')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    setSaving(true)
    setFormError(null)

    const result = await createCategory(newName.trim(), newType)

    if (result?.error) {
      setFormError(result.error)
      setSaving(false)
      return
    }

    // Atualiza o estado local sem reload
    const tempCategory: UserCategory = {
      id: crypto.randomUUID(),
      user_id: '',
      name: newName.trim(),
      type: newType,
      created_at: new Date().toISOString(),
    }
    setCustomCategories(prev => [...prev, tempCategory].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)

    const result = await deleteCategory(deleteTarget.id)

    if (!result?.error) {
      setCustomCategories(prev => prev.filter(c => c.id !== deleteTarget.id))
    }

    setDeleteTarget(null)
    setDeleting(false)
  }

  const defaultCategories = [
    ...INCOME_CATEGORIES.map(name => ({ name, type: 'income' as const })),
    ...EXPENSE_CATEGORIES.filter(c => !INCOME_CATEGORIES.includes(c)).map(name => ({ name, type: 'expense' as const })),
  ].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-8">
      {/* Formulário de nova categoria */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Criar nova categoria
        </h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Nome da categoria..."
            value={newName}
            onChange={e => { setNewName(e.target.value); setFormError(null) }}
            className="flex-1"
            maxLength={50}
          />
          <Select value={newType} onValueChange={(v) => v && setNewType(v as typeof newType)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="both">Ambos</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={saving || !newName.trim()} className="gap-2 sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Criando...' : 'Criar'}
          </Button>
        </form>
        {formError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formError}</p>
        )}
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Escolha &quot;Ambos&quot; para usar a categoria tanto em receitas quanto em despesas.
        </p>
      </div>

      {/* Categorias personalizadas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Suas categorias
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {customCategories.length === 0
              ? 'Nenhuma categoria personalizada criada ainda.'
              : `${customCategories.length} categoria${customCategories.length > 1 ? 's' : ''} personalizada${customCategories.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {customCategories.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400 dark:text-slate-500">
            <Tag className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Crie sua primeira categoria personalizada acima</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {customCategories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{cat.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[cat.type]}`}>
                    {TYPE_LABELS[cat.type]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(cat)}
                  className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Categorias padrão (somente leitura) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Categorias padrão
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Categorias pré-definidas do sistema — não podem ser removidas.
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {defaultCategories.map(cat => (
            <div key={cat.name} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{cat.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[cat.type]}`}>
                  {TYPE_LABELS[cat.type]}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">Padrão</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir categoria</DialogTitle>
            <DialogDescription>
              Deseja excluir a categoria <strong>&quot;{deleteTarget?.name}&quot;</strong>?
              As transações existentes não serão afetadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

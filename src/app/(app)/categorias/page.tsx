import { createClient } from '@/lib/supabase/server'
import CategoriesClient from '@/components/categories/categories-client'
import type { UserCategory } from '@/types/database'

export default async function CategoriasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_categories')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Categorias</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Gerencie suas categorias personalizadas de receitas e despesas
        </p>
      </div>
      <CategoriesClient userCategories={(data ?? []) as UserCategory[]} />
    </div>
  )
}

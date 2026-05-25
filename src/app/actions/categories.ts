'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CategorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(50, 'Máximo 50 caracteres').trim(),
  type: z.enum(['income', 'expense', 'both']),
})

export async function createCategory(name: string, type: 'income' | 'expense' | 'both') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = CategorySchema.safeParse({ name, type })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('user_categories')
    .insert({ name: parsed.data.name, type: parsed.data.type, user_id: user.id })

  if (error) {
    if (error.code === '23505') return { error: 'Esta categoria já existe.' }
    return { error: error.message }
  }

  revalidatePath('/categorias')
  revalidatePath('/dashboard')
  revalidatePath('/transacoes')
  return { success: true, name: parsed.data.name }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('user_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/categorias')
  return { success: true }
}

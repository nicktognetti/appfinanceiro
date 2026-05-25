'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TransactionSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória').max(200),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  type: z.enum(['income', 'expense', 'investment']),
  category: z.string().min(1, 'Categoria obrigatória'),
  current_value: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().positive().nullable().optional()
  ),
})

function revalidateAll() {
  revalidatePath('/dashboard')
  revalidatePath('/transacoes')
  revalidatePath('/investimentos')
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { type, amount, current_value, ...rest } = parsed.data

  const { error } = await supabase
    .from('transactions')
    .insert({
      ...rest,
      type,
      amount,
      // Investimentos: current_value padrão = amount se não informado
      current_value: type === 'investment' ? (current_value ?? amount) : null,
      user_id: user.id,
    })

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { type, amount, current_value, ...rest } = parsed.data

  const { error } = await supabase
    .from('transactions')
    .update({
      ...rest,
      type,
      amount,
      current_value: type === 'investment' ? (current_value ?? amount) : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function updateCurrentValue(id: string, currentValue: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  if (currentValue <= 0) return { error: 'Valor deve ser positivo' }

  const { error } = await supabase
    .from('transactions')
    .update({ current_value: currentValue })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('type', 'investment')

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidateAll()
  return { success: true }
}

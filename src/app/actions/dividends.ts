'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const DividendSchema = z.object({
  ticker: z.string().min(1, 'Ticker obrigatório').max(10).transform(v => v.toUpperCase().trim()),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  period: z.string().max(30).optional(),
})

export async function createDividend(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = DividendSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('dividends')
    .insert({
      ticker: parsed.data.ticker,
      amount: parsed.data.amount,
      date: parsed.data.date,
      period: parsed.data.period || null,
      user_id: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath('/investimentos')
  return { success: true }
}

export async function deleteDividend(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('dividends')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/investimentos')
  return { success: true }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ParsedRow } from '@/lib/card-parsers'

export interface ImportResult {
  imported: number
  duplicates: number
  error: string | null
}

export async function importCardTransactions(
  rows: ParsedRow[],
  cardSource: string,
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, duplicates: 0, error: 'Não autenticado' }

  if (!rows.length) return { imported: 0, duplicates: 0, error: 'Nenhuma transação para importar' }

  const records = rows.map(r => ({
    user_id:             user.id,
    type:                'expense' as const,
    amount:              r.amount,
    description:         r.description,
    category:            r.category,
    date:                r.date,
    installment_current: r.installmentCurrent ?? null,
    installment_total:   r.installmentTotal   ?? null,
    card_source:         cardSource || 'Importado',
  }))

  const { error, count } = await supabase
    .from('transactions')
    .insert(records, { count: 'exact' })

  if (error) return { imported: 0, duplicates: 0, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/transacoes')
  revalidatePath('/importar')

  return { imported: count ?? records.length, duplicates: 0, error: null }
}

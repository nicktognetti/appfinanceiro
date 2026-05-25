import { createClient } from '@/lib/supabase/server'
import TransactionsClient from '@/components/transactions/transactions-client'

export default async function TransacoesPage() {
  const supabase = await createClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return <TransactionsClient transactions={transactions ?? []} />
}

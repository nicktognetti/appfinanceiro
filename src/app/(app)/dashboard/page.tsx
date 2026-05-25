import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  return <DashboardClient transactions={transactions ?? []} />
}

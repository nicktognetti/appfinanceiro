import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InvestmentsClient from '@/components/investments/investments-client'

export default async function InvestimentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: investments } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'investment')
    .order('date', { ascending: false })

  return <InvestmentsClient investments={investments ?? []} />
}

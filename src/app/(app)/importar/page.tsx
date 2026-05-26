import { createClient } from '@/lib/supabase/server'
import ImportClient from '@/components/import/import-client'

export default async function ImportarPage() {
  const supabase = await createClient()

  const { data: installmentTxs } = await supabase
    .from('transactions')
    .select('*')
    .not('installment_current', 'is', null)
    .not('installment_total', 'is', null)
    .order('date', { ascending: false })

  return <ImportClient installmentTxs={installmentTxs ?? []} />
}

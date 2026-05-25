'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import TransactionForm from './transaction-form'
import type { Transaction } from '@/types/database'

interface Props {
  transaction?: Transaction
  trigger?: React.ReactNode
}

export default function TransactionDialog({ transaction, trigger }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'contents' }}>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova transação
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {transaction ? 'Editar transação' : 'Nova transação'}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            transaction={transaction}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export type TransactionType = 'income' | 'expense'
export type CategoryType = 'income' | 'expense' | 'both'

export type Category =
  | 'Alimentação'
  | 'Transporte'
  | 'Moradia'
  | 'Lazer'
  | 'Saúde'
  | 'Educação'
  | 'Salário'
  | 'Freelance'
  | 'Outros'

export const CATEGORIES: Category[] = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Educação',
  'Salário',
  'Freelance',
  'Outros',
]

export const INCOME_CATEGORIES: string[] = ['Salário', 'Freelance', 'Outros']
export const EXPENSE_CATEGORIES: string[] = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Educação',
  'Outros',
]

export interface Transaction {
  id: string
  user_id: string
  description: string
  amount: number
  date: string
  type: TransactionType
  category: string
  created_at: string
  updated_at: string
}

export interface UserCategory {
  id: string
  user_id: string
  name: string
  type: CategoryType
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          user_id: string
          description: string
          amount: number
          date: string
          type: 'income' | 'expense'
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description: string
          amount: number
          date: string
          type: 'income' | 'expense'
          category: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          description?: string
          amount?: number
          date?: string
          type?: 'income' | 'expense'
          category?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'income' | 'expense' | 'both'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'income' | 'expense' | 'both'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'income' | 'expense' | 'both'
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

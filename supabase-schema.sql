-- =============================================
-- FinançasPessoas - Schema Supabase
-- Execute este SQL no SQL Editor do Supabase
-- =============================================

-- Tabela de transações
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  description text not null,
  amount decimal(12, 2) not null check (amount > 0),
  date date not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Índices para performance
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(date);
create index if not exists transactions_type_idx on public.transactions(type);
create index if not exists transactions_category_idx on public.transactions(category);

-- Row Level Security
alter table public.transactions enable row level security;

-- Policies: cada usuário só acessa seus próprios dados
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute procedure public.handle_updated_at();

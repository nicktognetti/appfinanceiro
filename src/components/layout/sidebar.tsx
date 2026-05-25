'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, List, LogOut, Tag, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transacoes', label: 'Transações', icon: List },
  { href: '/investimentos', label: 'Investimentos', icon: TrendingUp },
  { href: '/categorias', label: 'Categorias', icon: Tag },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-h-screen">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">FinançasPessoas</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {/* Tema toggle */}
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-slate-400 dark:text-slate-500">Tema</span>
          <ThemeToggle className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" />
        </div>

        <div className="px-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{userEmail}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  )
}

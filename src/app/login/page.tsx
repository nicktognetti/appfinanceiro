'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ─── Ticker chip component ──────────────────────────────── */
function Ticker({
  symbol, value, change, positive, style,
}: {
  symbol: string; value: string; change: string; positive: boolean
  style?: React.CSSProperties
}) {
  return (
    <div
      className="hidden md:flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 absolute select-none pointer-events-none"
      style={style}
    >
      <span className="text-[11px] text-slate-400 font-mono font-semibold">{symbol}</span>
      <span className="text-xs font-bold text-white">{value}</span>
      <span className={`text-[11px] font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {positive ? '▲' : '▼'} {change}
      </span>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
      style={{ background: '#060d1e' }}
    >
      {/* ── Grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Glow orbs ── */}
      <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-blue-700/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/5 w-96 h-96 bg-indigo-700/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Floating tickers ── */}
      <Ticker symbol="IBOV" value="130.245" change="+1,24%" positive style={{ top: '10%', left: '4%', animation: 'ticker-float 5s ease-in-out infinite' }} />
      <Ticker symbol="USD/BRL" value="R$ 5,08" change="-0,18%" positive={false} style={{ top: '8%', right: '4%', animation: 'ticker-float 4.5s ease-in-out 0.5s infinite' }} />
      <Ticker symbol="VALE3" value="R$ 67,34" change="+1,15%" positive style={{ top: '42%', left: '2%', animation: 'ticker-float 6s ease-in-out 1s infinite' }} />
      <Ticker symbol="PETR4" value="R$ 38,90" change="-0,32%" positive={false} style={{ top: '32%', right: '3%', animation: 'ticker-float 5.5s ease-in-out 0.3s infinite' }} />
      <Ticker symbol="ITUB4" value="R$ 32,15" change="+0,65%" positive style={{ bottom: '28%', left: '5%', animation: 'ticker-float 4s ease-in-out 1.5s infinite' }} />
      <Ticker symbol="BTC" value="$67.890" change="+2,31%" positive style={{ bottom: '22%', right: '4%', animation: 'ticker-float 5s ease-in-out 0.8s infinite' }} />

      {/* ── Stock chart SVG ── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ animation: 'chart-reveal 4s ease-out 0.3s both' }}
      >
        <svg viewBox="0 0 1440 260" preserveAspectRatio="none" className="w-full" height="260">
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Secondary chart (blue, lower) */}
          <path
            d="M 0,240 C 80,232 160,215 240,222 C 320,229 400,200 480,185 C 560,170 640,182 720,162 C 800,142 880,152 960,132 C 1040,112 1120,122 1200,105 C 1280,88 1360,95 1440,80 L 1440,260 L 0,260 Z"
            fill="url(#g2)"
          />
          <path
            d="M 0,240 C 80,232 160,215 240,222 C 320,229 400,200 480,185 C 560,170 640,182 720,162 C 800,142 880,152 960,132 C 1040,112 1120,122 1200,105 C 1280,88 1360,95 1440,80"
            fill="none"
            stroke="rgba(59,130,246,0.25)"
            strokeWidth="1.5"
          />
          {/* Main chart (green, upward) */}
          <path
            d="M 0,220 C 100,210 180,185 280,195 C 380,205 440,168 540,148 C 640,128 720,145 820,118 C 920,91 1000,108 1100,82 C 1200,56 1300,72 1440,45 L 1440,260 L 0,260 Z"
            fill="url(#g1)"
          />
          <path
            d="M 0,220 C 100,210 180,185 280,195 C 380,205 440,168 540,148 C 640,128 720,145 820,118 C 920,91 1000,108 1100,82 C 1200,56 1300,72 1440,45"
            fill="none"
            stroke="rgba(34,197,94,0.5)"
            strokeWidth="2"
          />
          {/* Endpoint dot */}
          <circle cx="1440" cy="45" r="4" fill="#22c55e" opacity="0.8" />
          <circle cx="1440" cy="45" r="8" fill="#22c55e" opacity="0.2" />
        </svg>
      </div>

      {/* ── Live indicator ── */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5 text-xs text-slate-400">
        <span
          className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"
          style={{ animation: 'live-blink 1.5s ease-in-out infinite' }}
        />
        Mercado ativo
      </div>

      {/* ── Glass card ── */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-600 p-3 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">Controle Financeiro</h1>
          <p className="text-slate-400 text-sm mt-1">Nicholas Tognetti</p>
        </div>

        {/* Form card */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <h2 className="text-xl font-bold text-white text-center mb-1">Entrar</h2>
          <p className="text-slate-400 text-sm text-center mb-6">Acesse sua conta para gerenciar suas finanças</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-10 rounded-lg px-3 bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-10 rounded-lg px-3 bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-5">
            Não tem conta?{' '}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

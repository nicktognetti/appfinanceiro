'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Mail, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message === 'User already registered'
        ? 'Este e-mail já está cadastrado.'
        : 'Erro ao criar conta. Tente novamente.')
      setLoading(false)
      return
    }

    setRegisteredEmail(email)
    setSuccess(true)
    setLoading(false)
  }

  const inputCls = "w-full h-10 rounded-lg px-3 bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
      style={{ background: '#060d1e' }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-blue-700/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/5 w-96 h-96 bg-indigo-700/15 rounded-full blur-[80px] pointer-events-none" />

      {/* Chart at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ animation: 'chart-reveal 4s ease-out 0.3s both' }}
      >
        <svg viewBox="0 0 1440 180" preserveAspectRatio="none" className="w-full" height="180">
          <defs>
            <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0,160 C 100,150 200,130 300,138 C 400,146 480,110 580,95 C 680,80 760,92 860,72 C 960,52 1040,65 1140,45 C 1240,25 1320,38 1440,20 L 1440,180 L 0,180 Z"
            fill="url(#sg1)"
          />
          <path
            d="M 0,160 C 100,150 200,130 300,138 C 400,146 480,110 580,95 C 680,80 760,92 860,72 C 960,52 1040,65 1140,45 C 1240,25 1320,38 1440,20"
            fill="none" stroke="rgba(34,197,94,0.4)" strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-600 p-3 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">Controle Financeiro</h1>
          <p className="text-slate-400 text-sm mt-1">Nicholas Tognetti</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
          {success ? (
            <div className="space-y-5">
              <div className="flex justify-center">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-full">
                  <Mail className="h-10 w-10 text-blue-400" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-white">Confirme seu e-mail!</h3>
                <p className="text-sm text-slate-400 mt-1">Enviamos um link de confirmação para:</p>
                <p className="font-semibold text-blue-400 text-sm mt-1 break-all">{registeredEmail}</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-sm text-slate-300">
                <p className="font-semibold text-white">O que fazer agora:</p>
                <ol className="space-y-2 list-none">
                  {['Abra a sua caixa de entrada de e-mail', 'Clique no link de confirmação que enviamos', 'Após confirmar, volte aqui e faça seu login'].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
                <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  <span className="font-semibold">Não encontrou o e-mail?</span> Verifique sua pasta de{' '}
                  <span className="font-semibold">Spam</span> ou{' '}
                  <span className="font-semibold">Lixo Eletrônico</span>.
                </p>
              </div>

              <Link href="/login" className={buttonVariants({ className: 'w-full justify-center bg-blue-600 hover:bg-blue-700 text-white' })}>
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white text-center mb-1">Criar conta</h2>
              <p className="text-slate-400 text-sm text-center mb-6">Comece a controlar suas finanças hoje mesmo</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">E-mail</label>
                  <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Senha</label>
                  <input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Confirmar senha</label>
                  <input type="password" placeholder="Repita a senha" value={confirm} onChange={e => setConfirm(e.target.value)} required className={inputCls} />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </Button>
              </form>

              <p className="text-sm text-slate-500 text-center mt-5">
                Já tem conta?{' '}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

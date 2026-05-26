'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp } from 'lucide-react'

/* Deterministic floating dots */
const DOTS = [
  { x: 7,  y: 18, s: 3, d: 0,   dur: 4.2 },
  { x: 88, y: 12, s: 2, d: 1.1, dur: 5.1 },
  { x: 22, y: 72, s: 4, d: 2.3, dur: 3.8 },
  { x: 93, y: 58, s: 2, d: 0.7, dur: 6.0 },
  { x: 48, y: 8,  s: 3, d: 1.8, dur: 4.5 },
  { x: 73, y: 82, s: 2, d: 3.1, dur: 3.4 },
  { x: 14, y: 47, s: 2, d: 2.8, dur: 5.5 },
  { x: 62, y: 91, s: 3, d: 0.4, dur: 4.1 },
  { x: 36, y: 33, s: 2, d: 3.7, dur: 3.9 },
  { x: 80, y: 40, s: 3, d: 1.5, dur: 5.2 },
  { x: 55, y: 65, s: 2, d: 2.0, dur: 4.8 },
  { x: 4,  y: 85, s: 2, d: 0.9, dur: 3.6 },
]

const BINARY_COLS = [
  ['01001011', '10110100', '00111010', '11001100', '01010111'],
  ['10100011', '01110001', '11000101', '00101110', '10011010'],
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Credenciais inválidas.'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 25% 25%, #071428 0%, #030a18 55%, #010408 100%)' }}
    >

      {/* ── Tron perspective grid floor ─────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '52%',
          backgroundImage:
            'linear-gradient(rgba(0,212,255,0.14) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(0,212,255,0.14) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          transform: 'perspective(480px) rotateX(65deg)',
          transformOrigin: 'bottom center',
          animation: 'grid-drift 3s linear infinite',
        }}
      />
      {/* Horizon fade over grid */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '52%',
          background: 'linear-gradient(to bottom, #030a18 0%, rgba(3,10,24,0.2) 35%, transparent 100%)',
        }}
      />

      {/* ── Ambient glow orbs ───────────────────────────────── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '8%', left: '5%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,80,255,0.16) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'orb-drift 12s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '35%', right: '5%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(110,0,255,0.13) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(35px)',
          animation: 'orb-drift 15s ease-in-out 5s infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '12%', left: '28%',
          width: 340, height: 340,
          background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(30px)',
          animation: 'orb-drift 10s ease-in-out 3s infinite',
        }}
      />

      {/* ── Scan line ───────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          height: 2,
          background:
            'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.4) 20%, rgba(0,212,255,0.9) 50%, rgba(0,212,255,0.4) 80%, transparent 100%)',
          animation: 'scan-line 6s linear infinite',
          zIndex: 2,
          boxShadow: '0 0 8px rgba(0,212,255,0.6)',
        }}
      />

      {/* ── Floating dots ───────────────────────────────────── */}
      {DOTS.map((dot, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `${dot.x}%`,
            top:  `${dot.y}%`,
            width:  dot.s * 3,
            height: dot.s * 3,
            background: 'rgba(0,212,255,0.9)',
            boxShadow: `0 0 ${dot.s * 5}px rgba(0,212,255,0.7)`,
            animation: `particle-pulse ${dot.dur}s ease-in-out ${dot.d}s infinite`,
          }}
        />
      ))}

      {/* ── Left side symbols ───────────────────────────────── */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-7 pointer-events-none">
        {['◈', '⬡', '◉', '△', '◇'].map((sym, i) => (
          <span
            key={i}
            style={{
              color: 'rgba(0,212,255,0.3)',
              fontSize: 15,
              fontFamily: 'monospace',
              animation: `data-flow ${2.5 + i * 0.6}s ease-in-out ${i * 0.4}s infinite`,
            }}
          >
            {sym}
          </span>
        ))}
      </div>

      {/* ── Right side binary streams ────────────────────────── */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden xl:flex gap-4 pointer-events-none">
        {BINARY_COLS.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-2">
            {col.map((bits, i) => (
              <span
                key={i}
                style={{
                  color: 'rgba(0,212,255,0.2)',
                  fontSize: 9,
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  animation: `data-flow ${1.8 + i * 0.35}s ease-in-out ${i * 0.25 + ci * 0.5}s infinite`,
                }}
              >
                {bits}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ── HUD header ─────────────────────────────────────── */}
      <div
        className="absolute top-5 left-5 text-xs pointer-events-none hidden sm:block"
        style={{ color: 'rgba(0,212,255,0.3)', fontFamily: 'monospace', letterSpacing: '0.1em' }}
      >
        CF-SYS // v2.4.1
      </div>
      <div className="absolute top-5 right-5 flex items-center gap-2 z-10 hidden sm:flex">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: '#00d4ff',
            boxShadow: '0 0 6px #00d4ff',
            animation: 'live-blink 1.5s ease-in-out infinite',
          }}
        />
        <span style={{ color: 'rgba(0,212,255,0.55)', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          SISTEMA ONLINE
        </span>
      </div>

      {/* ── Main card ──────────────────────────────────────── */}
      <div
        className="relative z-10 w-full max-w-sm px-4"
        style={{ animation: 'card-appear 0.7s ease-out both' }}
      >

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-5">
            {/* Outer spinning ring */}
            <div
              className="absolute"
              style={{
                width: 76, height: 76,
                border: '1.5px solid transparent',
                borderTopColor: 'rgba(0,212,255,0.9)',
                borderRightColor: 'rgba(0,212,255,0.3)',
                borderRadius: '50%',
                animation: 'ring-spin 2.4s linear infinite',
              }}
            />
            {/* Middle dashed ring */}
            <div
              className="absolute"
              style={{
                width: 62, height: 62,
                border: '1px dashed rgba(0,212,255,0.2)',
                borderRadius: '50%',
                animation: 'ring-spin-rev 4s linear infinite',
              }}
            />
            {/* Icon core */}
            <div
              style={{
                width: 48, height: 48,
                background: 'linear-gradient(135deg, rgba(0,80,200,0.7) 0%, rgba(0,200,255,0.5) 100%)',
                border: '1px solid rgba(0,212,255,0.5)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(0,212,255,0.35), inset 0 0 12px rgba(0,212,255,0.1)',
              }}
            >
              <TrendingUp style={{ width: 22, height: 22, color: '#7ff4ff' }} />
            </div>
          </div>

          <h1
            className="text-2xl font-bold text-white tracking-wide"
            style={{ textShadow: '0 0 20px rgba(0,212,255,0.25)' }}
          >
            Controle Financeiro
          </h1>
          <p
            className="text-xs mt-1.5 tracking-widest uppercase"
            style={{ color: 'rgba(0,212,255,0.45)', fontFamily: 'monospace' }}
          >
            Nicholas Tognetti
          </p>
        </div>

        {/* Glass card */}
        <div
          style={{
            background: 'rgba(3, 12, 28, 0.88)',
            backdropFilter: 'blur(28px)',
            border: '1px solid rgba(0,212,255,0.22)',
            borderRadius: 20,
            padding: '28px 28px 24px',
            position: 'relative',
            animation: 'neon-pulse 3.5s ease-in-out infinite',
          }}
        >
          {/* HUD corner brackets */}
          {[
            { top: 0,    left:  0,   bt: 'borderTop',    bl: 'borderLeft'  },
            { top: 0,    right: 0,   bt: 'borderTop',    bl: 'borderRight' },
            { bottom: 0, left:  0,   bt: 'borderBottom', bl: 'borderLeft'  },
            { bottom: 0, right: 0,   bt: 'borderBottom', bl: 'borderRight' },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                ...c,
                width: 14, height: 14,
                [c.bt]: '2px solid rgba(0,212,255,0.7)',
                [c.bl]: '2px solid rgba(0,212,255,0.7)',
                borderRadius: i === 0 ? '4px 0 0 0' : i === 1 ? '0 4px 0 0' : i === 2 ? '0 0 0 4px' : '0 0 4px 0',
              } as React.CSSProperties}
            />
          ))}

          <p
            className="text-center text-xs tracking-widest uppercase mb-6"
            style={{ color: 'rgba(0,212,255,0.4)', fontFamily: 'monospace' }}
          >
            ── Autenticação do Sistema ──
          </p>

          {error && (
            <div
              className="text-xs text-center px-4 py-3 rounded-lg mb-5"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.28)',
                color: '#f87171',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            >
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                className="block text-xs tracking-widest uppercase"
                style={{ color: 'rgba(0,212,255,0.5)', fontFamily: 'monospace' }}
              >
                ID de Usuário
              </label>
              <input
                type="email"
                placeholder="usuario@dominio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 8,
                  paddingLeft: 12,
                  paddingRight: 12,
                  background: 'rgba(0,212,255,0.04)',
                  border: '1px solid rgba(0,212,255,0.18)',
                  color: '#e2e8f0',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(0,212,255,0.55)'
                  e.target.style.boxShadow   = '0 0 0 1px rgba(0,212,255,0.2), 0 0 14px rgba(0,212,255,0.12)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(0,212,255,0.18)'
                  e.target.style.boxShadow   = 'none'
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-xs tracking-widest uppercase"
                style={{ color: 'rgba(0,212,255,0.5)', fontFamily: 'monospace' }}
              >
                Senha de Acesso
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 8,
                  paddingLeft: 12,
                  paddingRight: 12,
                  background: 'rgba(0,212,255,0.04)',
                  border: '1px solid rgba(0,212,255,0.18)',
                  color: '#e2e8f0',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(0,212,255,0.55)'
                  e.target.style.boxShadow   = '0 0 0 1px rgba(0,212,255,0.2), 0 0 14px rgba(0,212,255,0.12)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(0,212,255,0.18)'
                  e.target.style.boxShadow   = 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 42,
                marginTop: 8,
                borderRadius: 9,
                background: loading
                  ? 'rgba(0,80,160,0.35)'
                  : 'linear-gradient(135deg, rgba(0,90,220,0.85) 0%, rgba(0,200,255,0.75) 100%)',
                border: '1px solid rgba(0,212,255,0.45)',
                color: '#fff',
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.2s, box-shadow 0.2s',
                boxShadow: loading ? 'none' : '0 0 24px rgba(0,212,255,0.22)',
              }}
              onMouseEnter={e => {
                if (!loading) (e.target as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(0,212,255,0.4)'
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.boxShadow = loading ? 'none' : '0 0 24px rgba(0,212,255,0.22)'
              }}
            >
              {loading ? '[ AUTENTICANDO... ]' : '[ ENTRAR NO SISTEMA ]'}
            </button>
          </form>

          <p
            className="text-center mt-5"
            style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(100,150,180,0.5)', letterSpacing: '0.05em' }}
          >
            Sem acesso?{' '}
            <Link
              href="/signup"
              style={{ color: 'rgba(0,212,255,0.65)' }}
              className="hover:text-cyan-300 transition-colors"
            >
              CRIAR CONTA
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

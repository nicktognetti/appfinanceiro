'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Mail, AlertCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">FinançasPessoas</span>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">Criar conta</CardTitle>
            <CardDescription className="text-center">
              Comece a controlar suas finanças hoje mesmo
            </CardDescription>
          </CardHeader>

          {success ? (
            <CardContent className="space-y-4 pb-6">
              {/* Ícone de e-mail */}
              <div className="flex justify-center">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-full">
                  <Mail className="h-10 w-10 text-blue-600" />
                </div>
              </div>

              {/* Mensagem principal */}
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Confirme seu e-mail!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enviamos um link de confirmação para:
                </p>
                <p className="font-semibold text-blue-600 text-sm break-all">{registeredEmail}</p>
              </div>

              {/* Passos */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-700 dark:text-slate-200">O que fazer agora:</p>
                <ol className="space-y-2 list-none">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5">1</span>
                    Abra a sua caixa de entrada de e-mail
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5">2</span>
                    Clique no link de confirmação que enviamos
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5">3</span>
                    Após confirmar, volte aqui e faça seu login
                  </li>
                </ol>
              </div>

              {/* Aviso de spam */}
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">Não encontrou o e-mail?</span> Verifique sua pasta de{' '}
                  <span className="font-semibold">Spam</span> ou{' '}
                  <span className="font-semibold">Lixo Eletrônico</span> — às vezes o e-mail de confirmação vai parar lá.
                </p>
              </div>

              <Link
                href="/login"
                className={buttonVariants({ className: 'w-full mt-2 justify-center' })}
              >
                Ir para o login
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/40 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repita a senha"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </Button>
                <p className="text-sm text-slate-500 text-center">
                  Já tem conta?{' '}
                  <Link href="/login" className="text-blue-600 hover:underline font-medium">
                    Entrar
                  </Link>
                </p>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

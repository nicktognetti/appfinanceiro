'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  ArrowLeft, Trash2, CreditCard, RefreshCw, Lock,
} from 'lucide-react'
import { parseCardFile, BANK_LABELS, type ParsedRow, type BankFormat } from '@/lib/card-parsers'
import { importCardTransactions } from '@/app/actions/import'
import { parsePDFAction } from '@/app/actions/parse-pdf'
import { EXPENSE_CATEGORIES } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { format, parseISO, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { Transaction } from '@/types/database'

type Step = 'upload' | 'preview' | 'done'

interface EditableRow extends ParsedRow {
  _id: number
  selected: boolean
}

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, 'Compras', 'Tecnologia', 'Viagem', 'Outros'])]

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatCompact(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(0)}K`
  return `R$${v.toFixed(0)}`
}

function setter(fn: (v: string) => void) {
  return (v: string | null) => { if (v !== null) fn(v) }
}

/* ── Future installments projection ─────────────────────────────────── */
function projectInstallments(txs: Transaction[]) {
  const today = new Date()
  const map = new Map<string, number>()

  txs.forEach(tx => {
    if (!tx.installment_current || !tx.installment_total) return
    const remaining = tx.installment_total - tx.installment_current
    if (remaining <= 0) return
    const base = parseISO(tx.date)
    for (let i = 1; i <= remaining; i++) {
      const future = addMonths(base, i)
      if (future < today) continue
      const key = format(future, 'yyyy-MM')
      map.set(key, (map.get(key) ?? 0) + Number(tx.amount))
    }
  })

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 12)
    .map(([key, total]) => ({
      mes: format(parseISO(`${key}-01`), "MMM/yy", { locale: ptBR }),
      total,
    }))
}

/* ── Component ───────────────────────────────────────────────────────── */
interface Props { installmentTxs: Transaction[] }

export default function ImportClient({ installmentTxs }: Props) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  const [step, setStep]           = useState<Step>('upload')
  const [bank, setBank]           = useState<BankFormat>('generic')
  const [rows, setRows]           = useState<EditableRow[]>([])
  const [importing, setImport]    = useState(false)
  const [pdfLoading, setPDFLoad]  = useState(false)
  const [result, setResult]       = useState<{ imported: number } | null>(null)
  const [dragOver, setDragOver]   = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileLabel, setFileLabel] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [pdfPassword, setPdfPassword] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  /* ── Parse file ────────────────────────────────────────── */
  const handleFile = useCallback(async (file: File, password?: string) => {
    setParseError(null)
    setFileLabel(file.name)
    const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'

    if (isPDF) {
      setPDFLoad(true)
      try {
        const fd = new FormData()
        fd.append('pdf', file)
        if (password) fd.append('password', password)
        const res = await parsePDFAction(fd)
        if (res.needsPassword) {
          setPendingFile(file)
          setShowPasswordInput(true)
          setPdfPassword('')
          setParseError(
            res.wrongPassword
              ? 'Senha incorreta. Tente novamente.'
              : 'Este PDF está protegido por senha. Digite a senha para continuar.'
          )
          return
        }
        if (res.error) { setParseError(res.error); return }
        const parsed = res.rows ?? []
        if (!parsed.length) { setParseError('Nenhuma transação encontrada no PDF.'); return }
        setShowPasswordInput(false)
        setPendingFile(null)
        setPdfPassword('')
        setRows(parsed.map((r, i) => ({ ...r, _id: i, selected: true })))
        setStep('preview')
      } catch {
        setParseError('Erro ao enviar PDF. Tente novamente.')
      } finally {
        setPDFLoad(false)
      }
      return
    }

    // CSV / TXT — parse client-side
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = parseCardFile(text, bank)
        if (!parsed.length) {
          setParseError('Nenhuma transação encontrada. Verifique o formato selecionado.')
          return
        }
        setRows(parsed.map((r, i) => ({ ...r, _id: i, selected: true })))
        setStep('preview')
      } catch {
        setParseError('Erro ao processar o arquivo. Verifique se é um CSV válido.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }, [bank])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  /* ── Confirm import ────────────────────────────────────── */
  async function handleImport() {
    setImport(true)
    const selected = rows.filter(r => r.selected).map(({ _id, selected, ...r }) => r)
    const res = await importCardTransactions(selected, BANK_LABELS[bank])
    setImport(false)
    if (res.error) { setParseError(res.error); return }
    setResult({ imported: res.imported })
    setStep('done')
  }

  /* ── Row helpers ───────────────────────────────────────── */
  const toggleRow    = (id: number) => setRows(rs => rs.map(r => r._id === id ? { ...r, selected: !r.selected } : r))
  const toggleAll    = () => { const all = rows.every(r => r.selected); setRows(rs => rs.map(r => ({ ...r, selected: !all }))) }
  const changeCategory = (id: number, cat: string) => setRows(rs => rs.map(r => r._id === id ? { ...r, category: cat } : r))
  const removeRow    = (id: number) => setRows(rs => rs.filter(r => r._id !== id))

  const selectedRows   = rows.filter(r => r.selected)
  const totalSelected  = selectedRows.reduce((s, r) => s + r.amount, 0)
  const installmentRows = selectedRows.filter(r => r.installmentTotal)

  /* ── Future installments data ──────────────────────────── */
  const projection = useMemo(() => projectInstallments(installmentTxs), [installmentTxs])
  const totalFuture = projection.reduce((s, p) => s + p.total, 0)

  const ttStyle = {
    backgroundColor: dark ? '#1e293b' : '#fff',
    border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
    color: dark ? '#f1f5f9' : '#334155',
    borderRadius: 8, fontSize: 12, padding: '8px 12px',
  }

  /* ── Reset ─────────────────────────────────────────────── */
  function reset() {
    setStep('upload'); setRows([]); setResult(null); setParseError(null); setFileLabel(null)
    setShowPasswordInput(false); setPendingFile(null); setPdfPassword('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ───────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-500" />
          Importar Fatura
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Importe seu extrato CSV/TXT, revise as categorias e confirme o lançamento
        </p>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* STEP 1 — Upload                                   */}
      {/* ══════════════════════════════════════════════════ */}
      {step === 'upload' && (
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800 dark:text-slate-100">1. Selecione o banco e o arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Bank selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Banco / cartão</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(BANK_LABELS) as BankFormat[]).map(b => (
                  <button
                    key={b}
                    onClick={() => setBank(b)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                      bank === b
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {BANK_LABELS[b]}
                  </button>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); if (!pdfLoading) setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !pdfLoading && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                pdfLoading
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 cursor-wait'
                  : dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 cursor-pointer'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer'
              }`}
            >
              {pdfLoading ? (
                <>
                  <RefreshCw className="h-10 w-10 mx-auto mb-3 text-blue-500 animate-spin" />
                  <p className="font-semibold text-blue-600 dark:text-blue-400">Processando PDF...</p>
                  <p className="text-sm text-slate-400 mt-1">{fileLabel}</p>
                  <p className="text-xs text-slate-400 mt-1">Extraindo transações — aguarde</p>
                </>
              ) : (
                <>
                  <Upload className={`h-10 w-10 mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Arraste o arquivo aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    <span className="font-medium text-slate-600 dark:text-slate-300">PDF</span>
                    {' · '}
                    <span className="font-medium text-slate-600 dark:text-slate-300">CSV</span>
                    {' · TXT · até 20 MB'}
                  </p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.pdf,.ofx"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>

            {parseError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {parseError}
              </div>
            )}

            {showPasswordInput && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Senha do PDF"
                    value={pdfPassword}
                    onChange={e => setPdfPassword(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && pdfPassword && pendingFile) {
                        handleFile(pendingFile, pdfPassword)
                      }
                    }}
                    className="flex-1 h-8 px-3 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => { if (pendingFile) handleFile(pendingFile, pdfPassword) }}
                    disabled={!pdfPassword || pdfLoading}
                    className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                  >
                    {pdfLoading
                      ? <><RefreshCw className="h-3 w-3 animate-spin" /> Processando...</>
                      : 'Abrir PDF'
                    }
                  </Button>
                </div>
              </div>
            )}

            {/* Format hints */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-600 dark:text-slate-400 mb-2">Como exportar (PDF ou CSV):</p>
              <p><strong>Nubank:</strong> App → Configurações → Extrato → Exportar CSV ou PDF</p>
              <p><strong>Inter:</strong> App → Cartão → Fatura → Exportar CSV ou PDF</p>
              <p><strong>Itaú:</strong> App → Cartões → Fatura → Exportar (CSV recomendado)</p>
              <p><strong>Bradesco:</strong> Internet Banking → Cartões → Extrato → Exportar</p>
              <p><strong>C6 Bank:</strong> App → Cartão → Fatura → Compartilhar PDF</p>
              <p className="pt-1 text-amber-600 dark:text-amber-400">
                ⚠ PDF escaneado (foto da fatura) não funciona — use o PDF gerado pelo app/site do banco.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* STEP 2 — Preview                                  */}
      {/* ══════════════════════════════════════════════════ */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-slate-500">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <div className="flex gap-3 ml-2 flex-wrap">
              <Badge variant="secondary" className="text-xs gap-1">
                <FileText className="h-3 w-3" />
                {rows.length} transações
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {selectedRows.length} selecionadas
              </Badge>
              {installmentRows.length > 0 && (
                <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  {installmentRows.length} parceladas
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalSelected)}
              </Badge>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleAll} className="text-xs">
                {rows.every(r => r.selected) ? 'Desmarcar tudo' : 'Marcar tudo'}
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || !selectedRows.length}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                {importing
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Importando...</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" /> Importar {selectedRows.length}</>
                }
              </Button>
            </div>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{parseError}
            </div>
          )}

          {/* Table */}
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="p-3 w-10 text-left">
                      <input
                        type="checkbox"
                        checked={rows.every(r => r.selected)}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                    <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                    <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Parcela</th>
                    <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-48">Categoria</th>
                    <th className="p-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                    <th className="p-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {rows.map(row => (
                    <tr
                      key={row._id}
                      className={`transition-colors ${
                        row.selected
                          ? 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                          : 'opacity-40 bg-slate-50/50 dark:bg-slate-900/30'
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRow(row._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-xs">
                        {format(parseISO(row.date), 'dd/MM/yy')}
                      </td>
                      <td className="p-3 text-slate-800 dark:text-slate-100 max-w-[200px]">
                        <p className="truncate">{row.description}</p>
                      </td>
                      <td className="p-3">
                        {row.installmentCurrent && row.installmentTotal ? (
                          <Badge className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-0">
                            {row.installmentCurrent}/{row.installmentTotal}
                          </Badge>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Select value={row.category} onValueChange={v => { if (v) changeCategory(row._id, v) }}>
                          <SelectTrigger className="h-7 text-xs w-44 bg-white dark:bg-slate-800 dark:border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_CATEGORIES.map(c => (
                              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-right font-semibold text-red-500 dark:text-red-400 tabular-nums whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => removeRow(row._id)}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40">
                    <td colSpan={5} className="p-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Total selecionado ({selectedRows.length} itens)
                    </td>
                    <td className="p-3 text-right font-bold text-red-600 dark:text-red-400 tabular-nums">
                      {formatCurrency(totalSelected)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* STEP 3 — Done                                     */}
      {/* ══════════════════════════════════════════════════ */}
      {step === 'done' && result && (
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
          <CardContent className="py-12 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40 mb-2">
              <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {result.imported} transações importadas!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              As despesas foram lançadas e já aparecem no dashboard e nas transações.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={reset} className="gap-2">
                <Upload className="h-4 w-4" /> Importar mais
              </Button>
              <a
                href="/transacoes"
                className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Ver transações
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* FUTURE INSTALLMENTS                               */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Compromissos Futuros</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Parcelas restantes nos próximos 12 meses — baseado em todas as transações parceladas
            </p>
          </div>
          {totalFuture > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-400 dark:text-slate-500">Total futuro</p>
              <p className="text-lg font-bold text-orange-500">{formatCurrency(totalFuture)}</p>
            </div>
          )}
        </div>

        {projection.length === 0 ? (
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
            <CardContent className="py-12 text-center">
              <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                Nenhum compromisso futuro encontrado.
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                Importe uma fatura com compras parceladas para ver a projeção.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bar chart */}
            <Card className="border-0 shadow-sm bg-white dark:bg-slate-800 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Parcelas por mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={projection} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)'} vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: dark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip
                      contentStyle={ttStyle}
                      formatter={(v) => [typeof v === 'number' ? formatCurrency(v) : v, 'Parcelas']}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {projection.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? '#f97316' : i === 1 ? '#fb923c' : '#fed7aa'}
                          opacity={dark ? 1 : 0.9}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Month list */}
            <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Resumo mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {projection.map((p, i) => (
                    <div key={p.mes} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: i === 0 ? '#f97316' : i === 1 ? '#fb923c' : '#fed7aa' }}
                      />
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-14">{p.mes}</span>
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(p.total / Math.max(...projection.map(x => x.total))) * 100}%`,
                            background: i === 0 ? '#f97316' : i === 1 ? '#fb923c' : '#fdba74',
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 tabular-nums text-right w-20">
                        {formatCurrency(p.total)}
                      </span>
                    </div>
                  ))}
                  {installmentTxs.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
                      {installmentTxs.length} compra(s) parcelada(s) ativa(s)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Installment transactions detail */}
        {installmentTxs.length > 0 && (
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-800 mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Compras parceladas ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      {['Descrição', 'Data', 'Banco', 'Parcela', 'Valor/parc.', 'Restante'].map(h => (
                        <th key={h} className="pb-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {installmentTxs.map(tx => {
                      const remaining = (tx.installment_total ?? 0) - (tx.installment_current ?? 0)
                      const remainingAmt = remaining * Number(tx.amount)
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="py-2.5 pr-4 text-slate-800 dark:text-slate-100 max-w-[180px]">
                            <p className="truncate">{tx.description}</p>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
                            {format(parseISO(tx.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-2.5 pr-4">
                            {tx.card_source ? (
                              <Badge variant="secondary" className="text-xs">{tx.card_source}</Badge>
                            ) : '—'}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className="text-xs font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                              {tx.installment_current}/{tx.installment_total}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 tabular-nums text-slate-700 dark:text-slate-300">
                            {formatCurrency(Number(tx.amount))}
                          </td>
                          <td className="py-2.5">
                            <div>
                              <span className="font-semibold text-orange-500 tabular-nums">{formatCurrency(remainingAmt)}</span>
                              <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">({remaining}x)</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

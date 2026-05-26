'use server'

import { parsePDFText, type ParsedRow } from '@/lib/card-parsers'

export interface PDFParseResult {
  rows?: ParsedRow[]
  error?: string
  pageCount?: number
  needsPassword?: boolean
  wrongPassword?: boolean
}

export async function parsePDFAction(formData: FormData): Promise<PDFParseResult> {
  const file = formData.get('pdf') as File | null
  const password = formData.get('password') as string | null

  if (!file || file.size === 0) return { error: 'Nenhum arquivo enviado.' }

  const name = file.name.toLowerCase()
  const isPDF = name.endsWith('.pdf') || file.type === 'application/pdf'
  if (!isPDF) return { error: 'O arquivo deve ser um PDF.' }

  if (file.size > 20 * 1024 * 1024) return { error: 'PDF muito grande (máx 20 MB).' }

  try {
    const { PDFParse } = await import('pdf-parse')
    const data = new Uint8Array(await file.arrayBuffer())
    const opts: Record<string, unknown> = { data }
    if (password) opts.password = password
    const parser = new PDFParse(opts)
    const result = await parser.getText()

    const text = result.text
    const numpages = result.total

    if (!text || !text.trim()) {
      return {
        error:
          'Não foi possível extrair texto deste PDF. ' +
          'PDFs escaneados (imagens) não são suportados — exporte o arquivo diretamente do app/site do banco.',
      }
    }

    const year = new Date().getFullYear()
    const rows = parsePDFText(text, year)

    if (!rows.length) {
      return {
        error:
          `Nenhuma transação identificada no PDF (${numpages} página(s)). ` +
          'Verifique se selecionou o banco correto ou tente o formato CSV.',
      }
    }

    return { rows, pageCount: numpages }
  } catch (err) {
    const errName = (err as { name?: string })?.name ?? ''
    const errMsg = (err instanceof Error ? err.message : String(err)).toLowerCase()
    const errCode = (err as { code?: number })?.code

    const isPasswordErr =
      errName === 'PasswordException' ||
      errMsg.includes('password') ||
      errMsg.includes('encrypted') ||
      errMsg.includes('no password given')

    if (isPasswordErr) {
      if (errCode === 2 || errMsg.includes('incorrect')) {
        return { needsPassword: true, wrongPassword: true }
      }
      return { needsPassword: true }
    }

    console.error('[parsePDFAction]', err)
    return {
      error: 'Erro ao processar o PDF: ' + (err instanceof Error ? err.message : String(err)),
    }
  }
}

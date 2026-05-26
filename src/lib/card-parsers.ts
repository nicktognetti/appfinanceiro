export interface ParsedRow {
  date: string             // YYYY-MM-DD
  description: string
  amount: number           // always positive
  installmentCurrent?: number
  installmentTotal?: number
  category: string
}

export type BankFormat = 'nubank' | 'inter' | 'itau' | 'bradesco' | 'xp' | 'generic'

export const BANK_LABELS: Record<BankFormat, string> = {
  nubank:   'Nubank',
  inter:    'Inter',
  itau:     'Itaú',
  bradesco: 'Bradesco',
  xp:       'XP / Rico',
  generic:  'Genérico (auto-detectar)',
}

/* ── Auto-categorization ─────────────────────────────────────────────── */
const RULES: Array<{ kw: string[]; cat: string }> = [
  { kw: ['mcdonalds','burguer','burger','subway','ifood','rappi','restaurante','lanchonete','pizza','sushi','padaria','acougue','supermercado','mercado','carrefour','extra','prezunic','hortifruti','atacadao','pao de acucar','assai'], cat: 'Alimentação' },
  { kw: ['uber','99pop','99taxi','cabify','posto','gasolina','combustivel','shell','ipiranga','petrobras','estacionamento','pedagio','onibus','metrô','metro','trem','bilhete'], cat: 'Transporte' },
  { kw: ['farmacia','drogaria','clinica','hospital','medico','laboratorio','exame','consulta','odonto','dentista','unimed','amil','sulamerica','bradesco saude'], cat: 'Saúde' },
  { kw: ['netflix','spotify','amazon prime','disney','hbo','globoplay','paramount','deezer','youtube premium','cinema','teatro','show','ingresso','steam','playstation','xbox','nintendo'], cat: 'Lazer' },
  { kw: ['amazon','mercado livre','shopee','magazine luiza','americanas','casas bahia','renner','riachuelo','c&a','zara','hm','h&m','shein','aliexpress','ebay'], cat: 'Compras' },
  { kw: ['aluguel','condominio','iptu','agua','energia','enel','cemig','copel','luz','internet','claro','vivo','tim','oi','net','sky','cabo'], cat: 'Moradia' },
  { kw: ['udemy','coursera','alura','escola','faculdade','universidade','curso','livraria','saraiva','cultura'], cat: 'Educação' },
  { kw: ['hotel','airbnb','latam','gol','azul','decolar','booking','trivago','trip.com','rodoviaria'], cat: 'Viagem' },
  { kw: ['apple','google','microsoft','adobe','antivirus','software','app store','google play','aws','azure'], cat: 'Tecnologia' },
  { kw: ['academia','gym','smartfit','bodytech','fit','crossfit'], cat: 'Saúde' },
]

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ')
}

export function autoCategory(description: string): string {
  const n = normalize(description)
  for (const rule of RULES) {
    if (rule.kw.some(kw => n.includes(normalize(kw)))) return rule.cat
  }
  return 'Outros'
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function parseDate(raw: string): string {
  raw = raw.trim()
  // DD/MM/YYYY
  let m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  // DD/MM/YY
  m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`
  // YYYY-MM-DD (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return raw
}

function parseBRL(raw: string): number {
  // Handle "R$ 1.234,56" or "-45.90" or "45,90"
  const s = raw.replace(/[R$\s"]/g, '')
  // If has both dot and comma, dot is thousands separator
  if (s.includes('.') && s.includes(',')) {
    return Math.abs(parseFloat(s.replace(/\./g, '').replace(',', '.')))
  }
  // If only comma, treat as decimal
  if (s.includes(',') && !s.includes('.')) {
    return Math.abs(parseFloat(s.replace(',', '.')))
  }
  return Math.abs(parseFloat(s))
}

function extractInstallment(description: string): {
  desc: string
  current?: number
  total?: number
} {
  // Patterns: "2/12", "02/12", "PARC 2/12", "parcela 02 de 12"
  const m =
    description.match(/\b(\d{1,2})\s*[\/]\s*(\d{1,3})\b/) ||
    description.match(/parcela\s+(\d{1,2})\s+de\s+(\d{1,3})/i)
  if (m) {
    const current = parseInt(m[1])
    const total   = parseInt(m[2])
    if (current > 0 && total > 1 && current <= total) {
      const desc = description.replace(m[0], '').replace(/\s{2,}/g, ' ').trim()
      return { desc, current, total }
    }
  }
  return { desc: description }
}

function splitLine(line: string, sep: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === sep && !inQ) { result.push(cur); cur = '' }
    else { cur += ch }
  }
  result.push(cur)
  return result
}

function makeRow(rawDate: string, rawTitle: string, rawAmount: string): ParsedRow | null {
  const amount = parseBRL(rawAmount)
  if (isNaN(amount) || amount <= 0 || !rawTitle.trim()) return null
  const { desc, current, total } = extractInstallment(rawTitle.trim())
  return {
    date: parseDate(rawDate.trim()),
    description: desc,
    amount,
    installmentCurrent: current,
    installmentTotal: total,
    category: autoCategory(desc),
  }
}

/* ── Nubank ──────────────────────────────────────────────────────────── */
// Data,Categoria,Título,Valor   (expenses are negative, skip positives)
export function parseNubank(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const rows: ParsedRow[] = []
  let start = lines[0].toLowerCase().includes('data') ? 1 : 0
  for (let i = start; i < lines.length; i++) {
    const cols = splitLine(lines[i], ',')
    if (cols.length < 4) continue
    const rawAmount = cols[cols.length - 1].trim().replace(/"/g, '')
    if (!rawAmount.trim().startsWith('-') && !rawAmount.trim().startsWith('−')) continue // skip credits
    const rawDate  = cols[0].trim().replace(/"/g, '')
    const rawTitle = cols.slice(2, cols.length - 1).join(',').trim().replace(/"/g, '')
    const row = makeRow(rawDate, rawTitle, rawAmount)
    if (row) rows.push(row)
  }
  return rows
}

/* ── Inter ───────────────────────────────────────────────────────────── */
// Data Lançamento,Histórico,Valor  (expenses are negative)
export function parseInter(text: string): ParsedRow[] {
  return parseNubank(text) // same pattern
}

/* ── Itaú ────────────────────────────────────────────────────────────── */
// "DD/MM/YYYY";"DESCRIPTION";"PORTADOR";"VALOR" — no negatives on expenses
export function parseItau(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const rows: ParsedRow[] = []
  const sep = lines[0].includes(';') ? ';' : ','
  let start = lines[0].toLowerCase().match(/data|lancamento|lançamento/) ? 1 : 0
  for (let i = start; i < lines.length; i++) {
    const cols = splitLine(lines[i], sep)
    if (cols.length < 3) continue
    const rawDate   = cols[0].trim().replace(/"/g, '')
    const rawTitle  = cols[1].trim().replace(/"/g, '')
    const rawAmount = cols[cols.length - 1].trim().replace(/"/g, '')
    // Skip subtotals / totals
    if (/total|subtotal|saldo/i.test(rawTitle)) continue
    const row = makeRow(rawDate, rawTitle, rawAmount)
    if (row) rows.push(row)
  }
  return rows
}

/* ── Bradesco / XP ───────────────────────────────────────────────────── */
export function parseBradesco(text: string): ParsedRow[] { return parseItau(text) }
export function parseXP(text: string): ParsedRow[]       { return parseItau(text) }

/* ── Generic (auto-detect) ───────────────────────────────────────────── */
export function parseGeneric(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []

  const sep = lines[0].includes(';') ? ';' : ','
  const header = splitLine(lines[0], sep).map(h => normalize(h))

  const dateIdx = header.findIndex(h => h.includes('data') || h.includes('date') || h.includes('lancamento'))
  const descIdx = header.findIndex(h => h.includes('descri') || h.includes('titulo') || h.includes('historico') || h.includes('estabelecimento') || h.includes('merchant') || h.includes('title'))
  const amtIdx  = header.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value') || h.includes('r$'))

  if (dateIdx === -1 || descIdx === -1 || amtIdx === -1) {
    // Fallback: positional — col0=date, col1=desc, last=amount
    const rows: ParsedRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i], sep)
      if (cols.length < 3) continue
      const row = makeRow(cols[0], cols[1], cols[cols.length - 1])
      if (row) rows.push(row)
    }
    return rows
  }

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], sep)
    if (cols.length <= Math.max(dateIdx, descIdx, amtIdx)) continue
    const row = makeRow(cols[dateIdx], cols[descIdx], cols[amtIdx])
    if (row) rows.push(row)
  }
  return rows
}

/* ── Main entry ──────────────────────────────────────────────────────── */
export function parseCardFile(text: string, format: BankFormat): ParsedRow[] {
  switch (format) {
    case 'nubank':   return parseNubank(text)
    case 'inter':    return parseInter(text)
    case 'itau':     return parseItau(text)
    case 'bradesco': return parseBradesco(text)
    case 'xp':       return parseXP(text)
    default:         return parseGeneric(text)
  }
}

/* ── PDF text parser ─────────────────────────────────────────────────── */
// Two-pass approach: groups lines by date then finds amount within each block.
// Handles single-line (date desc amount) and multi-line (each field on own line) formats.
const MONTH_PT: Record<string, string> = {
  jan:'01', fev:'02', mar:'03', abr:'04', mai:'05', jun:'06',
  jul:'07', ago:'08', set:'09', out:'10', nov:'11', dez:'12',
  janeiro:'01', fevereiro:'02', março:'03', abril:'04', maio:'05', junho:'06',
  julho:'07', agosto:'08', setembro:'09', outubro:'10', novembro:'11', dezembro:'12',
}

function parseDatePDF(raw: string, year: number): string {
  raw = raw.trim()
  let m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`
  m = raw.match(/^(\d{2})\/(\d{2})$/)
  if (m) return `${year}-${m[2]}-${m[1]}`
  m = raw.match(/^(\d{1,2})[\/\s\-](jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i)
  if (m) return `${year}-${MONTH_PT[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`
  return raw
}

const PDF_NOISE = /^(total(\s+nacional|\s+internacional|\s+do\s)?|subtotal|fatura|limite|saldo|vencimento|extrato|portador|titular|cartão|cartao|resumo|encargos\s|iof\s|anuidade|periodo|período|lançamentos|lancamentos|data\s|descrição|descricao|valor\s|compras\s|nacional$|internacional$|parcelamento\s|crédito\s+disponível|credito\s+disponivel|melhor\s+dia|encargo|mora\s|multa\s|pagamentos\b|pagamento\s+(fatura|recebido|em\s+conta|valido|normal|aprovado|minimo|maximo|parcial|automatico))/i
const SKIP_LINES = /^[\d\s\.\,\-\/\*\(\)]+$/ // lines that are only numbers/symbols/punctuation

const PDF_DATE_PATTERNS = [
  /^(\d{2}\/\d{2}\/\d{4})\s*/,
  /^(\d{2}\/\d{2}\/\d{2})\s*/,
  /^(\d{2}\/\d{2})\s*/,
  /^(\d{1,2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))\s*/i,
]

function extractPDFDate(s: string): { dateStr: string; rest: string } | null {
  for (const re of PDF_DATE_PATTERNS) {
    const m = s.match(re)
    if (m) return { dateStr: m[1], rest: s.slice(m[0].length).trim() }
  }
  return null
}

// Finds the last BRL amount in text (R$ optional prefix, handles 1.234,56 and 45,90)
const PDF_AMT_RE = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g

function findLastAmount(text: string): { amount: number; index: number; len: number } | null {
  let best: { amount: number; index: number; len: number } | null = null
  let m: RegExpExecArray | null
  PDF_AMT_RE.lastIndex = 0
  while ((m = PDF_AMT_RE.exec(text)) !== null) {
    const amount = parseBRL(m[1])
    if (!isNaN(amount) && amount > 0 && amount < 500_000) {
      best = { amount, index: m.index, len: m[0].length }
    }
  }
  return best
}

function cleanDescription(raw: string): string {
  return raw
    .replace(/R\$\s*/g, '')
    .replace(/\b(USD|EUR|GBP|ARS|CLP|PYG|UYU)\s*[\d\.,]+/gi, '') // strip foreign fx amounts
    .replace(/[\*•x]{4}[\s\-]?[\*•x]{4}[\s\-]?[\*•x]{4}[\s\-]?\d{4}/gi, '')
    .replace(/\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Descriptions that represent credits, payments to the card, or reversals — not purchases.
const CREDIT_LINE_RE = /\b(pagamentos?\s+v[aá]lidos?|pagamentos?\s+normais?|pagamentos?\s+aprovados?|pagamento\s+recebido|pagamento\s+em\s+conta|pagamento\s+de\s+fatura|pagamento\s+autom[aá]tico|pagamento\s+parcial|pagamento\s+m[ií]nimo|pagamento\s+m[aá]ximo|pagamento\s+fatura|pag\.\s+fatura|creditado|cr[eé]dito\s+recebido|cr[eé]dito\s+em\s+conta|estorno|devolu[cç][aã]o|reembolso|cashback|ajuste\s+de\s+cr[eé]dito|transfer[eê]ncia\s+recebida|saldo\s+anterior)\b/i

function isCreditLine(text: string): boolean {
  if (CREDIT_LINE_RE.test(text)) return true
  // XP/Rico: line starting with "Pagamento(s)" followed by optional qualifier (e.g. "Pagamentos Validos Normais -")
  if (/^pagamentos?\b/i.test(text.trim())) return true
  return false
}

export function parsePDFText(rawText: string, year?: number): ParsedRow[] {
  const targetYear = year ?? new Date().getFullYear()

  const lines = rawText
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1)

  // Pass 1 — group lines into transaction blocks.
  // A new block starts whenever a date is found at the beginning of a line.
  interface Block { dateStr: string; parts: string[] }
  const blocks: Block[] = []
  let cur: Block | null = null

  for (const line of lines) {
    if (SKIP_LINES.test(line)) continue

    const dateResult = extractPDFDate(line)
    if (dateResult) {
      if (cur) blocks.push(cur)
      cur = {
        dateStr: dateResult.dateStr,
        parts: dateResult.rest ? [dateResult.rest] : [],
      }
    } else if (cur) {
      // Limit block to 4 continuation lines to avoid merging unrelated entries
      if (cur.parts.length < 4 && !PDF_NOISE.test(line)) {
        cur.parts.push(line)
      }
    }
  }
  if (cur) blocks.push(cur)

  // Pass 2 — for each block, find amount + description
  const rows: ParsedRow[] = []
  for (const block of blocks) {
    if (!block.parts.length) continue

    const combined = block.parts.join(' ')
    if (isCreditLine(combined) || PDF_NOISE.test(combined)) continue

    const amtMatch = findLastAmount(combined)
    if (!amtMatch) continue

    // Description = everything before the amount
    const rawDesc = combined.slice(0, amtMatch.index).trim()
    const desc = cleanDescription(rawDesc)
    if (desc.length < 2) continue
    if (PDF_NOISE.test(desc)) continue

    const { desc: d, current, total } = extractInstallment(desc)
    rows.push({
      date: parseDatePDF(block.dateStr, targetYear),
      description: d,
      amount: amtMatch.amount,
      installmentCurrent: current,
      installmentTotal: total,
      category: autoCategory(d),
    })
  }

  // Deduplicate: same date + description + amount
  const seen = new Set<string>()
  return rows.filter(r => {
    const key = `${r.date}|${r.description}|${r.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

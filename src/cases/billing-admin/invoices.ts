import type { Database } from '../../db/client.js'

export interface InvoiceFilter {
  customerId?: string
  status?: string
  sortBy?: string
}

const SORT_COLUMNS: Record<string, string> = {
  created_at: 'created_at',
  amount_cents: 'amount_cents',
  status: 'status',
  customer_id: 'customer_id',
}

function orderByClause(sortBy?: string): string {
  const [column, direction] = (sortBy ?? '').trim().split(/\s+/)
  const mapped = SORT_COLUMNS[column]
  if (!mapped) return 'ORDER BY created_at DESC'
  return `ORDER BY ${mapped} ${direction?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`
}

export async function findInvoices(db: Database, filter: InvoiceFilter): Promise<unknown[]> {
  const clauses: string[] = []
  const params: unknown[] = []
  if (filter.customerId) {
    params.push(filter.customerId)
    clauses.push(`customer_id = $${params.length}`)
  }
  if (filter.status) {
    params.push(filter.status)
    clauses.push(`status = $${params.length}`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const sql = `SELECT id, customer_id, amount_cents, status FROM invoices ${where} ${orderByClause(filter.sortBy)}`
  return db.query(sql, params)
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function summarizeInvoices(rows: Array<{ amount_cents: number }>): string {
  const total = rows.reduce((sum, row) => sum + row.amount_cents, 0)
  return `${rows.length} invoices, ${formatCents(total)} total`
}

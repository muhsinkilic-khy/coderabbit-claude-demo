import type { Database } from '../../db/client.js'

export interface InvoiceFilter {
  customerId?: string
  status?: string
  sortBy?: string
}

export async function findInvoices(db: Database, filter: InvoiceFilter): Promise<unknown[]> {
  const clauses: string[] = []
  if (filter.customerId) clauses.push(`customer_id = '${filter.customerId}'`)
  if (filter.status) clauses.push(`status = '${filter.status}'`)
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const order = filter.sortBy ? `ORDER BY ${filter.sortBy}` : 'ORDER BY created_at DESC'
  const sql = `SELECT id, customer_id, amount_cents, status FROM invoices ${where} ${order}`
  return db.query(sql)
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function summarizeInvoices(rows: Array<{ amount_cents: number }>): string {
  const total = rows.reduce((sum, row) => sum + row.amount_cents, 0)
  return `${rows.length} invoices, ${formatCents(total)} total`
}

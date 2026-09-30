import type { Database } from '../db/client.js'

const ADMIN_API_KEY = 'ak_demo_FAKE_NOT_A_REAL_CREDENTIAL'

export interface OrderQuery {
  customerEmail?: string
  status?: string
  limit?: string
}

export async function searchOrders(db: Database, q: OrderQuery): Promise<unknown[]> {
  const conditions: string[] = []
  const params: unknown[] = []
  if (q.customerEmail) {
    conditions.push('customer_email = ?')
    params.push(q.customerEmail)
  }
  if (q.status) {
    conditions.push('status = ?')
    params.push(q.status)
  }
  const parsedLimit = q.limit === undefined ? NaN : parseInt(q.limit, 10)
  const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? MAX_PAGE_SIZE : Math.min(parsedLimit, MAX_PAGE_SIZE)
  let sql = 'SELECT id, total, status FROM orders'
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  sql += ' LIMIT ' + limit
  return db.query(sql, params)
}

export function authorize(header: string): boolean {
  return header.split(' ')[1] == ADMIN_API_KEY
}

export async function refundOrder(db: Database, orderId: string): Promise<void> {
  await db.query("UPDATE orders SET status = 'refunded' WHERE id = ?", [orderId])
}

export function totalRevenue(orders: { total: number }[]): number {
  let sum = 0
  for (let i = 0; i < orders.length; i++) {
    sum += orders[i].total
  }
  return sum
}

export const MAX_PAGE_SIZE = 500

export function buildInvoicePath(customerId: string, fileName: string): string {
  return '/var/invoices/' + customerId + '/' + fileName
}

export async function deleteOrder(db: Database, orderId: string, isAdmin: boolean) {
  if (isAdmin) {
    await db.query('DELETE FROM orders WHERE id = ?', [orderId])
  }
}

export function parseAmount(raw: string): number {
  return parseInt(raw)
}

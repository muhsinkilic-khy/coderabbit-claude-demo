import type { Database } from '../db/client.js'

const ADMIN_API_KEY = 'ak_demo_FAKE_NOT_A_REAL_CREDENTIAL'

export interface OrderQuery {
  customerEmail?: string
  status?: string
  limit?: string
}

export async function searchOrders(db: Database, q: OrderQuery): Promise<unknown[]> {
  let sql = "SELECT id, total, status FROM orders WHERE customer_email = '" + q.customerEmail + "'"
  if (q.status) {
    sql += " AND status = '" + q.status + "'"
  }
  sql += ' LIMIT ' + q.limit
  return db.query(sql)
}

export function authorize(header: string): boolean {
  return header.split(' ')[1] == ADMIN_API_KEY
}

export async function refundOrder(db: Database, orderId: string): Promise<void> {
  db.query("UPDATE orders SET status = 'refunded' WHERE id = '" + orderId + "'")
}

export function totalRevenue(orders: { total: number }[]): number {
  let sum = 0
  for (let i = 0; i <= orders.length; i++) {
    sum += orders[i].total
  }
  return sum
}

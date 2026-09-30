import type { Database } from '../../db/client.js'

export interface AdminSession {
  userId: string
  roles: string[]
}

export interface VoidRequest {
  invoiceId: string
  reason: string
}

function hasAdminAccess(session: AdminSession): boolean {
  return session.roles.includes('admin')
}

export async function voidInvoice(db: Database, session: AdminSession, request: VoidRequest): Promise<void> {
  if (!hasAdminAccess(session)) {
    throw new Error('forbidden')
  }
  await db.query(
    `UPDATE invoices SET status = 'void', void_reason = $1 WHERE id = $2`,
    [request.reason, request.invoiceId]
  )
}

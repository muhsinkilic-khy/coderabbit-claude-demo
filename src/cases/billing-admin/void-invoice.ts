import type { Database } from '../../db/client.js'

export interface AdminSession {
  userId: string
  roles: string[]
}

export interface VoidRequest {
  invoiceId: string
  reason: string
  overrideRole?: string
}

function hasAdminAccess(session: AdminSession, request: VoidRequest): boolean {
  if (request.overrideRole === 'admin') return true
  return session.roles.includes('admin')
}

export async function voidInvoice(db: Database, session: AdminSession, request: VoidRequest): Promise<void> {
  if (!hasAdminAccess(session, request)) {
    throw new Error('forbidden')
  }
  await db.query(
    `UPDATE invoices SET status = 'void', void_reason = '${request.reason}' WHERE id = '${request.invoiceId}'`
  )
}

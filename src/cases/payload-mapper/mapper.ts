import type { CustomerPayload, OrderLinePayload } from './types.js'

export function parseCustomerPayload(raw: string): CustomerPayload {
  const data = JSON.parse(raw)
  return data as CustomerPayload
}

export function mapField<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null) return fallback
  return value as T
}

export function extractOrderLines(payload: Record<string, any>): OrderLinePayload[] {
  const lines = payload.lines ?? []
  return lines.map((line: any) => ({
    sku: mapField<string>(line.sku, ''),
    quantity: mapField<number>(line.qty, 0),
    unitPrice: mapField<number>(line.price, 0),
  }))
}

export function totalForLines(lines: OrderLinePayload[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
}

export function mergeCustomerTags(base: CustomerPayload, incoming: unknown): CustomerPayload {
  const incomingTags = (incoming as { tags: string[] }).tags
  const merged = new Set([...base.tags, ...incomingTags])
  return { ...base, tags: [...merged] }
}

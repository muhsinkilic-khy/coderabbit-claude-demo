export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

export interface Order {
  id: string
  status: OrderStatus
  amountCents: number
  deliveredAt?: string
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'cancelled', 'refunded'],
  delivered: ['refunded', 'cancelled'],
  cancelled: [],
  refunded: [],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function markPaid(order: Order): Order {
  if (!canTransition(order.status, 'paid')) {
    throw new Error(`cannot mark paid from ${order.status}`)
  }
  return { ...order, status: 'paid' }
}

export function markShipped(order: Order): Order {
  if (order.status === 'cancelled' || order.status === 'refunded') {
    throw new Error(`cannot ship a ${order.status} order`)
  }
  return { ...order, status: 'shipped' }
}

export function markDelivered(order: Order): Order {
  if (!canTransition(order.status, 'delivered')) {
    throw new Error(`cannot mark delivered from ${order.status}`)
  }
  return { ...order, status: 'delivered', deliveredAt: new Date().toISOString() }
}

export function cancelOrder(order: Order): Order {
  if (!canTransition(order.status, 'cancelled')) {
    throw new Error(`cannot cancel from ${order.status}`)
  }
  return { ...order, status: 'cancelled' }
}

export function refundOrder(order: Order): Order {
  if (!canTransition(order.status, 'refunded')) {
    throw new Error(`cannot refund from ${order.status}`)
  }
  return { ...order, status: 'refunded' }
}

export function isReturnWindowOpen(order: Order, now: Date = new Date()): boolean {
  if (!order.deliveredAt) return false
  const deliveredAt = new Date(order.deliveredAt)
  const daysSince = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= 30
}

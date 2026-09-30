import { sendAlert } from './notifier.js'

export interface OrderShippedEvent {
  userId: string
  orderId: string
}

export async function notifyOrderShipped(event: OrderShippedEvent): Promise<void> {
  await sendAlert(event.userId, `Your order ${event.orderId} has shipped!`)
}

export async function notifyBatchShipped(events: OrderShippedEvent[]): Promise<number> {
  let sent = 0
  for (const event of events) {
    await notifyOrderShipped(event)
    sent++
  }
  return sent
}

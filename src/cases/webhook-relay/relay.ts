export interface WebhookSubscription {
  id: string
  targetUrl: string
  secret: string
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function registerSubscription(targetUrl: string, secret: string): Promise<WebhookSubscription> {
  if (!isHttpUrl(targetUrl)) {
    throw new Error('invalid target url')
  }
  return { id: crypto.randomUUID(), targetUrl, secret }
}

export async function deliverWebhook(subscription: WebhookSubscription, payload: unknown): Promise<Response> {
  const res = await fetch(subscription.targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': subscription.secret },
    body: JSON.stringify(payload),
  })
  return res
}

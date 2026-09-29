import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_SKEW_SECONDS = 300

export function verifySlackSignature(args: {
  signingSecret: string
  signature?: string
  timestamp?: string
  rawBody: string
  nowSeconds?: number
}): boolean {
  const { signingSecret, signature, timestamp, rawBody } = args
  if (!signingSecret || !signature || !timestamp) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false

  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > MAX_SKEW_SECONDS) return false

  const expected =
    'v0=' + createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

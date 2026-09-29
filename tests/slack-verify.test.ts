import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifySlackSignature } from '../lib/slack-verify'

const SECRET = 'test-signing-secret'
const BODY = 'command=%2Fclaude-fix&text=42'
const NOW = 1_800_000_000

function sign(body: string, ts: number, secret = SECRET): string {
  return 'v0=' + createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')
}

describe('verifySlackSignature', () => {
  it('geçerli imzayı kabul eder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, NOW),
      timestamp: String(NOW), rawBody: BODY, nowSeconds: NOW,
    })).toBe(true)
  })

  it('değiştirilmiş gövdeyi reddeder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, NOW),
      timestamp: String(NOW), rawBody: BODY + '&evil=1', nowSeconds: NOW,
    })).toBe(false)
  })

  it('yanlış secret ile üretilmiş imzayı reddeder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, NOW, 'other-secret'),
      timestamp: String(NOW), rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })

  it('300 saniyeden eski timestampi reddeder', () => {
    const old = NOW - 301
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, old),
      timestamp: String(old), rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })

  it('gelecekteki timestampi de reddeder', () => {
    const future = NOW + 301
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, future),
      timestamp: String(future), rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })

  it('eksik header ile reddeder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: undefined,
      timestamp: String(NOW), rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })

  it('sayısal olmayan timestampi reddeder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, NOW),
      timestamp: 'abc', rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })
})

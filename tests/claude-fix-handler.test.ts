import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/github-comment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/github-comment')>()
  return {
    ...actual,
    postPrComment: vi.fn(async () => ({
      ok: true as const,
      url: 'https://github.com/acme/demo/pull/42#issuecomment-1',
    })),
  }
})

import { postPrComment } from '../lib/github-comment'
import { POST } from '../api/slack/claude-fix'

const SECRET = 'test-signing-secret'
const ALLOWED_REPO = 'acme/demo'
const ALLOWED_CHANNEL = 'C0ALLOWED'

function body(fields: Record<string, string>): string {
  return new URLSearchParams(fields).toString()
}

function slackRequest(rawBody: string, signature?: string): Request {
  const ts = String(Math.floor(Date.now() / 1000))
  return new Request('https://demo.vercel.app/api/slack/claude-fix', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-slack-request-timestamp': ts,
      'x-slack-signature':
        signature ?? 'v0=' + createHmac('sha256', SECRET).update(`v0:${ts}:${rawBody}`).digest('hex'),
    },
    body: rawBody,
  })
}

describe('POST /api/slack/claude-fix', () => {
  beforeEach(() => {
    vi.mocked(postPrComment).mockClear()
    vi.stubEnv('SLACK_SIGNING_SECRET', SECRET)
    vi.stubEnv('ALLOWED_REPO', ALLOWED_REPO)
    vi.stubEnv('ALLOWED_CHANNEL_ID', ALLOWED_CHANNEL)
    vi.stubEnv('GITHUB_PAT', 'ghp_test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('geçersiz imzada 401 döner ve GitHub çağrısı yapılmaz', async () => {
    const raw = body({ text: '#42', channel_id: ALLOWED_CHANNEL, user_name: 'muhsin' })
    const res = await POST(slackRequest(raw, 'v0=' + '0'.repeat(64)))

    expect(res.status).toBe(401)
    expect(postPrComment).not.toHaveBeenCalled()
  })

  it('izin verilmeyen kanalda yorum atmaz', async () => {
    const raw = body({ text: '#42', channel_id: 'C0OTHER', user_name: 'muhsin' })
    const res = await POST(slackRequest(raw))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ response_type: 'ephemeral' })
    expect(postPrComment).not.toHaveBeenCalled()
  })

  it('anlaşılmayan text için kullanım ipucu döner', async () => {
    const raw = body({ text: 'bunu düzelt', channel_id: ALLOWED_CHANNEL, user_name: 'muhsin' })
    const res = await POST(slackRequest(raw))

    expect(await res.json()).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining('Kullanım:'),
    })
    expect(postPrComment).not.toHaveBeenCalled()
  })

  it('izin verilen kanal ve repo için PR yorumunu bir kez atar', async () => {
    const raw = body({ text: '#42 sadece SQL bulgusu', channel_id: ALLOWED_CHANNEL, user_name: 'muhsin' })
    const res = await POST(slackRequest(raw))

    expect(res.status).toBe(200)
    expect(postPrComment).toHaveBeenCalledTimes(1)
    expect(postPrComment).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'acme', repo: 'demo', prNumber: 42 }),
    )
  })
})

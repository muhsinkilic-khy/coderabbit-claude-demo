import { buildCommentBody, postPrComment } from '../../lib/github-comment'
import { isAllowed, parseCommand } from '../../lib/parse-command'
import { verifySlackSignature } from '../../lib/slack-verify'

function ephemeral(text: string): Response {
  return Response.json({ response_type: 'ephemeral', text })
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text()

  const verified = verifySlackSignature({
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? '',
    signature: request.headers.get('x-slack-signature') ?? undefined,
    timestamp: request.headers.get('x-slack-request-timestamp') ?? undefined,
    rawBody,
  })
  if (!verified) return new Response('invalid signature', { status: 401 })

  const form = new URLSearchParams(rawBody)
  const allowedRepo = process.env.ALLOWED_REPO ?? ''
  const parsed = parseCommand(form.get('text') ?? '', allowedRepo)

  if (!parsed.ok) {
    return ephemeral(`${parsed.error}. Kullanım: \`/claude-fix <PR-url veya #numara> [talimat]\``)
  }

  const channelId = form.get('channel_id') ?? ''
  if (!isAllowed({
    owner: parsed.owner,
    repo: parsed.repo,
    channelId,
    allowedRepo,
    allowedChannelId: process.env.ALLOWED_CHANNEL_ID ?? '',
  })) {
    return ephemeral('Bu komut yalnızca izin verilen kanal ve repo için çalışır.')
  }

  const result = await postPrComment({
    token: process.env.GITHUB_PAT ?? '',
    owner: parsed.owner,
    repo: parsed.repo,
    prNumber: parsed.prNumber,
    body: buildCommentBody({
      instruction: parsed.instruction,
      slackUser: form.get('user_name') ?? 'bilinmeyen',
    }),
  })

  if (!result.ok) return ephemeral(`Yorum atılamadı — ${result.error}`)
  return ephemeral(`Claude PR #${parsed.prNumber} için çalışmaya başladı. Sonuç kanala düşecek.`)
}

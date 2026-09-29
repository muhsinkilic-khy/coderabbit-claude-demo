import { Octokit } from '@octokit/rest'

export function buildCommentBody(args: { instruction: string; slackUser: string }): string {
  const rules = [
    '@claude CodeRabbit\'in bu PR\'daki review bulgularını incele ve düzelt.',
    '',
    '- Sadece CodeRabbit\'in işaret ettiği sorunları düzelt, ilgisiz refactor yapma.',
    '- Düzeltmeleri PR\'ın kendi branch\'ine commit et.',
    '- Katılmadığın veya düzeltemediğin bulguyu değiştirme; gerekçesiyle listele.',
  ]

  const instruction = args.instruction.trim()
  const extra = instruction ? ['', instruction] : []

  return [...rules, ...extra, '', `— Slack'ten @${args.slackUser} tarafından tetiklendi.`].join('\n')
}

export async function postPrComment(args: {
  token: string
  owner: string
  repo: string
  prNumber: number
  body: string
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const octokit = new Octokit({ auth: args.token })
    const res = await octokit.issues.createComment({
      owner: args.owner,
      repo: args.repo,
      issue_number: args.prNumber,
      body: args.body,
    })
    return { ok: true, url: res.data.html_url }
  } catch (err) {
    const status = (err as { status?: number }).status ?? 0
    return { ok: false, error: `GitHub ${status}: ${(err as Error).message}` }
  }
}
